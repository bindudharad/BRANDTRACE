---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 40 — Backend Deployment Runbook

## Purpose

This document provides operational instructions for deploying, configuring, scaling, and monitoring the **BRANDTRACE** FastAPI backend in hosted environments.

---

## 1. Hosting Architecture

The BRANDTRACE backend is an asynchronous Python service built on FastAPI and SQLAlchemy 2.0.

```mermaid
graph TD
    Client["Client (Vercel Frontend / API Client)"] -->|HTTPS / TLS| Ingress["Reverse Proxy / Ingress (Nginx / Cloud Run / Railway)"]
    Ingress -->|Forward| Uvicorn["ASGI Server (Uvicorn / Gunicorn)"]
    Uvicorn --> FastAPIApp["FastAPI Application (backend.app.main:app)"]
    
    subgraph DataPersistence ["Managed Persistence Layer"]
        FastAPIApp -->|Connection Pool| NeonDB[("PostgreSQL Serverless (Neon)")]
    end
```

---

## 2. Containerized Deployment (Dockerfile)

A production Docker container configuration for BRANDTRACE:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Pillow and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV AUTH_MODE=production

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

---

## 3. Serverless PostgreSQL Configuration (Neon)

When deploying to hosted environments with Neon PostgreSQL:

1. **Database URL**:
   Provide the pooled connection string in `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://user:password@ep-sample-1234.us-east-2.aws.neon.tech/brandtrace?sslmode=require
   ```
   *Note: BRANDTRACE's `normalize_database_url` automatically adapts this to `postgresql+psycopg://`.*
2. **CORS Allowlist**:
   Ensure `CORS_ORIGINS` includes the deployed frontend domain:
   ```env
   CORS_ORIGINS=https://brandtrace-woad.vercel.app,http://localhost:3000
   ```
3. **Connection Pool Tuning**:
   Configure pool settings via environment variables:
   ```env
   DB_POOL_SIZE=5
   DB_MAX_OVERFLOW=10
   DB_POOL_RECYCLE=300
   DB_POOL_TIMEOUT_SECONDS=10
   DB_CONNECT_TIMEOUT_SECONDS=10
   ```

---

## 4. Health Checks and Readiness Probes

Container orchestrators (Kubernetes, AWS ECS, Google Cloud Run) should be configured with the following probe endpoints:

- **Liveness Probe**: `GET /api/health`
  - Returns `200 OK` with JSON `{"status": "ok", "version": "...", "database": "connected"}`.
- **Startup Probe**:
  - BRANDTRACE executes idempotent schema initialization (`init_db()`) inside the lifespan context manager. Set startup probe failure threshold to at least 3 attempts to allow initial connection establishment.
