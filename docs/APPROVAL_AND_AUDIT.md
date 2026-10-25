# BRANDTRACE — Approval Gate & Immutable Audit History

This document explains the human-gated approval mechanism, the server-side blocker logic, and the append-only audit trail.

---

## 1. The Human-in-the-Loop Principle

BRANDTRACE rejects automated "black-box" approvals. While deterministic pattern analysis and optional AI triage surface issues, **a human reviewer must always own the approval decision.**

The platform guarantees:
1. **No Silent Approvals:** Even when a draft scores 100/100, it remains in `IN_REVIEW` status until a human user with the `brand_manager` or `brand_admin` role explicitly executes an approval action.
2. **Server-Side Enforcement:** The approval gate is enforced by the FastAPI backend (`POST /api/reviews/{id}/approval`). A client cannot modify draft status directly in the database.
3. **Permanent Accountability:** Every approval, rejection, or waiver records the actor's role, UTC timestamp, and justification.

---

## 2. Server-Side Approval Blocker (HTTP 409)

When an approval request is received, the server executes a pre-flight compliance check:

```
Request: POST /api/reviews/{id}/approval
Headers: X-Demo-Role: brand_manager
Body: { "action": "approve" }
```

### Blocker Rules:
- If ANY finding in the review has:
  - `disposition NOT IN ('ACCEPTED_EDIT', 'DISMISSED', 'WAIVED')`
  - AND `severity IN ('HIGH', 'CRITICAL')`
- The backend aborts the operation immediately:
  - **HTTP Status:** `409 Conflict`
  - **Response Payload:** `{"detail": "Cannot approve: review has 2 unresolved HIGH/CRITICAL findings that must be resolved or waived."}`
  - **Review State:** Remains unchanged (`IN_REVIEW`).
  - **Audit Log:** No `APPROVED` event is recorded.

---

## 3. The Policy Waiver Mechanism

Organizations frequently encounter edge cases where a strict brand rule must be waived for a specific marketing campaign (e.g. an approved executive quote or a regulated contract disclaimer).

BRANDTRACE supports compliant waivers:
1. The Brand Manager provides an explicit waiver payload:
   ```json
   {
     "action": "approve",
     "waiver_reason": "Approved by Legal Counsel for Q3 Campaign pursuant to License Agreement L-2026-9."
   }
   ```
2. The server marks the open findings as `WAIVED`.
3. The review transitions to `APPROVED`.
4. An `APPROVED_WITH_WAIVER` audit event is written to the ledger including the full legal justification.

---

## 4. Immutable Audit Trail Anatomy

Audit records are stored in the `audit` database table. The table schema includes:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `VARCHAR` | Primary key formatted as `audit_<hex>`. |
| `review_id` | `VARCHAR` | Foreign key referencing the affected review. |
| `action` | `VARCHAR` | Event code (`SUBMITTED`, `FINDING_ACCEPT`, `FINDING_EDIT`, `FINDING_DISMISS`, `FINDING_ESCALATE`, `APPROVED`, `CHANGES_REQUESTED`). |
| `actor` | `VARCHAR` | Role or identity executing the action (e.g., `brand_manager@demo.com`). |
| `details` | `TEXT` | JSON-encoded before/after state, diffs, and rationale notes. |
| `created_at` | `DATETIME` | UTC timestamp generated server-side at the moment of insertion. |

### Immutability Guarantees:
- **Append-Only Design:** The backend exposes `GET /api/reviews/{id}/audit` to retrieve history. Zero `PUT`, `PATCH`, or `DELETE` endpoints exist for the audit log.
- **Relational Integrity:** Audit records cannot be deleted even if a review is archived.
