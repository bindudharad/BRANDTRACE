"""
Comprehensive Enterprise Features Test Suite for BRANDTRACE (Round 3 Release).
Verifies:
1. Brand Guideline PDF Import & Candidate Approval / Rejection Workflow.
2. Evidence Source Vault & Provenance Integrity.
3. Deterministic Rule Conflict Detection.
4. Downloadable Compliance Evidence Packet (PDF & JSON).
5. Review Assignment & Collaboration.
6. Proactive Expiry Monitoring & Alert Idempotency.
7. Governance Insights Quality Telemetry Metrics.
"""
import io
import json
import pytest
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas as rl_canvas

from app.main import app
from app.models import init_db, db, rows, row, now


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def create_sample_guideline_pdf() -> bytes:
    """Create a valid digital PDF with structured brand guidelines."""
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf)
    c.drawString(100, 750, "BRANDTRACE GLOBAL BRAND GUIDELINES 2026")
    c.drawString(100, 720, "Section 1: Brand Voice Standards")
    c.drawString(100, 700, "Do not use 'cheap' when describing our platform.")
    c.drawString(100, 680, "Avoid unsupported superlatives like 'best' in customer messaging.")
    c.drawString(100, 650, "Section 2: Terminology and Naming")
    c.drawString(100, 630, "Must include 'Brandtrace' in all corporate copy.")
    c.drawString(100, 610, "Use 'accessible' instead of 'low-cost'.")
    c.drawString(100, 580, "Section 3: Verified Product Facts")
    c.drawString(100, 560, "Available in India for enterprise operations.")
    c.drawString(100, 530, "Section 4: Visual Identity")
    c.drawString(100, 510, "Primary brand color: #0f766e.")
    c.showPage()
    c.save()
    buf.seek(0)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# FEATURE 1: BRAND CONSTITUTION INTELLIGENCE (PDF IMPORTER)
# ---------------------------------------------------------------------------

def test_guideline_pdf_import_and_candidate_lifecycle():
    client = TestClient(app)
    pdf_bytes = create_sample_guideline_pdf()

    # 1. Non-admin role must be rejected
    resp = client.post(
        "/api/constitution/import-guidelines",
        files={"file": ("guidelines.pdf", pdf_bytes, "application/pdf")},
        data={"consent_ai": "false"},
        headers={"X-Demo-Role": "reviewer", "X-Demo-Actor": "demo.reviewer"},
    )
    assert resp.status_code == 403

    # 2. Brand Admin can import successfully
    resp = client.post(
        "/api/constitution/import-guidelines",
        files={"file": ("guidelines.pdf", pdf_bytes, "application/pdf")},
        data={"consent_ai": "false"},
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert resp.status_code == 200
    data = resp.json()
    import_id = data["id"]
    assert data["filename"] == "guidelines.pdf"
    assert data["page_count"] == 1
    assert data["candidate_count"] > 0
    assert len(data["document_hash"]) == 64

    # 3. Retrieve candidates
    c_resp = client.get(
        f"/api/constitution/imports/{import_id}/candidates",
        headers={"X-Demo-Role": "reviewer"},
    )
    assert c_resp.status_code == 200
    candidates = c_resp.json()
    assert len(candidates) > 0
    for cand in candidates:
        assert cand["status"] == "PENDING_APPROVAL"
        assert cand["page_number"] == 1
        assert len(cand["original_excerpt"]) > 0

    first_cand = candidates[0]
    cand_id = first_cand["id"]

    # 4. Edit candidate
    edit_resp = client.put(
        f"/api/constitution/candidates/{cand_id}",
        json={"requirement": "Updated governance requirement for this brand rule."},
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert edit_resp.status_code == 200
    assert edit_resp.json()["requirement"] == "Updated governance requirement for this brand rule."

    # 5. Approve candidate
    app_resp = client.post(
        f"/api/constitution/candidates/{cand_id}/approve",
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert app_resp.status_code == 200
    app_data = app_resp.json()
    assert app_data["status"] == "APPROVED"
    new_id = app_data["created_entity_id"]
    assert new_id is not None

    # Verify candidate enters active constitution
    if app_data["candidate_type"] == "fact":
        f = row("SELECT * FROM facts WHERE id=?", (new_id,))
        assert f is not None
        assert f["status"] == "APPROVED"
    else:
        r = row("SELECT * FROM rules WHERE id=?", (new_id,))
        assert r is not None
        assert r["status"] == "APPROVED"

    # 6. Reject another candidate
    if len(candidates) > 1:
        second_id = candidates[1]["id"]
        rej_resp = client.post(
            f"/api/constitution/candidates/{second_id}/reject",
            json={"reason": "Not aligned with corporate strategy."},
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
        )
        assert rej_resp.status_code == 200
        assert rej_resp.json()["status"] == "REJECTED"


def test_guideline_import_empty_and_malformed():
    client = TestClient(app)
    # Empty file
    resp = client.post(
        "/api/constitution/import-guidelines",
        files={"file": ("empty.pdf", b"", "application/pdf")},
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert resp.status_code == 422

    # Malformed PDF
    resp2 = client.post(
        "/api/constitution/import-guidelines",
        files={"file": ("corrupt.pdf", b"not-a-pdf-stream-garbage", "application/pdf")},
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert resp2.status_code == 422


# ---------------------------------------------------------------------------
# FEATURE 2: EVIDENCE SOURCE VAULT
# ---------------------------------------------------------------------------

def test_evidence_source_vault_crud_and_provenance():
    client = TestClient(app)

    # 1. Create evidence source
    src_payload = {
        "title": "Corporate Master Brand Guidelines 2026",
        "source_type": "BRAND_GUIDELINE",
        "file_name": "master_guidelines_v2.pdf",
        "version": "2.0",
        "page_reference": "Page 12",
        "section_reference": "Section 4: Typography & Tone",
        "excerpt": "All public product communications must uphold professional, non-sensational messaging.",
        "owner": "Chief Brand Officer",
        "verification_status": "VERIFIED",
    }
    create_resp = client.post(
        "/api/evidence-sources",
        json=src_payload,
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert create_resp.status_code == 201
    src_data = create_resp.json()
    source_id = src_data["id"]
    assert src_data["title"] == src_payload["title"]
    assert src_data["content_hash"] is not None
    assert len(src_data["content_hash"]) == 64

    # 2. List evidence sources
    list_resp = client.get("/api/evidence-sources", headers={"X-Demo-Role": "reviewer"})
    assert list_resp.status_code == 200
    sources = list_resp.json()
    found = [s for s in sources if s["id"] == source_id]
    assert len(found) == 1
    assert "linked_rules_count" in found[0]

    # 3. Retrieve single source
    get_resp = client.get(f"/api/evidence-sources/{source_id}", headers={"X-Demo-Role": "reviewer"})
    assert get_resp.status_code == 200
    single = get_resp.json()
    assert single["id"] == source_id
    assert "linked_rules" in single
    assert "linked_facts" in single

    # 4. Update evidence source
    update_resp = client.put(
        f"/api/evidence-sources/{source_id}",
        json={"version": "2.1", "excerpt": "Updated mandatory messaging guidelines for executive communications."},
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["version"] == "2.1"
    assert updated["content_hash"] != src_data["content_hash"]

    # 5. Delete source (authorized)
    del_resp = client.delete(
        f"/api/evidence-sources/{source_id}",
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert del_resp.status_code == 204

    # 6. Confirm deleted
    get_after = client.get(f"/api/evidence-sources/{source_id}", headers={"X-Demo-Role": "reviewer"})
    assert get_after.status_code == 404


# ---------------------------------------------------------------------------
# FEATURE 3: DETERMINISTIC RULE CONFLICT DETECTION
# ---------------------------------------------------------------------------

def test_deterministic_rule_conflict_detection():
    client = TestClient(app)

    # 1. Exact contradiction: Rule A requires "guaranteed results", Rule B prohibits "guaranteed results"
    candidate = {
        "title": "Require Guaranteed Results",
        "category": "terminology",
        "kind": "required_phrase",
        "pattern": "guaranteed results",
        "requirement": "Must include guaranteed results.",
        "severity": "HIGH",
        "source_title": "Marketing Charter",
        "source_excerpt": "Include guaranteed results in every pitch.",
        "version": "1.0",
        "status": "APPROVED",
        "owner": "Brand Admin",
    }

    # First add a rule that prohibits "guaranteed results"
    prohib_rule = {
        "title": "Prohibit Guaranteed Claims",
        "category": "terminology",
        "kind": "prohibited_phrase",
        "pattern": "guaranteed results",
        "requirement": "Do not promise guaranteed results.",
        "severity": "HIGH",
        "source_title": "Legal Policy",
        "source_excerpt": "Guaranteed results claims violate advertising guidelines.",
        "version": "1.0",
        "status": "APPROVED",
        "owner": "Legal",
    }
    client.post(
        "/api/rules",
        json=prohib_rule,
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )

    # 2. Check conflict endpoint for the candidate
    check_resp = client.post(
        "/api/rules/check-conflicts",
        json=candidate,
        headers={"X-Demo-Role": "reviewer"},
    )
    assert check_resp.status_code == 200
    conflicts = check_resp.json()
    assert len(conflicts) > 0
    hard_conflicts = [c for c in conflicts if c["conflict_type"] == "HARD_CONFLICT"]
    assert len(hard_conflicts) > 0
    hc = hard_conflicts[0]
    assert hc["severity"] == "CRITICAL"
    assert "Direct policy contradiction" in hc["explanation"]

    # 3. Full workspace conflict scan
    scan_resp = client.get("/api/governance/rule-conflicts", headers={"X-Demo-Role": "reviewer"})
    assert scan_resp.status_code == 200
    all_conflicts = scan_resp.json()
    assert isinstance(all_conflicts, list)


# ---------------------------------------------------------------------------
# FEATURE 4: DOWNLOADABLE COMPLIANCE EVIDENCE PACKET (PDF & JSON)
# ---------------------------------------------------------------------------

def test_compliance_evidence_packet_export_json_and_pdf():
    client = TestClient(app)

    # 1. Create a draft review
    rev_resp = client.post(
        "/api/reviews",
        json={
            "title": "Evidence Packet Test Review",
            "content": "Discover how Brandtrace is the best solution for operations in India.",
            "content_type": "marketing_copy",
        },
        headers={"X-Demo-Role": "creator", "X-Demo-Actor": "demo.creator"},
    )
    assert rev_resp.status_code == 200
    review_id = rev_resp.json()["id"]

    # 2. Export as JSON
    json_resp = client.get(
        f"/api/reviews/{review_id}/export-evidence?format=json",
        headers={"X-Demo-Role": "reviewer"},
    )
    assert json_resp.status_code == 200
    packet = json_resp.json()
    assert packet["header"]["report_type"] == "Compliance Evidence Packet"
    assert packet["header"]["platform"] == "BRANDTRACE Enterprise Brand Governance"
    assert packet["review"]["review_id"] == review_id
    assert "governance_summary" in packet
    assert "findings" in packet
    assert "audit_trail" in packet
    assert "ai_disclosure" in packet

    # 3. Export as PDF
    pdf_resp = client.get(
        f"/api/reviews/{review_id}/export-evidence?format=pdf",
        headers={"X-Demo-Role": "reviewer"},
    )
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in pdf_resp.headers["content-disposition"]
    pdf_content = pdf_resp.content
    assert pdf_content.startswith(b"%PDF")
    assert len(pdf_content) > 1000

    # 4. Invalid format should be rejected
    inv_resp = client.get(
        f"/api/reviews/{review_id}/export-evidence?format=docx",
        headers={"X-Demo-Role": "reviewer"},
    )
    assert inv_resp.status_code == 422


# ---------------------------------------------------------------------------
# FEATURE 5: REVIEW ASSIGNMENT & COLLABORATION
# ---------------------------------------------------------------------------

def test_review_assignment_and_comments():
    client = TestClient(app)

    # 1. Create review
    rev_resp = client.post(
        "/api/reviews",
        json={
            "title": "Assignment Test Review",
            "content": "Brandtrace delivers exceptional governance compliance.",
            "content_type": "marketing_copy",
        },
        headers={"X-Demo-Role": "creator", "X-Demo-Actor": "demo.creator"},
    )
    review_id = rev_resp.json()["id"]

    # 2. Assign review and set priority & due date
    assign_resp = client.patch(
        f"/api/reviews/{review_id}/assignment",
        json={
            "assigned_to": "reviewer.alice",
            "priority": "HIGH",
            "due_date": "2026-11-15T18:00:00Z",
        },
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert assign_resp.status_code == 200
    updated_rev = assign_resp.json()
    assert updated_rev["assigned_to"] == "reviewer.alice"
    assert updated_rev["priority"] == "HIGH"
    assert updated_rev["due_date"] == "2026-11-15T18:00:00Z"

    # 3. Add comment
    comm_resp = client.post(
        f"/api/reviews/{review_id}/comments",
        json={"comment": "Please verify terminology consistency on paragraph 2."},
        headers={"X-Demo-Role": "reviewer", "X-Demo-Actor": "demo.reviewer"},
    )
    assert comm_resp.status_code == 201
    comment = comm_resp.json()
    assert comment["comment"] == "Please verify terminology consistency on paragraph 2."
    assert comment["author"] == "demo.reviewer"

    # 4. List comments
    comments_resp = client.get(
        f"/api/reviews/{review_id}/comments",
        headers={"X-Demo-Role": "reviewer"},
    )
    assert comments_resp.status_code == 200
    comm_list = comments_resp.json()
    assert len(comm_list) >= 1


# ---------------------------------------------------------------------------
# FEATURE 6: PROACTIVE EXPIRY MONITORING & ALERT IDEMPOTENCY
# ---------------------------------------------------------------------------

def test_proactive_expiry_monitoring_and_idempotency():
    client = TestClient(app)

    # 1. Insert an expired fact to trigger an alert
    expired_fact = (
        "F-EXPIRED-TEST-01",
        "ws_default",
        "Expired partnership credential",
        "Valid until 2024",
        "Legal Operations",
        "APPROVED",
        "1.0",
        "src_old_01",
        "Old Contract",
        "Partnership valid through end of 2024.",
        None,
        None,
        "2024-12-31T23:59:59+00:00",  # Expired
        now(),
    )
    with db() as conn:
        conn.execute(
            """
            INSERT INTO facts (
                id, workspace_id, claim, value, owner, status, version,
                source_id, source_title, source_excerpt, review_at,
                effective_at, expires_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            expired_fact
        )

    # 2. Run expiry scan first time
    scan1_resp = client.post(
        "/api/governance/expiry-scan",
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert scan1_resp.status_code == 200
    res1 = scan1_resp.json()
    assert res1["status"] == "completed"

    # 3. Run expiry scan second time (Idempotency test)
    scan2_resp = client.post(
        "/api/governance/expiry-scan",
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    assert scan2_resp.status_code == 200
    res2 = scan2_resp.json()
    # Idempotent: duplicate scan on same day must create 0 new duplicate alerts
    assert res2["new_alerts_created"] == 0

    # 4. List active alerts
    alerts_resp = client.get("/api/governance/expiry-alerts", headers={"X-Demo-Role": "reviewer"})
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    assert len(alerts) > 0
    first_alert = alerts[0]

    # 5. Acknowledge alert
    ack_resp = client.post(
        f"/api/governance/expiry-alerts/{first_alert['id']}/acknowledge",
        headers={"X-Demo-Role": "reviewer", "X-Demo-Actor": "demo.reviewer"},
    )
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "ACKNOWLEDGED"


# ---------------------------------------------------------------------------
# FEATURE 7: GOVERNANCE INSIGHTS QUALITY METRICS TELEMETRY
# ---------------------------------------------------------------------------

def test_rule_conflict_normalization_and_scopes():
    client = TestClient(app)

    # 1. Unicode and case differences
    rule_norm_a = {
        "title": "Strict Unicode Term",
        "category": "terminology",
        "kind": "required_phrase",
        "pattern": "Brandtrace™",
        "requirement": "Must include Brandtrace™.",
        "severity": "HIGH",
        "source_title": "Legal",
        "source_excerpt": "Brandtrace trademark.",
        "version": "1.0",
        "status": "APPROVED",
        "owner": "Legal",
    }
    rule_norm_b = {
        "title": "Normalized Contradiction",
        "category": "terminology",
        "kind": "prohibited_phrase",
        "pattern": "  brandtrace™  ",
        "requirement": "Do not use brandtrace.",
        "severity": "HIGH",
        "source_title": "Tone",
        "source_excerpt": "Avoid brandtrace.",
        "version": "1.0",
        "status": "APPROVED",
        "owner": "Tone",
    }
    client.post("/api/rules", json=rule_norm_a, headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"})
    check_resp = client.post("/api/rules/check-conflicts", json=rule_norm_b, headers={"X-Demo-Role": "reviewer"})
    assert check_resp.status_code == 200
    conflicts = check_resp.json()
    assert len(conflicts) > 0
    assert any(c["conflict_type"] == "HARD_CONFLICT" for c in conflicts)


def test_cross_workspace_evidence_and_export_security():
    client = TestClient(app)

    # Create review in default workspace
    rev_resp = client.post(
        "/api/reviews",
        json={
            "title": "Tenant Isolation Review",
            "content": "Secret internal strategic messaging.",
            "content_type": "marketing_copy",
        },
        headers={"X-Demo-Role": "creator", "X-Demo-Actor": "demo.creator", "X-Workspace-Id": "ws_default"},
    )
    rev_id = rev_resp.json()["id"]

    # Attempt export from unrelated foreign tenant workspace -> 404 or 403
    export_resp = client.get(
        f"/api/reviews/{rev_id}/export-evidence?format=json",
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@foreign-corp.com", "X-Workspace-Id": "ws_unrelated"},
    )
    assert export_resp.status_code in (403, 404)


def test_candidate_unauthorized_approval_blocked():
    client = TestClient(app)
    pdf_bytes = create_sample_guideline_pdf()
    imp_resp = client.post(
        "/api/constitution/import-guidelines",
        files={"file": ("guidelines.pdf", pdf_bytes, "application/pdf")},
        headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"},
    )
    imp_id = imp_resp.json()["id"]
    candidates = client.get(f"/api/constitution/imports/{imp_id}/candidates", headers={"X-Demo-Role": "reviewer"}).json()
    cand_id = candidates[0]["id"]

    # Reviewer role cannot approve
    rev_app = client.post(
        f"/api/constitution/candidates/{cand_id}/approve",
        headers={"X-Demo-Role": "reviewer", "X-Demo-Actor": "demo.reviewer"},
    )
    assert rev_app.status_code == 403

    # Auditor role cannot approve
    aud_app = client.post(
        f"/api/constitution/candidates/{cand_id}/approve",
        headers={"X-Demo-Role": "auditor", "X-Demo-Actor": "demo.auditor"},
    )
    assert aud_app.status_code == 403


def test_governance_insights_quality_telemetry():
    client = TestClient(app)
    resp = client.get("/api/insights", headers={"X-Demo-Role": "reviewer"})
    assert resp.status_code == 200
    data = resp.json()

    metric_keys = [
        "active_rules_count",
        "draft_rules_count",
        "conflicting_rules_count",
        "duplicate_rules_count",
        "expired_facts_count",
        "approaching_expiry_facts_count",
        "rules_without_sources_count",
        "active_alerts_count",
        "evidence_sources_count",
    ]
    for k in metric_keys:
        assert k in data, f"Missing telemetry metric '{k}'"
        assert isinstance(data[k], int)
        assert data[k] >= 0
