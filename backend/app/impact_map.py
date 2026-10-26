"""
Time-Aware Claim Ledger & Rule-Change Impact Map for BRANDTRACE.
Tracks dependencies between approved facts/rules and historical drafts.
Enables targeted re-review when an approved fact expires or a rule version updates.

Round 3 additions:
- EXPIRING_SOON status for items expiring within 30 days
- affected_count field on each impact item
- expiry_date alias for expires_at
- Timezone-safe datetime comparisons
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from .models import db, rows, row, now, audit, save_version


def _parse_iso(val: Optional[str]) -> Optional[datetime]:
    """Parse an ISO 8601 string to a timezone-aware datetime, or return None."""
    if not val:
        return None
    try:
        dt = datetime.fromisoformat(val)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def _now_utc() -> datetime:
    """Return current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


def _is_expired_dt(expires_at: Optional[str]) -> bool:
    """Timezone-safe expiry check: returns True if expires_at is in the past."""
    dt = _parse_iso(expires_at)
    if dt is None:
        return False
    return dt < _now_utc()


def _is_expiring_soon_dt(expires_at: Optional[str], days: int = 30) -> bool:
    """Return True if item expires within the next `days` days (but has not yet expired)."""
    dt = _parse_iso(expires_at)
    if dt is None:
        return False
    current = _now_utc()
    return current <= dt <= current + timedelta(days=days)


def _expiry_status(expires_at: Optional[str], item_status: str) -> str:
    """
    Compute the temporal status label for an impact map item.
    Possible values: EXPIRED, EXPIRING_SOON, ACTIVE, RETIRED
    """
    if item_status == "RETIRED":
        return "RETIRED"
    if _is_expired_dt(expires_at):
        return "EXPIRED"
    if _is_expiring_soon_dt(expires_at):
        return "EXPIRING_SOON"
    return "ACTIVE"


def calculate_impact_map() -> Dict[str, Any]:
    """
    Evaluate dependencies between expired/updated facts & rules and historical drafts.
    Returns structured list of impact items with affected draft IDs and urgency levels.

    Round 3 improvements:
    - Returns EXPIRING_SOON status for items expiring within 30 days
    - Each item includes affected_count (len of affected_review_ids)
    - Each item includes expiry_date (alias for expires_at)
    - Uses timezone-safe datetime comparisons
    """
    impacted_items = []
    current_time = _now_utc()

    # 1. Inspect Facts for Expiration or Invalidation
    all_facts = rows("SELECT * FROM facts")
    all_reviews = rows("SELECT id, title, content, status, rule_versions FROM reviews")

    for fact in all_facts:
        fact_id = fact["id"]
        fact_claim = fact["claim"]
        fact_val = fact.get("value", "").lower()
        fact_expired = _is_expired_dt(fact.get("expires_at"))
        fact_expiring_soon = _is_expiring_soon_dt(fact.get("expires_at"))
        fact_retired = fact.get("status") == "RETIRED"

        # Include items that are expired, expiring soon, or retired
        if fact_expired or fact_retired or fact_expiring_soon:
            seen_ids: set = set()
            affected_ids: List[str] = []
            affected_titles: List[str] = []
            affected_drafts: List[Dict[str, Any]] = []

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
                status_label = _expiry_status(fact.get("expires_at"), fact.get("status", "APPROVED"))
                if fact_retired and not fact_expired:
                    status_label = "RETIRED"

                urgency = "URGENT" if fact_expired or fact_retired else "RECOMMENDED"
                reason_str = (
                    f"Approved fact '{fact_claim}' ({fact_id}) has passed its expiration date."
                    if fact_expired
                    else f"Approved fact '{fact_claim}' ({fact_id}) will expire within 30 days."
                    if fact_expiring_soon
                    else f"Approved fact '{fact_claim}' ({fact_id}) has been retired."
                )
                impacted_items.append({
                    "item_type": "FACT",
                    "item_id": fact_id,
                    "item_title": fact_claim,
                    "status": status_label,
                    "expires_at": fact.get("expires_at"),
                    "expiry_date": fact.get("expires_at"),
                    "affected_review_ids": affected_ids,
                    "affected_review_titles": affected_titles,
                    "affected_drafts": affected_drafts,
                    "affected_count": len(affected_ids),
                    "re_review_urgency": urgency,
                    "reason": reason_str,
                })

    # 2. Inspect Rules for Version Superseding or Expiry
    all_rules = rows("SELECT * FROM rules")
    for rule in all_rules:
        rule_id = rule["id"]
        rule_expired = _is_expired_dt(rule.get("expires_at"))
        rule_expiring_soon = _is_expiring_soon_dt(rule.get("expires_at"))
        rule_retired = rule.get("status") == "RETIRED"

        if rule_expired or rule_retired or rule_expiring_soon:
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
                status_label = _expiry_status(rule.get("expires_at"), rule.get("status", "APPROVED"))
                if rule_retired and not rule_expired:
                    status_label = "RETIRED"

                urgency = "URGENT" if rule_expired or rule_retired else "RECOMMENDED"
                reason_str = (
                    f"Brand rule '{rule['title']}' ({rule_id}) has passed its expiration date."
                    if rule_expired
                    else f"Brand rule '{rule['title']}' ({rule_id}) will expire within 30 days."
                    if rule_expiring_soon
                    else f"Brand rule '{rule['title']}' ({rule_id}) has been retired."
                )
                impacted_items.append({
                    "item_type": "RULE",
                    "item_id": rule_id,
                    "item_title": rule["title"],
                    "status": status_label,
                    "expires_at": rule.get("expires_at"),
                    "expiry_date": rule.get("expires_at"),
                    "affected_review_ids": affected_ids,
                    "affected_review_titles": affected_titles,
                    "affected_drafts": affected_drafts,
                    "affected_count": len(affected_ids),
                    "re_review_urgency": urgency,
                    "reason": reason_str,
                })

    unique_impacted_drafts: set = set()
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
    for r_id in matched["affected_review_ids"]:
        r = row("SELECT status, content FROM reviews WHERE id=?", (r_id,))
        if r and r["status"] == "APPROVED":
            with db() as conn:
                conn.execute(
                    "UPDATE reviews SET status='CHANGES_REQUESTED', updated_at=? WHERE id=?",
                    (now(), r_id)
                )
            save_version(
                review_id=r_id,
                content=r.get("content", ""),
                reason=f"Targeted re-review flagged: source '{matched['item_title']}' ({item_id}) expired or changed.",
                created_by=actor,
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
