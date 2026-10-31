# 44 — ARCHITECTURAL DECISION RECORDS (ADRS)
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## ADR-01: Deterministic-First Before Generative AI
- **Context:** Generative AI models hallucinate and provide non-deterministic compliance scores.
- **Decision:** All policy evaluations execute using deterministic regexes and token dictionaries. External AI is strictly optional and advisory.
- **Status:** Accepted & Verified.

## ADR-02: Server-Side HTTP 409 Approval Gate
- **Context:** Client-side approval buttons can be bypassed or manipulated.
- **Decision:** The FastAPI backend inspects unresolved findings and returns HTTP 409 Conflict if high-risk issues remain.
- **Status:** Accepted & Verified.

## ADR-03: Dual-Dialect Database Persistence (SQLite & PostgreSQL)
- **Context:** Local testing requires zero-friction disposable databases, while production requires durable cloud persistence.
- **Decision:** Use SQLAlchemy abstraction with dialect-safe schema definitions and parameterized queries.
- **Status:** Accepted & Verified.
