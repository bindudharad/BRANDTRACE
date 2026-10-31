"""
Candidate detection, contour region proposal, and Non-Maximum Suppression (NMS) for logos.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

from .logo_matching import match_template_multiscale


def apply_nms(boxes: List[Tuple[int, int, int, int, float]], iou_threshold: float = 0.35) -> List[Tuple[int, int, int, int, float]]:
    """Non-Maximum Suppression (NMS) to prune overlapping candidate bounding boxes."""
    if not boxes:
        return []

    # Sort boxes by score descending
    boxes_sorted = sorted(boxes, key=lambda b: b[4], reverse=True)
    kept = []

    while boxes_sorted:
        current = boxes_sorted.pop(0)
        kept.append(current)

        x1, y1, w1, h1, _ = current
        area1 = w1 * h1

        remaining = []
        for b in boxes_sorted:
            x2, y2, w2, h2, _ = b
            area2 = w2 * h2

            # Compute intersection
            inter_x1 = max(x1, x2)
            inter_y1 = max(y1, y2)
            inter_x2 = min(x1 + w1, x2 + w2)
            inter_y2 = min(y1 + h1, y2 + h2)

            inter_w = max(0, inter_x2 - inter_x1)
            inter_h = max(0, inter_y2 - inter_y1)
            inter_area = inter_w * inter_h

            union_area = area1 + area2 - inter_area
            iou = inter_area / float(union_area) if union_area > 0 else 0.0

            if iou < iou_threshold:
                remaining.append(b)

        boxes_sorted = remaining

    return kept


def find_contour_candidate_regions(
    canvas_gray: np.ndarray,
    min_area_pct: float = 0.001,
    max_area_pct: float = 0.40,
) -> List[Tuple[int, int, int, int]]:
    """
    Find bounded visual mark regions via morphological gradient and contour filtering.
    Enables detecting modified, distorted, or wrong logos even if template matching fails.
    """
    c_h, c_w = canvas_gray.shape[:2]
    canvas_area = c_h * c_w
    min_area = int(canvas_area * min_area_pct)
    max_area = int(canvas_area * max_area_pct)

    # Morphological gradient to detect solid graphics and text clusters
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    grad = cv2.morphologyEx(canvas_gray, cv2.MORPH_GRADIENT, kernel)
    _, thresh = cv2.threshold(grad, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

    # Close gaps dynamically scaled to canvas resolution
    k_w = max(55, int(c_w * 0.065))
    k_h = max(15, int(c_h * 0.02))
    close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_w, k_h))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, close_kernel)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidate_boxes = []

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        area = w * h
        if min_area <= area <= max_area and w >= 20 and h >= 12:
            aspect = w / float(h)
            # Logos typically have aspect ratios between 0.3 (tall badge) and 8.0 (wide wordmark)
            if 0.3 <= aspect <= 8.0:
                candidate_boxes.append((x, y, w, h))

    return candidate_boxes


def detect_all_logo_candidates(
    canvas_bgr: np.ndarray,
    reference_templates: List[Dict[str, Any]],
    match_threshold: float = 0.45,
) -> List[Dict[str, Any]]:
    """
    Detect all potential logo candidate regions on a canvas.
    Combines template matching against reference library with contour saliency.
    
    Args:
        canvas_bgr: Target image matrix.
        reference_templates: List of dicts with 'id', 'variant', 'gray_image', 'aspect_ratio', 'standards'.
    """
    c_h, c_w = canvas_bgr.shape[:2]
    canvas_gray = cv2.cvtColor(canvas_bgr, cv2.COLOR_BGR2GRAY)

    all_proposals: List[Tuple[int, int, int, int, float, Optional[str], Optional[str]]] = []

    # 1. Multi-scale template matching across all approved reference templates
    template_proposals: List[Tuple[int, int, int, int, float, str, str]] = []
    for ref in reference_templates:
        ref_id = ref["id"]
        ref_variant = ref.get("variant", "primary")
        ref_gray = ref["gray_image"]

        score, box, scale = match_template_multiscale(
            canvas_gray,
            ref_gray,
            min_scale=0.20,
            max_scale=3.50,
            num_scales=34,
        )

        if box and score >= match_threshold:
            x, y, w, h = box
            template_proposals.append((x, y, w, h, score, ref_id, ref_variant))

    # 2. Contour-based candidates (for altered/wrong logos and distorted logos)
    contour_boxes = find_contour_candidate_regions(canvas_gray)

    # Check if any template proposal is enclosed by a larger contour (e.g. horizontally stretched logo)
    adjusted_template_proposals = []
    used_contours = set()

    for tx, ty, tw, th, score, ref_id, ref_variant in template_proposals:
        matched_contour = None
        for i, (cx, cy, cw, ch) in enumerate(contour_boxes):
            # Compute intersection
            ix1 = max(tx, cx)
            iy1 = max(ty, cy)
            ix2 = min(tx + tw, cx + cw)
            iy2 = min(ty + th, cy + ch)
            iw = max(0, ix2 - ix1)
            ih = max(0, iy2 - iy1)
            inter_area = iw * ih
            c_area = cw * ch
            t_area = tw * th

            # If template match overlaps significantly with contour
            if (inter_area > 0.35 * t_area) or (inter_area > 0.50 * c_area):
                # If contour is noticeably larger or aspect ratio deviates heavily (distortion)
                contour_aspect = cw / float(ch) if ch > 0 else 1.0
                template_aspect = tw / float(th) if th > 0 else 1.0
                aspect_dev = abs(contour_aspect - template_aspect) / max(0.1, template_aspect)
                if (cw * ch) > (tw * th * 1.15) or aspect_dev > 0.18:
                    matched_contour = (cx, cy, cw, ch)
                    used_contours.add(i)
                    break

        if matched_contour:
            mcx, mcy, mcw, mch = matched_contour
            adjusted_template_proposals.append((mcx, mcy, mcw, mch, score, ref_id, ref_variant))
        else:
            adjusted_template_proposals.append((tx, ty, tw, th, score, ref_id, ref_variant))

    for p in adjusted_template_proposals:
        all_proposals.append(p)

    # Add unused contour candidates (hierarchical part suppression for letters/details)
    for i, (cx, cy, cw, ch) in enumerate(contour_boxes):
        if i in used_contours:
            continue
        c_center_x = cx + cw / 2.0
        c_center_y = cy + ch / 2.0

        is_subpart = False
        for tx, ty, tw, th, _, _, _ in adjusted_template_proposals:
            if tx <= c_center_x <= (tx + tw) and ty <= c_center_y <= (ty + th):
                if (cw * ch) < (tw * th * 0.75):
                    is_subpart = True
                    break

        if not is_subpart:
            all_proposals.append((cx, cy, cw, ch, 0.50, None, None))

    # Convert to format for NMS
    nms_input = [(p[0], p[1], p[2], p[3], p[4]) for p in all_proposals]
    kept_boxes = apply_nms(nms_input, iou_threshold=0.35)

    # Build final candidate list
    final_candidates = []
    for kx, ky, kw, kh, kscore in kept_boxes:
        # Match back to reference info if available
        matched_ref_id = None
        matched_variant = None
        for p in all_proposals:
            if abs(p[0] - kx) < 5 and abs(p[1] - ky) < 5 and abs(p[2] - kw) < 5 and abs(p[3] - kh) < 5:
                if p[5] is not None:
                    matched_ref_id = p[5]
                    matched_variant = p[6]
                    break

        cropped_bgr = canvas_bgr[ky : ky + kh, kx : kx + kw].copy()
        cropped_gray = canvas_gray[ky : ky + kh, kx : kx + kw].copy()

        final_candidates.append({
            "box": {
                "x": kx,
                "y": ky,
                "width": kw,
                "height": kh,
                "canvas_width": c_w,
                "canvas_height": c_h,
            },
            "cropped_bgr": cropped_bgr,
            "cropped_gray": cropped_gray,
            "detected_aspect_ratio": round(kw / float(kh), 4) if kh > 0 else 1.0,
            "preliminary_score": kscore,
            "preliminary_ref_id": matched_ref_id,
            "preliminary_variant": matched_variant,
        })

    return final_candidates
