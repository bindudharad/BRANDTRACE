# Key Architectural and Design Decisions

This document records the foundational architectural decisions (ADRs) that shaped the design of BRANDTRACE, detailing the context, options considered, and engineering rationale for each choice.

---

## 1. Deterministic-First Verification Over Pure LLM Architecture

* **Context**: Many modern compliance tools rely entirely on prompting large language models with brand guidelines.
* **Decision**: Implement a **deterministic-first** pipeline using regex, exact string matching, and database date checks, treating cloud AI (Google Gemini) as an optional contextual enhancement.
* **Rationale**: Enterprise legal compliance demands 100% reproducible, sub-millisecond, and air-gappable verification. A rule stating "never say cheap" should never fail due to prompt drift, rate limits, or network timeouts.

---

## 2. Inviolable Human Approval Gate

* **Context**: Some automated tools propose "auto-approving" drafts if the calculated health score reaches 100/100.
* **Decision**: The system **never auto-approves drafts**. An explicit human role (`reviewer` or `brand_admin`) must invoke `POST /api/reviews/{id}/approval`.
* **Rationale**: Marketing and legal communications carry real-world liability. An algorithm can verify compliance against codified rules, but cannot grasp broader commercial nuance, PR context, or strategic intent. Human accountability must remain paramount.

---

## 3. Strict Evidence Taxonomy: `CONTRADICTED` vs. `NEEDS_REVIEW`

* **Context**: If a corporate fact confirms "Available in India", and a draft claims "Available globally", naive checkers often flag the draft as `CONTRADICTED`.
* **Decision**: Partition evidence evaluation: broad claims against narrower facts are classified as **`NEEDS_REVIEW`**. A claim is classified as **`CONTRADICTED`** only if an approved fact contains an explicit exclusive restriction (e.g., "Available exclusively in India").
* **Rationale**: Availability in India does not disprove availability in other regions. Falsely marking broad claims as contradictions erodes author trust in automated governance.

---

## 4. Append-Only Audit Immutability

* **Context**: Review platforms often allow administrators to edit or delete historical comments and logs to keep databases tidy.
* **Decision**: Implement strict **append-only** audit logging (`audit` table). Expose no `PUT`, `PATCH`, or `DELETE` endpoints for audit records.
* **Rationale**: In regulatory discovery, modified or deleted logs are treated as evidence tampering. Total immutability is required to guarantee forensic credibility.

---

## 5. Explicit Demo Role Simulation via HTTP Headers

* **Context**: Evaluating multi-role enterprise workflows (contributor, reviewer, brand admin, auditor) typically requires complex OAuth/SAML tenant provisioning.
* **Decision**: Implement persona switching via `X-Demo-Role` and `X-Demo-Actor` HTTP headers with clear UI labelling.
* **Rationale**: Allows hackathon judges and evaluators to test all permission gates (e.g., verifying contributors cannot dismiss findings or approve drafts) in seconds, without creating mock identity accounts.

---

## 6. Zero-Config SQLite for Local Evaluation

* **Context**: Enterprise applications often mandate running Docker, Redis, and PostgreSQL locally.
* **Decision**: Default to a local SQLite database (`brandtrace.db`) with automatic connection string normalization supporting PostgreSQL for production.
* **Rationale**: Eliminates the "it doesn't run on my machine" barrier. Evaluators can clone the repo and run the system with pure Python and Node.js without spinning up background container daemons.

---

## 7. Health Score as a Readiness Metric, Not a Legal Guarantee

* **Context**: High scores on automated tools can give marketing teams a false sense of absolute legal immunity.
* **Decision**: Explicitly document and label the Governance Clearance Score as a **draft review readiness metric**, not a proof of legal compliance.
* **Rationale**: Dismissing or waiving a finding grants administrative workflow clearance and restores points, but the underlying evidence status (e.g., `NEEDS_REVIEW`) remains in audit logs. Clear labelling prevents dangerous liability assumptions.

---

## 8. Exact-Span Remediation Over Full Sentence Rewriting

* **Context**: Automated tools often replace entire sentences, causing adjacent word duplication ("the the") or changing the author's voice.
* **Decision**: Capture the exact matching substring (`passage`) and replace only that specific span during remediation. For missing required terms, leave `suggested_correction = None`.
* **Rationale**: Preserves the author's original sentence flow, prevents repetitive duplication bugs, and separates automated linting from creative copy generation.
