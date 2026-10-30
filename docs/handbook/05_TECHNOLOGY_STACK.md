---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 05 — Technology Stack

## Purpose

This document provides a verified, comprehensive inventory of all runtime frameworks, programming languages, libraries, build tools, and dependencies utilized across the **BRANDTRACE** codebase.

---

## Core Technology Matrix

| Layer | Technology | Verified Version | Purpose & Rationale |
| :--- | :--- | :---: | :--- |
| **Frontend Framework** | React | `19.0.1` | Core client-side component framework and concurrent rendering engine. |
| **Frontend Language** | TypeScript | `~5.8.2` | Strong static typing for API contracts, component props, and evidence models. |
| **Build & Bundler** | Vite | `6.2.3` / `6.4.5` | High-performance ES modules bundler, dev server, and prerender orchestration. |
| **3D Rendering** | Three.js | `^0.186.0` | WebGL rendering of the 3D Evidence Intelligence Core and orbiting module satellites. |
| **Styling & CSS** | Tailwind CSS | `^4.1.14` | Utility-first CSS engine with `@tailwindcss/vite` integration. |
| **Icons & Visuals** | Lucide React | `^0.546.0` | Accessible, tree-shakeable vector icon set. |
| **Backend Framework** | FastAPI | `0.115.x` | High-performance asynchronous Python web framework built on Starlette and Pydantic. |
| **Backend Language** | Python | `3.10+` | Execution environment for the governance engine, parsers, and APIs. |
| **Schema Validation** | Pydantic | `v2.x` | Strict request/response parsing, data validation, and OpenAPI generation. |
| **ASGI Server** | Uvicorn | `0.30.x+` | Lightning-fast ASGI runner for FastAPI asynchronous event handling. |
| **Database ORM/Bridge** | SQLAlchemy | `2.0.x` | Abstract dialect bridge supporting dual-persistence: SQLite 3 and PostgreSQL. |
| **Document Processing**| `pypdf` | `4.x+` | Native Python digital PDF text-layer extraction without external OS binaries. |
| **Image Analysis** | Pillow (`PIL`) | `10.x+` | Image decoding, SHA-256 binary hashing, and dominant palette extraction. |
| **Testing: Backend** | Pytest | `8.4.2` | Test execution runner for 144 unit, integration, and security test scenarios. |
| **Testing: Browser QA**| Playwright | `1.49.x+` | Headless Chromium browser test automation for 32 end-to-end user workflows. |
| **Report Generation** | ReportLab | `4.x+` | Programmatic PDF document compilation for Round 3 technical product reports. |

---

## Frontend Dependency Breakdown (`package.json`)

### Production Dependencies
- `@google/genai (^2.4.0)`: Client SDK for optional Gemini multimodal integration when user supplies an API key.
- `@tailwindcss/vite (^4.1.14)`: Vite plugin for Tailwind CSS v4 compiler.
- `canvas-confetti (^1.9.4)`: Micro-interaction animation for successful review clearance milestones.
- `dompurify (^3.4.14)`: Sanitization library preventing XSS injection in user-rendered preview text.
- `lucide-react (^0.546.0)`: Vector icon set used across all 9 workspace views.
- `react (^19.0.1)` & `react-dom (^19.0.1)`: Production React 19 runtime.
- `three (^0.186.0)`: 3D scene graphing, WebGL rendering, camera animation, and raycasting.
- `mammoth (^1.12.2)`: Word `.docx` text extraction utility.
- `xlsx (^0.18.5)`: Spreadsheet data parsing utility.

### Development Dependencies
- `typescript (~5.8.2)`: Compiler for static type checking (`tsc --noEmit`).
- `tsx (^4.21.0)`: TypeScript execution engine used during static HTML prerendering (`scripts/prerender.ts`).
- `esbuild (^0.25.0)`: Fast JS/TS bundler powering Vite internals.
- `sharp (^0.35.4)`: High-performance image transform utility.

---

## Backend Dependency Breakdown (`requirements.txt`)

```text
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.0.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.9
pypdf>=4.0.0
pillow>=10.0.0
python-multipart>=0.0.9
httpx>=0.27.0
pytest>=8.0.0
pytest-asyncio>=0.23.0
playwright>=1.45.0
reportlab>=4.0.0
```

---

## Technology Decisions & Architectural Rationale

### 1. Why FastAPI + Pydantic v2 over Django or Flask?
FastAPI provides automatic OpenAPI schema generation, asynchronous request handling for I/O-bound file uploads, and Pydantic v2 validation that operates at C-speed. This ensures $< 100\text{ ms}$ deterministic evaluation times while generating exact API documentation automatically.

### 2. Why Three.js with SVG Fallback?
Enterprise judges expect modern, immersive product experiences. Three.js renders a 3D Glass Icosahedron with orbiting satellites to represent the multi-agent governance pipeline. However, recognizing that serverless CI/CD, sandboxes, or legacy browsers may lack WebGL acceleration, BRANDTRACE implements an automatic SVG fallback to guarantee 100% testability and zero blank screens.

### 3. Why `pypdf` over PDFMiner or Tesseract for PDF Extraction?
`pypdf` is a pure-Python library with zero external C-runtime or PATH dependencies. It extracts digital text layers reliably and fails safely on corrupted or encrypted files without introducing complex OS-level vulnerabilities.

### 4. Why Dual SQLite / PostgreSQL Support?
Developers and automated test suites require instant, zero-configuration local execution (SQLite in-memory or single file). Staging and production deployments require robust multi-user concurrency and connection pooling (PostgreSQL on Neon). SQLAlchemy 2.0 abstracts SQL differences so the exact same service code runs seamlessly across both environments.

---

## Related Documentation

- [04 — System Architecture](./04_SYSTEM_ARCHITECTURE.md)
- [06 — Frontend Architecture](./06_FRONTEND_ARCHITECTURE.md)
- [07 — Backend Architecture](./07_BACKEND_ARCHITECTURE.md)
- [32 — Database Migrations and Persistence](./32_DATABASE_MIGRATIONS_AND_PERSISTENCE.md)
