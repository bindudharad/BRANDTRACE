"""
Unit tests for deterministic color science, WCAG 2.1 contrast calculations,
and image compliance analysis (Pillow palette and OCR limitations).
"""
import io
import pytest
from PIL import Image

from app.color_science import (
    hex_to_rgb,
    rgb_to_hex,
    relative_luminance,
    contrast_ratio,
    rgb_to_cielab,
    delta_e,
)
from app.image_analyzer import (
    extract_dominant_colors,
    analyze_image_compliance,
    ImageAnalysisError,
)

def test_hex_rgb_conversions():
    assert hex_to_rgb("#000000") == (0, 0, 0)
    assert hex_to_rgb("ffffff") == (255, 255, 255)
    assert hex_to_rgb("#0f766e") == (15, 118, 110)
    assert rgb_to_hex((15, 118, 110)) == "#0f766e"
    assert rgb_to_hex((0, 0, 0)) == "#000000"

def test_wcag_relative_luminance_known_fixtures():
    # Pure black has luminance 0.0
    assert relative_luminance((0, 0, 0)) == 0.0
    # Pure white has luminance 1.0
    assert pytest.approx(relative_luminance((255, 255, 255)), rel=1e-3) == 1.0
    # Standard sRGB sRGB mid-gray
    lum_gray = relative_luminance((128, 128, 128))
    assert 0.2 < lum_gray < 0.23

def test_wcag_contrast_ratios_known_fixtures():
    black = (0, 0, 0)
    white = (255, 255, 255)
    red = (255, 0, 0)
    navy = (0, 43, 73)

    # Black on white: 21.0:1
    assert contrast_ratio(black, white) == 21.0
    # Same colors: 1.0:1
    assert contrast_ratio(white, white) == 1.0
    # Red on white: fails WCAG AA 4.5:1 for normal text (~4.0:1)
    c_red_white = contrast_ratio(red, white)
    assert 3.8 <= c_red_white <= 4.1
    # Navy on white: passes AAA (> 7.0:1)
    c_navy_white = contrast_ratio(navy, white)
    assert c_navy_white > 10.0

def test_delta_e_perceptual_distance():
    teal = (15, 118, 110) # #0f766e
    assert delta_e(teal, teal) == 0.0

    near_teal = (16, 119, 111)
    dist_near = delta_e(teal, near_teal)
    assert dist_near < 2.0 # Imperceptible or barely perceptible

    pure_red = (255, 0, 0)
    dist_opposite = delta_e(teal, pure_red)
    assert dist_opposite > 40.0 # Visibly very distant

def test_image_palette_and_contrast_compliance():
    # Create synthetic test image: dominant red box with low-contrast orange text area
    img = Image.new("RGB", (200, 200), color=(255, 0, 0))
    # Add a contrasting patch
    for x in range(50, 150):
        for y in range(50, 150):
            img.putpixel((x, y), (255, 80, 80)) # Low contrast red-orange

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    data = buffer.getvalue()

    approved_palette = ["#0f766e", "#2dd4bf"] # Brand teal palette
    result = analyze_image_compliance(
        data,
        approved_palette=approved_palette,
        min_contrast=4.5,
        expected_logo_aspect=3.0,
    )

    assert result["width"] == 200
    assert result["height"] == 200
    assert result["format"] == "PNG"

    findings = result["visual_findings"]
    # Should flag unapproved color palette (red vs teal)
    palette_finding = next((f for f in findings if f["category"] == "visual_palette"), None)
    assert palette_finding is not None
    assert palette_finding["status"] == "CONTRADICTED"

    # Dominant image colours do not establish foreground/background text roles.
    contrast_finding = next((f for f in findings if f["category"] == "visual_accessibility"), None)
    assert contrast_finding is not None
    assert contrast_finding["status"] == "NEEDS_REVIEW"
    assert contrast_finding["type"] == "contrast_pair_indeterminate"

    # Should report OCR limitation transparently without giving a false pass
    ocr_finding = next((f for f in findings if f["category"] == "visual_ocr"), None)
    assert ocr_finding is not None
    assert ocr_finding["status"] == "NEEDS_REVIEW"

def test_oversized_image_handling():
    # Check dimensions check
    img = Image.new("RGB", (4097, 100), color=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    with pytest.raises(ImageAnalysisError, match="exceed maximum allowed"):
        analyze_image_compliance(buf.getvalue(), approved_palette=["#000000"])
