# 10 — USER STORIES AND ACCEPTANCE CRITERIA
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## User Stories by Persona

### 1. Content Creator
- **US-01: Document Submission & Instant Triage**
  - *Story:* As a Content Creator, I want to submit campaign copy or upload a PDF, so that I receive immediate, actionable feedback on brand guideline violations.
  - *Acceptance Criteria:* Document submits in $< 1 	ext{ s}$; flagged passages highlight exact coordinates; clearance score updates dynamically.
- **US-02: Exact-Span Replacement**
  - *Story:* As a Content Creator, I want to accept suggested corrections with one click, so that my copy is fixed without duplicating surrounding words.
  - *Acceptance Criteria:* Accepted fix updates draft text with zero word duplication; prior draft preserved in revision history.

### 2. Compliance Reviewer
- **US-03: Evidence Provenance Inspection**
  - *Story:* As a Compliance Reviewer, I want to see the exact policy excerpt justifying each finding, so that I don't have to manually search through PDF manuals.
  - *Acceptance Criteria:* Finding card displays source title, page number, and ground-truth excerpt.
- **US-04: Finding Dismissal with Mandatory Reason**
  - *Story:* As a Compliance Reviewer, I want to dismiss contextual false positives with documented justification, so that the clearance score is restored while preserving auditability.
  - *Acceptance Criteria:* Dismissal requires reason text ($\ge 5$ chars); penalty cleared; audit record created.

### 3. Brand Administrator
- **US-05: Server-Side Approval Gate**
  - *Story:* As a Brand Administrator, I want the system to block approval when high-risk findings remain open, so that non-compliant copy cannot be mistakenly published.
  - *Acceptance Criteria:* Backend returns HTTP 409 Conflict if unresolved high-risk findings exist; approval succeeds once resolved.
- **US-06: Expiry Impact Monitoring**
  - *Story:* As a Brand Administrator, I want to see which approved drafts depend on expiring facts, so that our organization avoids advertising outdated claims.
  - *Acceptance Criteria:* Impact Map flags dependent reviews; targeted re-review revokes status to `CHANGES_REQUESTED`.
