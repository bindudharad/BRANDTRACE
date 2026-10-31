# Production Deployment and Infrastructure Guide

This guide details the deployment of **BRANDTRACE** (Evidence-Aware Brand Governance Platform) using modern free cloud platforms:

* **Frontend**: [Vercel](https://vercel.com) (React 19 + TypeScript + Vite 6 Single Page Application)
* **Backend**: [Render](https://render.com) (FastAPI + Python 3.10 Free Web Service)
* **Database**: [Neon](https://neon.tech) (Serverless PostgreSQL 16 Free Tier)

It also includes instructions for self-hosted enterprise Linux deployments (Nginx + Gunicorn + PostgreSQL).

---

## 1. Free Cloud Deployment Architecture

```
+-------------------------------------------------------------------------------+
|                      FREE CLOUD PRODUCTION TOPOLOGY                           |
+-------------------------------------------------------------------------------+

  [ End User Browser ]
          |
          +-----------------------------+
          | (HTTPS - Web Traffic)        | (HTTPS - REST API Calls)
          v                             v
  [ Vercel Edge CDN ]           [ Render Free Web Service ]
  - Framework: Vite / React 19  - Framework: FastAPI + Uvicorn
  - Static Pre-rendered HTML    - Binds: 0.0.0.0:$PORT
  - Vercel SPA Rewrites         - In-memory PDF / Image Analysis
  - VITE_API_BASE_URL           - CORS_ORIGINS Whitelist
          |                             |
          |                             v (Encrypted TLS connection with pool_pre_ping)
          |                     [ Neon Serverless PostgreSQL ]
          |                     - Database: PostgreSQL 16
          |                     - SSL Mode: require
          |                     - Persistent Reviews, Findings, Rules, Facts, Audit
          +-----------------------------+
```

### Architectural Guarantees

1. **Persistent Relational Storage**: All reviews, drafts, findings, rules, facts, versions, and append-only audit entries are stored in Neon PostgreSQL. Render's ephemeral filesystem spin-downs or restarts never cause data loss.
2. **In-Memory File Analysis**: Uploaded PDFs and images are processed completely in memory using `pypdf` and `Pillow`. Extracted textual passages, dominant color palettes, and WCAG luminance values are saved as database records. No local temporary files are left on disk.
3. **Resilient Serverless Pooling**: Neon serverless instances spin down when idle. The backend uses SQLAlchemy 2.0 with `pool_pre_ping=True` and `pool_recycle=300` to automatically test and reconnect stale pooled connections without returning HTTP 500 errors to users.
4. **Idempotent Schema Migrations**: Backend startup (`init_db()`) uses SQLAlchemy dialect inspection (`sqlalchemy.inspect`) before altering tables. This prevents PostgreSQL `InFailedSqlTransaction` errors that occur when executing duplicate column alterations inside a transaction.
5. **Robust API URL Normalization**: The frontend API client automatically strips redundant trailing slashes and duplicate `/api` suffixes from `VITE_API_BASE_URL`, preventing common configuration errors like `/api/api/overview`.
6. **No Secret Leaks in Frontend**: `GEMINI_API_KEY` and database credentials are strictly server-side environment variables on Render. The frontend Vite bundle only receives the public `VITE_API_BASE_URL`.

---

## 2. Step 1: Provision Neon PostgreSQL Database

1. Sign up or log in at **[https://neon.tech](https://neon.tech)**.
2. Click **Create Project**:
   * **Project Name**: `brandtrace-db`
   * **Postgres Version**: `16` (or latest recommended)
   * **Region**: Choose the region closest to your users or Render backend (e.g., `AWS US East (Ohio)`).
3. Once created, navigate to **Dashboard** -> **Connection Details**:
   * Select **Connection string**.
   * Toggle **Pooled connection** or use the standard direct connection string.
   * Ensure `sslmode=require` is present at the end of the URI.
4. Copy your connection URI. It will look like:
   ```
   postgresql://brandtrace_owner:npg_AbCdEf123456@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   > **Note**: BRANDTRACE automatically detects `postgres://` or `postgresql://` and converts it to `postgresql+psycopg://` with the modern `psycopg` (v3) driver.

---

## 3. Step 2: Deploy Backend to Render

1. Sign up or log in at **[https://render.com](https://render.com)**.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `bindudharad/BRANDTRACE`.
4. Configure the web service with the following exact settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `brandtrace-api` |
| **Region** | `Ohio (US East)` (match Neon region) |
| **Branch** | `main` |
| **Root Directory** | `.` (repository root) |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r backend/requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend` |
| **Instance Type** | `Free` |

5. Under **Advanced** -> **Environment Variables**, add:

| Environment Variable | Value | Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://brandtrace_owner:...@ep-....neon.tech/neondb?sslmode=require` | Copied from Neon dashboard |
| `PYTHON_VERSION` | `3.10.11` | Ensures Python 3.10 runtime |
| `CORS_ORIGINS` | `http://localhost:3000` | Temporarily local; update with Vercel URL after Step 3 |
| `AI_PROVIDER` | `mock` | `mock` runs 100% free with deterministic heuristics; or set to `gemini` |
| `GEMINI_API_KEY` | *(optional)* | Only required if `AI_PROVIDER=gemini` |
| `MAX_CONTENT_CHARS` | `50000` | Default text length boundary |
| `MAX_UPLOAD_BYTES` | `10485760` | 10 MB upload ceiling |

6. Under **Advanced** -> **Health Check Path**:
   * Set **Health Check Path** to `/api/health`.
7. Click **Create Web Service**.
8. Render will build the virtual environment, install dependencies from `backend/requirements.txt`, initialize the database tables on Neon, and bind Uvicorn to `0.0.0.0:$PORT`.
9. Once deployed, note your Render public URL (e.g., `https://brandtrace-api.onrender.com`).

---

## 4. Step 3: Deploy Frontend to Vercel

1. Sign up or log in at **[https://vercel.com](https://vercel.com)**.
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository: `bindudharad/BRANDTRACE`.
4. In the **Configure Project** screen:

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | `Vite` |
| **Root Directory** | `./` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

5. Under **Environment Variables**, add:

| Environment Variable | Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://brandtrace-api.onrender.com` | Your Render backend URL from Step 2 |

6. Click **Deploy**.
7. Vercel will install dependencies, run TypeScript verification, compile CSS/JS, prerender static HTML, and publish the deployment to edge CDN servers.
8. Note your public Vercel domain (e.g., `https://brandtrace.vercel.app` or `https://brandtrace-xxx.vercel.app`).

---

## 5. Step 4: Lock Down CORS and Seed Data

Now that both the backend and frontend are live, link them securely:

### 1. Update Render CORS
1. In the **Render Dashboard**, go to `brandtrace-api` -> **Environment**.
2. Update `CORS_ORIGINS` to include your Vercel URL:
   ```
   https://brandtrace.vercel.app,http://localhost:3000
   ```
3. Save changes. Render will automatically redeploy with the strict CORS policy.

### 2. Verify Backend Readiness
Open your browser or run curl:
```bash
curl https://brandtrace-api.onrender.com/api/health
# Response: {"status":"ok","service":"brandtrace","version":"0.3.0"}

curl https://brandtrace-api.onrender.com/api/ready
# Response: {"status":"ready","database":"postgresql"}
```

### 3. Seed Initial Demo Rules and Approved Facts
To seed the empty PostgreSQL database with initial governance rules, facts, and brand profile:
```bash
curl -X POST https://brandtrace-api.onrender.com/api/demo/setup
```
Or open the Vercel web UI, open the workspace, and click **Load Sample**.

---

## 6. Self-Hosted Enterprise Linux Deployment (Alternative)

For on-premises enterprise environments running on Ubuntu/Debian/RHEL:

### Prerequisites
* Linux (Ubuntu 22.04 LTS recommended)
* Systemd supervisor
* Nginx 1.22+
* Python 3.10+
* Managed PostgreSQL 15+

### Service Unit (`/etc/systemd/system/brandtrace.service`)
```ini
[Unit]
Description=BRANDTRACE Governance Platform Backend
After=network.target postgresql.service

[Service]
User=brandtrace
Group=brandtrace
WorkingDirectory=/opt/brandtrace
EnvironmentFile=/opt/brandtrace/.env
ExecStart=/opt/brandtrace/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Nginx Reverse Proxy (`/etc/nginx/sites-available/brandtrace`)
```nginx
server {
    listen 80;
    server_name brandtrace.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name brandtrace.example.com;

    ssl_certificate /etc/letsencrypt/live/brandtrace/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/brandtrace/privkey.pem;

    # Frontend Single Page App
    location / {
        root /opt/brandtrace/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 12M;
    }
}
```

---

## 7. Verification and Smoke Test Commands

Run the local test and build suite before deploying:

```powershell
# 1. Run full backend unit and regression test suite (76 passed, 1 skipped)
py -3.10 -m pytest backend/tests -v

# 2. Run end-to-end API smoke test (27/27 assertions passed)
py -3.10 scripts/smoke_test.py

# 3. Check frontend TypeScript compilation
npx tsc --noEmit

# 4. Run frontend production build & prerender
npm run build
```
