# BRANDTRACE System Architecture

## Architectural Overview

BRANDTRACE is architected as a decoupled, evidence-driven client-server platform designed for high determinism, audit verifiability, and zero cloud dependency during standard operation. The architecture strictly segregates deterministic rule processing from optional external AI services, ensuring that core governance workflows remain functional and reproducible in air-gapped or offline enterprise environments.

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 19 / Vite 6)"]
        UI["Workspace UI (BrandtraceWorkspacePremium)"]
        Hero["BrandtraceHero & 3D Prism"]
        APIClient["API Service Layer (api.ts)"]
        State["React Component State (Hooks)"]
        UI --> APIClient
        Hero --> UI
        State <--> UI
    end

    subgraph Backend["FastAPI Backend Application"]
        Router["API Router (main.py)"]
        Guards["Data Integrity & Role Guards"]
        GovEngine["Governance Engine (governance.py)"]
        Impact["Impact Engine (impact_map.py)"]
        ColorSci["Color Science & Visual (color_science.py)"]
        ImgPillow["Image Analyzer (image_analyzer.py)"]
        PDFParser["PDF Text Parser (pdf_parser.py)"]
        AIAdapter["AI Adapter (ai_adapter.py)"]
        
        Router --> Guards
        Guards --> GovEngine
        GovEngine --> AIAdapter
        GovEngine --> ColorSci
        Router --> ImgPillow
        Router --> PDFParser
        Router --> Impact
    end

    subgraph Storage["Persistence Layer (SQLAlchemy 2.0)"]
        DB[("SQLite / PostgreSQL Database")]
        ReviewsTable[("reviews / review_versions")]
        FindingsTable[("findings")]
        RulesTable[("rules")]
        FactsTable[("facts")]
        AuditTable[("audit")]
        
        DB --- ReviewsTable
        DB --- FindingsTable
        DB --- RulesTable
        DB --- FactsTable
        DB --- AuditTable
    end

    subgraph External["Optional External Services"]
        GeminiAPI["Google Gemini AI (gemini-1.5-flash)"]
    end

    APIClient <-->|REST / JSON (Port 8000)| Router
    GovEngine <--> Storage
    Impact <--> Storage
    Router <--> Storage
    AIAdapter -.->|If AI_PROVIDER=gemini| GeminiAPI
```

---

## Component Responsibilities

The system is organized into modular subsystems with clearly demarcated responsibilities:

### 1. Presentation Tier (Frontend Client)
* **Application Shell (`App.tsx`, `main.tsx`)**: Controls top-level navigation, workspace routing, theme application, and simulated role management.
* **Workspace Interface (`BrandtraceWorkspacePremium.tsx`)**: Houses the primary draft editor, findings inspection cards, governance score gauge, version timeline, and audit history logs.
* **Evidence Prism (`EvidencePrism.tsx`)**: Integrates Three.js 0.186 to deliver a hardware-accelerated 3D visual metaphor representing evidentiary refraction and confidence states.
* **API Service (`src/services/api.ts`)**: Centralizes typed asynchronous HTTP interactions using `fetch`, automatically injecting role simulation headers (`X-Demo-Role`, `X-Demo-Actor`).

### 2. Application & Ingestion Tier (FastAPI Gateway)
* **Gateway & Endpoints (`backend/app/main.py`)**: Defines 20+ REST endpoints, handles multipart file uploads, parses JSON payloads via Pydantic v2 schemas, and applies defensive validation guards.
* **Document Extraction (`backend/app/pdf_parser.py`)**: Interfaces with `pypdf` to extract raw text streams from uploaded PDF documents while enforcing strict safety checks against corrupt, encrypted, or zero-byte files.
* **Visual & Accessibility Processing (`backend/app/image_analyzer.py` & `color_science.py`)**: Uses Pillow to extract image palettes, calculates W3C relative luminance, computes WCAG contrast ratios, and evaluates CIELAB Delta-E color distance against brand tokens.

### 3. Business Logic & Governance Tier
* **Unified Governance Engine (`backend/app/governance.py`)**: Coordinates the sequential analysis pipeline:
  1. Executes deterministic pattern matching against active brand rules.
  2. Evaluates the active fact ledger to verify claim presence and expiration.
  3. Dispatches text to the AI adapter for nuanced tone and promotional triage.
  4. Persists findings, calculates the governance health score, and updates draft status.
* **AI Adapter Abstraction (`backend/app/ai_adapter.py`)**: Implements the `BaseAIProvider` interface. Dispatches to `OfflineProvider` (local regex and heuristic heuristics) or `GeminiProvider` (Google Gemini 1.5 Flash via REST), strictly verifying that all citations correspond to actual database records.
* **Claim Impact Engine (`backend/app/impact_map.py`)**: Evaluates temporal dependencies across historical reviews, determining which approved drafts are invalidated when an underlying rule or fact expires or updates.

### 4. Persistence Tier (`backend/app/models.py`)
* **SQLAlchemy 2.0 Abstraction**: Manages connection pooling and dynamic query formatting.
* **Idempotent Migration Engine**: Initializes schema tables (`workspaces`, `rules`, `facts`, `reviews`, `review_versions`, `findings`, `audit`, `brand_profiles`) and dynamically executes safe `ALTER TABLE` statements when columns are added.

---

## End-to-End Data Flow

The lifecycle of a review submission proceeds through four distinct operational phases:

```
[ Ingestion Phase ] ---> [ Analysis Phase ] ---> [ Interaction Phase ] ---> [ Resolution Phase ]
Raw text or file         Deterministic match,   Author edits,          Role approval,
stream parsed to         Fact verification,     Finding disposition,   HTTP 409 gate check,
standard review draft    Health score compute   Version snapshotting   Audit entry recorded
```

1. **Ingestion**: The client posts content to `/api/reviews` (or multipart files to `/api/reviews/upload`). Uploaded files pass through `pdf_parser` or `image_analyzer` to produce standard review records.
2. **Analysis**: `run_governance_analysis()` executes in `governance.py`. It clears prior findings, iterates through active rules/facts, queries the AI provider, calculates the health score (`100 - penalties`), and writes findings to the database.
3. **Disposition**: Reviewers act on findings via `/api/reviews/{id}/findings/{id}/actions`. The server verifies role permissions, enforces anti-tampering guards, updates the draft text, snapshots a new version in `review_versions`, logs an audit entry, and recalculates the health score.
4. **Approval Gate**: A reviewer requests draft approval via `/api/reviews/{id}/approval`. The server inspects the database: if any unresolved `HIGH` or `CRITICAL` findings remain, it rejects the request with an `HTTP 409 Conflict`. Otherwise, the status transitions to `APPROVED`, and an immutable sign-off record is written to `audit`.

---

## Module Dependency Graph

The backend enforces a strict directed dependency hierarchy to prevent circular imports:

```
          [ config.py ]
               ^
               |
          [ models.py ] <---------+
          ^          ^             |
          |          |             |
   [ color_science ] |             |
          ^          |             |
          |          |             |
  [ image_analyzer ] |             |
          ^          |             |
          |          |             |
          +----+-----+             |
               |                   |
        [ ai_adapter ]             |
               ^                   |
               |                   |
        [ governance ]       [ impact_map ]
               ^                   ^
               |                   |
               +---------+---------+
                         |
                    [ main.py ]
```

* `config.py`: Foundational constants, database URL normalization, limits.
* `models.py`: Database engine, connection context manager, table schemas.
* `color_science.py`: Standalone math for luminance, contrast, CIELAB.
* `image_analyzer.py`: Pillow image processing, depends on `color_science.py`.
* `ai_adapter.py`: Provider classes, depends on `models.py`.
* `governance.py`: Core rule orchestration, depends on `models.py` and `ai_adapter.py`.
* `impact_map.py`: Dependency graph analysis, depends on `models.py`.
* `main.py`: Top-level FastAPI application importing all service modules.
