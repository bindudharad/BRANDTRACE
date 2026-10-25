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

_CURRENT_ENGINE = None
_CURRENT_URL = None

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
        _CURRENT_ENGINE = create_engine(url, **engine_kwargs)
    return _CURRENT_ENGINE

ENGINE = get_engine()

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
    """Safely add a column to an existing table if it does not already exist."""
    try:
        insp = inspect(conn.connection)
        tables = set(insp.get_table_names())
        if table in tables:
            existing = {c["name"].lower() for c in insp.get_columns(table)}
            if column.lower() not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
    except Exception:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        except Exception:
            pass

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

        _safe_add_column(conn, "review_versions", "created_by", "TEXT NOT NULL DEFAULT 'demo.user'")

        _safe_add_column(conn, "findings", "category", "TEXT NOT NULL DEFAULT 'general'")
        _safe_add_column(conn, "findings", "analysis_method", "TEXT NOT NULL DEFAULT 'DETERMINISTIC'")
        _safe_add_column(conn, "findings", "disposition_reason", "TEXT")
        _safe_add_column(conn, "findings", "disposition_by", "TEXT")
        _safe_add_column(conn, "findings", "disposition_at", "TEXT")

        _safe_add_column(conn, "audit", "workspace_id", "TEXT NOT NULL DEFAULT 'ws_default'")
        _safe_add_column(conn, "audit", "actor_role", "TEXT NOT NULL DEFAULT 'reviewer'")
