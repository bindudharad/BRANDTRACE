# Round 3 Engineering and Improvement Roadmap

## Roadmap Architecture & Strategic Focus

Following the successful delivery of the core governance engine, exact-span remediation guards, and audit infrastructure in Round 2, the **Round 3 Roadmap** focuses on **automated proactive governance, deep multimodal visual intelligence, and autonomous rule optimization**.

```
+--------------------------------------------------------------------------+
|                        ROUND 3 STRATEGIC INITIATIVES                     |
+--------------------------------------------------------------------------+
               |                           |                         |
               v                           v                         v
 [ 1. Automated Re-Review ]    [ 2. Multimodal Visual ]    [ 3. Rule Refinement ]
 - Real-time worker            - Logo clearspace bounds    - Dismissal clustering
 - Automated webhooks          - Font hierarchy            - Clarification engine
 - Instant deprecation         - Confidence scoring        - Multi-stakeholder sign-off
```

---

## Complete Status Separation: Current vs. Roadmap

To preserve rigorous architectural honesty, current implementation maturity is classified across three distinct tiers:

* ✅ **Done (Round 2)**:
  * Deterministic rule engine, exact-span replacements, and data integrity guards.
  * Server-side `HTTP 409` approval gate and waiver workflows.
  * On-demand Claim Impact Map calculation (`impact_map.py`).
  * Pillow palette quantization, WCAG 2.1 contrast ratios, and CIELAB Delta-E color distance.
  * Append-only audit logging and point-in-time version history.
* ⚠️ **Partial / Dependent on System Binaries**:
  * OCR text extraction from raster images (functional, but requires host-level Tesseract installation on `PATH`).
  * Role simulation (functional via `X-Demo-Role` headers; requires enterprise OIDC for production).
* 🔜 **Planned (Round 3 Roadmap)**:
  * Proactive background worker with automated webhook notifications.
  * Deep multimodal visual compliance (logo bounding boxes, clearspace, typography).
  * AI-assisted rule refinement based on historical finding dismissal patterns.

---

## Strategic Improvement 1: Time-Aware Claim Ledger & Automated Re-Review

### The Challenge
Currently, the Claim Impact Map is calculated dynamically on-demand when a brand administrator visits the interface or calls `GET /api/governance/impact-map`. In enterprise environments with thousands of published assets, governance teams require proactive, asynchronous alerts the moment an evidence record expires.

### Round 3 Technical Implementation
* Implement a lightweight asynchronous background worker (using Celery / Redis or native `asyncio` task scheduling).
* Worker polls the active claim ledger on a 60-second recurring interval.
* Upon detecting that `now() >= fact.expires_at`:
  1. Transitions fact status to `EXPIRED`.
  2. Executes dependency graph traversal across all historical reviews.
  3. Dispatches signed outgoing HTTP webhook payloads (`application/json`) to registered CMS endpoints (e.g., Contentful, WordPress, Slack alerts).

### Measurable Acceptance Criteria
> *"When approved evidence expires, the impact map identifies exactly the affected drafts within 1 minute, excludes unrelated drafts, and sends a webhook notification."*

---

## Strategic Improvement 2: Multimodal Visual Compliance & Logo Clearspace

### The Challenge
While Round 2 successfully measures image color palettes and WCAG contrast ratios, visual brand governance also requires validating that brand logos are properly positioned, uncrowded, and uncorrupted by overlapping artwork.

### Round 3 Technical Implementation
* Integrate lightweight computer vision models (such as YOLOv8-nano or OpenCV template matching) running locally.
* Detect the exact bounding box $[x_{\min}, y_{\min}, x_{\max}, y_{\max}]$ of approved brand logos in uploaded marketing graphics.
* Measure **logo clearspace margin** ($M$) relative to logo height ($H$), asserting $M \ge 0.5H$ against adjacent text or graphic elements.
* Evaluate font hierarchy and typography scale ratios against corporate design system standards.
* Assign explicit confidence percentages (e.g., `Confidence: 94.2%`) to every visual finding.

### Measurable Acceptance Criteria
> *"Visual analysis returns measured brand colour compliance for PNG/JPEG inputs, logo position within defined bounds, and clearly communicates confidence level."*

---

## Strategic Improvement 3: AI-Assisted Brand Rule Refinement

### The Challenge
Over time, certain brand rules generate high friction. When a rule is repeatedly dismissed or waived by reviewers, it typically indicates that the rule pattern is too aggressive, ambiguous, or lacks context-sensitive exceptions.

### Round 3 Technical Implementation
* The Governance Insights engine (`/api/insights`) aggregates historical finding actions.
* An automated clustering job flags any rule that has been dismissed or waived $\ge 3$ times within a rolling 30-day window.
* The system invokes Gemini AI with the dismissed review excerpts, the existing rule definition, and reviewer justification strings to draft a proposed rule refinement (e.g., recommending a narrower regex pattern or adding approved exception clauses).
* The proposed refinement is staged in `DRAFT` status and requires multi-stakeholder sign-off (Legal + Head of Brand) before replacing the active rule version.

### Measurable Acceptance Criteria
> *"System identifies rules dismissed or waived ≥ 3 times in 30 days and proposes a human-reviewable clarification; multi-stakeholder approval required before rule takes effect."*
