---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 04 — System Architecture

## Purpose

This document details the high-level system architecture of **BRANDTRACE**, illustrating component boundaries, API communication protocols, processing pipelines, dual-database abstractions, and deployment topology.

---

## High-Level System Architecture

BRANDTRACE follows a decoupled client-server architecture. The frontend is a single-page application built on React 19, TypeScript, and Three.js, communicating over a structured REST API to a Python 3.10+ FastAPI backend.

```mermaid
graph TD
    subgraph Client Layer ["Client Tier (Browser)"]
        UI["React 19 SPA (Vite 6.2)"]
        Three["Three.js 3D Evidence Core"]
        JudgeModal["Judge Access & Tour Center"]
        APIClient["API Service Layer (src/services/api.ts)"]
        UI --> APIClient
        Three --> UI
        JudgeModal --> UI
    end

    subgraph Gateway Layer ["API Gateway & Security Tier"]
        FastAPI["FastAPI 0.115 ASGI Application"]
        CORS["CORSMiddleware (Origin Verification)"]
        AuthMiddleware["Auth & Simulated Role Parser"]
        WorkspaceGuard["Workspace Scope Validator"]
        FastAPI --> CORS
        CORS --> AuthMiddleware
        AuthMiddleware --> WorkspaceGuard
    end

    subgraph Service Layer ["Core Engine & Processing Tier"]
        GovEngine["Deterministic Rule Engine (governance.py)"]
        PDFEngine["Digital PDF Text Extractor (pdf_parser.py)"]
        ImgEngine["Color & Asset Analyzer (image_analyzer.py)"]
        ImpactEngine["Claim Impact Map (impact_map.py)"]
        HealthEngine["Guideline Health Telemetry (guideline_health.py)"]
        WorkspaceGuard --> GovEngine
        WorkspaceGuard --> PDFEngine
        WorkspaceGuard --> ImgEngine
        WorkspaceGuard --> ImpactEngine
        WorkspaceGuard --> HealthEngine
    end

    subgraph Persistence Layer ["Storage & Database Tier"]
        DBBridge["SQLAlchemy 2.0 Abstract Dialect Bridge"]
        SQLite["Local SQLite 3 (brandtrace.db)"]
        Neon["Hosted Neon PostgreSQL (Production/Staging)"]
        GovEngine & ImgEngine & ImpactEngine & HealthEngine --> DBBridge
        DBBridge -->|Local Dev & Tests| SQLite
        DBBridge -->|Hosted Staging| Neon
    end

    APIClient -->|HTTP REST JSON / Multipart| FastAPI
```

---

## Component Responsibilities

### 1. Client Tier
- **Single Page Application:** Rendered via React 19 with Tailwind CSS v4 styling. Manages client-side navigation between the public landing page (`BrandtraceHero.tsx`) and the operational governance command center (`BrandtraceWorkspacePremium.tsx`).
- **Interactive 3D Evidence Core:** Built using Three.js (`EvidenceCore3D.tsx`). Implements an interactive 3D faceted Glass Icosahedron with 6 orbiting module satellites, raycasting selection, and an SVG fallback for environments lacking WebGL support.
- **Unified API Client:** Implemented in `src/services/api.ts`. Enforces header injection (`X-Demo-Role`, `X-Demo-Actor`, `X-Workspace-Id`), handles multipart file streams, and translates HTTP error statuses.

### 2. API Gateway & Security Tier
- **FastAPI Framework:** Handles asynchronous HTTP requests via Pydantic v2 data models.
- **Authentication & Role Context:** Evaluates caller identity. In production mode (`AUTH_MODE=strict`), verifies Bearer tokens and API keys against `workspace_members`. In local demonstration mode (`AUTH_MODE=demo`), parses simulated demo headers (`X-Demo-Role`) while preserving server-side access controls.
- **Tenant Scope Enforcement:** Injects `workspace_id` into all service layer calls. Prevents cross-workspace asset leakage, review access, or rule modification.

### 3. Service Layer
- **`governance.py`:** Central deterministic evaluation pipeline. Normalizes input text, executes regular expressions, measures character offsets, and cross-references active claims in the Claim Ledger.
- **`image_analyzer.py`:** Computes SHA-256 byte hashes, queries the `brand_assets` registry, extracts dominant colors via Pillow, and calculates CIELAB Delta-E (CIE76) distances against approved hex values.
- **`pdf_parser.py`:** Ingests digital PDF streams using `pypdf`, extracts UTF-8 text layers, rejects corrupted or encrypted payloads, and logs extraction warnings.
- **`impact_map.py`:** Traverses `evidence_dependencies` to identify which reviews depend on expired or modified facts.
- **`guideline_health.py`:** Aggregates reviewer friction (acceptances, dismissals, manual edits) across rules to surface statistical divergence and human-reviewable clarification suggestions.

### 4. Persistence Layer
- **Dual-Dialect SQLAlchemy Bridge:** Database access is abstracted through `backend/app/models.py`. The connection pool automatically normalizes `postgres://` connection strings to `postgresql://`, detects dialect capabilities, and compiles dialect-safe SQL syntax (e.g., SQLite `INSERT OR REPLACE` vs. PostgreSQL `ON CONFLICT DO UPDATE`).

---

## Data Flow: Content Review & Approval Gate

```mermaid
sequenceDiagram
    autonumber
    actor Reviewer as Compliance Reviewer
    participant Client as React Frontend
    participant API as FastAPI Gateway
    participant Engine as Deterministic Engine
    participant DB as Database (15 Tables)

    Reviewer->>Client: Submit Content Draft
    Client->>API: POST /api/reviews {title, content, workspace_id}
    API->>DB: Fetch Active Rules & Valid Facts (workspace_id)
    DB-->>API: Active Rules & Claim Set
    API->>Engine: Run Deterministic Pattern Matching
    Engine-->>API: Findings with Exact Spans & Citations
    API->>DB: Store Review, Findings, Dependencies
    API-->>Client: HTTP 201 Created (Review + Findings)
    
    Reviewer->>Client: Remediate / Dismiss Findings
    Client->>API: POST /api/reviews/{id}/findings/{f_id}/actions {action, reason}
    API->>DB: Update Finding Disposition & Record Version Snapshot
    API-->>Client: HTTP 200 OK (Updated Score)

    Reviewer->>Client: Click 'Approve Content'
    Client->>API: POST /api/reviews/{id}/approval {action: 'APPROVE'}
    alt High or Critical Findings Remain Unresolved
        API-->>Client: HTTP 409 Conflict (Approval Blocked)
    else All High/Critical Resolved
        API->>DB: Set Review Status = APPROVED & Append Audit Event
        API-->>Client: HTTP 200 OK (Approved & Signed Off)
    end
```

---

## Deployment & Hosting Topology

- **Frontend:** Hosted on **Vercel** via automated GitHub Git Integration on the `main` branch. Static assets are prerendered and served via Vercel's global Edge Network.
- **Backend:** Python FastAPI application executed via Uvicorn ASGI runner.
- **Database:** Hosted serverless **Neon PostgreSQL** database connected over secure TLS with connection pooling.

---

## Related Documentation

- [05 — Technology Stack](./05_TECHNOLOGY_STACK.md)
- [06 — Frontend Architecture](./06_FRONTEND_ARCHITECTURE.md)
- [07 — Backend Architecture](./07_BACKEND_ARCHITECTURE.md)
- [10 — Database Schema](./10_DATABASE_SCHEMA.md)
- [28 — Approval Gate and Governance Workflow](./28_APPROVAL_GATE_AND_GOVERNANCE_WORKFLOW.md)
