---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 35 — Local Development Setup

## Purpose

This document provides a step-by-step onboarding and local execution guide for running **BRANDTRACE** on Windows (PowerShell), macOS, and Linux developer environments.

---

## 1. System Prerequisites

Before starting, ensure your system has the following installed:
- **Python**: Version 3.10 or higher (`python --version`)
- **Node.js**: Version 18.0 or higher (`node --version`)
- **npm**: Version 9.0 or higher (`npm --version`)
- **Git**: (`git --version`)

---

## 2. Repository Setup

Clone the repository and navigate into the workspace directory:

```bash
git clone https://github.com/bindudharad/BRANDTRACE.git
cd BRANDTRACE
```

---

## 3. Backend Setup (FastAPI & Python)

### 1. Create and Activate Virtual Environment

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Python Dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Initialize Database & Baseline Demo Data

BRANDTRACE initializes SQLite automatically on server startup. You can also seed initial demo guidelines and review fixtures manually:

```bash
python -c "from backend.app.models import init_db; init_db()"
python -c "from backend.app.main import setup_demo_data; setup_demo_data()"
```

### 4. Start the FastAPI Development Server

```bash
uvicorn backend.app.main:app --reload --port 8000
```

The backend server is now listening at:
- **API Base URL**: `http://localhost:8000`
- **Swagger Interactive Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

## 4. Frontend Setup (React, Vite & Three.js)

Open a separate terminal window:

### 1. Install Node Dependencies

```bash
npm install
```

### 2. Configure Environment Variables (Optional)

By default, Vite proxies `/api` calls to `http://localhost:8000`. You can create a local `.env.local` file if you want to explicitly define the backend URL:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_ENV=development
```

### 3. Start Vite Development Server

```bash
npm run dev
```

The frontend application will start at:
- `http://localhost:3000` (or `http://localhost:5173`)

---

## 5. Running Automated Verification Suites

### Run Backend Pytest Suite
```bash
pytest backend/tests -v
```
*Expected: 144 passed, 1 skipped (0 failures).*

### Run SQLite Regression Harness
```bash
python verify_sqlite_regression.py
```
*Expected: 126 passed, 1 skipped.*

### Run Headless Browser QA (Playwright)
```bash
python run_isolated_browser_qa.py
```
*Expected: 32 passed, 0 failed.*

### Production Build Verification
```bash
npm run build
```
*Expected: Successful TypeScript compilation (`tsc -b`) and Vite production bundle generation in `dist/`.*
