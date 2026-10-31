# 07 — FUNCTIONAL REQUIREMENTS SPECIFICATION
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. System Requirements Catalogue

### FR-001: Brand Constitution Management
- **Description:** The system must allow authorized `brand_admin` users to define, view, update, and deactivate brand rules across voice, terminology, claims, and visual identity.
- **Status:** **VERIFIED IMPLEMENTED** (`POST /api/rules`, `GET /api/rules`).

### FR-002: Rule Versioning & Concurrency Protection
- **Description:** Any modification to a brand rule must increment its version and record an immutable snapshot in `rule_versions`. Updates must support optimistic concurrency control via `expected_rule_version`.
- **Status:** **VERIFIED IMPLEMENTED** (`GET /api/rules/{id}/versions`).

### FR-003: Deterministic Rule Evaluation
- **Description:** Content evaluation must parse text deterministically, identifying prohibited terms, required phrases, and unsubstantiated claims with exact coordinate spans.
- **Status:** **VERIFIED IMPLEMENTED** (`backend/app/governance.py`).

### FR-004: Corporate Claim Ledger
- **Description:** The system must store corporate facts with associated source titles, verification excerpts, owner attribution, and ISO-8601 validity periods.
- **Status:** **VERIFIED IMPLEMENTED** (`POST /api/facts`, `GET /api/facts`).

### FR-005: Proactive Expiry Monitoring
- **Description:** The system must monitor approaching expirations across 30-day, 7-day, and 1-day intervals and alert assigned owners without duplicate spam.
- **Status:** **VERIFIED IMPLEMENTED** (`POST /api/governance/expiry-worker/trigger`).

### FR-006: Rule-Change Impact Analysis
- **Description:** When an approved fact or rule is updated or expired, the system must traverse `evidence_dependencies` to identify all dependent approved drafts.
- **Status:** **VERIFIED IMPLEMENTED** (`GET /api/governance/impact-map`).

### FR-007: Targeted Re-Review Execution
- **Description:** The system must allow administrators to transition affected reviews back to `CHANGES_REQUESTED` while leaving unrelated drafts untouched.
- **Status:** **VERIFIED IMPLEMENTED** (`POST /api/governance/re-review-impact`).

### FR-008: Server-Side Approval Gate
- **Description:** The backend must return HTTP 409 Conflict if an approval is attempted on any review containing unresolved high or critical severity findings.
- **Status:** **VERIFIED IMPLEMENTED** (`POST /api/reviews/{id}/approval`).

### FR-009: Draft Anti-Contamination Guards
- **Description:** The system must reject any finding replacement that matches reviewer justification text or automated QA metadata strings with HTTP 422.
- **Status:** **VERIFIED IMPLEMENTED** (`backend/app/services/finding_actions.py`).

### FR-010: Compliance Evidence Dossier Export
- **Description:** The system must compile and export tamper-evident, auditor-ready compliance evidence packets in machine-readable JSON and downloadable PDF formats.
- **Status:** **VERIFIED IMPLEMENTED** (`GET /api/reviews/{id}/export-evidence`).
