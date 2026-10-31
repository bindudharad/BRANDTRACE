"""
Clearspace margin measurement and spatial exclusion zone violation analysis.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np


def evaluate_clearspace(
    canvas_gray: np.ndarray,
    box_x: int,
    box_y: int,
    box_w: int,
    box_h: int,
    required_clearspace_ratio: float = 0.5,
) -> Dict[str, Any]:
    """
    Evaluate surrounding clearspace margin around a detected logo bounding box.
    Required clearspace: M >= required_clearspace_ratio * logo_height (H).
    
    Checks:
    1. Distance to canvas edges (perimeter margins).
    2. Encroaching high-contrast text or graphic edges within the exclusion zone.
    """
    canvas_h, canvas_w = canvas_gray.shape[:2]
    required_margin_px = int(round(required_clearspace_ratio * box_h))

    # Standalone logo asset file upload has no surrounding layout canvas
    if box_w >= (canvas_w - 12) and box_h >= (canvas_h - 12):
        return {
            "status": "COMPLIANT",
            "is_compliant": True,
            "required_ratio": required_clearspace_ratio,
            "measured_ratio": 1.0,
            "required_margin_px": required_margin_px,
            "top_margin_px": box_y,
            "bottom_margin_px": canvas_h - (box_y + box_h),
            "left_margin_px": box_x,
            "right_margin_px": canvas_w - (box_x + box_w),
            "has_content_intrusion": False,
            "violating_edges": [],
            "exclusion_box": None,
            "explanation": "Standalone logo asset file upload; clearspace perimeter not applicable.",
        }

    # Canvas edge margins
    top_margin = box_y
    bottom_margin = canvas_h - (box_y + box_h)
    left_margin = box_x
    right_margin = canvas_w - (box_x + box_w)

    min_edge_margin = min(top_margin, bottom_margin, left_margin, right_margin)
    measured_edge_ratio = round(min_edge_margin / float(box_h), 3) if box_h > 0 else 0.0

    violating_edges = []
    if top_margin < required_margin_px:
        violating_edges.append(f"TOP (Margin: {top_margin}px, Required: {required_margin_px}px)")
    if bottom_margin < required_margin_px:
        violating_edges.append(f"BOTTOM (Margin: {bottom_margin}px, Required: {required_margin_px}px)")
    if left_margin < required_margin_px:
        violating_edges.append(f"LEFT (Margin: {left_margin}px, Required: {required_margin_px}px)")
    if right_margin < required_margin_px:
        violating_edges.append(f"RIGHT (Margin: {right_margin}px, Required: {required_margin_px}px)")

    # Check for encroaching objects/text in the clearspace exclusion zone
    # Zone bounding box:
    zone_x1 = max(0, box_x - required_margin_px)
    zone_y1 = max(0, box_y - required_margin_px)
    zone_x2 = min(canvas_w, box_x + box_w + required_margin_px)
    zone_y2 = min(canvas_h, box_y + box_h + required_margin_px)

    zone_crop = canvas_gray[zone_y1:zone_y2, zone_x1:zone_x2].copy()
    zh, zw = zone_crop.shape[:2]

    # Mask out the logo itself in the exclusion zone
    logo_rel_x1 = box_x - zone_x1
    logo_rel_y1 = box_y - zone_y1
    logo_rel_x2 = logo_rel_x1 + box_w
    logo_rel_y2 = logo_rel_y1 + box_h

    # Create mask of exclusion band (excluding logo interior)
    band_mask = np.ones((zh, zw), dtype=np.uint8) * 255
    cv2.rectangle(band_mask, (logo_rel_x1, logo_rel_y1), (logo_rel_x2, logo_rel_y2), 0, -1)

    # Edge detection on exclusion band to find encroaching text/graphics
    edges = cv2.Canny(zone_crop, 50, 150)
    band_edges = cv2.bitwise_and(edges, edges, mask=band_mask)
    edge_pixel_count = int(cv2.countNonZero(band_edges))

    # An encroaching line or text has significant edge pixels in exclusion zone
    band_area = int(cv2.countNonZero(band_mask))
    encroachment_ratio = (edge_pixel_count / float(band_area)) if band_area > 0 else 0.0

    has_intrusion = encroachment_ratio > 0.035 and edge_pixel_count > 30

    is_compliant = (len(violating_edges) == 0) and not has_intrusion

    if not is_compliant:
        reasons = []
        if violating_edges:
            reasons.append(f"Canvas edge infringement on {', '.join(violating_edges)}")
        if has_intrusion:
            reasons.append(f"Conflicting text or graphic objects detected inside exclusion zone ({edge_pixel_count} edge pixels)")
        explanation = (
            f"Clearspace violation: {'; '.join(reasons)}. "
            f"Policy mandates clear exclusion margin of M >= {required_clearspace_ratio:.2f}H ({required_margin_px}px)."
        )
        status = "CLEARSPACE_VIOLATION"
    else:
        explanation = (
            f"Clearspace perimeter is compliant. Exclusion zone maintains M >= {required_clearspace_ratio:.2f}H "
            f"({required_margin_px}px) free of conflicting graphics."
        )
        status = "COMPLIANT"

    return {
        "status": status,
        "is_compliant": is_compliant,
        "required_ratio": required_clearspace_ratio,
        "measured_ratio": measured_edge_ratio,
        "required_margin_px": required_margin_px,
        "top_margin_px": top_margin,
        "bottom_margin_px": bottom_margin,
        "left_margin_px": left_margin,
        "right_margin_px": right_margin,
        "has_content_intrusion": has_intrusion,
        "violating_edges": violating_edges,
        "exclusion_box": {
            "x": zone_x1,
            "y": zone_y1,
            "width": zone_x2 - zone_x1,
            "height": zone_y2 - zone_y1,
        },
        "explanation": explanation,
    }
