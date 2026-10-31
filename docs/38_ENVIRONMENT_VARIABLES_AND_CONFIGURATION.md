# 38 — ENVIRONMENT VARIABLES AND CONFIGURATION
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## Configuration Reference Table

| Variable Name | Purpose | Required / Optional | Default Value | Security Sensitivity |
|---|---|:---:|---|:---:|
| `DATABASE_URL` | SQLAlchemy connection string | Optional (Defaults to SQLite) | `sqlite:///brandtrace.db` | High (Cloud DB Credentials) |
| `AI_PROVIDER` | Downstream AI provider adapter | Optional | `groq` (or `offline`) | Low |
| `GROQ_API_KEY` | API secret key for Groq LLM | Optional (Required only if live AI enabled) | None | High (Secret API Key) |
| `PORT` | Backend server port | Optional | `8000` | Low |
| `VITE_API_BASE_URL`| Frontend backend target URL | Optional | `http://localhost:8000` | Low |

*Note: In accordance with zero-trust security standards, no secrets or API keys are committed to source control.*
