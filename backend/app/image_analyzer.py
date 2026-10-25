"""
Deterministic Image and Visual Governance module for BRANDTRACE.
Uses Pillow to extract dominant color palettes, calculate WCAG 2.1 contrast ratios,
evaluate brand palette compliance against approved tolerances, and detect logo fixtures.
"""
from __future__ import annotations

import io
import shutil
from typing import Dict, Any, List, Tuple, Optional
from PIL import Image

from .color_science import (
    hex_to_rgb,
    rgb_to_hex,
    contrast_ratio,
    delta_e,
)

class ImageAnalysisError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

def is_ocr_available() -> bool:
    """Check if tesseract OCR executable is available on the system PATH."""
    return shutil.which("tesseract") is not None

def extract_dominant_colors(image: Image.Image, num_colors: int = 5) -> List[Tuple[Tuple[int, int, int], float]]:
    """
    Extract dominant foreground/canvas colors from image using Pillow quantization.
    Returns list of ((R, G, B), percentage) sorted descending by area share.
    """
    # Convert to RGB mode (stripping alpha channel safely onto white or solid bg)
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        alpha_img = image.convert("RGBA")
        background = Image.new("RGB", alpha_img.size, (255, 255, 255))
        background.paste(alpha_img, mask=alpha_img.split()[3])
        rgb_image = background
    else:
        rgb_image = image.convert("RGB")

    # Resize to thumbnail for fast, noise-reduced palette extraction
    thumbnail = rgb_image.copy()
    thumbnail.thumbnail((150, 150), Image.Resampling.LANCZOS)

    # Quantize to 8 colors using standard Pillow median-cut
    quantized = thumbnail.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()[:num_colors * 3]
    color_counts = quantized.getcolors()

    if not color_counts or not palette:
        return [((255, 255, 255), 1.0)]

    total_pixels = sum(count for count, _ in color_counts)
    results = []

    for count, color_idx in color_counts:
        r = palette[color_idx * 3]
        g = palette[color_idx * 3 + 1]
        b = palette[color_idx * 3 + 2]
        percentage = round(count / total_pixels, 4)
        results.append(((r, g, b), percentage))

    results.sort(key=lambda x: x[1], reverse=True)
    return results

def analyze_image_compliance(
    data: bytes,
    approved_palette: List[str],
    min_contrast: float = 4.5,
    expected_logo_aspect: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Analyze image compliance against brand guidelines:
    - Dominant palette vs approved palette (Delta-E tolerance)
    - WCAG 2.1 contrast ratio of top foreground/background pairs
    - Logo aspect ratio fixture comparison
    - OCR availability and limitation reporting
    """
    if not data or len(data) < 20:
        raise ImageAnalysisError("Uploaded image file is empty or corrupted.")

    try:
        stream = io.BytesIO(data)
        img = Image.open(stream)
        img.verify()
        # Re-open after verify
        stream.seek(0)
        img = Image.open(stream)
    except Exception as exc:
        raise ImageAnalysisError(f"Invalid or unreadable image file: {str(exc)}")

    width, height = img.size
    if width > 4096 or height > 4096:
        raise ImageAnalysisError(f"Image dimensions ({width}x{height}) exceed maximum allowed 4096x4096.")

    extracted_palette = extract_dominant_colors(img, num_colors=5)
    extracted_hexes = [rgb_to_hex(c[0]) for c in extracted_palette]

    visual_findings: List[Dict[str, Any]] = []

    # 1. Palette compliance check
    # Convert approved palette hexes to RGB
    approved_rgbs = []
    for h in approved_palette:
        try:
            approved_rgbs.append(hex_to_rgb(h))
        except Exception:
            continue

    if approved_rgbs and extracted_palette:
        dominant_rgb, dominant_pct = extracted_palette[0]
        dominant_hex = rgb_to_hex(dominant_rgb)

        # Find closest approved color using Delta-E CIE76
        closest_distance = min(delta_e(dominant_rgb, app_rgb) for app_rgb in approved_rgbs)
        
        # Tolerance threshold: Delta-E > 15 is visibly distinct from brand palette
        if closest_distance > 15.0:
            visual_findings.append({
                "category": "visual_palette",
                "type": "unapproved_color",
                "severity": "MEDIUM",
                "status": "CONTRADICTED",
                "passage": f"[Dominant Palette: {dominant_hex} ({dominant_pct * 100:.1f}%)]",
                "explanation": f"Dominant image colour {dominant_hex} deviates from approved brand palette (Delta-E distance {closest_distance:.1f} > tolerance 15.0).",
                "suggested_correction": f"Align key foreground elements with approved colours: {', '.join(approved_palette[:3])}.",
                "analysis_method": "COLOR_SCIENCE_DELTA_E",
                "uncertainty": "Deterministic CIELAB Delta-E calculation.",
            })

    # 2. WCAG Contrast Check
    if len(extracted_palette) >= 2:
        c1, _ = extracted_palette[0]
        c2, _ = extracted_palette[1]
        c_ratio = contrast_ratio(c1, c2)
        hex1, hex2 = rgb_to_hex(c1), rgb_to_hex(c2)

        if c_ratio < min_contrast:
            visual_findings.append({
                "category": "visual_accessibility",
                "type": "contrast_violation",
                "severity": "HIGH",
                "status": "CONTRADICTED",
                "passage": f"[Contrast Pair: {hex1} on {hex2} = {c_ratio}:1]",
                "explanation": f"Dominant colour contrast ratio is {c_ratio}:1, which fails the minimum WCAG AA threshold of {min_contrast}:1 for text readability.",
                "suggested_correction": f"Increase lightness contrast between {hex1} and {hex2} to achieve at least {min_contrast}:1.",
                "analysis_method": "WCAG_2_1_LUMINANCE",
                "uncertainty": "Deterministic W3C WCAG 2.1 relative luminance calculation.",
            })

    # 3. Logo Aspect Ratio Check (if configured)
    actual_aspect = round(width / max(1, height), 2)
    if expected_logo_aspect:
        aspect_diff = abs(actual_aspect - expected_logo_aspect)
        if aspect_diff > 0.3:
            visual_findings.append({
                "category": "visual_logo",
                "type": "logo_distortion",
                "severity": "MEDIUM",
                "status": "NEEDS_REVIEW",
                "passage": f"[Aspect Ratio: {actual_aspect}:1]",
                "explanation": f"Image aspect ratio {actual_aspect}:1 deviates from approved logo specification ({expected_logo_aspect}:1). Asset may be stretched or cropped.",
                "suggested_correction": f"Ensure logo asset uses original un-distorted {expected_logo_aspect}:1 proportions.",
                "analysis_method": "LOGO_FIXTURE_ASPECT",
                "uncertainty": "Deterministic geometric measurement.",
            })

    # 4. OCR Availability Reporting (Strict honesty requirement)
    ocr_ready = is_ocr_available()
    if not ocr_ready:
        visual_findings.append({
            "category": "visual_ocr",
            "type": "ocr_unavailable",
            "severity": "LOW",
            "status": "NEEDS_REVIEW",
            "passage": "[Image Embedded Text]",
            "explanation": "OCR engine (Tesseract) is not configured in this environment. Embedded text within the image was not analysed; human visual inspection required.",
            "suggested_correction": "Review text inside graphics manually against brand guidelines.",
            "analysis_method": "OCR_CAPABILITY_CHECK",
            "uncertainty": "Transparent limitation notice; no false pass given.",
        })

    return {
        "width": width,
        "height": height,
        "format": img.format or "IMAGE",
        "aspect_ratio": actual_aspect,
        "dominant_colors": extracted_hexes,
        "visual_findings": visual_findings,
    }
