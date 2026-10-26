"""
BRANDTRACE API — Evidence-Linked Brand Governance Platform.
Supports deterministic-first brand rules, claim verification, model/offline triage,
human approval gates, multi-format (PDF/Image) analysis, audit ledger, and governance insights.
"""
from __future__ import annotations

import json
import os
import re
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, Depends, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import (
    CORS_ORIGINS,
    MAX_CONTENT_CHARS,
    MAX_UPLOAD_BYTES,
    normalize_database_url,
)
from .models import (
    ENGINE,
    get_engine,
    db,
    rows,
    row,
    ident,
    now,
    init_db,
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
)
from .governance import run_governance_analysis, is_expired, calculate_health_score
from .pdf_parser import extract_pdf_pages, format_pdf_text_for_review, PDFExtractionError
from .image_analyzer import analyze_image_compliance, ImageAnalysisError
from .impact_map import calculate_impact_map, trigger_targeted_rereview

def get_demo_role(x_demo_role: Optional[str] = Header(None)) -> str:
    """Extract simulated role from X-Demo-Role header or default to reviewer."""
    role = (x_demo_role or "reviewer").lower().strip()
    if role not in ("creator", "reviewer", "brand_admin", "auditor"):
        return "reviewer"
    return role

def get_demo_actor(x_demo_actor: Optional[str] = Header(None)) -> str:
    return (x_demo_actor or "demo.user").strip()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

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
    init_db()
    with db() as conn:
        conn.execute("SELECT 1")
    return {"status": "ready", "database": get_engine().dialect.name}

@app.post("/api/demo/setup")
async def demo_setup():
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

        # Seed baseline fact
        if not rows("SELECT * FROM facts"):
            conn.execute(
                """
                INSERT INTO facts (
                    id, workspace_id, claim, value, owner, status, version,
                    source_id, source_title, source_excerpt, review_at,
                    effective_at, expires_at, created_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
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
                ),
            )

    return await overview()

@app.post("/api/demo/reset")
async def demo_reset():
    """Completely wipe and restore pristine Northstar demo data."""
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM findings")
        conn.execute("DELETE FROM review_versions")
        conn.execute("DELETE FROM reviews")
        conn.execute("DELETE FROM audit")
        conn.execute("DELETE FROM rules")
        conn.execute("DELETE FROM facts")
        conn.execute("DELETE FROM brand_profiles")
        conn.execute("DELETE FROM workspaces")

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

        # Seed baseline fact
        conn.execute(
            """
            INSERT INTO facts (
                id, workspace_id, claim, value, owner, status, version,
                source_id, source_title, source_excerpt, review_at,
                effective_at, expires_at, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
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
            ),
        )

    # Seed 1 sample initial review with findings
    sample_id = "rev_launch_q4"
    sample_content = "Brandtrace is the best and cheap way to verify marketing claims in India."
    sample_review = {
        "id": sample_id,
        "workspace_id": "ws_default",
        "title": "Launch announcement — Q4",
        "content": sample_content,
        "content_type": "announcement",
        "status": "IN_REVIEW",
        "score": 100,
        "author": "creator@demo.com",
        "reviewer": None,
        "file_name": None,
        "file_mime": None,
        "file_size": None,
        "analysis_method": "DETERMINISTIC_FIRST",
        "rule_versions": json.dumps({"R-VOICE-01": "1.2", "R-TERM-02": "1.0", "R-TERM-03": "1.0"}),
        "created_at": now(),
        "updated_at": now(),
    }
    with db() as conn:
        conn.execute(
            """
            INSERT INTO reviews (
                id, workspace_id, title, content, content_type, status,
                score, author, reviewer, file_name, file_mime, file_size,
                analysis_method, rule_versions, created_at, updated_at
            ) VALUES (
                :id, :workspace_id, :title, :content, :content_type, :status,
                :score, :author, :reviewer, :file_name, :file_mime, :file_size,
                :analysis_method, :rule_versions, :created_at, :updated_at
            )
            """,
            sample_review,
        )

    save_version(sample_id, sample_content, "ORIGINAL_SUBMISSION", created_by="creator@demo.com")
    await run_governance_analysis(sample_review)
    audit(sample_id, "REVIEW_CREATED", actor="creator@demo.com", actor_role="creator")

    return await overview()

@app.get("/api/overview")
async def overview():
    recent_reviews = rows("SELECT * FROM reviews ORDER BY created_at DESC LIMIT 6")
    for r in recent_reviews:
        r["findings"] = rows("SELECT * FROM findings WHERE review_id=?", (r["id"],))

    bp = row("SELECT * FROM brand_profiles WHERE workspace_id='ws_default'")
    if bp and isinstance(bp.get("accent_colors"), str):
        try:
            bp["accent_colors"] = json.loads(bp["accent_colors"])
        except Exception:
            bp["accent_colors"] = []

    metrics = {
        "total_reviews": len(rows("SELECT id FROM reviews")),
        "open_findings": len(rows("SELECT id FROM findings WHERE disposition IS NULL")),
        "pending_approval": len(rows("SELECT id FROM reviews WHERE status IN ('IN_REVIEW', 'PENDING_APPROVAL')")),
        "approved": len(rows("SELECT id FROM reviews WHERE status='APPROVED'")),
        "rules_count": len(rows("SELECT id FROM rules WHERE status='APPROVED'")),
        "facts_count": len(rows("SELECT id FROM facts WHERE status='APPROVED'")),
    }

    return {
        "workspace": {"id": "ws_default", "name": "Northstar demo workspace", "demo_mode": True},
        "reviews": recent_reviews,
        "metrics": metrics,
        "brand_profile": bp,
    }

# -----------------------------------------------------------------------------
# Brand Constitution: Rules & Facts
# -----------------------------------------------------------------------------

@app.get("/api/rules")
def list_rules():
    return rows("SELECT * FROM rules ORDER BY title")

@app.post("/api/rules", status_code=201)
def create_rule(
    payload: RuleIn,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
):
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to create or modify brand rules.")

    data = payload.model_dump()
    data["id"] = ident("rule")
    data["workspace_id"] = "ws_default"
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
    return data

@app.put("/api/rules/{rule_id}")
def update_rule(
    rule_id: str,
    payload: RuleUpdateIn,
    role: str = Depends(get_demo_role),
):
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to update brand rules.")

    existing = row("SELECT * FROM rules WHERE id=?", (rule_id,))
    if not existing:
        raise HTTPException(404, "Rule not found.")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return existing

    set_clauses = [f"{k}=:{k}" for k in updates.keys()]
    updates["id"] = rule_id
    with db() as conn:
        conn.execute(f"UPDATE rules SET {', '.join(set_clauses)} WHERE id=:id", updates)

    return row("SELECT * FROM rules WHERE id=?", (rule_id,))

@app.get("/api/facts")
def list_facts():
    return rows("SELECT * FROM facts ORDER BY claim")

@app.post("/api/facts", status_code=201)
def create_fact(
    payload: FactIn,
    role: str = Depends(get_demo_role),
):
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to create or modify approved facts.")

    data = payload.model_dump()
    data["id"] = ident("fact")
    data["workspace_id"] = "ws_default"
    data["created_at"] = now()
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
    return data

@app.put("/api/facts/{fact_id}")
def update_fact(
    fact_id: str,
    payload: FactUpdateIn,
    role: str = Depends(get_demo_role),
):
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to update approved facts.")

    existing = row("SELECT * FROM facts WHERE id=?", (fact_id,))
    if not existing:
        raise HTTPException(404, "Fact not found.")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return existing

    set_clauses = [f"{k}=:{k}" for k in updates.keys()]
    updates["id"] = fact_id
    with db() as conn:
        conn.execute(f"UPDATE facts SET {', '.join(set_clauses)} WHERE id=:id", updates)

    return row("SELECT * FROM facts WHERE id=?", (fact_id,))

@app.get("/api/brand-profile")
def get_brand_profile():
    bp = row("SELECT * FROM brand_profiles WHERE workspace_id='ws_default'")
    if bp and isinstance(bp.get("accent_colors"), str):
        try:
            bp["accent_colors"] = json.loads(bp["accent_colors"])
        except Exception:
            bp["accent_colors"] = []
    return bp

@app.put("/api/brand-profile")
def update_brand_profile(
    payload: BrandProfileIn,
    role: str = Depends(get_demo_role),
):
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to modify visual brand profile.")

    existing = row("SELECT id FROM brand_profiles WHERE workspace_id='ws_default'")
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
                (pid, "ws_default", payload.brand_name, payload.primary_color, payload.secondary_color, acc, payload.min_contrast_ratio, payload.approved_logo_aspect, now())
            )
    return get_brand_profile()

# -----------------------------------------------------------------------------
# Reviews & Analysis
# -----------------------------------------------------------------------------

@app.get("/api/reviews")
def list_reviews():
    result = rows("SELECT * FROM reviews ORDER BY created_at DESC")
    for item in result:
        item["findings"] = rows("SELECT * FROM findings WHERE review_id=?", (item["id"],))
        item["score"] = calculate_health_score(item["findings"])
    return result

@app.post("/api/reviews")
async def create_review(
    payload: ReviewIn,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
):
    if role == "auditor":
        raise HTTPException(403, "Auditor role has read-only access.")

    rid = ident("review")
    active_rules = rows("SELECT id, version FROM rules WHERE status='APPROVED'")
    rule_versions = {r["id"]: r["version"] for r in active_rules}

    review = {
        "id": rid,
        "workspace_id": "ws_default",
        "title": payload.title,
        "content": payload.content,
        "content_type": payload.content_type,
        "status": "IN_REVIEW",
        "score": 100,
        "author": actor or "creator@demo.com",
        "reviewer": None,
        "file_name": None,
        "file_mime": None,
        "file_size": None,
        "analysis_method": "DETERMINISTIC_FIRST",
        "rule_versions": json.dumps(rule_versions),
        "created_at": now(),
        "updated_at": now(),
    }

    with db() as conn:
        conn.execute(
            """
            INSERT INTO reviews (
                id, workspace_id, title, content, content_type, status,
                score, author, reviewer, file_name, file_mime, file_size,
                analysis_method, rule_versions, created_at, updated_at
            ) VALUES (
                :id, :workspace_id, :title, :content, :content_type, :status,
                :score, :author, :reviewer, :file_name, :file_mime, :file_size,
                :analysis_method, :rule_versions, :created_at, :updated_at
            )
            """,
            review,
        )

    save_version(rid, payload.content, "ORIGINAL_SUBMISSION", created_by=actor)
    await run_governance_analysis(review)
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
    content_type: str = Form("document"),
    file: UploadFile = File(...),
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
):
    """
    Multi-format review endpoint.
    Accepts text (.txt, .md), PDF (.pdf), or Image (.png, .jpg).
    Extracts content safely, runs governance analysis, and generates structured findings.
    """
    if role == "auditor":
        raise HTTPException(403, "Auditor role has read-only access.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File size exceeds maximum permitted {MAX_UPLOAD_BYTES // (1024*1024)} MB.")

    filename = (file.filename or "upload").lower()
    mime = (file.content_type or "application/octet-stream").lower()
    extracted_text = ""
    visual_findings: List[Dict[str, Any]] = []

    # 1. Plain text and Markdown
    if filename.endswith((".txt", ".text", ".md", ".markdown")) or mime.startswith("text/"):
        try:
            extracted_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            extracted_text = file_bytes.decode("utf-8", errors="ignore")

    # 2. PDF Processing
    elif filename.endswith(".pdf") or "pdf" in mime:
        try:
            pages = extract_pdf_pages(file_bytes)
            if not pages:
                raise HTTPException(
                    422,
                    "Uploaded PDF contains no extractable text. Scanned document OCR is not configured in this environment.",
                )
            extracted_text = format_pdf_text_for_review(pages)
        except PDFExtractionError as exc:
            raise HTTPException(422, exc.message)

    # 3. Image Processing (Palette, WCAG contrast, Logo aspect, OCR limitation)
    elif filename.endswith((".png", ".jpg", ".jpeg", ".webp")) or mime.startswith("image/"):
        bp = get_brand_profile()
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
            )
            visual_findings = analysis["visual_findings"]
            extracted_text = (
                f"[Visual Asset: {filename} — {analysis['width']}x{analysis['height']}px]\n"
                f"Extracted dominant colours: {', '.join(analysis['dominant_colors'])}\n"
                f"Aspect ratio: {analysis['aspect_ratio']}:1\n"
            )
        except ImageAnalysisError as exc:
            raise HTTPException(422, exc.message)
    else:
        raise HTTPException(
            415,
            f"Unsupported file format '{filename}'. Supported formats: .txt, .md, .pdf, .png, .jpg",
        )

    if not extracted_text.strip():
        raise HTTPException(422, "No readable content could be extracted from uploaded file.")

    rid = ident("review")
    active_rules = rows("SELECT id, version FROM rules WHERE status='APPROVED'")
    rule_versions = {r["id"]: r["version"] for r in active_rules}

    review = {
        "id": rid,
        "workspace_id": "ws_default",
        "title": title,
        "content": extracted_text[:MAX_CONTENT_CHARS],
        "content_type": content_type,
        "status": "IN_REVIEW",
        "score": 100,
        "author": actor or "creator@demo.com",
        "reviewer": None,
        "file_name": file.filename,
        "file_mime": mime,
        "file_size": len(file_bytes),
        "analysis_method": "MULTIMODAL_GOVERNANCE" if visual_findings else "DOCUMENT_EXTRACTION",
        "rule_versions": json.dumps(rule_versions),
        "created_at": now(),
        "updated_at": now(),
    }

    with db() as conn:
        conn.execute(
            """
            INSERT INTO reviews (
                id, workspace_id, title, content, content_type, status,
                score, author, reviewer, file_name, file_mime, file_size,
                analysis_method, rule_versions, created_at, updated_at
            ) VALUES (
                :id, :workspace_id, :title, :content, :content_type, :status,
                :score, :author, :reviewer, :file_name, :file_mime, :file_size,
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
        details=f"Uploaded {filename} ({len(file_bytes)} bytes, MIME {mime}).",
    )
    return get_review(rid)

@app.get("/api/reviews/{review_id}")
def get_review(review_id: str):
    rev = row("SELECT * FROM reviews WHERE id=?", (review_id,))
    if not rev:
        raise HTTPException(404, "Review not found")
    rev["findings"] = rows("SELECT * FROM findings WHERE review_id=?", (review_id,))
    rev["versions"] = rows("SELECT * FROM review_versions WHERE review_id=? ORDER BY created_at", (review_id,))
    rev["score"] = calculate_health_score(rev["findings"])
    return rev

@app.post("/api/reviews/{review_id}/findings/{finding_id}/actions")
def finding_action(
    review_id: str,
    finding_id: str,
    payload: FindingAction,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
):
    if role == "auditor":
        raise HTTPException(403, "Auditor role has read-only access.")

    rev = get_review(review_id)
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
):
    if role not in ("reviewer", "brand_admin"):
        raise HTTPException(403, "Reviewer or Brand Admin role required for approval decisions.")

    rev = get_review(review_id)
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
):
    if role not in ("creator", "reviewer", "brand_admin"):
        raise HTTPException(403, "Permission denied.")

    ver = row("SELECT * FROM review_versions WHERE id=? AND review_id=?", (version_id, review_id))
    if not ver:
        raise HTTPException(404, "Draft version not found.")

    with db() as conn:
        conn.execute("UPDATE reviews SET content=?, updated_at=? WHERE id=?", (ver["content"], now(), review_id))

    save_version(review_id, ver["content"], f"RESTORED_VERSION_{version_id}", created_by=actor)
    rev = get_review(review_id)
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
def get_audit(review_id: str):
    get_review(review_id)
    return rows("SELECT * FROM audit WHERE review_id=? ORDER BY created_at DESC", (review_id,))

@app.get("/api/reviews/{review_id}/versions")
def get_versions(review_id: str):
    get_review(review_id)
    return rows("SELECT * FROM review_versions WHERE review_id=? ORDER BY created_at", (review_id,))

# -----------------------------------------------------------------------------
# Governance Intelligence & Impact Mapping (Phase 8 & Phase 12)
# -----------------------------------------------------------------------------

@app.get("/api/insights")
def insights():
    recurring = rows("SELECT type label, COUNT(*) count FROM findings GROUP BY type ORDER BY count DESC LIMIT 6")
    unresolved = len(rows("SELECT id FROM findings WHERE disposition IS NULL"))
    dismissed = len(rows("SELECT id FROM findings WHERE disposition='DISMISSED'"))
    unclear = rows("SELECT type label, COUNT(*) count FROM findings WHERE status='NEEDS_REVIEW' GROUP BY type ORDER BY count DESC")

    by_sev_rows = rows("SELECT severity label, COUNT(*) count FROM findings GROUP BY severity")
    by_severity = {r["label"]: r["count"] for r in by_sev_rows}

    by_status_rows = rows("SELECT status label, COUNT(*) count FROM findings GROUP BY status")
    by_evidence_status = {r["label"]: r["count"] for r in by_status_rows}

    disagreements = len(rows("SELECT id FROM findings WHERE disposition IN ('DISMISSED', 'ESCALATED')"))

    return {
        "recurring": recurring,
        "unresolved": unresolved,
        "dismissed": dismissed,
        "unclear_rules": unclear,
        "by_severity": by_severity,
        "by_evidence_status": by_evidence_status,
        "disagreements_count": disagreements,
    }

@app.get("/api/governance/impact-map")
def get_impact_map():
    """Time-aware claim ledger & rule-change dependency map."""
    return calculate_impact_map()

@app.post("/api/governance/re-review-impact")
def re_review_impact(
    item_id: str = Form(...),
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
):
    """Trigger targeted re-review on all historical drafts affected by expired/changed fact or rule."""
    if role not in ("brand_admin", "reviewer"):
        raise HTTPException(403, "Brand Admin or Reviewer role required to trigger re-reviews.")

    count = trigger_targeted_rereview(item_id, actor=actor)
    return {"message": f"Targeted re-review triggered for {count} affected draft(s).", "affected_count": count}



# =============================================================================
# Round 3 — Commitment 2: Brand Asset Registry
# =============================================================================

@app.get("/api/brand-assets")
def list_brand_assets(
    workspace_id: str = "ws_default",
):
    """List all registered brand assets for the workspace."""
    return rows("SELECT * FROM brand_assets WHERE workspace_id=? ORDER BY name", (workspace_id,))


@app.post("/api/brand-assets", status_code=201)
def register_brand_asset(
    payload: BrandAssetIn,
    role: str = Depends(get_demo_role),
):
    """Register a new brand asset. Requires brand_admin role."""
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to register brand assets.")

    data = payload.model_dump()
    data["id"] = ident("asset")
    data["workspace_id"] = "ws_default"
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


@app.delete("/api/brand-assets/{asset_id}", status_code=204)
def delete_brand_asset(
    asset_id: str,
    role: str = Depends(get_demo_role),
):
    """Remove a brand asset from the registry. Requires brand_admin role."""
    if role not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to remove brand assets.")

    existing = row("SELECT id FROM brand_assets WHERE id=?", (asset_id,))
    if not existing:
        raise HTTPException(404, "Brand asset not found.")

    with db() as conn:
        conn.execute("DELETE FROM brand_assets WHERE id=?", (asset_id,))

    return None


# =============================================================================
# Round 3 — Commitment 3: Guideline Health Intelligence
# =============================================================================

@app.get("/api/governance/guideline-health")
def get_guideline_health():
    """
    Return per-rule guideline health statistics including disagreement detection,
    data confidence, and deterministic improvement suggestions.
    """
    from .guideline_health import compute_guideline_health
    return compute_guideline_health()


@app.post("/api/governance/rule-suggestions/{rule_id}")
def submit_rule_suggestion_action(
    rule_id: str,
    payload: RuleSuggestionAction,
    role: str = Depends(get_demo_role),
    actor: str = Depends(get_demo_actor),
):
    """
    Accept, defer, or reject a guideline clarification suggestion.
    Stores the decision in rule_suggestions table. Does NOT modify the live rule.
    Requires reviewer or brand_admin role.
    """
    if role not in ("reviewer", "brand_admin"):
        raise HTTPException(403, "Reviewer or Brand Admin role required.")

    rule_rec = row("SELECT * FROM rules WHERE id=?", (rule_id,))
    if not rule_rec:
        raise HTTPException(404, "Rule not found.")

    from .guideline_health import compute_guideline_health
    health_items = compute_guideline_health()
    health_item = next((h for h in health_items if h["rule_id"] == rule_id), None)

    suggestion = None
    if health_item:
        suggestion = health_item.get("suggestion")

    suggestion_id = ident("rsugg")
    ts = now()
    status_map = {"accept": "ACCEPTED", "defer": "DEFERRED", "reject": "REJECTED"}
    new_status = status_map.get(payload.action, "PENDING")

    with db() as conn:
        conn.execute(
            """
            INSERT INTO rule_suggestions (
                id, rule_id, observed_issue, proposed_clarification,
                ambiguity_addressed, status, reviewed_by, reviewed_at, created_at
            ) VALUES (
                :id, :rule_id, :observed_issue, :proposed_clarification,
                :ambiguity_addressed, :status, :reviewed_by, :reviewed_at, :created_at
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
            },
        )

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, app_dir="backend")
