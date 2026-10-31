# 22 — EVIDENCE MANAGEMENT & DECISION CHAIN
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. The Evidence Decision Chain

Every finding in BRANDTRACE is anchored to an unbroken chain of custody:

```
[ Flagged Text Passage ]
          │
          ▼
[ Triggered Brand Rule / Claim ]
          │
          ▼
[ Supporting Ground-Truth Evidence (Title, Excerpt, Page, SHA-256) ]
          │
          ▼
[ Human Reviewer Action (Accept Fix / Dismiss with Reason / Waive) ]
          │
          ▼
[ Final Approval Decision (Admin Actor Attribution + Timestamp) ]
```

---

## 2. Unsupported vs. Contradicted Claims

A fundamental innovation of BRANDTRACE is differentiating **unsupported** statements from **contradicted** statements:
- **Unsupported Claims:** The claim is unverified because no approved evidence source exists in the Claim Ledger. The reviewer may attach evidence or request verification from the subject matter owner.
- **Contradicted Claims:** The claim explicitly disputes an approved corporate fact. This represents a high-risk compliance hazard and strictly blocks approval until corrected or dismissed.
