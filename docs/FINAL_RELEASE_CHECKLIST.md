# BRANDTRACE — Round 3 Final Release & Submission Checklist
**CodeAxis Hackathon Round 3: The Final Build**
*Team: Team_Nexus*
*Date: 2026-10-30*

This checklist clearly separates **automated locally-verified engineering steps** (already completed and verified) from the **manual external deployment and submission steps** that only the team leader can perform.

---

## Part 1: Automated Local Engineering Gate (VERIFIED BY AGENT)

The following verification steps have been executed and verified in the local workspace:

- [x] **1. Static TypeScript Compilation:**
  - Command: `npx tsc --noEmit`
  - Result: **0 errors**. Strict typing verified across all React components, analytics charts, and API client interfaces.
- [x] **2. Production Bundle & Prerender:**
  - Command: `npm run build`
  - Result: **Passed**. 1,691 modules transformed; static HTML prerendered into `dist/index.html` (51,297 characters).
- [x] **3. Baseline SQLite Regression Suite:**
  - Command: `python scripts/verify_sqlite_regression.py`
  - Result: **126 passed, 1 skipped, 0 failed** across all 14 baseline test modules in ~23 seconds.
- [x] **4. Round 3 Security & Acceptance Suites:**
  - Command: `pytest backend/tests/test_phase1_security_access_control.py backend/tests/test_scenario_a_claim_ledger_acceptance.py backend/tests/test_scenario_b_visual_compliance_acceptance.py backend/tests/test_scenario_c_guideline_health_acceptance.py -v`
  - Result: **7 passed, 0 failed** in 2.36 seconds.
- [x] **5. Combined Backend Test Inventory:**
  - Total across all 18 test files: **133 passed, 1 skipped, 0 failed**.
- [x] **6. Automated Browser QA Suite:**
  - Command: `python scripts/run_isolated_browser_qa.py`
  - Result: **32 / 32 PASSED (100%)** via Playwright Chrome 156 on isolated ports 8031 & 3001 with disposable database.
- [x] **7. Isolated PostgreSQL 18 Live Integration:**
  - Command: `python scripts/test_postgresql_isolated_live.py`
  - Result: **ALL 11 PHASES & 4 PYTEST SUITES PASSED (100%)** on disposable cluster port 5438.
- [x] **8. Hosted Neon Staging Acceptance:**
  - Command: `scripts/verify_hosted_staging.ps1`
  - Result: **10 / 10 CHECKS PASSED (100%)** on hosted Neon PostgreSQL. Retained acceptance artifact: `rule_6db288b87ba4`.
- [x] **9. Route Traceability & Documentation Sync:**
  - Exactly 39 registered API routes documented in `docs/34_BACKEND_FRONTEND_FEATURE_MATRIX.md`.
  - Reconciled numbers in `README.md`, `FINAL_STATUS.md`, and `docs/33_ROUND3_ACCEPTANCE_MATRIX.md`.
- [x] **10. Final Product Report & PDF Generated:**
  - Markdown Report: `docs/BRANDTRACE_ROUND3_FINAL_REPORT.md`
  - Polished PDF: `docs/BRANDTRACE_ROUND3_FINAL_PRODUCT.pdf` (8 pages, non-empty, verified via pypdf).
- [x] **11. UI Trust, Accuracy & Environment Classification Suite:**
  - Command: `python -m pytest backend/tests/test_ui_trust_and_accuracy.py -v`
  - Result: **6 passed, 0 failed** in 1.14s.
  - Verifies: Total elimination of runtime UI test counters, truthful environment resolution via `VITE_APP_ENV` and `/api/ready`, demo role simulation transparency, server-side permission enforcement, and elimination of ungrounded AI marketing claims.

---

## Part 2: Manual External Deployment Steps (TO BE PERFORMED BY USER)

Please execute the following steps in sequence to deploy and verify the public application:

### Step 1: Review Working Tree & Commit
- [ ] Review `git status` and `git diff` to confirm only intended files are included.
- [ ] Verify that no `.env` files with real credentials or database connection strings are staged.
- [ ] Commit the final documentation, report, PDF, and scripts:
  ```powershell
  cd C:\Projects\BRANDTRACE\BRANDTRACE
  git add docs/ scripts/generate_round3_pdf.py
  git commit -m "Round 3 final product report, documentation reconciliation, and release checklist"
  ```
- [ ] Push the commit to the authoritative remote repository:
  ```powershell
  git push origin main
  ```

### Step 2: Deploy Frontend & Backend
- [ ] **Vercel Frontend Deployment:**
  - Navigate to the Vercel dashboard for the project.
  - Trigger a new deployment from the latest `main` commit.
  - Confirm environment variables:
    - `VITE_API_BASE_URL`: The public URL of the deployed FastAPI backend service.
    - `VITE_APP_ENV`: Set to `staging` for hosted Neon staging or `production` for production (ensures accurate environment identification and prevents configuration warnings).
  - Wait for build and deployment completion.
- [ ] **Hosted Backend Verification (if using Render / Neon / Cloud Run):**
  - Verify that the backend service is healthy by visiting:
    - `https://<backend-url>/api/health` -> Expect: `{"status":"ok"}`
    - `https://<backend-url>/api/ready` -> Expect: `{"status":"ready","database":"postgresql"}`

### Step 3: Verify Public Site in Private / Incognito Window
- [ ] Open a clean **Private / Incognito** browser window (ensuring no cached cookies or local development tokens).
- [ ] Visit the public Vercel URL: `https://<your-vercel-app>.vercel.app/`
- [ ] Verify the following end-to-end judge experience:
  1. **Landing Page:** Hero title, value proposition, and dynamic `/api/ready` health probe render cleanly.
  2. **Judge Tour:** Click **"Take Judge Tour"** and step through all 7 walkthrough cards using keyboard arrows.
  3. **Workspace Navigation:** Click **"Enter Workspace"** to transition to `BrandtraceWorkspacePremium`.
  4. **Overview Dashboard:** Confirm KPI metric cards, Review Outcome Donut, Severity Stacked Bar, Evidence Status Chart, and Activity Timeline render with real data.
  5. **Brand Constitution:** Navigate to Constitution > Inspect active rules (`R-VOICE-01`, `R-TERM-02`, `R-TERM-03`), verified facts (`F-2026-01`), and asset registry.
  6. **Content Review:** Open draft `rev_launch_q4` or submit test copy (`Brandtrace is the best cheap platform.`).
  7. **Finding Action:** Inspect the Evidence Decision Chain on a finding and test dismissal or edit.
  8. **Approval Gate:** Confirm that the approval button blocks drafts with unresolved findings (HTTP 409).
  9. **Claim Impact Map:** Open Governance Insights > Claim Impact Map to inspect time-aware dependency cards.
  10. **Guideline Health:** Inspect guideline health telemetry meters, disagreement rate, and clarification suggestions.

---

## Part 3: Google Drive & Submission Form Steps (TO BE PERFORMED BY USER)

### Step 4: Upload PDF Report to Google Drive
- [ ] Locate the generated PDF:
  `C:\Projects\BRANDTRACE\BRANDTRACE\docs\BRANDTRACE_ROUND3_FINAL_PRODUCT.pdf`
- [ ] Open Google Drive in your browser.
- [ ] Upload `BRANDTRACE_ROUND3_FINAL_PRODUCT.pdf` to your designated hackathon submission folder.
- [ ] Right-click the uploaded file > **Share** > **General access**.
- [ ] Change from "Restricted" to **"Anyone with the link"**.
- [ ] Ensure permission role is set to **"Viewer"**.
- [ ] Click **Copy link**.
- [ ] **Incognito Validation:** Open a new Incognito window and paste the copied Google Drive link. Confirm that the 8-page PDF loads and is readable without prompting for a Google account login.

### Step 5: Complete Official Round 3 Submission Form
- [ ] Open the official CodeAxis Hackathon Round 3 Google Form.
- [ ] Fill in team metadata:
  - **Team Name:** `Team_Nexus`
  - **Track / Round:** `CodeAxis Hackathon — Round 3: The Final Build`
  - **Project Name:** `BRANDTRACE`
  - **Tagline:** `Evidence-Aware AI-Assisted Brand Governance Platform`
- [ ] Provide project links:
  - **Public Deployment URL:** `https://<your-vercel-app>.vercel.app`
  - **Public GitHub Repository URL:** `https://github.com/bindudharad/BRANDTRACE` (ensure public visibility)
  - **Google Drive PDF Report URL:** Paste the verified public Google Drive link from Step 4.
- [ ] Enter summary of the Three Major Round 3 Deliverables:
  - **1. Time-Aware Claim Ledger & Impact Map:** Fact validity windows with proactive 30-day expiration alerting, bi-directional dependency tracking in `evidence_dependencies`, interactive SVG impact graph, and surgical targeted re-review (`POST /api/governance/re-review-impact`). Verified via `test_scenario_a_claim_ledger_acceptance.py`.
  - **2. Multimodal Visual Brand Compliance:** Pure-Python document extraction (pypdf), 64KB bounded streaming guard, CIELAB Delta-E color distance, W3C WCAG 2.1 relative luminance contrast evaluation on design tokens (100% precision/recall across 6 benchmark pairs), and cryptographic SHA-256 asset registry. Verified via `test_scenario_b_visual_compliance_acceptance.py`.
  - **3. Guideline-Health Intelligence & Reviewer Feedback:** Reviewer disagreement telemetry, distinct-actor conflict detection, traceable clarification proposals citing real reviews, strict RBAC (reviewer triage, admin-only activation), and optimistic concurrency protection (`expected_rule_version` HTTP 409 guard). Verified via `test_scenario_c_guideline_health_acceptance.py`.
- [ ] Enter verified test numbers:
  - **Backend Tests:** 133 passed, 1 skipped across 18 test files (Python 3.10 / pytest).
  - **Browser QA:** 32 / 32 passed (100%) (Playwright Chrome 156).
  - **PostgreSQL Live Integration:** 100% passed on PostgreSQL 18 disposable cluster and 10/10 checks on hosted Neon staging.
- [ ] Submit the form once as the team leader before the deadline.
