"""
Proactive Expiry Monitoring and Governance Alert Service for BRANDTRACE.
Scans claim facts, evidence sources, and governance rules for expiration.
Generates actionable, idempotent in-app alerts and automated re-review tasks
with retry execution and job tracking.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from app.models import db, rows, row, ident, now


def parse_iso(ts_str: Optional[str]) -> Optional[datetime]:
    if not ts_str:
        return None
    try:
        clean = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean)
    except Exception:
        return None


def run_expiry_scan(workspace_id: str = "ws_default") -> Dict[str, Any]:
    """
    Execute proactive expiry audit across facts, evidence sources, and rules.
    Identifies affected drafts for expired facts and triggers re-reviews.
    Stores new alerts idempotently in the governance_alerts table.
    """
    now_dt = datetime.now(timezone.utc)
    today_str = now_dt.strftime("%Y-%m-%d")

    active_facts = rows(
        "SELECT * FROM facts WHERE workspace_id=? AND status='APPROVED'",
        (workspace_id,)
    )
    active_sources = rows(
        "SELECT * FROM evidence_sources WHERE workspace_id=?",
        (workspace_id,)
    )
    active_rules = rows(
        "SELECT * FROM rules WHERE workspace_id=? AND status='APPROVED'",
        (workspace_id,)
    )

    created_alerts = 0
    re_reviews_generated = 0
    scanned_items = len(active_facts) + len(active_sources) + len(active_rules)

    with db() as conn:
        # 1. Facts Expiry Checks
        for f in active_facts:
            fid = f.get("id")
            claim = f.get("claim", "Fact")
            exp_str = f.get("expires_at")
            if not exp_str:
                continue

            exp_dt = parse_iso(exp_str)
            if not exp_dt:
                continue

            delta = exp_dt - now_dt
            days_left = delta.total_seconds() / 86400.0

            if days_left < 0:
                # Expired fact
                key = f"FACT_EXPIRED:{fid}:{today_str}"
                msg = f"Claim fact '{claim}' ({fid}) expired on {exp_str[:10]} and can no longer substantiate claims."
                res = conn.execute(
                    """
                    INSERT INTO governance_alerts (
                        id, workspace_id, alert_type, target_type, target_id,
                        target_title, severity, message, idempotency_key, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                    ON CONFLICT(workspace_id, idempotency_key) DO NOTHING
                    """,
                    (ident("alt"), workspace_id, "FACT_EXPIRED", "fact", fid, claim, "CRITICAL", msg, key, now())
                )
                if res.rowcount > 0:
                    created_alerts += 1

                # Identify affected approved drafts and trigger targeted re-review tasks
                dep_reviews = rows(
                    """
                    SELECT r.id, r.title, r.status, r.assigned_to, r.author
                    FROM reviews r
                    JOIN evidence_dependencies ed ON ed.review_id = r.id
                    WHERE ed.source_id=? AND ed.source_type='fact' AND r.workspace_id=? AND r.status='APPROVED'
                    """,
                    (fid, workspace_id)
                )
                for dr in dep_reviews:
                    rid = dr.get("id")
                    rtitle = dr.get("title", "Review Draft")
                    re_key = f"RE_REVIEW_TASK:{fid}:{rid}:{today_str}"
                    task_msg = f"Re-review task generated: Approved review '{rtitle}' ({rid}) depends on expired fact '{claim}' ({fid}). Status transitioned to CHANGES_REQUESTED."
                    res_task = conn.execute(
                        """
                        INSERT INTO governance_alerts (
                            id, workspace_id, alert_type, target_type, target_id,
                            target_title, severity, message, idempotency_key, status, created_at
                        ) VALUES (?, ?, 'RE_REVIEW_REQUIRED', 'review', ?, ?, 'CRITICAL', ?, ?, 'ACTIVE', ?)
                        ON CONFLICT(workspace_id, idempotency_key) DO NOTHING
                        """,
                        (ident("alt"), workspace_id, rid, rtitle, task_msg, re_key, now())
                    )
                    if res_task.rowcount > 0:
                        re_reviews_generated += 1
                        # Update review status to CHANGES_REQUESTED and priority to URGENT
                        conn.execute(
                            "UPDATE reviews SET status='CHANGES_REQUESTED', priority='URGENT' WHERE id=? AND workspace_id=?",
                            (rid, workspace_id)
                        )
                        # Append automated audit log
                        conn.execute(
                            """
                            INSERT INTO audit (
                                id, workspace_id, review_id, action, actor, actor_role, reason, created_at
                            ) VALUES (?, ?, ?, 'EXPIRY_RE_REVIEW_TRIGGERED', 'system.expiry_monitor', 'system', ?, ?)
                            """,
                            (ident("aud"), workspace_id, rid, f"Mandatory re-review triggered: dependent fact '{claim}' ({fid}) expired.", now())
                        )
                        # Append discussion comment
                        conn.execute(
                            """
                            INSERT INTO review_comments (
                                id, workspace_id, review_id, author, author_role, comment, created_at
                            ) VALUES (?, ?, ?, 'system.expiry_monitor', 'system', ?, ?)
                            """,
                            (ident("cmt"), workspace_id, rid, f"Automated Governance Alert: Dependent fact '{claim}' expired. Review moved to CHANGES_REQUESTED for re-verification.", now())
                        )

            elif days_left <= 1:
                # Expiring in 24 hours (1-day notification interval)
                key = f"FACT_EXPIRING_1D:{fid}:{today_str}"
                hrs = max(1, int(days_left * 24))
                msg = f"URGENT: Claim fact '{claim}' ({fid}) expires in {hrs} hours on {exp_str[:10]}. Immediate verification renewal required."
                res = conn.execute(
                    """
                    INSERT INTO governance_alerts (
                        id, workspace_id, alert_type, target_type, target_id,
                        target_title, severity, message, idempotency_key, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                    ON CONFLICT(workspace_id, idempotency_key) DO NOTHING
                    """,
                    (ident("alt"), workspace_id, "FACT_EXPIRING_SOON", "fact", fid, claim, "CRITICAL", msg, key, now())
                )
                if res.rowcount > 0:
                    created_alerts += 1

            elif days_left <= 7:
                # Expiring in 7 days (7-day notification interval)
                key = f"FACT_EXPIRING_7D:{fid}:{today_str}"
                msg = f"Claim fact '{claim}' ({fid}) expires in {int(days_left)} days on {exp_str[:10]}. Verification renewal required."
                res = conn.execute(
                    """
                    INSERT INTO governance_alerts (
                        id, workspace_id, alert_type, target_type, target_id,
                        target_title, severity, message, idempotency_key, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                    ON CONFLICT(workspace_id, idempotency_key) DO NOTHING
                    """,
                    (ident("alt"), workspace_id, "FACT_EXPIRING_SOON", "fact", fid, claim, "HIGH", msg, key, now())
                )
                if res.rowcount > 0:
                    created_alerts += 1

            elif days_left <= 30:
                # Expiring in 30 days (30-day notification interval)
                key = f"FACT_EXPIRING_30D:{fid}:{today_str}"
                msg = f"Claim fact '{claim}' ({fid}) expires in {int(days_left)} days on {exp_str[:10]}."
                res = conn.execute(
                    """
                    INSERT INTO governance_alerts (
                        id, workspace_id, alert_type, target_type, target_id,
                        target_title, severity, message, idempotency_key, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                    ON CONFLICT(workspace_id, idempotency_key) DO NOTHING
                    """,
                    (ident("alt"), workspace_id, "FACT_EXPIRING_SOON", "fact", fid, claim, "MEDIUM", msg, key, now())
                )
                if res.rowcount > 0:
                    created_alerts += 1

        # 2. Evidence Sources Expiry
        for s in active_sources:
            sid = s.get("id")
            title = s.get("title", "Evidence Source")
            exp_str = s.get("expires_at")
            if not exp_str:
                continue
            exp_dt = parse_iso(exp_str)
            if not exp_dt:
                continue

            delta = exp_dt - now_dt
            if delta.total_seconds() < 0:
                key = f"SOURCE_EXPIRED:{sid}:{today_str}"
                msg = f"Evidence source '{title}' ({sid}) expired on {exp_str[:10]}. Dependent rules and facts require re-validation."
                res = conn.execute(
                    """
                    INSERT INTO governance_alerts (
                        id, workspace_id, alert_type, target_type, target_id,
                        target_title, severity, message, idempotency_key, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                    ON CONFLICT(workspace_id, idempotency_key) DO NOTHING
                    """,
                    (ident("alt"), workspace_id, "SOURCE_EXPIRED", "source", sid, title, "HIGH", msg, key, now())
                )
                if res.rowcount > 0:
                    created_alerts += 1

        # 3. Rules Expiry
        for r in active_rules:
            rid = r.get("id")
            title = r.get("title", "Brand Rule")
            exp_str = r.get("expires_at")
            if not exp_str:
                continue
            exp_dt = parse_iso(exp_str)
            if not exp_dt:
                continue

            delta = exp_dt - now_dt
            if delta.total_seconds() < 0:
                key = f"RULE_EXPIRED:{rid}:{today_str}"
                msg = f"Brand rule '{title}' ({rid}) passed its sunset date {exp_str[:10]}."
                res = conn.execute(
                    """
                    INSERT INTO governance_alerts (
                        id, workspace_id, alert_type, target_type, target_id,
                        target_title, severity, message, idempotency_key, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                    ON CONFLICT(workspace_id, idempotency_key) DO NOTHING
                    """,
                    (ident("alt"), workspace_id, "RULE_EXPIRED", "rule", rid, title, "MEDIUM", msg, key, now())
                )
                if res.rowcount > 0:
                    created_alerts += 1

    outcome_text = "In-app alerts and discussion notices recorded for assigned owners without duplicate spam."
    return {
        "status": "completed",
        "scanned_items": scanned_items,
        "new_alerts_created": created_alerts,
        "re_reviews_generated": re_reviews_generated,
        "scan_timestamp": now(),
        "intervals_checked": ["30_DAYS", "7_DAYS", "1_DAY"],
        "notification_outcome": outcome_text,
        "external_notifications": outcome_text,
    }


def execute_expiry_job(workspace_id: str = "ws_default", max_retries: int = 3) -> Dict[str, Any]:
    """
    Execute scheduled expiry audit job with automatic retry handling and job tracking.
    Records job status in the governance_jobs table.
    """
    job_id = ident("job")
    start_ts = now()

    with db() as conn:
        conn.execute(
            """
            INSERT INTO governance_jobs (
                id, workspace_id, job_type, status, items_scanned, alerts_created,
                re_reviews_generated, retry_count, created_at
            ) VALUES (?, ?, 'EXPIRY_AUDIT', 'RUNNING', 0, 0, 0, 0, ?)
            """,
            (job_id, workspace_id, start_ts)
        )

    last_error = None
    for attempt in range(max_retries):
        try:
            result = run_expiry_scan(workspace_id=workspace_id)
            end_ts = now()

            with db() as conn:
                conn.execute(
                    """
                    UPDATE governance_jobs SET
                        status = 'SUCCESS',
                        items_scanned = ?,
                        alerts_created = ?,
                        re_reviews_generated = ?,
                        retry_count = ?,
                        notification_outcome = ?,
                        completed_at = ?
                    WHERE id = ?
                    """,
                    (
                        result["scanned_items"],
                        result["new_alerts_created"],
                        result["re_reviews_generated"],
                        attempt,
                        result["notification_outcome"],
                        end_ts,
                        job_id,
                    )
                )
            result["job_id"] = job_id
            result["retry_count"] = attempt
            result["job_status"] = "SUCCESS"
            return result
        except Exception as exc:
            last_error = str(exc)
            if attempt < max_retries - 1:
                time.sleep(0.5 * (attempt + 1))  # Exponential backoff
                with db() as conn:
                    conn.execute(
                        "UPDATE governance_jobs SET retry_count = ?, status = 'RETRYING' WHERE id = ?",
                        (attempt + 1, job_id)
                    )

    # If all retries fail
    with db() as conn:
        conn.execute(
            """
            UPDATE governance_jobs SET
                status = 'FAILED',
                error_message = ?,
                retry_count = ?,
                completed_at = ?
            WHERE id = ?
            """,
            (last_error, max_retries, now(), job_id)
        )

    return {
        "status": "failed",
        "job_id": job_id,
        "job_status": "FAILED",
        "error": last_error,
        "retries_exhausted": max_retries,
        "completed_at": now(),
    }


def list_governance_jobs(workspace_id: str = "ws_default", limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieve execution log of scheduled governance jobs."""
    return rows(
        "SELECT * FROM governance_jobs WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?",
        (workspace_id, limit)
    )


def list_governance_alerts(workspace_id: str = "ws_default", status: Optional[str] = "ACTIVE") -> List[Dict[str, Any]]:
    """Retrieve governance alerts for the workspace."""
    if status:
        return rows(
            "SELECT * FROM governance_alerts WHERE workspace_id=? AND status=? ORDER BY created_at DESC",
            (workspace_id, status)
        )
    return rows(
        "SELECT * FROM governance_alerts WHERE workspace_id=? ORDER BY created_at DESC",
        (workspace_id,)
    )


def acknowledge_governance_alert(alert_id: str, workspace_id: str = "ws_default", actor: str = "reviewer") -> bool:
    """Acknowledge or dismiss an active alert."""
    with db() as conn:
        res = conn.execute(
            "UPDATE governance_alerts SET status='ACKNOWLEDGED' WHERE id=? AND workspace_id=?",
            (alert_id, workspace_id)
        )
        return res.rowcount > 0
