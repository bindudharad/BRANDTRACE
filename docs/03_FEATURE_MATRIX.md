# BRANDTRACE Feature Matrix

This document provides a comprehensive inventory of all system capabilities within the BRANDTRACE platform. Features are organized by functional domain and tagged with explicit implementation statuses:

* ✅ **Implemented**: Fully functional, tested, and verifiable in the codebase.
* ⚠️ **Partial**: Functionality is implemented with specific architectural limitations or external dependencies.
* ❌ **Not Implemented**: Intentionally omitted from current architectural boundaries.
* 🔜 **Planned (Round 3)**: Documented roadmap initiatives scheduled for subsequent engineering phases.

---

## Complete Functional Matrix

| Feature | Category | Status | Technical Implementation & Notes |
| :--- | :--- | :---: | :--- |
| **Deterministic Rule Engine** | Rule Engine | ✅ Implemented | Regex pattern matcher (`governance.py`). Checks prohibited terms, required phrases, and forbidden words. Zero external cloud dependencies. |
| **Claim Ledger Verification** | Fact Engine | ✅ Implemented | Cross-references copy against approved facts in database. Evaluates active validity dates and scopes. |
| **Time-Aware Expiration Logic** | Fact Engine | ✅ Implemented | Detects expired rules and facts based on ISO 8601 UTC timestamps, marking findings as `OUTDATED`. |
| **Geographic Broad/Narrow Triage** | Fact Engine | ✅ Implemented | Distinguishes between broad claims against narrow facts (`NEEDS_REVIEW`) and explicit territorial contradictions (`CONTRADICTED`). |
| **Neutral Suggested Corrections** | Correction | ✅ Implemented | Context-aware replacements (e.g., "best" → "effective", "cheap" → "accessible"). Avoids ungrammatical substitutions for guarantees. |
| **Exact-Span Text Replacement** | Correction | ✅ Implemented | Replaces the exact matching span in draft text, preventing word duplication and draft truncation. |
| **Cross-Contamination Guards** | Data Integrity | ✅ Implemented | Server-side validation rejects edits where replacement equals justification reason (`HTTP 422`). |
| **QA Metadata Prefix Guards** | Data Integrity | ✅ Implemented | Rejects replacements starting with `Manual QA:`, `QA:`, `Reason:`, or `Audit note:` (`HTTP 422`). |
| **Mandatory Term Re-evaluation** | Data Integrity | ✅ Implemented | Automatically updates missing-term findings to `SUPPORTED` when added to draft copy during manual edits. |
| **Governance Clearance Health Score**| Scoring | ✅ Implemented | Formula: `100 - SUM(Severity Penalties)` for unresolved findings. Escalated issues remain penalized. |
| **Server-Side Approval Gate** | Workflow | ✅ Implemented | Blocks draft approval (`HTTP 409 Conflict`) if any unresolved `HIGH` or `CRITICAL` findings remain. |
| **Governance Waiver Workflow** | Workflow | ✅ Implemented | Allows authorized roles (`reviewer`, `brand_admin`) to waive findings with mandatory documented justifications. |
| **Role-Based Simulation** | Security & Auth| ✅ Implemented | Evaluates permissions via `X-Demo-Role` header (`contributor`, `reviewer`, `brand_admin`, `auditor`). |
| **Append-Only Audit Trail** | Compliance | ✅ Implemented | Records all edits, finding actions, waivers, and approvals in database. No update or delete endpoints exist. |
| **Full Version History & Rollback** | Versioning | ✅ Implemented | Automatically snapshots drafts on every modification in `review_versions`. Supports one-click restoration. |
| **Dynamic Claim Impact Map** | Analytics | ✅ Implemented | Identifies historical drafts referencing expired or retired rules and facts (`impact_map.py`). |
| **PDF Text Layer Extraction** | Ingestion | ✅ Implemented | Extracts text streams via `pypdf`. Handles corrupt, empty, and encrypted files with graceful error responses. |
| **Visual Palette Extraction** | Visual / Color | ✅ Implemented | Quantizes dominant image palettes using Pillow (`image_analyzer.py`). |
| **WCAG 2.1 Contrast Calculation** | Visual / Color | ✅ Implemented | Exact W3C relative luminance and contrast ratio calculations (`color_science.py`). |
| **CIELAB Delta-E Color Distance** | Visual / Color | ✅ Implemented | Evaluates perceptual difference (CIE76) between extracted colors and approved brand guidelines. |
| **Optional Google Gemini Layer** | AI Assistance | ✅ Implemented | Semantic tone analysis and promotional claim triage via `GeminiProvider`. Gracefully falls back to offline mode. |
| **Interactive 3D Evidence Prism** | Frontend UI | ✅ Implemented | Three.js visualizer rendering evidence status prisms with full `prefers-reduced-motion` compliance. |
| **Demo State Seeding & Reset** | Demo Engine | ✅ Implemented | Endpoints `POST /api/demo/setup` and `POST /api/demo/reset` seed deterministic test datasets. |
| **Automated Test Suite** | QA & Testing | ✅ Implemented | 75 passed tests across API routes, color science, PDF extraction, regression, and data integrity. |
| **Optical Character Recognition** | Ingestion | ⚠️ Partial | Basic architecture supports OCR, but requires external system-level Tesseract installation on PATH. |
| **Simulated Role Header Auth** | Security & Auth| ⚠️ Partial | Suitable for evaluation and testing; enterprise JWT/OIDC authentication required for production deployment. |
| **Database Persistence Dialects** | Persistence | ⚠️ Partial | Zero-config SQLite default for demo and isolated test runs; PostgreSQL adapter supported via SQLAlchemy. |
| **Automated Re-Review & Impact Map** | Workflow | ✅ Implemented | Impact map detects expired & expiring-soon facts/rules and triggers targeted re-review (POST /api/governance/re-review-impact). |
| **Multimodal Visual Compliance** | Visual / Color | ✅ Implemented | Asset registry with SHA-256 binary hash matching (APPROVED, RESTRICTED, NEEDS_REVIEW), Pillow palette extraction, and WCAG 2.1 contrast evaluation. |
| **Guideline-Health Intelligence** | Governance | ✅ Implemented | Telemetry tracking rule recurrence, reviewer disagreements, data confidence, and human-in-the-loop clarification workflows (POST /api/governance/rule-suggestions/{id}). |
| **Enterprise Identity Management**| Security & Auth| ❌ Not Implemented| Enterprise SAML 2.0 / SCIM user provisioning. |
| **Unsupervised Auto-Publishing** | Workflow | ❌ Not Implemented| Direct publishing to external social media or production CMS targets without human sign-off. |
| **Generative Copy Hallucination** | Generative AI | ❌ Not Implemented| Automated long-form creative rewriting without author oversight. |

---

## Feature Distribution Summary

```
+--------------------------------------------------------------+
|                     SYSTEM MATURITY SPREAD                   |
+--------------------------------------------------------------+
  [###### Fully Implemented Features (24) ###################]
  [### Partial / Environmental Dependencies (3) ###]
  [### Planned Round 3 Roadmap (3) ###]
  [### Out of Scope / Explicit Non-Goals (3) ###]
```

Every implemented feature is backed by automated pytest fixtures in `backend/tests/` and verified through end-to-end smoke testing (`scripts/smoke_test.py`).
