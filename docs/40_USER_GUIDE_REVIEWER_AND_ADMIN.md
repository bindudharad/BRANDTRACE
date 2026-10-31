# 40 — USER GUIDE: REVIEWER AND BRAND ADMINISTRATOR
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Compliance Reviewer Operations
- **Review Queue:** Inspect assigned reviews sorted by priority (`URGENT`, `HIGH`, `MEDIUM`, `LOW`).
- **Dismissing Findings:** If a flagged phrase is contextually authorized under a specific contract, select **Dismiss with Reason**, input mandatory justification ($\ge 5$ chars), and confirm.
- **Collaborative Notes:** Open the **Comments Panel** to leave internal notes or tag colleagues.

---

## 2. Brand Administrator Operations
- **Brand Constitution Management:** Navigate to **Brand Constitution** to create rules, configure required terms, and sunset obsolete policies.
- **Claim Ledger Management:** Navigate to **Claim Ledger** to register factual claims, assign owners, and set ISO validity windows.
- **Guideline PDF Importer:** Click **Import Guidelines** to ingest a digital PDF manual and approve extracted candidate rules.
- **Final Compliance Approval:** Click **Approve Draft**. If unresolved high-risk findings exist, the server blocks approval (HTTP 409). Once resolved, approval transitions the draft to `APPROVED` (Score 100).
- **Compliance Export:** Click **Export Evidence Packet** to download the auditor-ready signed PDF dossier.
