"""
Time-Aware Claim Ledger & Rule-Change Impact Map for BRANDTRACE.
Tracks dependencies between approved facts/rules and historical drafts.
Enables targeted re-review when an approved fact expires or a rule version updates.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List
from .models import db, rows, row, now, audit

def calculate_impact_map() -> Dict[str, Any]:
    """
    Evaluate dependencies between expired/updated facts & rules and historical drafts.
    Returns structured list of impact items with affected draft IDs and urgency levels.
    """
    impacted_items = []
    current_time = now()

    # 1. Inspect Facts for Expiration or Invalidation
    all_facts = rows("SELECT * FROM facts")
    all_reviews = rows("SELECT id, title, content, status, rule_versions FROM reviews")

    for fact in all_facts:
        fact_id = fact["id"]
        fact_claim = fact["claim"]
        fact_val = fact.get("value", "").lower()
        fact_expired = bool(fact.get("expires_at") and fact["expires_at"] < current_time)
        fact_retired = fact.get("status") == "RETIRED"

        if fact_expired or fact_retired:
            seen_ids = set()
            affected_ids = []
            affected_titles = []
            affected_drafts = []

            for r in all_reviews:
                rid = r["id"]
                if rid in seen_ids:
                    continue
                # Check if review content references the fact value or has a finding citing it
                has_finding = bool(rows("SELECT id FROM findings WHERE review_id=? AND source_id=?", (rid, fact_id)))
                mentions_fact = bool(fact_val and fact_val in r.get("content", "").lower())

                if has_finding or mentions_fact:
                    seen_ids.add(rid)
                    affected_ids.append(rid)
                    affected_titles.append(r["title"])
                    affected_drafts.append({
                        "id": rid,
                        "title": r["title"],
                        "status": r.get("status", "IN_REVIEW"),
                    })

            if affected_ids:
                impacted_items.append({
                    "item_type": "FACT",
                    "item_id": fact_id,
                    "item_title": fact_claim,
                    "status": "EXPIRED" if fact_expired else "RETIRED",
                    "expires_at": fact.get("expires_at"),
                    "affected_review_ids": affected_ids,
                    "affected_review_titles": affected_titles,
                    "affected_drafts": affected_drafts,
                    "re_review_urgency": "URGENT" if fact_expired else "RECOMMENDED",
                })

    # 2. Inspect Rules for Version Superseding or Expiry
    all_rules = rows("SELECT * FROM rules")
    for rule in all_rules:
        rule_id = rule["id"]
        rule_expired = bool(rule.get("expires_at") and rule["expires_at"] < current_time)
        rule_retired = rule.get("status") == "RETIRED"

        if rule_expired or rule_retired:
            seen_ids = set()
            affected_ids = []
            affected_titles = []
            affected_drafts = []

            for r in all_reviews:
                rid = r["id"]
                if rid in seen_ids:
                    continue
                has_finding = bool(rows("SELECT id FROM findings WHERE review_id=? AND source_id=?", (rid, rule_id)))
                in_rule_versions = False
                try:
                    rv = json.loads(r.get("rule_versions", "{}"))
                    if rule_id in rv:
                        in_rule_versions = True
                except Exception:
                    pass

                if has_finding or in_rule_versions:
                    seen_ids.add(rid)
                    affected_ids.append(rid)
                    affected_titles.append(r["title"])
                    affected_drafts.append({
                        "id": rid,
                        "title": r["title"],
                        "status": r.get("status", "IN_REVIEW"),
                    })

            if affected_ids:
                impacted_items.append({
                    "item_type": "RULE",
                    "item_id": rule_id,
                    "item_title": rule["title"],
                    "status": "EXPIRED" if rule_expired else "RETIRED",
                    "expires_at": rule.get("expires_at"),
                    "affected_review_ids": affected_ids,
                    "affected_review_titles": affected_titles,
                    "affected_drafts": affected_drafts,
                    "re_review_urgency": "URGENT" if rule_expired else "RECOMMENDED",
                })

    unique_impacted_drafts = set()
    for item in impacted_items:
        unique_impacted_drafts.update(item["affected_review_ids"])

    return {
        "total_impacted_drafts": len(unique_impacted_drafts),
        "items": impacted_items,
    }

def trigger_targeted_rereview(item_id: str, actor: str = "brand_admin") -> int:
    """
    Flag all drafts affected by an expired/changed fact or rule for re-review.
    Moves previously APPROVED drafts back to CHANGES_REQUESTED with recorded audit trail.
    """
    imap = calculate_impact_map()
    matched = next((item for item in imap["items"] if item["item_id"] == item_id), None)
    if not matched:
        return 0

    count = 0
    with db() as conn:
        for r_id in matched["affected_review_ids"]:
            r = row("SELECT status FROM reviews WHERE id=?", (r_id,))
            if r and r["status"] == "APPROVED":
                conn.execute(
                    "UPDATE reviews SET status='CHANGES_REQUESTED', updated_at=? WHERE id=?",
                    (now(), r_id)
                )
                audit(
                    review_id=r_id,
                    action="IMPACT_REREVIEW_FLAGGED",
                    actor=actor,
                    actor_role="brand_admin",
                    reason=f"Approved source '{matched['item_title']}' ({item_id}) expired or changed.",
                    details=f"Targeted re-review triggered automatically by rule-change impact map.",
                )
                count += 1
    return count
