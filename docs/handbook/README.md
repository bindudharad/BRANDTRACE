---
project: BRANDTRACE
document_type: Documentation Library Master Index
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# BRANDTRACE Technical Documentation Library

Welcome to the official technical documentation library for **BRANDTRACE: Evidence-Aware AI-Assisted Brand Governance**.

This repository contains 45 comprehensive, project-specific engineering documents detailing the architecture, data models, color science algorithms, security threat model, API specifications, and operational runbooks of BRANDTRACE.

---

## 🧭 Curated Reading Paths

Depending on your role and objectives, use these recommended reading sequences:

### 🏆 For Hackathon Judges & Evaluators (15-Minute Deep Dive)
1. [01 — Project Overview](01_PROJECT_OVERVIEW.md) — Product mission, problem, and the six core capabilities.
2. [02 — Problem Statement & Objectives](02_PROBLEM_STATEMENT_AND_OBJECTIVES.md) — Enterprise brand governance challenges.
3. [13 — Demo Mode & Judge Access](13_DEMO_MODE_AND_JUDGE_ACCESS.md) — Persona simulation and safety controls.
4. [15 — Deterministic Rule Engine](15_DETERMINISTIC_RULE_ENGINE.md) — Regex exact-span matching and clearance score formula.
5. [18 — Time-Aware Claim Ledger](18_TIME_AWARE_CLAIM_LEDGER.md) — ISO-8601 UTC validity windows and expiration alerts.
6. [19 — Claim Impact Map](19_CLAIM_IMPACT_MAP.md) — Dependency graph and targeted re-review execution.
7. [25 — Guideline Health Intelligence](25_GUIDELINE_HEALTH_INTELLIGENCE.md) — Telemetry, friction metrics, and reviewer disagreement detection.
8. [38 — Judge Demonstration Guide](38_JUDGE_DEMONSTRATION_GUIDE.md) — Step-by-step 5-minute live demonstration script.
9. [42 — Feature Limitations & Deferred Roadmap](42_FEATURE_LIMITATIONS_AND_DEFERRED_ROADMAP.md) — Uncompromising engineering honesty.

### 💻 For Full-Stack Software Engineers
1. [04 — System Architecture](04_SYSTEM_ARCHITECTURE.md) — Four-tier architecture and sequence diagrams.
2. [05 — Technology Stack](05_TECHNOLOGY_STACK.md) — Versioned library matrix and technical rationale.
3. [06 — Frontend Architecture](06_FRONTEND_ARCHITECTURE.md) — React 19, TypeScript, Three.js 3D core, and state flow.
4. [07 — Backend Architecture](07_BACKEND_ARCHITECTURE.md) — FastAPI lifespan, service modules, and dependency injection.
5. [08 — API Reference](08_API_REFERENCE.md) — Exhaustive catalog of all 44 registered routes.
6. [09 — API Request & Response Flow](09_API_REQUEST_RESPONSE_FLOW.md) — 5-stage lifecycle from click to database commit.
7. [10 — Database Schema](10_DATABASE_SCHEMA.md) — Detailed specifications of all 15 relational tables.
8. [32 — Database Migrations & Persistence](32_DATABASE_MIGRATIONS_AND_PERSISTENCE.md) — SQLite and PostgreSQL pooling.
9. [35 — Local Development Setup](35_LOCAL_DEVELOPMENT_SETUP.md) — Fast onboarding for Windows, Linux, and macOS.
10. [41 — Troubleshooting Guide](41_TROUBLESHOOTING.md) — Diagnostic matrix and resolution steps.

### 🛡️ For Security & Compliance Auditors
1. [11 — Workspace Isolation](11_WORKSPACE_ISOLATION.md) — Multi-tenant query scoping and tenant boundaries.
2. [12 — Authentication & Authorization](12_AUTHENTICATION_AND_AUTHORIZATION.md) — Dual-mode auth and RBAC matrix.
3. [28 — Approval Gate & Governance Workflow](28_APPROVAL_GATE_AND_GOVERNANCE_WORKFLOW.md) — HTTP 409 conflict blocking.
4. [29 — Audit Trail & Data Retention](29_AUDIT_TRAIL_AND_DATA_RETENTION.md) — Append-only event structure and retention.
5. [30 — Security Threat Model](30_SECURITY_THREAT_MODEL.md) — STRIDE analysis and mitigations.
6. [31 — Data Privacy & Secret Management](31_DATA_PRIVACY_AND_SECRET_MANAGEMENT.md) — Credential isolation and fixture hygiene.
7. [36 — Environment Variable Reference](36_ENVIRONMENT_VARIABLE_REFERENCE.md) — Security classifications and defaults.

### 🧪 For QA, Release & DevOps Engineers
1. [33 — Testing Strategy](33_TESTING_STRATEGY.md) — Testing pyramid and quality gates.
2. [34 — Test Catalog & Results](34_TEST_CATALOG_AND_RESULTS.md) — 144 passed backend tests, 32 browser QA tests.
3. [39 — Deployment & Vercel Runbook](39_DEPLOYMENT_AND_VERCEL_RUNBOOK.md) — Frontend CI/CD and edge deployment.
4. [40 — Backend Deployment Runbook](40_BACKEND_DEPLOYMENT_RUNBOOK.md) — FastAPI ASGI deployment and Neon PostgreSQL.
5. [43 — Release & Versioning Policy](43_RELEASE_AND_VERSIONING_POLICY.md) — SemVer and release verification gates.
6. [45 — Changelog & Release History](45_CHANGELOG_AND_RELEASE_HISTORY.md) — Evolution from Phase 1 to Round 3 final release.

---

## 📚 Complete Document Library (45 Documents)

| # | Document Title | Primary Scope |
| :-: | :--- | :--- |
| **01** | [Project Overview](01_PROJECT_OVERVIEW.md) | Mission, problem, target users, 6 core capabilities. |
| **02** | [Problem Statement & Objectives](02_PROBLEM_STATEMENT_AND_OBJECTIVES.md) | Enterprise brand crisis, governance breakdowns, measurable objectives. |
| **03** | [Product Scope & Requirements](03_PRODUCT_SCOPE_AND_REQUIREMENTS.md) | Functional requirements matrix (FR-01 to FR-18) and NFRs. |
| **04** | [System Architecture](04_SYSTEM_ARCHITECTURE.md) | Client/Gateway/Service/Persistence tiers, sequence diagrams. |
| **05** | [Technology Stack](05_TECHNOLOGY_STACK.md) | Versioned dependencies: React 19, FastAPI 0.115, Three.js 0.186, SQLAlchemy 2.0. |
| **06** | [Frontend Architecture](06_FRONTEND_ARCHITECTURE.md) | Component tree, views, Three.js 3D core, raycasting, SVG fallback. |
| **07** | [Backend Architecture](07_BACKEND_ARCHITECTURE.md) | FastAPI lifespan context, service modules, dependency injection, exception handling. |
| **08** | [API Reference](08_API_REFERENCE.md) | Exhaustive 44-route catalog with parameters, models, auth, and scopes. |
| **09** | [API Request & Response Flow](09_API_REQUEST_RESPONSE_FLOW.md) | 5-stage lifecycle from browser click to database commit. |
| **10** | [Database Schema](10_DATABASE_SCHEMA.md) | Complete specifications of all 15 relational tables, keys, and foreign keys. |
| **11** | [Workspace Isolation](11_WORKSPACE_ISOLATION.md) | Multi-tenancy architecture, parameterized tenant scoping, byte isolation. |
| **12** | [Authentication & Authorization](12_AUTHENTICATION_AND_AUTHORIZATION.md) | Dual mode (`strict` vs `demo`), RBAC matrix, API key privilege separation. |
| **13** | [Demo Mode & Judge Access](13_DEMO_MODE_AND_JUDGE_ACCESS.md) | Judge Access Center, simulated personas, safety controls, reset restrictions. |
| **14** | [Brand Constitution](14_BRAND_CONSTITUTION.md) | Rule modeling (`rules`), severity weights, baseline rules, visual profile standards. |
| **15** | [Deterministic Rule Engine](15_DETERMINISTIC_RULE_ENGINE.md) | Regex exact-span matching, required terminology, clearance score formula. |
| **16** | [Content Review Pipeline](16_CONTENT_REVIEW_PIPELINE.md) | 6-step lifecycle from ingestion to approval gate. |
| **17** | [Findings & Evidence Model](17_FINDINGS_AND_EVIDENCE_MODEL.md) | Finding data model, status taxonomy, dispositions, contamination guards. |
| **18** | [Time-Aware Claim Ledger](18_TIME_AWARE_CLAIM_LEDGER.md) | Fact modeling, ISO UTC boundaries, 30-day `EXPIRING_SOON` logic, version snapshots. |
| **19** | [Claim Impact Map](19_CLAIM_IMPACT_MAP.md) | Dependency traversal, historical invalidation, targeted re-review execution. |
| **20** | [Visual Compliance Overview](20_VISUAL_COMPLIANCE_OVERVIEW.md) | Multimodal support matrix, SHA-256 matching, CIELAB Delta-E, WCAG math. |
| **21** | [Brand Asset Registry](21_BRAND_ASSET_REGISTRY.md) | `brand_assets` table, binary hash matching, licensing metadata, tenant isolation. |
| **22** | [PDF Ingestion & Text Extraction](22_PDF_INGESTION_AND_TEXT_EXTRACTION.md) | `pypdf` extraction, corrupted/encrypted handling, digital vs scanned limitations. |
| **23** | [Image Analysis & Colour Science](23_IMAGE_ANALYSIS_AND_COLOUR_SCIENCE.md) | sRGB linearization, CIE XYZ, CIELAB conversion, CIE76 Delta-E formula. |
| **24** | [WCAG Contrast & Limitations](24_WCAG_CONTRAST_AND_LIMITATIONS.md) | Relative luminance formula, declared token-pair assessment vs arbitrary image limits. |
| **25** | [Guideline Health Intelligence](25_GUIDELINE_HEALTH_INTELLIGENCE.md) | Telemetry engine, friction metrics, data confidence classification (`SUFFICIENT`/`INSUFFICIENT`). |
| **26** | [Reviewer Feedback & Disagreement](26_REVIEWER_FEEDBACK_AND_DISAGREEMENT.md) | Multi-actor disposition divergence calculation at the rule level. |
| **27** | [Rule Suggestions & Versioning](27_RULE_SUGGESTIONS_AND_VERSIONING.md) | Suggestion generation, triage workflow (`ACCEPT`/`DEFER`/`REJECT`), activation, optimistic locking. |
| **28** | [Approval Gate & Governance Workflow](28_APPROVAL_GATE_AND_GOVERNANCE_WORKFLOW.md) | HTTP 409 enforcement, high/critical blocking, resolution options, audit logging. |
| **29** | [Audit Trail & Data Retention](29_AUDIT_TRAIL_AND_DATA_RETENTION.md) | Append-only event structure, attribution, retrieval, retention boundaries. |
| **30** | [Security Threat Model](30_SECURITY_THREAT_MODEL.md) | STRIDE analysis, cross-workspace isolation, API key privilege separation. |
| **31** | [Data Privacy & Secret Management](31_DATA_PRIVACY_AND_SECRET_MANAGEMENT.md) | Zero secret leakage, environment variable isolation, fixture hygiene. |
| **32** | [Database Migrations & Persistence](32_DATABASE_MIGRATIONS_AND_PERSISTENCE.md) | Dual persistence (SQLite/PostgreSQL), schema initialization, idempotent migrations. |
| **33** | [Testing Strategy](33_TESTING_STRATEGY.md) | Test pyramid, Pytest suites, isolated browser QA, Playwright test execution. |
| **34** | [Test Catalog & Results](34_TEST_CATALOG_AND_RESULTS.md) | Complete catalog of 20 test modules with dated run outcomes (144 passed, 1 skipped). |
| **35** | [Local Development Setup](35_LOCAL_DEVELOPMENT_SETUP.md) | Step-by-step PowerShell and Bash guide for backend, frontend, and tests. |
| **36** | [Environment Variable Reference](36_ENVIRONMENT_VARIABLE_REFERENCE.md) | Complete reference table of all backend and frontend environment variables. |
| **37** | [Frontend User Guide](37_FRONTEND_USER_GUIDE.md) | Walkthrough of all 9 workspace views and user workflows. |
| **38** | [Judge Demonstration Guide](38_JUDGE_DEMONSTRATION_GUIDE.md) | 3–5 minute hackathon judge demonstration walkthrough. |
| **39** | [Deployment & Vercel Runbook](39_DEPLOYMENT_AND_VERCEL_RUNBOOK.md) | Vercel Git integration, build process, static prerendering, live smoke test. |
| **40** | [Backend Deployment Runbook](40_BACKEND_DEPLOYMENT_RUNBOOK.md) | FastAPI runner, Neon PostgreSQL configuration, connection pooling, readiness probes. |
| **41** | [Troubleshooting Guide](41_TROUBLESHOOTING.md) | Common runtime diagnostics, missing env vars, CORS, upload limits, database lockups. |
| **42** | [Feature Limitations & Deferred Roadmap](42_FEATURE_LIMITATIONS_AND_DEFERRED_ROADMAP.md) | Truthful feature classification: Implemented, Partially implemented, Not implemented / Deferred. |
| **43** | [Release & Versioning Policy](43_RELEASE_AND_VERSIONING_POLICY.md) | Release verification gates, git branching, commit standards. |
| **44** | [Glossary of Terms](44_GLOSSARY.md) | Alphabetical dictionary of BRANDTRACE terms. |
| **45** | [Changelog & Release History](45_CHANGELOG_AND_RELEASE_HISTORY.md) | Release milestones from Phase 1 inception through Round 3 final release. |
