# 37 — DEPLOYMENT AND CLOUD INFRASTRUCTURE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED & LIVE**

---

## 1. Hosting Architecture

- **Frontend Deployment:** Vercel Global Edge Network.
  - Production URL: `https://brandtrace-woad.vercel.app/`
  - Continuous deployment connected to GitHub repository `main` branch.
- **Backend Deployment:** Render Cloud Services (FastAPI runtime).
  - Production API Base: `https://brandtrace-api.onrender.com/`
  - Health Endpoint: `https://brandtrace-api.onrender.com/api/health`
- **Database Persistence:** PostgreSQL / Neon Serverless DB cluster.

---

## 2. Deployment Health Verification

Probing the live hosted backend:
```powershell
python -c "import httpx; r = httpx.get('https://brandtrace-api.onrender.com/api/health', timeout=30.0); print(r.status_code, r.text)"
```
**Response:** `200 {"status":"ok","service":"brandtrace","version":"0.3.0"}`.
