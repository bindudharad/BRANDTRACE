# 16 — API ENDPOINT SPECIFICATION
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## Core Operational Endpoints

| Method | Endpoint | Description | Auth Role | Status Codes |
|---|---|---|---|:---:|
| `GET` | `/api/health` | Service health check | Anonymous | 200 |
| `GET` | `/api/ready` | Database readiness & dialect probe | Anonymous | 200, 503 |
| `POST` | `/api/rules` | Create brand constitution rule | `brand_admin` | 201, 403, 422 |
| `GET` | `/api/rules` | List brand constitution rules | Any | 200 |
| `GET` | `/api/rules/{id}/versions` | Get rule version history | Any | 200, 404 |
| `POST` | `/api/facts` | Create corporate claim fact | `brand_admin` | 201, 403, 422 |
| `GET` | `/api/facts` | List corporate claim facts | Any | 200 |
| `POST` | `/api/reviews` | Submit document draft for review | Any | 201, 422 |
| `GET` | `/api/reviews/{id}` | Get review with findings & history | Any | 200, 404 |
| `POST` | `/api/reviews/{id}/findings/{fid}/actions` | Apply exact-span edit or dismissal | `reviewer` | 200, 404, 422 |
| `POST` | `/api/reviews/{id}/approval` | Final compliance approval gate | `brand_admin` | 200, 403, 409 |
| `GET` | `/api/reviews/{id}/export-evidence` | Export compliance packet (PDF/JSON)| Any | 200, 404 |
| `GET` | `/api/governance/impact-map` | Fetch claim & rule dependency map | Any | 200 |
| `POST` | `/api/governance/re-review-impact` | Trigger targeted re-review | `brand_admin` | 200, 403 |
| `POST` | `/api/brand-assets/analyze` | Image color palette & contrast | Any | 200, 422 |
| `GET` | `/api/brand-assets/{id}/similarity` | 64-bit dHash perceptual similarity | Any | 200, 404 |
| `POST` | `/api/constitution/import-guidelines`| Ingest digital guideline PDF | `brand_admin` | 201, 403 |
| `POST` | `/api/constitution/candidates/{id}/approve` | Approve guideline candidate | `brand_admin` | 200, 403 |
| `GET` | `/api/constitution/conflicts` | Detect rule contradictions | Any | 200 |
| `POST` | `/api/governance/expiry-worker/trigger` | Execute proactive expiry scan | `brand_admin` | 200, 403 |
