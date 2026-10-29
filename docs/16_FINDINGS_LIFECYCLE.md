# The Findings Lifecycle and Disposition States

## Overview of Findings

A **Finding** is the foundational unit of compliance feedback in BRANDTRACE. It represents a discrete, actionable issue detected within a review draft, ranging from prohibited brand vocabulary to unsupported geographical claims or WCAG color contrast violations.

Findings are not transient UI popups; they are stateful database records with rigorous lifecycle states, role-gated disposition actions, and direct influence over the draft's Governance Clearance Health Score.

```
                    [ Submission / Re-analysis ]
                                 |
                                 v
                     [ State: OPEN (disposition: NULL) ]
                     - Penalizes health score
                     - Blocks approval if HIGH/CRITICAL
                                 |
        +------------------------+------------------------+
        |                        |                        |
        v                        v                        v
 [ ACCEPTED_EDIT / EDITED ]   [ DISMISSED ]         [ ESCALATED ]
 - Replaces draft text        - Exception granted   - Requires senior review
 - Creates new version        - Mandatory reason    - Stays unresolved
 - Restores health score      - Restores score      - Continues to penalize
```

---

## Finding Creation

Findings are instantiated during the execution of `run_governance_analysis()` in `backend/app/governance.py`. Whenever a review draft is submitted via `POST /api/reviews`, uploaded via `POST /api/reviews/upload`, or restored from version history, existing findings for that draft are purged and regenerated to reflect the current state of the working copy.

Each generated finding is assigned:
* A unique primary key (`finding_<hex>`).
* A severity tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
* An evidentiary status (`SUPPORTED`, `CONTRADICTED`, `OUTDATED`, `UNSUPPORTED_BY_APPROVED_EVIDENCE`, `NEEDS_REVIEW`).
* An initial disposition of `NULL` (Open).

---

## Severity Levels and Governance Implications

The severity of a finding governs its impact on readiness scores and approval workflows:

| Severity | Score Deduction | Approval Blocker? | Operational Meaning |
| :--- | :---: | :---: | :--- |
| **`CRITICAL`** | -30 points | **YES (Hard Gate)** | Severe regulatory violation, legal liability, or gross brand policy breach. |
| **`HIGH`** | -18 points | **YES (Hard Gate)** | Prohibited phrase, unsubstantiated claim, expired evidentiary source, or missing mandatory legal term. |
| **`MEDIUM`** | -10 points | No | Minor voice inconsistency, questionable promotional phrasing, or weak WCAG contrast. |
| **`LOW`** | -4 points | No | Informational finding, verified fact alignment, or minor style recommendation. |

---

## Finding Dispositions and State Transitions

Users interact with findings through `POST /api/reviews/{id}/findings/{fid}/actions`, selecting one of four actions:

### 1. `accept` $\to$ Disposition: `ACCEPTED_EDIT`
* **Trigger**: Author or reviewer accepts the automated `suggested_correction`.
* **Behavior**: The server replaces the exact matching `passage` in the draft content with `suggested_correction`.
* **Side Effects**: Saves a new version in `review_versions`, logs an audit entry, clears the score penalty, and transitions disposition to `ACCEPTED_EDIT`.

### 2. `edit` $\to$ Disposition: `EDITED`
* **Trigger**: Reviewer supplies a custom manual replacement string.
* **Behavior**: Replaces the passage with the clean replacement.
* **Validation Guards**: Enforces that replacement does not equal reason (`Guard 1`), does not contain QA prefixes (`Guard 2`), and includes required terms if resolving a missing-phrase finding (`Guard 3`).
* **Side Effects**: Saves version snapshot, logs audit entry, and restores score.

### 3. `dismiss` $\to$ Disposition: `DISMISSED`
* **Trigger**: Reviewer determines the finding is an authorized contextual exception (e.g., quoting a third-party review or parody).
* **Role Check**: Contributors are forbidden from dismissing findings (`HTTP 403`).
* **Mandatory Justification**: Requires non-empty `reason` string (`HTTP 422` if omitted).
* **Behavior**: Draft text is unchanged. Score penalty is restored. The underlying evidence status (e.g., `CONTRADICTED`) remains permanently recorded for compliance audits.

### 4. `escalate` $\to$ Disposition: `ESCALATED`
* **Trigger**: Reviewer determines the issue requires senior brand or legal sign-off.
* **Health Score Semantics**: **`ESCALATED` findings remain in `UNRESOLVED_DISPOSITIONS`**. The score deduction is NOT restored, ensuring that escalating an issue does not artificially inflate readiness scores.
* **Approval Impact**: If the finding has `HIGH` or `CRITICAL` severity, escalation alone does NOT allow approval; a definitive waiver or edit is still required.

---

## Dynamic Re-Evaluation After Edits

When draft copy is updated via finding actions, the backend automatically cross-checks other findings on the draft:
* If a reviewer edits copy and includes a previously missing required term (e.g., adding "Brandtrace"), the backend locates all open `required_phrase` findings for that term on the draft and automatically updates them to `status = 'SUPPORTED'` and `disposition = 'ACCEPTED_EDIT'`.
* This dynamic re-evaluation prevents authors from having to manually resolve secondary findings that have already been addressed in the text.
