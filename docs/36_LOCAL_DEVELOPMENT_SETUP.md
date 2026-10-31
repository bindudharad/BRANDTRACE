# 36 — LOCAL DEVELOPMENT SETUP & RUNBOOK
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## Prerequisites
- Windows 10/11, macOS, or Linux.
- Python 3.10+ installed.
- Node.js 18+ and npm installed.

---

## Step-by-Step PowerShell Setup

```powershell
# 1. Clone repository
git clone https://github.com/bindudharad/BRANDTRACE.git
cd BRANDTRACE

# 2. Setup Python backend
python -m venv venv
.
env\Scripts\Activate.ps1
pip install -r backend/requirements.txt

# 3. Start FastAPI backend (Port 8000)
uvicorn app.main:app --app-dir backend --port 8000 --reload

# 4. In a new terminal, setup frontend
cd C:\Projects\BRANDTRACE\BRANDTRACE
npm install
npm run dev
# Frontend accessible at http://localhost:5173
```

---

## Quick Test Verification
```powershell
# Run smoke tests
python scripts/smoke_test.py

# Run full backend test suite
python -m pytest backend/tests
```
