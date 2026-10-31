# 31 — SECURITY ARCHITECTURE AND THREAT MODEL
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Threat Matrix & Countermeasures

| Threat Vector | Severity | Attack Scenario | Countermeasure Mechanism | Status |
|---|---|---|---|:---:|
| **Unauthorized Approval** | CRITICAL | Non-admin attempts to sign off on copy | FastAPI `require_role(["brand_admin"])` dependency blocks with HTTP 403 | **VERIFIED** |
| **Draft Contamination** | HIGH | Reviewer notes overwrite publishable draft | Server-side validation rejects reason text and QA metadata strings (HTTP 422) | **VERIFIED** |
| **SQL Injection** | CRITICAL | Malicious SQL payload in search query | 100% parameterized queries via SQLAlchemy query compiler and bound parameter tuples | **VERIFIED** |
| **Cross-Tenant IDOR** | HIGH | User attempts to access draft from another tenant | All database lookups bind `workspace_id`; cross-workspace queries return HTTP 403/404 | **VERIFIED** |
| **Cross-Site Scripting** | MEDIUM | Script tags embedded in review title | React 19 automatic JSX text node escaping + sanitized DOM rendering | **VERIFIED** |
| **Prompt Injection** | MEDIUM | Adversarial text attempting policy bypass | Deterministic DFA engine evaluates prior to LLM; AI findings are strictly advisory | **VERIFIED** |
