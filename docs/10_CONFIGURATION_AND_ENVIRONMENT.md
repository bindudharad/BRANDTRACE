# Configuration and Environment Variables

## Configuration Architecture

BRANDTRACE relies on lightweight, 12-factor application configuration managed via environment variables and read through `backend/app/config.py`. Sensible defaults are provided so that local development and offline demonstrations execute with zero manual configuration.

```
+--------------------------------------------------------------------------+
|                           ENVIRONMENT VARIABLES                          |
+--------------------------------------------------------------------------+
       |                           |                         |
       v                           v                         v
 [ Database URL ]           [ AI Provider ]           [ System Limits ]
 - DATABASE_URL             - AI_PROVIDER             - MAX_CONTENT_CHARS
 - SQLite vs PostgreSQL     - GEMINI_API_KEY          - MAX_UPLOAD_BYTES
                            - AI_MODEL                - CORS_ORIGINS
```

---

## Complete Environment Variable Inventory

| Variable | Default Value | Valid Options | Purpose & Semantic Impact |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///./brandtrace.db` | SQLite URI, PostgreSQL URI | Connection string for SQLAlchemy 2.0. Dynamically normalized for drivers. |
| `AI_PROVIDER` | `offline` | `offline`, `gemini` | Determines triage provider. `offline` requires no network; `gemini` calls cloud LLM. |
| `GEMINI_API_KEY` | `""` | Valid Google API Key | Required only if `AI_PROVIDER=gemini`. Kept server-side; never leaked to frontend. |
| `AI_MODEL` | `gemini-1.5-flash` | Gemini model tags | Model identifier dispatched by `GeminiProvider`. |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated URLs | Allowed Cross-Origin Resource Sharing origins for FastAPI middleware. |
| `MAX_CONTENT_CHARS`| `50000` | Positive integer | Maximum character length for incoming review draft content. |
| `MAX_UPLOAD_BYTES` | `10485760` (10 MB) | Positive integer | Maximum upload size for PDF and image multipart streams. |
| `ENVIRONMENT` | `development` | `development`, `production`, `test` | Runtime mode. Adjusts stack trace visibility and logging verbosity. |

---

## Database URL Formats & Normalization

The backend automatically normalizes incoming database connection strings via `normalize_database_url()` in `backend/app/config.py`:

### SQLite (Default for Local Development & Testing)
* URI format: `sqlite:///./brandtrace.db` (file-based) or `sqlite:///:memory:`
* For SQLite connections, the engine automatically injects `connect_args={"check_same_thread": False}` to permit concurrent FastAPI worker execution.

### PostgreSQL (Production Standard)
* URI format: `postgresql://user:password@localhost:5432/brandtrace_db`
* Legacy Heroku-style URLs (`postgres://...`) are automatically rewritten to `postgresql://...` to ensure compatibility with modern SQLAlchemy 2.0 / psycopg2 dialect drivers.

---

## AI_PROVIDER Switching Mechanism

The governance pipeline switches dynamically between local heuristics and cloud AI without requiring code modifications:

1. **`AI_PROVIDER=offline` (Default)**:
   * Factory function `get_ai_provider()` instantiates `OfflineProvider`.
   * Evaluates text using token analysis, BM25 token overlap against the claim ledger, and regex heuristics.
   * Runs completely offline with zero latency, zero API costs, and 100% reproducible results.
2. **`AI_PROVIDER=gemini`**:
   * Factory function verifies presence of `GEMINI_API_KEY`.
   * If the key is present, `GeminiProvider` submits draft text and active policy summaries to Google's Gemini 1.5 Flash API.
   * If `GEMINI_API_KEY` is missing or invalid, the provider **gracefully falls back** to `OfflineProvider` without throwing an unhandled exception or breaking review workflows.

---

## Walkthrough of `.env.example`

To configure a custom local or production environment, create a `.env` file in the project root:

```ini
# ==============================================================================
# BRANDTRACE Runtime Environment Configuration
# ==============================================================================

# Database Connection (Default: local SQLite database)
# For production PostgreSQL: postgresql://branduser:secretpass@db.internal:5432/brandtrace
DATABASE_URL=sqlite:///./brandtrace.db

# AI Provider Selection: 'offline' (deterministic heuristics) or 'gemini' (cloud LLM)
AI_PROVIDER=offline

# Google Gemini API Key (Required ONLY if AI_PROVIDER=gemini)
# GEMINI_API_KEY=AIzaSy...your_gemini_key_here
AI_MODEL=gemini-1.5-flash

# CORS Whitelist (Comma-separated origins for web clients)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173

# Security & Upload Ingestion Limits
MAX_CONTENT_CHARS=50000
MAX_UPLOAD_BYTES=10485760

# Environment Mode: 'development', 'test', 'production'
ENVIRONMENT=development
```

---

## Local vs. Production Configuration Comparison

| Architectural Aspect | Local Development / Demo | Production Deployment |
| :--- | :--- | :--- |
| **Database Engine** | SQLite file (`brandtrace.db`) | Managed PostgreSQL with connection pooling |
| **AI Provider** | `offline` (fast, free, predictable) | `gemini` with strict fallback to `offline` |
| **CORS Origins** | `localhost:3000`, `127.0.0.1:3000` | Strict enterprise domain (e.g. `https://governance.brand.com`) |
| **SSL / TLS Termination** | Plain HTTP | Reverse proxy (Nginx / Cloudflare) with HTTPS |
| **Process Model** | Uvicorn reload (`--reload`) | Multi-worker Gunicorn (`-w 4 -k uvicorn.workers.UvicornWorker`) |
| **Role Verification** | Simulated `X-Demo-Role` header | JWT / Bearer tokens verified against corporate IdP |
