# Known System Limitations and Technical Boundaries

## Commitment to Architectural Transparency

To ensure honest evaluation during hackathon judging and technical diligence, this document details the current architectural limitations, technical trade-offs, and boundary conditions of the BRANDTRACE platform.

None of the items listed below represent hidden bugs; they represent explicit scope decisions made to prioritize deterministic governance reliability, verifiable test fixtures, and zero-setup local evaluation over unverified marketing promises.

---

## 1. Authentication and Identity Management

* **Simulated Role Headers (`X-Demo-Role`)**: The platform currently identifies user roles (`contributor`, `reviewer`, `brand_admin`, `auditor`) via custom HTTP headers injected by the frontend API client.
* **Limitation**: While ideal for local demonstrations and rapid persona switching, this mechanism provides no cryptographic proof of identity.
* **Production Requirement**: Enterprise deployments require replacing simulated headers with OAuth 2.0 / OIDC Bearer tokens verified against corporate identity providers (such as Okta, Azure Active Directory, or Google Workspace).

---

## 2. Visual and Document Analysis Boundaries

* **Host-Dependent OCR**: Scanned documents or image text transcription requires external system-level `tesseract.exe` binaries present on the system `PATH`. When Tesseract is absent, the backend safely reports an informative error without crashing, but cannot extract embedded text from flattened raster pixels.
* **Logo Position & Clearspace Not Implemented**: The platform extracts dominant color palettes, computes CIELAB Delta-E color distance, and measures WCAG 2.1 contrast ratios. However, spatial bounding box detection for brand logo clearspace is scheduled for Round 3.
* **Font Family Identification Not Implemented**: Classifying typography or font weights directly from raster imagery is outside current release boundaries.
* **Non-PDF Document Formats**: Ingestion is optimized for raw copy, `.txt`, and `.pdf` files. Proprietary desktop publishing formats (`.indd`, `.ai`, `.sketch`) or Microsoft Office formats (`.docx`) are not natively parsed.

---

## 3. Background Workers and Proactive Automation

* **On-Demand Claim Impact Calculation**: The Claim Impact Map (`impact_map.py`) is computed synchronously on request when queried via `GET /api/governance/impact-map`.
* **Limitation**: There is currently no standing background cron worker (e.g., Celery or Redis queue) continuously monitoring clock ticks to push automated outbound email alerts or webhooks when a fact expires. Automated outbound webhook workers are planned for Round 3.

---

## 4. Production Hardening and Security Boundaries

* **No Encryption at Rest**: Local execution relies on SQLite (`brandtrace.db`), which does not implement transparent database encryption at rest.
* **No IP Rate Limiting**: The FastAPI application does not bundle IP-based rate limiting middleware (such as `slowapi`), assuming upstream reverse proxies (Nginx or Cloudflare) will manage request throttling.
* **No Row-Level Multi-Tenant Security (RLS)**: While records include a `workspace_id` column, the application does not yet enforce database-level row security policies separating enterprise tenants.
* **PostgreSQL SSL Connection Nuances**: While the SQLAlchemy connection layer automatically normalizes `postgres://` to `postgresql://` and supports standard connection strings, complex enterprise SSL certificate authority chains require manual configuration.

---

## 5. Automated QA and Build Warnings

* **Lack of Headless Browser Automation**: The automated test suite features 75 passed backend tests and a 27-step API smoke test, but does not include browser-level Selenium or Cypress test runners. Interactive UI flows are validated through the documented Manual Browser QA Checklist (`27_MANUAL_BROWSER_QA_CHECKLIST.md`).
* **Vite Rollup Chunk Size Warning**: During `npm run build`, Rollup emits a non-fatal warning: `(!) Some chunks are larger than 500 kB after minification`. This is caused by bundling Three.js 0.186, Lucide React, and Framer Motion into the main vendor bundle (~1,006 kB minified). The build succeeds with exit code 0, and static prerendering executes cleanly.
