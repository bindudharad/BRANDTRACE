# The Approval Workflow and Governance Gate

## Overview of the Approval Process

In enterprise brand management, sign-off is a legally binding milestone. Approving a marketing asset certifies that claims are substantiated, legal disclaimers are present, and brand voice guidelines are satisfied.

BRANDTRACE enforces a **server-side approval gate** that prevents unauthorized, accidental, or non-compliant sign-offs. Even if a user attempts to bypass frontend controls via direct curl commands or custom scripts, the backend strictly rejects approvals whenever unresolved high-risk findings exist.

```
                              [ Draft: IN_REVIEW ]
                                       |
                +----------------------+----------------------+
                |                      |                      |
                v                      v                      v
     [ ACTION: request_changes ]   [ ACTION: approve ]    [ ACTION: waive ]
     - State -> CHANGES_REQUESTED  - Unresolved HIGH?     - Unresolved HIGH?
     - Author must revise copy       YES: HTTP 409 BLOCK    YES: HTTP 409 BLOCK
                                     NO: State -> APPROVED  NO: (Requires Reason)
                                                            State -> WAIVED
```

---

## Review Status State Transitions

A review draft resides in one of four operational states (`reviews.status`):

| Review State | Meaning | Permitted Next Actions |
| :--- | :--- | :--- |
| **`IN_REVIEW`** | Active working draft under evaluation | `approve`, `request_changes`, `waive` |
| **`CHANGES_REQUESTED`** | Reviewer rejected draft; author revision required | Author edits content; re-enters evaluation |
| **`APPROVED`** | Final compliance sign-off granted | Terminal state; ready for publication export |
| **`WAIVED`** | Approved with documented administrative exception | Terminal state; authorized exception logged |

---

## The Server-Side Approval Gate (HTTP 409 Conflict)

The approval endpoint (`POST /api/reviews/{id}/approval`) enforces strict policy gates:

```python
# Extract any unresolved HIGH or CRITICAL findings
unresolved_high = [
    f for f in rev["findings"]
    if not f.get("disposition") and f.get("severity") in ("HIGH", "CRITICAL")
]

if payload.action in ("approve", "waive") and unresolved_high:
    unresolved_details = [
        f"'{f.get('passage', f['id'])}' ({f.get('type', 'rule')})"
        for f in unresolved_high
    ]
    raise HTTPException(
        409,
        f"High-risk findings ({len(unresolved_high)} unresolved: {', '.join(unresolved_details)}) "
        f"must be resolved before approval or waiver.",
    )
```

### Why the Gate is Inviolable
* **No UI-Only Checks**: The validation executes on the database query inside the backend route. Modifying client-side JavaScript or disabling HTML buttons cannot bypass the check.
* **Deterministic Protection**: A draft containing an unresolved superlative ("best"), a missing mandatory term ("Brandtrace"), or an expired clinical claim cannot transition to `APPROVED`.
* **Explicit Diagnostic Feedback**: The `HTTP 409` response returns the exact list of unresolved passages and rule types, guiding the reviewer directly to the blocking items.

---

## Role-Based Sign-Off Permissions

Not all platform users possess approval authority:

* **Contributors (`contributor`)**: Barred from approval actions (`HTTP 403 Forbidden`). Contributors submit drafts and propose edits, but cannot approve their own work.
* **Auditors (`auditor`)**: Barred from approval actions (`HTTP 403 Forbidden`). Auditors maintain read-only inspection access.
* **Reviewers (`reviewer`) & Brand Admins (`brand_admin`)**: Fully authorized to execute `approve`, `request_changes`, and `waive` actions.

---

## The Waiver Workflow (`action: "waive"`)

In real-world business scenarios, marketing leadership may decide to accept an unresolved low- or medium-risk finding due to pressing business context (e.g., a time-sensitive press release referencing a secondary terminology issue).

### Waiver Safeguards
1. **Mandatory Justification**: The API requires `payload.reason`. Omitting the reason raises `HTTP 422 Unprocessable`.
2. **High-Risk Block**: A waiver **cannot bypass open `HIGH` or `CRITICAL` findings**. High-risk findings must be individually resolved (via edit or individual finding dismissal with specific rationale) before the review can be waived.
3. **Audit Trail Accountability**: When a waiver executes, the audit table permanently logs `APPROVAL_WAIVE` alongside the authorizer's identity, active role, and justification string.

---

## Requesting Changes (`action: "request_changes"`)

When a draft contains fundamental flaws that cannot be addressed via quick finding corrections, reviewers invoke `request_changes`:
* Draft status immediately transitions to `CHANGES_REQUESTED`.
* The reviewer supplies feedback in `payload.reason`.
* An audit event `APPROVAL_REQUEST_CHANGES` is logged.
* The original author receives clear guidance to rework the copy and re-submit.
