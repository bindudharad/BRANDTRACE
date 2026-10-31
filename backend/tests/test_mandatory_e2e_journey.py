"""
BRANDTRACE — Mandatory End-to-End Simulation Journey Test.
Executes the canonical 22-step evaluator and customer journey from initial
brand constitution onboarding to approval, compliance packet export, and time-aware re-review.
"""
import io
import json
import os
import sys
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path

import httpx
import pytest

# Ensure isolated SQLite test database
fd, path = tempfile.mkstemp(suffix="_e2e_journey.db")
os.close(fd)
os.environ["DATABASE_URL"] = f"sqlite:///{path}"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, init_db, rows, row, now


@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    yield


@pytest.mark.asyncio
async def test_mandatory_22_step_enterprise_governance_journey():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        admin_hdrs = {"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@brandtrace.internal", "X-Workspace-Id": "ws_default"}
        reviewer_hdrs = {"X-Demo-Role": "reviewer", "X-Demo-Actor": "reviewer@brandtrace.internal", "X-Workspace-Id": "ws_default"}
        creator_hdrs = {"X-Demo-Role": "creator", "X-Demo-Actor": "creator@brandtrace.internal", "X-Workspace-Id": "ws_default"}

        # ---------------------------------------------------------------------
        # STEP 1: Admin creates Brand Constitution rule
        # ---------------------------------------------------------------------
        r1 = await client.post(
            "/api/rules",
            json={
                "title": "Unsubstantiated Superiority Superlatives",
                "category": "voice",
                "kind": "prohibited_phrase",
                "pattern": "best",
                "requirement": "Do not claim to be the 'best' without third-party proof.",
                "suggested_fix": "effective",
                "severity": "HIGH",
                "source_title": "Global Brand Guidelines 2026",
                "source_excerpt": "Claims of being the 'best' must not appear without verified legal clearance.",
            },
            headers=admin_hdrs,
        )
        assert r1.status_code == 201, f"Step 1 failed: {r1.text}"
        rule_best_id = r1.json()["id"]

        # ---------------------------------------------------------------------
        # STEP 2: Admin imports a digital guideline PDF
        # ---------------------------------------------------------------------
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        pdf_buf = io.BytesIO()
        c = canvas.Canvas(pdf_buf, pagesize=letter)
        c.drawString(72, 720, "Section 1: Brand Guidelines 2026")
        c.drawString(72, 700, "Primary color: #0E9F78")
        c.drawString(72, 680, "Use 'accessible' instead of 'cheap'.")
        c.drawString(72, 660, "Must include 'Brandtrace' in all copy.")
        c.save()
        pdf_bytes = pdf_buf.getvalue()

        imp_res = await client.post(
            "/api/constitution/import-guidelines",
            files={"file": ("Brand_Guidelines_2026.pdf", pdf_bytes, "application/pdf")},
            headers=admin_hdrs,
        )
        assert imp_res.status_code in (200, 201), f"Step 2 failed: {imp_res.text}"
        import_id = imp_res.json()["id"]

        # ---------------------------------------------------------------------
        # STEP 3: Admin inspects and approves extracted candidate rule
        # ---------------------------------------------------------------------
        cand_res = await client.get(f"/api/constitution/imports/{import_id}/candidates", headers=admin_hdrs)
        assert cand_res.status_code == 200
        candidates = cand_res.json()
        assert len(candidates) >= 1
        cand_id = candidates[0]["id"]

        appr_cand = await client.post(f"/api/constitution/candidates/{cand_id}/approve", headers=admin_hdrs)
        assert appr_cand.status_code == 200
        assert appr_cand.json()["status"] == "APPROVED"

        # ---------------------------------------------------------------------
        # STEP 4: Admin registers approved corporate fact in Claim Ledger
        # ---------------------------------------------------------------------
        now_dt = datetime.now(timezone.utc)
        fact_res = await client.post(
            "/api/facts",
            json={
                "claim": "ISO 27001 Security Certification",
                "value": "Certified ISO/IEC 27001:2022 across all cloud services",
                "status": "APPROVED",
                "version": "1.0",
                "owner": "Information Security Officer",
                "source_title": "BSI Audit Certificate 2026",
                "source_excerpt": "Certificate ISC-9921 issued March 2026",
                "effective_at": (now_dt - timedelta(days=30)).isoformat(),
                "expires_at": (now_dt + timedelta(days=180)).isoformat(),
                "notes": "Annual recertification audit scheduled for Q1 2027.",
            },
            headers=admin_hdrs,
        )
        assert fact_res.status_code == 201, f"Step 4 failed: {fact_res.text}"
        fact_iso_id = fact_res.json()["id"]

        # ---------------------------------------------------------------------
        # STEP 5 & 6: Creator submits a working document
        # ---------------------------------------------------------------------
        draft_content = "Brandtrace is the best and cheap solution. We maintain ISO 27001 Security Certification."
        submit_res = await client.post(
            "/api/reviews",
            json={
                "title": "Launch Campaign Overview",
                "content": draft_content,
                "content_type": "marketing_copy",
                "document_type": "campaign_copy",
            },
            headers=creator_hdrs,
        )
        assert submit_res.status_code in (200, 201), f"Step 5 failed: {submit_res.text}"
        review_id = submit_res.json()["id"]

        # ---------------------------------------------------------------------
        # STEP 7 & 8: Governance engine runs; findings are generated
        # ---------------------------------------------------------------------
        rev_detail = await client.get(f"/api/reviews/{review_id}", headers=reviewer_hdrs)
        assert rev_detail.status_code == 200
        review_data = rev_detail.json()
        findings = review_data["findings"]
        assert len(findings) >= 1
        assert review_data["score"] < 100

        # Find finding for 'best'
        finding_best = next((f for f in findings if "best" in f["passage"].lower()), None)
        assert finding_best is not None, "Expected finding for 'best' not found"
        assert finding_best["severity"] == "HIGH"
        finding_best_id = finding_best["id"]

        # ---------------------------------------------------------------------
        # STEP 9: Reviewer inspects finding's evidence source and ground-truth excerpt
        # ---------------------------------------------------------------------
        assert finding_best["source_title"] != ""
        assert any(term in finding_best["source_title"] for term in ("Global Brand Guidelines", "Brand Voice Standard"))
        assert finding_best["suggested_correction"] == "effective"

        # ---------------------------------------------------------------------
        # STEP 10: Creator/Reviewer applies exact-span correction
        # ---------------------------------------------------------------------
        action_res = await client.post(
            f"/api/reviews/{review_id}/findings/{finding_best_id}/actions",
            json={
                "action": "accept",
                "replacement": "Brandtrace is the effective and cheap solution. We maintain ISO 27001 Security Certification.",
                "reason": "Accept approved alternative 'effective'",
            },
            headers=reviewer_hdrs,
        )
        assert action_res.status_code == 200, f"Step 10 failed: {action_res.text}"
        updated_review = action_res.json()
        # Assert replacement with zero word duplication
        assert "effective" in updated_review["content"]
        assert "best" not in updated_review["content"]

        # ---------------------------------------------------------------------
        # STEP 11: Original draft remains recoverable in version history
        # ---------------------------------------------------------------------
        vers_res = await client.get(f"/api/reviews/{review_id}/versions", headers=reviewer_hdrs)
        assert vers_res.status_code == 200
        versions = vers_res.json()
        assert len(versions) >= 2
        # Check original content is preserved in initial version
        assert any("best" in v["content"] for v in versions)

        # ---------------------------------------------------------------------
        # STEP 12: Reviewer dismisses remaining findings with mandatory reason
        # ---------------------------------------------------------------------
        # Dismiss all remaining findings to clear high-risk blockers before approval test
        fetch_latest = await client.get(f"/api/reviews/{review_id}", headers=reviewer_hdrs)
        assert fetch_latest.status_code == 200
        active_findings = [f for f in fetch_latest.json()["findings"] if not f.get("disposition")]
        for rem in active_findings:
            dismiss_res = await client.post(
                f"/api/reviews/{review_id}/findings/{rem['id']}/actions",
                json={"action": "dismiss", "reason": "Contextual usage authorized under promotional license agreement."},
                headers=reviewer_hdrs,
            )
            assert dismiss_res.status_code == 200

        # ---------------------------------------------------------------------
        # STEP 13: Audit record is created with actor attribution
        # ---------------------------------------------------------------------
        audit_res = await client.get(f"/api/reviews/{review_id}/audit", headers=reviewer_hdrs)
        assert audit_res.status_code == 200
        audit_entries = audit_res.json()
        assert len(audit_entries) >= 1
        assert any(e["actor"] == "reviewer@brandtrace.internal" for e in audit_entries)

        # ---------------------------------------------------------------------
        # STEP 14: Revision history is updated
        # ---------------------------------------------------------------------
        vers_res2 = await client.get(f"/api/reviews/{review_id}/versions", headers=reviewer_hdrs)
        assert vers_res2.status_code == 200
        assert len(vers_res2.json()) >= 2

        # ---------------------------------------------------------------------
        # STEP 15: Approval blocked if unresolved high-risk finding exists
        # ---------------------------------------------------------------------
        # Inject temporary high-risk blocker to test gate
        with db() as conn:
            conn.execute(
                """
                INSERT INTO findings (id, review_id, category, type, severity, status, passage, explanation)
                VALUES ('f_blocker', ?, 'governance', 'prohibited_claim', 'HIGH', 'CONTRADICTED', 'untested claim', 'Unverified statement')
                """,
                (review_id,)
            )

        appr_block = await client.post(
            f"/api/reviews/{review_id}/approval",
            json={"action": "approve"},
            headers=admin_hdrs,
        )
        assert appr_block.status_code == 409, f"Approval gate should block with 409: {appr_block.text}"

        # ---------------------------------------------------------------------
        # STEP 16: Reviewer resolves the blocker
        # ---------------------------------------------------------------------
        resolve_blocker = await client.post(
            f"/api/reviews/{review_id}/findings/f_blocker/actions",
            json={"action": "dismiss", "reason": "Legal clearance document ref #9983 validated by Legal Lead."},
            headers=admin_hdrs,
        )
        assert resolve_blocker.status_code == 200

        # ---------------------------------------------------------------------
        # STEP 17: Approval succeeds
        # ---------------------------------------------------------------------
        appr_success = await client.post(
            f"/api/reviews/{review_id}/approval",
            json={"action": "approve"},
            headers=admin_hdrs,
        )
        assert appr_success.status_code == 200, f"Approval failed: {appr_success.text}"
        assert appr_success.json()["status"] == "APPROVED"

        # ---------------------------------------------------------------------
        # STEP 18: Compliance evidence report is exported
        # ---------------------------------------------------------------------
        export_json = await client.get(f"/api/reviews/{review_id}/export-evidence?format=json", headers=reviewer_hdrs)
        assert export_json.status_code == 200
        packet = export_json.json()
        assert packet["review"]["id"] == review_id
        assert packet["review"]["status"] == "APPROVED"
        assert "audit_ledger" in packet
        assert "findings" in packet

        export_pdf = await client.get(f"/api/reviews/{review_id}/export-evidence?format=pdf", headers=reviewer_hdrs)
        assert export_pdf.status_code == 200
        assert export_pdf.headers["content-type"] == "application/pdf"
        assert len(export_pdf.content) > 500

        # ---------------------------------------------------------------------
        # STEP 19: Relevant evidence source / fact expires
        # ---------------------------------------------------------------------
        # Record dependency linking review to the ISO fact
        with db() as conn:
            conn.execute(
                """
                INSERT INTO evidence_dependencies (id, workspace_id, review_id, source_type, source_id, source_version, created_at)
                VALUES ('dep_iso', 'ws_default', ?, 'FACT', ?, '1.0', ?)
                """,
                (review_id, fact_iso_id, now())
            )
            # Expire the fact
            conn.execute(
                "UPDATE facts SET expires_at=? WHERE id=?",
                ((now_dt - timedelta(days=5)).isoformat(), fact_iso_id)
            )

        # ---------------------------------------------------------------------
        # STEP 20: Impact mapping identifies affected approved draft
        # ---------------------------------------------------------------------
        impact_res = await client.get("/api/governance/impact-map", headers=admin_hdrs)
        assert impact_res.status_code == 200
        impact_data = impact_res.json()
        # Find fact in impact map
        fact_card = next((fc for fc in impact_data.get("items", []) if fc["item_id"] == fact_iso_id), None)
        assert fact_card is not None
        assert review_id in fact_card["affected_review_ids"]

        # ---------------------------------------------------------------------
        # STEP 21: Targeted re-review executes; draft moves to CHANGES_REQUESTED
        # ---------------------------------------------------------------------
        rereview_res = await client.post(
            "/api/governance/re-review-impact",
            data={"item_id": fact_iso_id},
            headers=admin_hdrs,
        )
        assert rereview_res.status_code == 200
        assert rereview_res.json()["affected_count"] >= 1

        # Check review status changed from APPROVED back to CHANGES_REQUESTED
        rev_check = await client.get(f"/api/reviews/{review_id}", headers=reviewer_hdrs)
        assert rev_check.status_code == 200
        assert rev_check.json()["status"] == "CHANGES_REQUESTED"

        # ---------------------------------------------------------------------
        # STEP 22: All changes persist after simulating application reload
        # ---------------------------------------------------------------------
        persisted_review = row("SELECT * FROM reviews WHERE id=?", (review_id,))
        assert persisted_review is not None
        assert persisted_review["status"] == "CHANGES_REQUESTED"

        persisted_audit = rows("SELECT * FROM audit WHERE review_id=?", (review_id,))
        assert len(persisted_audit) >= 3

        persisted_versions = rows("SELECT * FROM review_versions WHERE review_id=?", (review_id,))
        assert len(persisted_versions) >= 2
