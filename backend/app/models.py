"""
Database connection, schema definitions, and migration utilities for BRANDTRACE.
Supports SQLite (local zero-setup demo) and PostgreSQL (deployment adapter) via SQLAlchemy 2.0.
"""
from __future__ import annotations

import os
import re
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import create_engine, inspect, text

from .config import DATABASE_URL as DEFAULT_DATABASE_URL, normalize_database_url
from . import config

_CURRENT_ENGINE = None
_CURRENT_URL = None

# The staging runbook and the application startup verification use the same
# complete table set.  Keep it here so a verified schema cannot drift from the
# application's actual persistence contract.
REQUIRED_SCHEMA_TABLES = frozenset({
    "workspaces", "brand_profiles", "rules", "facts", "reviews",
    "review_versions", "findings", "audit", "fact_versions",
    "evidence_dependencies", "brand_assets", "rule_suggestions",
    "workspace_members", "rule_versions", "system_state",
    "constitution_imports", "imported_rule_candidates", "evidence_sources",
    "review_comments", "governance_alerts", "governance_jobs",
})

def get_engine():
    """Retrieve or dynamically re-bind the SQLAlchemy Engine when DATABASE_URL changes."""
    global _CURRENT_ENGINE, _CURRENT_URL
    raw_url = os.getenv("DATABASE_URL")
    url = normalize_database_url(raw_url) if raw_url else DEFAULT_DATABASE_URL
    if _CURRENT_ENGINE is None or _CURRENT_URL != url:
        _CURRENT_URL = url
        is_sqlite = url.startswith("sqlite")
        engine_kwargs = {
            "future": True,
            "pool_pre_ping": True,
        }
        if is_sqlite:
            engine_kwargs["connect_args"] = {"check_same_thread": False}
        else:
            # Resilient connection settings for PostgreSQL serverless (e.g. Neon)
            engine_kwargs["pool_recycle"] = int(os.getenv("DB_POOL_RECYCLE", "300"))
            engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "5"))
            engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "10"))
            # A readiness probe must fail within a bounded interval if a hosted
            # database is unavailable.  These defaults cover both waiting for a
            # pooled connection and establishing a new psycopg connection.
            engine_kwargs["pool_timeout"] = int(os.getenv("DB_POOL_TIMEOUT_SECONDS", "10"))
            engine_kwargs["connect_args"] = {
                "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT_SECONDS", "10")),
            }
        _CURRENT_ENGINE = create_engine(url, **engine_kwargs)
    return _CURRENT_ENGINE

def now() -> str:
    """Current UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()

def ident(prefix: str) -> str:
    """Generate a collision-resistant deterministic prefixed identifier."""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def _statement(query: str, params: Any = ()):
    """
    Format SQL query for SQLAlchemy 2.0 with bound parameters.
    Converts '?' positional placeholders to ':p0', ':p1', etc.
    """
    if isinstance(params, dict):
        return text(query), params
    values = tuple(params)
    if not values:
        return text(query), {}
    index = 0
    def replace(_: re.Match):
        nonlocal index
        placeholder = f"p{index}"
        index += 1
        return f":{placeholder}"
    converted = re.sub(r"\?", replace, query)
    return text(converted), {f"p{i}": val for i, val in enumerate(values)}

class Connection:
    def __init__(self, connection):
        self.connection = connection

    def execute(self, query: str, params: Any = ()):
        statement, bound = _statement(query, params)
        return self.connection.execute(statement, bound)

@contextmanager
def db():
    """Transactional database connection context manager."""
    with get_engine().begin() as connection:
        yield Connection(connection)

def rows(query: str, params: Any = ()) -> List[Dict[str, Any]]:
    """Execute query and fetch all rows as dictionaries."""
    with db() as conn:
        result = conn.execute(query, params)
        return [dict(r._mapping) for r in result.fetchall()]

def row(query: str, params: Any = ()) -> Optional[Dict[str, Any]]:
    """Execute query and return the first row as a dictionary, or None."""
    items = rows(query, params)
    return items[0] if items else None

def audit(
    review_id: str,
    action: str,
    actor: str = "demo.reviewer",
    actor_role: str = "reviewer",
    reason: Optional[str] = None,
    details: Optional[str] = None,
    workspace_id: str = "ws_default",
):
    with db() as conn:
        conn.execute(
            """
            INSERT INTO audit (id, workspace_id, review_id, action, actor, actor_role, reason, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (ident("aud"), workspace_id, review_id, action, actor, actor_role, reason, details, now())
        )

def save_version(review_id: str, content: str, reason: str, created_by: str = "demo.user"):
    with db() as conn:
        conn.execute(
            """
            INSERT INTO review_versions (id, review_id, content, created_at, created_by, reason)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (ident("version"), review_id, content, now(), created_by, reason)
        )

def _safe_add_column(conn: Connection, table: str, column: str, col_type: str):
    """Safely add a column to an existing table if it does not already exist.

    Uses SQLAlchemy inspection to avoid transaction-aborting ALTER statements.
    Tolerates benign already-exists races while re-raising genuine schema errors.
    """
    try:
        insp = inspect(conn.connection)
        tables = set(insp.get_table_names())
        if table not in tables:
            return
        existing = {c["name"].lower() for c in insp.get_columns(table)}
        if column.lower() in existing:
            return
    except Exception as exc:
        msg = str(exc).lower()
        if "already exists" in msg or "duplicate" in msg:
            return
        raise RuntimeError(f"Schema inspection failed on table '{table}': {exc}") from exc

    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
    except Exception as exc:
        msg = str(exc).lower()
        if "duplicate column" in msg or "already exists" in msg:
            return
        raise RuntimeError(f"Migration failed adding column '{column}' to table '{table}': {exc}") from exc


def verify_schema():
    """Read-only verification that every required persistence table exists."""
    engine = get_engine()
    missing_tables = sorted(REQUIRED_SCHEMA_TABLES - set(inspect(engine).get_table_names()))
    if missing_tables:
        raise RuntimeError("Missing required tables: " + ", ".join(missing_tables))
    return engine

def init_db():
    """
    Initialize database schema idempotently.
    Adds new columns cleanly to older schema files without dropping user data.
    """
    with db() as conn:
        schema_statements = [
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS brand_profiles (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                brand_name TEXT NOT NULL,
                primary_color TEXT NOT NULL,
                secondary_color TEXT NOT NULL,
                accent_colors TEXT NOT NULL,
                min_contrast_ratio REAL NOT NULL DEFAULT 4.5,
                approved_logo_aspect REAL,
                updated_at TEXT NOT NULL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS rules (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                title TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'terminology',
                kind TEXT NOT NULL,
                pattern TEXT NOT NULL,
                requirement TEXT NOT NULL,
                severity TEXT NOT NULL,
                version TEXT NOT NULL,
                status TEXT NOT NULL,
                owner TEXT NOT NULL DEFAULT 'Brand Admin',
                source_id TEXT,
                source_title TEXT NOT NULL,
                source_excerpt TEXT NOT NULL,
                effective_at TEXT,
                expires_at TEXT,
                created_at TEXT NOT NULL DEFAULT ''
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS facts (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                claim TEXT NOT NULL,
                value TEXT NOT NULL,
                owner TEXT NOT NULL,
                status TEXT NOT NULL,
                version TEXT NOT NULL,
                source_id TEXT,
                source_title TEXT NOT NULL,
                source_excerpt TEXT NOT NULL,
                review_at TEXT,
                effective_at TEXT,
                expires_at TEXT,
                created_at TEXT NOT NULL DEFAULT ''
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS reviews (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                content_type TEXT NOT NULL,
                status TEXT NOT NULL,
                score INTEGER NOT NULL,
                author TEXT NOT NULL DEFAULT 'creator@demo.com',
                reviewer TEXT,
                file_name TEXT,
                file_mime TEXT,
                file_size INTEGER,
                analysis_method TEXT NOT NULL DEFAULT 'DETERMINISTIC_FIRST',
                rule_versions TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS review_versions (
                id TEXT PRIMARY KEY,
                review_id TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL DEFAULT 'demo.user',
                reason TEXT NOT NULL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS findings (
                id TEXT PRIMARY KEY,
                review_id TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'general',
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                passage TEXT NOT NULL,
                explanation TEXT NOT NULL,
                suggested_correction TEXT,
                source_id TEXT,
                source_title TEXT,
                source_excerpt TEXT,
                source_version TEXT,
                analysis_method TEXT NOT NULL DEFAULT 'DETERMINISTIC',
                uncertainty TEXT,
                disposition TEXT,
                disposition_reason TEXT,
                disposition_by TEXT,
                disposition_at TEXT
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS audit (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                review_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor TEXT NOT NULL,
                actor_role TEXT NOT NULL DEFAULT 'reviewer',
                reason TEXT,
                details TEXT,
                created_at TEXT NOT NULL
            )
            """
        ]

        for stmt in schema_statements:
            conn.execute(stmt)

        # Migration columns if tables were created with earlier mini-schema
        _safe_add_column(conn, "rules", "workspace_id", "TEXT NOT NULL DEFAULT 'ws_default'")
        _safe_add_column(conn, "rules", "category", "TEXT NOT NULL DEFAULT 'terminology'")
        _safe_add_column(conn, "rules", "owner", "TEXT NOT NULL DEFAULT 'Brand Admin'")
        _safe_add_column(conn, "rules", "source_id", "TEXT")
        _safe_add_column(conn, "rules", "created_at", "TEXT NOT NULL DEFAULT ''")

        _safe_add_column(conn, "facts", "workspace_id", "TEXT NOT NULL DEFAULT 'ws_default'")
        _safe_add_column(conn, "facts", "source_id", "TEXT")
        _safe_add_column(conn, "facts", "effective_at", "TEXT")
        _safe_add_column(conn, "facts", "created_at", "TEXT NOT NULL DEFAULT ''")

        _safe_add_column(conn, "reviews", "workspace_id", "TEXT NOT NULL DEFAULT 'ws_default'")
        _safe_add_column(conn, "reviews", "author", "TEXT NOT NULL DEFAULT 'creator@demo.com'")
        _safe_add_column(conn, "reviews", "reviewer", "TEXT")
        _safe_add_column(conn, "reviews", "file_name", "TEXT")
        _safe_add_column(conn, "reviews", "file_mime", "TEXT")
        _safe_add_column(conn, "reviews", "file_size", "INTEGER")
        _safe_add_column(conn, "reviews", "analysis_method", "TEXT NOT NULL DEFAULT 'DETERMINISTIC_FIRST'")
        _safe_add_column(conn, "reviews", "document_type", "TEXT NOT NULL DEFAULT 'general_document'")
        _safe_add_column(conn, "reviews", "file_format", "TEXT NOT NULL DEFAULT 'text'")
        _safe_add_column(conn, "reviews", "ocr_applied", "BOOLEAN NOT NULL DEFAULT 0")
        _safe_add_column(conn, "reviews", "ocr_method", "TEXT NOT NULL DEFAULT 'NONE'")
        _safe_add_column(conn, "reviews", "ai_consent_granted", "BOOLEAN NOT NULL DEFAULT 0")
        _safe_add_column(conn, "reviews", "ai_analysis_applied", "BOOLEAN NOT NULL DEFAULT 0")
        _safe_add_column(conn, "reviews", "document_summary", "TEXT")

        _safe_add_column(conn, "rules", "applicable_document_types", "TEXT NOT NULL DEFAULT 'all'")

        _safe_add_column(conn, "review_versions", "created_by", "TEXT NOT NULL DEFAULT 'demo.user'")

        _safe_add_column(conn, "findings", "category", "TEXT NOT NULL DEFAULT 'general'")
        _safe_add_column(conn, "findings", "analysis_method", "TEXT NOT NULL DEFAULT 'DETERMINISTIC'")
        _safe_add_column(conn, "findings", "disposition_reason", "TEXT")
        _safe_add_column(conn, "findings", "disposition_by", "TEXT")
        _safe_add_column(conn, "findings", "disposition_at", "TEXT")

        _safe_add_column(conn, "audit", "workspace_id", "TEXT NOT NULL DEFAULT 'ws_default'")
        _safe_add_column(conn, "audit", "actor_role", "TEXT NOT NULL DEFAULT 'reviewer'")


        # Round 3 migrations
        _safe_add_column(conn, "facts", "notes", "TEXT")
        _safe_add_column(conn, "facts", "updated_at", "TEXT")

        # Immutable fact snapshots and review-time evidence links.  These tables
        # deliberately keep the version used by a review even after the live
        # fact is amended, retired, or expires.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fact_versions (
                id TEXT PRIMARY KEY,
                fact_id TEXT NOT NULL,
                version TEXT NOT NULL,
                claim TEXT NOT NULL,
                value TEXT NOT NULL,
                source_id TEXT,
                source_title TEXT NOT NULL,
                source_excerpt TEXT NOT NULL,
                effective_at TEXT,
                expires_at TEXT,
                status TEXT NOT NULL,
                change_reason TEXT,
                changed_by TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(fact_id, version)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS evidence_dependencies (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                review_id TEXT NOT NULL,
                finding_id TEXT,
                source_type TEXT NOT NULL,
                source_id TEXT NOT NULL,
                source_version TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(review_id, finding_id, source_id, source_version)
            )
            """
        )

        # Brand Asset Registry table (Commitment 2)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS brand_assets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                asset_type TEXT NOT NULL DEFAULT 'image',
                content_hash TEXT,
                source TEXT,
                license_status TEXT NOT NULL DEFAULT 'UNKNOWN',
                license_notes TEXT,
                approval_status TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        # Rule Suggestions table (Commitment 3)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rule_suggestions (
                id TEXT PRIMARY KEY,
                rule_id TEXT NOT NULL,
                observed_issue TEXT,
                proposed_clarification TEXT,
                ambiguity_addressed TEXT,
                status TEXT NOT NULL DEFAULT 'PENDING',
                reviewed_by TEXT,
                reviewed_at TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        _safe_add_column(conn, "rule_suggestions", "workspace_id", "TEXT NOT NULL DEFAULT 'ws_default'")
        _safe_add_column(conn, "rule_suggestions", "rule_version", "TEXT")
        _safe_add_column(conn, "rule_suggestions", "finding_ids", "TEXT")
        _safe_add_column(conn, "rule_suggestions", "review_ids", "TEXT")
        _safe_add_column(conn, "rule_suggestions", "decision_evidence", "TEXT")
        _safe_add_column(conn, "rule_suggestions", "sample_count", "INTEGER NOT NULL DEFAULT 0")
        _safe_add_column(conn, "rule_suggestions", "data_confidence", "TEXT")
        _safe_add_column(conn, "rule_suggestions", "activated_at", "TEXT")
        _safe_add_column(conn, "rule_suggestions", "activated_by", "TEXT")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workspace_members (
                workspace_id TEXT NOT NULL,
                actor TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'reviewer',
                created_at TEXT NOT NULL,
                PRIMARY KEY (workspace_id, actor)
            )
            """
        )
        # Internal demo actors and synthetic foreign-tenant identities must NEVER
        # be silently provisioned into a production database.
        if config.ALLOW_DEMO_AUTH:
            default_members = [
                ("ws_default", "demo.reviewer", "reviewer"),
                ("ws_default", "demo.brand_admin", "brand_admin"),
                ("ws_default", "demo.creator", "creator"),
                ("ws_default", "demo.auditor", "auditor"),
                ("ws_default", "system.admin", "brand_admin"),
                ("ws_default", "system.user", "reviewer"),
                ("ws_default", "admin@brandtrace.internal", "brand_admin"),
                ("ws_default", "reviewer@brandtrace.internal", "reviewer"),
                ("ws_default", "creator@brandtrace.internal", "creator"),
                ("ws_default", "auditor@brandtrace.internal", "auditor"),
                ("ws_default", "reviewer.alice", "reviewer"),
                ("ws_default", "reviewer.bob", "reviewer"),
                ("ws_default", "admin.lead", "brand_admin"),
                ("ws_unrelated", "admin@foreign-corp.com", "brand_admin"),
                ("ws_unrelated", "intruder@foreign-corp.com", "brand_admin"),
                ("ws_unrelated", "user@foreign-corp.com", "reviewer"),
            ]
            now_ts = now()
            for ws_id, act, rle in default_members:
                conn.execute(
                    """
                    INSERT INTO workspace_members (workspace_id, actor, role, created_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(workspace_id, actor) DO NOTHING
                    """,
                    (ws_id, act, rle, now_ts)
                )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rule_versions (
                id TEXT PRIMARY KEY,
                rule_id TEXT NOT NULL,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                version TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                kind TEXT NOT NULL,
                pattern TEXT NOT NULL,
                requirement TEXT NOT NULL,
                severity TEXT NOT NULL,
                source_title TEXT NOT NULL,
                source_excerpt TEXT NOT NULL,
                originating_suggestion_id TEXT,
                activated_by TEXT,
                activation_reason TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(rule_id, version)
            )
            """
        )

        # Durable System State table (permanent one-way bootstrap tracking)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS system_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        # Enterprise Features (Round 3 Final Release)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS constitution_imports (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                filename TEXT NOT NULL,
                document_hash TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                page_count INTEGER NOT NULL,
                candidate_count INTEGER NOT NULL DEFAULT 0,
                approved_count INTEGER NOT NULL DEFAULT 0,
                rejected_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
                imported_by TEXT NOT NULL DEFAULT 'demo.brand_admin',
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS imported_rule_candidates (
                id TEXT PRIMARY KEY,
                import_id TEXT NOT NULL,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                candidate_type TEXT NOT NULL DEFAULT 'rule',
                category TEXT NOT NULL,
                kind TEXT NOT NULL,
                pattern TEXT NOT NULL,
                requirement TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'HIGH',
                page_number INTEGER,
                section_heading TEXT,
                original_excerpt TEXT NOT NULL,
                extraction_method TEXT NOT NULL DEFAULT 'DETERMINISTIC_PARSER',
                status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
                reviewed_by TEXT,
                reviewed_at TEXT,
                review_decision TEXT,
                rejection_reason TEXT,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS evidence_sources (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                title TEXT NOT NULL,
                source_type TEXT NOT NULL DEFAULT 'BRAND_GUIDELINE',
                file_name TEXT,
                url TEXT,
                content_hash TEXT,
                version TEXT NOT NULL DEFAULT '1.0',
                page_reference TEXT,
                section_reference TEXT,
                excerpt TEXT NOT NULL,
                owner TEXT NOT NULL DEFAULT 'Brand Admin',
                verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
                last_verified_at TEXT,
                effective_at TEXT,
                expires_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS review_comments (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                review_id TEXT NOT NULL,
                finding_id TEXT,
                author TEXT NOT NULL,
                author_role TEXT NOT NULL DEFAULT 'reviewer',
                comment TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS governance_alerts (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                alert_type TEXT NOT NULL,
                target_type TEXT NOT NULL,
                target_id TEXT NOT NULL,
                target_title TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                idempotency_key TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                created_at TEXT NOT NULL,
                UNIQUE(workspace_id, idempotency_key)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS governance_jobs (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL DEFAULT 'ws_default',
                job_type TEXT NOT NULL DEFAULT 'EXPIRY_AUDIT',
                status TEXT NOT NULL DEFAULT 'PENDING',
                items_scanned INTEGER NOT NULL DEFAULT 0,
                alerts_created INTEGER NOT NULL DEFAULT 0,
                re_reviews_generated INTEGER NOT NULL DEFAULT 0,
                retry_count INTEGER NOT NULL DEFAULT 0,
                error_message TEXT,
                notification_outcome TEXT,
                created_at TEXT NOT NULL,
                completed_at TEXT
            )
            """
        )

        _safe_add_column(conn, "reviews", "assigned_to", "TEXT")
        _safe_add_column(conn, "reviews", "priority", "TEXT NOT NULL DEFAULT 'MEDIUM'")
        _safe_add_column(conn, "reviews", "due_date", "TEXT")
        _safe_add_column(conn, "rules", "source_vault_id", "TEXT")
        _safe_add_column(conn, "facts", "source_vault_id", "TEXT")
        _safe_add_column(conn, "brand_assets", "perceptual_hash", "TEXT")
