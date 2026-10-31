"""
Generator for BRANDTRACE Master Documentation Ecosystem (Category C: Docs 11 to 18).
"""
import os

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))
os.makedirs(DOCS_DIR, exist_ok=True)

docs = {}

# =============================================================================
# 11_SYSTEM_ARCHITECTURE.md
# =============================================================================
docs["11_SYSTEM_ARCHITECTURE.md"] = """# 11 — SYSTEM ARCHITECTURE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. High-Level Architecture Overview

BRANDTRACE is built as a modular, decoupled full-stack enterprise application. It strictly separates deterministic governance checks from downstream generative AI advisories.

```mermaid
flowchart TD
    Client["React 19 Frontend (Vite + TypeScript)"]
    API["FastAPI REST Application (Python 3.10)"]
    Auth["Role-Based Access Control & Workspace Guard"]
    GovEngine["Deterministic Governance Engine (DFA Regex)"]
    AIAdapter["AI Advisory Adapter (Optional Groq API)"]
    DocParser["Document Parsing Engine (pypdf & PIL)"]
    DB[(SQLAlchemy ORM Database: SQLite / PostgreSQL)]
    ReportLab["ReportLab PDF Compliance Dossier Engine"]

    Client -->|HTTPS / REST API| API
    API --> Auth
    Auth --> GovEngine
    Auth --> DocParser
    Auth --> DB
    GovEngine -->|Findings & Clearance Score| API
    GovEngine -.->|Optional Advisory Opt-In| AIAdapter
    API --> ReportLab
    ReportLab -->|Exported Dossier| Client
```

---

## 2. Core Subsystems

1. **Presentation Tier:** Built with React 19, TypeScript, and Vite. Implements static HTML prerendering for instantaneous first paint.
2. **API & Orchestration Tier:** FastAPI backend providing asynchronous ASGI endpoints, Pydantic data validation, and strict HTTP status contracts.
3. **Deterministic Governance Core:** Evaluates text against active Brand Constitution rules using pure-Python regex without external network calls.
4. **Data Persistence Tier:** SQLAlchemy abstraction layer supporting both local disposable SQLite engines and cloud-hosted PostgreSQL/Neon clusters.
5. **Compliance Exporter:** ReportLab engine dynamically compiling tamper-evident PDF dossiers with embedded cryptographic SHA-256 hashes.
"""

# =============================================================================
# 12_FRONTEND_ARCHITECTURE.md
# =============================================================================
docs["12_FRONTEND_ARCHITECTURE.md"] = """# 12 — FRONTEND ARCHITECTURE & DESIGN SYSTEM
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Technical Stack & Component Topology

- **Core Framework:** React 19 (`react`, `react-dom`)
- **Language:** TypeScript 5.7 (Strict mode enabled, 0 type errors)
- **Bundler & Tooling:** Vite 6.4.5 with static HTML prerender script (`scripts/prerender.ts`)
- **Iconography:** Lucide React
- **Visual Palette:** Light Enterprise Design System (Warm canvas `#F6F8F6`, forest green `#123B2D`, emerald `#0E9F78`)

```
src/
├── App.tsx                             # Top-level application router & theme wrapper
├── index.css                           # Enterprise design tokens & WCAG color variables
├── components/
│   ├── BrandtraceHero.tsx              # Public landing page & interactive SVG architecture map
│   ├── BrandtraceWorkspacePremium.tsx  # Central operational workspace (12 functional views)
│   ├── ContentReview/                  # Content Review modular extensions
│   │   ├── ExportEvidenceButton.tsx    # PDF / JSON compliance evidence exporter
│   │   ├── ReviewAssignmentModal.tsx   # Reviewer workload assignment dialog
│   │   └── ReviewCommentsPanel.tsx     # Collaborative reviewer discussion thread
│   ├── BrandConstitution/             # Brand Constitution modular extensions
│   │   ├── EvidenceSourceVault.tsx     # Centralized evidence registry & document hasher
│   │   ├── GuidelineImportModal.tsx    # Digital PDF guideline candidate importer
│   │   └── RuleConflictModal.tsx       # Deterministic rule conflict detector dialog
│   └── analytics/
│       └── QualityMetricsCards.tsx     # Governance quality telemetry dashboard
└── services/
    └── api.ts                          # Fully-typed HTTP client & backend SDK
```

---

## 2. View Routing & State Management

The operational workspace (`BrandtraceWorkspacePremium.tsx`) implements clean tab-based view switching across 12 primary views without heavy router overhead:
`'Overview'`, `'Brand Constitution'`, `'Content Review'`, `'Claim Ledger'`, `'Visual Compliance'`, `'Impact Map'`, `'Guideline Health'`, `'Review Queue'`, `'Audit History'`, `'Evidence Vault'`, `'Team Management'`, and `'Settings'`.
"""

# =============================================================================
# 13_BACKEND_ARCHITECTURE.md
# =============================================================================
docs["13_BACKEND_ARCHITECTURE.md"] = """# 13 — BACKEND ARCHITECTURE & REQUEST LIFECYCLE
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
"""

# =============================================================================
# 14_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md
# =============================================================================
docs["14_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md"] = """# 14 — DATABASE SCHEMA AND DATA DICTIONARY
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    WORKSPACES ||--o{ RULES : contains
    WORKSPACES ||--o{ FACTS : contains
    WORKSPACES ||--o{ REVIEWS : contains
    WORKSPACES ||--o{ BRAND_ASSETS : contains
    REVIEWS ||--o{ FINDINGS : generates
    REVIEWS ||--o{ REVIEW_VERSIONS : tracks
    REVIEWS ||--o{ AUDIT : logs
    REVIEWS ||--o{ REVIEW_COMMENTS : contains
    RULES ||--o{ RULE_VERSIONS : snapshots
    FACTS ||--o{ EVIDENCE_DEPENDENCIES : references
    REVIEWS ||--o{ EVIDENCE_DEPENDENCIES : links
    WORKSPACES ||--o{ GOVERNANCE_ALERTS : alerts

    REVIEWS {
        string id PK
        string workspace_id FK
        string title
        text content
        string status
        int score
        string priority
        string assigned_to
        string due_date
        string file_hash
        string created_at
    }

    FINDINGS {
        string id PK
        string review_id FK
        string category
        string type
        string severity
        string status
        string passage
        string suggested_correction
        string source_title
        string source_excerpt
        string disposition
        string disposition_reason
    }

    RULES {
        string id PK
        string workspace_id FK
        string title
        string category
        string kind
        string pattern
        string severity
        string version
        string status
        string expires_at
    }

    FACTS {
        string id PK
        string workspace_id FK
        string claim
        string value
        string owner
        string status
        string version
        string effective_at
        string expires_at
        text notes
    }
```

---

## 2. Table Inventory (All 16 Schema Tables)

1. `workspaces`: Multi-tenant organization boundaries.
2. `rules`: Brand Constitution policies across voice, terminology, and claims.
3. `rule_versions`: Immutable historical snapshots of modified rules.
4. `facts`: Corporate Claim Ledger entries with validity dates and owner attribution.
5. `reviews`: Content submissions with clearance scores and workflow states.
6. `findings`: Exact-span compliance violations linked to source rules and evidence.
7. `review_versions`: Content draft revision snapshots preserving author history.
8. `audit`: Append-only chronological event ledger with actor attribution.
9. `brand_assets`: Registered visual creative assets with SHA-256 binary hashes.
10. `brand_profiles`: Workspace brand design tokens and reference color palettes.
11. `rule_suggestions`: Telemetry-generated clarification proposals requiring admin gate.
12. `evidence_dependencies`: Bi-directional mapping between reviews, facts, and rules.
13. `guideline_candidate_rules`: Digital PDF extracted candidate rules awaiting approval.
14. `review_comments`: Collaborative reviewer discussion notes.
15. `governance_alerts`: Deduplicated proactive expiry notifications.
16. `governance_jobs`: Background worker execution tracking and retry ledger.
"""

# =============================================================================
# 15_DATABASE_MIGRATIONS_AND_PERSISTENCE.md
# =============================================================================
docs["15_DATABASE_MIGRATIONS_AND_PERSISTENCE.md"] = """# 15 — DATABASE MIGRATIONS AND PERSISTENCE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Dual-Dialect Persistence Engine

BRANDTRACE employs a dual-dialect architecture designed for frictionless local development and enterprise cloud deployments:
- **Local Development & Testing:** Isolated SQLite 3 engines with in-memory or disposable file-backed databases.
- **Hosted Cloud Deployment:** PostgreSQL / Neon Serverless DB via psycopg3 and SQLAlchemy connection pooling.

---

## 2. Idempotent Schema Initialization

Rather than relying on fragile manual migration scripts, schema synchronization is managed via `init_db()` in `backend/app/models.py`:
- All 16 tables are created using `CREATE TABLE IF NOT EXISTS`.
- Column additions are guarded with schema inspection checks.
- Default Brand Constitution rules and Claim Ledger facts are seeded using dialect-safe `ON CONFLICT DO NOTHING` statements.
- Verified in `backend/tests/test_postgresql_compatibility.py`.
"""

# =============================================================================
# 16_API_REFERENCE.md
# =============================================================================
docs["16_API_REFERENCE.md"] = """# 16 — API ENDPOINT SPECIFICATION
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## Core Operational Endpoints

| Method | Endpoint | Description | Auth Role | Status Codes |
|---|---|---|---|:---:|
| `GET` | `/api/health` | Service health check | Anonymous | 200 |
| `GET` | `/api/ready` | Database readiness & dialect probe | Anonymous | 200, 503 |
| `POST` | `/api/rules` | Create brand constitution rule | `brand_admin` | 201, 403, 422 |
| `GET` | `/api/rules` | List brand constitution rules | Any | 200 |
| `GET` | `/api/rules/{id}/versions` | Get rule version history | Any | 200, 404 |
| `POST` | `/api/facts` | Create corporate claim fact | `brand_admin` | 201, 403, 422 |
| `GET` | `/api/facts` | List corporate claim facts | Any | 200 |
| `POST` | `/api/reviews` | Submit document draft for review | Any | 201, 422 |
| `GET` | `/api/reviews/{id}` | Get review with findings & history | Any | 200, 404 |
| `POST` | `/api/reviews/{id}/findings/{fid}/actions` | Apply exact-span edit or dismissal | `reviewer` | 200, 404, 422 |
| `POST` | `/api/reviews/{id}/approval` | Final compliance approval gate | `brand_admin` | 200, 403, 409 |
| `GET` | `/api/reviews/{id}/export-evidence` | Export compliance packet (PDF/JSON)| Any | 200, 404 |
| `GET` | `/api/governance/impact-map` | Fetch claim & rule dependency map | Any | 200 |
| `POST` | `/api/governance/re-review-impact` | Trigger targeted re-review | `brand_admin` | 200, 403 |
| `POST` | `/api/brand-assets/analyze` | Image color palette & contrast | Any | 200, 422 |
| `GET` | `/api/brand-assets/{id}/similarity` | 64-bit dHash perceptual similarity | Any | 200, 404 |
| `POST` | `/api/constitution/import-guidelines`| Ingest digital guideline PDF | `brand_admin` | 201, 403 |
| `POST` | `/api/constitution/candidates/{id}/approve` | Approve guideline candidate | `brand_admin` | 200, 403 |
| `GET` | `/api/constitution/conflicts` | Detect rule contradictions | Any | 200 |
| `POST` | `/api/governance/expiry-worker/trigger` | Execute proactive expiry scan | `brand_admin` | 200, 403 |
"""

# =============================================================================
# 17_API_INTEGRATION_AND_DATA_FLOW.md
# =============================================================================
docs["17_API_INTEGRATION_AND_DATA_FLOW.md"] = """# 17 — API INTEGRATION AND CLIENT DATA FLOW
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
"""

# =============================================================================
# 18_PROJECT_DIRECTORY_STRUCTURE.md
# =============================================================================
docs["18_PROJECT_DIRECTORY_STRUCTURE.md"] = """# 18 — PROJECT DIRECTORY STRUCTURE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

```
BRANDTRACE/
├── backend/                            # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py                     # API router & endpoints
│   │   ├── models.py                   # SQLAlchemy models & init_db
│   │   ├── schemas.py                  # Pydantic request/response schemas
│   │   ├── governance.py               # Deterministic rule evaluation
│   │   ├── image_analyzer.py           # Visual compliance & color science
│   │   ├── pdf_parser.py               # PDF document text extraction
│   │   ├── ai_adapter.py               # Optional Groq AI adapter
│   │   └── services/                   # Enterprise service modules
│   │       ├── guideline_importer.py   # Guideline PDF rule extractor
│   │       ├── compliance_exporter.py  # ReportLab PDF/JSON dossier exporter
│   │       ├── rule_conflict_detector.py # Deterministic conflict detector
│   │       ├── expiry_monitor.py       # Expiry worker & re-review task engine
│   │       └── visual_intelligence.py  # 64-bit dHash & logo clearspace
│   ├── tests/                          # 25 automated Pytest suites (190 passing)
│   │   ├── test_mandatory_e2e_journey.py # 22-step enterprise simulation
│   │   ├── test_round3_advanced_capabilities.py # Visual & expiry tests
│   │   └── test_enterprise_features_round3.py   # Enterprise capabilities
│   └── requirements.txt                # Python package dependencies
├── src/                                # React 19 + TypeScript Frontend
│   ├── App.tsx                         # Root router & theme provider
│   ├── index.css                       # Enterprise design system & tokens
│   ├── components/                     # Workspace views & UI modals
│   └── services/api.ts                 # Typed backend API client
├── docs/                               # 48 Comprehensive Technical Markdown Specs
├── scripts/                            # Operational & QA test runners
│   ├── run_isolated_browser_qa.py      # Playwright 32-scenario browser QA
│   ├── verify_sqlite_regression.py     # SQLite regression suite runner
│   ├── smoke_test.py                   # API smoke test runner
│   └── prerender.ts                    # Vite static HTML prerenderer
├── package.json                        # Node dependencies & build scripts
├── vite.config.ts                      # Vite build configuration
└── README.md                           # Master GitHub landing page
```
"""

for fname, content in docs.items():
    fpath = os.path.join(DOCS_DIR, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Generated: {fname}")
