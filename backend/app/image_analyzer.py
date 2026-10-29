"""
Deterministic Image and Visual Governance module for BRANDTRACE.
Uses Pillow to extract dominant color palettes, calculate WCAG 2.1 contrast ratios,
evaluate brand palette compliance against approved tolerances, and detect logo fixtures.

Round 3 additions:
- SHA-256 hash computation of uploaded image bytes
- Asset registry lookup (brand_assets table): APPROVED / RESTRICTED / NEEDS_REVIEW findings
- Improved source_excerpt fields with measured hex values
"""
from __future__ import annotations

import hashlib
import io
import shutil
from typing import Dict, Any, List, Optional, Tuple

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
    """Check if automated raster OCR is active in this release pipeline.

    Under Option B, raster image text extraction is explicitly marked unsupported
    so behavior is 100% deterministic across all test and production environments.
    """
    return False


def compute_sha256(data: bytes) -> str:
    """Compute SHA-256 hex digest of raw bytes."""
    return hashlib.sha256(data).hexdigest()


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


def check_asset_registry(content_hash: str) -> Optional[Dict[str, Any]]:
    """
    Look up a content hash in the brand_assets table.
    Returns the asset record dict if found, or None.
    Lazy import to avoid circular dependency at module level.
    """
    try:
        from .models import row
        return row("SELECT * FROM brand_assets WHERE content_hash=?", (content_hash,))
    except Exception:
        return None


def assess_known_contrast_pair(foreground: Tuple[int, int, int], background: Tuple[int, int, int], minimum: float = 4.5) -> Dict[str, Any]:
    """Assess an explicitly supplied foreground/background pair only.

    This helper is intentionally separate from dominant-colour extraction: callers
    must establish the semantic roles before a WCAG text conclusion is possible.
    """
    ratio = contrast_ratio(foreground, background)
    return {
        "foreground": rgb_to_hex(foreground),
        "background": rgb_to_hex(background),
        "ratio": ratio,
        "threshold": minimum,
        "status": "SUPPORTED" if ratio >= minimum else "CONTRADICTED",
        "analysis_method": "WCAG_2_1_KNOWN_FOREGROUND_BACKGROUND_PAIR",
    }


def analyze_image_compliance(
    data: bytes,
    approved_palette: List[str],
    min_contrast: float = 4.5,
    expected_logo_aspect: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Analyze image compliance against brand guidelines:
    - SHA-256 hash computed for asset registry lookup
    - Asset registry check (Commitment 2): APPROVED / RESTRICTED / unknown hash
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

    # 0. Asset Registry Check (Round 3 — Commitment 2)
    content_hash = compute_sha256(data)
    asset_record = check_asset_registry(content_hash)

    if asset_record is not None:
        approval_status = asset_record.get("approval_status", "UNKNOWN")
        asset_name = asset_record.get("name", "Unknown asset")
        if approval_status == "APPROVED":
            visual_findings.append({
                "category": "visual_asset",
                "type": "registered_asset_approved",
                "severity": "LOW",
                "status": "SUPPORTED",
                "passage": f"[Asset Hash: {content_hash[:16]}...]",
                "explanation": f"Asset '{asset_name}' is registered and approved in the brand asset registry.",
                "suggested_correction": None,
                "source_excerpt": f"Registered hash: {content_hash}. Approval status: APPROVED.",
                "analysis_method": "ASSET_REGISTRY_LOOKUP",
                "uncertainty": "Exact binary SHA-256 hash match against brand asset registry; does not perform perceptual logo recognition.",
            })
        elif approval_status in ("RESTRICTED", "REVIEW_REQUIRED"):
            license_notes = asset_record.get("license_notes") or "No additional notes."
            visual_findings.append({
                "category": "visual_asset",
                "type": "registered_asset_restricted",
                "severity": "HIGH",
                "status": "CONTRADICTED",
                "passage": f"[Asset Hash: {content_hash[:16]}...]",
                "explanation": (
                    f"Asset '{asset_name}' is in the brand asset registry with status '{approval_status}'. "
                    f"Usage requires human review or is restricted. Notes: {license_notes}"
                ),
                "suggested_correction": "Replace with an asset that has APPROVED status in the brand registry.",
                "source_excerpt": f"Registered hash: {content_hash}. Approval status: {approval_status}.",
                "analysis_method": "ASSET_REGISTRY_LOOKUP",
                "uncertainty": "Exact binary SHA-256 hash match against brand asset registry; does not perform perceptual logo recognition.",
            })
    else:
        # Hash not found in registry
        visual_findings.append({
            "category": "visual_asset",
            "type": "unregistered_asset",
            "severity": "MEDIUM",
            "status": "NEEDS_REVIEW",
            "passage": f"[Asset Hash: {content_hash[:16]}...]",
            "explanation": (
                "This asset is not found in the brand asset registry. "
                "Human verification is required to confirm the asset is approved for use."
            ),
            "suggested_correction": "Register this asset in the brand asset registry or replace with an approved asset.",
            "source_excerpt": f"SHA-256: {content_hash}. No match in brand_assets registry.",
            "analysis_method": "ASSET_REGISTRY_LOOKUP",
            "uncertainty": "Exact binary SHA-256 hash lookup; does not perform perceptual logo recognition. Asset may be legitimately new or unapproved.",
        })

    # 1. Palette compliance check
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
        closest_idx = min(range(len(approved_rgbs)), key=lambda i: delta_e(dominant_rgb, approved_rgbs[i]))
        closest_distance = delta_e(dominant_rgb, approved_rgbs[closest_idx])
        nearest_approved_hex = approved_palette[closest_idx] if closest_idx < len(approved_palette) else "N/A"

        # Tolerance threshold: Delta-E > 15 is visibly distinct from brand palette
        if closest_distance > 15.0:
            visual_findings.append({
                "category": "visual_palette",
                "type": "unapproved_color",
                "severity": "MEDIUM",
                "status": "CONTRADICTED",
                "passage": f"[Dominant Palette: {dominant_hex} ({dominant_pct * 100:.1f}%)]",
                "explanation": (
                    f"Dominant image colour {dominant_hex} deviates from approved brand palette "
                    f"(Delta-E distance {closest_distance:.1f} > tolerance 15.0). "
                    f"Nearest approved colour: {nearest_approved_hex}."
                ),
                "suggested_correction": f"Align key foreground elements with approved colours: {', '.join(approved_palette[:3])}.",
                "source_excerpt": f"Measured: {dominant_hex}. Nearest approved: {nearest_approved_hex}. Delta-E: {closest_distance:.1f}.",
                "analysis_method": "COLOR_SCIENCE_DELTA_E",
                "uncertainty": "Deterministic CIELAB Delta-E calculation.",
            })

    # 2. Contrast evidence. Dominant image colours are not reliably a text /
    # background pair, so they must never be represented as a WCAG text pass
    # or failure. OCR/text segmentation would be required for that conclusion.
    if len(extracted_palette) >= 2:
        c1, _ = extracted_palette[0]
        c2, _ = extracted_palette[1]
        c_ratio = contrast_ratio(c1, c2)
        hex1, hex2 = rgb_to_hex(c1), rgb_to_hex(c2)

        visual_findings.append({
                "category": "visual_accessibility",
                "type": "contrast_pair_indeterminate",
                "severity": "LOW",
                "status": "NEEDS_REVIEW",
                "passage": f"[Contrast Pair: {hex1} on {hex2} = {c_ratio}:1]",
                "explanation": (
                    f"Dominant colours measure {c_ratio}:1 (reference threshold {min_contrast}:1), "
                    "but the pipeline did not identify a foreground text/background pair. "
                    "This is not an automated WCAG text-contrast determination."
                ),
                "suggested_correction": "Inspect the actual text/background pair manually or use a supported text-segmentation method.",
                "source_excerpt": f"Measured dominant-colour ratio: {c_ratio}:1. Reference threshold: {min_contrast}:1.",
                "analysis_method": "DOMINANT_COLOR_CONTRAST_REFERENCE",
                "uncertainty": "Dominant colours do not establish text/background roles; no WCAG pass or failure is inferred.",
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
                "explanation": (
                    f"Image aspect ratio {actual_aspect}:1 deviates from approved logo specification "
                    f"({expected_logo_aspect}:1). Asset may be stretched or cropped."
                ),
                "suggested_correction": f"Ensure logo asset uses original un-distorted {expected_logo_aspect}:1 proportions.",
                "source_excerpt": f"Measured aspect: {actual_aspect}:1. Approved specification: {expected_logo_aspect}:1.",
                "analysis_method": "LOGO_FIXTURE_ASPECT",
                "uncertainty": "Deterministic geometric measurement.",
            })

    # 4. OCR text inspection boundary (Option B: deterministic limitation notice)
    visual_findings.append({
        "category": "visual_ocr",
        "type": "ocr_unsupported",
        "severity": "LOW",
        "status": "NEEDS_REVIEW",
        "passage": "[Image Embedded Text]",
        "explanation": (
            "Automated text extraction from raster graphics is not configured in this release pipeline. "
            "Embedded text within graphics was not analysed; human visual inspection is required."
        ),
        "suggested_correction": "Review text inside graphics manually against brand guidelines.",
        "source_excerpt": "Visual pipeline limitation: automated raster OCR text inspection is unsupported.",
        "analysis_method": "OCR_CAPABILITY_CHECK",
        "uncertainty": "Transparent limitation notice; no false pass given.",
    })

    return {
        "width": width,
        "height": height,
        "format": img.format or "IMAGE",
        "aspect_ratio": actual_aspect,
        "dominant_colors": extracted_hexes,
        "content_hash": content_hash,
        "visual_findings": visual_findings,
    }
