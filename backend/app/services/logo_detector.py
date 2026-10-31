"""
Logo Placement and Visual Asset Detection Engine for BRANDTRACE.
Uses OpenCV multi-scale normalized cross-correlation template matching,
aspect-ratio validation, bounding-box coordinate tracking, and clearspace measurement.
"""
from __future__ import annotations

import io
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image


def load_image_as_cv(image_bytes: bytes) -> np.ndarray:
    """Load image bytes into OpenCV BGR numpy array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image bytes into valid OpenCV matrix.")
    return img


def detect_logo_placement(
    canvas_bytes: bytes,
    template_logo_bytes: bytes,
    expected_location: Optional[str] = None,
    min_scale_pct: float = 4.0,
    max_scale_pct: float = 40.0,
    required_clearspace_ratio: float = 0.5,
    match_threshold: float = 0.60
) -> Dict[str, Any]:
    """
    Detect reference logo inside an uploaded creative asset canvas.
    Measures bounding box coordinates, relative location quadrant, canvas scale,
    and clearspace exclusion margins (M >= 0.5H).
    """
    canvas_img = load_image_as_cv(canvas_bytes)
    logo_img = load_image_as_cv(template_logo_bytes)

    c_h, c_w = canvas_img.shape[:2]
    l_h, l_w = logo_img.shape[:2]

    if c_h == 0 or c_w == 0 or l_h == 0 or l_w == 0:
        raise ValueError("Canvas or template logo has zero dimension.")

    canvas_gray = cv2.cvtColor(canvas_img, cv2.COLOR_BGR2GRAY)
    logo_gray = cv2.cvtColor(logo_img, cv2.COLOR_BGR2GRAY)

    best_score = -1.0
    best_box = None
    best_scale = 1.0

    # Multi-scale pyramid search across scales (0.25x to 1.75x)
    scales = np.linspace(0.25, 1.75, 20)
    for s in scales:
        resized_w = int(l_w * s)
        resized_h = int(l_h * s)

        # Skip if scaled logo is larger than canvas
        if resized_w >= c_w or resized_h >= c_h or resized_w < 10 or resized_h < 10:
            continue

        resized_logo = cv2.resize(logo_gray, (resized_w, resized_h), interpolation=cv2.INTER_AREA)
        res = cv2.matchTemplate(canvas_gray, resized_logo, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(res)

        if max_val > best_score:
            best_score = float(max_val)
            best_box = (max_loc[0], max_loc[1], resized_w, resized_h)
            best_scale = float(s)

    matched = best_score >= match_threshold

    if not matched or not best_box:
        return {
            "matched": False,
            "match_confidence": round(max(0.0, best_score), 3),
            "match_threshold": match_threshold,
            "bounding_box": None,
            "relative_position": None,
            "scale_percent": 0.0,
            "clearspace_margin_ratio": 0.0,
            "clearspace_compliant": False,
            "placement_compliant": False,
            "findings": [
                {
                    "severity": "HIGH",
                    "category": "visual_identity",
                    "type": "missing_approved_logo",
                    "explanation": f"Approved reference logo not detected in creative canvas (Confidence: {max(0.0, best_score):.1%}, Threshold: {match_threshold:.1%}).",
                }
            ],
        }

    x, y, w, h = best_box
    center_x = x + (w / 2)
    center_y = y + (h / 2)

    # Relative coordinates in percentage of canvas
    x_pct = round((center_x / c_w) * 100, 1)
    y_pct = round((center_y / c_y_pct if (c_y_pct := c_h) else 1) * 100, 1) if c_h else 0
    scale_w_pct = round((w / c_w) * 100, 1)

    # Determine quadrant
    is_left = center_x < (c_w * 0.40)
    is_right = center_x > (c_w * 0.60)
    is_top = center_y < (c_h * 0.40)
    is_bottom = center_y > (c_h * 0.60)

    if is_top and is_left:
        location_name = "TOP_LEFT"
    elif is_top and is_right:
        location_name = "TOP_RIGHT"
    elif is_bottom and is_left:
        location_name = "BOTTOM_LEFT"
    elif is_bottom and is_right:
        location_name = "BOTTOM_RIGHT"
    elif is_top:
        location_name = "TOP_CENTER"
    elif is_bottom:
        location_name = "BOTTOM_CENTER"
    else:
        location_name = "CENTER"

    # Clearspace calculation: M = min(top_margin, bottom_margin, left_margin, right_margin)
    top_margin = y
    bottom_margin = c_h - (y + h)
    left_margin = x
    right_margin = c_w - (x + w)

    min_margin = min(top_margin, bottom_margin, left_margin, right_margin)
    clearspace_ratio = round(min_margin / h, 2) if h > 0 else 0.0
    clearspace_ok = clearspace_ratio >= required_clearspace_ratio

    # Placement policy check
    placement_ok = True
    placement_findings = []

    if expected_location and location_name.upper() != expected_location.upper():
        placement_ok = False
        placement_findings.append({
            "severity": "MEDIUM",
            "category": "visual_identity",
            "type": "incorrect_logo_placement",
            "explanation": f"Logo detected at '{location_name}' ({x_pct}%, {y_pct}%), but brand policy requires '{expected_location.upper()}'.",
        })

    if scale_w_pct < min_scale_pct:
        placement_ok = False
        placement_findings.append({
            "severity": "LOW",
            "category": "visual_identity",
            "type": "logo_scale_too_small",
            "explanation": f"Logo width occupies {scale_w_pct}% of canvas width (Minimum required: {min_scale_pct}%).",
        })
    elif scale_w_pct > max_scale_pct:
        placement_ok = False
        placement_findings.append({
            "severity": "MEDIUM",
            "category": "visual_identity",
            "type": "logo_scale_too_large",
            "explanation": f"Logo width occupies {scale_w_pct}% of canvas width (Maximum allowed: {max_scale_pct}%).",
        })

    if not clearspace_ok:
        placement_findings.append({
            "severity": "HIGH",
            "category": "visual_identity",
            "type": "insufficient_logo_clearspace",
            "explanation": f"Detected logo clearspace margin is {clearspace_ratio:.2f}H (Policy requires M >= {required_clearspace_ratio:.2f}H). Surrounding perimeter infringes exclusion zone.",
        })

    return {
        "matched": True,
        "match_confidence": round(best_score, 3),
        "match_threshold": match_threshold,
        "bounding_box": {
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "canvas_width": c_w,
            "canvas_height": c_h,
        },
        "relative_position": {
            "center_x_percent": x_pct,
            "center_y_percent": y_pct,
            "detected_location": location_name,
            "expected_location": expected_location or "ANY",
        },
        "scale_percent": scale_w_pct,
        "clearspace_margin_ratio": clearspace_ratio,
        "required_clearspace_ratio": required_clearspace_ratio,
        "clearspace_compliant": clearspace_ok,
        "placement_compliant": placement_ok and clearspace_ok,
        "findings": placement_findings,
    }
