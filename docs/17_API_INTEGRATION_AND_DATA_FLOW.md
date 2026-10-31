# 17 — API INTEGRATION AND CLIENT DATA FLOW
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Client SDK Architecture

All frontend-to-backend communication is channeled through `src/services/api.ts`. The client provides:
- Automatic header injection: `X-Demo-Role` and `X-Workspace-Id`.
- Unified error parsing: Formats FastAPI HTTP 422 and 409 errors into user-friendly notifications.
- Typed response payloads: TypeScript interfaces mirror backend Pydantic models.

---

## 2. Finding Action Data Flow

```mermaid
sequenceDiagram
    actor Reviewer as Compliance Reviewer
    participant Client as Frontend (api.ts)
    participant API as FastAPI Server
    participant Engine as Finding Action Service
    participant DB as Database

    Reviewer->>Client: Click 'Accept Replacement'
    Client->>API: POST /api/reviews/{id}/findings/{fid}/actions {action: 'accept', replacement: 'effective'}
    API->>Engine: validate_and_apply_edit(review_id, finding_id, replacement)
    Engine->>Engine: Run Anti-Contamination Guards (Check reason text & QA metadata)
    Engine->>DB: Update reviews.content with exact-span replacement
    Engine->>DB: Insert review_versions snapshot
    Engine->>DB: Update findings.disposition = 'ACCEPTED_EDIT'
    Engine->>DB: Recalculate clearance score
    Engine->>DB: Append audit event FINDING_RESOLVED
    DB-->>API: Transaction committed
    API-->>Client: Updated Review payload (Score: 100)
    Client-->>Reviewer: Rerender review panel & clear violation highlight
```
