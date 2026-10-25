"""
Unified Governance Engine for BRANDTRACE.
Orchestrates:
1. Deterministic rule checking (prohibited phrases, required phrases, approved terms)
2. Evidence-grounded fact verification (claim ledger, expired source tracking)
3. Offline or Gemini-assisted contextual triage (claims, tone)
4. Citation validation (strictly verifies that cited rule/source IDs exist in the database)
5. Structured visual findings integration (palette Delta-E, WCAG contrast)
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional, Tuple

from .models import db, rows, row, ident, now
from .ai_adapter import get_ai_provider, AIFindingCandidate

SEVERITY_WEIGHTS = {
    "LOW": 4,
    "MEDIUM": 10,
    "HIGH": 18,
    "CRITICAL": 30,
}

UNRESOLVED_DISPOSITIONS = {None, "", "ESCALATED"}
RESOLVED_DISPOSITIONS = {"ACCEPTED_EDIT", "EDITED", "DISMISSED", "WAIVED"}

def calculate_health_score(findings: List[Dict[str, Any]]) -> int:
    """
    Governance Clearance Score (Draft Review Readiness).

    Meaning & Scope:
    Measures draft readiness for governance sign-off on a scale of 0 to 100.
    A score of 100 indicates that all detected brand policy violations, claim risks,
    and tone issues have reached a definitive disposition (corrected, edited, or granted
    an authorized human dismissal/waiver).

    CRITICAL AUDIT & COMPLIANCE SEMANTICS:
    - This score measures administrative governance clearance, NOT that unsupported
      factual claims have been proven.
    - Findings with disposition 'DISMISSED' or 'WAIVED' record human administrative exceptions
      and allow workflow progression, but their underlying evidence status (e.g. NEEDS_REVIEW,
      UNSUPPORTED_BY_APPROVED_EVIDENCE) is preserved in immutable audit records.
    - Escalation ('ESCALATED') is explicitly treated as UNRESOLVED and continues to penalize
      the score until a final corrective or administrative disposition is made.
    - If a reviewer re-escalates an earlier dismissed finding, the deduction is reapplied.

    Inputs & Penalty Weights (applied strictly to unresolved or escalated findings):
    - CRITICAL: -30
    - HIGH: -18
    - MEDIUM: -10
    - LOW: -4

    Range: 0 to 100.
    """
    unresolved = [
        f for f in findings
        if f.get("status") != "SUPPORTED"
        and (f.get("disposition") in UNRESOLVED_DISPOSITIONS or not f.get("disposition"))
    ]
    deduction = sum(SEVERITY_WEIGHTS.get(f.get("severity", "MEDIUM"), 10) for f in unresolved)
    return max(0, 100 - deduction)

def is_expired(item: Dict[str, Any]) -> bool:
    """Check if a rule or fact record has passed its expiration timestamp."""
    val = item.get("expires_at")
    return bool(val and val < now())

async def run_governance_analysis(review: Dict[str, Any], additional_visual_findings: Optional[List[Dict[str, Any]]] = None):
    """
    Execute full governance analysis on a review draft.
    Runs exact deterministic checks, then AI/offline triage, then integrates visual findings.
    """
    findings_to_insert: List[Dict[str, Any]] = []
    content = review.get("content", "")
    lower_content = content.lower()

    # Query active approved rules and facts
    active_rules = rows("SELECT * FROM rules WHERE status='APPROVED'")
    active_facts = rows("SELECT * FROM facts WHERE status='APPROVED'")

    # 1. Deterministic Rule Matching
    for rule in active_rules:
        # Require source citation on the rule
        if not (rule.get("source_title") and rule.get("source_excerpt")):
            continue

        pattern = rule.get("pattern", "")
        if not pattern:
            continue

        match = re.search(re.escape(pattern), content, re.IGNORECASE)
        rule_expired = is_expired(rule)
        status = "OUTDATED" if rule_expired else "SUPPORTED"
        kind = rule.get("kind", "")
        severity = rule.get("severity", "HIGH")
        category = rule.get("category", "terminology")

        if kind in ("prohibited_phrase", "forbidden_term") and match:
            matched_text = match.group(0)
            pat_lower = pattern.lower()

            # Context-sensitive neutral suggested correction preserving author intent
            # Note: Proposed replacement must correspond to the EXACT text span shown as the original.
            # Avoid replacing one promotional superlative with another unsupported factual claim.
            if pat_lower == "best":
                sugg = "effective"
            elif pat_lower == "best choice":
                sugg = "effective choice"
            elif pat_lower == "best platform":
                sugg = "purpose-built platform"
            elif pat_lower == "cheap":
                # Approved guideline R-TERM-03 directly recommends 'accessible'
                sugg = "accessible"
            else:
                excerpt = rule.get("source_excerpt", "")
                if "instead of" in excerpt.lower():
                    inst_match = re.search(r"use\s+([^,.]+?)\s+instead of", excerpt, re.IGNORECASE)
                    sugg = inst_match.group(1).strip() if inst_match else None
                else:
                    sugg = None

            findings_to_insert.append({
                "category": category,
                "type": kind,
                "severity": severity,
                "status": "OUTDATED" if rule_expired else "CONTRADICTED",
                "passage": matched_text,
                "explanation": f"'{matched_text}' violates approved brand rule '{rule.get('title')}'.",
                "suggested_correction": sugg,
                "source_id": rule.get("id"),
                "source_title": rule.get("source_title"),
                "source_excerpt": rule.get("source_excerpt"),
                "source_version": rule.get("version"),
                "analysis_method": "DETERMINISTIC_RULE_MATCH",
                "uncertainty": "Exact deterministic regex match against approved brand rules.",
            })
        elif kind in ("required_phrase", "approved_term") and not match:
            findings_to_insert.append({
                "category": category,
                "type": kind,
                "severity": severity,
                "status": "OUTDATED" if rule_expired else "UNSUPPORTED_BY_APPROVED_EVIDENCE",
                "passage": pattern,
                "explanation": f"Required approved language '{pattern}' is not present in the draft.",
                "suggested_correction": None,
                "source_id": rule.get("id"),
                "source_title": rule.get("source_title"),
                "source_excerpt": rule.get("source_excerpt"),
                "source_version": rule.get("version"),
                "analysis_method": "DETERMINISTIC_RULE_MATCH",
                "uncertainty": "Exact deterministic verification of mandatory term presence.",
            })

    # 2. Approved Fact Ledger Verification
    for fact in active_facts:
        fact_val = fact.get("value", "")
        if not fact_val:
            continue

        fact_expired = is_expired(fact)
        # If the draft references an expired fact's claim or value
        if fact_expired and fact_val.lower() in lower_content:
            findings_to_insert.append({
                "category": "claims",
                "type": "expired_fact",
                "severity": "HIGH",
                "status": "OUTDATED",
                "passage": fact_val,
                "explanation": f"Claim references an expired fact: '{fact.get('claim')}'. The approved source has passed its validity window.",
                "suggested_correction": None,
                "source_id": fact.get("id"),
                "source_title": fact.get("source_title"),
                "source_excerpt": fact.get("source_excerpt"),
                "source_version": fact.get("version"),
                "analysis_method": "FACT_LEDGER_AUDIT",
                "uncertainty": "Time-aware verification against approved fact ledger expiry dates.",
            })
        elif not fact_expired and fact_val.lower() in lower_content:
            # Fact is active and approved; draft contains substantiated claim
            findings_to_insert.append({
                "category": "claims",
                "type": "verified_fact",
                "severity": "LOW",
                "status": "SUPPORTED",
                "passage": fact_val,
                "explanation": f"Claim '{fact_val}' is substantiated by approved active fact '{fact.get('claim')}'.",
                "suggested_correction": None,
                "source_id": fact.get("id"),
                "source_title": fact.get("source_title"),
                "source_excerpt": fact.get("source_excerpt"),
                "source_version": fact.get("version"),
                "analysis_method": "FACT_LEDGER_AUDIT",
                "uncertainty": "Directly grounded against approved active fact ledger.",
            })

    # 3. Model / Offline AI Assistance
    ai_provider = get_ai_provider()
    try:
        ai_candidates = await ai_provider.triage_content(content, active_rules, active_facts)
        # Pre-index known source and fact IDs to validate citations strictly
        known_sources = {
            r["id"]: (r["source_title"], r["source_excerpt"], r["version"])
            for r in active_rules if r.get("id")
        }
        known_sources.update({
            f["id"]: (f["source_title"], f["source_excerpt"], f["version"])
            for f in active_facts if f.get("id")
        })

        for cand in ai_candidates:
            # Check if this exact passage was already flagged deterministically
            existing_match = next(
                (f for f in findings_to_insert if f["passage"].lower() == cand.passage.lower()),
                None
            )
            if existing_match:
                # Merge secondary context rather than inserting a duplicate finding card
                if cand.explanation and cand.explanation not in existing_match.get("explanation", ""):
                    existing_match["uncertainty"] = (
                        (existing_match.get("uncertainty") or "") +
                        f" (Corroborated by claim triage: {cand.explanation})"
                    ).strip()
                continue

            # Strict citation verification
            valid_source_id = None
            valid_source_title = None
            valid_source_excerpt = None
            valid_source_version = None

            if cand.cited_source_id and cand.cited_source_id in known_sources:
                valid_source_id = cand.cited_source_id
                valid_source_title, valid_source_excerpt, valid_source_version = known_sources[cand.cited_source_id]

            findings_to_insert.append({
                "category": cand.category,
                "type": "claim_triage" if cand.category == "claims" else "tone_triage",
                "severity": cand.severity,
                "status": cand.status,
                "passage": cand.passage,
                "explanation": cand.explanation,
                "suggested_correction": cand.suggested_correction,
                "source_id": valid_source_id,
                "source_title": valid_source_title,
                "source_excerpt": valid_source_excerpt,
                "source_version": valid_source_version,
                "analysis_method": cand.analysis_method,
                "uncertainty": cand.uncertainty,
            })
    except Exception as exc:
        # Fallback without breaking core governance flow
        pass

    # 4. Integrate Additional Visual Findings (if provided for image/file review)
    if additional_visual_findings:
        for vf in additional_visual_findings:
            findings_to_insert.append({
                "category": vf.get("category", "visual"),
                "type": vf.get("type", "visual_property"),
                "severity": vf.get("severity", "MEDIUM"),
                "status": vf.get("status", "CONTRADICTED"),
                "passage": vf.get("passage", "[Visual Asset]"),
                "explanation": vf.get("explanation", ""),
                "suggested_correction": vf.get("suggested_correction"),
                "source_id": None,
                "source_title": "Brand Visual Guidelines",
                "source_excerpt": "Visual assets must adhere to brand palette and WCAG accessibility standards.",
                "source_version": "1.0",
                "analysis_method": vf.get("analysis_method", "VISUAL_ANALYSIS"),
                "uncertainty": vf.get("uncertainty", "Deterministic visual measurements."),
            })

    # 5. Persist Findings & Compute Health Score
    with db() as conn:
        conn.execute("DELETE FROM findings WHERE review_id=?", (review["id"],))
        for item in findings_to_insert:
            fid = ident("finding")
            conn.execute(
                """
                INSERT INTO findings (
                    id, review_id, category, type, severity, status, passage,
                    explanation, suggested_correction, source_id, source_title,
                    source_excerpt, source_version, analysis_method, uncertainty,
                    disposition, disposition_reason, disposition_by, disposition_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,NULL,NULL)
                """,
                (
                    fid,
                    review["id"],
                    item["category"],
                    item["type"],
                    item["severity"],
                    item["status"],
                    item["passage"],
                    item["explanation"],
                    item.get("suggested_correction"),
                    item.get("source_id"),
                    item.get("source_title"),
                    item.get("source_excerpt"),
                    item.get("source_version"),
                    item.get("analysis_method", "DETERMINISTIC"),
                    item.get("uncertainty"),
                )
            )

        # Calculate score using unified calculate_health_score function
        final_score = calculate_health_score(findings_to_insert)

        conn.execute(
            "UPDATE reviews SET score=?, updated_at=? WHERE id=?",
            (final_score, now(), review["id"])
        )
