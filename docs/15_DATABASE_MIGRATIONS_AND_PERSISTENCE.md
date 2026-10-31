# 15 — DATABASE MIGRATIONS AND PERSISTENCE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Dual-Dialect Persistence Engine

BRANDTRACE employs a dual-dialect architecture designed for frictionless local development and enterprise cloud deployments:
- **Local Development & Testing:** Isolated SQLite 3 engines with in-memory or disposable file-backed databases.
- **Hosted Cloud Deployment:** PostgreSQL / Neon Serverless DB via psycopg3 and SQLAlchemy connection pooling.

---

## 2. Idempotent Schema Initialization

Rather than relying on fragile manual migration scripts, schema synchronization is managed via `init_db()` in `backend/app/models.py`:
- All 16 tables are created using `CREATE TABLE IF NOT EXISTS`.
- Column additions are guarded with schema inspection checks.
- Default Brand Constitution rules and Claim Ledger facts are seeded using dialect-safe `ON CONFLICT DO NOTHING` statements.
- Verified in `backend/tests/test_postgresql_compatibility.py`.
