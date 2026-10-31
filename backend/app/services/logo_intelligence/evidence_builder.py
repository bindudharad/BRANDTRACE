"""
Visual evidence builder: side-by-side comparisons, difference heatmaps, and bounding box overlays.
"""
from __future__ import annotations

import base64
import io
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image


def mat_to_base64_jpeg(image_bgr: np.ndarray, quality: int = 80) -> str:
    """Encode OpenCV BGR matrix into Base64 JPEG data URL."""
    success, buffer = cv2.imencode(".jpg", image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not success:
        return ""
    b64_str = base64.b64encode(buffer).decode("ascii")
    return f"data:image/jpeg;base64,{b64_str}"


def create_annotated_overlay(
    canvas_bgr: np.ndarray,
    candidate_box: Dict[str, int],
    exclusion_box: Optional[Dict[str, int]],
    verdict: str,
    status_color: Tuple[int, int, int] = (0, 255, 0),  # Green BGR
    title_text: str = "",
) -> str:
    """
    Generate an annotated evidence crop around the logo candidate.
    Draws candidate bounding box, clearspace exclusion border, and status tags.
    """
    canvas_h, canvas_w = canvas_bgr.shape[:2]
    x, y, w, h = candidate_box["x"], candidate_box["y"], candidate_box["width"], candidate_box["height"]

    # Compute a contextual crop area (2x size of logo)
    pad_x = int(w * 0.6)
    pad_y = int(h * 0.6)
    crop_x1 = max(0, x - pad_x)
    crop_y1 = max(0, y - pad_y)
    crop_x2 = min(canvas_w, x + w + pad_x)
    crop_y2 = min(canvas_h, y + h + pad_y)

    crop = canvas_bgr[crop_y1:crop_y2, crop_x1:crop_x2].copy()

    # Relative coordinates inside crop
    rel_x = x - crop_x1
    rel_y = y - crop_y1

    # Draw exclusion zone if provided
    if exclusion_box:
        ex_x1 = max(0, exclusion_box["x"] - crop_x1)
        ex_y1 = max(0, exclusion_box["y"] - crop_y1)
        ex_x2 = min(crop.shape[1], exclusion_box["x"] + exclusion_box["width"] - crop_x1)
        ex_y2 = min(crop.shape[0], exclusion_box["y"] + exclusion_box["height"] - crop_y1)
        cv2.rectangle(crop, (ex_x1, ex_y1), (ex_x2, ex_y2), (0, 165, 255), 1)  # Amber dashed/thin

    # Pick color based on verdict
    is_violation = verdict not in ("APPROVED_MATCH", "COMPLIANT")
    box_color = (40, 40, 235) if is_violation else (40, 210, 80)  # Red vs Emerald BGR

    # Draw logo bounding box
    cv2.rectangle(crop, (rel_x, rel_y), (rel_x + w, rel_y + h), box_color, 2)

    # Label text
    label = title_text or verdict
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.45
    cv2.putText(crop, label, (rel_x, max(14, rel_y - 6)), font, font_scale, box_color, 1, cv2.LINE_AA)

    # Dimension tag
    dim_text = f"{w}x{h}px"
    cv2.putText(crop, dim_text, (rel_x, min(crop.shape[0] - 4, rel_y + h + 14)), font, 0.40, (200, 200, 200), 1, cv2.LINE_AA)

    return mat_to_base64_jpeg(crop, quality=85)


def create_side_by_side_comparison(
    reference_bgr: np.ndarray,
    detected_bgr: np.ndarray,
    verdict: str,
) -> str:
    """
    Generate side-by-side composite:
    [ Approved Reference ]  vs  [ Detected Logo ]
             [ Visual Difference Map ]
    """
    target_h = 120
    # Resize reference
    ref_h, ref_w = reference_bgr.shape[:2]
    scale_ref = target_h / float(ref_h) if ref_h > 0 else 1.0
    ref_resized_w = int(round(ref_w * scale_ref))
    ref_resized = cv2.resize(reference_bgr, (ref_resized_w, target_h), interpolation=cv2.INTER_AREA)

    # Resize detected
    det_h, det_w = detected_bgr.shape[:2]
    scale_det = target_h / float(det_h) if det_h > 0 else 1.0
    det_resized_w = int(round(det_w * scale_det))
    det_resized = cv2.resize(detected_bgr, (det_resized_w, target_h), interpolation=cv2.INTER_AREA)

    # Standardize column width
    col_w = max(ref_resized_w, det_resized_w, 140)

    # Pad images horizontally to match col_w
    def pad_col(img: np.ndarray, width: int) -> np.ndarray:
        ih, iw = img.shape[:2]
        pad = width - iw
        if pad <= 0:
            return img
        pad_l = pad // 2
        pad_r = pad - pad_l
        return cv2.copyMakeBorder(img, 0, 0, pad_l, pad_r, cv2.BORDER_CONSTANT, value=(20, 25, 35))

    col1 = pad_col(ref_resized, col_w)
    col2 = pad_col(det_resized, col_w)

    # Horizontal concat with border
    divider = np.ones((target_h, 3, 3), dtype=np.uint8) * 60
    top_row = np.hstack([col1, divider, col2])

    # Compute difference map
    # Resize both to exact same size for difference
    ref_gray = cv2.cvtColor(ref_resized, cv2.COLOR_BGR2GRAY)
    det_norm = cv2.resize(cv2.cvtColor(det_resized, cv2.COLOR_BGR2GRAY), (ref_resized_w, target_h))
    diff = cv2.absdiff(ref_gray, det_norm)
    heatmap = cv2.applyColorMap(diff, cv2.COLORMAP_JET)
    heatmap_padded = pad_col(heatmap, col_w * 2 + 3)

    # Header and footer text banner
    banner_h = 24
    banner_w = top_row.shape[1]
    banner = np.zeros((banner_h, banner_w, 3), dtype=np.uint8)
    banner[:] = (15, 20, 30)

    cv2.putText(banner, "APPROVED REFERENCE", (10, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 180, 180), 1, cv2.LINE_AA)
    cv2.putText(banner, "DETECTED LOGO", (col_w + 12, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 180, 180), 1, cv2.LINE_AA)

    composite = np.vstack([banner, top_row, heatmap_padded])
    return mat_to_base64_jpeg(composite, quality=85)
