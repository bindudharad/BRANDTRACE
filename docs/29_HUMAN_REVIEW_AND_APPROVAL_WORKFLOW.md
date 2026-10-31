# 29 — HUMAN REVIEW & APPROVAL WORKFLOW
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
