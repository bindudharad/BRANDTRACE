# 30 — VERSION HISTORY AND AUDIT TRAIL
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
