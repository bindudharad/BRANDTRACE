# Changelog

All notable changes to BRANDTRACE are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

Versions correspond to hackathon submission phases. Pre-release work and exact commit timestamps for earlier phases are not available; entries below reflect verified engineering state at each phase boundary.

---

## [Unreleased]

- GitHub repository preparation (rebranding, documentation, remote cleanup).

---

## [Round 2 Final — 2026-10-25]

### Added
- Disposition reason / draft content cross-contamination guards (backend + frontend).
  - Guard 1: Rejects `replacement == reason` (HTTP 422).
  - Guard 2: Rejects QA metadata prefixes (`"Manual QA:"`, `"Reason:"`, etc.) as content.
- 7 new regression tests in `test_disposition_integrity.py`.
- Semantic correctness fixes for geographic claim classification.
  - Broad claims (`"across every region"`, `"globally available"`) classified as `NEEDS_REVIEW` when evidence only confirms a narrower region.
  - Exclusive territorial facts correctly trigger `CONTRADICTED`.
- Health score semantics clarified and tested:
  - `ESCALATED` dispositions do not count as resolved.
  - `SUPPORTED` findings never penalise the score.
  - Score labelled as review completion, not compliance proof.
- Production build: Vite + static HTML prerender.
- Smoke test suite: 27 assertions against ASGI application.
- Final test count: **75 passed, 1 skipped**.

### Changed
- Suggested corrections for `guaranteed` / `guaranteed` findings set to `None` — no ungrammatical replacement proposed.
- `best choice` correction span fixed: passage is now `"best"` → replacement `"effective"` (eliminates word duplication on accept).
- Missing required terminology findings now have `suggested_correction: null` (no editorial instructions inserted as publishable text).

### Fixed
- Correction acceptance no longer inserts editorial instructions (e.g. "cite verified infrastructure SLA") into published content.
- Disposition reason no longer overwrites draft content under any code path.
- `BrandtraceWorkspacePremium.tsx`: `handleFindingAction` refactored to pass reason and replacement explicitly rather than reading from shared state closure.

---

## [Round 2 Mid — 2026-10-24]

### Added
- `BrandtraceWorkspacePremium.tsx`: Premium dark UI with teal accents.
- `EvidencePrism/EvidencePrism.tsx`: Three.js icosahedron with orbiting evidence nodes.
- `BrandtraceHero/BrandtraceHero.tsx`: Cinematic landing page with workflow storytelling.
- Backend comprehensive test suite (`test_qa_comprehensive.py`): approval enforcement, file analysis, demo reset, impact map.
- Phase 2 regression tests (`test_qa_phase2_regression.py`): 23 tests covering deduplication, geographic claims, health score, productivity claims, correction neutrality.
- `FINAL_STATUS.md`: Engineering QA report.

### Changed
- `src/App.tsx` updated to show `BrandtraceHero` on load, transitioning to workspace.
- `index.html` updated to BRANDTRACE title, meta description, OG tags, Twitter cards.
- `manifest.webmanifest` updated to BRANDTRACE identity.

---

## [Round 2 Initial — approximate 2026-10-22]

### Added
- `backend/` FastAPI application (initial structure).
- `backend/app/governance.py`: deterministic brand rule engine.
- `backend/app/ai_adapter.py`: OfflineProvider and GeminiProvider.
- `backend/app/models.py`: SQLAlchemy schema for reviews, findings, rules, facts, audit, versions.
- `backend/app/impact_map.py`: affected-draft analysis.
- `backend/app/color_science.py`: WCAG 2.1 luminance, contrast, CIELAB Delta-E.
- `backend/app/image_analyzer.py`: Pillow palette extraction.
- `backend/app/pdf_parser.py`: pypdf text extraction.
- `src/components/BrandtraceWorkspace.tsx`: initial 9-panel workspace.
- `src/services/api.ts`: typed API client.
- `backend/tests/test_api.py`, `test_color_and_visual.py`, `test_pdf_parser.py`, `test_ai_adapter.py`.
- `docs/ARCHITECTURE.md`, `docs/ROUND2_SUBMISSION.md`, `docs/ROUND2_DEMO_SCRIPT.md`, `docs/ROUND3_PLAN.md`.

---

## [LoomFrog Scaffold — pre-project]

BRANDTRACE was built on top of the MIT-licensed [LoomFrog](https://github.com/kaimir-auth/LoomFrog) React/Vite frontend by **Amir Asadullah Chowdhury**. The inherited scaffold provided the Vite configuration, TypeScript setup, Tailwind CSS integration, and the original LandingPage/BrandDNA components. These are preserved in the repository for attribution. All BRANDTRACE-specific functionality was added independently.
