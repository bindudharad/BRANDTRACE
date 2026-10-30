---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 28 — Approval Gate and Governance Workflow

## Purpose

This document explains the approval gating mechanism, high-risk blocking logic, role permissions, and administrative exceptions implemented in **BRANDTRACE** (`backend/app/main.py` lines 1453–1515).

---

## 1. The Governance Approval Gate

BRANDTRACE enforces hard architectural guardrails on enterprise marketing release workflows. A draft review cannot be marked as `APPROVED` or `WAIVED` while unresolved high-risk compliance violations remain unadjudicated.

### The Enforcement Endpoint

`POST /api/reviews/{review_id}/approval`

### Request Body Schema (`ApprovalAction`)
```json
{
  "action": "approve",       // Allowed: "approve" | "request_changes" | "waive"
  "reason": "Campaign launch approved after legal counsel sign-off." // Mandatory for "waive"
}
```

---

## 2. Hard Blocking Logic (`HTTP 409 Conflict`)

When an approval request is received, the backend inspects all findings linked to the draft:

```python
unresolved_high = [
    f for f in rev["findings"]
    if not f.get("disposition") and f.get("severity") in ("HIGH", "CRITICAL")
]

if payload.action in ("approve", "waive") and unresolved_high:
    unresolved_details = [f"'{f.get('passage', f['id'])}' ({f.get('type', 'rule')})" for f in unresolved_high]
    raise HTTPException(
        409,
        f"High-risk findings ({len(unresolved_high)} unresolved: {', '.join(unresolved_details)}) "
        f"must be resolved before approval or waiver."
    )
```

### Governance Enforcement Guarantees
1. **Zero Silent Approvals**: Drafts containing active `HIGH` or `CRITICAL` severity findings (such as prohibited superlatives, unapproved competitor comparisons, or expired claims) **cannot be approved**.
2. **Explicit Triage Required**: Every critical finding must be explicitly triaged via:
   - `ACCEPT`: Applying the suggested replacement to the draft content.
   - `DISMISS`: Formally recording why the passage is exempt, along with the dismisser's identity and justification.
   - Individual Finding `WAIVED`: Applying a documented administrative waiver to the specific finding.
3. **Mandatory Waiver Justification (`HTTP 422`)**: If a reviewer attempts a top-level review waiver (`action == "waive"`) without providing an explicit rationale, the server rejects the request with `HTTP 422 Unprocessable Entity`.

---

## 3. Role-Based Permissions (RBAC)

The approval gate strictly restricts execution to authoritative governance personas:

| Role | Permission | Response on `/approval` |
| :--- | :--- | :--- |
| `creator` | Draft author | `403 Forbidden` ("Reviewer or Brand Admin role required...") |
| `auditor` | Read-only compliance auditor | `403 Forbidden` ("Reviewer or Brand Admin role required...") |
| `reviewer` | Assigned content reviewer | **Permitted** (subject to 409 blocking rules) |
| `brand_admin` | Brand policy owner / executive | **Permitted** (subject to 409 blocking rules) |

---

## 4. Workflow Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Content Creator
    participant Review as Review Pipeline
    actor Reviewer as Compliance Reviewer
    participant Gate as Approval Gate (/approval)
    participant Audit as Audit Ledger

    Creator->>Review: Submit Marketing Draft
    Review-->>Review: Detect 1 HIGH Severity Superlative
    
    Reviewer->>Gate: POST /approval {action: "approve"}
    Gate-->>Reviewer: HTTP 409 Conflict (High-risk finding unresolved)
    
    Reviewer->>Review: POST /findings/{id}/actions {action: "ACCEPT"}
    Review-->>Review: Text remediated; finding resolved
    
    Reviewer->>Gate: POST /approval {action: "approve"}
    Gate->>Audit: Record REVIEW_APPROVED event
    Gate-->>Reviewer: HTTP 200 OK (Status: APPROVED)
```
