"""
Color science, CIELAB conversion, and Delta-E logo color compliance analysis.
"""
from __future__ import annotations

import io
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

from app.color_science import (
    hex_to_rgb,
    rgb_to_hex,
    delta_e,
    rgb_to_cielab,
)


def extract_logo_foreground_colors(
    image: Image.Image,
    num_colors: int = 4,
    skip_near_white: bool = True,
    skip_near_black_threshold: int = 0,
) -> List[Tuple[str, float]]:
    """
    Extract dominant foreground colors from a cropped logo image.
    Excludes transparent pixels, canvas backgrounds, and intermediate anti-aliased edge ringing.
    Returns:
        List of (hex_color, area_percentage) sorted descending.
    """
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        rgba = image.convert("RGBA")
        alpha = np.array(rgba)[:, :, 3]
        rgb = np.array(rgba)[:, :, :3]
        raw_mask = (alpha > 50)
    else:
        rgb = np.array(image.convert("RGB"))
        raw_mask = np.ones(rgb.shape[:2], dtype=bool)

    h, w = rgb.shape[:2]
    # Sample border pixels to detect canvas background
    if h > 6 and w > 6:
        border_pixels = np.concatenate([rgb[0, :], rgb[-1, :], rgb[:, 0], rgb[:, -1]])
        bg_color = np.median(border_pixels, axis=0)
        bg_dist = np.linalg.norm(rgb.astype(float) - bg_color.astype(float), axis=2)
        
        # Pixels matching canvas perimeter background or near-white canvas
        is_bg = (bg_dist < 30)
        if skip_near_white:
            is_bg = is_bg | ((rgb[:, :, 0] > 225) & (rgb[:, :, 1] > 225) & (rgb[:, :, 2] > 225))
        
        effective_mask = raw_mask & (~is_bg)
        if np.sum(effective_mask) > 30:
            raw_mask = effective_mask

    # Morphological erosion by 1 pixel to eliminate anti-aliased edge ringing
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    eroded_mask = cv2.erode(raw_mask.astype(np.uint8), kernel)
    if np.sum(eroded_mask) > 40:
        final_mask = (eroded_mask > 0)
    else:
        final_mask = raw_mask

    pixels = rgb[final_mask]
    if len(pixels) == 0:
        return [("#000000", 1.0)]

    # Subsample for speed if large
    if len(pixels) > 5000:
        idx = np.random.choice(len(pixels), 5000, replace=False)
        pixels = pixels[idx]

    # Pillow median-cut clustering on extracted foreground
    dummy_img = Image.fromarray(pixels.reshape(-1, 1, 3))
    quantized = dummy_img.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()[:num_colors * 3]
    counts = quantized.getcolors()

    if not counts or not palette:
        return [("#000000", 1.0)]

    total = sum(c for c, _ in counts)
    results = []
    for count, color_idx in counts:
        r = palette[color_idx * 3]
        g = palette[color_idx * 3 + 1]
        b = palette[color_idx * 3 + 2]
        hex_code = rgb_to_hex((r, g, b))
        pct = round(count / float(total), 4)
        results.append((hex_code, pct))

    results.sort(key=lambda x: x[1], reverse=True)
    return results


def evaluate_logo_color_compliance(
    detected_colors: List[Tuple[str, float]],
    approved_colors: List[str],
    delta_e_tolerance: float = 8.0,
) -> Dict[str, Any]:
    """
    Compare detected dominant logo colors against approved brand palette in CIELAB space.
    
    Args:
        detected_colors: List of (hex_code, share_percent) from detected logo.
        approved_colors: List of approved hex strings (e.g. ['#10b981', '#ffffff']).
        delta_e_tolerance: Maximum allowable Delta-E CIE76 distance (default 8.0).
    """
    if not approved_colors:
        return {
            "status": "COMPLIANT",
            "is_compliant": True,
            "findings": [],
            "color_measurements": [],
            "explanation": "No specific color restrictions configured for this reference.",
        }

    approved_rgbs = []
    for ac in approved_colors:
        try:
            approved_rgbs.append((ac, hex_to_rgb(ac)))
        except Exception:
            continue

    if not approved_rgbs:
        return {
            "status": "COMPLIANT",
            "is_compliant": True,
            "findings": [],
            "color_measurements": [],
            "explanation": "No valid approved colors parsed.",
        }

    measurements = []
    violations = []

    # Significant colors represent substantial foreground regions (>= 15%), or top color
    significant_colors = [c for c in detected_colors if c[1] >= 0.15]
    if not significant_colors:
        significant_colors = detected_colors[:1]

    for detected_hex, share in significant_colors:
        try:
            det_rgb = hex_to_rgb(detected_hex)
        except Exception:
            continue

        best_match_hex = None
        min_de = 999.0

        for app_hex, app_rgb in approved_rgbs:
            de = delta_e(det_rgb, app_rgb)
            if de < min_de:
                min_de = de
                best_match_hex = app_hex

        min_de = round(min_de, 2)
        is_ok = min_de <= delta_e_tolerance

        measurements.append({
            "detected_hex": detected_hex,
            "share_percent": round(share * 100.0, 1),
            "closest_approved_hex": best_match_hex,
            "delta_e": min_de,
            "tolerance": delta_e_tolerance,
            "compliant": is_ok,
        })

        if not is_ok:
            violations.append({
                "detected_hex": detected_hex,
                "closest_approved_hex": best_match_hex,
                "delta_e": min_de,
                "share_percent": round(share * 100.0, 1),
            })

    if violations:
        worst = max(violations, key=lambda x: x["delta_e"])
        explanation = (
            f"Detected unapproved logo color '{worst['detected_hex']}' (Delta-E: {worst['delta_e']} "
            f"vs approved '{worst['closest_approved_hex']}', limit: {delta_e_tolerance})."
        )
        return {
            "status": "COLOUR_MISMATCH",
            "is_compliant": False,
            "findings": violations,
            "color_measurements": measurements,
            "explanation": explanation,
        }

    return {
        "status": "COMPLIANT",
        "is_compliant": True,
        "findings": [],
        "color_measurements": measurements,
        "explanation": f"All dominant colors conform to approved reference palette (all Delta-E <= {delta_e_tolerance}).",
    }
