# Testing Architecture and Automated Quality Assurance

## Automated Testing Strategy

Reliability in brand governance requires zero regressions. A minor logic bug in finding calculation could allow an unsubstantiated medical or regulatory claim to bypass approval, exposing the enterprise to severe legal liabilities.

BRANDTRACE enforces a comprehensive, multi-layered automated testing regime spanning **unit tests**, **API integration workflows**, **color science fixtures**, **regression suites**, **end-to-end smoke tests**, and **static type verification**.

```
+--------------------------------------------------------------------------+
|                     AUTOMATED QA VERIFICATION TIERS                      |
+--------------------------------------------------------------------------+
       |                           |                         |
       v                           v                         v
 [ Pytest Backend Suite ]   [ Smoke Test Script ]     [ TypeScript & Build ]
 - 76 collected tests       - 27 assertions           - npx tsc --noEmit (0 err)
 - 75 passed, 1 skipped     - scripts/smoke_test.py   - Vite production bundle
 - Isolated tempfile DB     - End-to-end API flows    - Static prerender HTML
```

---

## 1. Backend Pytest Suite Inventory (`backend/tests/`)

The backend test suite is executed using `pytest` and `httpx.AsyncClient` ASGI test transport. It comprises six dedicated test modules containing 76 test cases:

### 1. `test_api.py` (Core API & Workflow Tests)
* Verifies complete lifecycle: demo seed $\to$ draft creation $\to$ finding generation $\to$ remediation $\to$ approval.
* Tests evidence status transitions (`SUPPORTED`, `CONTRADICTED`, `OUTDATED`).
* Validates role permissions (e.g., verifying `contributor` cannot approve drafts or dismiss findings).
* Tests draft version snapshotting and historical rollback via `/restore/{version_id}`.
* Tests multipart file upload ingestion for PDF and image assets.
* Verifies PostgreSQL connection string URL normalization.

### 2. `test_color_and_visual.py` (Color Science & WCAG)
* Tests hex-to-RGB and RGB-to-hex conversions.
* Validates W3C WCAG 2.1 relative luminance against known mathematical fixtures.
* Tests contrast ratio computations (verifying 21.0:1 for pure black/white, 4.5:1 AA compliance).
* Validates CIELAB CIE76 Delta-E perceptual distance calculations.
* Tests Pillow palette extraction and handling of oversized (>1200px) images.

### 3. `test_disposition_integrity.py` (Defensive Integrity Guards)
* `test_reason_cannot_overwrite_draft_content`: Enforces `Guard 1` (rejecting edits where replacement equals justification reason).
* `test_qa_metadata_rejected_as_content`: Enforces `Guard 2` (rejecting replacements starting with `Manual QA:`, `QA:`, etc.).
* Verifies that disposition reasons are stored strictly in `findings.disposition_reason` without corrupting working copy text.
* Verifies that failed edits leave draft content and version history untouched.

### 4. `test_pdf_parser.py` (Document Ingestion & Error Recovery)
* Tests extraction of multi-page text PDFs.
* Validates defensive error handling on empty, zero-byte PDF uploads.
* Tests graceful recovery on corrupt or malformed PDF streams (`HTTP 400`).
* Tests password-protected and encrypted PDF rejection.

### 5. `test_qa_comprehensive.py` (Enterprise Governance QA)
* Validates server-side approval blocking (`HTTP 409 Conflict`) when unresolved `HIGH` or `CRITICAL` findings remain.
* Tests waiver enforcement requiring mandatory justification reasons.
* Tests Claim Impact Map computation with multiple drafts and expired facts.
* Tests repeated approval transitions and tamper-evident audit log creation.
* Tests demo reset restoring pristine database state.

### 6. `test_qa_phase2_regression.py` (Edge Case Regression)
* Tests geographic claim classification: verifies broad claims ("Available globally") against narrow evidence ("Available in India") yield `NEEDS_REVIEW`, not `CONTRADICTED`.
* Tests exclusive geographic restrictions: verifies exclusive facts yield `CONTRADICTED`.
* Tests promotional promise handling: verifies `"guarantee"` and `"guaranteed"` do NOT generate ungrammatical automated replacements.
* Tests neutral suggested corrections: verifies `"best"` suggests `"effective"` without word duplication.
* Tests dynamic re-evaluation of missing required terms upon draft edit (`Guard 3`).

---

## 2. The 1 Skipped Test: Live Gemini API

In `backend/tests/test_ai_adapter.py`, exactly one test is marked `SKIPPED`:
* **Test Name**: `test_live_provider_configuration_status`
* **Reason**: This test requires a live, funded `GEMINI_API_KEY` present in the environment to execute outbound network requests to Google's production API.
* **Architectural Intent**: In automated CI/CD and offline evaluation environments where external API keys should not be hardcoded or leaked, the test cleanly skips using `@pytest.mark.skipif(not os.getenv("GEMINI_API_KEY"))`. The offline provider is tested exhaustively in its place.

---

## 3. End-to-End Smoke Test (`scripts/smoke_test.py`)

In addition to pytest, BRANDTRACE includes an independent end-to-end smoke test script validating 27 distinct assertions against a live or ASGI application instance:
1. Health & readiness endpoints (`/api/health`, `/api/ready`).
2. Demo seeding (`POST /api/demo/setup`).
3. Overview metrics and workspace retrieval.
4. Brand rule creation and role authorization checks (`POST /api/rules` by creator $\to$ 403).
5. Approved fact creation.
6. Content review creation and finding generation.
7. Finding disposition actions (dismissal by reviewer).
8. Approval gate enforcement (approval blocked by unresolved findings).
9. Audit trail completeness.
10. Version history retrieval.
11. Governance insights aggregation.
12. Claim Impact Map retrieval.

**Expected Smoke Test Output**: `27/27 passed, 0 failed`.

---

## 4. Frontend Type Checking & Production Build

The frontend enforces strict TypeScript 5.8 static analysis and production bundling:
* **Type Safety**: `npx tsc --noEmit` verifies zero type errors across all `.tsx` components, contexts, and API services.
* **Production Build**: `npm run build` compiles Vite bundles and executes `tsx scripts/prerender.ts` to prerender static HTML into `dist/index.html`.

---

## 5. What the Test Suite Does NOT Cover (Explicit Boundaries)

* **End-to-End Browser Automation**: Automated Selenium/Cypress headless browser automation is not bundled; UI flows are validated via manual QA checklists.
* **Third-Party Identity Provider Handshakes**: Enterprise SAML/OAuth2 token exchanges are mocked via header simulation.
* **Physical Printer Output**: PDF rendering fidelity on physical paper printers is outside test boundaries.
