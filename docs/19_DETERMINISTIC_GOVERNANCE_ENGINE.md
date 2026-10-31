# 19 — DETERMINISTIC GOVERNANCE ENGINE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Algorithmic Overview

The core governance engine (`backend/app/governance.py`) is 100% deterministic, running entirely in-process without relying on external generative AI models. It guarantees:
- **Reproducibility:** The exact same draft evaluated against the same Brand Constitution always produces identical findings and clearance scores.
- **DFA Regex Execution:** Words and phrases are compiled into word-boundary regexes (`\bpattern\b`), eliminating partial substring false positives (e.g. matching `"best"` inside `"asbestos"`).
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
        pattern = re.compile(rf"\b{re.escape(rule.pattern)}\b", re.IGNORECASE)
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
        if not re.search(rf"\b{re.escape(req_rule.pattern)}\b", text, re.IGNORECASE):
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
