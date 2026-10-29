# BRANDTRACE Round 2 Project Summary

## Executive Overview

**BRANDTRACE** is an Evidence-Aware Brand Governance and Content Review Platform submitted for Round 2 evaluation. The project addresses the critical corporate problem of **brand drift, unsubstantiated promotional claims, silent evidentiary expiration, and untraceable approvals** across distributed marketing and content workflows.

Rather than relying on generic, non-deterministic chat prompts, BRANDTRACE formalizes brand guidelines and corporate claims into an authoritative, queryable governance substrate. Every submission is analyzed via a **deterministic-first pipeline** that binds compliance findings directly to database-backed rules and factual evidence excerpts.

---

## What Was Delivered in Round 2

In Round 2, the team delivered an end-to-end, fully integrated governance platform comprising:

1. **Deterministic-First Governance Engine (`governance.py`)**:
   * Evaluates brand copy in sub-5ms latency without requiring external cloud API keys.
   * Pattern-matches prohibited vocabulary, missing mandatory phrases, and expired fact citations.
   * Computes an authoritative **Governance Clearance Health Score** (`100 - penalties`).
2. **Pluggable AI Adapter Layer (`ai_adapter.py`)**:
   * Fully functional `OfflineProvider` utilizing token heuristics and BM25 claim retrieval.
   * Pluggable `GeminiProvider` interfacing with Google's Gemini 1.5 Flash for nuanced tone analysis.
   * Strict anti-hallucination citation validation ensuring AI cannot fabricate non-existent policy IDs.
   * Graceful automated fallback to offline mode if API credentials are missing or invalid.
3. **Evidence Linking & The Corporate Claim Ledger (`facts` & `rules`)**:
   * Codified rules (`R-VOICE-01`, `R-TERM-02`, `R-TERM-03`) and approved claims (`F-2026-01`).
   * Nuanced geographic claim triage: broad claims against narrow evidence yield `NEEDS_REVIEW`, while exclusive territory restrictions yield `CONTRADICTED`.
4. **Server-Side Approval Gate & Governance Waivers (`main.py`)**:
   * Strictly blocks draft approval (`HTTP 409 Conflict`) if any unresolved `HIGH` or `CRITICAL` findings remain.
   * Supports authorized governance waivers requiring mandatory documented justifications.
5. **Data Integrity Guards & Exact-Span Remediation**:
   * Exact-span text replacements preventing word duplication or paragraph truncation.
   * `Guard 1`: Rejects edits where replacement text is identical to the disposition reason (`HTTP 422`).
   * `Guard 2`: Rejects replacements containing compliance QA prefixes (`HTTP 422`).
   * `Guard 3`: Dynamically re-evaluates missing mandatory terms upon draft update.
6. **Point-in-Time Versioning & Rollback (`review_versions`)**:
   * Snapshots full draft content on every edit, suggested correction, or rollback.
   * Restores historical versions with one click while automatically re-running compliance checks.
7. **Append-Only Tamper-Evident Audit Trail (`audit`)**:
   * Chronologically captures every finding action, edit, waiver, and sign-off.
   * Zero mutation or deletion endpoints exist in the API.
8. **Claim Impact Map & Temporal Deprecation (`impact_map.py`)**:
   * Tracks bi-directional dependencies between approved facts/rules and historical drafts.
   * Pinpoints drafts impacted by expired facts or retired rules for targeted re-review.
9. **Visual Brand & WCAG Accessibility Ingestion (`color_science.py` & `image_analyzer.py`)**:
   * Extracts dominant color palettes from uploaded PNG/JPEG images via Pillow.
   * Calculates W3C WCAG 2.1 relative luminance and contrast ratios (4.5:1 threshold).
   * Computes CIELAB Delta-E (CIE76) perceptual color distance against brand tokens.
10. **Modern React 19 Frontend with 3D Evidence Prism**:
    * Interactive WebGL 3D Prism rendered via Three.js 0.186 with full `prefers-reduced-motion` support.
    * Real-time circular SVG health score gauge and visual diff card comparisons.
    * Frictionless role simulation (`contributor`, `reviewer`, `brand_admin`, `auditor`).

---

## Verifiable Test Evidence & Quality Metrics

The Round 2 deliverables are substantiated by rigorous automated quality assurance metrics:

```
[ Backend Pytest Suite ]   ===> 75 passed, 1 skipped (0 failed) in 6.93s
[ API Smoke Test ]         ===> 27 / 27 assertions passed (0 failed)
[ TypeScript Compiler ]    ===> npx tsc --noEmit (0 errors)
[ Production Bundle ]      ===> npm run build succeeded; prerendered HTML
```

* **Test Isolation**: Every test file utilizes temporary SQLite databases (`tempfile.NamedTemporaryFile`), ensuring zero shared-state contamination.
* **The 1 Skipped Test**: Explicitly reserved for live Gemini network requests requiring a paid cloud key; skipped cleanly in offline CI environments.

---

## Hackathon Constraints Honoured

* **Zero-Setup Local Evaluation**: Runs immediately on Windows PowerShell using local SQLite without requiring Docker or cloud infrastructure.
* **No Broken Word Replacements**: Exact-span replacements prevent double-word bugs.
* **Separation of Policy & Content**: Internal review notes cannot overwrite publishable marketing copy.
* **Honest Limitation Boundaries**: Logo bounding boxes and OCR requiring system Tesseract binaries are transparently marked as out-of-scope for Round 2.
