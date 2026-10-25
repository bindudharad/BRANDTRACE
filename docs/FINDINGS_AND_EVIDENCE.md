# BRANDTRACE — Findings and Evidence Traceability

This document details how BRANDTRACE links findings to authoritative brand rules and evidence facts, ensuring complete provenance without hallucinated citations.

---

## 1. Finding Structure and Anatomy

Every finding record stored in the `findings` table contains explicit metadata connecting draft copy to institutional policy:

```json
{
  "id": "finding_a93b48f12c01",
  "review_id": "review_4d82b09a712f",
  "passage": "best choice",
  "finding_type": "tone_superlative",
  "severity": "MEDIUM",
  "rule_id": "R-VOICE-01",
  "fact_id": null,
  "evidence_status": "NEEDS_REVIEW",
  "suggested_correction": "effective",
  "disposition": null,
  "disposition_reason": null,
  "created_at": "2026-10-25T00:15:30Z"
}
```

### Key Field Semantics:
- **`passage`**: The exact substring from the submitted content that triggered the engine.
- **`rule_id`**: Foreign reference to the rule in the Brand Constitution (`rules` table) that defines the policy constraint.
- **`fact_id`**: Foreign reference to the verified institutional fact in the Evidence Ledger (`facts` table).
- **`severity`**: Determines impact on Health Score and whether the finding blocks the Approval Gate (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **`evidence_status`**: The verification state of the claim against the approved fact ledger (`SUPPORTED`, `CONTRADICTED`, `OUTDATED`, `NEEDS_REVIEW`, `UNSUPPORTED`).
- **`suggested_correction`**: An exact-span, neutral replacement string. When no safe replacement exists (e.g. unverified performance claims), this field is explicitly `null` to prevent introducing unverified claims.

---

## 2. Evidence Status Taxonomy

| Status | Mathematical & Logical Criteria | Health Score Impact | Approval Gate Impact |
| :--- | :--- | :--- | :--- |
| **`SUPPORTED`** | Direct semantic match to an approved fact where current timestamp `t` falls between `effective_from <= t <= valid_until`. | 0 penalty points (does not deduct from health score). | Does not block approval. |
| **`CONTRADICTED`** | Direct conflict with an exclusive approved fact (e.g., claiming "24/7 availability" when fact establishes business-hours-only operation). | -15 (HIGH) or -25 (CRITICAL) points. | **Hard Blocker** (returns HTTP 409). |
| **`OUTDATED`** | Match to an approved fact where current timestamp `t > valid_until`. | -15 (HIGH) points. | **Hard Blocker** (returns HTTP 409). |
| **`NEEDS_REVIEW`** | Match to a broad territorial claim (e.g., "across every region") where available evidence is narrower (e.g., "available in India") without an exclusivity clause. | -8 (MEDIUM) points. | Does not block approval unless elevated. |
| **`UNSUPPORTED`** | Factual or performance claim detected with zero matching approved facts in the institutional ledger. | -8 (MEDIUM) or -15 (HIGH) points. | Blocks approval if classified HIGH. |

---

## 3. Geographic Claim Classification Logic

A common failure mode in automated governance is flagging broad marketing claims as `CONTRADICTED` solely because the internal fact database only contains evidence for a single jurisdiction.

BRANDTRACE implements calibrated geographic classification:
1. **Narrow Evidence (Non-Exclusive):** If Fact `F-2026-01` confirms *"Available in India"*, a marketing draft stating *"Available across every region"* is classified as **`NEEDS_REVIEW`**, not `CONTRADICTED`. The engine recognizes that confirming availability in India does not refute availability elsewhere.
2. **Narrow Evidence (Explicitly Exclusive):** If Fact `F-2026-02` confirms *"Available only in India"*, the engine detects the exclusive constraint and correctly classifies *"Available across every region"* as **`CONTRADICTED`**.

This prevents false-positive alarms while catching genuine policy contradictions.

---

## 4. Exact-Span Replacement Integrity

To prevent text corruption when accepting corrections, BRANDTRACE enforces strict span replacement:
- If rule `R-VOICE-01` flags `"best"` in the draft `"our platform is the best choice"`, the finding passage is `"best"` and the suggested correction is `"effective"`.
- Executing `content.replace("best", "effective")` yields `"our platform is the effective choice"`.
- If the finding passage had erroneously been set to `"best"` with a suggested replacement of `"effective choice"`, accepting it would have generated `"our platform is the effective choice choice"` (word duplication).
- Every rule in `backend/app/governance.py` has been verified to enforce strict 1:1 span correspondence.
