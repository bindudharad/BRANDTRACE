# Release and Submission Readiness Checklist

This checklist defines the formal quality and compliance verification gates required prior to cutting a release or submitting the BRANDTRACE platform for hackathon or production review.

---

## Pre-Flight Verification Matrix

| Verification Gate | Command / Inspection Procedure | Target Criteria | Status |
| :--- | :--- | :--- | :---: |
| **1. Backend Pytest Suite** | `python -m pytest backend/tests -v` | **75 passed, 1 skipped** (0 failed) | ✅ PASS |
| **2. API Smoke Test** | `python scripts/smoke_test.py` | **27/27 passed** (0 failed) | ✅ PASS |
| **3. Static Type Analysis** | `npx tsc --noEmit` | **0 errors, 0 warnings** | ✅ PASS |
| **4. Production Build** | `npm run build` | **Build succeeds**; `dist/index.html` prerendered | ✅ PASS |
| **5. Secret Leak Audit** | `git diff --staged` & grep for `AIzaSy` | **Zero credentials or API keys committed** | ✅ PASS |
| **6. Gitignore Completeness**| Verify `.env`, `*.db`, `node_modules`, `.venv` | **All local state ignored** | ✅ PASS |
| **7. Third-Party Notices** | Inspect `THIRD_PARTY_NOTICES.md` | **All open-source licenses documented** | ✅ PASS |
| **8. Documentation Inventory**| Inspect `docs/*.md` | **All 35 documentation files present** | ✅ PASS |
| **9. Demo Seeding Route** | `curl -X POST http://localhost:8000/api/demo/setup` | **HTTP 200** with seeded rules/facts | ✅ PASS |
| **10. Approval Gate Guard** | Verify approval blocked on unresolved HIGH findings | **HTTP 409 Conflict** strictly returned | ✅ PASS |
| **11. Anti-Tampering Guards**| Verify Guard 1 (reason!=rep) & Guard 2 (QA prefix) | **HTTP 422 Unprocessable** strictly returned | ✅ PASS |
| **12. Audit History Capture** | Verify `GET /api/reviews/{id}/audit` returns records | **Append-only log non-empty** | ✅ PASS |
| **13. Known Limitations** | Inspect `33_KNOWN_LIMITATIONS.md` | **All release boundaries transparently stated** | ✅ PASS |
| **14. README Accuracy** | Inspect root `README.md` | **Setup commands and architecture align** | ✅ PASS |

---

## Detailed Step-by-Step Release Verification

### 1. Test Suite Verification
Execute the test commands from PowerShell:
```powershell
cd C:\Projects\BRANDTRACE\BRANDTRACE
.\.venv\Scripts\Activate.ps1
python -m pytest backend/tests -v
```
*Criteria*: Ensure 75 tests pass and 1 test (`test_live_provider_configuration_status`) skips cleanly due to absent live API keys.

### 2. End-to-End Smoke Test
```powershell
python scripts/smoke_test.py
```
*Criteria*: All 12 test sections pass, printing `Results: 27/27 passed, 0 failed`.

### 3. Frontend Static Analysis & Bundling
```powershell
npx tsc --noEmit
npm run build
```
*Criteria*: TypeScript compiler exits cleanly with zero errors. Vite creates `dist/assets/` and prerenders static HTML. The chunk size warning (>500 kB for Three.js/vendor bundle) is acknowledged as non-fatal.

### 4. Repository Cleanliness & Secret Audit
Ensure sensitive environment variables, credentials, and virtual environment files are excluded:
```powershell
# Verify no staged API keys or passwords
git diff --staged | Select-String -Pattern "AIzaSy|password|secret"
# Verify git status has no stray untracked binaries
git status
```
Confirm `.gitignore` contains:
```
node_modules/
.venv/
__pycache__/
*.pyc
*.db
*.db-journal
.env
dist/
.pytest_cache/
```

### 5. Architectural Integrity Check
Before releasing:
* Verify that changing draft text automatically creates a new row in `review_versions`.
* Verify that clicking "Accept Correction" on a prohibited term does not duplicate surrounding words.
* Verify that missing required terms do not have speculative editorial replacements.
* Verify that the Claim Impact Map identifies drafts impacted by expired facts.
