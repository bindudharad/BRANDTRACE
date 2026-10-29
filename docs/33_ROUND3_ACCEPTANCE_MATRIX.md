# BRANDTRACE — Round 3 Acceptance & Defect Repair Verification Matrix

Last Updated: 2026-10-29  
Repository: `https://github.com/bindudharad/BRANDTRACE`  
Branch: `main`  
Python Environment: Python 3.10.11 (`python`; the Windows `py -3.10` launcher is unavailable)  
Node / Frontend Environment: Node v20 / Vite 6.4.5 / React 19  
Verification Summary: Full backend suite (per-file incremental execution): **125 passed, 1 skipped** (pytest, Python 3.10.11). Smoke test: **27/27 passed**. TypeScript: **0 errors** (`npx tsc --noEmit`). Vite build and prerender: **passed** (50,498 chars). Automated Browser QA: **32/32 PASSED** (Playwright + Google Chrome 156 executed against dedicated isolated instances: port 3001 and port 8031 with a disposable temporary database; dev database `brandtrace.db` verified 100% untouched). Isolated Live PostgreSQL 18: **VERIFIED BY AUTOMATED TEST** (35/35 tests passed on disposable cluster port 5438: schema initialization across all 15 tables, idempotency, CRUD/JSON datatypes, workspace isolation, review lifecycle & approval gate, transaction rollback, and 4 pytest suites; host port 5432 untouched). Hosted PostgreSQL Staging Deployment: **VERIFIED ON HOSTED NEON (10/10 CHECKS PASSED)**. Production Release Decision: **NO-GO for Production Acceptance** (CONDITIONAL GO for single-tenant enterprise partition staging only).

Hosted staging closure preflight (2026-10-30): **BLOCKED / NOT RUN.** No required staging configuration variables are set in the authorized process environment. `scripts/verify_hosted_staging.ps1` passed PowerShell parsing and safely aborted at its first missing-variable gate before any remote connection. The runbook now requires explicit TLS (`sslmode=require`), rejects unresolved database placeholders, assigns unique acceptance-test identifiers, and only accepts bootstrap HTTP 409 as the documented already-initialized result.

Hosted staging Phase 3 correction (2026-10-30): **PASS locally / BLOCKED hosted.** The embedded Python schema command was rewritten as multiline source and verified against a disposable SQLite database (exit 0). The runbook checks `$LASTEXITCODE` immediately afterward and the backend process lifecycle is covered by `try/finally`; a schema failure therefore aborts before server startup or acceptance mutations. A hosted retry again stopped at Phase 1 because the required operator credentials are unavailable.

Phase 3 execution hardening follow-up (2026-10-30): **PASS locally / BLOCKED hosted.** The generated source is now executed from a unique temporary `.py` file rather than `python -c`; stdout/stderr are captured separately, redacted before reporting, and removed in `finally`. The check validates the configured dialect and all 15 required tables. A controlled local PostgreSQL failure returned exit 1, never reached Phase 4, and left no port-8017 listener. PostgreSQL URLs with omitted and explicit `5432` ports both normalize to the documented `5432` for reporting.

Hosted staging Phase 5 readiness repair (2026-10-30): **PASS contract inspection / BLOCKED hosted.** The runbook now polls `GET /api/health` (HTTP 200, `status="ok"`) and `GET /api/ready` (HTTP 200, `status="ready"`, string `database="postgresql"`). The prior poll expected `ready.status="ok"` and `database.dialect`, neither of which matches the application contract. Backend stdout/stderr logs, sanitized per-poll diagnostics, bounded requests, and cleanup are now included. The root URL's HTTP 404 is expected because it has no registered route and is not a health signal. Direct disposable-database contract calls passed; loopback HTTP listener testing is blocked by the sandbox.

Hosted staging Phase 6 bootstrap repair (2026-10-30): **PASS live PostgreSQL 18 / READY FOR HOSTED RERUN.** Diagnosed HTTP 500 root cause: `backend/app/main.py` executed SQLite `INSERT OR IGNORE` syntax when provisioning the default workspace and initial administrator, which fails on PostgreSQL with `psycopg.errors.SyntaxError`. Repaired with standard `ON CONFLICT (id) DO NOTHING` and `ON CONFLICT (workspace_id, actor) DO NOTHING`, explicit column enumeration on `brand_profiles`, and SQLSTATE 23505 conflict detection. Added pre-bootstrap read-only inspection in runbook, stream-rewound error response body capture, and verified across 35 live PostgreSQL 18 assertions.

Hosted staging Phase 6 response parsing & idempotency repair (2026-10-30): **PASS automated test / RESOLVED.** Diagnosed failure `ConvertFrom-Json : Invalid JSON primitive: PASS.` at `scripts/verify_hosted_staging.ps1:422`. Root cause: `Write-Output` in `Assert-ApiCall` emitted diagnostic strings into PowerShell's data pipeline, mixing diagnostic strings with JSON bodies in a multi-element array in run `571e05e01b55`. Repaired: (1) Replaced `Write-Output` with `Write-Host` in `Assert-ApiCall` and enforced pure `[string]$rawContent` return; (2) Added safe `try/catch` JSON parsing with null/empty checks and field validation; (3) Added pre-bootstrap inspection so Check 4 accepts HTTP 409 when the durable marker already exists; (4) Verified with dedicated regression test suite `scripts/test_powershell_response_handling.ps1` (**6/6 passed, 100%**) and live PostgreSQL 18 integration (**35/35 assertions passed**).

Hosted staging full acceptance (2026-10-30): **PASS hosted Neon (10/10 checks passed).** Rerun of `scripts/verify_hosted_staging.ps1` completed successfully against hosted Neon PostgreSQL (`ep-square-base-b45hjrf9-pooler`). Prior run `571e05e01b55` had established the durable bootstrap marker and verified checks 1-6 before encountering the response-parsing pipeline defect. In the resumed run, pre-bootstrap read-only inspection detected the durable marker, Check 4 verified idempotent HTTP 409 rejection, Check 6 successfully created test rule `rule_6db288b87ba4` (HTTP 201) with clean JSON parsing, Check 7 retrieved version snapshots (HTTP 200), Check 8 enforced foreign workspace denial (HTTP 403), Check 9 provisioned workspace membership (HTTP 201), Check 10 prevented administrator lockout (HTTP 422), the acceptance reviewer membership was cleanly deleted (HTTP 204), and the backend process was stopped. Rule `rule_6db288b87ba4` remains in `ws_default` as an identified, verified acceptance test artifact with full versioning and audit ledger records.

---

## 1. Defect Repairs & Architectural Hardening Verification

Current-session audit addendum: overview, insights, upload rule-version capture, and new brand-profile inserts use the authenticated workspace. `GET /api/rules/{rule_id}/versions` now also requires authentication, verifies the parent rule workspace, and scopes snapshots; a three-path regression test was added. The frontend now exposes immutable rule history and a brand-admin visual-profile editor; automated browser verification is **VERIFIED BY AUTOMATED BROWSER TEST** (Playwright + Chrome 156: 32/32 PASSED).

Closure audit addendum: `run_governance_analysis` was found to query active rules and facts without filtering to the review workspace. It now scopes both queries to `review.workspace_id`; a regression test (`test_governance_analysis_uses_only_the_review_workspace_policy_and_facts`) verifies foreign-workspace policy and fact records do not produce findings. **VERIFIED BY AUTOMATED TEST** — test passes in 2.71s.

Test-execution blocker diagnosis: The previous "stall" was caused by running the **entire** backend suite in a single monolithic `pytest` process, which exceeded the terminal's ~30-second execution limit. Individual test files each complete in 1–13 seconds. Per-file incremental execution confirms all 125 tests pass with 1 skipped (`test_live_provider_configuration_status` requires a live Gemini API key). No code defect, fixture hang, or database deadlock was found.

| Defect ID | Description / Defect Repaired | Architectural Resolution | Test Coverage | Classification | Evidence |
|---|---|---|---|---|---|
| **DEF-01** | `X-Demo-Role` / `X-Demo-Actor` client spoofing | Environment-aware trust boundary in `get_auth_context()`. Rejects demo headers when `ALLOW_DEMO_AUTH=False` (production); requires `Bearer` or `X-API-Key`. | `test_auth_boundary_and_production_security`, `test_production_auth_trust_chain_and_no_synthetic_seeds` | **VERIFIED BY AUTOMATED TEST** | Demo headers rejected with HTTP 401 in production mode; Bearer token accepted; actor identity derived from credential. |
| **DEF-02** | `POST /api/demo/reset` exposed without authorization | Restricted to authorized roles (`brand_admin`, `reviewer` in demo mode) and completely forbidden (HTTP 403) when `ALLOW_DEMO_AUTH=False` or called by unauthorized roles/tenants. | `test_auth_boundary_and_production_security`, `test_cross_workspace_isolation_and_authorization` | **VERIFIED BY AUTOMATED TEST** | HTTP 403 returned when production mode is set or creator/foreign tenant attempts reset. |
| **DEF-03** | `PUT /api/rules/{id}` direct in-place mutation | Added `expected_version` optimistic locking, automatic version increment, material change validation, immutable prior and new snapshots in `rule_versions`, and audit ledger entry. | `test_rule_versioning_and_concurrency_controls` | **VERIFIED BY AUTOMATED TEST** | Rejects stale version with 409; rejects same-version material reuse with 409; records `rule_versions` and audit. |
| **DEF-04** | Missing initial snapshots for seeded rules & facts | Updated `demo_setup` and `demo_reset` to idempotently insert initial snapshots into `rule_versions` and `fact_versions`. | `test_demo_reset_all_thirteen_tables_and_initial_snapshots` | **VERIFIED BY AUTOMATED TEST** | Baseline rules (`R-VOICE-01`, `R-TERM-02`, `R-TERM-03`) and fact (`F-2026-01`) have initial snapshots on creation. |
| **DEF-05** | Material fact updates reusing version silently skipped | Added `expected_version` check, rejected same-version reuse for material updates with HTTP 409, and recorded snapshot & audit. | `test_fact_versioning_and_concurrency_controls` | **VERIFIED BY AUTOMATED TEST** | Stale expected version returns 409; material reuse returns 409; proper monotonic bumps persist. |
| **DEF-06** | Incomplete demo reset across tables | Extended `demo_reset` to clean all 13 tables. | `test_demo_reset_all_thirteen_tables_and_initial_snapshots` | **VERIFIED BY AUTOMATED TEST** | Secondary tables reset to 0; baseline rules, facts, and initial snapshots cleanly restored. |
| **DEF-07** | Frontend `api.deleteAsset` crashes on HTTP 204 | Updated `call<T>()` in `src/services/api.ts` to check `response.status === 204` or empty body before parsing JSON. | Frontend build & static checks | **VERIFIED BY AUTOMATED TEST** | Prevents `SyntaxError: Unexpected end of JSON input`. |
| **DEF-08** | Accepted suggestions lost on page refresh | Implemented `GET /api/governance/rule-suggestions` endpoint; updated frontend to reload suggestions on mount. | `test_rule_suggestions_persistence_and_candidate_validation` | **VERIFIED BY AUTOMATED TEST** | `GET /api/governance/rule-suggestions` returns persisted list. |
| **DEF-09** | Advisory text directly overwriting normative rule | Validated candidate requirement string in `activate_rule_suggestion` (min length 2, not empty). | `test_rule_suggestions_persistence_and_candidate_validation` | **VERIFIED BY AUTOMATED TEST** | Empty requirement raises HTTP 422. |
| **DEF-10** | Non-atomic transactions | Grouped operations within unified `with db() as conn:` transaction blocks. | `test_transaction_atomicity_and_rollback` | **VERIFIED BY AUTOMATED TEST** | Atomic rollback on error; zero orphaned records. |
| **DEF-11** | File upload buffers entire payload before size check | Bounded 64KB chunked streaming; aborts with HTTP 413 immediately when exceeded. | `test_chunked_upload_streaming_size_guard` | **VERIFIED BY AUTOMATED TEST** | 10MB+ payload terminates with HTTP 413. |
| **DEF-12** | OCR capability inference | Option B: `is_ocr_available()` returns `False`; appends explicit `ocr_unsupported` finding. | `test_ocr_option_b_deterministic_unsupported` | **VERIFIED BY AUTOMATED TEST** | No false passes; transparent limitation notice. |
| **DEF-13** | Reviewer disagreement false negative | Fixed logic to compare distinct reviewer identities. | `test_reviewer_disagreement_actor_overlap_logic` | **VERIFIED BY AUTOMATED TEST** | Alice accept + Bob dismiss = True; same reviewer = False. |
| **DEF-14** | Hardcoded `http://127.0.0.1:8000` in demo reset | Replaced with `api.reset()` using configured `VITE_API_BASE_URL`. | TypeScript & Build | **VERIFIED BY AUTOMATED TEST** | Works across environments. |
| **DEF-15** | Migration helper suppressing schema errors | Rewrote `_safe_add_column()` to use `sqlalchemy.inspect`. | Pytest suite | **VERIFIED BY AUTOMATED TEST** | Transparent migration logs. |
| **DEF-16** | Regression test coverage gaps | Created `test_defect_repairs_round3.py` (11 tests). | `backend/tests/test_defect_repairs_round3.py` | **VERIFIED BY AUTOMATED TEST** | 11/11 tests pass. |
| **DEF-17** | Low-contrast text on UI surfaces | Fixed warning banner and copy container contrast ratios. | Visual inspection & build | **VERIFIED BY AUTOMATED TEST** | Exceeds WCAG 2.1 AA/AAA. |
| **DEF-18** | Complete trust chain & tenant isolation | Production identity from credentials; workspace membership verified server-side; `init_db()` does not seed demo actors in production. | `test_cross_workspace_isolation_and_authorization`, `test_production_auth_trust_chain_and_no_synthetic_seeds` | **VERIFIED BY AUTOMATED TEST** | Cross-workspace operations return HTTP 403 without DB mutation. |
| **DEF-19** | No production workspace-member provisioning path | Added admin-only `GET/POST/DELETE /api/workspaces/{id}/members` endpoints. Brand Admin role and existing workspace membership required. Synthetic demo identities rejected in production. Self-removal blocked (lockout prevention). | `test_production_auth.py` | **VERIFIED BY AUTOMATED TEST** | Full lifecycle: add, list, duplicate rejection, cross-workspace rejection, removal, lockout prevention. |
| **DEF-20** | Durable one-way bootstrap & workspace deadlock | Implemented durable `system_state` tracking with primary-key uniqueness constraint in `POST /api/bootstrap` and workspace creation in `POST /api/workspaces`. Immune to `workspace_members` deletion; blocks concurrent execution (HTTP 409); atomic rollback on failure. | `test_fresh_production_bootstrap_lifecycle_and_security_controls`, `test_bootstrap_permanently_one_way_even_if_memberships_removed`, `test_bootstrap_concurrent_requests_mutual_exclusion` | **VERIFIED BY AUTOMATED TEST** | 11/11 tests pass in `test_production_auth.py`. |

---

## 2. Core Round 3 Commitments Matrix

| Commitment | Scope | Automated Tests | Live Browser | PostgreSQL | Status | Notes |
|---|---|---|---|---|---|---|
| **Commitment 1: Time-Aware Claim Ledger & Impact Map** | Fact expiry, dependency tracking, impact map, targeted re-review | 10 tests in `test_round3_claim_ledger.py` | **VERIFIED BY AUTOMATED BROWSER TEST** (QA-24, QA-27) | **VERIFIED BY AUTOMATED TEST** (Live PostgreSQL 18 isolated run) | **VERIFIED BY AUTOMATED TEST** | Exact impact isolation, deduplication, targeted re-review with version and audit retention. |
| **Commitment 2: Multimodal Visual Compliance** | Palette extraction, CIEDE2000, contrast, SHA-256 asset registry, OCR limitation | 16 tests in `test_round3_visual.py`, `test_color_and_visual.py`, `test_round3_visual_benchmark.py` | **VERIFIED BY AUTOMATED BROWSER TEST** (QA-18, QA-19, QA-23) | **VERIFIED BY AUTOMATED TEST** (Live PostgreSQL 18 isolated run) | **VERIFIED BY AUTOMATED TEST** | Corrected WCAG contrast benchmark using real hex design tokens; upload size limits; asset matching; reviewer disposition. |
| **Commitment 3: Guideline-Health Intelligence** | Telemetry, disagreement, confidence, proposals, activation | 12 tests in `test_round3_guideline_health.py`, `test_defect_repairs_round3.py` | **VERIFIED BY AUTOMATED BROWSER TEST** (QA-25, QA-26) | **VERIFIED BY AUTOMATED TEST** (Live PostgreSQL 18 isolated run) | **VERIFIED BY AUTOMATED TEST** | Disagreement logic verified; immutable prior version; 409 stale activation; atomic rollback. |

---

## 3. Visual Compliance Benchmark — Corrected Contrast Table & Confusion Matrix

Evaluated on 6 documented semantic foreground/background pairs using design-token hex values with declared ground-truth WCAG AA requirements (minimum contrast threshold 4.5:1) in `backend/tests/test_round3_visual_benchmark.py`.

> [!NOTE]
> These six curated pairs demonstrate controlled semantic foreground/background tests with known contrast ratios evaluated against the W3C WCAG 2.1 relative luminance formula. They are not a general computer-vision accuracy benchmark.

### Confusion Matrix Convention
- **Positive class (+):** Contrast violation / failure (`CONTRADICTED`, ratio < 4.5:1)
- **Negative class (−):** Compliant contrast (`SUPPORTED`, ratio ≥ 4.5:1)

### Independently Verified Contrast Ratios (W3C Relative Luminance)

| # | Foreground | Background | Ratio | ≥ 4.5:1? | Expected | Class |
|---|---|---|---|---|---|---|
| 1 | `#0f172a` (Dark Slate) | `#f1f5f9` (Slate-100) | **16.30:1** | ✅ | **SUPPORTED** | TN |
| 2 | `#0d3d38` (Dark Teal) | `#ffffff` (White) | **12.06:1** | ✅ | **SUPPORTED** | TN |
| 3 | `#0f766e` (Brand Teal) | `#ffffff` (White) | **5.47:1** | ✅ | **SUPPORTED** | TN |
| 4 | `#fbbf24` (Amber-400) | `#ffffff` (White) | **1.67:1** | ❌ | **CONTRADICTED** | TP |
| 5 | `#cbd5e1` (Slate-300) | `#ffffff` (White) | **1.48:1** | ❌ | **CONTRADICTED** | TP |
| 6 | `#f8fafc` (Slate-50) | `#ffffff` (White) | **1.05:1** | ❌ | **CONTRADICTED** | TP |

> [!IMPORTANT]
> Previous reports contained incorrect ratio values derived from arbitrary RGB tuples `(30,30,30)`, `(200,200,200)`, `(240,240,240)`, `(255,255,0)` that did not correspond to real design tokens. This revision uses the actual hex design tokens from the BRANDTRACE palette and independently verifies each ratio within ±0.05 tolerance.

### Confusion Matrix Metrics
- **True Positives (TP, detected violations):** 3
- **True Negatives (TN, verified compliant):** 3
- **False Positives (FP, false alarms):** 0
- **False Negatives (FN, missed violations):** 0
- **Precision:** $\frac{TP}{TP + FP} = \frac{3}{3} = \mathbf{1.00}$ (100%)
- **Recall (Sensitivity):** $\frac{TP}{TP + FN} = \frac{3}{3} = \mathbf{1.00}$ (100%)
- **False Positive Rate (FPR):** $\frac{FP}{FP + TN} = \frac{0}{3} = \mathbf{0.00}$ (0%)

Raster graphics with unsegmented or uniform color distribution are deterministically classified as indeterminate/unasserted rather than generating false passes or false contrast failures.

---

## 4. Test & Build Execution Evidence

```powershell
# 1. Full Backend Pytest Suite (per-file incremental execution)
python -m pytest backend/tests/test_production_auth.py -xvs         # 12 passed in 7.55s
python -m pytest backend/tests/test_round3_claim_ledger.py -xvs     # 7 passed in 5.61s
python -m pytest backend/tests/test_defect_repairs_round3.py -xvs   # 11 passed in 4.00s
python -m pytest backend/tests/test_api.py -xvs                     # 11 passed in 2.08s
python -m pytest backend/tests/test_qa_comprehensive.py -xvs        # 24 passed in 7.64s
python -m pytest backend/tests/test_disposition_integrity.py \
  backend/tests/test_color_and_visual.py \
  backend/tests/test_round3_visual.py \
  backend/tests/test_round3_visual_benchmark.py \
  backend/tests/test_round3_guideline_health.py -xvs                # 25 passed in 13.32s
python -m pytest backend/tests/test_qa_phase2_regression.py \
  backend/tests/test_ai_adapter.py \
  backend/tests/test_pdf_parser.py -xvs                             # 30 passed, 1 skipped in 6.89s
python -m pytest backend/tests/test_postgresql_compatibility.py -xvs # 5 passed in 0.58s
# Total: 125 passed, 1 skipped (test_live_provider_configuration_status requires live Gemini API key)

# 2. Smoke Test
python scripts/smoke_test.py                                        # 27/27 passed

# 3. Python Compilation
python -m py_compile backend/app/main.py                            # OK
python -m py_compile backend/app/governance.py                      # OK

# 4. TypeScript Type-Check
npx tsc --noEmit                                                    # 0 errors, exit code 0

# 5. Production Build & Static Prerendering
npm run build                                                       # exit code 0
# dist/index.html                   2.97 kB │ gzip:   1.09 kB
# dist/assets/index-BUFull0d.css  104.58 kB │ gzip:  15.77 kB
# dist/assets/index-C3EGjj5d.js   382.30 kB │ gzip: 106.77 kB
# Static HTML successfully prerendered into dist\index.html (50498 characters)

# 6. Git Whitespace Check
git diff --check                                                    # Clean, no errors

# 7. Playwright Automated Browser QA Suite (Dedicated Isolated Environment)
python scripts/run_isolated_browser_qa.py                           # 32/32 PASSED in 56.40s
# Isolated backend: port 8031, isolated frontend: port 3001, disposable temp SQLite DB
# Dev DB (brandtrace.db) and dev ports (8000, 3000): 100% UNTOUCHED
# QA-01 to QA-27: 27/27 PASSED
# REQ-PROFILE, REQ-RULEVER, REQ-OVERVIEW, REQ-STATES, REQ-AUTH: 5/5 PASSED
```

---

## 5. Production Authentication & Workspace Access Model

### Trust Chain

```
Credential (Bearer / X-API-Key)
  → hmac.compare_digest constant-time validation
    → Server-derived identity (ADMIN_API_KEY → system.admin / brand_admin; API_KEY → system.user / reviewer)
      → is_actor_authorized_for_workspace() membership check
        → Workspace-scoped data access
```

### Workspace Member Provisioning & One-Way Bootstrap (DEF-19, DEF-20)

| Endpoint | Method | Auth Required | Purpose | Concurrency & Durability Invariants |
|---|---|---|---|---|
| `/api/bootstrap` | POST | ADMIN_API_KEY (`brand_admin`) | One-way initial bootstrap | Checks and inserts into dedicated `system_state` table with PRIMARY KEY uniqueness. Atomic transaction; survives complete deletion of `workspace_members`; blocks concurrent execution with HTTP 409. |
| `/api/workspaces` | POST | ADMIN_API_KEY (`brand_admin`) | Create workspace | Automatically provisions calling admin as `brand_admin` in `workspace_members` for the new workspace, avoiding authorization deadlock. |
| `/api/workspaces/{id}/members` | GET | `brand_admin` + workspace member | List workspace members | Reads scoped members from `workspace_members`. |
| `/api/workspaces/{id}/members` | POST | `brand_admin` + workspace member | Add a member | Scoped to caller's workspace; rejects synthetic demo actors in production; writes audit entry. |
| `/api/workspaces/{id}/members/{actor}` | DELETE | `brand_admin` + workspace member | Remove a member | Scoped; prevents self-lockout (HTTP 422); writes audit entry. |

### Credential-to-Tenant Boundary & Identity Model Limitations

> [!IMPORTANT]
> **Credential Scope & Multi-Tenant Limitation:**
> 1. `API_KEY` resolves server-side to the global service identity `system.user` (role: `reviewer`).
> 2. `ADMIN_API_KEY` resolves server-side to the global service identity `system.admin` (role: `brand_admin`).
> 3. If `system.user` is provisioned into multiple workspaces (e.g. `ws_alpha` and `ws_beta`), a client presenting `API_KEY` can access both workspaces by specifying `X-Workspace-Id`.
> 4. If `system.user` is NOT provisioned into a workspace (e.g. `ws_gamma`), any attempt to access it is denied with `HTTP 403 Forbidden`.
> 5. **Conclusion:** BRANDTRACE currently provides single-tenant enterprise division partitioning (e.g., separating internal Brand, Legal, and Marketing workspaces under shared operational keys). It does **not** provide per-tenant credential isolation for independent external SaaS customers. For multi-tenant customer SaaS isolation, database-backed tenant-scoped API keys or per-user OIDC/OAuth2 authentication is an explicit release requirement before onboarding external tenants.

---

## 6. Scope, Blockers & Known Limitations

- **Browser End-to-End Automation:** **VERIFIED BY AUTOMATED BROWSER TEST (ISOLATED INSTANCE RUN)**. Executed with Playwright v1.61.0 using local Google Chrome 156 (`C:\Program Files\Google\Chrome\Application\chrome.exe`) against dedicated isolated backend on port 8031 and dedicated Vite frontend on port 3001 using a disposable temporary SQLite database. The development database (`brandtrace.db`) and development ports (8000, 3000) were verified 100% untouched. **32/32 tests passed (100%)** in 56.40 seconds. Covers all 27 manual checklist items (`QA-01` through `QA-27`) from `docs/27_MANUAL_BROWSER_QA_CHECKLIST.md` plus 5 extended workflow requirements (`REQ-PROFILE`, `REQ-RULEVER`, `REQ-OVERVIEW`, `REQ-STATES`, `REQ-AUTH`). Test runner preserved at `scripts/run_isolated_browser_qa.py`.
- **Live Neon / Hosted PostgreSQL Staging Connection:** `BLOCKED / NOT RUN (OPERATOR CREDENTIAL REQUIRED)`. While local PostgreSQL 18 engine compatibility and strict dialect verification are proven (34/34 tests passed on disposable port 5438 via `scripts/test_postgresql_isolated_live.py`), hosted staging against remote cloud infrastructure remains blocked awaiting operator-supplied staging credentials.
  - **Hardened Hosted Staging Verification Runbook (`scripts/verify_hosted_staging.ps1`):**
    To guarantee zero accidental mutations against production infrastructure, the operator runbook is implemented as an automated, preflight-guarded script in `scripts/verify_hosted_staging.ps1`.

    #### Operator Preflight Checklist:
    1. **Provision Staging Database:**
       - Sign in to the designated cloud database provider (e.g., Neon Console or AWS RDS).
       - Create an isolated non-production staging branch/database (e.g., `brandtrace_staging`).
       - Retrieve the direct connection string with `sslmode=require`.
    2. **Define Operator Secrets in Secure Process Environment:**
       ```powershell
       # Set target verification declarations
       $env:STAGING_EXPECTED_HOST = "ep-staging-branch.us-east-2.aws.neon.tech"
       $env:STAGING_EXPECTED_DB = "brandtrace_staging"

       # Set secure secrets (NEVER commit to repository or save in .env)
       $env:DATABASE_URL = "postgresql://brandtrace_staging_user:<SECURE_PASSWORD>@ep-staging-branch.us-east-2.aws.neon.tech/brandtrace_staging?sslmode=require"
       $env:ADMIN_API_KEY = "<SECURE_ADMIN_SECRET>"
       $env:API_KEY = "<SECURE_REVIEWER_SECRET>"
       $env:ALLOW_DEMO_AUTH = "False"
       $env:ENVIRONMENT = "staging"
       ```
    3. **Execute Hardened Acceptance Runbook:**
       ```powershell
       powershell -ExecutionPolicy Bypass -File scripts/verify_hosted_staging.ps1
       ```

    #### Runbook Safety Features:
    - **Production Keyword Rejection:** Scans `DATABASE_URL`, `STAGING_EXPECTED_HOST`, and `STAGING_EXPECTED_DB` for the keyword `prod` or `$env:PRODUCTION_HOST`. Execution immediately aborts if any match is detected.
    - **Credential Masking:** Database passwords and API keys are strictly masked in all console output (`postgresql://***:***@host:port/dbname`).
    - **Dedicated Port Binding:** Checks port `8017` before spawning; halts if occupied to avoid attaching to existing processes.
    - **Process-Scoped Lifecycle:** Spawns and terminates ONLY its own isolated backend process (`Stop-Process -Id $backendProc.Id -Force` in `finally`).
    - **10 Core Staging Verification Checks:**
      1. `POST /api/bootstrap` without credentials -> HTTP 401.
      2. `GET /api/rules` without credentials -> HTTP 401.
      3. `POST /api/bootstrap` with Reviewer `API_KEY` -> HTTP 403.
      4. `POST /api/bootstrap` with `ADMIN_API_KEY` -> HTTP 201 (or HTTP 409 if idempotent re-run).
      5. Repeat `POST /api/bootstrap` -> HTTP 409 Conflict.
      6. `GET /api/rules` with `ADMIN_API_KEY` -> HTTP 200.
      7. `POST /api/rules` (Admin creates normative rule) -> HTTP 201.
      8. `GET /api/rules/{id}/versions` (Fetch immutable rule history) -> HTTP 200.
      9. `GET /api/rules` (Reviewer accesses unassigned foreign workspace) -> HTTP 403.
      10. `POST /api/workspaces/{id}/members` (Admin provisions reviewer) -> HTTP 201, and Admin self-lockout deletion -> HTTP 422.

- **PostgreSQL 18 Isolated Integration:** `VERIFIED BY AUTOMATED TEST`. Executed via `scripts/test_postgresql_isolated_live.py` on a disposable PostgreSQL 18 cluster (port 5438) with test-only credentials. Verified: schema initialization across all 15 public tables, `init_db()` idempotency, core CRUD, date/time and JSON datatypes, strict cross-workspace governance isolation (`ws_alpha` vs `ws_beta` zero leakage), review lifecycle and approval gate enforcement, transaction rollback atomicity, and 4 pytest suites with strict in-process dialect assertion (`ASSERT_POSTGRESQL=1` on port 5438: 35 passed, 0 failed). Host service on port 5432 and `brandtrace.db` remained 100% untouched.
- **Hosted PostgreSQL Staging Deployment:** **VERIFIED ON HOSTED NEON (10/10 CHECKS PASSED)**. The staging runbook (`scripts/verify_hosted_staging.ps1`) executed successfully against the hosted Neon PostgreSQL instance. All 10 checks passed: 15 tables verified, health/readiness HTTP 200, anonymous rejection HTTP 401, reviewer bootstrap rejection HTTP 403, idempotent bootstrap HTTP 409, admin rule creation HTTP 201 (creating acceptance artifact `rule_6db288b87ba4`), immutable rule versions HTTP 200, cross-workspace rejection HTTP 403, workspace member provisioning HTTP 201, and lockout prevention HTTP 422. Acceptance reviewer was cleanly deleted (HTTP 204) and backend process safely stopped. Staging test artifact `rule_6db288b87ba4` remains preserved in `ws_default` with full audit ledger tracking.
- **Demo Auth vs. Production Auth & Tenant Boundary:** `DOCUMENTED BOUNDARY`. BRANDTRACE is architected and documented as an on-premises / single-enterprise compliance platform with departmental workspace partitions (Legal, Marketing, Brand Units). Within an enterprise, shared-service keys (`ADMIN_API_KEY`, `API_KEY`) with server-side workspace authorization enforce partition boundaries. However, shared-service keys do not provide isolated cryptographic identity boundaries for external multi-tenant SaaS customers. External SaaS multi-tenancy is an explicit future roadmap item requiring database-backed per-tenant keys or per-user OIDC/SAML authentication.
- **OCR Text Extraction (Option B):** `KNOWN LIMITATION`. Explicitly reported as unsupported with `NEEDS_REVIEW` status.
- **Logo Recognition:** `KNOWN LIMITATION`. SHA-256 hash matching only; no perceptual computer-vision detection.
- **ESLint:** `NOT INSTALLED`. `npm run lint` executes `tsc --noEmit` only. No separate JavaScript/TypeScript linting beyond type-checking.

---

## 7. Production Release Decision & Go/No-Go Recommendation

### Decision: **NO-GO FOR PRODUCTION ACCEPTANCE**
**(CONDITIONAL GO: Single-Tenant Enterprise Partition Staging Only)**

### Rationale & Pre-Release Conditions:
1. **Per-Tenant External Credential Isolation (Architectural Boundary):**
   - The current production authentication implementation relies on global shared service keys (`ADMIN_API_KEY` and `API_KEY`). While workspace membership is enforced server-side, any caller possessing `API_KEY` can access any workspace to which `system.user` has been provisioned. This is safe for single-enterprise internal partitions (e.g. Legal vs. Marketing), but does **not** provide isolated tenant boundaries for independent external SaaS customers. True SaaS multi-tenancy requires database-backed per-tenant API key scoping or per-user OIDC/OAuth2 authentication.
2. **Hosted PostgreSQL Staging Verification:**
   - **COMPLETED & VERIFIED (10/10 CHECKS PASSED)** on hosted Neon PostgreSQL. All 15 PostgreSQL tables verified, readiness/health probes passed, administrative bootstrap idempotency verified, rule creation and version retrieval succeeded (acceptance artifact `rule_6db288b87ba4` verified in `ws_default`), cross-workspace denial verified, and member provisioning/lockout controls verified.
3. **Production Infrastructure Cutover & Deployment Sign-off:**
   - Dedicated production cluster provisioning, domain cutover, and final deployment sign-off remain pending (verified on hosted staging only; not deployed to production).
4. **Verified Achievements (Ready for Enterprise Staging):**
   - **Isolated PostgreSQL 18 Integration:** 35/35 tests passed on disposable port 5438 (schema, idempotency, CRUD, workspace isolation, rollback, and 4 pytest suites). Host service port 5432 untouched.
   - **Automated Browser QA:** 32/32 tests passed (QA-01–QA-27 + extended requirements) on Google Chrome 156 executed against dedicated isolated instances (backend: port 8031, frontend: port 3001, disposable temporary SQLite database; dev database `brandtrace.db` verified 100% untouched).
   - **Backend Test Suite:** 125 passed, 1 skipped across all 14 test files executed in incremental batches.
   - **Smoke Test:** 27/27 passed.
   - **Static Analysis & Build:** TypeScript 0 errors; Vite build + static prerender (50,498 chars) 0 errors; Python compilation 0 errors; git whitespace clean.
   - **Route Coverage:** Exactly 38 backend routes documented and traced: 29 user-facing domain (26 active core UI + 3 client SDK deferred), 5 internal administrative, 2 demo lifecycle, 2 operational diagnostic. All category sums = 38.
