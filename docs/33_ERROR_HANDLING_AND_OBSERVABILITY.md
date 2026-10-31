# 33 — ERROR HANDLING AND OBSERVABILITY
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Standardized Error Contracts

FastAPI routes enforce standard RFC 7807 error responses:

```json
{
  "detail": "High-risk findings (1 unresolved: 'ISO 27001 Security Certification') must be resolved before approval or waiver."
}
```

- **HTTP 400 Bad Request:** Malformed request payload or missing parameters.
- **HTTP 403 Forbidden:** Role unauthorized for requested operation.
- **HTTP 404 Not Found:** Entity not found within the authenticated workspace.
- **HTTP 409 Conflict:** State transition conflict (e.g. approval gate blocked or optimistic concurrency failure).
- **HTTP 422 Unprocessable Entity:** Schema validation failure or anti-contamination guard violation.

---

## 2. Health Monitoring Probes

- **Liveness Probe (`GET /api/health`):** Returns HTTP 200 `{"status": "ok", "service": "brandtrace", "version": "0.3.0"}`.
- **Readiness Probe (`GET /api/ready`):** Validates database connection pool health and reports active dialect (`sqlite` or `postgresql`).
