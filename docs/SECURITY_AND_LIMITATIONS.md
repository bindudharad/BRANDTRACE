# BRANDTRACE — Security Architecture & Known Limitations

This document provides a technical audit of BRANDTRACE security controls, data isolation boundaries, and an honest disclosure of current limitations.

---

## 1. Security Architecture & Threat Defenses

### 1.1 Input Sanitization & SQL Parameterization:
- **Zero Raw SQL Injection:** All database queries are executed via SQLAlchemy parameter bindings. User-submitted text cannot inject SQL syntax into the query stream.
- **Frontend DOMPurify:** When rendered text or diff comparisons are presented in the React UI, content is sanitized using DOMPurify (`^3.4.14`), mitigating Cross-Site Scripting (XSS).

### 1.2 Defensive Backend Request Guards:
To prevent data-integrity cross-contamination defects:
- **Guard 1 (Reason vs. Content Separation):** The server rejects any edit action where the replacement text matches the disposition rationale (`HTTP 422`).
- **Guard 2 (Metadata Prefix Defense):** Strings prefixed with testing or audit tags (`"Manual QA:"`, `"Reason:"`) are blocked from becoming working draft copy (`HTTP 422`).
- **Guard 3 (Required Term Verification):** Edits resolving missing-term findings are checked to confirm the mandatory token exists before resolving the finding.

### 1.3 Secret Management & Zero-Leak Principles:
- The server-side Gemini API key (`GEMINI_API_KEY`) is stored strictly in environment variables.
- It is never embedded into Vite client bundles, never prefixed with `VITE_`, and never returned in API payloads.
- The demo runs 100% offline with zero external network transmission by default (`AI_PROVIDER=offline`).

---

## 2. Honest Disclosures & Current Limitations

In accordance with strict technical review standards:

| Component | Current Implementation Status | Production Requirement |
| :--- | :--- | :--- |
| **Authentication & Authorization** | **Simulated Demo Mode:** Roles are simulated via the `X-Demo-Role` HTTP header to allow judge evaluation without sign-up friction. | Requires JSON Web Tokens (JWT), session cookies, and enterprise Single Sign-On (SAML/OAuth2). |
| **Database Encryption** | **Plaintext SQLite:** The development instance stores records in a standard SQLite file (`brandtrace.db`). | Requires PostgreSQL with encrypted-at-rest volumes and SSL/TLS wire encryption. |
| **OCR Pipeline** | **External Dependency:** Scanned PDF/image OCR requires Tesseract on the operating system PATH. If absent, OCR is reported as unavailable. | Requires a managed cloud OCR service or containerized Tesseract worker pool. |
| **Spatial Layout Governance** | **Not Implemented (Round 3 Scope):** Bounding-box logo clearspace and pixel font identification are planned future additions. | Planned for Round 3 multimodal roadmap. |
| **Audit Log Tamper-Resistance** | **Application-Level Immutability:** Audit records are append-only within the database schema with zero delete routes. | Enterprise production would benefit from cryptographic hashing (hash chains) or write-once-read-many (WORM) storage. |
| **Automated Background Workers** | **On-Demand API Execution:** Claim expiry impact is queried on demand via API. | Requires a Celery / Redis background queue to dispatch scheduled notifications upon fact expiration. |
| **Bundle Minification Warning** | **Advisory Warning:** Minified JS bundle is ~1,006 kB due to Three.js and Framer Motion dependencies. | Code-splitting via dynamic `import()` planned to optimize chunk sizes below 500 kB. |
