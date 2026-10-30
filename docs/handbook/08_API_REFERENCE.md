---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 08 — API Reference

## Purpose

This document provides the definitive, introspected reference for all **44 registered FastAPI routes** in the BRANDTRACE application. Every endpoint is cataloged with its HTTP method, exact path, parameter requirements, authentication rules, workspace scoping, and response codes.

---

## Route Overview by Functional Domain

```text
Total Registered Routes: 44
├── System & Operational (5 routes)
├── Workspace & Membership (4 routes)
├── Brand Profile & Assets (6 routes)
├── Brand Constitution Rules (4 routes)
├── Claim Ledger & Facts (4 routes)
├── Content Reviews & Ingestion (9 routes)
├── Governance Intelligence & Impact (8 routes)
└── OpenAPI / Documentation (4 routes)
```

---

## 1. System & Operational Endpoints

### `GET /api/health`
- **Purpose:** Liveness probe verifying the FastAPI server process is running.
- **Auth:** None (Public).
- **Scope:** Global.
- **Response:** `200 OK`
  ```json
  {"status": "ok", "service": "brandtrace", "version": "0.3.0"}
  ```

### `GET /api/ready`
- **Purpose:** Readiness probe actively executing `SELECT 1` on the database engine.
- **Auth:** None (Public).
- **Scope:** Global.
- **Response:** `200 OK`
  ```json
  {"status": "ready", "database": "sqlite"} // or "postgresql"
  ```
- **Error:** `503 Service Unavailable` if database connection probe fails.

### `POST /api/bootstrap`
- **Purpose:** Production initialization endpoint that provisions initial system schemas and super-admin credentials.
- **Auth:** Requires `Authorization: Bearer <ADMIN_API_KEY>` or valid setup secret.
- **Scope:** Global.
- **Response:** `200 OK` `{"status": "bootstrapped"}`

### `POST /api/demo/reset`
- **Purpose:** Resets the workspace database to clean baseline demo fixtures.
- **Auth:** Disabled by default in hosted environments. Requires `DEMO_RESET_SECRET` in production; permitted in local mode when `ALLOW_DEMO_RESET=true`.
- **Scope:** `X-Workspace-Id` (defaults to `ws_default`).
- **Response:** `200 OK` `{"status": "reset_complete"}`

### `POST /api/demo/setup`
- **Purpose:** Idempotently seeds initial baseline guidelines and review fixtures.
- **Auth:** Permitted in local demo mode.
- **Scope:** Workspace scoped.
- **Response:** `200 OK` `{"status": "setup_complete"}`

---

## 2. Workspace & Membership Endpoints

### `POST /api/workspaces`
- **Purpose:** Creates a new tenant workspace partition.
- **Auth:** Requires role `brand_admin`.
- **Request Body:** `{"id": "ws_enterprise", "name": "Enterprise Marketing"}`
- **Response:** `201 Created`

### `GET /api/workspaces/{workspace_id}/members`
- **Purpose:** Lists all authorized user actors and assigned roles within a workspace.
- **Auth:** Requires membership in `workspace_id`.
- **Response:** `200 OK` `[{"actor": "admin@brandtrace.internal", "role": "brand_admin"}]`

### `POST /api/workspaces/{workspace_id}/members`
- **Purpose:** Adds a user actor to a workspace with a designated role.
- **Auth:** Requires role `brand_admin` in `workspace_id`.
- **Request Body:** `{"actor": "user@org.com", "role": "reviewer"}`
- **Response:** `201 Created`

### `DELETE /api/workspaces/{workspace_id}/members/{actor_id}`
- **Purpose:** Revokes workspace access from a designated user actor.
- **Auth:** Requires role `brand_admin`.
- **Response:** `200 OK`

---

## 3. Brand Profile & Asset Registry Endpoints

### `GET /api/brand-profile`
- **Purpose:** Retrieves visual brand standards: primary color, secondary color, accents, and minimum WCAG contrast ratio.
- **Auth:** Authenticated workspace member.
- **Scope:** Scoped by `X-Workspace-Id`.
- **Response:** `200 OK`
  ```json
  {
    "workspace_id": "ws_default",
    "brand_name": "BRANDTRACE",
    "primary_color": "#0f766e",
    "secondary_color": "#2dd4bf",
    "accent_colors": ["#123b2d"],
    "min_contrast_ratio": 4.5,
    "approved_logo_aspect": 3.0
  }
  ```

### `PUT /api/brand-profile`
- **Purpose:** Updates visual brand colors and contrast requirements.
- **Auth:** Requires role `brand_admin`.
- **Scope:** Workspace scoped.
- **Response:** `200 OK`

### `GET /api/brand-assets`
- **Purpose:** Lists registered brand assets in the Brand Asset Registry.
- **Auth:** Authenticated workspace member.
- **Scope:** Strictly isolated to `workspace_id`.
- **Response:** `200 OK` `[{"id": "asset_1", "name": "Hero Logo", "content_hash": "a1b2...", "approval_status": "APPROVED"}]`

### `POST /api/brand-assets`
- **Purpose:** Registers a media asset with its SHA-256 binary hash, approval status, and license metadata.
- **Auth:** Requires role `brand_admin`.
- **Request Body:**
  ```json
  {
    "name": "Corporate Logo Primary",
    "content_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "approval_status": "APPROVED",
    "license_status": "COMMERCIAL_UNLIMITED",
    "license_notes": "Licensed globally through 2028."
  }
  ```
- **Response:** `201 Created`

### `PUT /api/brand-assets/{asset_id}`
- **Purpose:** Updates asset metadata, license status, or changes approval status (e.g., to `RESTRICTED`).
- **Auth:** Requires role `brand_admin`.
- **Response:** `200 OK`

### `DELETE /api/brand-assets/{asset_id}`
- **Purpose:** Deletes a registered asset from the workspace registry.
- **Auth:** Requires role `brand_admin`.
- **Response:** `200 OK`

---

## 4. Brand Constitution (Rules) Endpoints

### `GET /api/rules`
- **Purpose:** Lists active brand guidelines, prohibited phrases, and required terminology.
- **Auth:** Authenticated workspace member.
- **Scope:** Scoped by `X-Workspace-Id`.
- **Response:** `200 OK` `[{"id": "R-VOICE-01", "title": "No Superlatives", "pattern": "\\b(best|cheapest)\\b", "severity": "HIGH"}]`

### `POST /api/rules`
- **Purpose:** Creates a new brand policy rule.
- **Auth:** Requires role `brand_admin`.
- **Request Body:**
  ```json
  {
    "id": "R-TERM-04",
    "title": "Eco-Friendly Claims Guard",
    "category": "voice",
    "kind": "prohibited_claim",
    "pattern": "\\b(100% green|zero footprint)\\b",
    "severity": "CRITICAL",
    "source_title": "ESG Policy Handbook 2026"
  }
  ```
- **Response:** `201 Created`

### `PUT /api/rules/{rule_id}`
- **Purpose:** Updates an existing rule and captures an immutable rule snapshot in `rule_versions`.
- **Auth:** Requires role `brand_admin`. Supports `expected_version` optimistic locking.
- **Response:** `200 OK`

### `GET /api/rules/{rule_id}/versions`
- **Purpose:** Retrieves the historical snapshot audit trail for a specific brand rule.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK` `[{"version": "1.0", "title": "...", "created_at": "..."}]`

---

## 5. Claim Ledger & Facts Endpoints

### `GET /api/facts`
- **Purpose:** Lists verified empirical assertions, statistical facts, and pricing claims.
- **Auth:** Authenticated workspace member.
- **Scope:** Workspace scoped.
- **Response:** `200 OK` `[{"id": "F-001", "claim": "Availability", "value": "India", "status": "ACTIVE", "expires_at": "..."}]`

### `POST /api/facts`
- **Purpose:** Adds a corporate fact to the Claim Ledger with explicit validity timestamps.
- **Auth:** Requires role `brand_admin`.
- **Request Body:**
  ```json
  {
    "id": "F-002",
    "claim": "Customer Base",
    "value": "Over 500 Enterprise Customers",
    "owner": "Legal & Analytics",
    "effective_at": "2026-01-01T00:00:00Z",
    "expires_at": "2026-12-31T23:59:59Z",
    "notes": "Verified by Q4 audit report."
  }
  ```
- **Response:** `201 Created`

### `PUT /api/facts/{fact_id}`
- **Purpose:** Updates an existing fact, updates validity timestamps, and creates an entry in `fact_versions`.
- **Auth:** Requires role `brand_admin`.
- **Response:** `200 OK`

### `GET /api/facts/{fact_id}/versions`
- **Purpose:** Retrieves the complete version history for a specific corporate fact.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK`

---

## 6. Content Review & Ingestion Endpoints

### `GET /api/reviews`
- **Purpose:** Lists review drafts for the workspace with current scores and statuses.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK`

### `POST /api/reviews`
- **Purpose:** Ingests marketing copy or Markdown text and runs the deterministic evaluation engine.
- **Auth:** Requires role `creator`, `reviewer`, or `brand_admin`.
- **Request Body:** `{"title": "Q4 Announcement", "content": "Our solution is the best in India."}`
- **Response:** `201 Created` (Includes computed score and structured findings list).

### `POST /api/reviews/upload`
- **Purpose:** Multipart file upload endpoint ingesting digital PDF documents (`.pdf`) or image assets (`.png`, `.jpg`).
- **Auth:** Requires role `creator`, `reviewer`, or `brand_admin`.
- **Response:** `201 Created`

### `GET /api/reviews/{review_id}`
- **Purpose:** Retrieves a single review draft, current score, rule versions cited, and all findings.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK`

### `GET /api/reviews/{review_id}/versions`
- **Purpose:** Lists draft revision history snapshots captured during remediation.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK`

### `POST /api/reviews/{review_id}/restore/{version_id}`
- **Purpose:** Rolls back draft content to a previous version snapshot and records a `VERSION_RESTORED` audit event.
- **Auth:** Requires role `reviewer` or `brand_admin`.
- **Response:** `200 OK`

### `GET /api/reviews/{review_id}/audit`
- **Purpose:** Returns the append-only audit event stream associated with this review.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK`

### `POST /api/reviews/{review_id}/findings/{finding_id}/actions`
- **Purpose:** Triages a violation finding. Supports actions:
  - `ACCEPT`: Applies exact-span suggested correction to draft content.
  - `EDIT`: Replaces content with human-supplied text (guarded against QA contamination).
  - `DISMISS`: Clears finding with a mandatory justification string.
- **Auth:** Requires role `reviewer` or `brand_admin`.
- **Response:** `200 OK`

### `POST /api/reviews/{review_id}/approval`
- **Purpose:** Evaluates the approval gate and transitions status to `APPROVED` or `CHANGES_REQUESTED`.
- **Auth:** Strictly restricted to `reviewer` and `brand_admin` (HTTP 403 for `creator`/`auditor`).
- **Gate Logic:** If unresolved `HIGH` or `CRITICAL` findings exist, returns **`HTTP 409 Conflict`**.
- **Response:** `200 OK` on valid approval.

---

## 7. Governance Intelligence & Impact Endpoints

### `GET /api/overview`
- **Purpose:** Dashboard executive telemetry: total reviews, unresolved findings by severity, and recent activity.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK`

### `GET /api/insights`
- **Purpose:** Aggregated metrics: review clearance distributions and evidence linkage percentages.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK`

### `GET /api/governance/impact-map`
- **Purpose:** Cross-draft dependency map identifying reviews that depend on expired or altered facts.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK` `{"impacted_reviews": [...], "facts_summary": [...]}`

### `POST /api/governance/re-review-impact`
- **Purpose:** Triggers targeted re-evaluation of drafts affected by expired facts, moving approved drafts to `CHANGES_REQUESTED`.
- **Auth:** Requires role `reviewer` or `brand_admin`.
- **Response:** `200 OK` `{"re_reviewed_count": 2}`

### `GET /api/governance/guideline-health`
- **Purpose:** Aggregates reviewer friction per rule: acceptance rates, dismissal frequency, and data confidence.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK`

### `GET /api/governance/rule-suggestions`
- **Purpose:** Lists structured clarification proposals generated by the telemetry engine.
- **Auth:** Authenticated workspace member.
- **Response:** `200 OK`

### `POST /api/governance/rule-suggestions/{rule_id}`
- **Purpose:** Submits an administrative triage action on a rule suggestion (`ACCEPT`, `DEFER`, `REJECT`).
- **Auth:** Requires role `brand_admin`.
- **Response:** `200 OK`

### `POST /api/governance/rule-suggestions/{suggestion_id}/activate`
- **Purpose:** Activates an accepted clarification proposal, updating the live rule and incrementing version in `rule_versions`.
- **Auth:** Requires role `brand_admin`.
- **Response:** `200 OK` `{"status": "activated", "new_version": "1.1"}`

---

## 8. OpenAPI & Documentation Endpoints

- `GET /openapi.json` — Raw OpenAPI 3.1 specification.
- `GET /docs` — Interactive Swagger UI documentation.
- `GET /docs/oauth2-redirect` — Swagger OAuth helper.
- `GET /redoc` — ReDoc visual documentation.

---

## Related Documentation

- [04 — System Architecture](./04_SYSTEM_ARCHITECTURE.md)
- [07 — Backend Architecture](./07_BACKEND_ARCHITECTURE.md)
- [09 — API Request and Response Flow](./09_API_REQUEST_RESPONSE_FLOW.md)
- [10 — Database Schema](./10_DATABASE_SCHEMA.md)
