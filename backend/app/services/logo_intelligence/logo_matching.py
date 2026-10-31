"""
Multi-method reference logo matching and style modification detection engine.
"""
from __future__ import annotations

import io
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

from app.services.visual_intelligence import (
    compute_difference_hash,
    hamming_distance,
    perceptual_similarity_score,
)


def match_template_multiscale(
    canvas_gray: np.ndarray,
    template_gray: np.ndarray,
    min_scale: float = 0.20,
    max_scale: float = 3.50,
    num_scales: int = 34,
) -> Tuple[float, Optional[Tuple[int, int, int, int]], float]:
    """
    Search for template inside canvas using multi-scale normalized cross-correlation.
    Returns:
        (best_correlation_score, (x, y, w, h), best_scale_factor)
    """
    c_h, c_w = canvas_gray.shape[:2]
    t_h, t_w = template_gray.shape[:2]

    if t_h == 0 or t_w == 0 or c_h == 0 or c_w == 0:
        return 0.0, None, 1.0

    best_score = -1.0
    best_box = None
    best_scale = 1.0

    scales = np.linspace(min_scale, max_scale, num_scales)
    for s in scales:
        resized_w = int(round(t_w * s))
        resized_h = int(round(t_h * s))

        if resized_w >= c_w or resized_h >= c_h or resized_w < 12 or resized_h < 12:
            continue

        resized_template = cv2.resize(template_gray, (resized_w, resized_h), interpolation=cv2.INTER_AREA)
        res = cv2.matchTemplate(canvas_gray, resized_template, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(res)

        if max_val > best_score:
            best_score = float(max_val)
            best_box = (max_loc[0], max_loc[1], resized_w, resized_h)
            best_scale = float(s)

    return max(0.0, best_score), best_box, best_scale


def compute_structural_difference(
    candidate_gray: np.ndarray,
    reference_gray: np.ndarray,
) -> float:
    """
    Compare normalized candidate and reference to compute structural difference over foreground.
    Returns delta score (0.0 = identical, 1.0 = completely different).
    """
    t_h, t_w = reference_gray.shape[:2]
    if t_h == 0 or t_w == 0 or candidate_gray.shape[0] == 0 or candidate_gray.shape[1] == 0:
        return 1.0

    cand_resized = cv2.resize(candidate_gray, (t_w, t_h), interpolation=cv2.INTER_AREA)

    # Pixel absolute difference
    diff = cv2.absdiff(cand_resized, reference_gray)

    # Focus structural difference on foreground pixels (excluding common white canvas)
    fg_mask = (cand_resized < 250) | (reference_gray < 250)
    if np.sum(fg_mask) > 20:
        mean_diff = float(np.mean(diff[fg_mask])) / 255.0
    else:
        mean_diff = float(np.mean(diff)) / 255.0

    return round(mean_diff, 3)


def match_candidate_against_reference(
    candidate_gray: np.ndarray,
    reference_gray: np.ndarray,
    reference_id: str,
    reference_variant: str,
    reference_aspect_ratio: float,
    exact_hash_match: bool = False,
) -> Dict[str, Any]:
    """
    Layered multi-method evaluation of candidate against an approved reference.
    """
    if exact_hash_match:
        return {
            "status": "APPROVED_MATCH",
            "matched_reference_id": reference_id,
            "matched_variant": reference_variant,
            "similarity_score": 100.0,
            "confidence_band": "HIGH_CONFIDENCE_MATCH",
            "method": "EXACT_SHA256_MATCH",
            "structural_diff": 0.0,
            "explanation": "Exact cryptographic SHA-256 match with approved reference asset.",
        }

    c_h, c_w = candidate_gray.shape[:2]
    cand_aspect = round(c_w / float(c_h), 4) if c_h > 0 else 1.0

    # Resize candidate to match reference dimensions for direct structural comparison
    struct_diff = compute_structural_difference(candidate_gray, reference_gray)

    # Pillow difference hash comparison
    cand_pil = Image.fromarray(candidate_gray)
    ref_pil = Image.fromarray(reference_gray)
    cand_dhash = compute_difference_hash(cand_pil)
    ref_dhash = compute_difference_hash(ref_pil)
    dhash_sim = perceptual_similarity_score(cand_dhash, ref_dhash)

    # Template correlation of candidate against reference
    corr = 0.0
    try:
        t_h, t_w = reference_gray.shape[:2]
        cand_res = cv2.resize(candidate_gray, (t_w, t_h), interpolation=cv2.INTER_AREA)
        res = cv2.matchTemplate(cand_res, reference_gray, cv2.TM_CCOEFF_NORMED)
        corr = float(cv2.minMaxLoc(res)[1])
    except Exception:
        corr = (1.0 - struct_diff)

    corr_norm = max(0.0, min(1.0, corr))
    combined_score = round(((corr_norm * 0.65) + ((dhash_sim / 100.0) * 0.35)) * 100.0, 1)

    # Confidence bands
    if combined_score >= 82.0:
        band = "HIGH_CONFIDENCE_MATCH"
    elif combined_score >= 65.0:
        band = "PROBABLE_MATCH"
    elif combined_score >= 45.0:
        band = "AMBIGUOUS"
    else:
        band = "HIGH_CONFIDENCE_MISMATCH"

    # Verdict assignment
    if struct_diff > 0.15 and combined_score >= 50.0:
        status = "STYLE_MISMATCH"
        explanation = (
            f"Style modification detected: visual symbol/wordmark features deviate from approved reference "
            f"(Structural Delta: {struct_diff:.2f}, Match Score: {combined_score:.1f}%)."
        )
    elif combined_score >= 80.0:
        status = "APPROVED_MATCH"
        explanation = f"High-confidence match ({combined_score:.1f}%) with approved reference '{reference_id}' ({reference_variant})."
    elif combined_score >= 55.0:
        status = "NEEDS_REVIEW"
        explanation = (
            f"Ambiguous match ({combined_score:.1f}%): candidate resembles approved reference but requires human verification."
        )
    else:
        status = "UNRECOGNISED_LOGO"
        explanation = f"Candidate does not match approved reference library (Score: {combined_score:.1f}%)."

    return {
        "status": status,
        "matched_reference_id": reference_id,
        "matched_variant": reference_variant,
        "similarity_score": combined_score,
        "confidence_band": band,
        "method": "LAYERED_CV_CORRELATION_AND_DHASH",
        "structural_diff": struct_diff,
        "dhash_similarity": dhash_sim,
        "correlation_score": round(corr_norm, 3),
        "explanation": explanation,
    }
