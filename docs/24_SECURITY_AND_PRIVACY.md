# Security, Data Privacy, and Threat Mitigation

## Threat Model & Security Posture

BRANDTRACE is designed to operate within corporate networks and compliance environments where marketing and legal collateral may contain proprietary messaging, unreleased product roadmaps, and sensitive campaign data.

The platform enforces defensive programming practices across all tiers: **input sanitization**, **parameterized SQL binding**, **safe multipart file streaming**, and **strict server-side secret isolation**.

```
+--------------------------------------------------------------------------+
|                     SECURITY & DEFENSE-IN-DEPTH ARCHITECTURE             |
+--------------------------------------------------------------------------+
       |                           |                         |
       v                           v                         v
 [ Input Sanitization ]     [ Injection Defense ]     [ Secret Protection ]
 - Pydantic v2 schemas      - Parameterized SQL       - GEMINI_API_KEY server
 - Max content chars        - SQLAlchemy binding        only
 - DOMPurify on client      - No dynamic SQL exec     - Zero VITE_ secrets
       |                           |                         |
       +---------------------------+-------------------------+
                                   |
                                   v
                   [ Business Logic Integrity Guards ]
                   - Reason / Replacement cross-contamination
                   - QA metadata prefix rejection
                   - Server-side HTTP 409 approval block
```

---

## 1. Input Sanitization & SQL Injection Defense

* **Parameterized SQL Queries**: Direct string concatenation into SQL statements is prohibited across the codebase. All queries in `backend/app/models.py` utilize parameterized bindings (`_statement()` converting positional `?` placeholders into bound variables for SQLAlchemy 2.0).
* **Pydantic Schema Validation**: Every incoming JSON payload is strictly validated via Pydantic v2 models (`schemas.py`), rejecting malformed structures, unexpected fields, or out-of-bounds strings.
* **Payload Size Constraints**:
  * `MAX_CONTENT_CHARS` limits review draft content to 50,000 characters, preventing memory exhaustion or buffer overflow exploits.
  * `MAX_UPLOAD_BYTES` limits uploaded files to 10 MB.
* **Client-Side HTML Sanitization**: Frontend text rendering uses `DOMPurify` before injecting any formatted or diff text into DOM elements, mitigating Cross-Site Scripting (XSS).

---

## 2. Server-Side Secret Isolation

* **Zero Frontend Secrets**: No API keys, database credentials, or private secrets are exposed to the client bundle. The Vite build includes zero `VITE_` prefixed sensitive tokens.
* **Server-Side API Key Storage**: When Gemini AI mode is enabled, `GEMINI_API_KEY` is loaded strictly inside Python environment memory via `backend/app/config.py`. It is never returned in API response bodies or logged to standard output.
* **Network Boundary**: The frontend communicates solely with the local FastAPI backend (port 8000). The browser never makes direct outbound requests to Google's AI endpoints.

---

## 3. Multipart Upload & Ingestion Validation

File uploads via `POST /api/reviews/upload` undergo defensive streaming validation:
* **MIME Type Whitelisting**: Uploads are validated against permitted media types (`application/pdf`, `image/png`, `image/jpeg`, `image/webp`).
* **Byte Size Gating**: Stream chunk reading enforces the 10 MB ceiling in real-time, aborting the transfer if a client attempts to flood the server.
* **Safe Parser Isolation**: Uploaded byte buffers are parsed in-memory using `pypdf` and `Pillow`. Corrupt files, broken headers, or recursive zip/pdf bombs are caught by structured exception handlers, returning `HTTP 400 Bad Request` without crashing the Uvicorn worker process.

---

## 4. Business Logic Integrity Guards

To prevent unauthorized manipulation of compliance records, the backend enforces application-layer integrity guards:
* **Anti-Contamination (`Guard 1`)**: Rejects edits where replacement text is identical to the disposition reason (`HTTP 422`).
* **QA Comment Strip (`Guard 2`)**: Rejects replacements starting with `Manual QA:`, `QA:`, or `Reason:`, preventing internal review notes from leaking into publishable copy (`HTTP 422`).
* **Approval Hard Gate**: Unresolved `HIGH` or `CRITICAL` findings trigger an immutable `HTTP 409 Conflict`, ensuring frontend UI tampering cannot bypass governance sign-off.

---

## 5. Known Production Hardening Gaps

To maintain clarity regarding release boundaries, the following security limitations of the current demo build are explicitly documented:

### Simulated Authentication (`X-Demo-Role`)
* The demo application uses simulated role headers (`X-Demo-Role`) passed from the frontend to facilitate testing contributor, reviewer, brand admin, and auditor personas.
* **Production Requirement**: In production, simulated headers must be replaced with verified JSON Web Tokens (JWT) or OAuth2 / OpenID Connect (OIDC) headers integrated with corporate Single Sign-On (Okta, Azure AD).

### Encryption at Rest
* Local demo execution uses SQLite (`brandtrace.db`), which does not implement transparent database encryption at rest.
* **Production Requirement**: Production deployments must use PostgreSQL hosted on encrypted volumes (e.g., AWS RDS with KMS encryption at rest and TLS 1.3 in transit).

### Session Management & Rate Limiting
* The current release does not bundle IP-based rate limiting middleware (e.g., `slowapi`) or user session revocation tables.
* **Production Requirement**: A reverse proxy (such as Nginx, Cloudflare, or Traefik) must terminate TLS, enforce rate limits, and scrub untrusted headers.
