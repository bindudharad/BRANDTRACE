# Windows Local Development Setup Guide

This guide provides step-by-step instructions for installing, configuring, and verifying BRANDTRACE on Windows 10/11 using PowerShell.

---

## 1. Prerequisites Verification

Before starting, verify that your Windows host has Python 3.10+ and Node.js 18+ installed.

Open **PowerShell** and run:

```powershell
# Verify Python version (3.10 or newer recommended)
py -3.10 --version
# Output should show: Python 3.10.x (or python --version showing 3.10+)

# Verify Node.js and npm versions
node --version  # v18.x or v20.x+
npm --version   # 9.x or 10.x+

# Verify Git is available
git --version
```

If Python is not recognized, ensure the Python Windows launcher (`py`) is selected during Python installation and that **"Add python.exe to PATH"** was checked.

---

## 2. Directory Structure & Environment Preparation

Navigate to the project root directory:

```powershell
cd C:\Projects\BRANDTRACE\BRANDTRACE
```

Ensure the repository structure matches the expected workspace layout:
* `backend/`: FastAPI application code and tests
* `src/`: React TypeScript frontend
* `docs/`: System documentation
* `package.json`: Vite and frontend dependencies

---

## 3. Backend Setup & Virtual Environment

Execute the following commands in PowerShell to create an isolated Python virtual environment, install backend dependencies, and configure local environment variables:

```powershell
# 1. Create a dedicated Python 3.10 virtual environment
py -3.10 -m venv .venv

# 2. Set execution policy for the current process if script activation is restricted
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 3. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 4. Upgrade pip and wheel
python -m pip install --upgrade pip setuptools wheel

# 5. Install required backend packages
pip install -r backend\requirements.txt

# 6. Set environment variables for local offline demo execution
$env:DATABASE_URL = "sqlite:///./brandtrace.db"
$env:AI_PROVIDER = "offline"

# 7. Start the FastAPI backend server on port 8000
uvicorn app.main:app --app-dir backend --reload --port 8000
```

The terminal will display:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

---

## 4. Frontend Setup & Development Server

Open a **second PowerShell terminal window**, navigate to the project directory, install Node dependencies, and start the Vite dev server:

```powershell
cd C:\Projects\BRANDTRACE\BRANDTRACE

# 1. Install frontend npm packages
npm install

# 2. Start the Vite development server (default port 3000)
npm run dev
```

The terminal output will display:
```
  VITE v6.4.5  ready in 450 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

## 5. Verifying Connectivity & Initializing Demo Data

Once both servers are running:
1. Open your browser and navigate to `http://127.0.0.1:8000/api/health`. You should receive:
   ```json
   {"status":"ok","provider":"offline","version":"1.0.0"}
   ```
2. Navigate to `http://127.0.0.1:8000/docs` to inspect the interactive Swagger UI.
3. Open `http://localhost:3000` to access the BRANDTRACE frontend. Click **"Explore Workspace"** to enter the governance interface.
4. If prompted or if the workspace is blank, trigger the demo seed via PowerShell in a third window:
   ```powershell
   curl.exe -X POST http://127.0.0.1:8000/api/demo/setup
   ```

---

## 6. Running the Automated QA & Test Suite

Verify complete system integrity by running the backend test suite, smoke tests, TypeScript compilation, and production build:

```powershell
# Activate venv if running in a new shell
.\.venv\Scripts\Activate.ps1

# 1. Run full backend pytest suite (expect 75 passed, 1 skipped)
python -m pytest backend/tests -v

# 2. Run end-to-end API smoke test (expect 27/27 passed)
python scripts/smoke_test.py

# 3. Verify TypeScript type safety with no emit
npx tsc --noEmit

# 4. Verify production bundle build
npm run build
```

---

## 7. Common Setup Troubleshooting

### Issue: `Activate.ps1 cannot be loaded because running scripts is disabled`
* **Fix**: Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in your active PowerShell session before running `.\.venv\Scripts\Activate.ps1`.

### Issue: Port 8000 or Port 3000 Already in Use
* **Fix**: Locate and terminate the conflicting process:
  ```powershell
  # Find PID bound to port 8000
  netstat -ano | findstr :8000
  # Terminate process by PID (e.g., PID 14220)
  Stop-Process -Id 14220 -Force
  ```

### Issue: Missing C++ Build Tools during `Pillow` or `greenlet` installation
* **Fix**: Ensure you are using Python 3.10.x. Wheel binaries are pre-compiled for Python 3.10. If pip attempts to compile from source, update pip first: `python -m pip install --upgrade pip`.
