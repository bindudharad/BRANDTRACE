"""
Generator for BRANDTRACE Master Documentation Ecosystem (Category D: Docs 19 to 24).
"""
import os

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))
os.makedirs(DOCS_DIR, exist_ok=True)

docs = {}

# =============================================================================
# 19_DETERMINISTIC_GOVERNANCE_ENGINE.md
# =============================================================================
docs["19_DETERMINISTIC_GOVERNANCE_ENGINE.md"] = """# 19 — DETERMINISTIC GOVERNANCE ENGINE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Algorithmic Overview

The core governance engine (`backend/app/governance.py`) is 100% deterministic, running entirely in-process without relying on external generative AI models. It guarantees:
- **Reproducibility:** The exact same draft evaluated against the same Brand Constitution always produces identical findings and clearance scores.
- **DFA Regex Execution:** Words and phrases are compiled into word-boundary regexes (`\\bpattern\\b`), eliminating partial substring false positives (e.g. matching `"best"` inside `"asbestos"`).
- **Exact Coordinate Spans:** Finding positions are indexed by start/end character offsets, enabling surgical text replacements without altering author formatting.

---

## 2. Evaluation Pseudocode

```python
def evaluate_content_rules(text: str, workspace_id: str) -> EvaluationResult:
    active_rules = db.fetch_active_rules(workspace_id)
    approved_facts = db.fetch_approved_facts(workspace_id)
    findings = []

    # 1. Prohibited & Voice Rule Checks
    for rule in active_rules:
        pattern = re.compile(rf"\\b{re.escape(rule.pattern)}\\b", re.IGNORECASE)
        for match in pattern.finditer(text):
            findings.append(Finding(
                passage=match.group(0),
                rule_id=rule.id,
                severity=rule.severity,
                status="CONTRADICTED",
                source_title=rule.source_title,
                source_excerpt=rule.source_excerpt,
                suggested_correction=get_neutral_suggestion(match.group(0))
            ))

    # 2. Required Terminology Checks
    for req_rule in [r for r in active_rules if r.kind == "required_phrase"]:
        if not re.search(rf"\\b{re.escape(req_rule.pattern)}\\b", text, re.IGNORECASE):
            findings.append(Finding(
                passage=req_rule.pattern,
                rule_id=req_rule.id,
                severity=req_rule.severity,
                status="UNSUPPORTED_BY_APPROVED_EVIDENCE",
                explanation=f"Required approved term '{req_rule.pattern}' is missing."
            ))

    # 3. Dynamic Clearance Score Calculation
    score = calculate_clearance_score(findings)
    return EvaluationResult(findings=findings, score=score)
```
"""

# =============================================================================
# 20_BRAND_CONSTITUTION_AND_POLICY_MODEL.md
# =============================================================================
docs["20_BRAND_CONSTITUTION_AND_POLICY_MODEL.md"] = """# 20 — BRAND CONSTITUTION AND POLICY MODEL
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Policy Hierarchy

The Brand Constitution formalizes corporate brand standards into four discrete operational categories:
1. **Voice & Tone:** Prohibits hyperbolic superlatives (*"best"*, *"cheapest"*, *"guaranteed"*) without legal substantiation.
2. **Approved Terminology:** Enforces preferred corporate wording (*"accessible"* instead of *"cheap"*).
3. **Required Language:** Mandates essential brand identifiers (*"Brandtrace"* must appear in all product copy).
4. **Visual Identity:** Enforces hex color boundaries, contrast minimums, and approved logo variants.

---

## 2. Rule Lifecycle & Concurrency Control

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Creator Proposes
    DRAFT --> ACTIVE : Admin Authorizes
    ACTIVE --> REVISED : Admin Updates (Version Increments)
    REVISED --> ACTIVE : Snapshot Committed
    ACTIVE --> SUNSET : Sunset Date Reached
    SUNSET --> [*]
```

Every rule update captures an immutable snapshot in `rule_versions`. When an administrator updates a rule, the backend verifies `expected_rule_version` to prevent concurrent administrative overwrites.
"""

# =============================================================================
# 21_CORPORATE_CLAIM_LEDGER.md
# =============================================================================
docs["21_CORPORATE_CLAIM_LEDGER.md"] = """# 21 — CORPORATE CLAIM LEDGER
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
"""

# =============================================================================
# 22_EVIDENCE_MANAGEMENT_AND_DECISION_CHAIN.md
# =============================================================================
docs["22_EVIDENCE_MANAGEMENT_AND_DECISION_CHAIN.md"] = """# 22 — EVIDENCE MANAGEMENT & DECISION CHAIN
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
"""

# =============================================================================
# 23_TIME_AWARE_GOVERNANCE_AND_IMPACT_MAP.md
# =============================================================================
docs["23_TIME_AWARE_GOVERNANCE_AND_IMPACT_MAP.md"] = """# 23 — TIME-AWARE GOVERNANCE AND IMPACT MAP
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Temporal Dependency Tracking

Brand claims and rules are time-bounded assets. When a compliance certificate expires or a product feature is deprecated, all historical public marketing assets referencing that claim must be audited.

```mermaid
flowchart TD
    Fact["Approved Fact (ISO 27001 Certification)"]
    Review1["Campaign A (Approved)"]
    Review2["Whitepaper B (Approved)"]
    Review3["Brochure C (Draft)"]
    ImpactMap["Governance Impact Map Engine"]
    TargetedReReview["Targeted Re-Review Execution"]

    Fact -->|Dependency Link| Review1
    Fact -->|Dependency Link| Review2
    Fact -->|Dependency Link| Review3
    Fact -->|Expires at t < now()| ImpactMap
    ImpactMap -->|Flags Dependent Drafts| TargetedReReview
    TargetedReReview -->|Revokes Status to CHANGES_REQUESTED| Review1
    TargetedReReview -->|Revokes Status to CHANGES_REQUESTED| Review2
```

---

## 2. Targeted Re-Review Workflow

Unlike naive systems that require re-evaluating an entire enterprise content library, BRANDTRACE's `re-review-impact` engine:
1. Traverses `evidence_dependencies` to pinpoint exact dependent drafts.
2. Transitions only affected drafts from `APPROVED` back to `CHANGES_REQUESTED`.
3. Escalates review priority to `URGENT`.
4. Appends automated audit logs and discussion comments alerting assigned reviewers.
5. Leaves unrelated historical reviews completely untouched.
"""

# =============================================================================
# 24_GUIDELINE_HEALTH_INTELLIGENCE.md
# =============================================================================
docs["24_GUIDELINE_HEALTH_INTELLIGENCE.md"] = """# 24 — GUIDELINE HEALTH INTELLIGENCE & TELEMETRY
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Continuous Policy Feedback

Brand guidelines that trigger constant false positives or are routinely dismissed by reviewers create organizational friction. The Guideline Health module (`backend/app/main.py::get_guideline_health`) aggregates review outcomes to provide actionable policy intelligence:
- **Finding Volume:** Total violations flagged per rule across all submissions.
- **Dismissal Rate:** Percentage of findings dismissed by reviewers with authorized justifications.
- **Reviewer Disagreement:** Identifies rules where distinct compliance reviewers take contradictory actions on similar passages.
- **Data Confidence:** Labeled as `SUFFICIENT` ($\ge 3$ reviews) or `INSUFFICIENT` ($< 3$ reviews).

---

## 2. Clarification Suggestions & Admin Approval Gate

When high friction is detected, the engine generates a structured clarification proposal (`rule_suggestions` table). To prevent unvetted policy drift, suggestions **never** modify the Brand Constitution automatically. An authorized administrator must review and approve the proposal via `POST /api/rule-suggestions/{id}/action`.
"""

for fname, content in docs.items():
    fpath = os.path.join(DOCS_DIR, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Generated: {fname}")
