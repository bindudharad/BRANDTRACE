"""
Deterministic Rule Conflict Detection Service for BRANDTRACE.
Detects contradictory and duplicate governance policies before rules become active.
Uses deterministic Unicode, case, and whitespace normalization without relying on AI authority.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, List, Optional


def normalize_pattern(pattern: str) -> str:
    """Deterministic normalization for rule pattern comparison.

    1. NFKC Unicode normalization
    2. Case folding (lower)
    3. Collapse whitespace
    4. Strip surrounding punctuation
    """
    if not pattern:
        return ""
    text = unicodedata.normalize("NFKC", str(pattern))
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    text = text.strip("'\"“”‘’.,;:-_")
    return text


def scopes_overlap(scope_a: Optional[str], scope_b: Optional[str]) -> bool:
    """Check if two applicable_document_types scopes have any overlapping audience/documents."""
    s_a = (scope_a or "all").lower().strip()
    s_b = (scope_b or "all").lower().strip()
    if s_a in ("all", "*", "") or s_b in ("all", "*", ""):
        return True
    types_a = {t.strip() for t in s_a.split(",") if t.strip()}
    types_b = {t.strip() for t in s_b.split(",") if t.strip()}
    return bool(types_a.intersection(types_b))


def periods_overlap(
    eff_a: Optional[str], exp_a: Optional[str],
    eff_b: Optional[str], exp_b: Optional[str]
) -> bool:
    """Check if effective validity periods overlap in time."""
    # If neither specifies dates, they are indefinitely valid and therefore overlap
    if not (eff_a or exp_a or eff_b or exp_b):
        return True
    # If one expires before the other becomes effective, they do not overlap
    if exp_a and eff_b and exp_a <= eff_b:
        return False
    if exp_b and eff_a and exp_b <= eff_a:
        return False
    return True


REQUIRED_KINDS = {"required_phrase", "approved_term"}
PROHIBITED_KINDS = {"prohibited_phrase", "forbidden_term"}


def detect_conflicts_between_rules(
    rule_a: Dict[str, Any],
    rule_b: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Compare two rules deterministically for contradictions, duplicates, or incompatibilities."""
    id_a = str(rule_a.get("id", "rule_a"))
    id_b = str(rule_b.get("id", "rule_b"))
    if id_a == id_b:
        return None

    pat_a_raw = rule_a.get("pattern", "")
    pat_b_raw = rule_b.get("pattern", "")
    norm_a = normalize_pattern(pat_a_raw)
    norm_b = normalize_pattern(pat_b_raw)

    if not norm_a or not norm_b:
        return None

    kind_a = rule_a.get("kind", "")
    kind_b = rule_b.get("kind", "")

    # Check scope and time overlap
    scope_overlap = scopes_overlap(
        rule_a.get("applicable_document_types"),
        rule_b.get("applicable_document_types")
    )
    time_overlap = periods_overlap(
        rule_a.get("effective_at"), rule_a.get("expires_at"),
        rule_b.get("effective_at"), rule_b.get("expires_at")
    )

    # 1. Exact phrase contradictory requirement vs prohibition
    # E.g. Rule A requires "guaranteed" and Rule B prohibits "guaranteed"
    is_contradiction = (
        (kind_a in REQUIRED_KINDS and kind_b in PROHIBITED_KINDS and norm_a == norm_b) or
        (kind_a in PROHIBITED_KINDS and kind_b in REQUIRED_KINDS and norm_a == norm_b)
    )

    if is_contradiction:
        if scope_overlap and time_overlap:
            req_rule = rule_a if kind_a in REQUIRED_KINDS else rule_b
            pro_rule = rule_b if kind_a in REQUIRED_KINDS else rule_a
            return {
                "conflict_type": "HARD_CONFLICT",
                "severity": "CRITICAL",
                "rule_a_id": id_a,
                "rule_a_title": rule_a.get("title", ""),
                "rule_a_kind": kind_a,
                "rule_a_pattern": pat_a_raw,
                "rule_b_id": id_b,
                "rule_b_title": rule_b.get("title", ""),
                "rule_b_kind": kind_b,
                "rule_b_pattern": pat_b_raw,
                "explanation": (
                    f"Direct policy contradiction: '{req_rule.get('title')}' ({req_rule.get('id')}) requires phrase '{norm_a}' "
                    f"while '{pro_rule.get('title')}' ({pro_rule.get('id')}) strictly prohibits the same phrase in overlapping scopes."
                ),
                "resolution_recommendation": (
                    f"Decide whether '{norm_a}' is approved or prohibited. Modify or retire one of the conflicting rules before publication."
                ),
            }
        else:
            return {
                "conflict_type": "POTENTIAL_CONFLICT",
                "severity": "MEDIUM",
                "rule_a_id": id_a,
                "rule_a_title": rule_a.get("title", ""),
                "rule_a_kind": kind_a,
                "rule_a_pattern": pat_a_raw,
                "rule_b_id": id_b,
                "rule_b_title": rule_b.get("title", ""),
                "rule_b_kind": kind_b,
                "rule_b_pattern": pat_b_raw,
                "explanation": (
                    f"Contradictory phrases '{norm_a}' with non-overlapping document scopes or effective dates."
                ),
                "resolution_recommendation": "Verify that scoped boundaries prevent contradictory guidance on documents.",
            }

    # 2. Duplicate rule check
    # E.g. Two active rules with the exact same normalized pattern and same kind
    is_duplicate = (norm_a == norm_b and kind_a == kind_b and scope_overlap and time_overlap)
    if is_duplicate:
        return {
            "conflict_type": "DUPLICATE_RULE",
            "severity": "HIGH",
            "rule_a_id": id_a,
            "rule_a_title": rule_a.get("title", ""),
            "rule_a_kind": kind_a,
            "rule_a_pattern": pat_a_raw,
            "rule_b_id": id_b,
            "rule_b_title": rule_b.get("title", ""),
            "rule_b_kind": kind_b,
            "rule_b_pattern": pat_b_raw,
            "explanation": (
                f"Duplicate policy rule: Rule '{rule_a.get('title')}' ({id_a}) and Rule '{rule_b.get('title')}' ({id_b}) "
                f"enforce the same '{kind_a}' on pattern '{norm_a}'."
            ),
            "resolution_recommendation": f"Retire duplicate rule '{id_b}' to maintain a single authoritative source of truth.",
        }

    # 3. Substring / Containment incompatibility
    # E.g. Rule A requires "Brandtrace Platform" but Rule B prohibits "Brandtrace"
    if scope_overlap and time_overlap:
        if kind_a in REQUIRED_KINDS and kind_b in PROHIBITED_KINDS:
            if norm_b in norm_a:
                return {
                    "conflict_type": "HARD_CONFLICT",
                    "severity": "HIGH",
                    "rule_a_id": id_a,
                    "rule_a_title": rule_a.get("title", ""),
                    "rule_a_kind": kind_a,
                    "rule_a_pattern": pat_a_raw,
                    "rule_b_id": id_b,
                    "rule_b_title": rule_b.get("title", ""),
                    "rule_b_kind": kind_b,
                    "rule_b_pattern": pat_b_raw,
                    "explanation": (
                        f"Incompatible phrase requirements: Required phrase '{pat_a_raw}' contains prohibited term '{pat_b_raw}'."
                    ),
                    "resolution_recommendation": "Harmonize mandatory phrase vocabulary with prohibited terminology list.",
                }
        elif kind_a in PROHIBITED_KINDS and kind_b in REQUIRED_KINDS:
            if norm_a in norm_b:
                return {
                    "conflict_type": "HARD_CONFLICT",
                    "severity": "HIGH",
                    "rule_a_id": id_a,
                    "rule_a_title": rule_a.get("title", ""),
                    "rule_a_kind": kind_a,
                    "rule_a_pattern": pat_a_raw,
                    "rule_b_id": id_b,
                    "rule_b_title": rule_b.get("title", ""),
                    "rule_b_kind": kind_b,
                    "rule_b_pattern": pat_b_raw,
                    "explanation": (
                        f"Incompatible phrase requirements: Prohibited phrase '{pat_a_raw}' is contained in required term '{pat_b_raw}'."
                    ),
                    "resolution_recommendation": "Harmonize mandatory phrase vocabulary with prohibited terminology list.",
                }

    return None


def scan_all_rule_conflicts(rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Scan all rules within a workspace and return detected conflicts."""
    conflicts: List[Dict[str, Any]] = []
    seen_pairs = set()

    n = len(rules)
    for i in range(n):
        for j in range(i + 1, n):
            pair_key = tuple(sorted([str(rules[i].get("id", i)), str(rules[j].get("id", j))]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            c = detect_conflicts_between_rules(rules[i], rules[j])
            if c:
                conflicts.append(c)

    return conflicts


def check_candidate_conflicts(
    candidate: Dict[str, Any],
    active_rules: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Check a proposed rule or candidate against existing active rules."""
    conflicts: List[Dict[str, Any]] = []
    for r in active_rules:
        c = detect_conflicts_between_rules(candidate, r)
        if c:
            conflicts.append(c)
    return conflicts
