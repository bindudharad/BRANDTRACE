# 25 — AI-ASSISTED ANALYSIS ARCHITECTURE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Optional AI Advisory Model

BRANDTRACE integrates external generative AI strictly as an **optional, advisory layer** via `backend/app/ai_adapter.py`.

```
[ User Input Document ]
           │
           ▼
[ Deterministic Governance Engine ] ──(Always Executes First)──► [ Base Findings & Score ]
           │
           ├──► [ consent_ai == false ] ──────────────► [ Complete Evaluation (100% Offline) ]
           │
           └──► [ consent_ai == true ]
                      │
                      ▼
               [ PII Preflight Check ]
                      │
                      ▼
               [ Groq API Adapter ] ──────────────────► [ Advisory Suggestions & Explanations ]
```

---

## 2. Ethical Safeguards & Degradation Fallback

1. **PII Preflight Screening:** Automatic regex screening detects credit card numbers, email patterns, and phone numbers before dispatching payloads to third-party endpoints.
2. **Explicit Consent Gate:** The user must explicitly toggle `AI Analysis` on the submission interface.
3. **Graceful Offline Fallback:** If the external AI service returns an error, rate limit, or timeout, the review completes successfully using deterministic findings alone. External AI failure never blocks content evaluation.
