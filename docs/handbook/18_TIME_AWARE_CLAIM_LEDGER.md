---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 18 — Time-Aware Claim Ledger

## Purpose

This document details the **Time-Aware Claim Ledger** (`facts` table and `backend/app/governance.py`), explaining how empirical assertions, validity windows, expiration boundaries, and operational context notes are modeled and enforced.

---

## What is the Time-Aware Claim Ledger?

Organizations continuously make quantitative and factual assertions in external marketing:
- *"Over 500 Enterprise Customers"*
- *"Available in India"*
- *"Save 50% on operational onboarding time"*
- *"Rated #1 in Customer Support 2025"*

These assertions are empirical: they are true only within defined timeframes. If a 2025 customer metric is repeated in 2027 marketing materials, the claim becomes deceptive and legally non-compliant.

The Claim Ledger transforms unanchored claims into computable, time-bounded records:

```mermaid
graph LR
    subgraph Fact Record ["Fact Entity (facts Table)"]
        F1["Claim Statement"]
        F2["Verified Value"]
        F3["Department Owner"]
        F4["Effective Date (effective_at)"]
        F5["Expiration Date (expires_at)"]
        F6["Operational Notes (notes)"]
    end

    subgraph Validity Lifecycle
        Active["ACTIVE: Valid publication claim"]
        Soon["EXPIRING_SOON: <= 30 days to expiration"]
        Expired["EXPIRED: Outdated / Prohibited claim"]
    end

    F4 & F5 --> Validity Lifecycle
    Soon -.-> Alert["Alert Reviewers in Workspace"]
    Expired -.-> Flag["Flag OUTDATED (High Severity)"]
```

---

## Data Schema & Attributes

Stored in the `facts` table:
- **`claim`**: Domain topic or claim category (e.g., `Availability`, `Customer Metric`).
- **`value`**: The verified statement (e.g., `India`, `Over 500 Enterprise Customers`).
- **`owner`**: Department legally responsible for claim accuracy (e.g., `Legal & Analytics`).
- **`effective_at`**: ISO 8601 UTC timestamp when assertion becomes valid.
- **`expires_at`**: ISO 8601 UTC timestamp when assertion expires.
- **`status`**: Current lifecycle state:
  - `ACTIVE`: Assertion is within valid time bounds.
  - `EXPIRING_SOON`: Current time is within 30 days of `expires_at`.
  - `EXPIRED`: Current time has exceeded `expires_at`.
  - `INVALIDATED`: Administrator prematurely retired the claim.
- **`notes`**: Field capturing operational context, audit methodology, or research sources.

---

## Timezone-Safe Boundary Calculation

Fact status is evaluated dynamically using UTC ISO string comparisons:

```python
now_iso = datetime.now(timezone.utc).isoformat()
thirty_days_later = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

if fact["expires_at"] < now_iso:
    status = "EXPIRED"
elif fact["expires_at"] <= thirty_days_later:
    status = "EXPIRING_SOON"
else:
    status = "ACTIVE"
```

1. **Deterministic Parsing:** Avoids timezone drift by normalizing all datetime calculations to UTC.
2. **Proactive Reviewer Warning:** The `EXPIRING_SOON` badge alerts content creators and compliance reviewers 30 days prior to fact sunset, preventing last-minute campaign rewrites.
3. **Automatic Downgrade to `OUTDATED`:** Any draft submitted after `expires_at` automatically triggers a `HIGH` severity finding (`status: OUTDATED`).

---

## Versioning & Immutable Snapshots

When an administrator amends a fact (`PUT /api/facts/{id}`):
1. The previous state is permanently captured in `fact_versions`.
2. Existing reviews citing the previous fact version retain their original version citation in `evidence_dependencies`.
3. The Claim Impact Map is notified of the amendment to identify dependent drafts.

---

## Test Verification

Verified in `backend/tests/test_round3_claim_ledger.py`:
- `test_claim_ledger_notes_field_and_audit`: Verifies notes persistence and audit stream logging.
- `test_fact_validity_transition_and_boundary`: Verifies exact timestamp boundaries for `ACTIVE`, `EXPIRING_SOON`, and `EXPIRED` transitions.
- `test_fact_update_preserves_snapshot_and_impacts_only_linked_reviews`: Proves that fact updates create immutable snapshots and only impact linked drafts.

---

## Related Documentation

- [10 — Database Schema](./10_DATABASE_SCHEMA.md)
- [15 — Deterministic Rule Engine](./15_DETERMINISTIC_RULE_ENGINE.md)
- [19 — Claim Impact Map](./19_CLAIM_IMPACT_MAP.md)
- [28 — Approval Gate and Governance Workflow](./28_APPROVAL_GATE_AND_GOVERNANCE_WORKFLOW.md)
