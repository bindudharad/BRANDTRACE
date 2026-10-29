# BRANDTRACE — Hackathon Judge Demo Script

This script guides judges through an end-to-end evaluation of the BRANDTRACE brand governance platform. The demo runs 100% locally on Windows with zero external API key requirements.

---

## 1. Quick Launch (PowerShell)

### Terminal 1: Backend API (FastAPI)
```powershell
cd C:\Projects\BRANDTRACE\BRANDTRACE
python -m uvicorn app.main:app --app-dir backend --port 8000 --reload
```
*Health check:* [`http://127.0.0.1:8000/api/health`](http://127.0.0.1:8000/api/health)  
*Interactive Swagger Docs:* [`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs)

### Terminal 2: Frontend Client (Vite / React)
```powershell
cd C:\Projects\BRANDTRACE\BRANDTRACE
npm run dev
```
*Open application:* [`http://localhost:3000`](http://localhost:3000)

---

## 2. Step-by-Step Evaluation Walkthrough

### Step 1: System Overview & Active Standards
1. Open [`http://localhost:3000`](http://localhost:3000).
2. The **Overview** dashboard loads automatically, showing metrics derived directly from the SQLite database: Total Reviews, Open Findings, Approval Queue, and Approved Drafts.
3. Observe the **Active Brand Guidelines** card displaying the primary brand colour (`#0f766e`), secondary accent (`#2dd4bf`), and WCAG AA contrast threshold (`4.5:1`).

### Step 2: Brand Constitution & Claim Ledger
1. Click **Brand Constitution** in the left sidebar.
2. View the **Approved Brand Rules** tab:
   - Rule `R-VOICE-01`: Prohibits superlative term `"best"` with citation to *Brand Voice Standard*.
   - Rule `R-TERM-02`: Requires correct capitalization of `"Brandtrace"` in copy.
   - Rule `R-TERM-03`: Forbids `"cheap"` with citation to *Messaging Guide*.
3. Click the **Claim Ledger & Verified Facts** tab:
   - Inspect fact `F-2026-01`: Verified assertion `Available in India` with owner *Product Marketing* and validity expiration date.
4. Click **Visual Brand Profile** to review color swatches and the 3.0:1 logo aspect ratio fixture.
5. Click **+ Add Brand Rule** to test adding a custom rule (e.g., prohibiting a competitor term).

### Step 3: Content Review & Evidence Grounding
1. Click **Content Review** in the sidebar.
2. In the text submission form, click **Prefill Test Sample**. It populates:
   > *"Brandtrace is the best cheap governance platform on the market today. It is always available in India with zero risk."*
3. Click **Start Evidence Review**.
4. The server evaluates the draft and presents structured findings in the right panel:
   - **`CONTRADICTED`**: Flags `"best"` (High Severity) with citation to *Brand Voice Standard (R-VOICE-01)*.
   - **`CONTRADICTED`**: Flags `"cheap"` (High Severity) with citation to *Messaging Guide (R-TERM-03)*.
   - **`NEEDS_REVIEW`**: Flags promotional assertions `"always"` and `"zero risk"` via offline triage without hallucinating fake citation IDs.
   - Notice the health score dynamically calculated based on finding severities.

### Step 4: Server-Side Approval Gate (Enforcing Policy)
1. Scroll to the bottom of the findings panel and click **Approve Review**.
2. **Expected Behavior**: The approval fails with an error notification:
   > *"High-risk findings (2 unresolved) need a human disposition before approval or waiver."*
   *(The server returns a strict HTTP `409 Conflict`—no draft with unresolved high-risk findings can be approved).*

### Step 5: Resolving Findings & Executing Approval
1. On finding `R-VOICE-01` (`"best"`): Click **Accept Edit** to replace it with approved neutral wording.
2. On finding `R-TERM-03` (`"cheap"`): Enter a justification in the reason field (e.g., *"Approved cost exception for Q4 campaign"*) and click **Dismiss with Reason**.
3. On the `"always"` finding: Click **Edit Manually**, replace with `"frequently"`, enter reason *"Softened absolute claim"*, and click **Apply Manual Edit**.
4. Now that all high-risk findings have explicit dispositions, click **Approve Review**.
5. The review status updates to **`APPROVED`**.

### Step 6: Immutable Version Store & Version Restoration
1. In the review panel, switch from the **Compliance Findings** tab to the **Draft Revisions** tab.
2. Observe the full immutable version history: the original submission and every subsequent edit are preserved.
3. Click **Restore This Revision** on the initial submission to verify that prior drafts can be rolled back safely with automatic re-analysis.

### Step 7: Multimodal File Review (PDF & Images)
1. On the **Content Review** screen, switch from **Direct Text** to **Upload File (PDF / Image)**.
2. Select any text-bearing PDF:
   - BRANDTRACE extracts the text with exact page boundaries (`[Page 1]`, `[Page 2]`) and executes governance checks.
3. Select an image (PNG or JPEG):
   - BRANDTRACE uses Pillow to extract dominant color palettes and measures perceptual distance (CIELAB Delta-E) against approved brand colors.
   - Evaluates W3C WCAG 2.1 relative luminance contrast between foreground and background.
   - Inspect the resulting visual findings directly in the review panel alongside copy findings.

### Step 8: Role Simulator & Permission Enforcement
1. Locate the **Simulated Role** dropdown in the top header.
2. Switch role from **Reviewer** to **Creator**.
3. Try to dismiss a finding or approve a draft: the backend rejects the action with `403 Forbidden` (*"Reviewer or Brand Admin role is required"*).
4. Switch role to **Auditor**: try to submit a draft or perform actions; the backend enforces strict read-only access.
5. Switch role to **Brand Admin** to regain full configuration authority.

### Step 9: Reconstructable Audit Trail
1. Click **Audit History** in the left sidebar.
2. Select the review you evaluated.
3. Inspect the chronological timeline: every creation event, finding edit, dismissal reason, restored version, and approval timestamp is permanently recorded with actor identity and role.

### Step 10: Governance Insights & Rule-Change Impact Map
1. Click **Governance Insights** in the sidebar.
2. Review the **Recurring Policy Findings** and **Candidate Rules for Clarification** charts.
3. Inspect the **Time-Aware Claim Ledger & Rule-Change Impact Map**:
   - Displays approved facts or rules that have expired or updated, listing every historical draft dependent on them.
   - Click **Trigger Targeted Re-Review** to automatically move affected drafts back to `CHANGES_REQUESTED` with an immutable audit entry.
