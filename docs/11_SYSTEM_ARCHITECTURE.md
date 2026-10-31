# 11 — SYSTEM ARCHITECTURE
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
