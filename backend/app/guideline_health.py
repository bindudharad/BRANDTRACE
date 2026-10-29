"""
Guideline Health Intelligence for BRANDTRACE — Commitment 3.

Aggregates finding patterns per rule to identify rules that may need clarification.
Detects disagreements, data confidence, and generates deterministic suggestions.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Optional

from .models import rows, row


def _generate_suggestion(
    rule: Dict[str, Any],
    finding_count: int,
    dismissed_count: int,
    escalated_count: int,
    disagreement_detected: bool,
    affected_draft_count: int,
) -> Optional[Dict[str, str]]:
    """
    Deterministically generate a rule clarification suggestion based on observed patterns.
    No AI / LLM calls — purely rule-based from measurable statistics.
    """
    if finding_count == 0:
        return None

    dismiss_rate = dismissed_count / finding_count if finding_count > 0 else 0
    escalate_rate = escalated_count / finding_count if finding_count > 0 else 0
    rule_title = rule.get("title", rule.get("id", "Unknown rule"))
    rule_kind = rule.get("kind", "")
    rule_pattern = rule.get("pattern", "")

    if disagreement_detected:
        return {
            "observed_issue": (
                f"Rule '{rule_title}' has produced conflicting dispositions: the same finding "
                f"was accepted by one reviewer and dismissed by another. "
                f"This signals ambiguity in the rule scope or wording."
            ),
            "proposed_clarification": (
                f"Provide additional examples in the rule description for '{rule_pattern}' "
                f"to disambiguate edge cases. Consider adding an exceptions list."
            ),
            "ambiguity_addressed": (
                "Stakeholder disagreement on whether this pattern is always a violation "
                "or context-dependent."
            ),
        }

    if dismiss_rate >= 0.5:
        return {
            "observed_issue": (
                f"More than {int(dismiss_rate * 100)}% of findings for rule '{rule_title}' are dismissed. "
                f"High dismissal rate suggests the rule may be over-triggering or poorly scoped."
            ),
            "proposed_clarification": (
                f"Refine the pattern '{rule_pattern}' to exclude common legitimate uses. "
                f"Add context-specific exceptions or tighten the regex scope."
            ),
            "ambiguity_addressed": (
                "Rule scope may be too broad, flagging acceptable content as violations."
            ),
        }

    if escalate_rate >= 0.3:
        return {
            "observed_issue": (
                f"Rule '{rule_title}' has a high escalation rate ({int(escalate_rate * 100)}%). "
                f"Reviewers consistently escalate rather than accept or dismiss, indicating uncertainty."
            ),
            "proposed_clarification": (
                f"Clarify the severity criteria and decision guidance for rule '{rule_title}'. "
                f"Provide explicit examples of when to accept vs. dismiss findings for this pattern."
            ),
            "ambiguity_addressed": (
                "Reviewers lack confidence in final disposition; decision criteria need clarification."
            ),
        }

    if affected_draft_count >= 5 and rule_kind in ("required_phrase", "approved_term"):
        return {
            "observed_issue": (
                f"Required term rule '{rule_title}' is triggering consistently across "
                f"{affected_draft_count} drafts, suggesting contributors may be unaware of the requirement."
            ),
            "proposed_clarification": (
                f"Add the required term '{rule_pattern}' to onboarding documentation and "
                f"draft templates so contributors include it by default."
            ),
            "ambiguity_addressed": (
                "Contributor awareness gap rather than rule ambiguity; training may be more effective."
            ),
        }

    return None


def compute_guideline_health(workspace_id: str = "ws_default") -> List[Dict[str, Any]]:
    """
    Compute guideline health statistics for all rules in the workspace.

    Returns a list of health items, one per rule that has at least some findings.
    Rules with zero findings are still returned with zeroed counts.
    """
    all_rules = rows("SELECT * FROM rules WHERE workspace_id=?", (workspace_id,))

    # Fetch all findings with their review_id and source_id (rule linkage)
    all_findings = rows(
        "SELECT id, review_id, source_id, disposition, disposition_by FROM findings"
    )

    # Group findings by rule (source_id)
    findings_by_rule: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for f in all_findings:
        sid = f.get("source_id")
        if sid:
            findings_by_rule[sid].append(f)

    result = []

    for rule in all_rules:
        rule_id = rule["id"]
        rule_findings = findings_by_rule.get(rule_id, [])

        # Count distinct draft IDs (deduplicated)
        draft_ids = set(f["review_id"] for f in rule_findings)
        affected_draft_count = len(draft_ids)

        finding_count = len(rule_findings)
        accepted_count = sum(
            1 for f in rule_findings
            if f.get("disposition") in ("ACCEPTED_EDIT", "EDITED")
        )
        dismissed_count = sum(
            1 for f in rule_findings
            if f.get("disposition") == "DISMISSED"
        )
        escalated_count = sum(
            1 for f in rule_findings
            if f.get("disposition") == "ESCALATED"
        )
        waived_count = sum(
            1 for f in rule_findings
            if f.get("disposition") == "WAIVED"
        )

        # Disagreement detection: same rule accepted by actor A AND dismissed by different actor B
        # Evaluates actual distinct actors rather than comparing set equality.
        accepted_by = {
            f.get("disposition_by")
            for f in rule_findings
            if f.get("disposition") in ("ACCEPTED_EDIT", "EDITED") and f.get("disposition_by")
        }
        dismissed_by = {
            f.get("disposition_by")
            for f in rule_findings
            if f.get("disposition") == "DISMISSED" and f.get("disposition_by")
        }
        # True disagreement: at least one known actor accepted AND a DIFFERENT known actor dismissed
        disagreement_detected = any(
            a != d
            for a in accepted_by
            for d in dismissed_by
            if a and d and a != "unknown" and d != "unknown"
        )

        # Data confidence: insufficient if fewer than 3 independent drafts
        data_confidence = "SUFFICIENT" if affected_draft_count >= 3 else "INSUFFICIENT"

        # Representative finding IDs (up to 3)
        representative_finding_ids = [f["id"] for f in rule_findings[:3]]

        suggestion = _generate_suggestion(
            rule=rule,
            finding_count=finding_count,
            dismissed_count=dismissed_count,
            escalated_count=escalated_count,
            disagreement_detected=disagreement_detected,
            affected_draft_count=affected_draft_count,
        )

        item: Dict[str, Any] = {
            "rule_id": rule_id,
            "rule_title": rule.get("title", rule_id),
            "rule_severity": rule.get("severity", "MEDIUM"),
            "affected_draft_count": affected_draft_count,
            "finding_count": finding_count,
            "accepted_count": accepted_count,
            "dismissed_count": dismissed_count,
            "escalated_count": escalated_count,
            "waived_count": waived_count,
            "disagreement_detected": disagreement_detected,
            "data_confidence": data_confidence,
            "representative_finding_ids": representative_finding_ids,
            "suggestion": suggestion,
        }
        result.append(item)

    # Sort: rules with most findings first, then alphabetically
    result.sort(key=lambda x: (-x["finding_count"], x["rule_id"]))
    return result
