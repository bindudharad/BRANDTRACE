# Round 2 submission notes

## Completed in this build

- End-to-end seeded workspace → persisted draft → deterministic evidence findings → human disposition → guarded approval/waiver → audit history.
- Evidence records carry source title/excerpt, identifier, owner/status/version and expiry metadata. Findings distinguish contradiction, lack of approved support, outdated material and review-only triage.
- React/Vite UI with overview, constitution, content review, findings/corrections, human queue, audit history, insights and a visible fictional DEMO MODE label.
- FastAPI OpenAPI documentation at `/docs`, health at `/api/health`, readiness at `/api/ready`, structured validation/error responses, CORS and content-size validation.

## Verification

Run `pytest backend/tests -q`, `npm run lint`, and `npm run build` from the repository root. Exact results are recorded in the final implementation handoff after execution.

## AI and reuse disclosure

The prior LoomFrog UI code was retained as the starting point under its existing MIT licence. The BRANDTRACE API and governance workspace were independently implemented. The demo uses deterministic checks plus explicitly labelled offline/mock claim triage; it does not send content to an external AI provider and never fabricates citations.

## Boundaries and Round 3 roadmap

1. **Time-aware Claim Ledger and Rule-Change Impact Map:** expiry is stored and expired facts are flagged today; dependency tracking and targeted re-review across all affected drafts remain future work.
2. **Multimodal Visual Compliance:** this build makes no logo/OCR/font assertions. A future release will benchmark palette and contrast checks and adopt licensed visual methods only after validation.
3. **Governance Intelligence:** recurring/unresolved/dismissed signals are shown today. Reviewer disagreement analysis and evidence-backed rule-clarification recommendations remain future work.

No public deployment URL is claimed or created.
