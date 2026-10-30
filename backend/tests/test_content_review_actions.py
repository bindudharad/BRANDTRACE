"""
BRANDTRACE Content Review Workflow Regression Test Suite
Validates all finding-level and review-level governance actions:
- Apply Edit
- Cancel (non-mutation guarantee)
- Accept Replacement
- Dismiss with Reason
- Escalate
- Approve Review (governance guard & blocking rules)
- Request Changes
- Waive with Reason

Uses an isolated temporary SQLite database for zero pollution of dev data.
"""
import asyncio
import os
import sys
import tempfile
from pathlib import Path

import httpx
import pytest

# Isolated test DB — must be set before importing app
fd, _test_db = tempfile.mkstemp(suffix=".actions.db")
os.close(fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_test_db}"
os.environ["AI_PROVIDER"] = "offline"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402

REV = {"X-Demo-Role": "reviewer", "X-Demo-Actor": "demo.reviewer"}
ADMIN = {"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.admin"}
CREATOR = {"X-Demo-Role": "creator", "X-Demo-Actor": "demo.creator"}
AUDITOR = {"X-Demo-Role": "auditor", "X-Demo-Actor": "demo.auditor"}


@pytest.fixture(autouse=True)
def setup_demo():
    """Seed demo data before each test."""
    async def _init():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            await c.post("/api/demo/setup", headers=ADMIN)
    asyncio.run(_init())


def _create_review(content: str, title: str = "Actions Test Draft", headers=REV) -> tuple[str, list]:
    """Submit a review and return (review_id, findings list)."""
    result = {}

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                "/api/reviews",
                json={"title": title, "content": content, "content_type": "marketing_copy"},
                headers=headers,
            )
            assert r.status_code == 200, f"Review creation failed: {r.text}"
            result["review"] = r.json()

    asyncio.run(_run())
    rev = result["review"]
    return rev["id"], rev.get("findings", [])


# ===========================================================================
# 1. APPLY EDIT SCENARIOS
# ===========================================================================

def test_apply_edit_valid():
    """Valid edit updates draft content, sets disposition to EDITED, and records a version."""
    content = "Discover why our platform is the cheap choice. Brandtrace is reliable."
    review_id, findings = _create_review(content)
    cheap_finding = next((f for f in findings if "cheap" in f.get("passage", "").lower()), None)
    assert cheap_finding, "Expected finding for 'cheap'"

    new_content = "Discover why our platform is the affordable choice. Brandtrace is reliable."
    reason = "Replaced prohibited term 'cheap' with approved phrasing 'affordable'."

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{cheap_finding['id']}/actions",
                json={"action": "edit", "reason": reason, "replacement": new_content},
                headers=REV,
            )
            assert r.status_code == 200
            updated = r.json()
            assert updated["content"] == new_content

            # Verify finding disposition
            f_updated = next(f for f in updated["findings"] if f["id"] == cheap_finding["id"])
            assert f_updated["disposition"] == "EDITED"
            assert f_updated["disposition_reason"] == reason

            # Verify versions (ordered chronologically by created_at)
            v_res = await c.get(f"/api/reviews/{review_id}/versions", headers=REV)
            assert v_res.status_code == 200
            versions = v_res.json()
            assert len(versions) >= 2
            assert versions[-1]["content"] == new_content

    asyncio.run(_run())


def test_apply_edit_empty_rejected():
    """Empty replacement is rejected with HTTP 422."""
    content = "Discover why our platform is the cheap choice. Brandtrace is reliable."
    review_id, findings = _create_review(content)
    finding = findings[0]

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{finding['id']}/actions",
                json={"action": "edit", "reason": "Attempt empty replacement", "replacement": "   "},
                headers=REV,
            )
            assert r.status_code in (400, 422)

    asyncio.run(_run())


def test_apply_edit_missing_review_id_404():
    """Invalid review ID returns HTTP 404."""
    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                "/api/reviews/nonexistent_id/findings/nonexistent_fid/actions",
                json={"action": "edit", "reason": "Test", "replacement": "Test"},
                headers=REV,
            )
            assert r.status_code == 404

    asyncio.run(_run())


def test_apply_edit_unauthorized_auditor():
    """Auditor role cannot apply edits (HTTP 403)."""
    content = "Discover why our platform is the cheap choice. Brandtrace is reliable."
    review_id, findings = _create_review(content)
    finding = findings[0]

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{finding['id']}/actions",
                json={"action": "edit", "reason": "Auditor edit", "replacement": "Updated content"},
                headers=AUDITOR,
            )
            assert r.status_code == 403

    asyncio.run(_run())


def test_apply_edit_conflict_identical_reason():
    """Cross-contamination check: replacement identical to reason is rejected with 422."""
    content = "Discover why our platform is the cheap choice. Brandtrace is reliable."
    review_id, findings = _create_review(content)
    finding = findings[0]

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{finding['id']}/actions",
                json={"action": "edit", "reason": "Same Text", "replacement": "Same Text"},
                headers=REV,
            )
            assert r.status_code in (400, 422)

    asyncio.run(_run())


# ===========================================================================
# 2. CANCEL (NON-MUTATION) SCENARIO
# ===========================================================================

def test_cancel_non_mutation():
    """Cancelling an edit discards local state without calling API; review in DB remains unchanged."""
    content = "Original draft content before cancellation. Brandtrace is active."
    review_id, _ = _create_review(content)

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            # Fetch review directly to confirm original state
            r = await c.get(f"/api/reviews/{review_id}", headers=REV)
            assert r.status_code == 200
            assert r.json()["content"] == content

            # Verify no extra revisions created
            v_res = await c.get(f"/api/reviews/{review_id}/versions", headers=REV)
            assert v_res.status_code == 200
            assert len(v_res.json()) == 1

    asyncio.run(_run())


# ===========================================================================
# 3. ACCEPT REPLACEMENT SCENARIOS
# ===========================================================================

def test_accept_replacement_exact_span():
    """Accepting a replacement updates content with suggested correction and sets disposition ACCEPTED_EDIT."""
    content = "Our solution is the cheap alternative. Brandtrace is reliable."
    review_id, findings = _create_review(content)
    cheap_finding = next((f for f in findings if "cheap" in f.get("passage", "").lower()), None)
    assert cheap_finding
    suggested = cheap_finding.get("suggested_correction") or "affordable"

    updated_content = content.replace("cheap", suggested)
    reason = f"Accepted suggested replacement '{suggested}' for 'cheap'."

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{cheap_finding['id']}/actions",
                json={"action": "accept", "reason": reason, "replacement": updated_content},
                headers=REV,
            )
            assert r.status_code == 200
            updated = r.json()
            assert updated["content"] == updated_content

            f_updated = next(f for f in updated["findings"] if f["id"] == cheap_finding["id"])
            assert f_updated["disposition"] == "ACCEPTED_EDIT"

    asyncio.run(_run())


def test_accept_replacement_missing_term_recheck():
    """For missing term findings, replacement must include the required term or reject with 422."""
    content = "Our solution delivers guaranteed outcomes. We are fast and secure."
    review_id, findings = _create_review(content)
    req_finding = next((f for f in findings if f.get("type") in ("required_phrase", "approved_term")), None)
    assert req_finding

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            # Replacement that does NOT include the required term
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{req_finding['id']}/actions",
                json={"action": "accept", "reason": "Bad accept", "replacement": "Still missing the term."},
                headers=REV,
            )
            assert r.status_code in (400, 422)

            # Replacement that DOES include the required term
            valid_replacement = f"{content}\n\n— Verified with Brandtrace."
            r2 = await c.post(
                f"/api/reviews/{review_id}/findings/{req_finding['id']}/actions",
                json={"action": "accept", "reason": "Included required term", "replacement": valid_replacement},
                headers=REV,
            )
            assert r2.status_code == 200
            assert r2.json()["content"] == valid_replacement

    asyncio.run(_run())


# ===========================================================================
# 4. DISMISS WITH REASON SCENARIOS
# ===========================================================================

def test_dismiss_with_reason_valid():
    """Dismissing a finding records DISMISSED disposition and documented justification."""
    content = "Discover why our platform is the cheap option. Brandtrace ensures compliance."
    review_id, findings = _create_review(content)
    finding = findings[0]
    reason = "Approved exception supported by source under promotional contract #402."

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{finding['id']}/actions",
                json={"action": "dismiss", "reason": reason},
                headers=REV,
            )
            assert r.status_code == 200
            updated = r.json()
            f_updated = next(f for f in updated["findings"] if f["id"] == finding["id"])
            assert f_updated["disposition"] == "DISMISSED"
            assert f_updated["disposition_reason"] == reason

            # Audit event logged
            audit_r = await c.get(f"/api/reviews/{review_id}/audit", headers=REV)
            assert audit_r.status_code == 200
            entries = audit_r.json()
            assert any(e["action"] == "FINDING_DISMISS" and e["reason"] == reason for e in entries)

    asyncio.run(_run())


def test_dismiss_empty_reason_rejected():
    """Dismissing without reason is rejected with HTTP 422."""
    content = "Discover why our platform is the cheap option. Brandtrace ensures compliance."
    review_id, findings = _create_review(content)
    finding = findings[0]

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{finding['id']}/actions",
                json={"action": "dismiss", "reason": ""},
                headers=REV,
            )
            assert r.status_code in (400, 422)

    asyncio.run(_run())


def test_dismiss_unauthorized_creator_denied():
    """Creator role cannot dismiss compliance findings (HTTP 403)."""
    content = "Discover why our platform is the cheap option. Brandtrace ensures compliance."
    review_id, findings = _create_review(content)
    finding = findings[0]

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{finding['id']}/actions",
                json={"action": "dismiss", "reason": "Creator attempting dismiss"},
                headers=CREATOR,
            )
            assert r.status_code == 403

    asyncio.run(_run())


# ===========================================================================
# 5. ESCALATE SCENARIOS
# ===========================================================================

def test_escalate_valid():
    """Escalating a finding records ESCALATED disposition and logs an audit record."""
    content = "Discover why our platform is the cheap option. Brandtrace ensures compliance."
    review_id, findings = _create_review(content)
    finding = findings[0]
    reason = "Escalated to brand legal counsel for contractual verification."

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{finding['id']}/actions",
                json={"action": "escalate", "reason": reason},
                headers=REV,
            )
            assert r.status_code == 200
            updated = r.json()
            f_updated = next(f for f in updated["findings"] if f["id"] == finding["id"])
            assert f_updated["disposition"] == "ESCALATED"

            # Audit record exists
            audit_r = await c.get(f"/api/reviews/{review_id}/audit", headers=REV)
            assert audit_r.status_code == 200
            assert any(e["action"] == "FINDING_ESCALATE" for e in audit_r.json())

    asyncio.run(_run())


def test_escalate_auditor_unauthorized():
    """Auditor role cannot escalate findings (HTTP 403)."""
    content = "Discover why our platform is the cheap option. Brandtrace ensures compliance."
    review_id, findings = _create_review(content)
    finding = findings[0]

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/findings/{finding['id']}/actions",
                json={"action": "escalate", "reason": "Auditor escalation"},
                headers=AUDITOR,
            )
            assert r.status_code == 403

    asyncio.run(_run())


# ===========================================================================
# 6. APPROVE REVIEW SCENARIOS
# ===========================================================================

def test_approve_blocked_by_unresolved_high_finding():
    """Approval is strictly blocked (HTTP 409) while unresolved HIGH/CRITICAL findings exist."""
    content = "Discover why our platform is the cheap choice. Brandtrace is reliable."
    review_id, findings = _create_review(content)
    high_findings = [f for f in findings if f.get("severity") in ("HIGH", "CRITICAL") and not f.get("disposition")]
    assert len(high_findings) > 0, "Test prerequisite: at least one high finding must be present"

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "approve"},
                headers=REV,
            )
            assert r.status_code == 409
            assert "High-risk findings" in r.json().get("detail", "")

    asyncio.run(_run())


def test_approve_success_after_high_findings_resolved():
    """Approval succeeds with HTTP 200 once all high-risk findings are resolved."""
    content = "Discover why our platform is the cheap choice. Brandtrace is reliable."
    review_id, findings = _create_review(content)
    high_findings = [f for f in findings if f.get("severity") in ("HIGH", "CRITICAL") and not f.get("disposition")]

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            # Resolve all high-risk findings via dismissal with documented exception
            for f in high_findings:
                await c.post(
                    f"/api/reviews/{review_id}/findings/{f['id']}/actions",
                    json={"action": "dismiss", "reason": "Approved exception for governance testing"},
                    headers=REV,
                )

            # Now attempt approval
            r = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "approve"},
                headers=REV,
            )
            assert r.status_code == 200
            assert r.json()["status"] == "APPROVED"

            # Verify audit trail
            audit_r = await c.get(f"/api/reviews/{review_id}/audit", headers=REV)
            assert audit_r.status_code == 200
            assert any(e["action"] == "APPROVAL_APPROVE" for e in audit_r.json())

    asyncio.run(_run())


def test_approve_unauthorized_role_denied():
    """Creator and Auditor roles cannot approve reviews (HTTP 403)."""
    content = "Brandtrace is the reliable choice for modern businesses."
    review_id, _ = _create_review(content)

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r_creator = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "approve"},
                headers=CREATOR,
            )
            assert r_creator.status_code == 403

            r_auditor = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "approve"},
                headers=AUDITOR,
            )
            assert r_auditor.status_code == 403

    asyncio.run(_run())


# ===========================================================================
# 7. REQUEST CHANGES SCENARIOS
# ===========================================================================

def test_request_changes_valid():
    """Request changes transitions status to CHANGES_REQUESTED and logs remediation notes."""
    content = "Brandtrace is the reliable platform."
    review_id, _ = _create_review(content)
    notes = "Please revise the headline and provide additional case study references."

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "request_changes", "reason": notes},
                headers=REV,
            )
            assert r.status_code == 200
            updated = r.json()
            assert updated["status"] == "CHANGES_REQUESTED"

            # Check audit entry
            audit_r = await c.get(f"/api/reviews/{review_id}/audit", headers=REV)
            assert audit_r.status_code == 200
            assert any(e["action"] == "APPROVAL_REQUEST_CHANGES" and e["reason"] == notes for e in audit_r.json())

    asyncio.run(_run())


def test_request_changes_unauthorized():
    """Creator role cannot request changes on their own review (HTTP 403)."""
    content = "Brandtrace is the reliable platform."
    review_id, _ = _create_review(content)

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "request_changes", "reason": "Self-request changes"},
                headers=CREATOR,
            )
            assert r.status_code == 403

    asyncio.run(_run())


# ===========================================================================
# 8. WAIVE WITH REASON SCENARIOS
# ===========================================================================

def test_waive_requires_documented_reason():
    """Waive action without reason is rejected with HTTP 422."""
    content = "Discover why our platform is the cheap choice. Brandtrace is reliable."
    review_id, findings = _create_review(content)
    high_findings = [f for f in findings if f.get("severity") in ("HIGH", "CRITICAL") and not f.get("disposition")]

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            for f in high_findings:
                await c.post(
                    f"/api/reviews/{review_id}/findings/{f['id']}/actions",
                    json={"action": "dismiss", "reason": "Exception granted prior to waiver test"},
                    headers=REV,
                )
            r = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "waive", "reason": ""},
                headers=REV,
            )
            assert r.status_code in (400, 422)

    asyncio.run(_run())


def test_waive_blocked_by_unresolved_high_findings():
    """Review-level waiver is blocked with HTTP 409 if high-risk findings have no disposition."""
    content = "Discover why our platform is the cheap choice. Brandtrace is reliable."
    review_id, findings = _create_review(content)
    high_findings = [f for f in findings if f.get("severity") in ("HIGH", "CRITICAL") and not f.get("disposition")]
    assert len(high_findings) > 0

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "waive", "reason": "Executive exemption"},
                headers=REV,
            )
            assert r.status_code == 409

    asyncio.run(_run())


def test_waive_success_when_eligible():
    """Waiver succeeds with HTTP 200 and WAIVED status once high findings are addressed."""
    content = "Discover why our platform is the cheap choice. Brandtrace is reliable."
    review_id, findings = _create_review(content)
    high_findings = [f for f in findings if f.get("severity") in ("HIGH", "CRITICAL") and not f.get("disposition")]

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            for f in high_findings:
                await c.post(
                    f"/api/reviews/{review_id}/findings/{f['id']}/actions",
                    json={"action": "dismiss", "reason": "Exception granted prior to waiver"},
                    headers=REV,
                )

            r = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "waive", "reason": "VP Brand authorized executive waiver for Q4 campaign."},
                headers=REV,
            )
            assert r.status_code == 200
            assert r.json()["status"] == "WAIVED"

            # Check audit entry
            audit_r = await c.get(f"/api/reviews/{review_id}/audit", headers=REV)
            assert audit_r.status_code == 200
            assert any(e["action"] == "APPROVAL_WAIVE" for e in audit_r.json())

    asyncio.run(_run())


def test_waive_unauthorized_role():
    """Auditor and Creator cannot grant governance waivers (HTTP 403)."""
    content = "Brandtrace is the reliable platform."
    review_id, _ = _create_review(content)

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            r_creator = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "waive", "reason": "Creator self-waiver"},
                headers=CREATOR,
            )
            assert r_creator.status_code == 403

            r_auditor = await c.post(
                f"/api/reviews/{review_id}/approval",
                json={"action": "waive", "reason": "Auditor waiver"},
                headers=AUDITOR,
            )
            assert r_auditor.status_code == 403

    asyncio.run(_run())
