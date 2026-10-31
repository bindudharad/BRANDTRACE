# 13 — BACKEND ARCHITECTURE & REQUEST LIFECYCLE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Request Lifecycle Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / Browser
    participant Gateway as FastAPI Router
    participant Auth as RBAC & Workspace Dependency
    participant Engine as Governance Engine
    participant DB as SQLite / PostgreSQL

    User->>Gateway: POST /api/reviews {title, content, type}
    Gateway->>Auth: Validate X-Demo-Role & X-Workspace-Id
    Auth-->>Gateway: AuthContext {role, actor, workspace_id}
    Gateway->>Engine: evaluate_content_rules(content, workspace_id)
    Engine->>DB: Fetch active rules & approved facts
    DB-->>Engine: Rules & Facts records
    Engine->>Engine: Execute DFA Regex & Token Matching
    Engine-->>Gateway: Deterministic findings & clearance score
    Gateway->>DB: Insert review, findings, version, and audit records
    DB-->>Gateway: Commit transaction
    Gateway-->>User: HTTP 201 Created (Review & Findings payload)
```

---

## 2. Service Layer Organization

```
backend/app/
├── main.py                             # FastAPI application entry point & route definitions
├── models.py                           # SQLAlchemy metadata, schema definitions, and helpers
├── schemas.py                          # Pydantic v2 validation models & request/response contracts
├── governance.py                       # Core deterministic rule evaluation engine
├── image_analyzer.py                   # Multimodal visual analysis, Delta-E & WCAG contrast
├── pdf_parser.py                       # Digital PDF extraction via pypdf
├── ai_adapter.py                       # Downstream AI provider adapter (Groq API)
└── services/
    ├── guideline_importer.py           # Digital guideline PDF extraction & candidate rules
    ├── compliance_exporter.py          # Downloadable PDF & JSON compliance evidence dossiers
    ├── rule_conflict_detector.py       # Deterministic rule contradiction & overlap detection
    ├── expiry_monitor.py               # Multi-interval lookahead worker & re-review task engine
    └── visual_intelligence.py          # 64-bit dHash perceptual hashing & logo clearspace
```
