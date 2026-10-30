---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 34 — Test Catalog and Results

## Purpose

This document catalogs all automated test suites in **BRANDTRACE**, summarizing individual test modules, targeted capabilities, and verified execution outcomes as of October 2026.

---

## 1. Test Execution Summary

| Test Suite | Runner | Modules / Specs | Tests Executed | Passed | Skipped | Failed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Comprehensive Suite** | `pytest` | 20 modules | 145 | **144** | **1** | 0 |
| **Isolated Browser QA Suite** | Playwright Chromium | 1 script | 32 | **32** | 0 | 0 |
| **SQLite Regression Suite** | Custom harness | 1 script | 127 | **126** | **1** | 0 |

> [!NOTE]
> The single skipped test in the Pytest suite is an optional live cloud PostgreSQL network probe (`test_postgresql_compatibility.py`) that gracefully skips when a live Neon cloud instance is not reachable from local test environments.

---

## 2. Backend Test Module Catalog (`backend/tests/`)

### Core API & Architecture
1. **`test_api.py`**
   - Validates baseline FastAPI routes, health check (`GET /api/health`), schema inspection, and generic payload handling.
2. **`test_production_auth.py`**
   - Tests dual-mode authentication (`AUTH_MODE=production` vs `AUTH_MODE=demo`), API key validation, bearer headers, and credential separation.
3. **`test_phase1_security_access_control.py`**
   - Verifies RBAC permission enforcement: ensuring `creator` and `auditor` roles cannot trigger approval gates, reset databases, or mutate guidelines.
4. **`test_round3_comprehensive_security.py`**
   - Verifies cross-workspace data isolation, workspace membership checks, tenant token spoofing guards, and secure demo reset restrictions.
5. **`test_postgresql_compatibility.py`**
   - Tests PostgreSQL connection string normalization, SQLAlchemy engine configuration, and dialect query translation.

### Color Science & Visual Compliance
6. **`test_color_and_visual.py`**
   - Verifies CIE76 Delta-E calculation accuracy, sRGB linearization formulas, and WCAG 2.1 relative luminance math.
7. **`test_round3_visual.py`**
   - Tests image file ingestion, dominant color palette extraction, and brand asset registry SHA-256 hash matching.
8. **`test_round3_visual_benchmark.py`**
   - Benchmarks image processing performance and contrast ratio calculations against ISO test palettes.
9. **`test_pdf_parser.py`**
   - Verifies text extraction from digital PDF documents using `pypdf`, error handling for encrypted/corrupted files, and text length limits.

### Governance & Claim Verification
10. **`test_round3_claim_ledger.py`**
    - Tests Claim Ledger CRUD operations, ISO-8601 UTC timestamp validation, and 30-day `EXPIRING_SOON` status logic.
11. **`test_scenario_a_claim_ledger_acceptance.py`**
    - Acceptance scenario for Claim Ledger: adding facts, linking claims to reviews, and detecting expired source claims.
12. **`test_scenario_b_visual_compliance_acceptance.py`**
    - Acceptance scenario for Visual Compliance: palette deviation detection and contrast ratio reporting.
13. **`test_scenario_c_guideline_health_acceptance.py`**
    - Acceptance scenario for Guideline Health: telemetry aggregation, friction metrics, and data confidence classification.
14. **`test_round3_guideline_health.py`**
    - Tests reviewer disagreement detection across multiple human actors and deterministic suggestion generation.
15. **`test_disposition_integrity.py`**
    - Validates finding dispositions (`ACCEPTED_EDIT`, `DISMISSED`, `WAIVED`, `ESCALATED`) and their effect on clearance score.

### Regressions & Release Readiness
16. **`test_defect_repairs_round3.py`**
    - Validates bug fixes across Round 3 milestones, including version snapshots, audit logging, and route path updates.
17. **`test_qa_comprehensive.py`**
    - End-to-end integration tests simulating complete draft submission, finding triage, and approval gate clearance.
18. **`test_qa_phase2_regression.py`**
    - Regression suite ensuring changes to governance logic do not regress earlier Phase 1/Phase 2 capabilities.
19. **`test_ui_trust_and_accuracy.py`**
    - Validates honest status reporting, environment detection, and omission of static hardcoded test counters in UI payloads.
20. **`test_ai_adapter.py`**
    - Verifies the pluggable AI provider interface (`mock` vs `gemini`), fallback behavior, and timeout controls.

---

## 3. Isolated Browser QA Verification (`run_isolated_browser_qa.py`)

The browser QA runner executes 32 headless browser assertions:

- **Navigation (9/9 views)**: Successfully navigates to Overview, Reviews, Constitution, Ledger, Health, Impact, Assets, Audit, and Workspace.
- **Visuals & 3D**: Validates Three.js Command Core canvas mounting, animation loop execution, and graceful SVG fallback if WebGL is unavailable.
- **Workflow Interactivity**: Tests filter toggles, tab switches, modal dialogs, and persona switcher simulation pills.
- **Outcome**: 32 passed, 0 failed.
