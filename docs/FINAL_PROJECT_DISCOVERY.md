# BRANDTRACE — FINAL PROJECT DISCOVERY REPORT
**Evaluation Standard:** Complete Repository & System Audit  
**Date:** 2026-10-31  
**Team:** `Team_Nexus` (Bindudhara D, Vishwanath B S, Supriya K S, Tejaswini D)  
**Product:** BRANDTRACE — Evidence-Aware Brand Governance Platform  
**Promise:** *"Every finding has a source. Every decision has an owner."*  

---

## 1. Actual Project Structure

```
BRANDTRACE/
├── backend/
│   ├── app/
│   │   ├── config.py                   # Central environment & DB settings
│   │   ├── database.py                 # SQLite & PostgreSQL engine abstraction
│   │   ├── main.py                     # FastAPI application & core route registry
│   │   ├── models.py                   # SQLAlchemy ORM entities
│   │   ├── schemas.py                  # Pydantic v2 schemas
│   │   ├── governance.py               # Deterministic rule engine & health scoring
│   │   ├── finding_actions.py          # Human-in-the-loop review actions
│   │   ├── guideline_importer.py       # Guideline PDF extraction & candidate staging
│   │   ├── guideline_health.py         # Telemetry aggregation & friction analytics
│   │   ├── expiry_monitor.py           # Dependency tracking & impact graph
│   │   ├── expiry_worker.py            # Automated expiry scanning & scheduler
│   │   ├── image_analyzer.py           # WCAG contrast & CIELAB Delta-E extraction
│   │   ├── ocr_service.py              # Multimodal Optical Character Recognition
│   │   ├── pdf_parser.py               # Vector & text extraction via PyMuPDF
│   │   ├── logo_detector.py            # Geometric clearspace & placement engine
│   │   ├── services/
│   │   │   ├── logo_reference_service.py # Reference logo registration & storage
│   │   │   ├── logo_matcher.py           # Multi-layered perceptual logo matching
│   │   │   ├── pdf_logo_extractor.py     # Page-by-page PDF visual extraction
│   │   │   └── logo_report_generator.py  # Vector PDF report generator (ReportLab)
│   │   └── routers/
│   │       └── logo_intelligence.py     # REST endpoints for logo verification
│   └── tests/                          # 25+ comprehensive backend test suites
├── src/
│   ├── App.tsx                         # Primary routing & view switcher
│   ├── main.tsx                        # React 18 client entry
│   ├── entry-server.tsx                # SSR prerender entry point
│   ├── components/
│   │   ├── BrandtraceWorkspace.tsx     # Main dashboard workspace container
│   │   ├── BrandConstitution/          # Rule creation, standards, guideline import
│   │   ├── ContentReview/              # Review submission, findings drawer, diffs
│   │   ├── VisualIntelligence/         # Visual tools modal, logo verify, OCR, PDF
│   │   ├── AuditStudio/                # Audit trail & diagnostic viewer
│   │   ├── analytics/                  # Impact graph, health meters, timeline
│   │   ├── LandingPage/                # Public landing page with Three.js hero
│   │   └── navigation/                 # Sidebar navigation & role switcher
│   ├── services/
│   │   └── api.ts                      # Centralized API client & HTTP transport
│   └── types/                          # TypeScript interfaces & domain models
├── scripts/
│   ├── judge_journey_simulation.py     # 23-step Playwright automated simulation
│   ├── verify_sqlite_regression.py     # 200-test zero-regression SQLite runner
│   ├── prerender.ts                    # Production static HTML prerenderer
│   └── smoke_test.py                   # Non-destructive API verification
├── docs/                               # Engineering documentation & evidence reports
├── reports/                            # 21 Playwright evidence screenshots
├── brandtrace.db                       # Preserved local development database (983,040 B)
└── package.json                        # Node dependencies & Vite build pipeline
```

---

## 2. Frontend Architecture

- **Framework:** React 18 with TypeScript 5, bundled via Vite 6.
- **Routing & State:** Single-page application with modular view switching (`activeView` state managed in `BrandtraceWorkspace.tsx`). Views include:
  1. `Overview` — Executive workspace status, recent reviews, quick actions.
  2. `Brand Constitution` — Active rules, visual standards, guideline PDF import modal.
  3. `Content Review` — Marketing copy submission, passage highlighting, finding drawers, inline corrections.
  4. `Approval Queue` — Multi-review triage with server-enforced approval gating.
  5. `Audit History` — Append-only chronological event ledger.
  6. `Governance Insights` — Friction telemetry, disagreement charts, rule impact graph.
  7. `Help & Demo` — Guided judge tours, sandbox controls, architecture diagrams.
- **Visual Intelligence Modal:** Integrated modal in `BrandConstitution` with dedicated tabs for Reference Library, Logo Standards, Verify Artwork/PDF, Typography Compliance, Document OCR, and Official Verification Reports.
- **Styling:** Custom CSS design system adhering to strict WCAG 2.1 Level AA color contrast ($\ge 5.16:1$).

---

## 3. Backend Architecture

- **Framework:** FastAPI running with Uvicorn, Python 3.10.
- **Rule Engine:** Deterministic rule evaluation in `governance.py` executing substring, regex, and corporate claim matching with exact text character offsets.
- **Database Abstraction:** Dual-engine SQLAlchemy configuration:
  - Local/Dev/Testing: SQLite (`brandtrace.db` and temporary test DBs).
  - Production/Hosted: PostgreSQL with connection pooling.
- **Security & RBAC:** Header-driven authentication (`X-Demo-Role`, `X-Demo-Actor`, `X-Workspace-Id`) and API key validation. All approval endpoints require server-side state validation.
- **Visual & Document Engines:**
  - `Pillow` & `NumPy`: Perceptual hashing, CIELAB Delta-E, and aspect ratio calculation.
  - `PyMuPDF` (`fitz`): High-resolution rasterization and embedded vector/font extraction.
  - `ReportLab`: Programmatic vector PDF verification report generation with dynamic two-pass pagination (`NumberedVerificationCanvas`).

---

## 4. Database Architecture & Models

Core tables with foreign key constraints and workspace scoping:
1. `workspaces` & `workspace_members` — Tenant isolation and RBAC roles.
2. `rules` & `rule_versions` — Brand governance guidelines with immutable version history.
3. `facts` & `fact_versions` — Claim ledger with verified empirical evidence citations.
4. `reviews` & `review_versions` — Content submissions with lifecycle state (`DRAFT`, `IN_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`).
5. `findings` — Discrete rule violations with text spans (`start_offset`, `end_offset`) and dispositions (`UNRESOLVED`, `RESOLVED`, `DISMISSED`, `ESCALATED`, `WAIVED`).
6. `audit_log` — Append-only event stream recording all human decisions and automated actions.
7. `logo_references` — Approved official reference logo metadata and visual standards.
8. `logo_analyses` & `logo_findings` — Computer vision and PDF logo verification results.
9. `logo_reports` — Official verification reports with SHA-256 integrity checksums.

---

## 5. Current Route Inventory Summary

- **Total Local Registered Endpoints:** **75+ routes**
- **Core Governance & Review:** `/api/rules`, `/api/facts`, `/api/reviews`, `/api/reviews/{id}/approval`, `/api/reviews/{id}/findings/{fid}/actions`
- **Visual & Logo Intelligence:** `/api/logo-intelligence/references`, `/api/logo-intelligence/standards/{id}`, `/api/logo-intelligence/analyze/image`, `/api/logo-intelligence/analyze/pdf`, `/api/logo-intelligence/reports`, `/api/logo-intelligence/reports/{id}/download`
- **Document Intelligence:** `/api/documents/ocr`, `/api/documents/typography-check`, `/api/brand-assets/placement-check`
- **Governance Health & Scheduler:** `/api/governance/guideline-health`, `/api/governance/impact-map`, `/api/governance/expiry-worker/status`
- **System Health:** `/api/health`, `/api/ready`, `/openapi.json`

---

## 6. Current Frontend-to-Backend Integration Status

- **API Transport:** Centralized `call<T>()` in `src/services/api.ts` with automatic header deduplication, JSON serialization, multipart FormData handling, and normalized error mapping.
- **Connection Status:** 100% of primary user workflows (Rule Creation, Fact Ledger, Draft Submission, Finding Actions, Compliance Approval, Visual Verification, Report Download) invoke live backend REST endpoints. Zero mocked responses are used in production pathways.

---

## 7. Existing Tests & Verification Suite

1. **SQLite Regression Suite (`verify_sqlite_regression.py`):** **200/200 passed** across 25 suites.
2. **Logo Report Generator Suite (`test_logo_report_generator.py`):** **16/16 passed**.
3. **Zero-Deferred Capabilities Suite (`test_zero_deferred_capabilities.py`):** **14/14 passed**.
4. **Playwright Real Judge Simulation (`judge_journey_simulation.py`):** **23/23 passed** across all 7 views and modals.
5. **TypeScript Check (`tsc --noEmit`):** **0 errors** (clean).
6. **Vite Build & SSR Prerender (`npm run build`):** **Built cleanly** in 6.32s (63,908 chars).

---

## 8. Deployment Configuration & Parity

- **Vercel Frontend:** `https://brandtrace-woad.vercel.app/`
- **Render Backend:** `https://brandtrace-api.onrender.com/` (PostgreSQL backed, `/api/health` and `/api/ready` returning HTTP 200).
- **Parity Finding:** The deployed Render instance is currently serving the baseline 33 endpoints from commit `41940fc`. Local repository contains 3 additional feature commits (`52e7fa9`, `6980c0a`, `f69dca2`) providing the Visual Intelligence router and Vector PDF report generator. Pushing local `main` to `origin/main` synchronizes both deployments automatically.

---

## 9. Technical Risks & Safeguards

- **Risk 1: Database Mutation on Dev DB (`brandtrace.db`)**  
  *Safeguard:* All automated test runners and judge simulation scripts strictly verify pre- and post-run database stat (`size: 983040 bytes`, `mtime`). All test executions use disposable `%TEMP%` databases.
- **Risk 2: AI Autonomy over Content Approval**  
  *Safeguard:* Strict server-side dual-layer gate (`HTTP 409 Conflict`) rejects approvals when unresolved HIGH severity findings exist. No AI model has authority to approve reviews or activate rules.
- **Risk 3: Reviewer Text Overwrite (Anti-Contamination)**  
  *Safeguard:* Server validates reviewer notes with `HTTP 422 Unprocessable Entity` to prevent reviewer justification from overwriting publishable copy.
