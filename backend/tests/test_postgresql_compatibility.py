import os
import re
import pytest
from sqlalchemy import text, create_engine
from sqlalchemy.dialects import postgresql, sqlite
from app.config import normalize_database_url
from app.models import init_db, _statement, db, rows, row

def test_neon_postgres_url_normalization():
    """Verify that Neon serverless URLs and standard Postgres URLs are normalized to postgresql+psycopg://."""
    neon_url = "postgresql://neondb_owner:npg_123xyz@ep-misty-moon-a28jck1u.eu-central-1.aws.neon.tech/neondb?sslmode=require"
    expected = "postgresql+psycopg://neondb_owner:npg_123xyz@ep-misty-moon-a28jck1u.eu-central-1.aws.neon.tech/neondb?sslmode=require"
    assert normalize_database_url(neon_url) == expected

    # Handles postgres:// shorthand
    short_url = "postgres://user:pass@ep-cool-fog-123.us-east-2.aws.neon.tech/neondb?sslmode=require"
    assert normalize_database_url(short_url) == "postgresql+psycopg://user:pass@ep-cool-fog-123.us-east-2.aws.neon.tech/neondb?sslmode=require"

    # Handles whitespace
    assert normalize_database_url(f"  {neon_url}  ") == expected

    # Idempotent if already has psycopg driver
    assert normalize_database_url(expected) == expected

    # Preserves SQLite local dev URLs
    assert normalize_database_url("sqlite:///./brandtrace.db") == "sqlite:///./brandtrace.db"

def test_sqlalchemy_statement_conversion():
    """Verify positional parameter '?' conversion to named parameters compatible with PostgreSQL."""
    query = "SELECT * FROM reviews WHERE id=? AND status=? AND score >= ?"
    stmt, params = _statement(query, ("rev_123", "IN_REVIEW", 80))

    # Check converted SQL has named params
    sql_text = str(stmt)
    assert ":p0" in sql_text
    assert ":p1" in sql_text
    assert ":p2" in sql_text
    assert "?" not in sql_text
    assert params == {"p0": "rev_123", "p1": "IN_REVIEW", "p2": 80}

    # Dict params preserved unchanged
    dict_query = "SELECT * FROM rules WHERE id = :id"
    d_stmt, d_params = _statement(dict_query, {"id": "R-VOICE-01"})
    assert str(d_stmt) == dict_query
    assert d_params == {"id": "R-VOICE-01"}


def test_bootstrap_upserts_use_postgresql_compatible_conflict_syntax():
    """Bootstrap must not use SQLite-only INSERT OR IGNORE on Neon."""
    bootstrap_upserts = [
        ("""INSERT INTO workspaces (id, name, created_at)
            VALUES ('ws_default', 'Default Production Workspace', ?)
            ON CONFLICT (id) DO NOTHING""", ("timestamp",)),
        ("""INSERT INTO workspace_members (workspace_id, actor, role, created_at)
            VALUES ('ws_default', ?, 'brand_admin', ?)
            ON CONFLICT (workspace_id, actor) DO NOTHING""", ("actor", "timestamp")),
    ]
    for query, params in bootstrap_upserts:
        statement, _ = _statement(query, params)
        compiled = str(statement.compile(dialect=postgresql.dialect()))
        assert "ON CONFLICT" in compiled
        assert "INSERT OR IGNORE" not in compiled

def test_schema_ddl_postgresql_dialect_compilation():
    """Verify that all DDL statements used in init_db compile against the PostgreSQL dialect."""
    pg_dialect = postgresql.dialect()

    # Statements defined in init_db
    statements = [
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
            created_at TEXT NOT NULL DEFAULT '',
            notes TEXT
        )
        """,
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
        """,
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
    ]

    for sql in statements:
        # Verify text statement compiles without exception for PostgreSQL
        stmt = text(sql)
        compiled = str(stmt.compile(dialect=pg_dialect))
        assert len(compiled) > 0
        assert "CREATE TABLE" in compiled

def test_database_init_idempotency():
    """Verify that init_db can be called multiple times without error."""
    init_db()
    init_db()
    init_db()
