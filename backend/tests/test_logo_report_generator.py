"""
Unit & Integration Test Suite for BRANDTRACE Official Logo Verification Report & PDF Generator.
Verifies all 16 mission-critical acceptance criteria:
1.  test_generate_report_compliant_asset
2.  test_generate_report_failure_asset
3.  test_generate_report_multipage_pdf
4.  test_generate_report_needs_review
5.  test_generate_report_no_reference_configured
6.  test_unperformed_checks_marked_not_evaluated
7.  test_report_never_leaks_full_document_text
8.  test_report_sha256_checksum_valid
9.  test_report_persistence_and_immutability
10. test_report_download_endpoint_returns_pdf_stream
11. test_report_verify_endpoint_authenticity
12. test_workspace_isolation
13. test_invalid_analysis_id_returns_404
14. test_report_number_uniqueness
15. test_finding_disposition_in_report
16. test_pdf_page_budget_adherence_and_disclaimer
"""
import hashlib
import io
import json
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from app.main import app
from app.models import db, row, rows, ident, now
from app.services.logo_intelligence import (
    seed_demo_logo_references,
    get_all_demo_fixtures,
    analyze_visual_document,
    generate_logo_verification_report,
    get_logo_report,
    get_logo_report_pdf_bytes,
    verify_logo_report_authenticity,
    list_logo_reports,
)

client = TestClient(app)

WS_A = "ws_report_test_a"
WS_B = "ws_report_test_b"


@pytest.fixture(autouse=True)
def setup_test_workspaces():
    """Ensure clean test workspaces in isolated test database."""
    with db() as conn:
        conn.execute("INSERT OR IGNORE INTO workspaces (id, name, created_at) VALUES (?, ?, ?)", (WS_A, "Report Test Org A", now()))
        conn.execute("INSERT OR IGNORE INTO workspaces (id, name, created_at) VALUES (?, ?, ?)", (WS_B, "Report Test Org B", now()))
        for actor in ("demo.brand_admin", "demo.reviewer", "demo.creator"):
            conn.execute(
                "INSERT OR IGNORE INTO workspace_members (workspace_id, actor, role, created_at) VALUES (?, ?, ?, ?)",
                (WS_A, actor, "brand_admin", now()),
            )
            conn.execute(
                "INSERT OR IGNORE INTO workspace_members (workspace_id, actor, role, created_at) VALUES (?, ?, ?, ?)",
                (WS_B, actor, "brand_admin", now()),
            )


# -----------------------------------------------------------------------------
# Test 1: Compliant Asset -> VERIFIED — ALL CONFIGURED CHECKS PASSED
# -----------------------------------------------------------------------------
def test_generate_report_compliant_asset():
    seed_demo_logo_references(workspace_id=WS_A)
    fixtures = get_all_demo_fixtures()
    primary_png = fixtures["approved_primary"]

    analysis = analyze_visual_document(
        file_bytes=primary_png,
        filename="approved_nexus_logo.png",
        workspace_id=WS_A,
    )
    assert analysis["overall_verdict"] == "COMPLIANT"

    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
        generated_by="Quality Director",
    )

    assert report["id"].startswith("lrep_")
    assert report["report_number"].startswith("BT-RPT-")
    assert report["overall_verdict"] == "COMPLIANT"
    assert report["findings_count"] == 0

    # Verify checks matrix in snapshot
    checks = report["checks"]
    assert len(checks) == 8
    # Compliant checks must be PASS
    id_check = next(c for c in checks if c["dimension"] == "Identity & Trademark")
    assert id_check["outcome"] == "PASS"

    # Verify physical PDF generated and starts with %PDF
    pdf_bytes = get_logo_report_pdf_bytes(report["id"], workspace_id=WS_A)
    assert pdf_bytes.startswith(b"%PDF")


# -----------------------------------------------------------------------------
# Test 2: Failure Asset -> NON-COMPLIANT
# -----------------------------------------------------------------------------
def test_generate_report_failure_asset():
    seed_demo_logo_references(workspace_id=WS_A)
    fixtures = get_all_demo_fixtures()
    stretched_png = fixtures["negative_stretched"]

    analysis = analyze_visual_document(
        file_bytes=stretched_png,
        filename="stretched_nexus_logo.png",
        workspace_id=WS_A,
    )
    assert analysis["overall_verdict"] == "NON_COMPLIANT"
    assert analysis["summary"]["findings_count"] > 0

    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
    )

    assert report["overall_verdict"] == "NON_COMPLIANT"
    assert report["findings_count"] > 0

    # Geometric check should be FAIL
    geom_check = next(c for c in report["checks"] if c["dimension"] == "Aspect Ratio & Geometry")
    assert geom_check["outcome"] == "FAIL"


# -----------------------------------------------------------------------------
# Test 3: Multi-Page PDF Reporting
# -----------------------------------------------------------------------------
def test_generate_report_multipage_pdf():
    seed_demo_logo_references(workspace_id=WS_A)
    fixtures = get_all_demo_fixtures()

    # Create a 2-page synthetic PDF with reportlab
    from reportlab.pdfgen import canvas as rl_canvas
    pdf_buf = io.BytesIO()
    c = rl_canvas.Canvas(pdf_buf, pagesize=(500, 500))
    # Page 1: clean text
    c.drawString(100, 450, "Sample Document Header")
    c.showPage()
    # Page 2: clean text
    c.drawString(100, 450, "Sample Document Page 2")
    c.save()
    pdf_bytes = pdf_buf.getvalue()

    analysis = analyze_visual_document(
        file_bytes=pdf_bytes,
        filename="twopage_doc.pdf",
        workspace_id=WS_A,
    )

    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
    )

    assert report["summary"]["page_count"] == 2
    # Verify generated report PDF is valid
    report_pdf = get_logo_report_pdf_bytes(report["id"], workspace_id=WS_A)
    reader = PdfReader(io.BytesIO(report_pdf))
    assert len(reader.pages) <= 3


# -----------------------------------------------------------------------------
# Test 4: Needs Review Asset
# -----------------------------------------------------------------------------
def test_generate_report_needs_review():
    seed_demo_logo_references(workspace_id=WS_A)

    # Insert a synthetic analysis with NEEDS_REVIEW
    ana_id = ident("lana")
    with db() as conn:
        conn.execute(
            """
            INSERT INTO logo_analyses (
                id, workspace_id, source_filename, source_type, file_size,
                page_count, status, overall_verdict, candidates_detected,
                compliant_candidates, findings_count, reference_versions_used_json,
                created_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (ana_id, WS_A, "ambiguous_mark.png", "IMAGE", 1024, 1, "COMPLETED", "NEEDS_REVIEW", 1, 0, 1, "[]", now(), now()),
        )
        conn.execute(
            """
            INSERT INTO logo_candidates (
                id, analysis_id, workspace_id, page_number, bounding_box_json,
                detected_aspect_ratio, similarity_method, similarity_score,
                confidence_band, candidate_verdict, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (ident("lcand"), ana_id, WS_A, 1, '{"x": 10, "y": 10, "width": 50, "height": 50}', 1.0, "TEMPLATE", 55.0, "AMBIGUOUS", "NEEDS_REVIEW", now()),
        )

    report = generate_logo_verification_report(analysis_id=ana_id, workspace_id=WS_A)
    assert report["overall_verdict"] == "NEEDS_REVIEW"


# -----------------------------------------------------------------------------
# Test 5: No Reference Configured
# -----------------------------------------------------------------------------
def test_generate_report_no_reference_configured():
    # WS_B has no references configured
    fixtures = get_all_demo_fixtures()
    png_bytes = fixtures["approved_primary"]

    analysis = analyze_visual_document(
        file_bytes=png_bytes,
        filename="unconfigured_test.png",
        workspace_id=WS_B,
    )
    assert analysis["overall_verdict"] == "REFERENCE_NOT_CONFIGURED"

    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_B,
    )
    assert report["overall_verdict"] == "REFERENCE_NOT_CONFIGURED"
    assert report["reference_id"] is None

    pdf_bytes = get_logo_report_pdf_bytes(report["id"], workspace_id=WS_B)
    assert pdf_bytes.startswith(b"%PDF")


# -----------------------------------------------------------------------------
# Test 6: Unperformed Checks Marked NOT EVALUATED (Never PASS)
# -----------------------------------------------------------------------------
def test_unperformed_checks_marked_not_evaluated():
    # In WS_B where no reference standards exist, checks cannot be evaluated
    fixtures = get_all_demo_fixtures()
    png_bytes = fixtures["approved_primary"]

    analysis = analyze_visual_document(
        file_bytes=png_bytes,
        filename="unconfigured_test.png",
        workspace_id=WS_B,
    )
    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_B,
    )

    checks = report["checks"]
    # Every check in unconfigured state must be NOT EVALUATED, none should be PASS
    for c in checks:
        assert c["outcome"] == "NOT EVALUATED", f"Check {c['dimension']} was unexpectedly {c['outcome']}"


# -----------------------------------------------------------------------------
# Test 7: Report Never Leaks Full Document Text
# -----------------------------------------------------------------------------
def test_report_never_leaks_full_document_text():
    secret_text = "CONFIDENTIAL_TOP_SECRET_PROPRIETARY_LEAK_TEST_998877"

    from reportlab.pdfgen import canvas as rl_canvas
    pdf_buf = io.BytesIO()
    c = rl_canvas.Canvas(pdf_buf, pagesize=(500, 500))
    c.drawString(50, 400, secret_text)
    c.save()
    pdf_bytes = pdf_buf.getvalue()

    analysis = analyze_visual_document(
        file_bytes=pdf_bytes,
        filename="confidential_memo.pdf",
        workspace_id=WS_A,
    )

    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
    )

    report_pdf = get_logo_report_pdf_bytes(report["id"], workspace_id=WS_A)
    reader = PdfReader(io.BytesIO(report_pdf))
    full_report_text = ""
    for page in reader.pages:
        full_report_text += page.extract_text() or ""

    # The secret document text MUST NOT be reproduced in the logo report
    assert secret_text not in full_report_text


# -----------------------------------------------------------------------------
# Test 8: Valid SHA-256 Checksums
# -----------------------------------------------------------------------------
def test_report_sha256_checksum_valid():
    fixtures = get_all_demo_fixtures()
    primary_png = fixtures["approved_primary"]
    expected_src_hash = hashlib.sha256(primary_png).hexdigest()

    analysis = analyze_visual_document(
        file_bytes=primary_png,
        filename="primary_hash_test.png",
        workspace_id=WS_A,
    )

    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
    )

    assert report["source_file_hash"] == expected_src_hash

    pdf_bytes = get_logo_report_pdf_bytes(report["id"], workspace_id=WS_A)
    actual_pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
    assert report["checksum_sha256"] == actual_pdf_sha256


# -----------------------------------------------------------------------------
# Test 9: Persistence and Immutability
# -----------------------------------------------------------------------------
def test_report_persistence_and_immutability():
    fixtures = get_all_demo_fixtures()
    primary_png = fixtures["approved_primary"]

    analysis = analyze_visual_document(
        file_bytes=primary_png,
        filename="immutability_test.png",
        workspace_id=WS_A,
    )
    report_orig = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
    )

    # Deliberately modify reference standards in DB
    with db() as conn:
        conn.execute("UPDATE logo_standards SET min_width_px=9999 WHERE workspace_id=?", (WS_A,))

    # Fetch report again - should be returned from immutable record
    report_cached = get_logo_report(report_orig["id"], workspace_id=WS_A)
    assert report_cached["id"] == report_orig["id"]
    assert report_cached["checksum_sha256"] == report_orig["checksum_sha256"]
    assert report_cached["checks"] == report_orig["checks"]


# -----------------------------------------------------------------------------
# Test 10: Download Endpoint Streams PDF
# -----------------------------------------------------------------------------
def test_report_download_endpoint_returns_pdf_stream():
    fixtures = get_all_demo_fixtures()
    analysis = analyze_visual_document(
        file_bytes=fixtures["approved_primary"],
        filename="stream_test.png",
        workspace_id=WS_A,
    )
    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
    )

    response = client.get(
        f"/api/logo-intelligence/reports/{report['id']}/download",
        headers={"X-Demo-Role": "brand_admin", "x-workspace-id": WS_A},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")


# -----------------------------------------------------------------------------
# Test 11: Authenticity Verification Endpoint
# -----------------------------------------------------------------------------
def test_report_verify_endpoint_authenticity():
    fixtures = get_all_demo_fixtures()
    analysis = analyze_visual_document(
        file_bytes=fixtures["approved_primary"],
        filename="verify_test.png",
        workspace_id=WS_A,
    )
    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
    )

    verify_res = verify_logo_report_authenticity(report["id"])
    assert verify_res["verified"] is True
    assert verify_res["status"] == "AUTHENTIC"
    assert verify_res["report_number"] == report["report_number"]
    assert verify_res["checksum_sha256"] == report["checksum_sha256"]

    # Also test via HTTP endpoint
    http_res = client.get(f"/api/logo-intelligence/reports/{report['id']}/verify")
    assert http_res.status_code == 200
    assert http_res.json()["verified"] is True


# -----------------------------------------------------------------------------
# Test 12: Workspace Isolation
# -----------------------------------------------------------------------------
def test_workspace_isolation():
    fixtures = get_all_demo_fixtures()
    analysis = analyze_visual_document(
        file_bytes=fixtures["approved_primary"],
        filename="isolation_test.png",
        workspace_id=WS_A,
    )
    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
    )

    # Requesting report from WS_B should return 404
    resp = client.get(
        f"/api/logo-intelligence/reports/{report['id']}",
        headers={"X-Demo-Role": "brand_admin", "x-workspace-id": WS_B},
    )
    assert resp.status_code == 404

    # Download from WS_B should return 404
    resp_dl = client.get(
        f"/api/logo-intelligence/reports/{report['id']}/download",
        headers={"X-Demo-Role": "brand_admin", "x-workspace-id": WS_B},
    )
    assert resp_dl.status_code == 404


# -----------------------------------------------------------------------------
# Test 13: Invalid Analysis ID Returns 404
# -----------------------------------------------------------------------------
def test_invalid_analysis_id_returns_404():
    resp = client.post(
        "/api/logo-intelligence/analyses/lana_nonexistent_9999/report",
        headers={"X-Demo-Role": "brand_admin", "x-workspace-id": WS_A},
    )
    assert resp.status_code == 404


# -----------------------------------------------------------------------------
# Test 14: Report Number Uniqueness
# -----------------------------------------------------------------------------
def test_report_number_uniqueness():
    fixtures = get_all_demo_fixtures()
    a1 = analyze_visual_document(file_bytes=fixtures["approved_primary"], filename="unique1.png", workspace_id=WS_A)
    a2 = analyze_visual_document(file_bytes=fixtures["approved_monochrome"], filename="unique2.png", workspace_id=WS_A)

    r1 = generate_logo_verification_report(analysis_id=a1["analysis_id"], workspace_id=WS_A)
    r2 = generate_logo_verification_report(analysis_id=a2["analysis_id"], workspace_id=WS_A)

    assert r1["id"] != r2["id"]
    assert r1["report_number"] != r2["report_number"]


# -----------------------------------------------------------------------------
# Test 15: Finding Disposition Included in Report
# -----------------------------------------------------------------------------
def test_finding_disposition_in_report():
    fixtures = get_all_demo_fixtures()
    analysis = analyze_visual_document(
        file_bytes=fixtures["negative_recolored"],
        filename="recolored_finding_test.png",
        workspace_id=WS_A,
    )
    assert len(analysis["findings"]) > 0
    f_id = analysis["findings"][0]["id"]

    # Resolve finding with justification
    resolve_resp = client.post(
        f"/api/logo-intelligence/findings/{f_id}/resolve",
        json={"disposition": "OVERRIDDEN", "reason": "Executive marketing campaign waiver approved."},
        headers={"X-Demo-Role": "brand_admin", "x-workspace-id": WS_A},
    )
    assert resolve_resp.status_code == 200

    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
    )
    pdf_bytes = get_logo_report_pdf_bytes(report["id"], workspace_id=WS_A)

    reader = PdfReader(io.BytesIO(pdf_bytes))
    full_text = "".join(p.extract_text() or "" for p in reader.pages)
    assert "OVERRIDDEN" in full_text


# -----------------------------------------------------------------------------
# Test 16: PDF Page Budget Adherence and Governance Disclaimer
# -----------------------------------------------------------------------------
def test_pdf_page_budget_adherence_and_disclaimer():
    fixtures = get_all_demo_fixtures()
    analysis = analyze_visual_document(
        file_bytes=fixtures["approved_primary"],
        filename="disclaimer_budget_test.png",
        workspace_id=WS_A,
    )
    report = generate_logo_verification_report(
        analysis_id=analysis["analysis_id"],
        workspace_id=WS_A,
    )
    pdf_bytes = get_logo_report_pdf_bytes(report["id"], workspace_id=WS_A)

    reader = PdfReader(io.BytesIO(pdf_bytes))
    page_count = len(reader.pages)
    assert 1 <= page_count <= 3, f"Report page count {page_count} exceeded budget (1-3 pages)"

    disclaimer_snippet = "Evidence-Based Brand Governance"
    for idx, page in enumerate(reader.pages):
        txt = page.extract_text() or ""
        assert disclaimer_snippet in txt, f"Mandatory disclaimer missing from page {idx + 1}"
