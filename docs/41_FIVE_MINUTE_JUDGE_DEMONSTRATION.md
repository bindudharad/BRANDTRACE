# 41 — FIVE-MINUTE JUDGE DEMONSTRATION RUNBOOK
**Platform:** BRANDTRACE
**Status:** **VERIFIED JUDGE-READY**

---

| Timing | Action | What to Explain to Judges | Screen / View |
|---|---|---|---|
| **00:00–00:30** | Open Landing Page | Introduce the enterprise problem: unverified AI copy, missing evidence citations, and informal approvals. Introduce tagline: *Every finding has a source. Every decision has an owner.* | Landing Page (`/`) |
| **00:30–01:15** | Open **Brand Constitution** & **Claim Ledger** | Show active rules and facts (ISO 27001). Highlight the Digital Guideline Importer with human approval gate and Rule Conflict Detector. | Constitution & Ledger |
| **01:15–02:00** | Click **New Review** & prefill demo draft | Submit draft containing unverified claim `"best"` and missing required term `"Brandtrace"`. Emphasize deterministic-first rule matching. | Content Review |
| **02:00–03:00** | Inspect finding cards | Click the `"best"` finding card. Highlight the ground-truth citation (`Global Brand Guidelines`), exact coordinates, and neutral fix (`"effective"`). | Finding Drawer |
| **03:00–04:00** | Accept fix & dismiss finding | Click **Accept Replacement** to apply `"effective"` (zero word duplication). Dismiss contextual finding with reason. Show Version History preserving original copy. | Review Workspace |
| **04:00–04:30** | Attempt approval with blocker | Attempt compliance approval while a blocker remains. Show the server strictly rejecting approval with **HTTP 409 Conflict**. | Approval Gate |
| **04:30–05:00** | Resolve blocker & export packet | Resolve blocker with legal clearance reason. Click **Approve Draft** (Score 100). Click **Export Evidence Packet** to download signed PDF dossier. | Export Packet & Audit |
