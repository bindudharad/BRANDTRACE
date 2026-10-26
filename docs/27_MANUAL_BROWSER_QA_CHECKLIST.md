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
| **QA-01** | **Hero & Enterprise Header** | Load `http://localhost:3000`. Observe top navigation and hero. | Header shows Brandtrace logo, navigation links (`How it Works`, `Modules`, `Architecture`, `Traceability`, `Round 3`), live API status pill, and primary CTA. | [ ] |
| **QA-02** | **Connected System Architecture Map** | In the Hero section, click on any of the 7 interactive system nodes (e.g. *Deterministic Rule Engine*, *Claim Ledger*). | Node becomes highlighted, connection paths light up, and the inspection drawer below updates with node responsibilities, inputs, and outputs. | [ ] |
| **QA-03** | **Workspace Navigation** | Click **"Enter the Workspace"** or **"Launch Review Studio"**. | Navigation transitions to `BrandtraceWorkspacePremium`. Deep forest green sidebar, clean white cards, and overview metrics are displayed. | [ ] |
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
| **QA-21** | **Responsive Viewport & Mobile Menu** | Resize browser window to mobile width ($375\text{px}$). | Layout collapses to single column. Header switches to mobile drawer. Score gauge collapses into sticky compact header. All buttons remain accessible. | [ ] |
| **QA-22** | **Keyboard Navigation** | Use `Tab` and `Shift+Tab` across finding action buttons and inputs. | High-contrast focus rings appear cleanly on every interactive element. Forms can be submitted using `Enter`. | [ ] |
| **QA-23** | **Brand Asset Registry (Round 3)** | Navigate to **Brand Assets** in workspace sidebar. Register a test logo asset. | Asset appears in registered list with SHA-256 hash preview, asset type, and license notes. Only `brand_admin` role can register/delete. | [ ] |
| **QA-24** | **Impact Map & Expiring-Soon Badge (Round 3)** | Navigate to **Claim Impact Map** in workspace sidebar. Observe item statuses. | Items within 30 days show amber `EXPIRING_SOON` badge. Hard-expired items show red `EXPIRED` badge. Click **"Re-review"** to re-analyze affected drafts. | [ ] |
| **QA-25** | **Guideline Health Telemetry (Round 3)** | Open **Governance Insights** tab. Locate the **Guideline Health Intelligence** section. | Displays rule health cards with affected draft counts, breakdown of accepted/dismissed actions, reviewer disagreement badges, and data confidence ratings. | [ ] |
| **QA-26** | **Rule Clarification Reviews (Round 3)** | On a rule with a proposed clarification in Guideline Health, click **"Accept"**, **"Defer"**, or **"Reject"**. | Suggestion status updates dynamically via `POST /api/governance/rule-suggestions/{id}` without mutating the production rule. | [ ] |
| **QA-27** | **Fact Notes Field (Round 3)** | In Brand Constitution, add a new fact and populate the optional **"Operational Notes"** field. | Notes field persists to SQLite/PostgreSQL and renders within the fact card details. | [ ] |
