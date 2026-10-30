---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 36 — Environment Variable Reference

## Purpose

This document provides a comprehensive, exhaustive reference of all backend and frontend configuration environment variables used in **BRANDTRACE** (`backend/app/config.py` and `vite.config.ts`).

---

## 1. Backend Server Configuration (`backend/app/config.py`)

### Database & Network

| Variable | Type | Default Value | Security Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | String | `sqlite:///{ROOT}/brandtrace.db` | **Secret** | Connection URI for persistence layer. Automatically normalizes `postgres://` or `postgresql://` to `postgresql+psycopg://`. |
| `CORS_ORIGINS` | String (CSV)| `http://localhost:3000,http://127.0.0.1:3000` | Public Config | Comma-delimited list of permitted CORS origins allowed to access the FastAPI endpoints. |
| `DB_POOL_RECYCLE` | Integer | `300` | Internal Config | Pool connection recycle duration in seconds for PostgreSQL (Neon) serverless pooling. |
| `DB_POOL_SIZE` | Integer | `5` | Internal Config | Number of permanent connections maintained in PostgreSQL pool. |
| `DB_MAX_OVERFLOW` | Integer | `10` | Internal Config | Maximum temporary overflow connections beyond `DB_POOL_SIZE`. |
| `DB_POOL_TIMEOUT_SECONDS` | Integer | `10` | Internal Config | Bounded seconds to wait for a connection from the pool before raising a timeout. |
| `DB_CONNECT_TIMEOUT_SECONDS` | Integer | `10` | Internal Config | Maximum seconds to establish a fresh TCP connection to hosted PostgreSQL. |

### Ingestion Limits

| Variable | Type | Default Value | Security Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| `MAX_CONTENT_CHARS` | Integer | `50000` | Public Config | Maximum string character length allowed in review draft content submissions. |
| `MAX_UPLOAD_BYTES` | Integer | `10485760` (10 MB) | Public Config | Maximum payload size in bytes accepted on multipart `/api/reviews/upload`. |

### Artificial Intelligence & Contextual Triage

| Variable | Type | Default Value | Security Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| `AI_PROVIDER` | String | `"mock"` | Public Config | Active AI adapter provider. Allowed values: `"mock"`, `"gemini"`. |
| `AI_PROVIDER_API_KEY` | String | `""` | **Secret** | API key used for external cloud LLM calls when `AI_PROVIDER=gemini`. |
| `GEMINI_API_KEY` | String | `""` | **Secret** | Fallback alias for `AI_PROVIDER_API_KEY`. |
| `AI_MODEL_NAME` | String | `"gemini-2.5-flash"` | Public Config | Model identifier passed to Gemini Interactions SDK. |
| `AI_TIMEOUT_SECONDS` | Float | `8.0` | Public Config | Strict timeout in seconds for contextual triage calls before falling back to offline analysis. |

### Authentication, RBAC & Demo Boundaries

| Variable | Type | Default Value | Security Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | String | `"development"` | Public Config | Deployment tier tag (`development`, `staging`, `production`, `test`). |
| `AUTH_MODE` | String | `"demo"` (or `"production"`) | Public Config | Authentication mode. Defaults to `"production"` if `ENVIRONMENT="production"`. |
| `ALLOW_DEMO_AUTH` | Boolean | `true` (if demo) | Public Config | Controls whether simulated persona headers (`X-Demo-Role`) are accepted. Must be `false` in production. |
| `BRANDTRACE_API_KEY` | String | `""` | **Secret** | Authorized API key for standard reviewer or workspace member access. |
| `BRANDTRACE_ADMIN_API_KEY` | String | `""` | **Secret** | High-privilege API key for brand administrators. Must not match `BRANDTRACE_API_KEY` in production. |
| `ALLOW_DEMO_RESET` | Boolean | `false` (true in test) | **Security Guard**| Hard gate controlling whether `POST /api/demo/reset` is accessible. |
| `DEMO_RESET_SECRET` | String | `""` | **Secret** | Cryptographic secret required in request body to execute demo data reset. |

---

## 2. Frontend Client Configuration (`VITE_*`)

These variables are consumed by the Vite bundler at build time or exposed via `import.meta.env`:

| Variable | Type | Default Value | Security Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | String | `""` (Relative proxy) | Public Config | Base URL for FastAPI backend. In hosted deployments (Vercel), points to the deployed backend URL. |
| `VITE_APP_ENV` | String | `"development"` | Public Config | Runtime environment identifier displayed in the UI header and status badge (`development`, `staging`, `production`, `demo`). |
