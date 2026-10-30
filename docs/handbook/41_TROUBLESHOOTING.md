---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 41 — Troubleshooting Guide

## Purpose

This document provides diagnostic steps and resolutions for common runtime errors, configuration mismatches, and operational bottlenecks encountered in **BRANDTRACE**.

---

## 1. Diagnostic Matrix

| Symptom | Probable Cause | Immediate Remediation |
| :--- | :--- | :--- |
| **CORS Error in Browser** (`Cross-Origin Request Blocked`) | Frontend origin not present in `CORS_ORIGINS` | Add frontend URL (e.g. `https://brandtrace-woad.vercel.app`) to the backend `CORS_ORIGINS` environment variable. |
| **`HTTP 409 Conflict` on Draft Approval** | Unresolved `HIGH` or `CRITICAL` findings remain on draft | Inspect the findings list. Accept corrections, dismiss non-issues with justification, or apply explicit waivers before approving. |
| **`HTTP 403 Forbidden` on Rule/Approval Route** | Current persona (`creator` or `auditor`) lacks required privileges | Use the Persona Switcher to switch to `Reviewer` or `Brand Admin`, or provide valid administrative API credentials. |
| **`HTTP 413 Payload Too Large`** | Uploaded file exceeds 10 MB limit (`MAX_UPLOAD_BYTES`) | Compress the image or PDF document to under 10 MB prior to ingestion. |
| **`HTTP 422 Unprocessable Entity` on Review Waiver** | Review waiver submitted without mandatory justification | Supply a documented reason string in the `reason` payload property. |
| **SQLite `OperationalError: database is locked`** | Concurrent writes in multi-threaded local dev | Ensure SQLite connections use transaction context managers (`with db() as conn:`), or configure PostgreSQL for high concurrency. |
| **PostgreSQL Connection Drops (Neon)** | Inactive connection dropped by serverless host | Ensure `pool_pre_ping=True` and `pool_recycle=300` are configured in `models.py`. |
| **Three.js Canvas Not Rendering** | WebGL disabled or unsupported on client GPU | BRANDTRACE automatically detects WebGL unavailability and renders the SVG topology fallback graph. Check browser hardware acceleration settings if 3D is desired. |
| **Corrupted PDF Text Extraction** | Scanned document without OCR or corrupted PDF stream | Confirm the PDF contains a digital text layer. BRANDTRACE extracts digital text layers via `pypdf`; scanned raster PDFs require pre-processing. |

---

## 2. Fast Verification Commands

### Test Database Connectivity
```bash
python -c "from backend.app.models import rows; print('DB OK:', rows('SELECT 1'))"
```

### Validate API Route Registration
```bash
python -c "from backend.app.main import app; print('Registered routes:', len(app.routes))"
```

### Check Active Configuration Values
```bash
python -c "from backend.app.config import ENVIRONMENT, AUTH_MODE, DATABASE_URL; print(ENVIRONMENT, AUTH_MODE, DATABASE_URL[:20])"
```
