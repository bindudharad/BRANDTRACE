"""
Logo placement, quadrant classification, and safe-zone positioning compliance.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple


def classify_quadrant(
    center_x: float,
    center_y: float,
    canvas_w: int,
    canvas_h: int,
) -> str:
    """
    Classify normalized bounding-box centroid into standardized design quadrants.
    """
    if canvas_w <= 0 or canvas_h <= 0:
        return "UNKNOWN"

    is_left = center_x < (canvas_w * 0.40)
    is_right = center_x > (canvas_w * 0.60)
    is_top = center_y < (canvas_h * 0.40)
    is_bottom = center_y > (canvas_h * 0.60)

    if is_top and is_left:
        return "TOP_LEFT"
    elif is_top and is_right:
        return "TOP_RIGHT"
    elif is_bottom and is_left:
        return "BOTTOM_LEFT"
    elif is_bottom and is_right:
        return "BOTTOM_RIGHT"
    elif is_top:
        return "TOP_CENTER"
    elif is_bottom:
        return "BOTTOM_CENTER"
    else:
        return "CENTER"


def evaluate_placement(
    box_x: int,
    box_y: int,
    box_w: int,
    box_h: int,
    canvas_w: int,
    canvas_h: int,
    permitted_quadrants: List[str],
) -> Dict[str, Any]:
    """
    Evaluate detected logo position against permitted placement quadrants.
    """
    center_x = box_x + (box_w / 2.0)
    center_y = box_y + (box_h / 2.0)

    detected_quadrant = classify_quadrant(center_x, center_y, canvas_w, canvas_h)
    x_pct = round((center_x / float(canvas_w)) * 100.0, 1) if canvas_w > 0 else 0.0
    y_pct = round((center_y / float(canvas_h)) * 100.0, 1) if canvas_h > 0 else 0.0

    # Check if "ALL" or "*" is in permitted list
    norm_permitted = [p.upper() for p in permitted_quadrants]
    is_any = ("ALL" in norm_permitted) or ("*" in norm_permitted) or (len(norm_permitted) == 0)

    is_compliant = is_any or (detected_quadrant.upper() in norm_permitted)

    if not is_compliant:
        explanation = (
            f"Logo detected at '{detected_quadrant}' ({x_pct}%, {y_pct}%), but brand policy "
            f"restricts placement to {', '.join(permitted_quadrants)}."
        )
        status = "PLACEMENT_VIOLATION"
    else:
        explanation = (
            f"Logo placement at '{detected_quadrant}' ({x_pct}%, {y_pct}%) is authorized."
        )
        status = "COMPLIANT"

    return {
        "status": status,
        "is_compliant": is_compliant,
        "detected_quadrant": detected_quadrant,
        "permitted_quadrants": permitted_quadrants,
        "center_x_percent": x_pct,
        "center_y_percent": y_pct,
        "explanation": explanation,
    }
