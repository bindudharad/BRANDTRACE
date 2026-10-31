# 01 — PROJECT OVERVIEW
**Platform Name:** BRANDTRACE
**Tagline:** *Every finding has a source. Every decision has an owner.*
**Product Category:** Evidence-Aware Brand Governance and Content Review Platform
**Hackathon:** CodeAxis Hackathon — Final Round (Team: `Team_Nexus`)
**Status:** **VERIFIED IMPLEMENTED & PRODUCTION READY**

---

## 1. Executive Summary

BRANDTRACE is an enterprise-grade pre-publication brand governance platform designed to enforce corporate standards, brand voice, factual claims, and visual identity before marketing copy reaches production.

Modern marketing organizations face an acute governance challenge: generative AI models and distributed agencies produce massive volumes of copy at unprecedented speed, yet existing compliance workflows rely on manual review, fragmented PDF style guides, and untracked email approvals. Prohibited phrases slip into public campaigns, unverified factual claims expose companies to regulatory scrutiny, and approval decisions lack auditable ownership.

BRANDTRACE solves this challenge through a **deterministic-first, evidence-aware pipeline**:
1. **Authoritative Substrate:** Brand policies, approved terminology, and verified corporate claims are formalized into queryable database models.
2. **Deterministic Evaluation:** Content is evaluated using exact string, regex, and token algorithms before any optional generative AI advisory is consulted.
3. **Evidence Traceability:** Every finding explicitly cites the supporting ground-truth source document, page number, and policy excerpt.
4. **Human Release Control:** Server-side approval gates prevent publishing drafts with unresolved high-risk findings.
5. **Time-Aware Lifecycle:** Corporate facts and brand rules carry validity periods; when claims expire, historical drafts depending on them are flagged for targeted re-review.

---

## 2. Core Product Principles

```
  AI Can Assist  ──────►  Evidence Must Justify  ──────►  Humans Must Decide
(Advisory Only)          (Ground-Truth Sources)           (Strict Approval Gates)
```

- **Deterministic Before Generative:** Core policy evaluation runs locally without external LLM dependencies, ensuring reproducible, tamper-evident scoring.
- **Traceability Over Assertion:** A compliance penalty is never applied without a direct citation link to an approved policy or claim record.
- **Strict Server-Side Accountability:** Client-side bypass is architecturally impossible; backend APIs enforce role-based access control and block non-compliant state transitions.
- **Continuous Temporal Governance:** Policies are not static; sunset dates and expiring claims trigger proactive impact analysis across historical assets.

---

## 3. Product Status & Verification Summary

| Dimension | Specification | Implementation Status | Verification Evidence |
|---|---|:---:|---|
| **Core Architecture** | React 19 + FastAPI + SQLAlchemy | **VERIFIED IMPLEMENTED** | `backend/app/main.py`, `src/App.tsx` |
| **Deterministic Engine** | Exact token, regex & claim matching | **VERIFIED IMPLEMENTED** | `backend/app/governance.py` |
| **Claim Ledger & Impact** | Time-aware fact validation & impact map | **VERIFIED IMPLEMENTED** | `backend/app/services/expiry_monitor.py` |
| **Visual Compliance** | SHA-256 asset registry & CIELAB Delta-E | **VERIFIED IMPLEMENTED** | `backend/app/image_analyzer.py` |
| **Guideline Health** | Reviewer telemetry & suggestion ledger | **VERIFIED IMPLEMENTED** | `backend/app/services/guideline_importer.py` |
| **Test Verification** | 190 Pytest + 32 Browser QA scenarios | **VERIFIED IMPLEMENTED** | Full suite execution: 0 failures |

---

## 4. Public Project Links & Team Information

- **Live Application:** [https://brandtrace-woad.vercel.app/](https://brandtrace-woad.vercel.app/)
- **Public GitHub Repository:** [https://github.com/bindudharad/BRANDTRACE](https://github.com/bindudharad/BRANDTRACE)
- **Backend API Base:** [https://brandtrace-api.onrender.com/](https://brandtrace-api.onrender.com/)
- **Backend Health Check:** [https://brandtrace-api.onrender.com/api/health](https://brandtrace-api.onrender.com/api/health)
- **API Documentation (Swagger UI):** [https://brandtrace-api.onrender.com/docs](https://brandtrace-api.onrender.com/docs)

**Team Nexus:**
- **Team Leader:** Bindudhara D
- **Core Engineering:** Vishwanath B S, Supriya K S, Tejaswini D
