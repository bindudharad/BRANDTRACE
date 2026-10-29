# Manual Browser Quality Assurance Checklist

This checklist provides a structured, reproducible verification protocol for testing the BRANDTRACE user interface and backend integration in a live browser.

---

## Pre-Test Verification Setup

1. Open PowerShell and start the backend:
   ```powershell
   cd C:\Projects\BRANDTRACE\BRANDTRACE
   .\.venv\Scripts\Activate.ps1
   uvicorn app.main:app --app-dir backend --port 8000
   ```
2. In a second window, start the frontend:
   ```powershell
   cd C:\Projects\BRANDTRACE\BRANDTRACE
   npm run dev
   ```
3. Open Google Chrome or Microsoft Edge at `http://localhost:3000`.

---

## Interactive QA Test Protocol

| Test ID | Test Scenario | Step-by-Step Actions | Expected Observable Behavior | Pass / Fail |
| :---: | :--- | :--- | :--- | :---: |
| **QA-01** | **Hero & Three.js Canvas** | Load `http://localhost:3000`. Observe 3D Prism in hero section. | The 3D Prism smoothly rotates, rendering refractive spectral rays. Background buttons remain clickable. | [ ] |
| **QA-02** | **Reduced Motion Support** | Enable "prefers-reduced-motion" in DevTools (Rendering tab). | The 3D Prism immediately stops rotating, rendering a stable static accessible view. | [ ] |
| **QA-03** | **Workspace Navigation** | Click **"Explore Workspace"** or **"Launch Review Studio"**. | Navigation transitions to `BrandtraceWorkspacePremium`. Overview metrics and draft editor are displayed. | [ ] |
| **QA-04** | **Demo Reset / Setup** | In the header or settings, trigger **"Reset Demo Data"**. | Draft `rev_launch_q4` is loaded with baseline findings. Baseline rules (`R-VOICE-01`, `R-TERM-02`, `R-TERM-03`) are populated. | [ ] |
| **QA-05** | **Fresh Draft Submission** | Submit text: `"Brandtrace is the best and cheap way to verify claims in India."` | Review is created. Health score drops (~54/100). Findings are generated for `best` (`R-VOICE-01`) and `cheap` (`R-TERM-03`). | [ ] |
| **QA-06** | **Neutral Correction (No Duplication)** | On the `best` finding card, click **"Accept Correction"** (`best` $\to$ `effective`). | The draft content updates to `"Brandtrace is the effective and cheap..."`. Verify **no duplicate words** (e.g. not "the the"). Score increases. | [ ] |
| **QA-07** | **Missing Required Term** | Submit draft lacking the word "Brandtrace": `"Our tool helps teams verify claims."` | Finding created: `R-TERM-02` (Missing approved term). Note that suggested correction is `null` (no automated editorial injection). | [ ] |
| **QA-08** | **Dynamic Term Re-evaluation** | Edit the draft in QA-07 to include the word `"Brandtrace"`. Click save. | Finding `R-TERM-02` automatically updates to `SUPPORTED` and `ACCEPTED_EDIT`. Health score restores points automatically. | [ ] |
| **QA-09** | **Geographic Broad Claim Triage** | Submit draft: `"Brandtrace is available globally across all regions."` | Finding created with status `NEEDS_REVIEW` (not `CONTRADICTED`), explaining that approved fact `F-2026-01` confirms India only. | [ ] |
| **QA-10** | **Guaranteed Claim Handling** | Submit draft: `"We provide guaranteed results for all users."` | Finding created for promotional promise. Suggested correction is `null` (verifying no ungrammatical replacement like "committed to"). | [ ] |
| **QA-11** | **Guard 1: Contamination Rejection** | Attempt manual edit where replacement text is identical to the reason string. | Backend rejects action with `HTTP 422`. Toast alert notifies user of data integrity error. Draft content remains unchanged. | [ ] |
| **QA-12** | **Guard 2: QA Metadata Rejection** | Attempt edit with text: `"Manual QA: Approved by John on 10/24"`. | Backend rejects action with `HTTP 422`. Toast alert informs user that QA comments cannot replace publishable copy. | [ ] |
| **QA-13** | **Approval Gate Block (HTTP 409)** | Attempt to approve draft while high-risk finding `cheap` remains unresolved. | Approval is **blocked**. Red alert modal or toast displays `HTTP 409 Conflict` listing the unresolved blocking finding. Status stays `IN_REVIEW`. | [ ] |
| **QA-14** | **Finding Dismissal with Reason** | Switch role to `reviewer`. Dismiss finding `cheap` with reason: `"Permitted for competitive quote."` | Finding transitions to `DISMISSED`. Health score penalty is cleared. Audit record logs dismissal with reason. | [ ] |
| **QA-15** | **Successful Final Approval** | With all high-risk findings resolved, click **"Approve Draft"** as `brand_admin`. | Draft status transitions to `APPROVED`. Health score is 100/100. Approval audit record is generated. | [ ] |
| **QA-16** | **Version History & Rollback** | In the Workspace, open the **Version History** drawer. Click **"Restore Version 1"**. | Draft text rolls back to original submission. Analysis re-executes, re-flagging findings. Audit logs `VERSION_RESTORED`. | [ ] |
| **QA-17** | **Audit Trail Completeness** | Open the **Audit History** tab. Inspect the logged timeline. | Chronological list shows all events: `REVIEW_CREATED`, `FINDING_ACCEPT`, `FINDING_DISMISS`, `APPROVAL_APPROVE`, `VERSION_RESTORED`. | [ ] |
| **QA-18** | **Document Upload (PDF)** | Upload a valid PDF file containing marketing copy. | Backend extracts text layer via `pypdf`. Review is created, and findings are flagged against document text. | [ ] |
| **QA-19** | **Image Upload & WCAG Palette** | Upload a PNG image asset via the upload tab. | Canvas Color Inspector displays extracted 6-color palette, Delta-E distance to brand teal, and measured WCAG contrast ratio. | [ ] |
| **QA-20** | **Role Simulation Restriction** | Switch role to `contributor`. Attempt to dismiss a finding or approve draft. | Action is forbidden (`HTTP 403`). Notification informs user that Contributor lacks compliance sign-off authority. | [ ] |
| **QA-21** | **Responsive Viewport** | Resize browser window to mobile width ($375\text{px}$). | Layout collapses to single column. Score gauge collapses into sticky compact header. All buttons remain accessible. | [ ] |
| **QA-22** | **Keyboard Navigation** | Use `Tab` and `Shift+Tab` across finding action buttons and inputs. | High-contrast 2px teal focus rings appear cleanly on every interactive element. Forms can be submitted using `Enter`. | [ ] |
