# 32 — PRIVACY AND DATA HANDLING SPECIFICATION
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Data Classification

- **Public Marketing Content:** Draft copy and published releases evaluated under standard brand governance.
- **Corporate Ground-Truth Evidence:** Internal audit certificates, security standards, and brand rules stored in workspace-scoped tables.
- **Personally Identifiable Information (PII):** Screened via preflight regex patterns; never transmitted to external AI endpoints without explicit user opt-in.

---

## 2. Third-Party Data Transmission Policy

1. **Zero External Calls by Default:** Digital text extraction, rule matching, visual palette analysis, and approval gates run 100% locally in-process.
2. **Opt-In Advisory AI:** When external AI is toggled (`consent_ai=true`), document text is transmitted via HTTPS to the Groq API for non-binding advisory suggestions.
3. **Zero Retention by External AI:** Provider contracts specify zero training retention on API inference requests.
