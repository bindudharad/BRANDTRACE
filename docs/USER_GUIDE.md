# BRANDTRACE — Operator User Guide

This guide provides step-by-step instructions for operating the BRANDTRACE interface across all workspace panels.

---

## Workspace Navigation Overview

The BRANDTRACE workspace is organized into a clean sidebar with nine specialized views:

```
[Overview]             ── High-level governance health score & recent draft activity
[Brand Constitution]   ── Active brand voice rules, terminology standards, & prohibited phrases
[Evidence Ledger]      ── Approved institutional facts, valid timeframes, & proof citations
[Content Review]       ── Interactive review workbench, finding inspection, & exact-span editor
[Approval Queue]       ── Gated approval triage with server-enforced compliance blockers
[Version History]      ── Point-in-time document snapshots with one-click restore rollback
[Audit History]        ── Append-only chronological governance event log
[Governance Insights]  ── Recurring violation metrics, severity breakdown, & claim impact map
[Help & Demo]          ── Interactive walkthrough, sample content presets, & role switcher
```

---

## 1. Top Header & Role Simulation

The workspace header contains global controls:
- **Role Switcher Dropdown:** Allows testing different organizational permissions:
  - `Contributor`: Can submit drafts and view own reviews.
  - `Reviewer`: Can inspect findings, apply corrections, dismiss, or escalate issues.
  - `Brand Manager`: Authorized to execute final document approvals or request formal revisions.
  - `Brand Admin`: Full administrative access to modify brand rules and fact records.
- **Connection Indicator:** Displays live heartbeat connection to the FastAPI backend.
- **Demo Mode Pill:** Indicates that local mock data is in use and no live external cloud credentials are required.

---

## 2. Content Review Workbench

The **Content Review** panel is the primary workspace for evaluating marketing drafts.

### Submitting a New Draft:
1. Click the **"New Review"** button in the left review drawer.
2. Enter a campaign title (e.g., `Q3 Product Launch Announcement`).
3. Paste raw text copy into the editor or upload an external PDF document.
4. Click **"Submit for Governance Review"**.
5. The deterministic engine immediately evaluates the text, generating categorized findings and calculating the baseline **Health Score** (0–100 scale).

### Inspecting Findings:
- The right-hand panel displays all generated findings grouped by severity:
  - **Critical (Red):** Severe compliance violations (e.g., prohibited claims, legal exposure).
  - **High (Orange):** Missing mandatory legal disclaimers or exclusive contradiction claims.
  - **Medium (Yellow):** Tone superlatives and unsupported metric statements.
  - **Low (Blue):** Stylistic recommendations and readability notes.
- Click any finding card to highlight the exact offending passage in the draft copy.
- Inspect the **Evidence Block** to see the cited Rule ID (`R-VOICE-01`), Fact ID (`F-2026-01`), and source excerpt.

### Acting on Findings:
- **Accept Correction:** If the rule provides a suggested neutral replacement (e.g., `"best"` -> `"effective"`), clicking Accept immediately replaces the exact text span in the working draft.
- **Edit Draft:** Allows manual rewriting to address complex findings (such as incorporating a missing required term).
- **Dismiss with Reason:** For context-justified exceptions. Requires entering a mandatory justification note that is saved directly into the audit ledger.
- **Escalate:** Flags the finding for senior legal or brand manager attention. Escalation keeps the item penalized in the health score until formally resolved.

---

## 3. Approval Queue & Gated Sign-Off

The **Approval Queue** is restricted to `Brand Manager` and `Brand Admin` roles.

- Reviews with open **High** or **Critical** findings cannot be approved.
- Clicking **"Approve"** on a non-compliant draft triggers a server-side `HTTP 409 Conflict` blocking the transition and highlighting unresolved blockers.
- **Waiver Flow:** A Brand Manager may grant a policy waiver by checking "Document Exception Waiver" and providing a detailed justification. This unblocks approval while creating a permanent audit record of the exception.
- **Request Changes:** Sends the draft back to `CHANGES_REQUESTED` status with reviewer feedback notes.

---

## 4. Version History & Document Rollback

Every significant mutation creates an immutable version snapshot:
- `ORIGINAL_SUBMISSION`: Captures initial raw content.
- `FINDING_ACCEPT`: Created when a suggested one-click edit is accepted.
- `FINDING_EDIT`: Created when manual text modifications are saved.
- `RESTORED_VERSION`: Created whenever an earlier snapshot is rolled back.

To rollback to a previous state:
1. Select the review and click the **Version History** tab.
2. Review the chronological diffs between revisions.
3. Click **"Restore this Version"** on any prior snapshot.
4. The draft updates immediately, findings are re-evaluated, and a restoration audit event is recorded.

---

## 5. Audit History Ledger

The **Audit History** tab exposes the append-only event stream:
- Shows exact UTC timestamp, actor role, action code, and detailed payload.
- Provides compliance officers with irrefutable proof of who reviewed each claim and when approvals occurred.
- Cannot be cleared or modified via UI or API.

---

## 6. Governance Insights & Claim Impact Map

- **Recurring Violations:** Bar chart illustrating the most common policy infractions across the organization, helping identify where guidelines need clearer training.
- **Severity Breakdown:** Pie chart displaying distribution of open vs. resolved risks.
- **Claim Impact Map:** Shows the dependency tree between approved facts and active marketing drafts. When a fact expires or is modified, the impact map highlights all drafts requiring re-review.
