# 21 — CORPORATE CLAIM LEDGER
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Purpose & Data Structure

The Corporate Claim Ledger (`facts` table) acts as the single source of truth for factual assertions made in customer communications (e.g. security certifications, market share claims, enterprise SLAs).

```json
{
  "id": "fact_iso_27001",
  "workspace_id": "ws_default",
  "claim": "ISO 27001 Security Certification",
  "value": "Certified ISO/IEC 27001:2022 across all global cloud regions",
  "owner": "Information Security Officer",
  "status": "APPROVED",
  "version": "1.0",
  "source_title": "BSI Global Audit Certificate 2026",
  "source_excerpt": "Certificate ISC-9921 issued March 2026",
  "effective_at": "2026-03-01T00:00:00Z",
  "expires_at": "2026-09-01T23:59:59Z",
  "notes": "Recertification audit scheduled with BSI for Q1 2027."
}
```

---

## 2. Claim Triage States

- **SUPPORTED:** Content matches an approved corporate fact with verified evidence within its active validity window.
- **CONTRADICTED:** Content asserts a claim directly conflicting with verified ledger data (e.g. claiming 99.999% SLA when the certified SLA is 99.9%).
- **UNSUPPORTED:** Content asserts a factual claim or certification not present in the approved ledger.
- **EXPIRED:** Content references a claim whose validity period has elapsed (`expires_at < now()`).
