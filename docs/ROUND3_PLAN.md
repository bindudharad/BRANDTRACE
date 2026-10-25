# BRANDTRACE — Round 3 Architecture & Implementation Roadmap

This document outlines the three planned major additions for Round 3, detailing the foundational capabilities delivered in Round 2, the user value, technical architecture, and measurable acceptance criteria for Round 3.

---

## 1. Time-Aware Claim Ledger & Rule-Change Impact Map

### User Value
Brand governance managers need automated visibility when approved facts or guidelines reach their expiration date or are superseded. When a product claim changes (e.g. pricing, uptime guarantee, geographic availability), the platform must immediately pinpoint every published or in-flight asset relying on that obsolete fact and trigger targeted re-review.

### Delivered in Round 2
- Fact expiration date modeling (`expires_at`, `review_at`).
- Automatic `OUTDATED` status assignment when content references expired sources.
- Server-side dependency mapping (`calculate_impact_map()`) identifying historical drafts that cited an expired or modified fact/rule.
- Interactive Impact Map UI in the Governance Insights workspace with a manual targeted re-review trigger (`/api/governance/re-review-impact`).

### Round 3 Technical Scope
1. **Automated Asynchronous Change Worker**: A Celery/APScheduler background job running on a cron schedule to evaluate expiry dates and queue re-reviews automatically.
2. **Webhook & Notification Integrations**: Webhook dispatchers sending real-time alerts to Slack, Microsoft Teams, and creator emails when an asset they authored is flagged due to an upstream policy change.
3. **Targeted In-line Diff Highlighting**: Highlighting the exact passage in historical drafts where the expired claim was used, displaying a side-by-side diff with the updated approved fact.

### Measurable Acceptance Criteria
- When an administrator updates an approved fact value or sets `expires_at < now()`, an automated background task executes within 30 seconds.
- Exactly all historical drafts containing the cited fact ID or assertion value are transitioned to `CHANGES_REQUESTED`.
- Audit logs record an automated `IMPACT_REREVIEW_TRIGGERED` event citing the changed fact ID and previous vs new version.

---

## 2. Multimodal Visual Compliance Engine

### User Value
Creative directors and brand consistency teams need automated validation of marketing graphics, banner ads, and visual presentations to ensure color accuracy, typography hierarchy, and accessibility without slowing down agency turnaround.

### Delivered in Round 2
- Safe image upload and parsing via Pillow with dimension bounds (max 4096×4096px).
- Deterministic dominant color palette extraction.
- Perceptual colour difference calculations using CIELAB Delta-E (CIE76) against approved brand colors with a configurable tolerance threshold.
- Deterministic W3C WCAG 2.1 relative luminance contrast ratio calculations (`(L1+0.05)/(L2+0.05)`).
- Logo aspect ratio fixture validation.
- Transparent reporting of OCR engine availability without false passes.

### Round 3 Technical Scope
1. **Spatial Multi-Region Segmentation**: Use OpenCV / lightweight semantic segmentation to segment images into background canvas, text overlay regions, and brand iconography regions prior to color extraction.
2. **Licensed Asset Watermarking & Template Matching**: Implement perceptual hashing (pHash) and ORB feature matching to verify approved logo usage, exclusion zones (clearspace), and minimum sizing.
3. **Typography & Font Identifier**: Integrate a lightweight, local ONNX runtime model to identify rendered fonts in graphics and validate them against approved brand typography families (e.g. Inter, Lexend).

### Measurable Acceptance Criteria
- Synthetic test fixtures with known foreground/background text regions achieve 100% precision in contrast ratio measurement against the WCAG 2.1 formula.
- Logo orientation and clearspace violations are detected with measured recall > 95% on branded benchmark test suites.
- Font family classification reports top-3 predictions with confidence scores; unclassified fonts explicitly prompt for manual human verification.

---

## 3. Guideline Health & Governance Intelligence

### User Value
Corporate policy and brand guidelines frequently become bloated, contradictory, or disconnected from practical marketing needs. Brand administrators need data-driven intelligence showing which guidelines generate friction, high dismissal rates, or reviewer disagreement so rules can be continuously clarified.

### Delivered in Round 2
- Real-time aggregation of recurring violation categories.
- Severity and evidence status distributions.
- Tracking of reviewer dispositions (`ACCEPTED_EDIT`, `EDITED`, `DISMISSED`, `ESCALATED`, `WAIVED`).
- Candidate rule identification surfacing rules with disproportionate dismissal or `NEEDS_REVIEW` rates.

### Round 3 Technical Scope
1. **Rule Friction Index**: A composite score calculating `(Dismissals + Overrides) / Total Triggers` per rule. Rules exceeding a 30% friction index are automatically flagged for policy review.
2. **AI-Assisted Policy Refinement Proposals**: When an admin selects a high-friction rule, the AI engine reviews the historical dismissal reasons and suggests clarified rule wording (e.g., qualifying an ambiguous phrase with explicit exceptions).
3. **Formal Policy Governance Approval**: A dedicated constitutional amendment workflow where proposed guideline revisions require multi-stakeholder approval before becoming active policy.

### Measurable Acceptance Criteria
- Any rule dismissed 3 or more times with recorded human exceptions is surfaced on the Guideline Health dashboard with underlying citations.
- Guideline refinement proposals cite specific audit IDs and frequency metrics.
- Proposed guideline updates remain in `DRAFT` status and cannot impact active reviews until confirmed by an authorized Brand Admin.
