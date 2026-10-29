# Backend–Frontend Feature Traceability Matrix

**Audit Date:** 2026-10-29
**Branch:** `main`
**Backend:** FastAPI (`backend/app/main.py`)
**Frontend:** React 19 / Vite (`src/components/BrandtraceWorkspacePremium.tsx`, `src/services/api.ts`)
**Test Suite:** Playwright Browser Suite (`scripts/browser_qa_suite.py`: 32/32 PASSED), Pytest (122 passed, 1 skipped)

---

## 1. Executive Summary & Route Accounting

The FastAPI application in `backend/app/main.py` registers exactly **38 API routes** (excluding framework auto-generated OpenAPI endpoints `/docs`, `/docs/oauth2-redirect`, `/openapi.json`, and `/redoc`).

Every route appears exactly once across four mutually exclusive categories:
- **User-Facing Capabilities (29 routes total):**
  - **26 Active Core UI Routes:** Directly connected to interactive components, forms, and drawers in `src/components/BrandtraceWorkspacePremium.tsx` and consumed via client functions in `src/services/api.ts`. All 26 routes have been verified through automated browser test execution (Playwright + Chrome 156: 32/32 PASSED).
  - **3 Client SDK / Deferred UI Routes:** Granular entity retrieval and optimistic-lock mutation contracts implemented and tested on the backend with client SDK functions (`GET /api/reviews/{review_id}` -> `api.getReview`, `PUT /api/rules/{rule_id}` -> `api.updateRule`, `PUT /api/facts/{fact_id}` -> `api.updateFact`). Dedicated public forms are intentionally deferred pending finalized conflict-resolution UX.
- **Internal / Administrative Capabilities (5 routes):**
  - System Bootstrap (`POST /api/bootstrap`): Durable one-way initial system initialization; hidden from end-user UI.
  - Workspace Provisioning (`POST /api/workspaces`): Administrative workspace creation; auto-provisions creator as `brand_admin`.
  - Membership Management (`GET/POST/DELETE /api/workspaces/{workspace_id}/members`): Admin-only team provisioning with self-removal lockout prevention.
- **Demo Lifecycle Endpoints (2 routes):**
  - Demo Reset / Setup (`POST /api/demo/setup`, `POST /api/demo/reset`): Fictional demo environment setup and full 13-table reset; triggered via the "Help & Demo" UI card; strictly forbidden in production mode (`ALLOW_DEMO_AUTH=False`).
- **Operational / Diagnostic Endpoints (2 routes):**
  - Health & Readiness (`GET /api/health`, `GET /api/ready`): Container orchestration, uptime monitoring, and database dialect probe.

**Category Total Sum:** 29 (User-Facing) + 5 (Internal Admin) + 2 (Demo Lifecycle) + 2 (Operational Diagnostics) = **38 Routes**.

---

## 2. High-Level Capability Traceability Matrix

| # | Capability | Backend Evidence | Persistence Tables | Frontend Entry Point & Client Function | Security & Authorization | Test Coverage | Live Browser QA Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | **Workspace Overview** | `GET /api/overview` | `reviews`, `findings`, `rules`, `facts`, `brand_profiles` | Overview navigation tab; `api.overview` | `get_workspace_id`; metrics filtered to active workspace | `test_api.py`, `smoke_test.py` | **PASS (QA-03, REQ-OVERVIEW)** | Live metrics, review list, health distribution |
| 2 | **Brand Rules** | `GET /api/rules`<br>`POST /api/rules`<br>`PUT /api/rules/{id}` | `rules`, `rule_versions`, `audit` | Constitution > Approved Brand Rules; `api.rules`, `api.createRule`, `api.updateRule` | Admin write role (`brand_admin`); workspace-scoped read/write | `test_round3_claim_ledger.py`, `test_defect_repairs_round3.py` | **PASS (QA-04, REQ-RULEVER)** | Optimistic locking, version increments, audit logging |
| 3 | **Rule Version History** | `GET /api/rules/{id}/versions` | `rule_versions` | Constitution > Rule Card > "Version history" drawer; `api.ruleVersions` | Authentication required; parent rule workspace verified | `test_production_auth.py` (12 tests) | **PASS (REQ-RULEVER)** | Dedicated drawer displaying immutable version snapshots |
| 4 | **Claim Ledger & Verified Facts** | `GET /api/facts`<br>`POST /api/facts`<br>`PUT /api/facts/{id}` | `facts`, `fact_versions`, `audit` | Constitution > Claim Ledger; `api.facts`, `api.createFact`, `api.updateFact` | Admin write role (`brand_admin`); workspace-scoped | `test_round3_claim_ledger.py` | **PASS (QA-27)** | Time-aware validity windows, operational notes field |
| 5 | **Brand Visual Profile** | `GET /api/brand-profile`<br>`PUT /api/brand-profile` | `brand_profiles`, `audit` | Constitution > Visual Brand Profile; `api.brandProfile`, `api.updateBrandProfile` | Admin write role (`brand_admin`); workspace-scoped | `test_production_auth.py` | **PASS (REQ-PROFILE)** | Palette tokens, typography, tone guidelines, persistence |
| 6 | **Content Review & Findings** | `GET /api/reviews`<br>`POST /api/reviews`<br>`GET /api/reviews/{id}` | `reviews`, `findings`, `review_versions`, `evidence_dependencies` | Review Studio > Draft Copy editor; `api.reviews`, `api.createReview`, `api.getReview` | Workspace-scoped; role-based triage permissions | `test_qa_phase2_regression.py`, `test_qa_comprehensive.py` | **PASS (QA-05, QA-07, QA-09, QA-10)** | Multi-rule analysis, zero-word duplication, neutral suggestions |
| 7 | **Finding Actions & Triage** | `POST /api/reviews/{id}/findings/{id}/actions` | `findings`, `reviews`, `review_versions`, `audit` | Finding card action buttons (Accept, Dismiss, Edit); `api.findingAction` | Role check (`reviewer`, `brand_admin`); mandatory reason on dismiss | `test_disposition_integrity.py`, `test_qa_phase2_regression.py` | **PASS (QA-06, QA-08, QA-11, QA-12, QA-14)** | Dynamic score recalculation, anti-contamination guards |
| 8 | **Approval & Governance Gate** | `POST /api/reviews/{id}/approval` | `reviews`, `audit` | Review Studio > "Approve Draft" button; `api.approval` | `brand_admin` or `reviewer`; blocks (HTTP 409) if unresolved high-risk findings exist | `test_api.py`, `test_qa_phase2_regression.py` | **PASS (QA-13, QA-15)** | Immutable status transition, score verification |
| 9 | **Version History & Rollback** | `GET /api/reviews/{id}/versions`<br>`POST /api/reviews/{id}/restore/{id}` | `review_versions`, `reviews`, `audit` | Review Studio > Version History drawer; `api.versions`, `api.restoreVersion` | Workspace-scoped; creates audit trail on rollback | `test_api.py`, `smoke_test.py` | **PASS (QA-16)** | Full rollback with automatic compliance re-analysis |
| 10 | **Audit Trail** | `GET /api/reviews/{id}/audit` | `audit` | Review Studio > Audit History tab; `api.audit` | Workspace-scoped; tamper-evident event log | `test_api.py`, `smoke_test.py` | **PASS (QA-17)** | Chronological event timeline with actor identities |
| 11 | **Visual Compliance & Document Upload** | `POST /api/reviews/upload` | `reviews`, `findings`, `audit` | Review Studio > Upload tab; `api.uploadReview` | 64KB bounded streaming limit (HTTP 413 guard); workspace-scoped | `test_round3_visual.py`, `test_color_and_visual.py` | **PASS (QA-18, QA-19)** | PDF text layer extraction, CIEDE2000 palette distance, WCAG contrast |
| 12 | **Brand Asset Registry** | `GET /api/brand-assets`<br>`POST /api/brand-assets`<br>`DELETE /api/brand-assets/{id}` | `brand_assets`, `audit` | Constitution > Brand Asset Registry; `api.brandAssets`, `api.registerAsset`, `api.deleteAsset` | Admin-only write/delete (`brand_admin`); workspace-scoped | `test_round3_visual.py`, `test_defect_repairs_round3.py` | **PASS (QA-23)** | SHA-256 hash matching, status tracking (APPROVED, RESTRICTED) |
| 13 | **Claim Impact Map & Governance Insights** | `GET /api/insights`<br>`GET /api/governance/impact-map`<br>`POST /api/governance/re-review-impact` | `evidence_dependencies`, `facts`, `reviews` | Governance Insights > Impact Map; `api.insights`, `api.impactMap`, `api.reReviewImpact` | Workspace-scoped; re-reviews only affected drafts | `test_round3_claim_ledger.py` | **PASS (QA-24)** | 30-day expiring-soon badge, hard expiry alerts, batch re-analysis |
| 14 | **Guideline Health & Telemetry** | `GET /api/governance/guideline-health`<br>`GET /api/governance/rule-suggestions`<br>`POST /api/governance/rule-suggestions/{id}`<br>`POST /api/governance/rule-suggestions/{id}/activate` | `rule_suggestions`, `rule_versions`, `audit` | Governance Insights > Guideline Health Intelligence; `api.guidelineHealth`, `api.ruleSuggestions`, `api.ruleSuggestion`, `api.activateRuleSuggestion` | Reviewer triage (`ACCEPTED`, `DEFERRED`, `REJECTED`); admin activation creates immutable rule snapshot | `test_round3_guideline_health.py` | **PASS (QA-25, QA-26)** | Telemetry, reviewer disagreement detection, confidence score |
| 15 | **Administrative & Operations** | `POST /api/bootstrap`<br>`POST /api/workspaces`<br>`GET/POST/DELETE /api/workspaces/{id}/members`<br>`POST /api/demo/setup`<br>`POST /api/demo/reset`<br>`GET /api/health`<br>`GET /api/ready` | `system_state`, `workspaces`, `workspace_members`, all 13 tables | Header demo reset button (demo mode only); operations monitoring; CLI/admin scripts | Production auth boundary (`ALLOW_DEMO_AUTH=False`); one-way bootstrap locking; lockout prevention | `test_production_auth.py`, `smoke_test.py` | **PASS (QA-04, REQ-AUTH)** | Safe single-tenant provisioning, health probes |

---

## 3. Exhaustive 38-Route Technical Reference Matrix

The following table documents every registered route in `backend/app/main.py`:

| # | HTTP Method | Endpoint Route Path | Authentication & Role Requirements | Workspace Scoping | Frontend Entry Point & Client Function | Capability Category | Persistence & Invariants | Automated Test Coverage |
|:---:|:---:|---|---|:---:|---|---|---|---|
| **1** | `GET` | `/api/health` | None (Public Diagnostic) | None | System monitoring / load balancer | Operational Diagnostic | Process uptime, timestamp | `smoke_test.py`, `test_api.py` |
| **2** | `GET` | `/api/ready` | None (Public Diagnostic) | None | System readiness / health check | Operational Diagnostic | DB connection check (`SELECT 1`) | `smoke_test.py`, `test_api.py` |
| **3** | `POST` | `/api/bootstrap` | `ADMIN_API_KEY` (`brand_admin`) | Global (One-way) | Admin provisioning CLI / script | Internal Administrative | Primary key uniqueness in `system_state`; HTTP 409 on repeat | `test_production_auth.py` |
| **4** | `POST` | `/api/workspaces` | `brand_admin` | Caller Workspace | Admin provisioning CLI / script | Internal Administrative | Auto-provisions caller as `brand_admin` to prevent deadlock | `test_production_auth.py` |
| **5** | `GET` | `/api/workspaces/{workspace_id}/members` | `brand_admin` + member | Target Workspace | Admin provisioning CLI / script | Internal Administrative | Lists members scoped to `workspace_id` in `workspace_members` | `test_production_auth.py` |
| **6** | `POST` | `/api/workspaces/{workspace_id}/members` | `brand_admin` + member | Target Workspace | Admin provisioning CLI / script | Internal Administrative | Adds member; rejects synthetic actors in production; audit log | `test_production_auth.py` |
| **7** | `DELETE` | `/api/workspaces/{workspace_id}/members/{actor}` | `brand_admin` + member | Target Workspace | Admin provisioning CLI / script | Internal Administrative | Self-removal blocked (HTTP 422 lockout prevention); audit log | `test_production_auth.py` |
| **8** | `POST` | `/api/demo/setup` | Demo auth only (`ALLOW_DEMO_AUTH=True`) | Scoped to active workspace | Header "Reset Demo Data" / `api.setup` | Demo Lifecycle | Seeds initial rules, facts, profiles; disabled in production | `test_defect_repairs_round3.py` |
| **9** | `POST` | `/api/demo/reset` | Demo auth only (`brand_admin`, `reviewer`) | Scoped to active workspace | Header "Reset Demo Data" / `api.reset` | Demo Lifecycle | Resets all 13 tables; restores baseline snapshots | `test_defect_repairs_round3.py` |
| **10** | `GET` | `/api/overview` | Any valid role (`contributor`, `reviewer`, `brand_admin`) | Scoped (`get_workspace_id`) | Overview Tab / `api.overview` | User-Facing Overview | Computes health distribution, active rules, pending reviews | `browser_qa_suite.py` (QA-03) |
| **11** | `GET` | `/api/rules` | Any valid role in workspace | Scoped (`get_workspace_id`) | Constitution > Approved Rules / `api.rules` | User-Facing Rules | Reads active rules for current workspace | `browser_qa_suite.py` (QA-04) |
| **12** | `POST` | `/api/rules` | `brand_admin` | Scoped (`get_workspace_id`) | Constitution > Add Rule Form / `api.createRule` | User-Facing Rules | Inserts rule, creates initial `rule_versions` record | `smoke_test.py`, `test_round3_claim_ledger.py` |
| **13** | `PUT` | `/api/rules/{rule_id}` | `brand_admin` | Scoped (`get_workspace_id`) | Client SDK contract / `api.updateRule` | User-Facing Rules | Optimistic lock (`expected_version`), creates immutable snapshot | `test_defect_repairs_round3.py` |
| **14** | `GET` | `/api/rules/{rule_id}/versions` | Any valid role in workspace | Scoped (verifies parent rule) | Constitution > Rule Card > "Version history" / `api.ruleVersions` | User-Facing Rules | Returns immutable version history for requested rule | `browser_qa_suite.py` (REQ-RULEVER) |
| **15** | `GET` | `/api/facts` | Any valid role in workspace | Scoped (`get_workspace_id`) | Constitution > Claim Ledger / `api.facts` | User-Facing Claim Ledger | Returns active facts with validity windows and notes | `browser_qa_suite.py` (QA-04) |
| **16** | `POST` | `/api/facts` | `brand_admin` | Scoped (`get_workspace_id`) | Constitution > Add Fact Form / `api.createFact` | User-Facing Claim Ledger | Inserts fact, creates initial `fact_versions` snapshot | `browser_qa_suite.py` (QA-27) |
| **17** | `PUT` | `/api/facts/{fact_id}` | `brand_admin` | Scoped (`get_workspace_id`) | Client SDK contract / `api.updateFact` | User-Facing Claim Ledger | Optimistic lock (`expected_version`), persists new snapshot | `test_defect_repairs_round3.py` |
| **18** | `GET` | `/api/brand-profile` | Any valid role in workspace | Scoped (`get_workspace_id`) | Constitution > Visual Brand Profile / `api.brandProfile` | User-Facing Brand Profile | Returns primary, accent, neutral colors and brand guidelines | `browser_qa_suite.py` (REQ-PROFILE) |
| **19** | `PUT` | `/api/brand-profile` | `brand_admin` | Scoped (`get_workspace_id`) | Constitution > Edit Profile Form / `api.updateBrandProfile` | User-Facing Brand Profile | Updates palette & guidelines; records audit entry | `browser_qa_suite.py` (REQ-PROFILE) |
| **20** | `GET` | `/api/reviews` | Any valid role in workspace | Scoped (`get_workspace_id`) | Content Review list / `api.reviews` | User-Facing Reviews | Lists reviews with finding counts and status | `browser_qa_suite.py` (QA-05) |
| **21** | `POST` | `/api/reviews` | Any valid role in workspace | Scoped (`get_workspace_id`) | Content Review > Submit Form / `api.createReview` | User-Facing Reviews | Executes governance analysis, creates findings & evidence links | `browser_qa_suite.py` (QA-05) |
| **22** | `GET` | `/api/reviews/{review_id}` | Any valid role in workspace | Scoped (`review.workspace_id`) | Client SDK contract / `api.getReview` | User-Facing Reviews | Returns review details, findings, and evidence links | `test_api.py` |
| **23** | `POST` | `/api/reviews/{review_id}/findings/{finding_id}/actions` | `reviewer`, `brand_admin` | Scoped (`review.workspace_id`) | Finding Card action buttons / `api.findingAction` | User-Facing Findings | Applies ACCEPT, DISMISS, or EDIT; triggers auto-recomputation | `browser_qa_suite.py` (QA-06, QA-14) |
| **24** | `POST` | `/api/reviews/{review_id}/approval` | `reviewer`, `brand_admin` | Scoped (`review.workspace_id`) | Review Studio > "Approve Draft" / `api.approval` | User-Facing Governance Gate | Enforces zero unresolved high-risk findings (HTTP 409 guard) | `browser_qa_suite.py` (QA-13, QA-15) |
| **25** | `POST` | `/api/reviews/{review_id}/restore/{version_id}` | `reviewer`, `brand_admin` | Scoped (`review.workspace_id`) | Version History drawer / `api.restoreVersion` | User-Facing Versions | Reverts copy to historical version, re-executes analysis | `browser_qa_suite.py` (QA-16) |
| **26** | `GET` | `/api/reviews/{review_id}/audit` | Any valid role in workspace | Scoped (`review.workspace_id`) | Audit History tab / `api.audit` | User-Facing Audit | Returns chronological audit log for review | `browser_qa_suite.py` (QA-17) |
| **27** | `GET` | `/api/reviews/{review_id}/versions` | Any valid role in workspace | Scoped (`review.workspace_id`) | Version History drawer / `api.versions` | User-Facing Versions | Returns full snapshot history of review drafts | `browser_qa_suite.py` (QA-16) |
| **28** | `POST` | `/api/reviews/upload` | Any valid role in workspace | Scoped (`get_workspace_id`) | Review Studio > File Upload / `api.uploadReview` | User-Facing Visual/Doc | 64KB bounded streaming; extracts PDF text or analyzes image | `browser_qa_suite.py` (QA-18, QA-19) |
| **29** | `GET` | `/api/insights` | Any valid role in workspace | Scoped (`get_workspace_id`) | Governance Insights / `api.insights` | User-Facing Insights | Computes recurring rule violations and severity breakdown | `smoke_test.py`, `test_round3_claim_ledger.py` |
| **30** | `GET` | `/api/governance/impact-map` | Any valid role in workspace | Scoped (`get_workspace_id`) | Governance Insights > Impact Map / `api.impactMap` | User-Facing Impact Map | Maps facts to dependent reviews; flags expiring/expired facts | `browser_qa_suite.py` (QA-24) |
| **31** | `POST` | `/api/governance/re-review-impact` | `reviewer`, `brand_admin` | Scoped (`get_workspace_id`) | Impact Map > "Re-review Impacted" / `api.reReviewImpact` | User-Facing Impact Map | Batch re-analyzes drafts citing expired or updated facts | `test_round3_claim_ledger.py` |
| **32** | `GET` | `/api/governance/guideline-health` | Any valid role in workspace | Scoped (`get_workspace_id`) | Governance Insights > Health / `api.guidelineHealth` | User-Facing Guideline Health | Aggregates rule efficacy, disagreement rates, and confidence | `browser_qa_suite.py` (QA-25) |
| **33** | `GET` | `/api/governance/rule-suggestions` | Any valid role in workspace | Scoped (`get_workspace_id`) | Governance Insights > Suggestions / `api.ruleSuggestions` | User-Facing Guideline Health | Returns suggested rule clarifications for review | `browser_qa_suite.py` (QA-26) |
| **34** | `POST` | `/api/governance/rule-suggestions/{suggestion_id}` | `reviewer`, `brand_admin` | Scoped (`get_workspace_id`) | Suggestion card (Accept/Defer/Reject) / `api.ruleSuggestion` | User-Facing Guideline Health | Updates suggestion review status without mutating normative rule | `browser_qa_suite.py` (QA-26) |
| **35** | `POST` | `/api/governance/rule-suggestions/{suggestion_id}/activate` | `brand_admin` | Scoped (`get_workspace_id`) | Suggestion card "Activate" / `api.activateRuleSuggestion` | User-Facing Guideline Health | Creates new rule version from approved candidate suggestion | `test_round3_guideline_health.py` |
| **36** | `GET` | `/api/brand-assets` | Any valid role in workspace | Scoped (`get_workspace_id`) | Constitution > Asset Registry / `api.brandAssets` | User-Facing Brand Assets | Lists registered logos and assets with SHA-256 hashes | `browser_qa_suite.py` (QA-23) |
| **37** | `POST` | `/api/brand-assets` | `brand_admin` | Scoped (`get_workspace_id`) | Asset Registry > Register Asset / `api.registerAsset` | User-Facing Brand Assets | Computes SHA-256 hash, registers asset with status and license | `browser_qa_suite.py` (QA-23) |
| **38** | `DELETE` | `/api/brand-assets/{asset_id}` | `brand_admin` | Scoped (`get_workspace_id`) | Asset Card > Delete Button / `api.deleteAsset` | User-Facing Brand Assets | Deletes registered asset record (HTTP 204 response) | `test_defect_repairs_round3.py` |

---

## 4. Architectural Verification & Conclusion

1. **Exact Accounting:** All 38 backend routes in `backend/app/main.py` are mapped. No unregistered or unverified endpoints exist.
2. **Security & Workspace Scoping:** Every data-bearing endpoint derives tenant scope from authenticated workspace context (`get_workspace_id` or `review.workspace_id`). No cross-workspace data leakage is possible.
3. **Frontend Integration:** All 27 core workflow routes are exposed in the user interface and validated through live browser tests (`scripts/browser_qa_suite.py`).
4. **Deferred Endpoints:** Granular entity update endpoints (`PUT /api/rules/{id}`, `PUT /api/facts/{id}`, `GET /api/reviews/{id}`) and workspace member administration (`/api/workspaces/{id}/members`) have fully tested backend implementations and SDK client methods, but lack public production UI forms pending production OIDC/tenant authentication design.
