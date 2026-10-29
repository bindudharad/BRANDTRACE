# BRANDTRACE API Reference Manual

The BRANDTRACE REST API exposes programmatic interfaces for content analysis, finding remediation, approval gating, and audit inspection. All endpoints consume and emit `application/json` unless multipart file streaming is explicitly required.

---

## Authentication & Role Simulation

In the current release, authentication and authorization are simulated via HTTP headers passed with each request:
* `X-Demo-Role`: Active role persona (`contributor`, `reviewer`, `brand_admin`, `auditor`).
* `X-Demo-Actor`: Display name or email of the active user (e.g., `brand_admin@company.com`).

---

## Complete Endpoint Reference

### 1. Health & System Readiness

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Immediate liveness probe & AI provider mode | Any | None | `{"status": "ok", "provider": "offline", "version": "1.0.0"}` |
| `GET` | `/api/ready` | Readiness probe verifying DB connection | Any | None | `{"status": "ready", "database": "connected"}` |

### 2. Workspace Overview & Brand Profiles

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/overview` | Workspace metrics, profile, and recent reviews | Any | None | `OverviewOut` (workspace, reviews, metrics, profile) |
| `GET` | `/api/brand-profile` | Fetch brand colors and contrast thresholds | Any | None | `BrandProfileOut` (hex colors, contrast ratio, logo aspect) |
| `PUT` | `/api/brand-profile` | Update brand visual tokens | `brand_admin` | `BrandProfileIn` | `BrandProfileOut` |

### 3. Governance Rules Management

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/rules` | List all active and retired brand rules | Any | None | `List[RuleOut]` |
| `POST` | `/api/rules` | Create new brand rule (status 201) | `brand_admin` | `RuleIn` | `RuleOut` |
| `PUT` | `/api/rules/{id}` | Update existing rule attributes or retire | `brand_admin` | `RuleUpdateIn` | `RuleOut` |

### 4. Approved Claim Ledger (Facts)

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/facts` | List all approved factual assertions | Any | None | `List[FactOut]` |
| `POST` | `/api/facts` | Add verified fact to ledger (status 201) | `brand_admin` | `FactIn` | `FactOut` |
| `PUT` | `/api/facts/{id}` | Update fact, adjust expiration, or retire | `brand_admin` | `FactUpdateIn` | `FactOut` |

### 5. Review Drafts & File Uploads

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/reviews` | List recent review drafts in workspace | Any | None | `List[ReviewOut]` |
| `POST` | `/api/reviews` | Submit new text draft for governance analysis | `contributor`, `reviewer`, `brand_admin` | `ReviewIn` (`title`, `content`, `content_type`) | `ReviewOut` (with findings and health score) |
| `POST` | `/api/reviews/upload` | Multipart upload for PDF, PNG, or JPEG | `contributor`, `reviewer`, `brand_admin` | `multipart/form-data` (`file`, optional `title`) | `ReviewOut` |
| `GET` | `/api/reviews/{id}` | Get review by ID with findings and versions | Any | None | `ReviewOut` |

### 6. Finding Actions & Dispositions

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/reviews/{id}/findings/{fid}/actions` | Apply action: accept, edit, dismiss, escalate | `reviewer`, `brand_admin` (`contributor` restricted from dismiss) | `FindingAction` (`action`, `reason`, optional `replacement`) | `ReviewOut` (recalculated score and updated draft) |

*Server-Side Guards on Finding Actions:*
* If `action == "dismiss"` and `role == "contributor"` → `HTTP 403 Forbidden`.
* If `action in ("dismiss", "edit")` and `reason` is empty → `HTTP 422 Unprocessable`.
* If `replacement == reason` (cross-contamination) → `HTTP 422 Unprocessable`.
* If `replacement` starts with QA prefixes (`Manual QA:`, etc.) → `HTTP 422 Unprocessable`.
* If resolving missing `required_phrase` and `replacement` lacks required term → `HTTP 422 Unprocessable`.

### 7. Review Approval Workflow

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/reviews/{id}/approval` | Final review approval, changes, or waiver | `reviewer`, `brand_admin` | `ApprovalAction` (`action`: `approve`, `request_changes`, `waive`; `reason`) | `ReviewOut` (updated review status) |

*Server-Side Guards on Approval:*
* If user role is `contributor` or `auditor` → `HTTP 403 Forbidden`.
* If `action in ("approve", "waive")` and any unresolved `HIGH` or `CRITICAL` findings remain → `HTTP 409 Conflict`.
* If `action == "waive"` and `reason` is empty → `HTTP 422 Unprocessable`.

### 8. Draft Versions & Rollback

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/reviews/{id}/versions` | List all historical draft snapshots | Any | None | `List[DraftVersion]` |
| `POST` | `/api/reviews/{id}/restore/{vid}` | Roll back draft to previous version | `contributor`, `reviewer`, `brand_admin` | None | `ReviewOut` (re-analyzed draft) |

### 9. Audit History Log

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/reviews/{id}/audit` | Fetch append-only audit trail for draft | Any | None | `List[AuditEntry]` (ordered by `created_at DESC`) |

### 10. Analytics & Claim Impact Map

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/insights` | Aggregate recurring violations & metrics | Any | None | `InsightsOut` (recurring rules, breakdown by severity) |
| `GET` | `/api/governance/impact-map` | Identify drafts impacted by expired facts/rules | Any | None | `ImpactMapOut` (impacted items, affected draft IDs) |
| `POST` | `/api/governance/re-review-impact` | Trigger batch re-review of impacted drafts | `brand_admin` | None | `{"re_reviewed": int, "details": list}` |

### 11. Demo Seeding & Environment Reset

| Method | Path | Purpose | Required Role | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/demo/setup` | Idempotently seed workspace, rules, & facts | Any | None | `OverviewOut` |
| `POST` | `/api/demo/reset` | Completely wipe DB and restore pristine demo | Any | None | `OverviewOut` |
