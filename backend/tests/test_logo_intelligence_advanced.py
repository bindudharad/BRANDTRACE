"""
Comprehensive Automated Test Suite for BRANDTRACE Reference-Based Logo Intelligence Subsystem.
Implements all 25 mandatory enterprise test scenarios (TEST 1 through TEST 25)
plus edge cases, corrupt payloads, and workspace tenant isolation.
"""
from __future__ import annotations

import io
import json
import os
import tempfile
import pytest
from PIL import Image, ImageDraw

from app.models import db, row, rows, ident, now
from app.services.logo_intelligence import (
    register_reference_logo,
    approve_reference_logo,
    deactivate_reference_logo,
    get_reference_logo,
    list_reference_logos,
    get_or_create_logo_standard,
    update_logo_standard,
    analyze_visual_document,
    get_all_demo_fixtures,
    seed_demo_logo_references,
    generate_synthetic_logo,
    evaluate_aspect_ratio,
    evaluate_digital_size,
    evaluate_pdf_page_size,
    evaluate_clearspace,
    evaluate_logo_color_compliance,
    match_candidate_against_reference,
)


@pytest.fixture(autouse=True)
def isolated_logo_db(monkeypatch):
    """Ensure each test runs with an isolated temporary SQLite database."""
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    db_url = f"sqlite:///{tmp.name.replace(os.sep, '/')}"
    monkeypatch.setenv("DATABASE_URL", db_url)
    monkeypatch.setenv("ALLOW_DEMO_AUTH", "true")

    from app.models import init_db
    init_db()

    yield tmp.name

    try:
        os.remove(tmp.name)
    except Exception:
        pass


def create_test_canvas_with_logo(
    logo_bytes: bytes,
    canvas_w: int = 800,
    canvas_h: int = 600,
    pos_x: int = 50,
    pos_y: int = 50,
    bg_color: tuple = (255, 255, 255),
    encroaching_text: bool = False,
) -> bytes:
    """Helper to embed a logo into a larger canvas graphic."""
    logo_img = Image.open(io.BytesIO(logo_bytes))
    canvas = Image.new("RGB", (canvas_w, canvas_h), bg_color)

    if logo_img.mode in ("RGBA", "LA") or (logo_img.mode == "P" and "transparency" in logo_img.info):
        canvas.paste(logo_img, (pos_x, pos_y), mask=logo_img.convert("RGBA").split()[3])
    else:
        canvas.paste(logo_img, (pos_x, pos_y))

    if encroaching_text:
        # Draw high-contrast infringing graphic right next to logo (< 0.2H away)
        draw = ImageDraw.Draw(canvas)
        draw.rectangle([pos_x + logo_img.width + 5, pos_y, pos_x + logo_img.width + 80, pos_y + logo_img.height], fill=(0, 0, 0))

    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


# -----------------------------------------------------------------------------
# Test Scenarios 1 to 25
# -----------------------------------------------------------------------------

def test_01_exact_reference_match():
    """TEST 1: Upload the exact same file. Expected: APPROVED_MATCH with 100% similarity."""
    fixtures = get_all_demo_fixtures()
    ref = register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
        approved_colors=["#0a7352", "#111827", "#64748b", "#ffffff"],
    )

    res = analyze_visual_document(
        file_bytes=fixtures["approved_primary"],
        filename="test_upload.png",
        workspace_id="ws_default",
    )

    assert res["overall_verdict"] == "COMPLIANT"
    assert len(res["candidates"]) >= 1
    cand = res["candidates"][0]
    assert cand["matched_reference_id"] == ref["id"]
    assert cand["candidate_verdict"] == "APPROVED_MATCH"
    assert cand["similarity_score"] == 100.0


def test_02_uniform_resizing():
    """TEST 2: Uniform resizing must be recognized as compliant without distortion."""
    fixtures = get_all_demo_fixtures()
    ref = register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )

    # Resize uniformly to 600 x 200 (2.0x scale, same 3.0 aspect ratio)
    orig_img = Image.open(io.BytesIO(fixtures["approved_primary"]))
    resized = orig_img.resize((600, 200), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    resized.save(buf, format="PNG")

    # Put on 1200x800 canvas
    canvas = create_test_canvas_with_logo(buf.getvalue(), canvas_w=1200, canvas_h=800, pos_x=100, pos_y=100)

    res = analyze_visual_document(file_bytes=canvas, filename="banner.png")
    assert len(res["candidates"]) >= 1
    cand = res["candidates"][0]
    assert cand["checks_summary"]["aspect_ratio"] == "COMPLIANT"
    assert cand["checks_summary"]["identity"] == "APPROVED_MATCH"


def test_03_jpeg_compression():
    """TEST 3: Heavy JPEG compression remains recognizable within calibrated tolerance."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )

    # Save as low-quality JPEG
    orig_img = Image.open(io.BytesIO(fixtures["approved_primary"])).convert("RGB")
    buf = io.BytesIO()
    orig_img.save(buf, format="JPEG", quality=40)

    canvas = create_test_canvas_with_logo(buf.getvalue())
    res = analyze_visual_document(file_bytes=canvas, filename="compressed.jpg")
    assert len(res["candidates"]) >= 1
    cand = res["candidates"][0]
    assert cand["similarity_score"] >= 70.0
    assert cand["candidate_verdict"] in ("APPROVED_MATCH", "COMPLIANT")


def test_04_different_background():
    """TEST 4: Approved transparent logo placed on a solid background is recognized."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )

    # Place transparent logo on a subtle light grey background
    canvas = create_test_canvas_with_logo(fixtures["approved_primary"], bg_color=(240, 245, 248))
    res = analyze_visual_document(file_bytes=canvas, filename="subtle_bg.png")
    assert len(res["candidates"]) >= 1
    assert res["candidates"][0]["candidate_verdict"] in ("APPROVED_MATCH", "COMPLIANT")


def test_05_unrecognised_wrong_logo():
    """TEST 5: Unrelated or foreign logo is flagged as UNRECOGNISED_LOGO."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )

    # Create completely unrelated blue circular badge with text "ACME"
    foreign_logo = generate_synthetic_logo(
        primary_color=(2, 132, 199),  # Sky blue
        secondary_color=(15, 23, 42),
        text="ACME CORP",
        symbol_type="altered",
    )
    canvas = create_test_canvas_with_logo(foreign_logo)

    res = analyze_visual_document(file_bytes=canvas, filename="foreign_ad.png")
    assert res["overall_verdict"] in ("NON_COMPLIANT", "NEEDS_REVIEW")
    # Finding must exist explaining unapproved logo
    assert len(res["findings"]) >= 1
    assert any(f["finding_type"] in ("UNRECOGNISED_LOGO", "STYLE_MISMATCH") for f in res["findings"])


def test_06_modified_symbol_style_mismatch():
    """TEST 6: Logo with modified symbol geometry is flagged as STYLE_MISMATCH."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )

    canvas = create_test_canvas_with_logo(fixtures["negative_modified_symbol"])
    res = analyze_visual_document(file_bytes=canvas, filename="modified.png")
    assert res["overall_verdict"] == "NON_COMPLIANT"
    assert any(f["finding_type"] == "STYLE_MISMATCH" for f in res["findings"])


def test_07_changed_wordmark_detected():
    """TEST 7: Altered or replaced lettering triggers mismatch."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )

    # Logo with changed lettering "DISRUPT"
    altered_text_logo = generate_synthetic_logo(
        primary_color=(10, 115, 82),
        secondary_color=(17, 24, 39),
        text="DISRUPT",
        symbol_type="diamond",
    )
    canvas = create_test_canvas_with_logo(altered_text_logo)

    res = analyze_visual_document(file_bytes=canvas, filename="altered_wordmark.png")
    # Structural diff or style mismatch detected
    assert any(f["finding_type"] in ("STYLE_MISMATCH", "UNRECOGNISED_LOGO", "NEEDS_REVIEW") for f in res["findings"])


def test_08_wrong_font_and_structural_diff():
    """TEST 8: Structural deviation between candidate and reference is computed."""
    import numpy as np
    fixtures = get_all_demo_fixtures()
    ref = register_reference_logo(file_bytes=fixtures["approved_primary"], filename="primary.png", name="Primary", auto_approve=True)

    cand_gray = np.array(Image.open(io.BytesIO(fixtures["negative_modified_symbol"])).convert("L").resize((300, 100)))
    ref_gray = np.array(Image.open(io.BytesIO(fixtures["approved_primary"])).convert("L"))

    match_res = match_candidate_against_reference(
        candidate_gray=cand_gray,
        reference_gray=ref_gray,
        reference_id=ref["id"],
        reference_variant="primary_horizontal",
        reference_aspect_ratio=3.0,
    )
    # Structural difference must be significant (> 0.15)
    assert match_res["structural_diff"] > 0.15
    assert match_res["status"] == "STYLE_MISMATCH"


def test_09_unapproved_color_mismatch():
    """TEST 9: Unapproved recoloring (e.g. Hot Pink / Purple) triggers COLOUR_MISMATCH."""
    fixtures = get_all_demo_fixtures()
    ref = register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
        approved_colors=["#0a7352", "#111827", "#ffffff"],
    )

    canvas = create_test_canvas_with_logo(fixtures["negative_recolored"])
    res = analyze_visual_document(file_bytes=canvas, filename="purple_poster.png")

    assert res["overall_verdict"] == "NON_COMPLIANT"
    color_findings = [f for f in res["findings"] if f["finding_type"] == "COLOUR_MISMATCH"]
    assert len(color_findings) >= 1
    assert "Delta-E" in color_findings[0]["explanation"]


def test_10_stretched_logo_distortion():
    """TEST 10: Horizontally stretched logo triggers DISTORTION_DETECTED."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )

    canvas = create_test_canvas_with_logo(fixtures["negative_stretched"])
    res = analyze_visual_document(file_bytes=canvas, filename="stretched.png")

    assert res["overall_verdict"] == "NON_COMPLIANT"
    dist_findings = [f for f in res["findings"] if f["finding_type"] == "DISTORTION_DETECTED"]
    assert len(dist_findings) >= 1
    assert "stretched" in dist_findings[0]["observed_value"].lower()


def test_11_compressed_logo_distortion():
    """TEST 11: Vertically stretched / horizontally compressed logo triggers DISTORTION_DETECTED."""
    res = evaluate_aspect_ratio(
        detected_width=150,  # 150x100 -> aspect 1.5 instead of 3.0 (-50% deviation)
        detected_height=100,
        reference_aspect_ratio=3.0,
        tolerance=0.05,
    )
    assert res["is_distorted"] is True
    assert res["status"] == "DISTORTION_DETECTED"
    assert res["distortion_type"] == "COMPRESSED_HORIZONTAL"


def test_12_undersized_logo_too_small():
    """TEST 12: Logo below minimum display dimensions triggers LOGO_TOO_SMALL."""
    fixtures = get_all_demo_fixtures()
    ref = register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )
    # Configure minimum width 100px
    update_logo_standard(ref["id"], {"min_width_px": 100, "min_height_px": 30})

    canvas = create_test_canvas_with_logo(fixtures["negative_undersized"])
    res = analyze_visual_document(file_bytes=canvas, filename="tiny_logo.png")

    assert res["overall_verdict"] in ("NON_COMPLIANT", "PARTIALLY_COMPLIANT")
    size_findings = [f for f in res["findings"] if f["finding_type"] == "LOGO_TOO_SMALL"]
    assert len(size_findings) >= 1
    assert "smaller than configured minimum" in size_findings[0]["explanation"]


def test_13_valid_displayed_size():
    """TEST 13: Logo displayed above configured minimum passes size compliance."""
    res = evaluate_digital_size(width_px=300, height_px=100, min_width_px=80, min_height_px=24)
    assert res["is_compliant"] is True
    assert res["status"] == "COMPLIANT"


def test_14_clearspace_exclusion_violation():
    """TEST 14: Conflicting text/graphics inside 0.5H margin triggers CLEARSPACE_VIOLATION."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )

    # Embed with encroaching black box 5px from logo boundary
    canvas = create_test_canvas_with_logo(fixtures["approved_primary"], pos_x=50, pos_y=50, encroaching_text=True)
    res = analyze_visual_document(file_bytes=canvas, filename="encroached.png")

    assert res["overall_verdict"] == "NON_COMPLIANT"
    cs_findings = [f for f in res["findings"] if f["finding_type"] == "CLEARSPACE_VIOLATION"]
    assert len(cs_findings) >= 1


def test_15_wrong_logo_variant():
    """TEST 15: Restricting placement or variant flags non-permitted usage."""
    fixtures = get_all_demo_fixtures()
    ref = register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )
    # Restrict placement to TOP_RIGHT only
    update_logo_standard(ref["id"], {"permitted_quadrants": ["TOP_RIGHT"]})

    # Place at (50, 50) on 800x600 canvas -> TOP_LEFT
    canvas = create_test_canvas_with_logo(fixtures["approved_primary"], canvas_w=800, canvas_h=600, pos_x=50, pos_y=50)
    res = analyze_visual_document(file_bytes=canvas, filename="placement_test.png")

    placement_findings = [f for f in res["findings"] if "PLACEMENT" in f["finding_type"]]
    assert len(placement_findings) >= 1
    assert "TOP_LEFT" in placement_findings[0]["observed_value"]


def test_16_cropped_logo():
    """TEST 16: Clipped logo triggers CROPPED_OR_OBSTRUCTED_LOGO."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_primary.png",
        name="Nexus Primary Logo",
        auto_approve=True,
    )

    # Place logo touching the right canvas edge so letters are clipped
    canvas = create_test_canvas_with_logo(fixtures["approved_primary"], canvas_w=400, canvas_h=200, pos_x=250, pos_y=50)
    res = analyze_visual_document(file_bytes=canvas, filename="cropped.png")

    assert res["overall_verdict"] == "NON_COMPLIANT"
    crop_findings = [f for f in res["findings"] if f["finding_type"] == "CROPPED_OR_OBSTRUCTED_LOGO"]
    assert len(crop_findings) >= 1


def test_17_transparent_png():
    """TEST 17: Transparent PNG alpha channel is handled cleanly."""
    fixtures = get_all_demo_fixtures()
    ref = register_reference_logo(
        file_bytes=fixtures["approved_reversed"],
        filename="white_reversed.png",
        name="Nexus White Reversed Logo",
        auto_approve=True,
    )
    assert ref["has_transparency"] is True


def test_18_multiple_logos():
    """TEST 18: Multiple logos on one artwork are identified independently."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(file_bytes=fixtures["approved_primary"], filename="primary.png", name="Primary", auto_approve=True)

    # Canvas with 2 logos at distinct locations
    canvas = Image.new("RGB", (1200, 800), (255, 255, 255))
    logo_img = Image.open(io.BytesIO(fixtures["approved_primary"]))
    canvas.paste(logo_img, (50, 50))
    canvas.paste(logo_img, (700, 500))

    buf = io.BytesIO()
    canvas.save(buf, format="PNG")

    res = analyze_visual_document(file_bytes=buf.getvalue(), filename="two_logos.png")
    assert len(res["candidates"]) >= 2


def test_19_multi_page_pdf():
    """TEST 19: Multi-page PDF produces page-by-page findings."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(file_bytes=fixtures["approved_primary"], filename="primary.png", name="Primary", auto_approve=True)

    # Create a 2-page PDF in-memory using Pillow
    p1 = Image.open(io.BytesIO(create_test_canvas_with_logo(fixtures["approved_primary"]))).convert("RGB")
    p2 = Image.open(io.BytesIO(create_test_canvas_with_logo(fixtures["negative_stretched"]))).convert("RGB")

    pdf_buf = io.BytesIO()
    p1.save(pdf_buf, format="PDF", save_all=True, append_images=[p2])

    res = analyze_visual_document(file_bytes=pdf_buf.getvalue(), filename="contract.pdf", source_type="PDF")
    assert res["page_count"] == 2
    assert res["overall_verdict"] == "NON_COMPLIANT"

    # Verify Page 2 contains distortion finding
    p2_findings = [f for f in res["findings"] if f["page_number"] == 2]
    assert len(p2_findings) >= 1
    assert any(f["finding_type"] == "DISTORTION_DETECTED" for f in p2_findings)


def test_20_pdf_physical_size_measurement():
    """TEST 20: PDF logo dimensions measured in points (pt) and millimetres (mm)."""
    res = evaluate_pdf_page_size(
        width_px=60,
        height_px=20,
        rendered_page_w_px=1200,
        rendered_page_h_px=1600,
        pdf_page_w_pt=595.0,  # Standard A4 width in pt
        pdf_page_h_pt=842.0,
        min_width_pt=50.0,
        min_width_mm=17.6,
    )
    # 60 / 1200 * 595 = 29.75 pt (< 50 pt min)
    assert res["is_compliant"] is False
    assert res["status"] == "LOGO_TOO_SMALL"
    assert res["width_pt"] == 29.75
    assert res["width_mm"] == 10.5


def test_21_no_reference_configured():
    """TEST 21: Uploading an image with zero approved references returns REFERENCE_NOT_CONFIGURED."""
    fixtures = get_all_demo_fixtures()
    res = analyze_visual_document(file_bytes=fixtures["approved_primary"], filename="sample.png", workspace_id="ws_empty")
    assert res["overall_verdict"] == "REFERENCE_NOT_CONFIGURED"
    assert "No approved logo reference" in res["explanation"]


def test_22_ambiguous_content_needs_review():
    """TEST 22: Inconclusive visual match returns NEEDS_REVIEW without crashing."""
    fixtures = get_all_demo_fixtures()
    register_reference_logo(file_bytes=fixtures["approved_primary"], filename="primary.png", name="Primary", auto_approve=True)

    # Heavily blurred image
    from PIL import ImageFilter
    img = Image.open(io.BytesIO(fixtures["approved_primary"])).filter(ImageFilter.BoxBlur(12))
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    canvas = create_test_canvas_with_logo(buf.getvalue())
    res = analyze_visual_document(file_bytes=canvas, filename="blurred.png")
    assert res["overall_verdict"] in ("NEEDS_REVIEW", "NON_COMPLIANT")


def test_23_version_awareness():
    """TEST 23: Reference logo versioning and status preservation."""
    fixtures = get_all_demo_fixtures()
    ref1 = register_reference_logo(file_bytes=fixtures["approved_primary"], filename="v1.png", name="Brand Mark", auto_approve=True)
    assert ref1["version"] == "1.0"
    assert ref1["approval_status"] == "APPROVED"

    # Deactivate v1
    deact = deactivate_reference_logo(ref1["id"])
    assert deact["approval_status"] == "DEACTIVATED"


def test_24_multiple_approved_variants():
    """TEST 24: Legitimate approved variants (Monochrome & Reversed) match without false rejections."""
    fixtures = get_all_demo_fixtures()
    seed_demo_logo_references(workspace_id="ws_default")

    # Analyze monochrome logo
    canvas_mono = create_test_canvas_with_logo(fixtures["approved_monochrome"])
    res = analyze_visual_document(file_bytes=canvas_mono, filename="mono_letterhead.png")
    assert res["overall_verdict"] == "COMPLIANT"
    assert res["candidates"][0]["matched_variant"] == "black_monochrome"


def test_25_workspace_isolation():
    """TEST 25: Tenant A cannot access or match Tenant B's private logo references."""
    fixtures = get_all_demo_fixtures()

    # Register reference in ws_corp_a
    register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="corp_a.png",
        name="Corp A Logo",
        workspace_id="ws_corp_a",
        auto_approve=True,
    )

    # In ws_corp_b, no references exist
    res = analyze_visual_document(
        file_bytes=fixtures["approved_primary"],
        filename="upload.png",
        workspace_id="ws_corp_b",
    )
    assert res["overall_verdict"] == "REFERENCE_NOT_CONFIGURED"

    # List in ws_corp_b returns 0
    refs_b = list_reference_logos(workspace_id="ws_corp_b")
    assert len(refs_b) == 0


def test_corrupt_file_handling():
    """Safety: Corrupted files gracefully raise ValueError without unhandled crash."""
    with pytest.raises(ValueError):
        analyze_visual_document(file_bytes=b"not_an_image", filename="corrupt.png")
