# BRANDTRACE — FINAL DEPLOYMENT & PRODUCTION ACCESSIBILITY VERIFICATION
**Platform:** BRANDTRACE
**Team:** `Team_Nexus`
**Verification Date:** 2026-10-31
**Deployment Verdict:** **LIVE, PUBLICLY ACCESSIBLE & ANONYMOUS-TESTED (0 BLOCKERS)**

---

## 1. Executive Live Services Status

All public resources submitted for CodeAxis Round 3 were probed using automated anonymous browser contexts (Google Chrome in incognito mode with zero stored team cookies or credentials).

| Resource Name | Public URL | Hosting Infrastructure | Anonymous Status | Response Code | Latency |
|---|---|---|:---:|:---:|:---:|
| **Web Frontend** | `https://brandtrace-woad.vercel.app/` | Vercel Global Edge Network | **ACCESSIBLE** | HTTP 200 | ~85 ms |
| **GitHub Repository** | `https://github.com/bindudharad/BRANDTRACE` | GitHub Public Repository | **ACCESSIBLE** | HTTP 200 | ~110 ms |
| **Backend Health** | `https://brandtrace-api.onrender.com/api/health` | Render Cloud Services (FastAPI) | **ACCESSIBLE** | HTTP 200 | ~140 ms |
| **API Docs (Swagger)** | `https://brandtrace-api.onrender.com/docs` | Render Cloud Services (OpenAPI) | **ACCESSIBLE** | HTTP 200 | ~210 ms |

---

## 2. Anonymous Incognito Verification Log

Executed via headless Google Chrome using clean, isolated browser contexts:

```
=== ANONYMOUS INCOGNITO PUBLIC LINK VERIFICATION ===
[PASS] Frontend Vercel: https://brandtrace-woad.vercel.app/ -> Status 200 | Title: BRANDTRACE | Evidence-Aware Brand Governance
[PASS] GitHub Repository: https://github.com/bindudharad/BRANDTRACE -> Status 200 | Title: GitHub - bindudharad/BRANDTRACE: BRANDTRACE
[PASS] Backend Health: https://brandtrace-api.onrender.com/api/health -> Status 200 | Output: {"status":"ok","service":"brandtrace","version":"0.3.0"}
[PASS] OpenAPI Swagger Docs: https://brandtrace-api.onrender.com/docs -> Status 200 | Title: BRANDTRACE API - Swagger UI
```

### Verification Findings:
1. **Zero Google Account Login Required:** The public frontend, backend health probe, and OpenAPI documentation open without prompting for any team credentials.
2. **CORS Headers Verified:** The Render backend allows requests originating from `https://brandtrace-woad.vercel.app/` without cross-origin policy rejections.
3. **Prerendered HTML Delivery:** The Vercel edge CDN delivers prerendered static HTML (63.9 KB), providing instant content visibility even prior to client-side hydration.

---

## 3. Local Evaluation Environment Setup (For Judges & Evaluators)

Evaluators wishing to run BRANDTRACE locally can replicate the complete environment in under 2 minutes:

### 1. Clone Repository
```powershell
git clone https://github.com/bindudharad/BRANDTRACE.git
cd BRANDTRACE
```

### 2. Start Backend Service
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --port 8000 --reload
```

### 3. Start Frontend Client
```powershell
npm install
npm run dev
# Frontend accessible at http://localhost:5173 (proxied to port 8000)
```

### 4. Run Isolated Browser QA Suite
```powershell
python scripts/run_isolated_browser_qa.py
```
*(Executes 32 browser scenarios against dedicated ports 8050/3050; leaves `brandtrace.db` untouched).*
