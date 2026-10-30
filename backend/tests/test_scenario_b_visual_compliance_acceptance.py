"""Scenario B: Visual Compliance Acceptance Test
Exercises:
1. Labelled compliant and non-compliant image fixtures.
2. Expected palette deviation (CIELAB Delta-E) and asset-registry outcomes (APPROVED, RESTRICTED, UNREGISTERED).
3. Explicit known foreground/background pair assessment against WCAG 2.1 thresholds.
4. Marking upload-only contrast as NEEDS_REVIEW when text/background roles cannot be determined.
5. Reporting unsupported capabilities (Option B raster OCR and perceptual logo matching).
"""
import io
import os
import sys
import tempfile
from pathlib import Path
from PIL import Image
import pytest

if 'DATABASE_URL' not in os.environ:
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models import db, init_db, rows, ident, now
from app.image_analyzer import (
    analyze_image_compliance,
    assess_known_contrast_pair,
    compute_sha256,
    is_ocr_available,
    extract_dominant_colors,
)


@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM brand_assets")
    yield


def test_scenario_b_visual_compliance_fixtures_and_evaluations():
    # 1. Create Compliant Image Fixture: brand teal (#0f766e) on white
    compliant_img = Image.new("RGB", (200, 200), color=(15, 118, 110))
    c_bytes = io.BytesIO()
    compliant_img.save(c_bytes, format="PNG")
    c_data = c_bytes.getvalue()
    c_hash = compute_sha256(c_data)

    # Register compliant image in brand_assets as APPROVED
    with db() as conn:
        conn.execute(
            """INSERT INTO brand_assets (id, name, asset_type, content_hash, license_status, approval_status, workspace_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (ident("asset"), "Corporate Primary Hero", "image", c_hash, "COMMERCIAL_INTERNAL", "APPROVED", "ws_default", now(), now())
        )

    approved_palette = ["#0f766e", "#2dd4bf", "#123b2d"]
    c_results = analyze_image_compliance(c_data, approved_palette=approved_palette, min_contrast=4.5, workspace_id="ws_default")
    c_findings = c_results["visual_findings"]

    # Assert compliant outcomes:
    # Asset registry finding is SUPPORTED / APPROVED
    asset_finding = next((f for f in c_findings if f["category"] == "visual_asset"), None)
    assert asset_finding is not None
    assert asset_finding["status"] == "SUPPORTED"
    assert asset_finding["severity"] == "LOW"
    assert asset_finding["type"] == "registered_asset_approved"

    # Palette finding: dominant color matches approved palette (Delta-E <= 15.0), so NO unapproved_color finding!
    unapproved_palette = [f for f in c_findings if f["category"] == "visual_palette" and f["type"] == "unapproved_color"]
    assert len(unapproved_palette) == 0, "Compliant image should not generate unapproved_color findings"

    # 2. Create Non-Compliant Image Fixture: unapproved neon magenta (#ff00ff)
    non_compliant_img = Image.new("RGB", (200, 200), color=(255, 0, 255))
    nc_bytes = io.BytesIO()
    non_compliant_img.save(nc_bytes, format="PNG")
    nc_data = nc_bytes.getvalue()
    nc_hash = compute_sha256(nc_data)

    # Register non-compliant image as RESTRICTED
    with db() as conn:
        conn.execute(
            """INSERT INTO brand_assets (id, name, asset_type, content_hash, license_status, approval_status, license_notes, workspace_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (ident("asset"), "Unapproved Promotional Graphic", "image", nc_hash, "EXPIRED_LICENSE", "RESTRICTED", "License expired Jan 2026", "ws_default", now(), now())
        )

    nc_results = analyze_image_compliance(nc_data, approved_palette=approved_palette, min_contrast=4.5, workspace_id="ws_default")
    nc_findings = nc_results["visual_findings"]

    # Asset registry finding is CONTRADICTED / RESTRICTED
    nc_asset_finding = next((f for f in nc_findings if f["category"] == "visual_asset"), None)
    assert nc_asset_finding is not None
    assert nc_asset_finding["status"] == "CONTRADICTED"
    assert nc_asset_finding["severity"] == "HIGH"
    assert nc_asset_finding["type"] == "registered_asset_restricted"

    # Palette finding is CONTRADICTED (Delta-E > 15.0 against brand palette)
    palette_finding = next((f for f in nc_findings if f["category"] == "visual_palette" and f["type"] == "unapproved_color"), None)
    assert palette_finding is not None
    assert palette_finding["status"] == "CONTRADICTED"
    assert palette_finding["analysis_method"] == "COLOR_SCIENCE_DELTA_E"

    # 3. Known contrast pair assessment: assess_known_contrast_pair
    # High contrast: Deep Ink #123B2D (18, 59, 45) on White (255, 255, 255) -> should exceed 4.5:1
    ink_on_white = assess_known_contrast_pair((18, 59, 45), (255, 255, 255), minimum=4.5)
    assert ink_on_white["status"] == "SUPPORTED"
    assert ink_on_white["ratio"] >= 4.5

    # Low contrast: Light Gray (210, 215, 212) on White (255, 255, 255) -> fails 4.5:1
    gray_on_white = assess_known_contrast_pair((210, 215, 212), (255, 255, 255), minimum=4.5)
    assert gray_on_white["status"] == "CONTRADICTED"
    assert gray_on_white["ratio"] < 4.5

    # 4. Upload-only indeterminate contrast: dominant colors do NOT establish semantic text roles
    dual_color_img = Image.new("RGB", (200, 200), color=(15, 118, 110))
    dual_stream = io.BytesIO()
    # Draw half with secondary
    for x in range(100):
        for y in range(200):
            dual_color_img.putpixel((x, y), (45, 212, 191))
    dual_color_img.save(dual_stream, format="PNG")
    dual_results = analyze_image_compliance(dual_stream.getvalue(), approved_palette=approved_palette, min_contrast=4.5)
    accessibility_finding = next((f for f in dual_results["visual_findings"] if f["category"] == "visual_accessibility"), None)
    assert accessibility_finding is not None
    assert accessibility_finding["type"] == "contrast_pair_indeterminate"
    assert accessibility_finding["status"] == "NEEDS_REVIEW", "Upload-only contrast must be marked NEEDS_REVIEW without text roles"
    assert "not an automated WCAG text-contrast determination" in accessibility_finding["explanation"]

    # 5. Unsupported capabilities: Option B OCR is deterministically False
    assert is_ocr_available() is False
    ocr_finding = next((f for f in c_findings if f["category"] == "visual_ocr"), None)
    assert ocr_finding is not None
    assert ocr_finding["type"] == "ocr_unsupported"
    assert ocr_finding["status"] == "NEEDS_REVIEW"
