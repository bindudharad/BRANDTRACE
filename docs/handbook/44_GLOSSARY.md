---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 44 — Glossary of Terms

## Purpose

This document provides definitive definitions for specialized domain terms, mathematical concepts, and architectural constructs used throughout **BRANDTRACE**.

---

### A
- **Approval Gate**: The architectural barrier in `POST /api/reviews/{id}/approval` that prohibits marketing drafts with unresolved `HIGH` or `CRITICAL` severity findings from transitioning to `APPROVED` or `WAIVED` status without explicit human resolution (`HTTP 409 Conflict`).
- **Audit Ledger**: The immutable, append-only database table (`audit`) recording every state transition, user action, and compliance decision across the enterprise workspace.

### B
- **Brand Asset Registry**: The secure database catalog (`brand_assets`) holding official enterprise logos, icons, and marks, validated via cryptographic SHA-256 binary hash matching.
- **Brand Constitution**: The structured, versioned collection of active brand governance guidelines (`rules`), including prohibited superlatives, required terms, tone guidelines, and visual profile standards.

### C
- **CIE76 ($\Delta E_{ab}^*$)**: The standard Euclidean color difference metric calculated in the CIELAB color space, quantifying perceptual distance between brand reference colors and extracted asset colors:
  $$\Delta E_{ab}^* = \sqrt{(\Delta L^*)^2 + (\Delta a^*)^2 + (\Delta b^*)^2}$$
- **Claim Impact Map**: The dependency traversal system (`impact_map.py`) that models links between substantiated claims in the Claim Ledger and past marketing drafts that cite them.
- **Claim Ledger**: The time-aware repository (`facts`) storing enterprise factual assertions, proof citations, source excerpts, and explicit validity expiration timestamps.
- **Clearance Score (Governance Clearance Score)**: A deterministic metric from 0 to 100 measuring draft readiness for governance sign-off, penalizing unresolved violations according to severity weights (-30 Critical, -18 High, -10 Medium, -4 Low).

### D
- **Delta-E**: See *CIE76*.
- **Disagreement Detection**: The algorithmic detection of policy ambiguity occurring when two distinct authenticated human reviewers submit conflicting dispositions (e.g. one `ACCEPTED_EDIT` and one `DISMISSED`) on findings triggered by the same rule.
- **Disposition**: The administrative status assigned to a finding by a human reviewer: `ACCEPTED_EDIT`, `EDITED`, `DISMISSED`, `WAIVED`, or `ESCALATED`.

### E
- **Exact-Span Highlighting**: The deterministic location and character-level boundary matching of policy violations within draft copy, enabling precise in-place suggestions and replacements.
- **Expiration Window**: The bounded ISO-8601 UTC timeframe (`effective_from` to `expires_at`) during which an enterprise factual claim or benchmark is legally valid.

### F
- **Finding**: A discrete compliance issue detected within a review draft, categorized by type (`prohibited_phrase`, `expired_fact`, `contrast_violation`, etc.) and severity.

### O
- **Optimistic Concurrency Control**: A locking pattern ensuring that rule updates or suggestion activations only succeed if the caller's expected version matches the current database version (`expected_rule_version`), preventing concurrent overwrite collisions.

### P
- **Persona Simulation**: The dual-mode authentication capability in demo environments enabling evaluators to switch between `creator`, `reviewer`, `brand_admin`, and `auditor` roles to inspect permission boundaries.

### R
- **Relative Luminance ($L$)**: The relative brightness of any point in a colorspace, normalized from 0 (black) to 1 (white), defined by W3C WCAG 2.1 as:
  $$L = 0.2126 \cdot R_{lin} + 0.7152 \cdot G_{lin} + 0.0722 \cdot B_{lin}$$
- **Rule Suggestion**: A candidate policy clarification generated deterministically from empirical review friction, submitted to compliance administrators for triage (`PENDING`, `ACCEPTED`, `DEFERRED`, `REJECTED`).

### T
- **Targeted Re-Review**: The user-triggered administrative action (`POST /api/governance/re-review-impact`) that automatically re-evaluates and invalidates previously approved drafts when an underlying claim in the Claim Ledger expires.
- **Tenant Scoping**: The architectural enforcement ensuring all database queries and mutations are isolated by `workspace_id`.

### W
- **WCAG 2.1 Level AA Contrast Ratio**: The ratio of relative luminance between text and background colors:
  $$CR = \frac{L_1 + 0.05}{L_2 + 0.05}$$
  Requiring at least 4.5:1 for normal body text and 3.0:1 for large text or UI components.
