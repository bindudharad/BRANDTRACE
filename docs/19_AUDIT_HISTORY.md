# Audit History and Compliance Logging

## The Necessity of Tamper-Evident Audit Trails

In enterprise governance, an approval is only as trustworthy as the audit trail that corroborates it. When an organization faces advertising regulatory scrutiny or internal legal discovery, compliance officers must answer three definitive questions:
1. *What did the copy look like when it was approved?*
2. *Who authorized the sign-off and under what active role?*
3. *Why were flagged policy warnings dismissed or overridden?*

BRANDTRACE answers these questions through a dedicated **append-only audit log** (`audit` table) that permanently records every material lifecycle event.

```
+--------------------------------------------------------------------------+
|                             AUDIT EVENT LOG                              |
+--------------------------------------------------------------------------+
  ID: aud_c92a10
  Review ID: rev_launch_q4
  Action: APPROVAL_APPROVE
  Actor: "demo.reviewer" (Role: reviewer)
  Reason: "All brand voice guidelines satisfied and factual claims verified."
  Details: "Draft status transitioned to APPROVED."
  Created At: 2026-10-24T18:42:15.102Z
```

---

## Detailed Audit Entity Schema

The `audit` table in `backend/app/models.py` defines the following schema:
* `id` (`TEXT PRIMARY KEY`): Unique audit event identifier (`aud_<hex>`).
* `workspace_id` (`TEXT NOT NULL DEFAULT 'ws_default'`): Multi-tenant workspace identifier.
* `review_id` (`TEXT NOT NULL`): Foreign key referencing the reviewed draft (`reviews.id`).
* `action` (`TEXT NOT NULL`): Standardized event taxonomy code.
* `actor` (`TEXT NOT NULL`): User identity, email, or demo actor string.
* `actor_role` (`TEXT NOT NULL DEFAULT 'reviewer'`): Active security role (`contributor`, `reviewer`, `brand_admin`, `auditor`).
* `reason` (`TEXT`): Human-provided rationale or justification string.
* `details` (`TEXT`): Contextual metadata (e.g., finding ID, restored version ID, or status change summary).
* `created_at` (`TEXT NOT NULL`): UTC ISO 8601 timestamp.

---

## Complete Audit Event Taxonomy

The system emits standardized audit action codes across all workflow phases:

| Action Code | Trigger Event | Logged Metadata & Context |
| :--- | :--- | :--- |
| `REVIEW_CREATED` | New review draft submitted or file uploaded | Author identity, review title, initial score |
| `FINDING_ACCEPT` | Author/reviewer accepts automated suggested correction | Finding ID, replaced span, resulting version snapshot |
| `FINDING_EDIT` | Reviewer applies custom text edit to resolve finding | Finding ID, custom replacement text, user reason |
| `FINDING_DISMISS` | Reviewer grants administrative exception on a finding | Finding ID, mandatory documented justification |
| `FINDING_ESCALATE` | Finding flagged for higher-tier management review | Finding ID, reason for escalation |
| `APPROVAL_APPROVE` | Reviewer grants final publication clearance | Transition to `APPROVED`, final clearance score |
| `APPROVAL_REQUEST_CHANGES`| Reviewer rejects draft back to contributor | Transition to `CHANGES_REQUESTED`, feedback notes |
| `APPROVAL_WAIVE` | Reviewer grants governance waiver to approve draft | Transition to `WAIVED`, mandatory waiver justification |
| `VERSION_RESTORED` | Reviewer rolls back draft to an earlier version | Restored version ID, timestamp of restored snapshot |

---

## Append-Only Immutability Guarantees

Trust requires mathematical immutability. BRANDTRACE enforces this at the architectural layer:
1. **No Mutation Endpoints**: The REST API exposes `GET /api/reviews/{id}/audit`, but provides **no `DELETE`, `PUT`, or `PATCH` endpoints** for the audit resource.
2. **Deterministic Append**: Application code writes to `audit` exclusively via `models.audit()`, which issues parameter-bound `INSERT INTO audit ...` statements.
3. **Chronological Sorting**: Audits are queried with `ORDER BY created_at DESC`, guaranteeing an accurate timeline of events.

---

## Actor Representation in Demo Mode

In the current demo implementation, identity is supplied via the `X-Demo-Actor` and `X-Demo-Role` headers:
* When an action executes, the header values are bound into the audit row (e.g., actor: `"jane.reviewer@company.com"`, role: `"reviewer"`).
* This ensures that when testing different personas in the UI, the audit log accurately reflects role transitions without requiring complex external OAuth login flows.

---

## Governance Insights Integration (`GET /api/insights`)

Audit entries do not simply sit in passive storage; they are continuously indexed by `backend/app/main.py` (`GET /api/insights`):
* **Recurring Violations**: Aggregates which brand rules are violated most frequently across all submitted drafts.
* **Dismissal Rates**: Tracks how often specific rules are dismissed by reviewers, helping brand administrators identify ambiguous or overly restrictive rules that require updating.
* **Disagreement Count**: Measures friction between automated engine flags and human exceptions.
