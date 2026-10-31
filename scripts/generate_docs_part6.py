"""
Generator for BRANDTRACE Master Documentation Ecosystem (Category F: Docs 29 to 33).
"""
import os

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))
os.makedirs(DOCS_DIR, exist_ok=True)

docs = {}

# =============================================================================
# 29_HUMAN_REVIEW_AND_APPROVAL_WORKFLOW.md
# =============================================================================
docs["29_HUMAN_REVIEW_AND_APPROVAL_WORKFLOW.md"] = """# 29 — HUMAN REVIEW & APPROVAL WORKFLOW
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Approval State Machine

```mermaid
stateDiagram-v2
    [*] --> IN_REVIEW : Draft Submitted
    IN_REVIEW --> IN_REVIEW : Exact-Span Edit (Score Improves)
    IN_REVIEW --> IN_REVIEW : Finding Dismissed with Reason
    IN_REVIEW --> CHANGES_REQUESTED : Reviewer Requests Changes
    CHANGES_REQUESTED --> IN_REVIEW : Revised Draft Submitted
    IN_REVIEW --> APPROVED : Admin Approves (All High-Risk Resolved)
    IN_REVIEW --> HTTP_409_BLOCKED : Admin Attempts Approval (Blocker Remains)
    HTTP_409_BLOCKED --> IN_REVIEW : Blocker Resolved / Dismissed
    APPROVED --> CHANGES_REQUESTED : Underlying Fact Expires (Targeted Re-Review)
    APPROVED --> [*]
```

---

## 2. Server-Side Approval Enforcement

The approval transition is guarded at the HTTP API layer (`POST /api/reviews/{id}/approval`):
- If `disposition IS NULL` for any finding with `severity in ('HIGH', 'CRITICAL')`, the server aborts the transaction with **HTTP 409 Conflict**.
- The response body provides an explicit diagnostic message naming the blocking passage, policy violation, and requirement.
- Client-side state cannot override or forge this validation check.
"""

# =============================================================================
# 30_VERSION_HISTORY_AND_AUDIT_TRAIL.md
# =============================================================================
docs["30_VERSION_HISTORY_AND_AUDIT_TRAIL.md"] = """# 30 — VERSION HISTORY AND AUDIT TRAIL
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Content Revision Snapshots

Every text modification in BRANDTRACE creates an immutable revision record in `review_versions`:
- **Trigger Events:** `ORIGINAL_SUBMISSION`, `FINDING_ACCEPT`, `FINDING_EDIT`, `VERSION_RESTORED`.
- **Snapshot Metadata:** Author identity, creation timestamp, content length, and SHA-256 hash.
- **Instant Rollback:** Reviewers can click **Restore This Revision** to revert to any historical state; the governance engine re-executes automatically and logs `VERSION_RESTORED`.

---

## 2. Append-Only Audit Trail

The `audit` table functions as an immutable corporate event ledger:
- **Columns:** `id`, `workspace_id`, `review_id`, `action`, `actor`, `actor_role`, `reason`, `details`, `created_at`.
- **Zero Mutation APIs:** The API exposes strictly `POST` internal insert helpers and `GET /api/reviews/{id}/audit`. Zero `UPDATE` or `DELETE` endpoints exist for the audit log.
"""

# =============================================================================
# 31_SECURITY_ARCHITECTURE_AND_THREAT_MODEL.md
# =============================================================================
docs["31_SECURITY_ARCHITECTURE_AND_THREAT_MODEL.md"] = """# 31 — SECURITY ARCHITECTURE AND THREAT MODEL
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Threat Matrix & Countermeasures

| Threat Vector | Severity | Attack Scenario | Countermeasure Mechanism | Status |
|---|---|---|---|:---:|
| **Unauthorized Approval** | CRITICAL | Non-admin attempts to sign off on copy | FastAPI `require_role(["brand_admin"])` dependency blocks with HTTP 403 | **VERIFIED** |
| **Draft Contamination** | HIGH | Reviewer notes overwrite publishable draft | Server-side validation rejects reason text and QA metadata strings (HTTP 422) | **VERIFIED** |
| **SQL Injection** | CRITICAL | Malicious SQL payload in search query | 100% parameterized queries via SQLAlchemy query compiler and bound parameter tuples | **VERIFIED** |
| **Cross-Tenant IDOR** | HIGH | User attempts to access draft from another tenant | All database lookups bind `workspace_id`; cross-workspace queries return HTTP 403/404 | **VERIFIED** |
| **Cross-Site Scripting** | MEDIUM | Script tags embedded in review title | React 19 automatic JSX text node escaping + sanitized DOM rendering | **VERIFIED** |
| **Prompt Injection** | MEDIUM | Adversarial text attempting policy bypass | Deterministic DFA engine evaluates prior to LLM; AI findings are strictly advisory | **VERIFIED** |
"""

# =============================================================================
# 32_PRIVACY_AND_DATA_HANDLING.md
# =============================================================================
docs["32_PRIVACY_AND_DATA_HANDLING.md"] = """# 32 — PRIVACY AND DATA HANDLING SPECIFICATION
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Data Classification

- **Public Marketing Content:** Draft copy and published releases evaluated under standard brand governance.
- **Corporate Ground-Truth Evidence:** Internal audit certificates, security standards, and brand rules stored in workspace-scoped tables.
- **Personally Identifiable Information (PII):** Screened via preflight regex patterns; never transmitted to external AI endpoints without explicit user opt-in.

---

## 2. Third-Party Data Transmission Policy

1. **Zero External Calls by Default:** Digital text extraction, rule matching, visual palette analysis, and approval gates run 100% locally in-process.
2. **Opt-In Advisory AI:** When external AI is toggled (`consent_ai=true`), document text is transmitted via HTTPS to the Groq API for non-binding advisory suggestions.
3. **Zero Retention by External AI:** Provider contracts specify zero training retention on API inference requests.
"""

# =============================================================================
# 33_ERROR_HANDLING_AND_OBSERVABILITY.md
# =============================================================================
docs["33_ERROR_HANDLING_AND_OBSERVABILITY.md"] = """# 33 — ERROR HANDLING AND OBSERVABILITY
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Standardized Error Contracts

FastAPI routes enforce standard RFC 7807 error responses:

```json
{
  "detail": "High-risk findings (1 unresolved: 'ISO 27001 Security Certification') must be resolved before approval or waiver."
}
```

- **HTTP 400 Bad Request:** Malformed request payload or missing parameters.
- **HTTP 403 Forbidden:** Role unauthorized for requested operation.
- **HTTP 404 Not Found:** Entity not found within the authenticated workspace.
- **HTTP 409 Conflict:** State transition conflict (e.g. approval gate blocked or optimistic concurrency failure).
- **HTTP 422 Unprocessable Entity:** Schema validation failure or anti-contamination guard violation.

---

## 2. Health Monitoring Probes

- **Liveness Probe (`GET /api/health`):** Returns HTTP 200 `{"status": "ok", "service": "brandtrace", "version": "0.3.0"}`.
- **Readiness Probe (`GET /api/ready`):** Validates database connection pool health and reports active dialect (`sqlite` or `postgresql`).
"""

for fname, content in docs.items():
    fpath = os.path.join(DOCS_DIR, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Generated: {fname}")
