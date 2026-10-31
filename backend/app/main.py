"""
BRANDTRACE API — Evidence-Linked Brand Governance Platform.
Supports deterministic-first brand rules, claim verification, model/offline triage,
human approval gates, multi-format (PDF/Image) analysis, audit ledger, and governance insights.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, Depends, UploadFile, File, Form, Header, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

from .config import (
    CORS_ORIGINS,
    MAX_CONTENT_CHARS,
    MAX_UPLOAD_BYTES,
    normalize_database_url,
    AUTH_MODE,
    ALLOW_DEMO_AUTH,
    API_KEY,
    ADMIN_API_KEY,
)
from . import config
from .models import (
    get_engine,
    db,
    rows,
    row,
    ident,
    now,
    init_db,
    verify_schema,
    audit,
    save_version,
)
from .schemas import (
    RuleIn,
    RuleUpdateIn,
    RuleOut,
    FactIn,
    FactUpdateIn,
    FactOut,
    ReviewIn,
    ReviewOut,
    FindingAction,
    ApprovalAction,
    BrandProfileIn,
    BrandProfileOut,
    OverviewOut,
    InsightsOut,
    ImpactMapOut,
    BrandAssetIn,
    BrandAssetOut,
    GuidelineHealthItem,
    RuleSuggestionAction,
    RuleSuggestionOut,
    RuleActivationIn,
    WorkspaceMemberIn,
    WorkspaceMemberOut,
    WorkspaceIn,
    WorkspaceOut,
    BootstrapOut,
    ConstitutionImportOut,
    ImportCandidateOut,
    CandidateUpdateIn,
    CandidateRejectIn,
    EvidenceSourceIn,
    EvidenceSourceUpdateIn,
    EvidenceSourceOut,
    RuleConflictOut,
    ReviewAssignmentIn,
    ReviewCommentIn,
    ReviewCommentOut,
    GovernanceAlertOut,
    ExpiryScanOut,
    OcrResponseOut,
    LogoPlacementOut,
    TypographyComplianceOut,
    WorkerStatusOut,
)
from .governance import run_governance_analysis, is_expired, calculate_health_score
from .pdf_parser import extract_pdf_pages, format_pdf_text_for_review, PDFExtractionError
from .image_analyzer import analyze_image_compliance, ImageAnalysisError
from .impact_map import calculate_impact_map, trigger_targeted_rereview
from .services.guideline_importer import extract_candidates_from_pdf
from .services.rule_conflict_detector import scan_all_rule_conflicts, check_candidate_conflicts
from .services.compliance_exporter import build_compliance_packet_json, build_compliance_packet_pdf
from .services.expiry_monitor import (
    run_expiry_scan,
    execute_expiry_job,
    list_governance_jobs,
    list_governance_alerts,
    acknowledge_governance_alert,
)
from .services.visual_intelligence import perceptual_similarity_score
from .services.ocr_service import ocr_pipeline
from .services.logo_detector import detect_logo_placement
from .services.typography_analyzer import evaluate_typography_compliance
from .services.expiry_worker import scheduler_worker, get_worker_status, trigger_automated_audit

DEFAULT_WORKSPACE_MEMBERSHIPS: Dict[str, Set[str]] = {
    "system.admin": {"ws_default"},
    "system.user": {"ws_default"},
    "admin@brandtrace.internal": {"ws_default"},
    "reviewer@brandtrace.internal": {"ws_default"},
    "creator@brandtrace.internal": {"ws_default"},
    "auditor@brandtrace.internal": {"ws_default"},
    "demo.brand_admin": {"ws_default"},
    "demo.reviewer": {"ws_default"},
    "demo.creator": {"ws_default"},
    "demo.auditor": {"ws_default"},
    "reviewer.alice": {"ws_default"},
    "reviewer.bob": {"ws_default"},
    "admin.lead": {"ws_default"},
    "admin@foreign-corp.com": {"ws_unrelated"},
    "intruder@foreign-corp.com": {"ws_unrelated"},
    "user@foreign-corp.com": {"ws_unrelated"},
}

def is_actor_authorized_for_workspace(actor: str, workspace_id: str) -> bool:
    """Verify that the caller identity is an authorized member of target workspace."""
    # 1. First check verified database memberships in workspace_members
    try:
        with db() as conn:
            m = conn.execute(
                "SELECT 1 FROM workspace_members WHERE actor=? AND workspace_id=?",
                (actor, workspace_id)
            ).fetchone()
            if m:
                return True
            has_any = conn.execute(
                "SELECT 1 FROM workspace_members WHERE actor=?",
                (actor,)
            ).fetchone()
            if has_any:
                return False
    except Exception:
        pass

    # 2. Authenticated system accounts mapped to default workspace
    if actor in ("system.admin", "system.user"):
        return workspace_id == "ws_default"

    # 3. In production mode (ALLOW_DEMO_AUTH = False), reject all demo and synthetic identities
    if not config.ALLOW_DEMO_AUTH:
        return False

    # 4. In demo/test mode only: check configured demo memberships and domain fixtures
    allowed = DEFAULT_WORKSPACE_MEMBERSHIPS.get(actor)
    if allowed is not None:
        return workspace_id in allowed

    if actor.endswith("@brandtrace.internal") or actor.startswith("demo."):
        return workspace_id == "ws_default"
    if actor.endswith("@foreign-corp.com") or actor.startswith("foreign."):
        return workspace_id == "ws_unrelated"

    return False

def get_auth_context(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
    x_demo_role: Optional[str] = Header(None),
    x_demo_actor: Optional[str] = Header(None),
    x_workspace_id: Optional[str] = Header(None),
) -> Dict[str, str]:
    """Resolve caller identity, role and tenant workspace with environment-aware security boundaries.

    In production mode (or when ALLOW_DEMO_AUTH is false), caller-supplied demo headers
    are strictly rejected. Authentication must be provided via Bearer token or X-API-Key.
    Constant-time comparison is enforced for all secret validation.
    In permitted demo mode, simulated demo roles and workspace scopes are verified against
    server-side configured workspace memberships. A client-supplied workspace ID alone
    never grants access without authorized membership.
    """
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif x_api_key:
        token = x_api_key.strip()

    target_workspace = (x_workspace_id or "ws_default").strip()

    if token:
        if config.ADMIN_API_KEY and hmac.compare_digest(token, config.ADMIN_API_KEY):
            auth_ctx = {"role": "brand_admin", "actor": "system.admin", "auth_type": "api_key", "workspace_id": "ws_default"}
        elif config.API_KEY and hmac.compare_digest(token, config.API_KEY):
            auth_ctx = {"role": "reviewer", "actor": "system.user", "auth_type": "api_key", "workspace_id": "ws_default"}
        else:
            raise HTTPException(401, "Invalid authentication credentials.")

        if x_workspace_id and target_workspace != auth_ctx["workspace_id"]:
            if not is_actor_authorized_for_workspace(auth_ctx["actor"], target_workspace):
                raise HTTPException(403, f"Authenticated credential is not authorized for workspace '{target_workspace}'.")
            auth_ctx["workspace_id"] = target_workspace
        return auth_ctx

    if not config.ALLOW_DEMO_AUTH:
        raise HTTPException(
            401,
            "Authentication required. Demo role simulation is disabled in production mode."
        )

    # Permitted demo mode
    role = (x_demo_role or "reviewer").lower().strip()
    if role not in ("creator", "reviewer", "brand_admin", "auditor"):
        role = "reviewer"
    actor = (x_demo_actor or f"demo.{role}").strip()

    # Enforce workspace authorization: client-supplied workspace ID must not itself grant access
    if not is_actor_authorized_for_workspace(actor, target_workspace):
        raise HTTPException(
            403,
            f"Caller '{actor}' is not authorized for workspace '{target_workspace}'."
        )

    return {"role": role, "actor": actor, "auth_type": "demo", "workspace_id": target_workspace}

def get_demo_role(ctx: Dict[str, str] = Depends(get_auth_context)) -> str:
    return ctx["role"]

def get_demo_actor(ctx: Dict[str, str] = Depends(get_auth_context)) -> str:
    return ctx["actor"]

def get_workspace_id(ctx: Dict[str, str] = Depends(get_auth_context)) -> str:
    return ctx.get("workspace_id", "ws_default")

def _startup_log(message: str, *args: object) -> None:
    """Emit a timestamped startup record; logging handlers flush each record."""
    logger.info("[startup %s] " + message, datetime.now(timezone.utc).isoformat(), *args)


def _safe_database_error(exc: Exception) -> str:
    """Provide useful server diagnostics without ever logging connection secrets."""
    message = str(exc)
    message = re.sub(r"(?i)(postgres(?:ql)?(?:\+psycopg)?://)[^\s'\"]+", r"\1***", message)
    message = re.sub(r"(?i)password=[^\s;]+", "password=***", message)
    return message


def _verify_staging_runtime(engine) -> None:
    """Validate the runbook child inherited its already-validated target."""
    expected_host = os.getenv("STAGING_EXPECTED_HOST")
    expected_db = os.getenv("STAGING_EXPECTED_DB")
    if not expected_host and not expected_db:
        return

    url = engine.url
    sslmode = str(url.query.get("sslmode", "")).lower()
    _startup_log(
        "runtime target dialect=%s host=%s database=%s sslmode=%s environment=%s demo_auth=%s api_key_present=%s admin_key_present=%s",
        engine.dialect.name,
        url.host or "(none)",
        url.database or "(none)",
        sslmode or "(none)",
        config.ENVIRONMENT,
        config.ALLOW_DEMO_AUTH,
        bool(config.API_KEY),
        bool(config.ADMIN_API_KEY),
    )
    if url.host != expected_host or url.database != expected_db:
        raise RuntimeError("Staging child database target does not match the runbook-validated target.")
    if sslmode != "require":
        raise RuntimeError("Staging child database target must require TLS.")
    if config.ENVIRONMENT != "staging" or config.ALLOW_DEMO_AUTH:
        raise RuntimeError("Staging child authentication environment is not configured safely.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize normally, or read-only verify after the staging schema phase."""
    started = time.perf_counter()
    startup_schema_mode = os.getenv("BRANDTRACE_STARTUP_SCHEMA_MODE", "initialize").lower().strip()
    _startup_log("lifespan entered; schema_mode=%s", startup_schema_mode)
    try:
        engine_started = time.perf_counter()
        engine = get_engine()
        _startup_log("database engine acquired in %.1f ms", (time.perf_counter() - engine_started) * 1000)
        _verify_staging_runtime(engine)

        schema_started = time.perf_counter()
        if startup_schema_mode == "initialize":
            _startup_log("schema initialization starting")
            init_db()
            _startup_log("schema initialization completed in %.1f ms", (time.perf_counter() - schema_started) * 1000)
        elif startup_schema_mode == "verify":
            _startup_log("read-only schema verification starting")
            verify_schema()
            _startup_log("read-only schema verification completed in %.1f ms", (time.perf_counter() - schema_started) * 1000)
        else:
            raise RuntimeError("BRANDTRACE_STARTUP_SCHEMA_MODE must be 'initialize' or 'verify'.")
    except Exception as exc:
        _startup_log("lifespan failed after %.1f ms (%s)", (time.perf_counter() - started) * 1000, type(exc).__name__)
        raise

    _startup_log("lifespan startup complete in %.1f ms", (time.perf_counter() - started) * 1000)
    yield
    _startup_log("lifespan shutdown complete")

app = FastAPI(
    title="BRANDTRACE API",
    version="0.3.0",
    description="Evidence-linked brand governance platform with deterministic rules, human approvals, and multimodal analysis.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# System & Setup Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "brandtrace", "version": "0.3.0"}

@app.get("/api/ready")
def ready():
    """Report readiness only after a bounded, real database round trip.

    Schema synchronization belongs to startup (and the staging runbook's
    explicit schema phase).  Re-running every DDL/migration operation here can
    block a simple readiness request on hosted PostgreSQL after startup has
    already completed.
    """
    started = time.perf_counter()
    try:
        engine = get_engine()
        with db() as conn:
            # The transaction-local server timeout bounds a stalled PostgreSQL
            # query without changing global server settings. SQLite does not
            # support this PostgreSQL command.
            if engine.dialect.name == "postgresql":
                statement_timeout_ms = int(os.getenv("DB_READINESS_STATEMENT_TIMEOUT_MS", "8000"))
                conn.execute(f"SET LOCAL statement_timeout = {statement_timeout_ms}")
            conn.execute("SELECT 1")
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.warning("Readiness database probe failed after %.1f ms (%s)", elapsed_ms, type(exc).__name__)
        raise HTTPException(status_code=503, detail="Database not ready.") from exc

    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info("Readiness database probe completed in %.1f ms", elapsed_ms)
    from .services.groq_client import get_groq_diagnostics
    diag = get_groq_diagnostics()
    return {
        "status": "ready",
        "database": engine.dialect.name,
        "environment": config.ENVIRONMENT,
        "groq_configured": diag["configured"],
        "groq_vision_model": diag["vision_model"],
        "groq_text_model": diag["text_model"],
        "ocr_available": diag["configured"],
        "digital_pdf_available": True,
        "image_analysis_available": True,
    }

DEFAULT_SEED_EVIDENCE_SOURCES = [
    (
        "src_voice_01",
        "ws_default",
        "Brand Voice Standard",
        "BRAND_GUIDELINE",
        "brand-voice-guide-2026.pdf",
        None,
        "a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef",
        "1.2",
        "Page 4",
        "Section 1.2: Superlatives & Tone",
        "Use precise, evidence-backed language rather than subjective superlatives.",
        "Brand Admin",
        "VERIFIED",
        "2026-01-15T09:00:00+00:00",
        None,
        None,
    ),
    (
        "src_naming_01",
        "ws_default",
        "Naming Guide",
        "BRAND_GUIDELINE",
        "naming-conventions-2026.pdf",
        None,
        "b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdefa1",
        "1.0",
        "Page 2",
        "Section 2.1: Trademark Capitalization",
        "The product name is Brandtrace in body copy.",
        "Brand Admin",
        "VERIFIED",
        "2026-02-01T10:00:00+00:00",
        None,
        None,
    ),
    (
        "src_msg_01",
        "ws_default",
        "Messaging Guide",
        "BRAND_GUIDELINE",
        "messaging-framework.pdf",
        None,
        "c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdefa1b2",
        "1.0",
        "Page 7",
        "Section 3.4: Value Positioning",
        "Use accessible, efficient, or cost-effective instead of cheap.",
        "Brand Admin",
        "VERIFIED",
        "2026-02-10T11:00:00+00:00",
        None,
        None,
    ),
    (
        "src_launch_01",
        "ws_default",
        "Launch brief",
        "PRODUCT_SPEC",
        "q4-launch-brief.pdf",
        None,
        "d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdefa1b2c3",
        "2.0",
        "Page 3",
        "Section 1: Regional Availability",
        "BRANDTRACE is available to teams in India.",
        "Product Marketing",
        "VERIFIED",
        "2026-03-01T12:00:00+00:00",
        None,
        "2027-01-01T00:00:00+00:00",
    ),
]

@app.post("/api/demo/setup")
async def demo_setup(
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
):
    if not config.ALLOW_DEMO_AUTH:
        raise HTTPException(403, "Demo setup is disabled in production mode.")
    if role not in ("reviewer", "brand_admin"):
        raise HTTPException(403, "Reviewer or Brand Admin role required.")
    """Idempotently seed workspace, brand visual profile, rules, and facts."""
    init_db()
    with db() as conn:
        # Seed default workspace if not present
        if not rows("SELECT * FROM workspaces WHERE id='ws_default'"):
            conn.execute("INSERT INTO workspaces VALUES (?, ?, ?)", ("ws_default", "Northstar demo workspace", now()))

        # Seed brand visual profile if not present
        if not rows("SELECT * FROM brand_profiles WHERE workspace_id='ws_default'"):
            conn.execute(
                """
                INSERT INTO brand_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ident("profile"),
                    "ws_default",
                    "Brandtrace",
                    "#0f766e",
                    "#2dd4bf",
                    json.dumps(["#0284c7", "#f59e0b"]),
                    4.5,
                    3.0,
                    now(),
                )
            )

        # Seed baseline rules
        if not rows("SELECT * FROM rules"):
            seed_rules = [
                (
                    "R-VOICE-01",
                    "ws_default",
                    "Avoid unsupported superlatives",
                    "voice",
                    "prohibited_phrase",
                    "best",
                    "Avoid unsubstantiated superlatives in customer communications.",
                    "HIGH",
                    "1.2",
                    "APPROVED",
                    "Brand Admin",
                    "src_voice_01",
                    "Brand Voice Standard",
                    "Use precise, evidence-backed language rather than subjective superlatives.",
                    None,
                    None,
                    now(),
                ),
                (
                    "R-TERM-02",
                    "ws_default",
                    "Use platform name",
                    "terminology",
                    "required_phrase",
                    "Brandtrace",
                    "Use the approved product capitalization in all copy.",
                    "MEDIUM",
                    "1.0",
                    "APPROVED",
                    "Brand Admin",
                    "src_naming_01",
                    "Naming Guide",
                    "The product name is Brandtrace in body copy.",
                    None,
                    None,
                    now(),
                ),
                (
                    "R-TERM-03",
                    "ws_default",
                    "Avoid cheap language",
                    "terminology",
                    "forbidden_term",
                    "cheap",
                    "Do not position the service as cheap or low-cost.",
                    "HIGH",
                    "1.0",
                    "APPROVED",
                    "Brand Admin",
                    "src_msg_01",
                    "Messaging Guide",
                    "Use accessible, efficient, or cost-effective instead of cheap.",
                    None,
                    None,
                    now(),
                ),
            ]
            for r in seed_rules:
                conn.execute(
                    """
                    INSERT INTO rules (
                        id, workspace_id, title, category, kind, pattern, requirement,
                        severity, version, status, owner, source_id, source_title,
                        source_excerpt, effective_at, expires_at, created_at
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    r,
                )
                conn.execute(
                    """
                    INSERT INTO rule_versions (
                        id, rule_id, workspace_id, version, title, category, kind,
                        pattern, requirement, severity, source_title, source_excerpt, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(rule_id, version) DO NOTHING
                    """,
                    (ident("rulever"), r[0], r[1], r[8], r[2], r[3], r[4], r[5], r[6], r[7], r[12], r[13], r[16]),
                )

        # Seed baseline fact
        if not rows("SELECT * FROM facts"):
            f_data = (
                "F-2026-01",
                "ws_default",
                "Product availability",
                "Available in India",
                "Product Marketing",
                "APPROVED",
                "2.0",
                "src_launch_01",
                "Launch brief",
                "BRANDTRACE is available to teams in India.",
                None,
                None,
                "2027-01-01T00:00:00+00:00",
                now(),
            )
            conn.execute(
                """
                INSERT INTO facts (
                    id, workspace_id, claim, value, owner, status, version,
                    source_id, source_title, source_excerpt, review_at,
                    effective_at, expires_at, created_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                f_data,
            )
            conn.execute(
                """
                INSERT INTO fact_versions (
                    id, fact_id, version, claim, value, source_id, source_title,
                    source_excerpt, effective_at, expires_at, status, change_reason,
                    changed_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(fact_id, version) DO NOTHING
                """,
                (
                    ident("factver"), f_data[0], f_data[6], f_data[2], f_data[3],
                    f_data[7], f_data[8], f_data[9], f_data[11], f_data[12],
                    f_data[5], "INITIAL_APPROVAL", "system", f_data[13]
                ),
            )

        # Seed baseline evidence sources if not present
        if not rows("SELECT * FROM evidence_sources WHERE workspace_id='ws_default'"):
            for s in DEFAULT_SEED_EVIDENCE_SOURCES:
                conn.execute(
                    """
                    INSERT INTO evidence_sources (
                        id, workspace_id, title, source_type, file_name, url,
                        content_hash, version, page_reference, section_reference,
                        excerpt, owner, verification_status, last_verified_at,
                        effective_at, expires_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO NOTHING
                    """,
                    (s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9], s[10], s[11], s[12], s[13], s[14], s[15], now(), now())
                )

    return await overview(workspace_id="ws_default")

@app.post("/api/demo/reset")
async def demo_reset(
    ctx: Dict[str, str] = Depends(get_auth_context),
    x_reset_secret: Optional[str] = Header(None, alias="X-Reset-Secret"),
):
    """Completely wipe and restore pristine Northstar demo data across all tables.

    Defensive security controls:
    1. Disabled by default via ALLOW_DEMO_RESET (fail-closed on hosted/shared environments).
    2. Simulated demo role headers (e.g. X-Demo-Role: brand_admin) ALONE never grant reset privileges.
    3. Requires valid server-side reset secret (X-Reset-Secret matching DEMO_RESET_SECRET)
       OR genuine server ADMIN_API_KEY bearer token.
    4. Constrained strictly to ws_default workspace.
    """
    if not config.ALLOW_DEMO_RESET:
        raise HTTPException(403, "Demo reset is disabled on this server (disabled in production mode).")

    workspace_id = ctx.get("workspace_id", "ws_default")
    if workspace_id != "ws_default":
        raise HTTPException(403, "Demo reset is only permitted on the default workspace.")

    role = ctx.get("role", "")
    auth_type = ctx.get("auth_type", "")

    # Role check: creators, reviewers, and auditors cannot reset even with a secret
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to reset demo data.")

    # Server authorization check:
    # Simulated demo headers alone must NOT authorize destructive reset.
    # Must have either genuine api_key auth as brand_admin OR a valid DEMO_RESET_SECRET.
    is_authorized = False
    if auth_type == "api_key" and role == "brand_admin":
        is_authorized = True
    elif config.DEMO_RESET_SECRET:
        if x_reset_secret and hmac.compare_digest(x_reset_secret.strip(), config.DEMO_RESET_SECRET.strip()):
            is_authorized = True

    if not is_authorized:
        raise HTTPException(
            403,
            "Demo reset requires server-side administrative authorization or valid reset secret. "
            "Simulated demo roles cannot reset shared data without server credentials."
        )

    init_db()
    with db() as conn:
        conn.execute("DELETE FROM findings WHERE review_id IN (SELECT id FROM reviews WHERE workspace_id='ws_default' OR workspace_id IS NULL) OR review_id IS NULL")
        conn.execute("DELETE FROM review_versions WHERE review_id IN (SELECT id FROM reviews WHERE workspace_id='ws_default' OR workspace_id IS NULL) OR review_id IS NULL")
        conn.execute("DELETE FROM review_comments WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM evidence_dependencies WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM reviews WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM audit WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM rule_suggestions WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM brand_assets WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM rule_versions WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM rules WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM fact_versions WHERE fact_id IN (SELECT id FROM facts WHERE workspace_id='ws_default' OR workspace_id IS NULL) OR fact_id IS NULL")
        conn.execute("DELETE FROM facts WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM imported_rule_candidates WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM constitution_imports WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM governance_alerts WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM evidence_sources WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM brand_profiles WHERE workspace_id='ws_default' OR workspace_id IS NULL")
        conn.execute("DELETE FROM workspaces WHERE id='ws_default'")

        # Workspace
        conn.execute("INSERT INTO workspaces VALUES (?, ?, ?)", ("ws_default", "Northstar demo workspace", now()))

        # Brand visual profile
        conn.execute(
            """
            INSERT INTO brand_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "profile_default",
                "ws_default",
                "Brandtrace",
                "#0f766e",
                "#2dd4bf",
                json.dumps(["#0284c7", "#f59e0b"]),
                4.5,
                3.0,
                now(),
            )
        )

        # Seed 3 baseline rules
        seed_rules = [
            (
                "R-VOICE-01",
                "ws_default",
                "Avoid unsupported superlatives",
                "voice",
                "prohibited_phrase",
                "best",
                "Avoid unsubstantiated superlatives in customer communications.",
                "HIGH",
                "1.2",
                "APPROVED",
                "Brand Admin",
                "src_voice_01",
                "Brand Voice Standard",
                "Use precise, evidence-backed language rather than subjective superlatives.",
                None,
                None,
                now(),
            ),
            (
                "R-TERM-02",
                "ws_default",
                "Use platform name",
                "terminology",
                "required_phrase",
                "Brandtrace",
                "Use the approved product capitalization in all copy.",
                "MEDIUM",
                "1.0",
                "APPROVED",
                "Brand Admin",
                "src_naming_01",
                "Naming Guide",
                "The product name is Brandtrace in body copy.",
                None,
                None,
                now(),
            ),
            (
                "R-TERM-03",
                "ws_default",
                "Avoid cheap language",
                "terminology",
                "forbidden_term",
                "cheap",
                "Do not position the service as cheap or low-cost.",
                "HIGH",
                "1.0",
                "APPROVED",
                "Brand Admin",
                "src_msg_01",
                "Messaging Guide",
                "Use accessible, efficient, or cost-effective instead of cheap.",
                None,
                None,
                now(),
            ),
        ]
        for r in seed_rules:
            conn.execute(
                """
                INSERT INTO rules (
                    id, workspace_id, title, category, kind, pattern, requirement,
                    severity, version, status, owner, source_id, source_title,
                    source_excerpt, effective_at, expires_at, created_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                r,
            )
            conn.execute(
                """
                INSERT INTO rule_versions (
                    id, rule_id, workspace_id, version, title, category, kind,
                    pattern, requirement, severity, source_title, source_excerpt, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(rule_id, version) DO NOTHING
                """,
                (ident("rulever"), r[0], r[1], r[8], r[2], r[3], r[4], r[5], r[6], r[7], r[12], r[13], r[16]),
            )

        # Seed baseline fact
        rf_data = (
            "F-2026-01",
            "ws_default",
            "Product availability",
            "Available in India",
            "Product Marketing",
            "APPROVED",
            "2.0",
            "src_launch_01",
            "Launch brief",
            "BRANDTRACE is available to teams in India.",
            None,
            None,
            "2027-01-01T00:00:00+00:00",
            now(),
        )
        conn.execute(
            """
            INSERT INTO facts (
                id, workspace_id, claim, value, owner, status, version,
                source_id, source_title, source_excerpt, review_at,
                effective_at, expires_at, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            rf_data,
        )
        conn.execute(
            """
            INSERT INTO fact_versions (
                id, fact_id, version, claim, value, source_id, source_title,
                source_excerpt, effective_at, expires_at, status, change_reason,
                changed_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(fact_id, version) DO NOTHING
            """,
            (
                ident("factver"), rf_data[0], rf_data[6], rf_data[2], rf_data[3],
                rf_data[7], rf_data[8], rf_data[9], rf_data[11], rf_data[12],
                rf_data[5], "INITIAL_APPROVAL", "system", rf_data[13]
            ),
        )

        # Seed baseline evidence sources
        for s in DEFAULT_SEED_EVIDENCE_SOURCES:
            conn.execute(
                """
                INSERT INTO evidence_sources (
                    id, workspace_id, title, source_type, file_name, url,
                    content_hash, version, page_reference, section_reference,
                    excerpt, owner, verification_status, last_verified_at,
                    effective_at, expires_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO NOTHING
                """,
                (s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9], s[10], s[11], s[12], s[13], s[14], s[15], now(), now())
            )

    # Seed 1 sample initial review with findings (Curated Judge Demo Review)
    sample_id = "rev_launch_q4"
    sample_content = (
        "Discover a more effective way to manage your team's daily workflow. "
        "Brandtrace is the best and cheap solution with guaranteed performance for enterprise operations in India."
    )
    sample_review = {
        "id": sample_id,
        "workspace_id": "ws_default",
        "title": "Summer Product Campaign — Q4 (Launch announcement)",
        "content": sample_content,
        "content_type": "marketing_copy",
        "document_type": "marketing_copy",
        "file_format": "pdf",
        "status": "IN_REVIEW",
        "score": 100,
        "author": "creator@demo.com",
        "reviewer": None,
        "file_name": "summer_product_campaign_q4.pdf",
        "file_mime": "application/pdf",
        "file_size": 24576,
        "analysis_method": "DETERMINISTIC_FIRST",
        "rule_versions": json.dumps({"R-VOICE-01": "1.2", "R-TERM-02": "1.0", "R-TERM-03": "1.0"}),
        "created_at": now(),
        "updated_at": now(),
    }
    with db() as conn:
        conn.execute(
            """
            INSERT INTO reviews (
                id, workspace_id, title, content, content_type, document_type,
                file_format, status, score, author, reviewer, file_name, file_mime,
                file_size, analysis_method, rule_versions, created_at, updated_at
            ) VALUES (
                :id, :workspace_id, :title, :content, :content_type, :document_type,
                :file_format, :status, :score, :author, :reviewer, :file_name, :file_mime,
                :file_size, :analysis_method, :rule_versions, :created_at, :updated_at
            )
            """,
            sample_review,
        )

    save_version(sample_id, sample_content, "ORIGINAL_SUBMISSION", created_by="creator@demo.com")
    await run_governance_analysis(sample_review)
    audit(sample_id, "REVIEW_CREATED", actor="creator@demo.com", actor_role="creator")

    return await overview(workspace_id="ws_default")

@app.get("/api/overview")
async def overview(workspace_id: str = Depends(get_workspace_id)):
    recent_reviews = rows("SELECT * FROM reviews WHERE workspace_id=? ORDER BY created_at DESC LIMIT 6", (workspace_id,))
    for r in recent_reviews:
        r["findings"] = rows("SELECT * FROM findings WHERE review_id=?", (r["id"],))

    bp = row("SELECT * FROM brand_profiles WHERE workspace_id=?", (workspace_id,))
    if bp and isinstance(bp.get("accent_colors"), str):
        try:
            bp["accent_colors"] = json.loads(bp["accent_colors"])
        except Exception:
            bp["accent_colors"] = []

    metrics = {
        "total_reviews": len(rows("SELECT id FROM reviews WHERE workspace_id=?", (workspace_id,))),
        "open_findings": len(rows("SELECT f.id FROM findings f JOIN reviews r ON r.id=f.review_id WHERE r.workspace_id=? AND f.disposition IS NULL", (workspace_id,))),
        "pending_approval": len(rows("SELECT id FROM reviews WHERE workspace_id=? AND status IN ('IN_REVIEW', 'PENDING_APPROVAL')", (workspace_id,))),
        "approved": len(rows("SELECT id FROM reviews WHERE workspace_id=? AND status='APPROVED'", (workspace_id,))),
        "rules_count": len(rows("SELECT id FROM rules WHERE workspace_id=? AND status='APPROVED'", (workspace_id,))),
        "facts_count": len(rows("SELECT id FROM facts WHERE workspace_id=? AND status='APPROVED'", (workspace_id,))),
    }

    return {
        "workspace": {"id": workspace_id, "name": "Northstar demo workspace", "demo_mode": config.ALLOW_DEMO_AUTH},
        "reviews": recent_reviews,
        "metrics": metrics,
        "brand_profile": bp,
    }

# -----------------------------------------------------------------------------
# Brand Constitution: Rules & Facts
# -----------------------------------------------------------------------------

@app.get("/api/rules")
def list_rules(workspace_id: str = Depends(get_workspace_id)):
    return rows("SELECT * FROM rules WHERE workspace_id=? ORDER BY title", (workspace_id,))

@app.post("/api/rules", status_code=201)
def create_rule(
    payload: RuleIn,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to create or modify brand rules.")

    data = payload.model_dump()
    data["id"] = ident("rule")
    data["workspace_id"] = workspace_id
    data["created_at"] = now()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO rules (
                id, workspace_id, title, category, kind, pattern, requirement,
                severity, version, status, owner, source_id, source_title,
                source_excerpt, effective_at, expires_at, created_at
            ) VALUES (
                :id, :workspace_id, :title, :category, :kind, :pattern, :requirement,
                :severity, :version, :status, :owner, :id, :source_title,
                :source_excerpt, :effective_at, :expires_at, :created_at
            )
            """,
            data,
        )
        conn.execute(
            """INSERT INTO rule_versions (id, rule_id, workspace_id, version, title, category, kind,
            pattern, requirement, severity, source_title, source_excerpt, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (ident("rulever"), data["id"], data["workspace_id"], data["version"], data["title"],
             data["category"], data["kind"], data["pattern"], data["requirement"], data["severity"],
             data["source_title"], data["source_excerpt"], data["created_at"]),
        )
    return data

@app.put("/api/rules/{rule_id}")
def update_rule(
    rule_id: str,
    payload: RuleUpdateIn,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    """Update brand rule with optimistic expected-version concurrency and immutable history."""
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to update brand rules.")

    with db() as conn:
        existing_row = conn.execute("SELECT * FROM rules WHERE id=?", (rule_id,)).fetchone()
        if not existing_row:
            raise HTTPException(404, "Rule not found.")
        existing = dict(existing_row._mapping)

        # Cross-workspace authorization check
        if existing.get("workspace_id") and existing["workspace_id"] != workspace_id:
            raise HTTPException(403, "Access to rules outside caller workspace is forbidden.")

        # Expected version check to prevent stale overwrites
        if payload.expected_version and payload.expected_version != existing["version"]:
            raise HTTPException(
                409,
                f"Stale update conflict: current rule version is {existing['version']}, expected {payload.expected_version}."
            )

        updates = {
            k: v for k, v in payload.model_dump().items()
            if v is not None and k not in ("expected_version", "reason")
        }
        if not updates:
            return existing

        material = {"pattern", "requirement", "severity", "category", "kind", "title"}
        is_material = bool(material.intersection(updates))

        # Rejection of illegal same-version reuse on material changes
        if is_material and updates.get("version") == existing["version"]:
            raise HTTPException(409, "Material rule changes cannot reuse the existing version.")

        if is_material and "version" not in updates:
            try:
                updates["version"] = str(int(float(existing.get("version", "0"))) + 1)
            except (TypeError, ValueError):
                updates["version"] = f"{existing.get('version', '1.0')}-rev"

        new_version = updates.get("version", existing["version"])
        ts = now()

        # Snapshot prior version if missing
        conn.execute(
            """INSERT INTO rule_versions (
                id, rule_id, workspace_id, version, title, category, kind,
                pattern, requirement, severity, source_title, source_excerpt, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(rule_id, version) DO NOTHING""",
            (ident("rulever"), existing["id"], existing["workspace_id"], existing["version"],
             existing["title"], existing["category"], existing["kind"], existing["pattern"],
             existing["requirement"], existing["severity"], existing["source_title"],
             existing["source_excerpt"], ts),
        )

        set_clauses = [f"{k}=:{k}" for k in updates.keys()]
        updates["id"] = rule_id
        conn.execute(f"UPDATE rules SET {', '.join(set_clauses)} WHERE id=:id", updates)

        current = {**existing, **updates}
        if is_material:
            conn.execute(
                """INSERT INTO rule_versions (
                    id, rule_id, workspace_id, version, title, category, kind,
                    pattern, requirement, severity, source_title, source_excerpt,
                    activated_by, activation_reason, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(rule_id, version) DO NOTHING""",
                (ident("rulever"), current["id"], current["workspace_id"], current["version"],
                 current["title"], current["category"], current["kind"], current["pattern"],
                 current["requirement"], current["severity"], current["source_title"],
                 current["source_excerpt"], actor, payload.reason or "DIRECT_UPDATE", ts),
            )

        conn.execute(
            """INSERT INTO audit (id, workspace_id, review_id, action, actor, actor_role, reason, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (ident("aud"), existing["workspace_id"], "system", "RULE_UPDATED", actor, role,
             payload.reason, f"Rule {rule_id} version {existing['version']} -> {new_version}", ts),
        )

    return row("SELECT * FROM rules WHERE id=?", (rule_id,))

@app.get("/api/facts")
def list_facts(workspace_id: str = Depends(get_workspace_id)):
    return rows("SELECT * FROM facts WHERE workspace_id=? ORDER BY claim", (workspace_id,))

@app.post("/api/facts", status_code=201)
def create_fact(
    payload: FactIn,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to create or modify approved facts.")

    data = payload.model_dump()
    data["id"] = ident("fact")
    data["workspace_id"] = workspace_id
    data["created_at"] = now()
    data["updated_at"] = data["created_at"]
    with db() as conn:
        conn.execute(
            """
            INSERT INTO facts (
                id, workspace_id, claim, value, owner, status, version,
                source_id, source_title, source_excerpt, review_at,
                effective_at, expires_at, notes, created_at
            ) VALUES (
                :id, :workspace_id, :claim, :value, :owner, :status, :version,
                :id, :source_title, :source_excerpt, :review_at,
                :effective_at, :expires_at, :notes, :created_at
            )
            """,
            data,
        )
        conn.execute(
            """INSERT INTO fact_versions (
                id, fact_id, version, claim, value, source_id, source_title,
                source_excerpt, effective_at, expires_at, status, change_reason,
                changed_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (ident("factver"), data["id"], data["version"], data["claim"], data["value"],
             data["id"], data["source_title"], data["source_excerpt"], data.get("effective_at"),
             data.get("expires_at"), data["status"], "INITIAL_APPROVAL", actor, data["created_at"]),
        )
    return data

@app.put("/api/facts/{fact_id}")
def update_fact(
    fact_id: str,
    payload: FactUpdateIn,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to update approved facts.")

    with db() as conn:
        existing_row = conn.execute("SELECT * FROM facts WHERE id=?", (fact_id,)).fetchone()
        if not existing_row:
            raise HTTPException(404, "Fact not found.")
        existing = dict(existing_row._mapping)

        # Cross-workspace authorization check
        if existing.get("workspace_id") and existing["workspace_id"] != workspace_id:
            raise HTTPException(403, "Access to facts outside caller workspace is forbidden.")

        # Expected version conflict check
        if payload.expected_version and payload.expected_version != existing["version"]:
            raise HTTPException(
                409,
                f"Stale update conflict: current fact version is {existing['version']}, expected {payload.expected_version}."
            )

        updates = {
            k: v for k, v in payload.model_dump().items()
            if v is not None and k not in ("expected_version", "reason")
        }
        if not updates:
            return existing

        material = {"claim", "value", "source_title", "source_excerpt", "effective_at", "expires_at", "status"}
        is_material = bool(material.intersection(updates))

        # Material fact changes cannot reuse the existing version
        if is_material and updates.get("version") == existing["version"]:
            raise HTTPException(409, "Material fact changes cannot reuse the existing version.")

        if is_material and "version" not in updates:
            try:
                updates["version"] = str(int(float(existing.get("version", "0"))) + 1)
            except (TypeError, ValueError):
                updates["version"] = f"{existing.get('version', '1.0')}-rev"

        new_version = updates.get("version", existing["version"])
        updates["updated_at"] = now()
        ts = updates["updated_at"]

        # Ensure prior version is snapshotted
        conn.execute(
            """INSERT INTO fact_versions (
                id, fact_id, version, claim, value, source_id, source_title,
                source_excerpt, effective_at, expires_at, status, change_reason,
                changed_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(fact_id, version) DO NOTHING""",
            (ident("factver"), existing["id"], existing["version"], existing["claim"], existing["value"],
             existing.get("source_id") or existing["id"], existing["source_title"], existing["source_excerpt"],
             existing.get("effective_at"), existing.get("expires_at"), existing["status"],
             "PRIOR_SNAPSHOT", actor, existing.get("created_at") or ts),
        )

        set_clauses = [f"{k}=:{k}" for k in updates.keys()]
        updates["id"] = fact_id
        conn.execute(f"UPDATE facts SET {', '.join(set_clauses)} WHERE id=:id", updates)

        current = {**existing, **updates}
        if is_material:
            conn.execute(
                """INSERT INTO fact_versions (
                    id, fact_id, version, claim, value, source_id, source_title,
                    source_excerpt, effective_at, expires_at, status, change_reason,
                    changed_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(fact_id, version) DO NOTHING""",
                (ident("factver"), fact_id, current["version"], current["claim"], current["value"],
                 current.get("source_id") or fact_id, current["source_title"], current["source_excerpt"],
                 current.get("effective_at"), current.get("expires_at"), current["status"],
                 payload.reason or "FACT_UPDATED", actor, ts),
            )

        conn.execute(
            """INSERT INTO audit (id, workspace_id, review_id, action, actor, actor_role, reason, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (ident("aud"), existing["workspace_id"], "system", "FACT_UPDATED", actor, role,
             payload.reason, f"Fact {fact_id} version {existing['version']} -> {new_version}", ts),
        )

    return row("SELECT * FROM facts WHERE id=?", (fact_id,))

def get_brand_profile(workspace_id: Optional[str] = None):
    ws_id = workspace_id or "ws_default"
    bp = row("SELECT * FROM brand_profiles WHERE workspace_id=?", (ws_id,))
    if bp and isinstance(bp.get("accent_colors"), str):
        try:
            bp["accent_colors"] = json.loads(bp["accent_colors"])
        except Exception:
            bp["accent_colors"] = []
    return bp

@app.get("/api/brand-profile")
def get_brand_profile_endpoint(workspace_id: str = Depends(get_workspace_id)):
    return get_brand_profile(workspace_id=workspace_id)

@app.put("/api/brand-profile")
def update_brand_profile(
    payload: BrandProfileIn,
    role: str = Depends(get_demo_role),
    workspace_id: str = Depends(get_workspace_id),
):
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to modify visual brand profile.")

    existing = row("SELECT id FROM brand_profiles WHERE workspace_id=?", (workspace_id,))
    pid = existing["id"] if existing else ident("profile")
    acc = json.dumps(payload.accent_colors)

    with db() as conn:
        if existing:
            conn.execute(
                """
                UPDATE brand_profiles SET
                    brand_name=?, primary_color=?, secondary_color=?, accent_colors=?,
                    min_contrast_ratio=?, approved_logo_aspect=?, updated_at=?
                WHERE id=?
                """,
                (payload.brand_name, payload.primary_color, payload.secondary_color, acc, payload.min_contrast_ratio, payload.approved_logo_aspect, now(), pid)
            )
        else:
            conn.execute(
                """
                INSERT INTO brand_profiles VALUES (?,?,?,?,?,?,?,?,?)
                """,
                (pid, workspace_id, payload.brand_name, payload.primary_color, payload.secondary_color, acc, payload.min_contrast_ratio, payload.approved_logo_aspect, now())
            )
    return get_brand_profile(workspace_id=workspace_id)

# -----------------------------------------------------------------------------
# Reviews & Analysis
# -----------------------------------------------------------------------------

@app.get("/api/reviews")
def list_reviews(workspace_id: str = Depends(get_workspace_id)):
    result = rows("SELECT * FROM reviews WHERE workspace_id=? ORDER BY created_at DESC", (workspace_id,))
    for item in result:
        item["findings"] = rows("SELECT * FROM findings WHERE review_id=?", (item["id"],))
        item["score"] = calculate_health_score(item["findings"])
    return result

@app.post("/api/reviews")
async def create_review(
    payload: ReviewIn,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    if role == "auditor":
        raise HTTPException(403, "Auditor role has read-only access.")

    rid = ident("review")
    active_rules = rows("SELECT id, version FROM rules WHERE status='APPROVED' AND workspace_id=?", (workspace_id,))
    rule_versions = {r["id"]: r["version"] for r in active_rules}

    ai_advisory_findings: List[Dict[str, Any]] = []
    doc_summary = None
    ai_analysis_applied = False

    if getattr(payload, "consent_ai", False):
        from .services.groq_client import is_groq_configured
        from .services.groq_content_analyzer import analyze_document_with_groq
        if is_groq_configured():
            active_rules_full = rows("SELECT * FROM rules WHERE status='APPROVED' AND workspace_id=?", (workspace_id,))
            active_facts_full = rows("SELECT * FROM facts WHERE status='APPROVED' AND workspace_id=?", (workspace_id,))
            try:
                ai_res = analyze_document_with_groq(
                    content=payload.content,
                    document_type=getattr(payload, "document_type", "general_document") or payload.content_type,
                    rules=active_rules_full,
                    facts=active_facts_full,
                )
                doc_summary = ai_res.get("document_summary")
                ai_analysis_applied = True
                for cand in ai_res.get("candidate_findings", []):
                    ai_advisory_findings.append({
                        "category": cand.get("category", "claims"),
                        "type": "ai_candidate_finding",
                        "severity": cand.get("severity_suggestion", "MEDIUM"),
                        "status": "NEEDS_REVIEW",
                        "passage": cand.get("quoted_text", ""),
                        "explanation": f"[Groq AI Advisory] {cand.get('explanation', '')}",
                        "suggested_correction": cand.get("suggested_correction"),
                        "source_id": cand.get("related_rule_ids", [None])[0] if cand.get("related_rule_ids") else None,
                        "source_title": "Groq AI-Assisted Advisory Analysis",
                        "source_excerpt": "Advisory finding generated by Groq content intelligence model. Human review required.",
                        "source_version": "1.0",
                        "analysis_method": "GROQ_AI_ANALYSIS",
                        "uncertainty": "Advisory AI finding. Must be confirmed or dismissed by human reviewer.",
                    })
            except Exception as e:
                logger.warning(f"Groq AI analysis error during direct text review: {e}")

    review = {
        "id": rid,
        "workspace_id": workspace_id,
        "title": payload.title,
        "content": payload.content,
        "content_type": payload.content_type,
        "document_type": getattr(payload, "document_type", "general_document") or "general_document",
        "file_format": "text",
        "status": "IN_REVIEW",
        "score": 100,
        "author": actor or "creator@demo.com",
        "reviewer": None,
        "file_name": None,
        "file_mime": None,
        "file_size": None,
        "ocr_applied": 0,
        "ocr_method": "NONE",
        "ai_consent_granted": 1 if getattr(payload, "consent_ai", False) else 0,
        "ai_analysis_applied": 1 if ai_analysis_applied else 0,
        "document_summary": doc_summary,
        "analysis_method": "GROQ_ASSISTED_GOVERNANCE" if ai_analysis_applied else "DETERMINISTIC_FIRST",
        "rule_versions": json.dumps(rule_versions),
        "created_at": now(),
        "updated_at": now(),
    }

    with db() as conn:
        conn.execute(
            """
            INSERT INTO reviews (
                id, workspace_id, title, content, content_type, document_type, file_format, status,
                score, author, reviewer, file_name, file_mime, file_size,
                ocr_applied, ocr_method, ai_consent_granted, ai_analysis_applied, document_summary,
                analysis_method, rule_versions, created_at, updated_at
            ) VALUES (
                :id, :workspace_id, :title, :content, :content_type, :document_type, :file_format, :status,
                :score, :author, :reviewer, :file_name, :file_mime, :file_size,
                :ocr_applied, :ocr_method, :ai_consent_granted, :ai_analysis_applied, :document_summary,
                :analysis_method, :rule_versions, :created_at, :updated_at
            )
            """,
            review,
        )

    save_version(rid, payload.content, "ORIGINAL_SUBMISSION", created_by=actor)
    await run_governance_analysis(review, additional_visual_findings=ai_advisory_findings)
    audit(
        rid,
        "REVIEW_CREATED",
        actor=actor,
        actor_role=role,
        details="Stored original draft version and evaluated active rule versions.",
    )
    return get_review(rid)

@app.post("/api/reviews/upload")
async def upload_and_review(
    title: str = Form(...),
    content_type: str = Form("marketing_copy"),
    document_type: str = Form("general_document"),
    consent_ocr: bool = Form(False),
    consent_ai: bool = Form(False),
    file: UploadFile = File(...),
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    """
    Multi-format review endpoint with Document Intelligence and optional Groq Vision OCR.
    Accepts text (.txt, .md), PDF (.pdf), or Image (.png, .jpg, .webp).
    Extracts selectable text first; uses Groq Vision OCR for scanned pages if authorized.
    Runs deterministic governance analysis, and generates structured findings.
    """
    if role == "auditor":
        raise HTTPException(403, "Auditor role has read-only access.")

    CHUNK_SIZE = 64 * 1024
    chunks = []
    total_bytes = 0
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_UPLOAD_BYTES:
            await file.close()
            raise HTTPException(413, f"File size exceeds maximum permitted {MAX_UPLOAD_BYTES // (1024*1024)} MB.")
        chunks.append(chunk)
    file_bytes = b"".join(chunks)

    filename = (file.filename or "upload").lower()
    mime = (file.content_type or "application/octet-stream").lower()
    extracted_text = ""
    visual_findings: List[Dict[str, Any]] = []
    file_format = "text"
    ocr_applied = False
    ocr_method = "NONE"
    ai_analysis_applied = False
    doc_summary = None

    # 1. Plain text and Markdown
    if filename.endswith((".txt", ".text", ".md", ".markdown")) or mime.startswith("text/"):
        file_format = "markdown" if filename.endswith((".md", ".markdown")) else "text"
        try:
            extracted_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            extracted_text = file_bytes.decode("utf-8", errors="ignore")

    # 2. PDF Processing
    elif filename.endswith(".pdf") or "pdf" in mime:
        file_format = "pdf"
        pages = []
        try:
            pages = extract_pdf_pages(file_bytes)
        except PDFExtractionError:
            pages = []

        digital_text = format_pdf_text_for_review(pages)
        if len(digital_text.strip()) >= 50:
            extracted_text = digital_text
        else:
            # Scanned document detected
            if consent_ocr:
                from .services.groq_client import is_groq_configured
                from .services.pdf_page_renderer import render_pdf_pages_to_images, PDFRenderingError
                from .services.groq_vision_ocr import extract_text_from_pdf_pages_ocr, GroqOCRError

                if is_groq_configured():
                    try:
                        rendered_pages = render_pdf_pages_to_images(file_bytes)
                        ocr_res = extract_text_from_pdf_pages_ocr(rendered_pages)
                        if ocr_res.get("combined_text"):
                            extracted_text = ocr_res["combined_text"]
                            ocr_applied = True
                            ocr_method = "GROQ_VISION_OCR"
                        else:
                            raise HTTPException(422, "Scanned PDF OCR completed but no readable text was returned by the vision model.")
                    except GroqOCRError as e:
                        logger.warning(f"Groq Vision OCR failed, falling back to native OCR: {e}")
                        native_res = ocr_pipeline.process_pdf(file_bytes)
                        if native_res.get("extracted_text"):
                            extracted_text = native_res["extracted_text"]
                            ocr_applied = True
                            ocr_method = native_res.get("extraction_method", "HYBRID_OCR")
                        else:
                            raise HTTPException(422, f"Groq Vision OCR processing failed: {e.message}")
                    except PDFRenderingError as e:
                        raise HTTPException(422, f"Failed to render scanned PDF pages: {e.message}")
                    except Exception as e:
                        logger.warning(f"Groq OCR error, using local fallback: {e}")
                        native_res = ocr_pipeline.process_pdf(file_bytes)
                        if native_res.get("extracted_text"):
                            extracted_text = native_res["extracted_text"]
                            ocr_applied = True
                            ocr_method = native_res.get("extraction_method", "HYBRID_OCR")
                        else:
                            raise HTTPException(422, f"Scanned PDF processing failed: {str(e)}")
                else:
                    native_res = ocr_pipeline.process_pdf(file_bytes)
                    if native_res.get("extracted_text"):
                        extracted_text = native_res["extracted_text"]
                        ocr_applied = True
                        ocr_method = native_res.get("extraction_method", "HYBRID_OCR")
                    else:
                        raise HTTPException(
                            422,
                            "Uploaded PDF contains no extractable digital text and native OCR could not detect readable content."
                        )
            else:
                raise HTTPException(
                    422,
                    "Uploaded PDF contains no extractable digital text. To process this scanned document, please enable the 'Use Groq Vision OCR' option with consent."
                )

    # 3. Image Processing (Palette, WCAG contrast, Logo aspect, optional Vision OCR)
    elif filename.endswith((".png", ".jpg", ".jpeg", ".webp")) or mime.startswith("image/"):
        file_format = "image"
        bp = get_brand_profile(workspace_id=workspace_id)
        approved_palette = [bp["primary_color"], bp["secondary_color"]] if bp else ["#0f766e", "#2dd4bf"]
        if bp and bp.get("accent_colors"):
            approved_palette.extend(bp["accent_colors"])

        min_contrast = bp["min_contrast_ratio"] if bp else 4.5
        expected_aspect = bp.get("approved_logo_aspect") if bp else None

        try:
            analysis = analyze_image_compliance(
                file_bytes,
                approved_palette=approved_palette,
                min_contrast=min_contrast,
                expected_logo_aspect=expected_aspect,
                workspace_id=workspace_id,
            )
            visual_findings = analysis["visual_findings"]
            extracted_text = (
                f"[Visual Asset: {filename} — {analysis['width']}x{analysis['height']}px]\n"
                f"Extracted dominant colours: {', '.join(analysis['dominant_colors'])}\n"
                f"Aspect ratio: {analysis['aspect_ratio']}:1\n"
            )
        except ImageAnalysisError as exc:
            raise HTTPException(422, exc.message)

        if consent_ocr:
            from .services.groq_client import is_groq_configured
            from .services.groq_vision_ocr import extract_text_from_image_bytes
            ocr_done = False
            if is_groq_configured():
                try:
                    ocr_res = extract_text_from_image_bytes(file_bytes, mime_type=mime)
                    if ocr_res.get("extracted_text"):
                        extracted_text += f"\n\n[OCR Extracted Text from Graphic Asset]:\n{ocr_res['extracted_text']}"
                        ocr_applied = True
                        ocr_method = "GROQ_VISION_OCR"
                        ocr_done = True
                except Exception as e:
                    logger.warning(f"Image OCR failed: {e}")
            if not ocr_done:
                try:
                    local_ocr = ocr_pipeline.process_image(file_bytes)
                    if local_ocr.get("extracted_text"):
                        extracted_text += f"\n\n[OCR Extracted Text from Graphic Asset]:\n{local_ocr['extracted_text']}"
                        ocr_applied = True
                        ocr_method = f"LOCAL_OCR_{local_ocr.get('ocr_engine', 'EASYOCR')}"
                except Exception as e:
                    logger.warning(f"Local Image OCR fallback failed: {e}")
    else:
        raise HTTPException(
            415,
            f"Unsupported file format '{filename}'. Supported formats: .txt, .md, .pdf, .png, .jpg",
        )

    if not extracted_text.strip():
        raise HTTPException(422, "No readable content could be extracted from uploaded file.")

    rid = ident("review")
    active_rules = rows(
        "SELECT id, version FROM rules WHERE status='APPROVED' AND workspace_id=?",
        (workspace_id,),
    )
    rule_versions = {r["id"]: r["version"] for r in active_rules}

    # Optional Groq AI Content Analysis
    if consent_ai and extracted_text.strip():
        from .services.groq_client import is_groq_configured
        from .services.groq_content_analyzer import analyze_document_with_groq
        if is_groq_configured():
            try:
                active_rules_full = rows("SELECT * FROM rules WHERE status='APPROVED' AND workspace_id=?", (workspace_id,))
                active_facts_full = rows("SELECT * FROM facts WHERE status='APPROVED' AND workspace_id=?", (workspace_id,))
                ai_res = analyze_document_with_groq(
                    content=extracted_text,
                    document_type=document_type,
                    rules=active_rules_full,
                    facts=active_facts_full,
                )
                doc_summary = ai_res.get("document_summary")
                ai_analysis_applied = True
                for cand in ai_res.get("candidate_findings", []):
                    visual_findings.append({
                        "category": cand.get("category", "claims"),
                        "type": "ai_candidate_finding",
                        "severity": cand.get("severity_suggestion", "MEDIUM"),
                        "status": "NEEDS_REVIEW",
                        "passage": cand.get("quoted_text", ""),
                        "explanation": f"[Groq AI Advisory] {cand.get('explanation', '')}",
                        "suggested_correction": cand.get("suggested_correction"),
                        "source_id": cand.get("related_rule_ids", [None])[0] if cand.get("related_rule_ids") else None,
                        "source_title": "Groq AI-Assisted Advisory Analysis",
                        "source_excerpt": "Advisory finding generated by Groq content intelligence model. Human review required.",
                        "source_version": "1.0",
                        "analysis_method": "GROQ_AI_ANALYSIS",
                        "uncertainty": "Advisory AI finding. Must be confirmed or dismissed by human reviewer.",
                    })
            except Exception as e:
                logger.warning(f"Groq AI content analysis error during upload: {e}")

    review = {
        "id": rid,
        "workspace_id": workspace_id,
        "title": title,
        "content": extracted_text[:MAX_CONTENT_CHARS],
        "content_type": content_type,
        "document_type": document_type,
        "file_format": file_format,
        "status": "IN_REVIEW",
        "score": 100,
        "author": actor or "creator@demo.com",
        "reviewer": None,
        "file_name": file.filename,
        "file_mime": mime,
        "file_size": len(file_bytes),
        "ocr_applied": 1 if ocr_applied else 0,
        "ocr_method": ocr_method,
        "ai_consent_granted": 1 if (consent_ocr or consent_ai) else 0,
        "ai_analysis_applied": 1 if ai_analysis_applied else 0,
        "document_summary": doc_summary,
        "analysis_method": "GROQ_ASSISTED_GOVERNANCE" if (ocr_applied or ai_analysis_applied) else ("MULTIMODAL_GOVERNANCE" if visual_findings else "DOCUMENT_EXTRACTION"),
        "rule_versions": json.dumps(rule_versions),
        "created_at": now(),
        "updated_at": now(),
    }

    with db() as conn:
        conn.execute(
            """
            INSERT INTO reviews (
                id, workspace_id, title, content, content_type, document_type, file_format, status,
                score, author, reviewer, file_name, file_mime, file_size,
                ocr_applied, ocr_method, ai_consent_granted, ai_analysis_applied, document_summary,
                analysis_method, rule_versions, created_at, updated_at
            ) VALUES (
                :id, :workspace_id, :title, :content, :content_type, :document_type, :file_format, :status,
                :score, :author, :reviewer, :file_name, :file_mime, :file_size,
                :ocr_applied, :ocr_method, :ai_consent_granted, :ai_analysis_applied, :document_summary,
                :analysis_method, :rule_versions, :created_at, :updated_at
            )
            """,
            review,
        )

    save_version(rid, review["content"], f"FILE_UPLOAD_{filename}", created_by=actor)
    await run_governance_analysis(review, additional_visual_findings=visual_findings)
    audit(
        rid,
        "FILE_REVIEW_CREATED",
        actor=actor,
        actor_role=role,
        details=f"Uploaded {filename} ({len(file_bytes)} bytes, MIME {mime}, type={document_type}, OCR={ocr_method}).",
    )
    return get_review(rid)

def get_review(review_id: str, workspace_id: Optional[str] = None):
    rev = row("SELECT * FROM reviews WHERE id=?", (review_id,))
    if not rev:
        raise HTTPException(404, "Review not found")
    if workspace_id and rev.get("workspace_id") and rev["workspace_id"] != workspace_id:
        raise HTTPException(403, "Access to reviews outside caller workspace is forbidden.")
    rev["findings"] = rows("SELECT * FROM findings WHERE review_id=?", (review_id,))
    rev["versions"] = rows("SELECT * FROM review_versions WHERE review_id=? ORDER BY created_at", (review_id,))
    rev["score"] = calculate_health_score(rev["findings"])
    return rev

@app.get("/api/reviews/{review_id}")
def get_review_endpoint(
    review_id: str,
    workspace_id: str = Depends(get_workspace_id),
):
    return get_review(review_id, workspace_id=workspace_id)

@app.post("/api/reviews/{review_id}/findings/{finding_id}/actions")
def finding_action(
    review_id: str,
    finding_id: str,
    payload: FindingAction,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    if role == "auditor":
        raise HTTPException(403, "Auditor role has read-only access.")

    rev = get_review(review_id, workspace_id=workspace_id)
    finding = row("SELECT * FROM findings WHERE id=? AND review_id=?", (finding_id, review_id))
    if not finding:
        raise HTTPException(404, "Finding not found for this review")

    if payload.action in ("dismiss", "edit") and not payload.reason:
        raise HTTPException(422, "A documented reason is required for dismissing or editing a finding.")

    if payload.action == "dismiss" and role == "creator":
        raise HTTPException(403, "Reviewer or Brand Admin role is required to dismiss a compliance finding.")

    dispositions = {
        "accept": "ACCEPTED_EDIT",
        "edit": "EDITED",
        "dismiss": "DISMISSED",
        "escalate": "ESCALATED",
    }
    disp = dispositions[payload.action]
    replacement_to_save = None

    if payload.action in ("accept", "edit") and payload.replacement is not None:
        clean_rep = payload.replacement.strip()
        if not clean_rep:
            raise HTTPException(422, "Edited content cannot be empty.")

        # Guard 1: Cross-contamination check — replacement cannot be identical to reason
        if payload.reason and clean_rep.lower() == payload.reason.strip().lower():
            raise HTTPException(
                422,
                "Data integrity error: The working draft content cannot be identical to the documented disposition reason.",
            )

        # Guard 2: Reject obvious audit/QA reason strings from replacing working copy
        if clean_rep.lower().startswith((
            "manual qa:", "qa:", "reason:", "disposition reason:", "justification:", "audit note:"
        )):
            raise HTTPException(
                422,
                "Data integrity error: Draft content appears to be an audit reason or QA comment rather than publishable copy.",
            )

        # Guard 3: Re-evaluate missing required term against the updated working copy
        if finding.get("type") in ("required_phrase", "approved_term"):
            required_term = (finding.get("passage") or "").strip().lower()
            if required_term and required_term not in clean_rep.lower():
                raise HTTPException(
                    422,
                    f"The replacement text must include the required term '{finding.get('passage')}'. Re-evaluation failed against the updated working copy.",
                )

        replacement_to_save = clean_rep

    with db() as conn:
        conn.execute(
            """
            UPDATE findings SET
                disposition=?, disposition_reason=?, disposition_by=?, disposition_at=?
            WHERE id=?
            """,
            (disp, payload.reason, actor, now(), finding_id),
        )
        if replacement_to_save:
            conn.execute(
                "UPDATE reviews SET content=?, updated_at=? WHERE id=?",
                (replacement_to_save, now(), review_id),
            )

            # Re-evaluate all other missing term findings against the updated working copy
            all_req_findings = rows(
                "SELECT * FROM findings WHERE review_id=? AND type IN ('required_phrase', 'approved_term')",
                (review_id,),
            )
            for f_item in all_req_findings:
                term = (f_item.get("passage") or "").strip().lower()
                if term and term in replacement_to_save.lower():
                    conn.execute(
                        """
                        UPDATE findings SET
                            status='SUPPORTED',
                            disposition=COALESCE(disposition, 'ACCEPTED_EDIT'),
                            disposition_reason=COALESCE(disposition_reason, 'Mandatory brand term confirmed present in updated working copy.'),
                            disposition_by=COALESCE(disposition_by, :actor),
                            disposition_at=COALESCE(disposition_at, :now)
                        WHERE id=:fid
                        """,
                        {"actor": actor, "now": now(), "fid": f_item["id"]},
                    )

        # Recalculate health score for the review based on updated findings disposition
        all_findings = rows("SELECT * FROM findings WHERE review_id=?", (review_id,))
        new_score = calculate_health_score(all_findings)
        conn.execute("UPDATE reviews SET score=?, updated_at=? WHERE id=?", (new_score, now(), review_id))

    if replacement_to_save:
        save_version(review_id, replacement_to_save, f"FINDING_{payload.action.upper()}", created_by=actor)

    audit(
        review_id,
        f"FINDING_{payload.action.upper()}",
        actor=actor,
        actor_role=role,
        reason=payload.reason,
        details=finding_id,
    )
    return get_review(review_id)

@app.post("/api/reviews/{review_id}/approval")
def approval(
    review_id: str,
    payload: ApprovalAction,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    if role not in ("reviewer", "brand_admin"):
        raise HTTPException(403, "Reviewer or Brand Admin role required for approval decisions.")

    rev = get_review(review_id, workspace_id=workspace_id)
    unresolved_high = [
        f for f in rev["findings"]
        if not f.get("disposition") and f.get("severity") in ("HIGH", "CRITICAL")
    ]

    if payload.action in ("approve", "waive") and unresolved_high:
        unresolved_details = [f"'{f.get('passage', f['id'])}' ({f.get('type', 'rule')})" for f in unresolved_high]
        raise HTTPException(
            409,
            f"High-risk findings ({len(unresolved_high)} unresolved: {', '.join(unresolved_details)}) must be resolved before approval or waiver.",
        )

    if payload.action == "waive" and not payload.reason:
        raise HTTPException(422, "A documented reason is required for a governance waiver.")

    status_map = {
        "approve": "APPROVED",
        "request_changes": "CHANGES_REQUESTED",
        "waive": "WAIVED",
    }
    new_status = status_map[payload.action]

    with db() as conn:
        conn.execute(
            "UPDATE reviews SET status=?, reviewer=?, updated_at=? WHERE id=?",
            (new_status, actor, now(), review_id),
        )

    audit(
        review_id,
        f"APPROVAL_{payload.action.upper()}",
        actor=actor,
        actor_role=role,
        reason=payload.reason,
        details=f"Draft status transitioned to {new_status}.",
    )
    return get_review(review_id)

@app.post("/api/reviews/{review_id}/restore/{version_id}")
async def restore_version(
    review_id: str,
    version_id: str,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    if role not in ("creator", "reviewer", "brand_admin"):
        raise HTTPException(403, "Permission denied.")

    rev = get_review(review_id, workspace_id=workspace_id)
    ver = row("SELECT * FROM review_versions WHERE id=? AND review_id=?", (version_id, review_id))
    if not ver:
        raise HTTPException(404, "Draft version not found.")

    with db() as conn:
        conn.execute("UPDATE reviews SET content=?, updated_at=? WHERE id=?", (ver["content"], now(), review_id))

    save_version(review_id, ver["content"], f"RESTORED_VERSION_{version_id}", created_by=actor)
    rev = get_review(review_id, workspace_id=workspace_id)
    await run_governance_analysis(rev)
    audit(
        review_id,
        "VERSION_RESTORED",
        actor=actor,
        actor_role=role,
        reason=f"Restored to previous version {version_id}.",
    )
    return get_review(review_id)

@app.get("/api/reviews/{review_id}/audit")
def get_audit(review_id: str, workspace_id: str = Depends(get_workspace_id)):
    get_review(review_id, workspace_id=workspace_id)
    return rows("SELECT * FROM audit WHERE review_id=? ORDER BY created_at DESC", (review_id,))

@app.get("/api/reviews/{review_id}/versions")
def get_versions(review_id: str, workspace_id: str = Depends(get_workspace_id)):
    get_review(review_id, workspace_id=workspace_id)
    return rows("SELECT * FROM review_versions WHERE review_id=? ORDER BY created_at", (review_id,))

# -----------------------------------------------------------------------------
# Governance Intelligence & Impact Mapping (Phase 8 & Phase 12)
# -----------------------------------------------------------------------------

@app.get("/api/insights")
def insights(workspace_id: str = Depends(get_workspace_id)):
    """Aggregate governance signals only for the authenticated workspace."""
    scope = " FROM findings f JOIN reviews r ON r.id=f.review_id WHERE r.workspace_id=?"
    recurring = rows("SELECT f.type label, COUNT(*) count" + scope + " GROUP BY f.type ORDER BY count DESC LIMIT 6", (workspace_id,))
    unresolved = len(rows("SELECT f.id" + scope + " AND f.disposition IS NULL", (workspace_id,)))
    dismissed = len(rows("SELECT f.id" + scope + " AND f.disposition='DISMISSED'", (workspace_id,)))
    unclear = rows("SELECT f.type label, COUNT(*) count" + scope + " AND f.status='NEEDS_REVIEW' GROUP BY f.type ORDER BY count DESC", (workspace_id,))

    by_sev_rows = rows("SELECT f.severity label, COUNT(*) count" + scope + " GROUP BY f.severity", (workspace_id,))
    by_severity = {r["label"]: r["count"] for r in by_sev_rows}

    by_status_rows = rows("SELECT f.status label, COUNT(*) count" + scope + " GROUP BY f.status", (workspace_id,))
    by_evidence_status = {r["label"]: r["count"] for r in by_status_rows}

    disagreements = len(rows("SELECT f.id" + scope + " AND f.disposition IN ('DISMISSED', 'ESCALATED')", (workspace_id,)))

    # Real database-grounded quality and health intelligence metrics
    active_rules_count = len(rows("SELECT id FROM rules WHERE workspace_id=? AND status='APPROVED'", (workspace_id,)))
    draft_rules_count = len(rows("SELECT id FROM imported_rule_candidates WHERE workspace_id=? AND status='PENDING_APPROVAL'", (workspace_id,)))
    all_active_rules = rows("SELECT * FROM rules WHERE workspace_id=? AND status='APPROVED'", (workspace_id,))
    conflicts = scan_all_rule_conflicts(all_active_rules)
    conflicting_rules_count = len([c for c in conflicts if c.get("conflict_type") == "HARD_CONFLICT"])
    duplicate_rules_count = len([c for c in conflicts if c.get("conflict_type") == "DUPLICATE_RULE"])

    now_ts = now()
    expired_facts_count = len(rows("SELECT id FROM facts WHERE workspace_id=? AND status='APPROVED' AND expires_at IS NOT NULL AND expires_at < ?", (workspace_id, now_ts)))

    from datetime import datetime, timezone, timedelta
    thirty_days_ts = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    approaching_expiry_facts_count = len(rows("SELECT id FROM facts WHERE workspace_id=? AND status='APPROVED' AND expires_at IS NOT NULL AND expires_at >= ? AND expires_at <= ?", (workspace_id, now_ts, thirty_days_ts)))

    rules_without_sources_count = len(rows("SELECT id FROM rules WHERE workspace_id=? AND (source_title IS NULL OR source_title='' OR source_excerpt IS NULL OR source_excerpt='')", (workspace_id,)))
    active_alerts_count = len(rows("SELECT id FROM governance_alerts WHERE workspace_id=? AND status='ACTIVE'", (workspace_id,)))
    evidence_sources_count = len(rows("SELECT id FROM evidence_sources WHERE workspace_id=?", (workspace_id,)))

    return {
        "recurring": recurring,
        "unresolved": unresolved,
        "dismissed": dismissed,
        "unclear_rules": unclear,
        "by_severity": by_severity,
        "by_evidence_status": by_evidence_status,
        "disagreements_count": disagreements,
        "active_rules_count": active_rules_count,
        "draft_rules_count": draft_rules_count,
        "conflicting_rules_count": conflicting_rules_count,
        "duplicate_rules_count": duplicate_rules_count,
        "expired_facts_count": expired_facts_count,
        "approaching_expiry_facts_count": approaching_expiry_facts_count,
        "rules_without_sources_count": rules_without_sources_count,
        "active_alerts_count": active_alerts_count,
        "evidence_sources_count": evidence_sources_count,
    }

@app.get("/api/governance/impact-map")
def get_impact_map(workspace_id: str = Depends(get_workspace_id)):
    """Time-aware claim ledger & rule-change dependency map scoped by workspace."""
    return calculate_impact_map(workspace_id=workspace_id)

@app.post("/api/governance/re-review-impact")
def re_review_impact(
    item_id: str = Form(...),
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    """Trigger targeted re-review on all historical drafts affected by expired/changed fact or rule."""
    if role not in ("brand_admin", "reviewer"):
        raise HTTPException(403, "Brand Admin or Reviewer role required to trigger re-reviews.")

    count = trigger_targeted_rereview(item_id, actor=actor, workspace_id=workspace_id)
    return {"message": f"Targeted re-review triggered for {count} affected draft(s).", "affected_count": count}



# =============================================================================
# Round 3 — Commitment 2: Brand Asset Registry
# =============================================================================

@app.get("/api/brand-assets")
def list_brand_assets(
    workspace_id: str = Depends(get_workspace_id),
):
    """List all registered brand assets for the caller workspace."""
    return rows("SELECT * FROM brand_assets WHERE workspace_id=? ORDER BY name", (workspace_id,))


@app.post("/api/brand-assets", status_code=201)
def register_brand_asset(
    payload: BrandAssetIn,
    role: str = Depends(get_demo_role),
    workspace_id: str = Depends(get_workspace_id),
):
    """Register a new brand asset. Requires brand_admin role."""
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to register brand assets.")

    data = payload.model_dump()
    data["id"] = ident("asset")
    data["workspace_id"] = workspace_id
    data["created_at"] = now()
    data["updated_at"] = now()

    with db() as conn:
        conn.execute(
            """
            INSERT INTO brand_assets (
                id, name, asset_type, content_hash, source,
                license_status, license_notes, approval_status,
                workspace_id, created_at, updated_at
            ) VALUES (
                :id, :name, :asset_type, :content_hash, :source,
                :license_status, :license_notes, :approval_status,
                :workspace_id, :created_at, :updated_at
            )
            """,
            data,
        )
    return data


@app.put("/api/brand-assets/{asset_id}")
def update_brand_asset(
    asset_id: str,
    payload: BrandAssetIn,
    role: str = Depends(get_demo_role),
    workspace_id: str = Depends(get_workspace_id),
):
    """Update a brand asset. Requires brand_admin role and strictly scoped to caller workspace."""
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to update brand assets.")

    existing = row("SELECT id, workspace_id FROM brand_assets WHERE id=?", (asset_id,))
    if not existing:
        raise HTTPException(404, "Brand asset not found.")
    if existing.get("workspace_id") and existing["workspace_id"] != workspace_id:
        raise HTTPException(403, "Access to brand assets outside caller workspace is forbidden.")

    data = payload.model_dump()
    data["id"] = asset_id
    data["workspace_id"] = workspace_id
    data["updated_at"] = now()

    with db() as conn:
        conn.execute(
            """
            UPDATE brand_assets SET
                name = :name,
                asset_type = :asset_type,
                content_hash = :content_hash,
                source = :source,
                license_status = :license_status,
                license_notes = :license_notes,
                approval_status = :approval_status,
                updated_at = :updated_at
            WHERE id = :id AND workspace_id = :workspace_id
            """,
            data,
        )
    return row("SELECT * FROM brand_assets WHERE id=? AND workspace_id=?", (asset_id, workspace_id))


@app.delete("/api/brand-assets/{asset_id}", status_code=204)
def delete_brand_asset(
    asset_id: str,
    role: str = Depends(get_demo_role),
    workspace_id: str = Depends(get_workspace_id),
):
    """Remove a brand asset from the registry. Requires brand_admin role."""
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to remove brand assets.")

    existing = row("SELECT id, workspace_id FROM brand_assets WHERE id=?", (asset_id,))
    if not existing:
        raise HTTPException(404, "Brand asset not found.")
    if existing.get("workspace_id") and existing["workspace_id"] != workspace_id:
        raise HTTPException(403, "Access to brand assets outside caller workspace is forbidden.")

    with db() as conn:
        conn.execute("DELETE FROM brand_assets WHERE id=? AND workspace_id=?", (asset_id, workspace_id))

    return None


# =============================================================================
# Round 3 — Commitment 3: Guideline Health Intelligence
# =============================================================================

@app.get("/api/governance/guideline-health")
def get_guideline_health(
    workspace_id: str = Depends(get_workspace_id),
):
    """
    Return per-rule guideline health statistics including disagreement detection,
    data confidence, and deterministic improvement suggestions scoped by workspace.
    """
    from .guideline_health import compute_guideline_health
    return compute_guideline_health(workspace_id=workspace_id)


@app.post("/api/governance/rule-suggestions/{rule_id}")
def submit_rule_suggestion_action(
    rule_id: str,
    payload: RuleSuggestionAction,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    """
    Accept, defer, or reject a guideline clarification suggestion.
    Stores the decision in rule_suggestions table. Does NOT modify the live rule.
    Accepting a policy proposal requires brand_admin; reviewers may defer/reject.
    """
    if role not in ("reviewer", "brand_admin"):
        raise HTTPException(403, "Reviewer or Brand Admin role required.")
    if payload.action == "accept" and role != "brand_admin":
        raise HTTPException(403, "Brand Admin role required to accept a policy proposal.")

    rule_rec = row("SELECT * FROM rules WHERE id=?", (rule_id,))
    if not rule_rec:
        raise HTTPException(404, "Rule not found.")
    if rule_rec.get("workspace_id") and rule_rec["workspace_id"] != workspace_id:
        raise HTTPException(403, "Access to rules outside caller workspace is forbidden.")

    from .guideline_health import compute_guideline_health
    health_items = compute_guideline_health(workspace_id=workspace_id)
    health_item = next((h for h in health_items if h["rule_id"] == rule_id), None)

    suggestion = None
    if health_item:
        suggestion = health_item.get("suggestion")

    suggestion_id = ident("rsugg")
    ts = now()
    status_map = {"accept": "ACCEPTED", "defer": "DEFERRED", "reject": "REJECTED"}
    new_status = status_map.get(payload.action, "PENDING")

    supporting = rows(
        """SELECT f.id, f.review_id, f.disposition, f.disposition_by
        FROM findings f
        JOIN reviews r ON f.review_id = r.id
        WHERE f.source_id = ? AND r.workspace_id = ?""",
        (rule_id, workspace_id),
    )
    finding_ids = sorted({item["id"] for item in supporting})
    review_ids = sorted({item["review_id"] for item in supporting})
    decisions = [
        {"finding_id": item["id"], "review_id": item["review_id"],
         "disposition": item.get("disposition"), "actor": item.get("disposition_by")}
        for item in supporting if item.get("disposition")
    ]
    with db() as conn:
        conn.execute(
            """
            INSERT INTO rule_suggestions (
                id, rule_id, observed_issue, proposed_clarification,
                ambiguity_addressed, status, reviewed_by, reviewed_at, created_at,
                workspace_id, rule_version, finding_ids, review_ids, decision_evidence,
                sample_count, data_confidence
            ) VALUES (
                :id, :rule_id, :observed_issue, :proposed_clarification,
                :ambiguity_addressed, :status, :reviewed_by, :reviewed_at, :created_at,
                :workspace_id, :rule_version, :finding_ids, :review_ids, :decision_evidence,
                :sample_count, :data_confidence
            )
            """,
            {
                "id": suggestion_id,
                "rule_id": rule_id,
                "observed_issue": suggestion["observed_issue"] if suggestion else None,
                "proposed_clarification": suggestion["proposed_clarification"] if suggestion else None,
                "ambiguity_addressed": suggestion["ambiguity_addressed"] if suggestion else None,
                "status": new_status,
                "reviewed_by": actor,
                "reviewed_at": ts,
                "created_at": ts,
                "workspace_id": workspace_id,
                "rule_version": rule_rec["version"],
                "finding_ids": json.dumps(finding_ids),
                "review_ids": json.dumps(review_ids),
                "decision_evidence": json.dumps(decisions),
                "sample_count": len(review_ids),
                "data_confidence": health_item.get("data_confidence") if health_item else "INSUFFICIENT",
            },
        )
    audit("system", "RULE_SUGGESTION_DECIDED", actor=actor, actor_role=role,
          reason=f"Suggestion {suggestion_id} {new_status.lower()} for rule {rule_id}",
          workspace_id=workspace_id)

    return {
        "id": suggestion_id,
        "rule_id": rule_id,
        "observed_issue": suggestion["observed_issue"] if suggestion else None,
        "proposed_clarification": suggestion["proposed_clarification"] if suggestion else None,
        "ambiguity_addressed": suggestion["ambiguity_addressed"] if suggestion else None,
        "status": new_status,
        "reviewed_by": actor,
        "reviewed_at": ts,
        "created_at": ts,
    }


@app.get("/api/governance/rule-suggestions", response_model=List[RuleSuggestionOut])
def list_rule_suggestions(
    workspace_id: str = Depends(get_workspace_id),
    role: str = Depends(get_demo_role),
):
    """List all persisted rule clarification suggestions for the caller workspace."""
    return rows("SELECT * FROM rule_suggestions WHERE workspace_id=? ORDER BY created_at DESC", (workspace_id,))


@app.post("/api/governance/rule-suggestions/{suggestion_id}/activate")
def activate_rule_suggestion(
    suggestion_id: str,
    payload: RuleActivationIn,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
    workspace_id: str = Depends(get_workspace_id),
):
    """Explicitly publish an accepted proposal using optimistic version checking."""
    if role != "brand_admin":
        raise HTTPException(403, "Brand Admin role required to activate a policy proposal.")
    with db() as conn:
        suggestion_result = conn.execute("SELECT * FROM rule_suggestions WHERE id=?", (suggestion_id,)).fetchone()
        if not suggestion_result:
            raise HTTPException(404, "Rule suggestion not found.")
        suggestion = dict(suggestion_result._mapping)
        if suggestion.get("workspace_id") and suggestion["workspace_id"] != workspace_id:
            raise HTTPException(403, "Access to rule suggestions outside caller workspace is forbidden.")
        if suggestion["status"] != "ACCEPTED":
            raise HTTPException(409, "Only an accepted suggestion may be activated.")
        rule_result = conn.execute("SELECT * FROM rules WHERE id=?", (suggestion["rule_id"],)).fetchone()
        if not rule_result:
            raise HTTPException(404, "Source rule not found.")
        rule_rec = dict(rule_result._mapping)
        if rule_rec.get("workspace_id") and rule_rec["workspace_id"] != workspace_id:
            raise HTTPException(403, "Access to rules outside caller workspace is forbidden.")
        if suggestion.get("workspace_id") != rule_rec.get("workspace_id"):
            raise HTTPException(403, "Suggestion and source rule must belong to the authorized caller workspace.")
        if rule_rec["version"] != payload.expected_rule_version or suggestion.get("rule_version") != payload.expected_rule_version:
            raise HTTPException(409, "Proposal is stale: the active rule version has changed.")
        try:
            new_version = str(int(float(rule_rec["version"])) + 1)
        except (TypeError, ValueError):
            new_version = f"{rule_rec['version']}-next"
        if payload.new_requirement is not None:
            candidate = payload.new_requirement.strip()
            if not candidate or len(candidate) < 2:
                raise HTTPException(422, "Candidate policy requirement cannot be empty.")
            new_requirement = candidate
        else:
            new_requirement = rule_rec["requirement"]
        ts = now()
        # Legacy rules can predate the history table; snapshot their current
        # immutable state before the first activation changes it.
        conn.execute(
            """INSERT INTO rule_versions (id, rule_id, workspace_id, version, title, category, kind,
            pattern, requirement, severity, source_title, source_excerpt, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(rule_id, version) DO NOTHING""",
            (ident("rulever"), rule_rec["id"], rule_rec["workspace_id"], rule_rec["version"],
             rule_rec["title"], rule_rec["category"], rule_rec["kind"], rule_rec["pattern"],
             rule_rec["requirement"], rule_rec["severity"], rule_rec["source_title"],
             rule_rec["source_excerpt"], ts),
        )
        conn.execute("UPDATE rules SET version=?, requirement=? WHERE id=? AND version=?",
                     (new_version, new_requirement, rule_rec["id"], payload.expected_rule_version))
        conn.execute(
            """INSERT INTO rule_versions (id, rule_id, workspace_id, version, title, category, kind,
            pattern, requirement, severity, source_title, source_excerpt, originating_suggestion_id,
            activated_by, activation_reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (ident("rulever"), rule_rec["id"], rule_rec["workspace_id"], new_version, rule_rec["title"],
             rule_rec["category"], rule_rec["kind"], rule_rec["pattern"], new_requirement,
             rule_rec["severity"], rule_rec["source_title"], rule_rec["source_excerpt"], suggestion_id,
             actor, payload.reason, ts),
        )
        conn.execute("UPDATE rule_suggestions SET status='ACTIVATED', activated_by=?, activated_at=? WHERE id=?",
                     (actor, ts, suggestion_id))
        conn.execute("""INSERT INTO audit (id, workspace_id, review_id, action, actor, actor_role, reason, details, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                     (ident("aud"), rule_rec["workspace_id"], "system", "RULE_VERSION_ACTIVATED", actor,
                      role, payload.reason, f"Rule {rule_rec['id']} {rule_rec['version']} -> {new_version}; suggestion {suggestion_id}", ts))
    return {"suggestion_id": suggestion_id, "status": "ACTIVATED", "old_version": payload.expected_rule_version,
            "new_version": new_version, "rule_id": suggestion["rule_id"]}


@app.get("/api/facts/{fact_id}/versions")
def list_fact_versions(fact_id: str, workspace_id: str = Depends(get_workspace_id)):
    """Return immutable fact history only for a fact in the caller's workspace."""
    fact_rec = row("SELECT * FROM facts WHERE id=?", (fact_id,))
    if not fact_rec:
        raise HTTPException(404, "Fact not found.")
    if fact_rec.get("workspace_id") and fact_rec["workspace_id"] != workspace_id:
        raise HTTPException(403, "Access to facts outside caller workspace is forbidden.")
    versions = rows(
        "SELECT * FROM fact_versions WHERE fact_id=? ORDER BY created_at DESC, version DESC",
        (fact_id,),
    )
    if not versions:
        return [{
            "id": f"factver_init_{fact_id}",
            "fact_id": fact_id,
            "version": fact_rec["version"],
            "claim": fact_rec["claim"],
            "value": fact_rec["value"],
            "source_id": fact_rec.get("source_id") or fact_id,
            "source_title": fact_rec["source_title"],
            "source_excerpt": fact_rec["source_excerpt"],
            "effective_at": fact_rec.get("effective_at"),
            "expires_at": fact_rec.get("expires_at"),
            "status": fact_rec["status"],
            "change_reason": "INITIAL_VERSION",
            "changed_by": fact_rec.get("owner", "system"),
            "created_at": fact_rec.get("created_at") or now(),
        }]
    return versions


@app.get("/api/rules/{rule_id}/versions")
def list_rule_versions(rule_id: str, workspace_id: str = Depends(get_workspace_id)):
    """Return immutable rule history only for a rule in the caller's workspace."""
    rule_rec = row("SELECT workspace_id FROM rules WHERE id=?", (rule_id,))
    if not rule_rec:
        raise HTTPException(404, "Rule not found.")
    if rule_rec.get("workspace_id") != workspace_id:
        raise HTTPException(403, "Access to rule versions outside caller workspace is forbidden.")
    return rows(
        "SELECT * FROM rule_versions WHERE rule_id=? AND workspace_id=? ORDER BY created_at",
        (rule_id, workspace_id),
    )



# ── Workspace Member Provisioning ───────────────────────────────────────────
# Production-safe admin-only endpoints for managing workspace membership.
# Only brand_admin actors can add or list members. This is the sole legitimate
# path for provisioning production workspace access.


# ── Production Bootstrap & Workspace Provisioning ───────────────────────────
# Tightly gated bootstrap procedure. Only brand_admin (ADMIN_API_KEY) can execute.
# Checks if system has already been bootstrapped (cannot re-enable itself).
# Allows brand_admin to create workspaces and automatically gain membership,
# preventing bootstrap deadlock.

@app.post("/api/bootstrap", status_code=201, response_model=BootstrapOut)
def bootstrap_production_system(
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """Initial production bootstrap. Requires ADMIN_API_KEY (brand_admin).

    Permanently one-way: checks and records durable state in 'system_state' table.
    Enforces atomic uniqueness on the bootstrap key to eliminate concurrency races.
    Removing all administrator rows after bootstrap does not reopen bootstrap.
    All operations execute in a unified atomic transaction with complete rollback on fault.
    """
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin credential required to execute bootstrap.")

    now_ts = now()
    try:
        with db() as conn:
            # 1. Check durable bootstrap completion state in system_state table
            state = conn.execute(
                "SELECT value FROM system_state WHERE key='bootstrap_completed'"
            ).fetchone()
            if state:
                raise HTTPException(409, "System has already been bootstrapped. Bootstrap cannot be re-executed.")

            # 2. Atomic insertion of bootstrap marker with PRIMARY KEY constraint
            # Guarantees that concurrent requests cannot both pass this boundary.
            conn.execute(
                "INSERT INTO system_state (key, value, created_at) VALUES ('bootstrap_completed', 'true', ?)",
                (now_ts,)
            )

            # 3. Provision root default workspace and initial administrator membership
            conn.execute(
                """INSERT INTO workspaces (id, name, created_at)
                   VALUES ('ws_default', 'Default Production Workspace', ?)
                   ON CONFLICT (id) DO NOTHING""",
                (now_ts,)
            )
            conn.execute(
                """INSERT INTO workspace_members (workspace_id, actor, role, created_at)
                   VALUES ('ws_default', ?, 'brand_admin', ?)
                   ON CONFLICT (workspace_id, actor) DO NOTHING""",
                (ctx["actor"], now_ts)
            )
            if not conn.execute("SELECT 1 FROM brand_profiles WHERE workspace_id='ws_default'").fetchone():
                conn.execute(
                    """INSERT INTO brand_profiles (
                        id, workspace_id, brand_name, primary_color, secondary_color,
                        accent_colors, min_contrast_ratio, approved_logo_aspect, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (ident("profile"), "ws_default", "Brandtrace", "#0f766e", "#040b14", json.dumps(["#2dd4bf"]), 4.5, None, now_ts)
                )

            # 4. Atomic audit event recorded within the same transaction
            conn.execute(
                """
                INSERT INTO audit (id, workspace_id, review_id, action, actor, actor_role, reason, details, created_at)
                VALUES (?, 'ws_default', 'ws_default', 'SYSTEM_BOOTSTRAPPED', ?, 'brand_admin', NULL, ?, ?)
                """,
                (ident("aud"), ctx["actor"], json.dumps({"workspace_id": "ws_default"}), now_ts)
            )
    except HTTPException:
        raise
    except Exception as exc:
        err_msg = str(exc).upper()
        orig = getattr(exc, "orig", None)
        sqlstate = getattr(orig, "sqlstate", None) or getattr(orig, "pgcode", None)
        if (
            "UNIQUE" in err_msg
            or "PRIMARY KEY" in err_msg
            or "DUPLICATE" in err_msg
            or sqlstate == "23505"
        ):
            raise HTTPException(409, "System has already been bootstrapped. Bootstrap cannot be re-executed.")
        logger.error("Bootstrap transaction failed (%s): %s", type(exc).__name__, _safe_database_error(exc))
        raise HTTPException(500, "Bootstrap transaction failed.") from exc

    return {"status": "BOOTSTRAPPED", "workspace_id": "ws_default", "admin": ctx["actor"], "created_at": now_ts}


@app.post("/api/workspaces", status_code=201, response_model=WorkspaceOut)
def create_workspace(
    payload: WorkspaceIn,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """Create a new workspace. Requires brand_admin role.

    Automatically grants the creating brand_admin membership in the new workspace,
    eliminating authorization deadlock when provisioning new workspaces.
    """
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to create workspaces.")

    ws_id = payload.id.strip()
    ws_name = payload.name.strip()
    now_ts = now()

    with db() as conn:
        existing = conn.execute("SELECT 1 FROM workspaces WHERE id=?", (ws_id,)).fetchone()
        if existing:
            raise HTTPException(409, f"Workspace '{ws_id}' already exists.")
        conn.execute(
            "INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)",
            (ws_id, ws_name, now_ts)
        )
        # Automatically register creating admin as brand_admin of the new workspace
        conn.execute(
            """INSERT INTO workspace_members (workspace_id, actor, role, created_at)
               VALUES (?, ?, 'brand_admin', ?)
               ON CONFLICT (workspace_id, actor) DO NOTHING""",
            (ws_id, ctx["actor"], now_ts)
        )

    audit(ws_id, "WORKSPACE_CREATED", ctx["actor"], details=json.dumps({"name": ws_name, "workspace_id": ws_id}), workspace_id=ws_id)
    return {"id": ws_id, "name": ws_name, "demo_mode": config.ALLOW_DEMO_AUTH}


@app.get("/api/workspaces/{workspace_id}/members", response_model=List[WorkspaceMemberOut])
def list_workspace_members(
    workspace_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """List members of a workspace. Requires brand_admin role and membership in the target workspace."""
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to manage workspace members.")
    if not is_actor_authorized_for_workspace(ctx["actor"], workspace_id):
        raise HTTPException(403, f"Authenticated credential is not authorized for workspace '{workspace_id}'.")
    members = rows(
        "SELECT workspace_id, actor, role, created_at FROM workspace_members WHERE workspace_id=?",
        (workspace_id,)
    )
    return members


@app.post("/api/workspaces/{workspace_id}/members", status_code=201, response_model=WorkspaceMemberOut)
def add_workspace_member(
    workspace_id: str,
    payload: WorkspaceMemberIn,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """Add a member to a workspace. Requires brand_admin role and membership in the target workspace.

    This is the sole safe provisioning path for production workspace access.
    The caller must already be an authorized brand_admin for the target workspace.
    """
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to manage workspace members.")
    if not is_actor_authorized_for_workspace(ctx["actor"], workspace_id):
        raise HTTPException(403, f"Authenticated credential is not authorized for workspace '{workspace_id}'.")

    actor = payload.actor.strip()
    role = payload.role

    # Prevent adding demo/synthetic identities in production mode
    if not config.ALLOW_DEMO_AUTH:
        if actor.startswith("demo.") or actor.endswith("@foreign-corp.com"):
            raise HTTPException(422, "Synthetic demo identities cannot be provisioned in production mode.")

    now_ts = now()
    with db() as conn:
        existing = conn.execute(
            "SELECT 1 FROM workspace_members WHERE workspace_id=? AND actor=?",
            (workspace_id, actor)
        ).fetchone()
        if existing:
            raise HTTPException(409, f"Actor '{actor}' is already a member of workspace '{workspace_id}'.")
        conn.execute(
            "INSERT INTO workspace_members (workspace_id, actor, role, created_at) VALUES (?, ?, ?, ?)",
            (workspace_id, actor, role, now_ts)
        )
    audit(workspace_id, "MEMBER_ADDED", ctx["actor"], details=json.dumps({
        "added_actor": actor, "role": role, "workspace_id": workspace_id
    }), workspace_id=workspace_id)
    return {"workspace_id": workspace_id, "actor": actor, "role": role, "created_at": now_ts}


@app.delete("/api/workspaces/{workspace_id}/members/{actor_id}", status_code=204)
def remove_workspace_member(
    workspace_id: str,
    actor_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """Remove a member from a workspace. Requires brand_admin role.

    Actors cannot remove themselves (prevents lockout).
    """
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to manage workspace members.")
    if not is_actor_authorized_for_workspace(ctx["actor"], workspace_id):
        raise HTTPException(403, f"Authenticated credential is not authorized for workspace '{workspace_id}'.")
    if actor_id == ctx["actor"]:
        raise HTTPException(422, "Cannot remove yourself from the workspace.")

    with db() as conn:
        existing = conn.execute(
            "SELECT 1 FROM workspace_members WHERE workspace_id=? AND actor=?",
            (workspace_id, actor_id)
        ).fetchone()
        if not existing:
            raise HTTPException(404, f"Actor '{actor_id}' is not a member of workspace '{workspace_id}'.")
        conn.execute(
            "DELETE FROM workspace_members WHERE workspace_id=? AND actor=?",
            (workspace_id, actor_id)
        )
    audit(workspace_id, "MEMBER_REMOVED", ctx["actor"], details=json.dumps({
        "removed_actor": actor_id, "workspace_id": workspace_id
    }), workspace_id=workspace_id)

# -----------------------------------------------------------------------------
# Enterprise Feature 1: Brand Constitution Intelligence (PDF Guideline Importer)
# -----------------------------------------------------------------------------

@app.post("/api/constitution/import-guidelines", response_model=ConstitutionImportOut)
async def import_brand_guidelines(
    file: UploadFile = File(...),
    consent_ai: bool = Form(False),
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to import brand guidelines.")

    CHUNK_SIZE = 64 * 1024
    chunks = []
    total_bytes = 0
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_UPLOAD_BYTES:
            await file.close()
            raise HTTPException(413, f"File size exceeds maximum permitted {MAX_UPLOAD_BYTES // (1024*1024)} MB.")
        chunks.append(chunk)
    file_bytes = b"".join(chunks)

    try:
        extraction_res = extract_candidates_from_pdf(file_bytes, file.filename or "guidelines.pdf", consent_ai=consent_ai)
    except PDFExtractionError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(422, f"Failed to extract text from PDF: {str(e)}")

    workspace_id = ctx["workspace_id"]
    import_id = ident("imp")
    doc_hash = extraction_res["document_hash"]
    page_count = extraction_res["page_count"]
    candidates = extraction_res["candidates"]
    cand_count = len(candidates)
    created_ts = now()

    with db() as conn:
        conn.execute(
            """
            INSERT INTO constitution_imports (
                id, workspace_id, filename, document_hash, file_size,
                page_count, candidate_count, approved_count, rejected_count,
                status, imported_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'PENDING_REVIEW', ?, ?)
            """,
            (import_id, workspace_id, file.filename or "guidelines.pdf", doc_hash, total_bytes, page_count, cand_count, ctx["actor"], created_ts)
        )
        for c in candidates:
            cand_id = ident("cand")
            conn.execute(
                """
                INSERT INTO imported_rule_candidates (
                    id, import_id, workspace_id, candidate_type, category, kind,
                    pattern, requirement, severity, page_number, section_heading,
                    original_excerpt, extraction_method, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
                """,
                (
                    cand_id, import_id, workspace_id, c["candidate_type"], c["category"], c["kind"],
                    c["pattern"], c["requirement"], c["severity"], c["page_number"], c["section_heading"],
                    c["original_excerpt"], c["extraction_method"], created_ts
                )
            )

    audit(
        import_id, "CONSTITUTION_GUIDELINES_IMPORTED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({"filename": file.filename, "document_hash": doc_hash, "candidates": cand_count}),
        workspace_id=workspace_id
    )

    return row("SELECT * FROM constitution_imports WHERE id=?", (import_id,))


@app.get("/api/constitution/imports", response_model=List[ConstitutionImportOut])
def list_constitution_imports(workspace_id: str = Depends(get_workspace_id)):
    return rows("SELECT * FROM constitution_imports WHERE workspace_id=? ORDER BY created_at DESC", (workspace_id,))


@app.get("/api/constitution/imports/{import_id}/candidates", response_model=List[ImportCandidateOut])
def list_import_candidates(import_id: str, workspace_id: str = Depends(get_workspace_id)):
    return rows("SELECT * FROM imported_rule_candidates WHERE import_id=? AND workspace_id=? ORDER BY page_number ASC, created_at ASC", (import_id, workspace_id))


@app.put("/api/constitution/candidates/{candidate_id}", response_model=ImportCandidateOut)
def update_import_candidate(
    candidate_id: str,
    update: CandidateUpdateIn,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to edit candidate rules.")
    workspace_id = ctx["workspace_id"]
    cand = row("SELECT * FROM imported_rule_candidates WHERE id=? AND workspace_id=?", (candidate_id, workspace_id))
    if not cand:
        raise HTTPException(404, "Candidate not found.")
    if cand["status"] != "PENDING_APPROVAL":
        raise HTTPException(422, f"Candidate cannot be edited in '{cand['status']}' status.")

    fields = []
    params = []
    if update.pattern is not None:
        fields.append("pattern=?")
        params.append(update.pattern)
    if update.requirement is not None:
        fields.append("requirement=?")
        params.append(update.requirement)
    if update.category is not None:
        fields.append("category=?")
        params.append(update.category)
    if update.kind is not None:
        fields.append("kind=?")
        params.append(update.kind)
    if update.severity is not None:
        fields.append("severity=?")
        params.append(update.severity)

    if fields:
        params.extend([candidate_id, workspace_id])
        with db() as conn:
            conn.execute(f"UPDATE imported_rule_candidates SET {', '.join(fields)} WHERE id=? AND workspace_id=?", params)

    return row("SELECT * FROM imported_rule_candidates WHERE id=?", (candidate_id,))


@app.post("/api/constitution/candidates/{candidate_id}/approve")
def approve_import_candidate(
    candidate_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to approve candidate rules.")
    workspace_id = ctx["workspace_id"]
    cand = row("SELECT * FROM imported_rule_candidates WHERE id=? AND workspace_id=?", (candidate_id, workspace_id))
    if not cand:
        raise HTTPException(404, "Candidate not found.")
    if cand["status"] != "PENDING_APPROVAL":
        raise HTTPException(422, f"Candidate is already '{cand['status']}'.")

    import_rec = row("SELECT * FROM constitution_imports WHERE id=?", (cand["import_id"],))
    source_filename = import_rec.get("filename", "Imported Brand Guideline") if import_rec else "Imported Brand Guideline"
    page_ref = f"Page {cand['page_number']}" if cand.get("page_number") else "Guideline Document"
    source_title = f"{source_filename} ({page_ref})"

    ts = now()
    created_entity_id = None

    with db() as conn:
        if cand["candidate_type"] == "fact":
            fact_id = ident("F")
            conn.execute(
                """
                INSERT INTO facts (
                    id, workspace_id, claim, value, owner, status, version,
                    source_title, source_excerpt, created_at, notes
                ) VALUES (?, ?, ?, ?, ?, 'APPROVED', '1.0', ?, ?, ?, ?)
                """,
                (
                    fact_id, workspace_id, cand["pattern"], cand["requirement"], ctx["actor"],
                    source_title, cand["original_excerpt"], ts, f"Imported from {source_filename}"
                )
            )
            created_entity_id = fact_id
        else:
            rule_id = ident("R")
            conn.execute(
                """
                INSERT INTO rules (
                    id, workspace_id, title, category, kind, pattern, requirement,
                    severity, version, status, owner, source_title, source_excerpt,
                    applicable_document_types, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '1.0', 'APPROVED', ?, ?, ?, 'all', ?)
                """,
                (
                    rule_id, workspace_id, f"Rule: {cand['pattern'][:40]}", cand["category"], cand["kind"],
                    cand["pattern"], cand["requirement"], cand["severity"], ctx["actor"],
                    source_title, cand["original_excerpt"], ts
                )
            )
            conn.execute(
                """
                INSERT INTO rule_versions (
                    id, rule_id, workspace_id, version, title, category, kind,
                    pattern, requirement, severity, source_title, source_excerpt,
                    activated_by, activation_reason, created_at
                ) VALUES (?, ?, ?, '1.0', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Brand Guideline Import Approval', ?)
                """,
                (
                    ident("rulever"), rule_id, workspace_id, f"Rule: {cand['pattern'][:40]}",
                    cand["category"], cand["kind"], cand["pattern"], cand["requirement"],
                    cand["severity"], source_title, cand["original_excerpt"], ctx["actor"], ts
                )
            )
            created_entity_id = rule_id

        # Update candidate status
        conn.execute(
            """
            UPDATE imported_rule_candidates
            SET status='APPROVED', reviewed_by=?, reviewed_at=?, review_decision='APPROVED'
            WHERE id=?
            """,
            (ctx["actor"], ts, candidate_id)
        )
        # Update import approved count
        conn.execute(
            "UPDATE constitution_imports SET approved_count=approved_count+1 WHERE id=?",
            (cand["import_id"],)
        )

    audit(
        cand["import_id"], "CONSTITUTION_CANDIDATE_APPROVED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({"candidate_id": candidate_id, "entity_id": created_entity_id, "type": cand["candidate_type"]}),
        workspace_id=workspace_id
    )

    return {
        "status": "APPROVED",
        "candidate_id": candidate_id,
        "created_entity_id": created_entity_id,
        "candidate_type": cand["candidate_type"],
    }


@app.post("/api/constitution/candidates/{candidate_id}/reject")
def reject_import_candidate(
    candidate_id: str,
    body: Optional[CandidateRejectIn] = None,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to reject candidate rules.")
    workspace_id = ctx["workspace_id"]
    cand = row("SELECT * FROM imported_rule_candidates WHERE id=? AND workspace_id=?", (candidate_id, workspace_id))
    if not cand:
        raise HTTPException(404, "Candidate not found.")
    if cand["status"] != "PENDING_APPROVAL":
        raise HTTPException(422, f"Candidate is already '{cand['status']}'.")

    reason = (body.reason if body and body.reason else "Rejected by Brand Administrator")
    ts = now()

    with db() as conn:
        conn.execute(
            """
            UPDATE imported_rule_candidates
            SET status='REJECTED', reviewed_by=?, reviewed_at=?, review_decision='REJECTED', rejection_reason=?
            WHERE id=?
            """,
            (ctx["actor"], ts, reason, candidate_id)
        )
        conn.execute(
            "UPDATE constitution_imports SET rejected_count=rejected_count+1 WHERE id=?",
            (cand["import_id"],)
        )

    audit(
        cand["import_id"], "CONSTITUTION_CANDIDATE_REJECTED", ctx["actor"], actor_role=ctx["role"],
        reason=reason,
        details=json.dumps({"candidate_id": candidate_id}),
        workspace_id=workspace_id
    )

    return {"status": "REJECTED", "candidate_id": candidate_id, "reason": reason}

# -----------------------------------------------------------------------------
# Enterprise Feature 2: Evidence Source Vault
# -----------------------------------------------------------------------------

@app.get("/api/evidence-sources", response_model=List[EvidenceSourceOut])
def list_evidence_sources(workspace_id: str = Depends(get_workspace_id)):
    sources = rows("SELECT * FROM evidence_sources WHERE workspace_id=? ORDER BY created_at DESC", (workspace_id,))
    out = []
    for s in sources:
        sid = s["id"]
        lr_cnt = len(rows("SELECT id FROM rules WHERE workspace_id=? AND (source_id=? OR source_vault_id=?)", (workspace_id, sid, sid)))
        lf_cnt = len(rows("SELECT id FROM facts WHERE workspace_id=? AND (source_id=? OR source_vault_id=?)", (workspace_id, sid, sid)))
        item = dict(s)
        item["linked_rules_count"] = lr_cnt
        item["linked_facts_count"] = lf_cnt
        out.append(item)
    return out


@app.post("/api/evidence-sources", status_code=201, response_model=EvidenceSourceOut)
def create_evidence_source(
    src_in: EvidenceSourceIn,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    if ctx["role"] not in ("brand_admin", "reviewer"):
        raise HTTPException(403, "Reviewer or Brand Admin role required to register evidence sources.")
    workspace_id = ctx["workspace_id"]
    sid = ident("src")
    ts = now()
    content_hash = src_in.content_hash or hashlib.sha256(src_in.excerpt.encode("utf-8")).hexdigest()

    with db() as conn:
        conn.execute(
            """
            INSERT INTO evidence_sources (
                id, workspace_id, title, source_type, file_name, url,
                content_hash, version, page_reference, section_reference,
                excerpt, owner, verification_status, last_verified_at,
                effective_at, expires_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sid, workspace_id, src_in.title, src_in.source_type, src_in.file_name,
                src_in.url, content_hash, src_in.version, src_in.page_reference,
                src_in.section_reference, src_in.excerpt, src_in.owner,
                src_in.verification_status, ts, src_in.effective_at,
                src_in.expires_at, ts, ts
            )
        )

    audit(
        sid, "EVIDENCE_SOURCE_CREATED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({"title": src_in.title, "hash": content_hash, "version": src_in.version}),
        workspace_id=workspace_id
    )

    created = row("SELECT * FROM evidence_sources WHERE id=?", (sid,))
    res = dict(created)
    res["linked_rules_count"] = 0
    res["linked_facts_count"] = 0
    return res


@app.get("/api/evidence-sources/{source_id}")
def get_evidence_source(source_id: str, workspace_id: str = Depends(get_workspace_id)):
    s = row("SELECT * FROM evidence_sources WHERE id=? AND workspace_id=?", (source_id, workspace_id))
    if not s:
        raise HTTPException(404, f"Evidence source '{source_id}' not found.")
    linked_rules = rows("SELECT id, title, kind, pattern, severity, status FROM rules WHERE workspace_id=? AND (source_id=? OR source_vault_id=?)", (workspace_id, source_id, source_id))
    linked_facts = rows("SELECT id, claim, value, status, expires_at FROM facts WHERE workspace_id=? AND (source_id=? OR source_vault_id=?)", (workspace_id, source_id, source_id))
    out = dict(s)
    out["linked_rules"] = linked_rules
    out["linked_facts"] = linked_facts
    out["linked_rules_count"] = len(linked_rules)
    out["linked_facts_count"] = len(linked_facts)
    return out


@app.put("/api/evidence-sources/{source_id}", response_model=EvidenceSourceOut)
def update_evidence_source(
    source_id: str,
    update: EvidenceSourceUpdateIn,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to modify evidence sources.")
    workspace_id = ctx["workspace_id"]
    s = row("SELECT * FROM evidence_sources WHERE id=? AND workspace_id=?", (source_id, workspace_id))
    if not s:
        raise HTTPException(404, f"Evidence source '{source_id}' not found.")

    fields = ["updated_at=?"]
    params = [now()]
    if update.title is not None:
        fields.append("title=?")
        params.append(update.title)
    if update.source_type is not None:
        fields.append("source_type=?")
        params.append(update.source_type)
    if update.excerpt is not None:
        fields.append("excerpt=?")
        params.append(update.excerpt)
        new_hash = hashlib.sha256(update.excerpt.encode("utf-8")).hexdigest()
        fields.append("content_hash=?")
        params.append(new_hash)
    if update.version is not None:
        fields.append("version=?")
        params.append(update.version)
    if update.verification_status is not None:
        fields.append("verification_status=?")
        params.append(update.verification_status)
    if update.owner is not None:
        fields.append("owner=?")
        params.append(update.owner)
    if update.page_reference is not None:
        fields.append("page_reference=?")
        params.append(update.page_reference)
    if update.section_reference is not None:
        fields.append("section_reference=?")
        params.append(update.section_reference)
    if update.expires_at is not None:
        fields.append("expires_at=?")
        params.append(update.expires_at)

    params.extend([source_id, workspace_id])
    with db() as conn:
        conn.execute(f"UPDATE evidence_sources SET {', '.join(fields)} WHERE id=? AND workspace_id=?", params)

    audit(
        source_id, "EVIDENCE_SOURCE_UPDATED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({"updated_fields": [f.split("=")[0] for f in fields[:-1]]}),
        workspace_id=workspace_id
    )

    updated = row("SELECT * FROM evidence_sources WHERE id=?", (source_id,))
    res = dict(updated)
    lr_cnt = len(rows("SELECT id FROM rules WHERE workspace_id=? AND (source_id=? OR source_vault_id=?)", (workspace_id, source_id, source_id)))
    lf_cnt = len(rows("SELECT id FROM facts WHERE workspace_id=? AND (source_id=? OR source_vault_id=?)", (workspace_id, source_id, source_id)))
    res["linked_rules_count"] = lr_cnt
    res["linked_facts_count"] = lf_cnt
    return res


@app.delete("/api/evidence-sources/{source_id}", status_code=204)
def delete_evidence_source(
    source_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to delete evidence sources.")
    workspace_id = ctx["workspace_id"]
    s = row("SELECT * FROM evidence_sources WHERE id=? AND workspace_id=?", (source_id, workspace_id))
    if not s:
        raise HTTPException(404, f"Evidence source '{source_id}' not found.")

    with db() as conn:
        conn.execute("DELETE FROM evidence_sources WHERE id=? AND workspace_id=?", (source_id, workspace_id))

    audit(source_id, "EVIDENCE_SOURCE_DELETED", ctx["actor"], actor_role=ctx["role"], workspace_id=workspace_id)
    return Response(status_code=204)

# -----------------------------------------------------------------------------
# Enterprise Feature 3: Deterministic Rule Conflict Detection
# -----------------------------------------------------------------------------

@app.post("/api/rules/check-conflicts", response_model=List[RuleConflictOut])
def check_rule_conflicts(
    candidate: RuleIn,
    workspace_id: str = Depends(get_workspace_id),
):
    active_rules = rows("SELECT * FROM rules WHERE workspace_id=? AND status='APPROVED'", (workspace_id,))
    cand_dict = candidate.model_dump()
    cand_dict["id"] = "PROPOSED_RULE"
    return check_candidate_conflicts(cand_dict, active_rules)


@app.get("/api/governance/rule-conflicts", response_model=List[RuleConflictOut])
def get_rule_conflicts(workspace_id: str = Depends(get_workspace_id)):
    active_rules = rows("SELECT * FROM rules WHERE workspace_id=? AND status='APPROVED'", (workspace_id,))
    return scan_all_rule_conflicts(active_rules)

# -----------------------------------------------------------------------------
# Enterprise Feature 4: Downloadable Compliance Evidence Packet
# -----------------------------------------------------------------------------

@app.get("/api/reviews/{review_id}/export-evidence")
def export_evidence_packet(
    review_id: str,
    format: str = "pdf",
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    workspace_id = ctx["workspace_id"]
    rev = row("SELECT * FROM reviews WHERE id=? AND workspace_id=?", (review_id, workspace_id))
    if not rev:
        raise HTTPException(404, f"Review '{review_id}' not found in workspace.")

    audit(
        review_id, "COMPLIANCE_EVIDENCE_EXPORTED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({"export_format": format.lower()}),
        workspace_id=workspace_id
    )

    fmt = format.lower().strip()
    if fmt == "json":
        packet_json = build_compliance_packet_json(review_id, workspace_id=workspace_id)
        return JSONResponse(content=packet_json)
    elif fmt == "pdf":
        try:
            pdf_bytes = build_compliance_packet_pdf(review_id, workspace_id=workspace_id)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="brandtrace-evidence-{review_id}.pdf"'
                }
            )
        except Exception as e:
            raise HTTPException(500, f"Failed to generate evidence PDF: {str(e)}")
    else:
        raise HTTPException(422, f"Unsupported export format '{format}'. Supported formats are 'pdf' and 'json'.")

# -----------------------------------------------------------------------------
# Enterprise Feature 5: Review Assignment & Collaboration
# -----------------------------------------------------------------------------

@app.patch("/api/reviews/{review_id}/assignment", response_model=ReviewOut)
def update_review_assignment(
    review_id: str,
    assignment: ReviewAssignmentIn,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    if ctx["role"] not in ("reviewer", "brand_admin"):
        raise HTTPException(403, "Reviewer or Brand Admin role required to assign reviews.")
    workspace_id = ctx["workspace_id"]
    rev = row("SELECT * FROM reviews WHERE id=? AND workspace_id=?", (review_id, workspace_id))
    if not rev:
        raise HTTPException(404, f"Review '{review_id}' not found.")

    fields = ["updated_at=?"]
    params = [now()]
    if assignment.assigned_to is not None:
        fields.append("assigned_to=?")
        params.append(assignment.assigned_to)
    if assignment.priority is not None:
        fields.append("priority=?")
        params.append(assignment.priority)
    if assignment.due_date is not None:
        fields.append("due_date=?")
        params.append(assignment.due_date)

    params.extend([review_id, workspace_id])
    with db() as conn:
        conn.execute(f"UPDATE reviews SET {', '.join(fields)} WHERE id=? AND workspace_id=?", params)

    audit(
        review_id, "REVIEW_ASSIGNMENT_UPDATED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps(assignment.model_dump(exclude_unset=True)),
        workspace_id=workspace_id
    )

    return get_review(review_id, workspace_id=workspace_id)


@app.get("/api/reviews/{review_id}/comments", response_model=List[ReviewCommentOut])
def list_review_comments(review_id: str, workspace_id: str = Depends(get_workspace_id)):
    return rows("SELECT * FROM review_comments WHERE review_id=? AND workspace_id=? ORDER BY created_at ASC", (review_id, workspace_id))


@app.post("/api/reviews/{review_id}/comments", status_code=201, response_model=ReviewCommentOut)
def add_review_comment(
    review_id: str,
    comment_in: ReviewCommentIn,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    workspace_id = ctx["workspace_id"]
    rev = row("SELECT * FROM reviews WHERE id=? AND workspace_id=?", (review_id, workspace_id))
    if not rev:
        raise HTTPException(404, f"Review '{review_id}' not found.")

    cid = ident("rem")
    ts = now()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO review_comments (
                id, workspace_id, review_id, finding_id, author, author_role, comment, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (cid, workspace_id, review_id, comment_in.finding_id, ctx["actor"], ctx["role"], comment_in.comment, ts)
        )

    audit(
        review_id, "REVIEW_COMMENT_ADDED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({"comment_id": cid, "finding_id": comment_in.finding_id}),
        workspace_id=workspace_id
    )

    return row("SELECT * FROM review_comments WHERE id=?", (cid,))

# -----------------------------------------------------------------------------
# Enterprise Feature 6: Proactive Expiry Monitoring & Governance Alerts
# -----------------------------------------------------------------------------

@app.post("/api/governance/expiry-scan", response_model=ExpiryScanOut)
def trigger_expiry_scan(ctx: Dict[str, str] = Depends(get_auth_context)):
    workspace_id = ctx["workspace_id"]
    res = run_expiry_scan(workspace_id)
    audit(
        workspace_id, "GOVERNANCE_EXPIRY_SCAN", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps(res),
        workspace_id=workspace_id
    )
    return res


@app.get("/api/governance/expiry-alerts", response_model=List[GovernanceAlertOut])
def get_governance_alerts(
    status: Optional[str] = "ACTIVE",
    workspace_id: str = Depends(get_workspace_id)
):
    return list_governance_alerts(workspace_id=workspace_id, status=status)


@app.post("/api/governance/expiry-alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    workspace_id = ctx["workspace_id"]
    success = acknowledge_governance_alert(alert_id, workspace_id=workspace_id, actor=ctx["actor"])
    if not success:
        raise HTTPException(404, f"Alert '{alert_id}' not found.")
    audit(
        workspace_id, "GOVERNANCE_ALERT_ACKNOWLEDGED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({"alert_id": alert_id}),
        workspace_id=workspace_id
    )
    return {"status": "ACKNOWLEDGED", "alert_id": alert_id}


@app.post("/api/governance/expiry-worker/trigger")
def trigger_expiry_worker(
    ctx: Dict[str, str] = Depends(get_auth_context)
):
    """
    Trigger proactive expiry worker with retry loop, re-review generation, and job tracking.
    """
    workspace_id = ctx["workspace_id"]
    job_result = execute_expiry_job(workspace_id=workspace_id, max_retries=3)
    audit(
        workspace_id, "EXPIRY_WORKER_EXECUTED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({"job_id": job_result.get("job_id"), "status": job_result.get("job_status")}),
        workspace_id=workspace_id
    )
    return job_result


@app.get("/api/governance/expiry-jobs")
def get_expiry_jobs(
    limit: int = 20,
    workspace_id: str = Depends(get_workspace_id)
):
    """List execution history of scheduled governance jobs."""
    return list_governance_jobs(workspace_id=workspace_id, limit=limit)


@app.get("/api/brand-assets/{asset_id}/similarity")
def check_asset_similarity(
    asset_id: str,
    target_asset_id: str,
    workspace_id: str = Depends(get_workspace_id)
):
    """Compute perceptual similarity score between two registered brand assets."""
    a1 = row("SELECT * FROM brand_assets WHERE id=? AND workspace_id=?", (asset_id, workspace_id))
    a2 = row("SELECT * FROM brand_assets WHERE id=? AND workspace_id=?", (target_asset_id, workspace_id))
    if not a1 or not a2:
        raise HTTPException(404, "One or both brand assets not found in workspace.")

    hash1 = a1.get("perceptual_hash") or a1.get("content_hash", "")[:16]
    hash2 = a2.get("perceptual_hash") or a2.get("content_hash", "")[:16]
    similarity = perceptual_similarity_score(hash1, hash2)
    return {
        "asset_1": a1["name"],
        "asset_2": a2["name"],
        "similarity_score": similarity,
        "is_perceptually_equivalent": similarity >= 90.0,
    }


@app.post("/api/documents/ocr", response_model=OcrResponseOut)
async def process_document_ocr(
    file: UploadFile = File(...),
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """
    Provider-independent OCR endpoint for scanned PDFs and graphic image assets.
    Extracts text with confidence scoring, detected word counts, and page breakdown.
    """
    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File exceeds upload limits.")

    filename = (file.filename or "").lower()
    mime = (file.content_type or "").lower()

    if filename.endswith(".pdf") or "pdf" in mime or file_bytes[:4] == b"%PDF":
        res = ocr_pipeline.process_pdf(file_bytes)
        file_type = "pdf"
        conf = 1.0 if res.get("digital_pages", 0) > 0 and res.get("scanned_pages", 0) == 0 else 0.85
        total_p = res.get("total_pages", 1)
        scanned_p = res.get("scanned_pages", 0)
        digital_p = res.get("digital_pages", 0)
        text = res.get("extracted_text", "")
        method = res.get("extraction_method", "HYBRID_OCR")
        words = len(text.split()) if text else 0
        pages = res.get("pages", [])
    elif filename.endswith((".png", ".jpg", ".jpeg", ".webp")) or mime.startswith("image/"):
        res = ocr_pipeline.process_image(file_bytes)
        file_type = "image"
        conf = float(res.get("confidence", 0.0))
        total_p = 1
        scanned_p = 1
        digital_p = 0
        text = res.get("extracted_text", "")
        method = f"OCR_{res.get('ocr_engine', 'EASYOCR')}"
        words = int(res.get("words_detected", 0))
        pages = [res]
    else:
        raise HTTPException(415, "Unsupported file format for OCR. Provide PDF, PNG, or JPEG.")

    audit(
        ctx["workspace_id"], "OCR_EXTRACTION_PERFORMED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({"filename": filename, "method": method, "words": words}),
        workspace_id=ctx["workspace_id"]
    )

    return {
        "status": "SUCCESS" if text else "EMPTY",
        "file_type": file_type,
        "total_pages": total_p,
        "scanned_pages": scanned_p,
        "digital_pages": digital_p,
        "extracted_text": text,
        "confidence": round(conf, 3),
        "words_detected": words,
        "extraction_method": method,
        "pages": pages,
    }


@app.post("/api/brand-assets/placement-check", response_model=LogoPlacementOut)
async def check_logo_placement(
    canvas_file: UploadFile = File(...),
    template_file: UploadFile = File(...),
    expected_location: Optional[str] = Form(None),
    min_scale_pct: float = Form(4.0),
    max_scale_pct: float = Form(40.0),
    required_clearspace_ratio: float = Form(0.5),
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """
    Computer vision logo detection and clearspace verification.
    Validates bounding box, relative quadrant, scale percentage, and clearspace exclusion zone (M >= 0.5H).
    """
    canvas_bytes = await canvas_file.read()
    template_bytes = await template_file.read()

    try:
        result = detect_logo_placement(
            canvas_bytes=canvas_bytes,
            template_logo_bytes=template_bytes,
            expected_location=expected_location,
            min_scale_pct=min_scale_pct,
            max_scale_pct=max_scale_pct,
            required_clearspace_ratio=required_clearspace_ratio,
        )
    except Exception as e:
        raise HTTPException(422, f"Logo placement detection failed: {str(e)}")

    audit(
        ctx["workspace_id"], "LOGO_PLACEMENT_EVALUATED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({
            "matched": result["matched"],
            "compliant": result["placement_compliant"],
            "detected_location": result["relative_position"]["detected_location"] if result["matched"] else "NONE",
        }),
        workspace_id=ctx["workspace_id"]
    )

    return result


@app.post("/api/documents/typography-check", response_model=TypographyComplianceOut)
async def check_typography_compliance(
    file: UploadFile = File(...),
    approved_fonts: Optional[str] = Form(None),
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """
    Extract embedded font metadata from PDFs or analyze raster text typography.
    Evaluates font family and style compliance against Brand Constitution guidelines.
    """
    doc_bytes = await file.read()
    filename = (file.filename or "").lower()
    mime = (file.content_type or "").lower()
    file_type = "pdf" if (filename.endswith(".pdf") or "pdf" in mime or doc_bytes[:4] == b"%PDF") else "image"

    font_list = None
    if approved_fonts:
        font_list = [f.strip() for f in approved_fonts.split(",") if f.strip()]

    if not font_list:
        font_list = ["Inter", "Helvetica", "Arial", "Roboto", "Montserrat", "Segoe UI"]

    try:
        result = evaluate_typography_compliance(
            document_bytes=doc_bytes,
            file_type=file_type,
            approved_fonts=font_list,
        )
    except Exception as e:
        raise HTTPException(422, f"Typography analysis failed: {str(e)}")

    audit(
        ctx["workspace_id"], "TYPOGRAPHY_COMPLIANCE_EVALUATED", ctx["actor"], actor_role=ctx["role"],
        details=json.dumps({
            "file_type": file_type,
            "compliant": result["compliant"],
            "detected_fonts_count": len(result["detected_fonts"]),
        }),
        workspace_id=ctx["workspace_id"]
    )

    return result


@app.post("/api/governance/expiry-worker/start-scheduler")
def start_expiry_scheduler(
    interval_seconds: int = 3600,
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """Start background expiry and re-review scheduler worker."""
    if ctx["role"] not in ("brand_admin", "admin"):
        raise HTTPException(403, "Only brand_admin can manage background scheduler.")
    scheduler_worker.check_interval_seconds = interval_seconds
    scheduler_worker.start()
    return {"status": "RUNNING", "interval_seconds": interval_seconds}


@app.post("/api/governance/expiry-worker/stop-scheduler")
def stop_expiry_scheduler(
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """Stop background expiry scheduler worker."""
    if ctx["role"] not in ("brand_admin", "admin"):
        raise HTTPException(403, "Only brand_admin can manage background scheduler.")
    scheduler_worker.stop()
    return {"status": "STOPPED"}


@app.get("/api/governance/expiry-worker/status", response_model=WorkerStatusOut)
def get_expiry_worker_status_endpoint(
    ctx: Dict[str, str] = Depends(get_auth_context),
):
    """Get status of background expiry worker and recent governance audit jobs."""
    return get_worker_status()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, app_dir="backend")
