# 24 — GUIDELINE HEALTH INTELLIGENCE & TELEMETRY
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Continuous Policy Feedback

Brand guidelines that trigger constant false positives or are routinely dismissed by reviewers create organizational friction. The Guideline Health module (`backend/app/main.py::get_guideline_health`) aggregates review outcomes to provide actionable policy intelligence:
- **Finding Volume:** Total violations flagged per rule across all submissions.
- **Dismissal Rate:** Percentage of findings dismissed by reviewers with authorized justifications.
- **Reviewer Disagreement:** Identifies rules where distinct compliance reviewers take contradictory actions on similar passages.
- **Data Confidence:** Labeled as `SUFFICIENT` ($\ge 3$ reviews) or `INSUFFICIENT` ($< 3$ reviews).

---

## 2. Clarification Suggestions & Admin Approval Gate

When high friction is detected, the engine generates a structured clarification proposal (`rule_suggestions` table). To prevent unvetted policy drift, suggestions **never** modify the Brand Constitution automatically. An authorized administrator must review and approve the proposal via `POST /api/rule-suggestions/{id}/action`.
