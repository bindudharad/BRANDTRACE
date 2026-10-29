# Operational Troubleshooting and Diagnostic Guide

This guide details common installation, runtime, connectivity, and build issues encountered when running BRANDTRACE, along with root causes and verified remediation steps.

---

## 1. Backend Startup Failures

### Issue: `Port 8000 is already in use` (`[Errno 10048] error while attempting to bind on address`)
* **Root Cause**: An orphaned Uvicorn process or another local web service (e.g., Docker, IIS, another Python script) is already listening on port 8000.
* **Remediation**:
  Open PowerShell as Administrator and terminate the conflicting process:
  ```powershell
  # Identify process ID listening on port 8000
  $conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
  if ($conn) {
      Stop-Process -Id $conn.OwningProcess -Force
      Write-Host "Process $($conn.OwningProcess) terminated successfully."
  }
  ```

### Issue: `ModuleNotFoundError: No module named 'fastapi'` (or `sqlalchemy`, `pydantic`)
* **Root Cause**: PowerShell is running against the global Python environment instead of the project's virtual environment.
* **Remediation**:
  Ensure the virtual environment is activated before running Uvicorn:
  ```powershell
  cd C:\Projects\BRANDTRACE\BRANDTRACE
  .\.venv\Scripts\Activate.ps1
  # Verify Python path points inside .venv
  Get-Command python | Select-Object Source
  pip install -r backend\requirements.txt
  ```

### Issue: `Script execution disabled` (`.\.venv\Scripts\Activate.ps1 cannot be loaded`)
* **Root Cause**: Windows PowerShell default execution policy restricts unassigned script execution.
* **Remediation**:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\.venv\Scripts\Activate.ps1
  ```

---

## 2. Frontend Startup & Build Issues

### Issue: `sh: vite: command not found` or `node_modules missing`
* **Root Cause**: Node packages have not been installed after cloning or checking out the repository.
* **Remediation**:
  ```powershell
  cd C:\Projects\BRANDTRACE\BRANDTRACE
  npm install
  npm run dev
  ```

### Issue: Port 3000 Collision (`Port 3000 is in use, trying another port...`)
* **Root Cause**: Another frontend dev server is active, causing Vite to bind to `3001` or `5173`.
* **Remediation**:
  Either terminate the competing process or update the `CORS_ORIGINS` environment variable in the backend to allow requests originating from the alternate port:
  ```powershell
  $env:CORS_ORIGINS = "http://localhost:3000,http://localhost:3001,http://localhost:5173"
  ```

### Issue: Production Build Warning (`Some chunks are larger than 500 kB after minification`)
* **Root Cause**: Three.js, Lucide icons, and Framer Motion create a vendor bundle of approximately 1,006 kB.
* **Diagnostic Note**: This is a non-fatal Rollup warning, **not a build failure**. The build command exits with code 0, and the static HTML is generated successfully in `dist/`.

---

## 3. Database & Persistence Errors

### Issue: `sqlite3.OperationalError: database is locked`
* **Root Cause**: SQLite file lock contention occurring when multiple processes or zombie test runners attempt simultaneous writes to `brandtrace.db` without releasing transaction locks.
* **Remediation**:
  1. Shut down any running Uvicorn or test sessions.
  2. Delete lingering SQLite temporary journal files:
     ```powershell
     Remove-Item "C:\Projects\BRANDTRACE\BRANDTRACE\brandtrace.db-journal" -ErrorAction SilentlyContinue
     Remove-Item "C:\Projects\BRANDTRACE\BRANDTRACE\brandtrace.db-wal" -ErrorAction SilentlyContinue
     ```
  3. If corruption persists, trigger a clean demo reset via PowerShell:
     ```powershell
     Remove-Item "C:\Projects\BRANDTRACE\BRANDTRACE\brandtrace.db" -ErrorAction SilentlyContinue
     # Restart backend; init_db() will recreate a pristine database automatically
     ```

---

## 4. Ingestion & File Upload Failures

### Issue: `No extractable text found in PDF`
* **Root Cause**: The uploaded PDF consists entirely of raster images or scanned artwork without an underlying embedded text stream.
* **Remediation**:
  `pypdf` extracts vector and font text layers. For scanned physical paper documents, preprocess the file using an OCR utility before uploading, or submit raw copy via the text editor.

### Issue: `OCR unavailable: Tesseract is not installed on PATH`
* **Root Cause**: Image text transcription requires the external `tesseract.exe` optical engine, which is not bundled into Python wheels.
* **Remediation**:
  Install Tesseract for Windows (via `winget install UB-Mannheim.TesseractOCR`) and append `C:\Program Files\Tesseract-OCR` to the system `PATH`. Note that basic palette extraction and WCAG contrast calculations function fully without Tesseract.

---

## 5. Network & Cross-Origin (CORS) Issues

### Issue: `Failed to fetch` or `CORS header 'Access-Control-Allow-Origin' missing`
* **Root Cause**:
  1. The backend server on port 8000 is not running.
  2. The browser is accessing the frontend on an unexpected IP/port not included in `CORS_ORIGINS`.
* **Remediation**:
  1. Verify backend health by visiting `http://127.0.0.1:8000/api/health` directly in the browser.
  2. Ensure your backend PowerShell terminal has `CORS_ORIGINS` properly exported.
