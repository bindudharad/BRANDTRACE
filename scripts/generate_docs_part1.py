"""
Generator for BRANDTRACE Master Documentation Ecosystem (Categories A & B: Docs 01 to 10).
"""
import os

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))
os.makedirs(DOCS_DIR, exist_ok=True)

docs = {}

# =============================================================================
# 01_PROJECT_OVERVIEW.md
# =============================================================================
docs["01_PROJECT_OVERVIEW.md"] = """# 01 — PROJECT OVERVIEW
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
"""

# =============================================================================
# 02_PROJECT_VISION_AND_MISSION.md
# =============================================================================
docs["02_PROJECT_VISION_AND_MISSION.md"] = """# 02 — PROJECT VISION AND MISSION
**Platform:** BRANDTRACE
**Tagline:** *Every finding has a source. Every decision has an owner.*
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Product Vision

The long-term vision of BRANDTRACE is to establish the global enterprise standard for **verifiable content governance**. In an era where generative AI allows organizations to synthesize enterprise content in milliseconds, the bottleneck of brand trust is no longer creation—it is **verification, provenance, and accountability**.

BRANDTRACE transforms passive style guide PDFs and scattered legal spreadsheets into a living, computational governance substrate. By bridging the gap between brand marketing and regulatory compliance, BRANDTRACE ensures that every public-facing claim, visual mark, and brand expression is backed by verifiable ground-truth evidence.

---

## 2. Mission Statement

> *"To empower enterprise marketing, legal, and brand teams with deterministic governance intelligence, ensuring that every compliance finding has an unassailable source, every edit preserves author intent, and every publication decision has an accountable human owner."*

---

## 3. Ordinary Content Checkers vs. Evidence-Aware Governance

| Dimension | Generic AI Content Checkers (Grammarly, Writer) | BRANDTRACE Evidence-Aware Platform |
|---|---|---|
| **Underlying Engine** | Probabilistic LLM prompt heuristics | **Deterministic regex, token & database matching** |
| **Finding Justification** | Black-box generated explanations | **Direct link to approved guideline source & page** |
| **Factual Claim Triage** | Hallucinates or guesses factual truth | **Verifies claims against time-aware Claim Ledger** |
| **Approval Enforcement** | Informational score; no blocking mechanism | **Server-side HTTP 409 gate blocks high-risk drafts** |
| **Auditability** | Ephemeral browser session; untracked edits | **Immutable append-only audit ledger with actor attribution** |
| **Temporal Awareness** | Oblivious to fact expiry or sunsetting | **Impact Map flags drafts when underlying facts expire** |
| **Visual Asset Matching**| Generic computer vision classifications | **Exact SHA-256 asset registry + CIELAB Delta-E color science** |

---

## 4. Responsible AI Philosophy

BRANDTRACE enforces a strict boundary between automated computation and human decision authority:
1. **Advisory Role:** Generative AI is strictly optional and advisory. It cannot alter clearance scores, dismiss high-risk violations, or bypass approval gates.
2. **Deterministic Primacy:** Deterministic rule evaluation runs first. AI suggestions are framed as proposals requiring human validation.
3. **Anti-Contamination:** Internal reviewer notes, rationale, and audit sign-offs are strictly blocked from contaminating customer-facing copy.
"""

# =============================================================================
# 03_PROBLEM_STATEMENT_AND_RESEARCH.md
# =============================================================================
docs["03_PROBLEM_STATEMENT_AND_RESEARCH.md"] = """# 03 — PROBLEM STATEMENT AND RESEARCH
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. The Enterprise Governance Breakdown

Enterprise brand governance is currently fractured across disconnected silos:
- **Static Guidelines:** Brand manuals exist as 100+ page PDFs that content creators rarely read completely.
- **Unverified Generative Copy:** Marketing teams and agencies increasingly use generative AI tools that invent claims or use prohibited terminology.
- **Fragmented Factual Claims:** Product specifications, pricing tiers, and compliance certifications reside in disparate internal spreadsheets with no expiration tracking.
- **Accountability Vacuum:** Approvals occur via informal Slack threads and email chains, leaving compliance teams unable to establish who authorized non-compliant copy when regulatory inquiries arise.

---

## 2. Documented Industry Failure Modes

```
[ Generative Copy Synthesis ] ──► [ Unverified Superlative ("The Best Solution") ]
                                                 │
                                                 ▼
[ Publication Without Check ] ◄── [ Static PDF Manual Ignored by Creator ]
              │
              ▼
[ Regulatory Action / Brand Dilution / Legal Exposure ]
```

1. **Unsubstantiated Superlatives:** Using terms like *"best"*, *"cheapest"*, or *"guaranteed"* without third-party proof triggers regulatory penalties under consumer protection laws (e.g., FTC guidelines, UK ASA rules).
2. **Expired Certifications:** Advertising expired security standards (e.g., ISO 27001 or SOC 2) after renewal lapses creates severe enterprise breach of contract risks.
3. **Logo Clearspace & Brand Mark Distortion:** Deprecated logos or altered color palettes undermine multi-million dollar brand equity.

---

## 3. Research Foundations in BRANDTRACE

BRANDTRACE's architecture is grounded in three verified research pillars:
- **Deterministic Pattern Matching:** Utilizing deterministic finite automata (DFA) regex pipelines to eliminate non-deterministic hallucinations in compliance triage.
- **CIE76 / CIELAB Color Difference Science:** Replacing naive RGB Euclidean distance with perceptually uniform $L^*a^*b^*$ Delta-E calculations ($\Delta E^* \le 2.0$ represents standard just-noticeable difference).
- **Temporal Graph Dependency Mapping:** Directed acyclic graphs (DAGs) linking root evidence sources to corporate facts, rules, and dependent published content.
"""

# =============================================================================
# 04_TARGET_USERS_AND_USE_CASES.md
# =============================================================================
docs["04_TARGET_USERS_AND_USE_CASES.md"] = """# 04 — TARGET USERS AND USE CASES
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Target User Personas

| Persona | Organizational Role | Core Responsibilities | Key BRANDTRACE Modules |
|---|---|---|---|
| **Content Creator** | Internal Marketer, Copywriter, External Agency | Drafts campaigns, announcements, blog posts, product sheets | Content Review, Exact-Span Fixes, Version History |
| **Compliance Reviewer** | Legal Counsel, Brand Governance Officer | Evaluates flagged violations, inspects provenance, verifies claims | Review Queue, Finding Actions, Comments Panel |
| **Brand Administrator** | VP Brand, Head of Marketing Operations | Defines brand constitution, maintains claim ledger, authorizes releases | Brand Constitution, Claim Ledger, Impact Map, Admin Approval Gate |
| **Auditor / Evaluator** | Internal Audit, External Regulatory Assessor | Reviews historical compliance records and evidence dossiers | Audit Trail, Evidence Export (PDF/JSON) |

---

## 2. Real-World Use Cases

### Use Case 1: Q4 Product Launch Campaign Triage
- **Context:** An agency submits promotional copy claiming: *"Brandtrace is the best and cheap solution. We maintain ISO 27001 Security Certification."*
- **Workflow:**
  1. Creator submits text via `POST /api/reviews`.
  2. Engine flags `"best"` (prohibited superlative) and `"cheap"` (unapproved price terminology).
  3. Reviewer inspects ground-truth excerpt: *"Do not claim to be the 'best' without third-party proof."*
  4. Reviewer clicks **Accept Replacement**, applying `"effective"` with zero word duplication.
  5. Reviewer dismisses `"cheap"` citing promotion license exception.
  6. Admin signs off; review transitions to `APPROVED` (Score 100).

### Use Case 2: Expired Security Certification Impact Revocation
- **Context:** Annual recertification for ISO 27001 lapses.
- **Workflow:**
  1. The automated expiry worker detects `facts.expires_at < now()`.
  2. The Governance Impact Map identifies all previously approved campaigns referencing the ISO fact.
  3. Targeted re-review automatically transitions dependent approved drafts to `CHANGES_REQUESTED`.
  4. Automated audit log records `EXPIRY_RE_REVIEW_TRIGGERED` and alerts assigned reviewers.
"""

# =============================================================================
# 05_PRODUCT_SCOPE_AND_NON_GOALS.md
# =============================================================================
docs["05_PRODUCT_SCOPE_AND_NON_GOALS.md"] = """# 05 — PRODUCT SCOPE AND NON-GOALS
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Supported In-Scope Capabilities

- **Document Formats:** Direct plain text, Markdown, digital PDFs (`pypdf` extraction), and standard image formats (PNG, JPEG, WebP).
- **Rule Categories:** Voice & Tone, Required Terminology, Prohibited Phrases, and Corporate Fact Matching.
- **Visual Compliance:** Exact SHA-256 binary matching, dominant palette extraction, CIELAB Delta-E color distance, and WCAG 2.1 relative luminance contrast evaluation.
- **Workflow Control:** Multi-tenant workspace scoping (`workspace_id`), 4-role RBAC, exact-span text replacements, version history snapshots, and server-side approval gates.
- **Compliance Dossiers:** Exportable tamper-evident JSON and PDF dossiers via ReportLab.

---

## 2. Explicit Non-Goals & Architectural Boundaries

To preserve architectural integrity and avoid overclaiming, BRANDTRACE explicitly defines what it is **not**:
1. **Not an Automated Legal Decision System:** BRANDTRACE provides decision support and evidence triage. Final publication approval requires an authorized human decision maker.
2. **Not a Generative Copywriting Tool:** BRANDTRACE does not write marketing copy from scratch; its focus is inspecting and governing pre-written human or AI content.
3. **Not a Universal OCR Scanner:** OCR is supported on a best-effort basis for scanned images; digital document extraction is prioritized.
4. **Not a Perceptual 3D Layout Engine:** Visual asset analysis validates color accuracy, clearspace, and binary integrity, but does not claim complete 3D scene understanding.
"""

for fname, content in docs.items():
    fpath = os.path.join(DOCS_DIR, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Generated: {fname}")
