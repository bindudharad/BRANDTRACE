# End-to-End Reproducible Demonstration Script

This script provides a step-by-step walkthrough to demonstrate the core capabilities of BRANDTRACE. Every action is reproducible, with documented expected outcomes at each step.

---

## 1. System Launch & Initialization

### Terminal 1: Start Backend
```powershell
cd C:\Projects\BRANDTRACE\BRANDTRACE
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL = "sqlite:///./brandtrace.db"
$env:AI_PROVIDER = "offline"
uvicorn app.main:app --app-dir backend --port 8000
```
*Expected Outcome*: Server starts at `http://127.0.0.1:8000`. Navigating to `http://127.0.0.1:8000/api/health` returns `{"status":"ok","provider":"offline","version":"1.0.0"}`.

### Terminal 2: Start Frontend
```powershell
cd C:\Projects\BRANDTRACE\BRANDTRACE
npm run dev
```
*Expected Outcome*: Vite dev server starts at `http://localhost:3000/`.

---

## 2. Navigating to the Governance Workspace

1. Open `http://localhost:3000` in Google Chrome or Microsoft Edge.
2. Observe the **Evidence Prism**: A hardware-accelerated 3D prism rotates smoothly in the hero section, refracting spectral rays representing evidence states.
3. Click the primary call-to-action: **"Explore Workspace"** (or **"Launch Review Studio"**).
4. In the top navigation header, click **"Reset Demo Data"** to ensure a clean baseline state.
*Expected Outcome*: The workspace loads with seeded rules (`R-VOICE-01`, `R-TERM-02`, `R-TERM-03`), the approved fact `F-2026-01` ("Available in India"), and an initial demo draft.

---

## 3. Submitting a Multi-Violation Test Draft

1. In the Workspace Draft Editor, click **"New Review"** or clear the editor.
2. Enter the title: `"Q4 Global Launch Campaign"`
3. Paste the following test copy containing four distinct policy and evidence challenges:
   ```text
   Our platform is the best choice for fast growth. We deliver guaranteed results and 100% uptime for all teams. The service is available globally across all regions, offering a cheap solution for modern enterprises.
   ```
4. Click **"Run Governance Analysis"**.
*Expected Outcome*:
* The draft is ingested and the Governance Clearance Health Score drops sharply to **~42 / 100**.
* The findings list populates with discrete diagnostic cards.

---

## 4. Inspecting the Generated Findings

Review the surfaced findings:
1. **Passage: `"best choice"`** $\to$ Rule `R-VOICE-01` (Severity: `HIGH`, Status: `CONTRADICTED`). Cites "Brand Voice Standard".
2. **Passage: `"cheap"`** $\to$ Rule `R-TERM-03` (Severity: `HIGH`, Status: `CONTRADICTED`). Cites "Messaging Guide".
3. **Passage: `"Brandtrace"`** $\to$ Rule `R-TERM-02` (Severity: `MEDIUM`, Status: `UNSUPPORTED_BY_APPROVED_EVIDENCE`). Flags that the mandatory product name is missing.
4. **Passage: `"available globally"`** $\to$ Fact `F-2026-01` (Severity: `HIGH`, Status: `NEEDS_REVIEW`). Flags that approved evidence confirms India only, not global availability.
5. **Passage: `"guaranteed"`** $\to$ Heuristic triage (Severity: `MEDIUM`, Status: `NEEDS_REVIEW`). Flags promotional promise.

---

## 5. Accepting an Exact-Span Neutral Correction

1. Locate the finding card for `"best choice"`.
2. Inspect the suggested correction: `"effective choice"`.
3. Click **"Accept Correction"**.
*Expected Outcome*:
* The draft text immediately updates: `"Our platform is the effective choice for fast growth..."`.
* **Zero Word Duplication**: The surrounding word `"the"` is NOT duplicated (verifying no "the the effective" bug).
* The finding transitions to `ACCEPTED_EDIT`, clearing its 18-point penalty and raising the health score.
* A new snapshot is recorded in Version History.

---

## 6. Observing Missing Term Separation (No Editorial Hallucination)

1. Locate the finding card for Rule `R-TERM-02` ("Use platform name").
2. Observe that `suggested_correction` is `null` (displaying "Manual edit required").
*Expected Outcome*:
* The platform does NOT inject random editorial text into the draft.
* The reviewer is properly instructed that the author must incorporate "Brandtrace" directly into the copy.

---

## 7. Dynamic Re-Evaluation via Manual Edit

1. In the draft editor, edit the first sentence to include the mandatory term:
   ```text
   Brandtrace is the effective choice for fast growth...
   ```
2. Click **"Save Edits"**.
*Expected Outcome*:
* The backend (`Guard 3`) detects that "Brandtrace" is now present.
* Finding `R-TERM-02` automatically updates to `SUPPORTED` and `ACCEPTED_EDIT`.
* The score increases automatically.

---

## 8. Verifying Data Integrity Guards

1. Click on the finding for `"cheap"` and click **"Manual Edit"**.
2. In the replacement field, type: `"QA: Approved by legal ticket #102"`.
3. In the reason field, type: `"QA: Approved by legal ticket #102"`.
4. Click submit.
*Expected Outcome*:
* The backend strictly rejects the edit with `HTTP 422 Unprocessable`.
* A notification alert informs the user that draft content cannot equal the disposition reason (`Guard 1`) and cannot contain QA prefixes (`Guard 2`). The draft text remains uncontaminated.

---

## 9. Testing the Server-Side Approval Gate (HTTP 409)

1. Notice that the finding for `"cheap"` remains unresolved (`HIGH` severity).
2. Attempt to bypass this by clicking **"Approve Draft"** in the approval bar.
*Expected Outcome*:
* The backend refuses the approval, returning an explicit `HTTP 409 Conflict`.
* An alert modal or toast notifies the user:
  > *"High-risk findings (1 unresolved: 'cheap' (forbidden_term)) must be resolved before approval or waiver."*
* The draft status remains locked at `IN_REVIEW`.

---

## 10. Finding Dismissal with Mandatory Reason

1. Switch active role in the header to **Reviewer**.
2. On the `"cheap"` finding card, click **"Dismiss Finding"**.
3. Enter the reason: `"Permitted in the context of comparative competitive analysis."`
4. Click confirm.
*Expected Outcome*:
* The finding transitions to `DISMISSED`.
* The health score restores the 18 points.
* The audit trail records the dismissal alongside the reviewer's justification.

---

## 11. Final Review Approval

1. Switch active role in the header to **Brand Admin**.
2. With all high-risk findings resolved, click **"Approve Draft"**.
*Expected Outcome*:
* The approval gate verifies zero unresolved `HIGH`/`CRITICAL` issues.
* The draft status transitions to **`APPROVED`**.
* The health score displays a perfect **100 / 100**.
* An immutable `APPROVAL_APPROVE` record is written to the audit log.

---

## 12. Inspecting Audit Trail & Version History

1. Click the **"Audit History"** tab in the workspace.
   * *Expected Outcome*: Chronological timeline displays every event: `REVIEW_CREATED`, `FINDING_ACCEPT`, `FINDING_EDIT`, `FINDING_DISMISS`, and `APPROVAL_APPROVE` with actor roles, timestamps, and justifications.
2. Click the **"Version History"** tab.
   * *Expected Outcome*: Displays every snapshot version from initial submission to the final approved draft. Click **"Restore Version 1"** to observe instantaneous draft rollback and compliance re-analysis.

---

## 13. Inspecting the Claim Impact Map

1. In the navigation bar, click **"Claim Impact Map"**.
*Expected Outcome*:
* The dependency graph displays active corporate facts.
* Shows how modifying or expiring Fact `F-2026-01` directly flags all drafts referencing Indian or global availability.

---

## 14. Testing Document Ingestion (PDF)

1. Click **"Upload Asset"**.
2. Select a PDF document containing marketing copy.
3. Click **"Upload and Analyze"**.
*Expected Outcome*:
* The backend `pdf_parser` extracts the text layer using `pypdf`.
* A new review draft is generated immediately, populated with the document's text and analyzed for brand compliance.
