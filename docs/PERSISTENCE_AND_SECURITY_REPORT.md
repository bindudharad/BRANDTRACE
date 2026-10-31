# BRANDTRACE — PERSISTENCE, DATA INTEGRITY & SECURITY AUDIT REPORT
**Standard:** Enterprise Data Safety & Application Security Audit  
**Date:** 2026-10-31  
**Target Environments:** Local SQLite & Production PostgreSQL  

---

## 1. Database Architecture & Persistence Integrity

### Dual-Engine Compatibility
BRANDTRACE supports both SQLite (local/dev/testing) and PostgreSQL (hosted production on Render):
- **SQLite Engine:** Uses WAL mode (`PRAGMA journal_mode=WAL;`), foreign keys enabled (`PRAGMA foreign_keys=ON;`), and busy timeout of 5000ms.
- **PostgreSQL Engine:** Connected via SQLAlchemy connection pooling with automatic reconnection and transaction isolation.

### Absolute Dev Database Protection
- **Target File:** `c:\Projects\BRANDTRACE\BRANDTRACE\brandtrace.db`
- **Pre-Test Size:** `983,040 bytes` (mtime: `1793449143`)
- **Post-Test Size:** `983,040 bytes` (mtime: `1793449143`)
- **Integrity Verdict:** **100% UNTOUCHED**. All automated suites, Playwright runs, and regression tests execute strictly against isolated disposable SQLite databases in `%TEMP%`, completely eliminating test data pollution.

### Entity Relationships & Foreign Key Integrity
1. `rules` &rarr; `rule_versions`: Cascading immutable version snapshots with monotonic version integers.
2. `facts` &rarr; `fact_versions`: Source citations, ownership, and validity bounds tracked per version.
3. `reviews` &rarr; `findings`: Foreign key `review_id` references `reviews(id)`. Findings record exact text spans (`start_offset`, `end_offset`) and immutable rule citations.
4. `reviews` &rarr; `review_versions`: Full content snapshots preserved on every accepted replacement or manual edit.
5. `logo_analyses` &rarr; `logo_findings`: Page-indexed visual violations linked to parent analysis.
6. `logo_analyses` &rarr; `logo_reports`: Verification reports linked to source analysis with SHA-256 integrity digests.

---

## 2. Application Security Audit

### A. Authentication, RBAC & Workspace Isolation
- **Tenant Scoping:** Every SQL query enforces `workspace_id = target_workspace`. Cross-workspace data leakage is architecturally prohibited.
- **RBAC Role Matrix:**
  - `brand_admin`: Full authority to configure brand rules, visual standards, approve logo references, and sign off compliance reviews.
  - `reviewer`: Authority to triage findings, accept replacements, and dismiss findings with mandatory justification.
  - `creator`: Read-only access to brand rules; authority to submit drafts and view findings.
  - `auditor`: Read-only access to audit trail, governance insights, and compliance reports.
- **Header Injection Defense:** Starlette header concatenation normalized in `backend/app/main.py:194-200` to prevent privilege escalation via comma-separated header injection.

### B. Dual-Layer Server Approval Gate Guard
- **Threat Vector:** Malicious or compromised frontend attempting to bypass approval conditions.
- **Server Enforcement:** In `POST /api/reviews/{id}/approval`, the backend executes an independent database query:
  ```sql
  SELECT id FROM findings WHERE review_id = ? AND severity IN ('HIGH', 'CRITICAL') AND disposition = 'UNRESOLVED'
  ```
  If any unresolved blocker exists, the server rejects the request with **`HTTP 409 Conflict`**, rendering client-side bypass attempts completely ineffective.

### C. Reviewer Justification Anti-Contamination Guard
- **Threat Vector:** Reviewer notes accidentally replacing publishable marketing copy.
- **Server Enforcement:** Server validates reviewer notes with **`HTTP 422 Unprocessable Entity`** to guarantee reviewer justification is recorded solely in `findings.disposition_reason` and never leaks into publishable copy.

### D. File Upload & Processing Safety
- **Filename Sanitization:** Uploaded files are stripped of directory traversal sequences (`../`, `..\\`).
- **MIME & Content Validation:** Validates magic bytes for `image/png`, `image/jpeg`, and `application/pdf`.
- **Memory-Safe PDF Processing:** `PyMuPDF` (`fitz`) renders pages in-memory with strict page budgets (maximum 50 pages per document), preventing denial-of-service via decompression bombs.

### E. Prompt Injection & AI Safety
- **Advisory AI Separation:** AI recommendations are strictly advisory and run in read-only sandboxes. AI models have **zero authority** to approve reviews, activate rules, or alter database records.
- **Instruction Contamination Defense:** User-uploaded marketing copy and guidelines are treated strictly as unstructured text payloads, never as system instructions.

### F. Cryptographic & Secret Leakage Audit
- **Zero Secrets Committed:** Scanned working tree and Git history for API keys, JWT secrets, passwords, or database credentials. Zero credentials exposed.
- **ReportLab PDF Integrity:** Verification reports generate SHA-256 hashes of the source asset and report findings, ensuring third-party auditability without reproducing proprietary source text.
