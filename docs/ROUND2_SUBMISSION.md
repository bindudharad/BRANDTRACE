# BRANDTRACE — Inkloom AI CodeAxis Round 2 Submission

## 1. Executive Summary & Delivered Scope

BRANDTRACE is an evidence-linked brand governance platform engineered for organizations creating content across multiple human contributors and generative AI tools. 

Delivered capabilities for Round 2 include:
1. **Evidence-Linked Governance Workspace**: A responsive, accessible React/Vite interface featuring 9 specialized operational screens: Overview, Brand Constitution, Content Review, Findings Workspace, Correction Editor, Approval Queue, Audit History, Governance Insights, and the Judge Demo Walkthrough.
2. **Deterministic-First Policy Engine**: Exact evaluation of prohibited terms, mandatory phrases, preferred terminology, and active brand rules.
3. **Time-Aware Claim Ledger**: Persisted approved facts with expiration dates. Claims tied to expired evidence are tagged `OUTDATED` rather than falsely passed or crashed.
4. **Transparent Evidence Classification**: Strict categorization into `SUPPORTED`, `CONTRADICTED`, `OUTDATED`, `UNSUPPORTED_BY_APPROVED_EVIDENCE`, and `NEEDS_REVIEW`. Model triage is explicitly marked unverified without hallucinated citations.
5. **Multimodal File & Visual Review**:
   - Text & Markdown parsing.
   - Text-bearing PDF upload and extraction via `pypdf`, preserving page boundaries (`[Page N]`).
   - Image upload (PNG/JPEG) evaluated using Pillow: dominant palette extraction, CIELAB Delta-E (CIE76) tolerance comparison against approved brand colors, W3C WCAG 2.1 relative luminance contrast checking, logo aspect ratio fixture checks, and transparent OCR limitation reporting.
6. **Replaceable Server-Side AI Adapter**:
   - `OfflineProvider`: Zero-setup deterministic triage using BM25 token overlap and regex heuristics for promotional/absolute assertions.
   - `GeminiProvider`: Server-side REST API integration with strict JSON schemas, timeouts, and verification that cited source IDs exist in persisted storage before presenting findings.
7. **Human Approval Gate & Role-Aware Permissions**:
   - State machine enforcing `creator`, `reviewer`, `brand_admin`, and `auditor` roles via server-side headers (`X-Demo-Role`).
   - Server-side blocking (`409 Conflict`) if approval is attempted with unresolved `HIGH` or `CRITICAL` findings.
   - Mandatory recorded justification reasons for dismissals, manual edits, and waivers.
8. **Immutable Versioning & Audit Trail**:
   - Original submissions and revised drafts are preserved in `review_versions`. Revisions can be inspected and restored at any time.
   - Every action, disposition, actor, and justification is permanently recorded in the `audit` ledger.
9. **Governance Intelligence & Impact Mapping (Round 3 Foundation)**:
   - Aggregate statistics on recurring violations, severity distributions, and candidate rules for clarification.
   - Dependency tracking identifying which historical drafts are impacted when an approved fact or rule expires or updates, with one-click targeted re-review execution.

---

## 2. Technology Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite, typed API client (`src/services/api.ts`).
- **Backend**: FastAPI 0.115, Pydantic 2.7+, Uvicorn 0.27+, SQLAlchemy 2.0, Psycopg 3.2, PyPDF 6.12, Pillow 11.1, HTTPX 0.27, Pytest 9.1.
- **Persistence**: SQLite (local zero-setup demo mode) with PostgreSQL deployment compatibility via normalized connection strings.
- **Documentation**: OpenAPI Swagger UI exposed at `http://127.0.0.1:8000/docs`, health check at `/api/health`, and readiness check at `/api/ready`.

---

## 3. Verification & Test Evidence

The automated test suite was substantially expanded from the initial 3 tests to **22 comprehensive unit and integration tests**:
- `backend/tests/test_api.py` (8 integration tests): Seeded demo flow, high-risk approval blocking (`409`), required reason validation, expired source tagging (`OUTDATED`), citation ID verification, harmless text pass, role permissions (`403` enforcement), draft version restoration, multimodal upload endpoints, impact map targeted re-review, and database persistence across reconnects.
- `backend/tests/test_color_and_visual.py` (6 unit tests): Hex/RGB conversion, WCAG relative luminance fixtures, WCAG contrast ratio calculations (black/white, red/white, navy/white), CIELAB Delta-E distance, image palette extraction & contrast violations, and oversized image rejection.
- `backend/tests/test_pdf_parser.py` (4 unit tests): Empty PDF rejection, corrupted PDF handling, blank page handling, and encrypted PDF rejection.
- `backend/tests/test_ai_adapter.py` (4 unit tests): Offline promotional claim detection, harmless text pass, Gemini provider safe fallback on invalid key/timeout, and live provider credential check (transparently skipped when unconfigured).

**Actual Test Results** (verified 2026-10-22):
```text
================== 21 passed, 1 skipped, 1 warning in 7.00s ===================
```
**API Smoke Test** (`scripts/smoke_test.py` — 27 assertions across all core API flows):
```text
Results: 27/27 passed, 0 failed
```
- `npm run lint` (`tsc --noEmit`): Passed with 0 errors.
- `npm run build` (`vite build && tsx scripts/prerender.ts`): Production build successful (chunk-size advisory only, no errors).

---

## 4. Deviations from Round 1 & Project Evolution

The inherited Round 1 project was a client-side prototype requiring users to supply their own Gemini API keys directly in the browser. 

In Round 2:
- Replaced the client-side key model with an independent FastAPI server architecture.
- Eliminated browser-exposed API keys completely.
- Introduced an evidence data model, persistent database schema, immutable version storage, and audit logging.
- Added deterministic color science, WCAG 2.1 contrast evaluation, and PDF page extraction.
- Implemented the human approval gate preventing unreviewed content publication.

---

## 5. Deliberately Bounded Scope & Limitations

To ensure 100% reproducible local execution on Windows without external setup:
1. **Public Deployment**: In accordance with hackathon instructions, public deployment is pending user action. Local execution instructions for SQLite and Dockerized PostgreSQL are provided in `docs/DEPLOYMENT.md`.
2. **OCR Engine**: Tesseract executable is checked on system PATH. When absent, BRANDTRACE outputs an explicit `NEEDS_REVIEW` notice; it does not fake OCR text extraction.
3. **No Heavyweight ML Models**: Heavyweight dependencies (PaddleOCR, YOLOv8 nano weights, Qdrant vector databases, Qwen-VL) were intentionally avoided to guarantee instant local startup and zero-dependency reliability.

---

## 6. Three Round 3 Commitments

1. **Time-Aware Claim Ledger & Rule-Change Impact Map**: Expand the functional prototype delivered in Round 2 into an automated webhook-triggered re-review pipeline with automated creator diff notifications.
2. **Multimodal Visual Compliance**: Deepen color compliance with multi-region spatial segmentation, licensed brand asset watermarking detection, and layout hierarchy checks.
3. **Guideline Health & Governance Intelligence**: Automatically synthesize recurring dismissals, reviewer overrides, and ambiguous rule patterns into human-reviewable guideline clarification proposals with diff recommendations.
