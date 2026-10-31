"""
Geometric analysis, aspect ratio validation, distortion detection, and cropping inspection.
"""
from __future__ import annotations

from typing import Any, Dict, Optional, Tuple


def evaluate_aspect_ratio(
    detected_width: int,
    detected_height: int,
    reference_aspect_ratio: float,
    tolerance: float = 0.05,
) -> Dict[str, Any]:
    """
    Compare detected logo dimensions against the reference aspect ratio.
    Distinguishes uniform scaling (compliant) from non-uniform stretching or compression (distortion).
    
    Args:
        detected_width: Measured width of detected logo bounding box.
        detected_height: Measured height of detected logo bounding box.
        reference_aspect_ratio: Ground-truth aspect ratio (w / h) of approved reference.
        tolerance: Permitted relative deviation (e.g. 0.05 = +/- 5%).
    """
    if detected_height <= 0 or reference_aspect_ratio <= 0:
        return {
            "status": "ANALYSIS_FAILED",
            "is_distorted": False,
            "detected_aspect_ratio": 0.0,
            "reference_aspect_ratio": reference_aspect_ratio,
            "deviation_percent": 0.0,
            "distortion_type": "NONE",
            "explanation": "Invalid dimensions for geometric analysis.",
        }

    detected_aspect = round(detected_width / float(detected_height), 4)
    delta_ratio = abs(detected_aspect - reference_aspect_ratio)
    relative_deviation = delta_ratio / reference_aspect_ratio
    deviation_pct = round(relative_deviation * 100.0, 2)

    if relative_deviation <= tolerance:
        return {
            "status": "COMPLIANT",
            "is_distorted": False,
            "detected_aspect_ratio": detected_aspect,
            "reference_aspect_ratio": reference_aspect_ratio,
            "deviation_percent": deviation_pct,
            "tolerance_percent": round(tolerance * 100.0, 1),
            "distortion_type": "NONE",
            "explanation": f"Aspect ratio ({detected_aspect:.3f}) conforms to approved reference ({reference_aspect_ratio:.3f}) within {tolerance:.1%} tolerance.",
        }

    # Non-uniform scaling detected
    if detected_aspect > reference_aspect_ratio:
        distortion_type = "STRETCHED_HORIZONTAL"
        explanation = (
            f"Logo is horizontally stretched: aspect ratio is {detected_aspect:.3f} "
            f"vs approved reference {reference_aspect_ratio:.3f} (+{deviation_pct:.1f}% deviation, tolerance: {tolerance:.1%})."
        )
    else:
        distortion_type = "COMPRESSED_HORIZONTAL"
        explanation = (
            f"Logo is horizontally compressed / vertically stretched: aspect ratio is {detected_aspect:.3f} "
            f"vs approved reference {reference_aspect_ratio:.3f} (-{deviation_pct:.1f}% deviation, tolerance: {tolerance:.1%})."
        )

    return {
        "status": "DISTORTION_DETECTED",
        "is_distorted": True,
        "detected_aspect_ratio": detected_aspect,
        "reference_aspect_ratio": reference_aspect_ratio,
        "deviation_percent": deviation_pct,
        "tolerance_percent": round(tolerance * 100.0, 1),
        "distortion_type": distortion_type,
        "explanation": explanation,
    }


def evaluate_cropping_and_boundary(
    x: int,
    y: int,
    w: int,
    h: int,
    canvas_w: int,
    canvas_h: int,
    edge_margin_threshold: int = 2,
    correlation_score: float = 0.70,
) -> Dict[str, Any]:
    """
    Detect whether a logo candidate is clipped or obstructed by canvas edges.
    """
    # Standalone logo asset upload (fills canvas) is not clipped
    if w >= (canvas_w - 10) and h >= (canvas_h - 10):
        return {
            "is_cropped": False,
            "clipped_edges": [],
            "status": "COMPLIANT",
            "explanation": "Standalone logo asset occupies canvas; no clipping detected.",
        }

    touches_left = x <= edge_margin_threshold
    touches_top = y <= edge_margin_threshold
    touches_right = (x + w) >= (canvas_w - edge_margin_threshold)
    touches_bottom = (y + h) >= (canvas_h - edge_margin_threshold)

    clipped_edges = []
    if touches_left:
        clipped_edges.append("LEFT")
    if touches_top:
        clipped_edges.append("TOP")
    if touches_right:
        clipped_edges.append("RIGHT")
    if touches_bottom:
        clipped_edges.append("BOTTOM")

    is_cropped = len(clipped_edges) > 0 and correlation_score < 0.95

    return {
        "is_cropped": is_cropped,
        "clipped_edges": clipped_edges,
        "status": "CROPPED_OR_OBSTRUCTED_LOGO" if is_cropped else "COMPLIANT",
        "explanation": (
            f"Logo candidate appears clipped at canvas boundary ({', '.join(clipped_edges)})"
            if is_cropped else "No canvas boundary clipping detected."
        ),
    }
