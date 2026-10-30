---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 29 — Audit Trail and Data Retention

## Purpose

This document details the append-only audit trail architecture, event taxonomy, attribution model, and data retention guarantees in **BRANDTRACE** (`backend/app/models.py`, `backend/app/main.py`).

---

## 1. Architectural Principles

In regulated enterprise environments, brand and compliance modifications must be traceable to authenticated human actors with complete chronological fidelity.

The BRANDTRACE audit system guarantees:
1. **Append-Only Immutability**: No API routes exist to edit (`PUT`/`PATCH`) or delete (`DELETE`) records in the `audit` table.
2. **Deterministic Workspace Scoping**: Every audit record carries an explicit `workspace_id`. Cross-tenant audit data leakage is structurally impossible in tenant-scoped queries.
3. **Actor Attribution**: Every write records the actor's identifier (`actor`), role at time of execution (`actor_role`), and ISO-8601 UTC timestamp (`created_at`).
4. **Contextual Metadata**: In addition to standard metadata, complex actions record the structured payload or delta in the `details` JSON/text column.

---

## 2. Database Schema (`audit` Table)

```sql
CREATE TABLE audit (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL DEFAULT 'ws_default',
    review_id TEXT,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    actor_role TEXT NOT NULL DEFAULT 'reviewer',
    reason TEXT,
    details TEXT,
    created_at TEXT NOT NULL
);
```

---

## 3. Event Taxonomy

BRANDTRACE logs 18 discrete compliance events across governance, review, and administrative workflows:

| Event Action | Triggering Context | Key Captured Data |
| :--- | :--- | :--- |
| `WORKSPACE_CREATED` | New workspace registered | Workspace name, owner ID |
| `MEMBER_ADDED` | Member invited to workspace | Email, assigned role |
| `MEMBER_REMOVED` | Member access revoked | Removed user ID, executing admin |
| `RULE_CREATED` | New brand rule submitted | Rule pattern, requirement, severity |
| `RULE_UPDATED` | Active rule modified directly | Old version, new version, diff |
| `RULE_ACTIVATED` | Rule suggestion activated | Originating suggestion ID, version bump |
| `FACT_CREATED` | Claim added to Claim Ledger | Claim text, source citation, expiry date |
| `FACT_UPDATED` | Claim or validity window updated | Version bump, updated fields |
| `BRAND_PROFILE_UPDATED`| Visual identity tokens changed | Primary/secondary hex, contrast ratios |
| `REVIEW_CREATED` | Draft submitted for evaluation | Draft title, initial health score |
| `REVIEW_APPROVED` | Review passes approval gate | Approver ID, clearance score at sign-off |
| `REVIEW_CHANGES_REQUESTED`| Review sent back to creator | Unresolved finding count, feedback notes |
| `REVIEW_WAIVED` | Administrative sign-off granted | Approver ID, mandatory waiver justification |
| `VERSION_SAVED` | Snapshot preserved during edit | Version ID, edit summary |
| `VERSION_RESTORED` | Review rolled back to prior snapshot| Target version ID, author |
| `FINDING_DISPOSITION_SET` | Finding triaged (Accept/Dismiss/Waive)| Finding ID, disposition, reason |
| `RULE_SUGGESTION_DECIDED`| Proposal Accepted/Deferred/Rejected| Suggestion ID, status, admin decision |
| `DEMO_DATA_RESET` | Workspace reset in demo mode | Executed by admin in demo environment |

---

## 4. Query Endpoints

BRANDTRACE exposes two audit consumption interfaces:

### Workspace Audit Ledger (`GET /api/audit`)
- **Scope**: All audit events across rules, facts, profiles, and reviews within the caller's workspace.
- **Parameters**: `limit` (default 50), `offset`.
- **Authorization**: Accessible to `reviewer`, `brand_admin`, and `auditor` roles.

### Review History Ledger (`GET /api/reviews/{review_id}/audit`)
- **Scope**: Filtered stream of events specifically referencing the given `review_id`.
- **Use Case**: Embedded within the Review Workspace timeline, showing the complete provenance of a marketing draft from upload through approval.

---

## 5. Retention and Storage Guarantees

1. **Transactional Integrity**: Audit records are inserted within the same database transaction as the business operation. If an operation fails, no orphan audit record is created; if the audit insert fails, the transaction rolls back.
2. **Persistent Retention**: In PostgreSQL/Neon deployments, audit records remain stored indefinitely in the relational store.
3. **Demo Reset Boundaries**: In non-production demo modes (`POST /api/demo/reset`), audit records for `ws_default` may be cleared solely by an authenticated `brand_admin` possessing the configured reset token.
