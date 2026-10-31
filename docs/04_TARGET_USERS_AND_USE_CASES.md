# 04 — TARGET USERS AND USE CASES
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Target User Personas

| Persona | Organizational Role | Core Responsibilities | Key BRANDTRACE Modules |
|---|---|---|---|
| **Content Creator** | Internal Marketer, Copywriter, External Agency | Drafts campaigns, announcements, blog posts, product sheets | Content Review, Exact-Span Fixes, Version History |
| **Compliance Reviewer** | Legal Counsel, Brand Governance Officer | Evaluates flagged violations, inspects provenance, verifies claims | Review Queue, Finding Actions, Comments Panel |
| **Brand Administrator** | VP Brand, Head of Marketing Operations | Defines brand constitution, maintains claim ledger, authorizes releases | Brand Constitution, Claim Ledger, Impact Map, Admin Approval Gate |
| **Auditor / Evaluator** | Internal Audit, External Regulatory Assessor | Reviews historical compliance records and evidence dossiers | Audit Trail, Evidence Export (PDF/JSON) |

---

## 2. Real-World Use Cases

### Use Case 1: Q4 Product Launch Campaign Triage
- **Context:** An agency submits promotional copy claiming: *"Brandtrace is the best and cheap solution. We maintain ISO 27001 Security Certification."*
- **Workflow:**
  1. Creator submits text via `POST /api/reviews`.
  2. Engine flags `"best"` (prohibited superlative) and `"cheap"` (unapproved price terminology).
  3. Reviewer inspects ground-truth excerpt: *"Do not claim to be the 'best' without third-party proof."*
  4. Reviewer clicks **Accept Replacement**, applying `"effective"` with zero word duplication.
  5. Reviewer dismisses `"cheap"` citing promotion license exception.
  6. Admin signs off; review transitions to `APPROVED` (Score 100).

### Use Case 2: Expired Security Certification Impact Revocation
- **Context:** Annual recertification for ISO 27001 lapses.
- **Workflow:**
  1. The automated expiry worker detects `facts.expires_at < now()`.
  2. The Governance Impact Map identifies all previously approved campaigns referencing the ISO fact.
  3. Targeted re-review automatically transitions dependent approved drafts to `CHANGES_REQUESTED`.
  4. Automated audit log records `EXPIRY_RE_REVIEW_TRIGGERED` and alerts assigned reviewers.
