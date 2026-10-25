# Contributing to BRANDTRACE

Thank you for your interest in contributing to BRANDTRACE. This document covers branch conventions, development setup, code organisation, testing expectations, and pull-request preparation.

---

## Development environment

Follow the [Windows Local Setup](./docs/09_WINDOWS_LOCAL_SETUP.md) to get the backend and frontend running locally.

Verify the setup works before making changes:

```powershell
python -m pytest backend/tests -v          # 75 passed, 1 skipped expected
python scripts/smoke_test.py               # 27/27 expected
npx tsc --noEmit                           # 0 errors expected
npm run build                              # successful build expected
```

---

## Branch conventions

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat/` | New feature | `feat/time-aware-claim-expiry` |
| `fix/` | Bug fix | `fix/disposition-reason-leak` |
| `docs/` | Documentation changes | `docs/api-reference-update` |
| `refactor/` | Code restructuring without behaviour change | `refactor/governance-engine-split` |
| `test/` | Adding or correcting tests | `test/disposition-integrity` |
| `chore/` | Tooling, configuration, maintenance | `chore/update-gitignore` |

All work should happen in a feature branch. Do not commit directly to `main`.

---

## Code organisation

### Backend (`backend/app/`)

| Module | Responsibility |
|--------|---------------|
| `main.py` | FastAPI application, all API routes, request/response handling |
| `models.py` | SQLAlchemy schema, database helpers, save_version, audit helpers |
| `schemas.py` | Pydantic request and response models |
| `governance.py` | Deterministic analysis engine, health score, rule/fact matching |
| `ai_adapter.py` | BaseAIProvider, OfflineProvider, GeminiProvider |
| `color_science.py` | WCAG luminance, contrast ratio, CIELAB Delta-E (no numpy) |
| `image_analyzer.py` | Pillow palette extraction, contrast, brand compliance |
| `pdf_parser.py` | Safe pypdf text extraction with error handling |
| `impact_map.py` | Affected-draft analysis for rule/fact changes |
| `config.py` | Central configuration, URL normalisation |

### Frontend (`src/`)

| File / folder | Responsibility |
|---------------|---------------|
| `App.tsx` | Root component, hero-to-workspace transition |
| `components/BrandtraceWorkspacePremium.tsx` | Active workspace UI (premium dark theme) |
| `components/BrandtraceHero/` | Landing page with Three.js Evidence Prism |
| `components/EvidencePrism/` | Three.js 3D icosahedron component |
| `services/api.ts` | Typed API client — **do not modify** without reviewing all callers |
| `index.css` | Design tokens, BRANDTRACE component styles |

---

## Style conventions

### Python

- PEP 8 formatting.
- Type hints on function signatures.
- Docstrings for public functions.
- Do not use `assert` for runtime validation — raise appropriate HTTP exceptions.

### TypeScript / React

- Functional components with explicit prop types.
- No `any` type — use proper interfaces or `unknown`.
- Imports in order: React, third-party, internal.
- CSS classes from the design system in `index.css` — no inline style objects for layout.

---

## Testing expectations

Every pull request must:

1. Not reduce the number of passing backend tests.
2. Not weaken existing test assertions to make tests pass.
3. Add regression tests for any bug fix.
4. Pass `npx tsc --noEmit` with zero errors.
5. Pass `npm run build` successfully.

New backend features should include:
- At least one happy-path integration test using the ASGI test client.
- At least one error-condition test.
- Tests in an appropriately named file under `backend/tests/`.

---

## Pull request checklist

Before opening a PR:

- [ ] Feature branch is up to date with `main`.
- [ ] All existing tests pass.
- [ ] New tests cover the change.
- [ ] TypeScript compiles without errors.
- [ ] Frontend build succeeds.
- [ ] Documentation updated if behaviour changed.
- [ ] No secrets, API keys, or database files committed.
- [ ] `git diff --check` shows no whitespace errors.

---

## Licence

By contributing, you agree that your contributions may be distributed under the project's [MIT License](./LICENSE).
