"""
Logo display size, PDF page-space physical dimension, and resolution compliance evaluation.
"""
from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

import cv2
import numpy as np


def evaluate_digital_size(
    width_px: int,
    height_px: int,
    min_width_px: int = 80,
    min_height_px: int = 24,
    max_width_px: Optional[int] = None,
    max_height_px: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Evaluate raster digital display dimensions against configured minimum and maximum limits.
    """
    if width_px < min_width_px or height_px < min_height_px:
        explanation = (
            f"Logo display size ({width_px}x{height_px} px) is smaller than configured minimum "
            f"({min_width_px}x{min_height_px} px)."
        )
        return {
            "status": "LOGO_TOO_SMALL",
            "is_compliant": False,
            "width_px": width_px,
            "height_px": height_px,
            "min_width_px": min_width_px,
            "min_height_px": min_height_px,
            "max_width_px": max_width_px,
            "max_height_px": max_height_px,
            "explanation": explanation,
        }

    if max_width_px and width_px > max_width_px:
        explanation = (
            f"Logo display width ({width_px} px) exceeds configured maximum ({max_width_px} px)."
        )
        return {
            "status": "LOGO_TOO_LARGE",
            "is_compliant": False,
            "width_px": width_px,
            "height_px": height_px,
            "min_width_px": min_width_px,
            "min_height_px": min_height_px,
            "max_width_px": max_width_px,
            "max_height_px": max_height_px,
            "explanation": explanation,
        }

    if max_height_px and height_px > max_height_px:
        explanation = (
            f"Logo display height ({height_px} px) exceeds configured maximum ({max_height_px} px)."
        )
        return {
            "status": "LOGO_TOO_LARGE",
            "is_compliant": False,
            "width_px": width_px,
            "height_px": height_px,
            "min_width_px": min_width_px,
            "min_height_px": min_height_px,
            "max_width_px": max_width_px,
            "max_height_px": max_height_px,
            "explanation": explanation,
        }

    return {
        "status": "COMPLIANT",
        "is_compliant": True,
        "width_px": width_px,
        "height_px": height_px,
        "min_width_px": min_width_px,
        "min_height_px": min_height_px,
        "max_width_px": max_width_px,
        "max_height_px": max_height_px,
        "explanation": f"Logo display dimensions ({width_px}x{height_px} px) meet configured size standards.",
    }


def evaluate_pdf_page_size(
    width_px: int,
    height_px: int,
    rendered_page_w_px: int,
    rendered_page_h_px: int,
    pdf_page_w_pt: float,
    pdf_page_h_pt: float,
    min_width_pt: float = 50.0,
    min_width_mm: float = 17.6,
) -> Dict[str, Any]:
    """
    Measure displayed logo dimensions in true PDF page-space coordinates (points and mm).
    Points (pt): 72 points per inch.
    Millimetres (mm): pt * (25.4 / 72.0).
    """
    if rendered_page_w_px <= 0 or rendered_page_h_px <= 0:
        return {
            "status": "ANALYSIS_FAILED",
            "is_compliant": False,
            "explanation": "Invalid rendered PDF page dimensions.",
        }

    # Calculate page-space dimensions in points
    width_pt = round((width_px / float(rendered_page_w_px)) * pdf_page_w_pt, 2)
    height_pt = round((height_px / float(rendered_page_h_px)) * pdf_page_h_pt, 2)

    # Convert to millimetres
    width_mm = round(width_pt * (25.4 / 72.0), 2)
    height_mm = round(height_pt * (25.4 / 72.0), 2)

    # Relative to page width
    relative_page_w_pct = round((width_pt / pdf_page_w_pt) * 100.0, 1)

    is_compliant = width_pt >= min_width_pt

    if not is_compliant:
        explanation = (
            f"Logo displayed in PDF at {width_pt} pt ({width_mm} mm, {relative_page_w_pct}% page width), "
            f"which is below required minimum of {min_width_pt} pt ({min_width_mm} mm)."
        )
        status = "LOGO_TOO_SMALL"
    else:
        explanation = (
            f"Logo displayed in PDF at {width_pt} pt ({width_mm} mm, {relative_page_w_pct}% page width) "
            f"satisfies minimum requirement ({min_width_pt} pt / {min_width_mm} mm)."
        )
        status = "COMPLIANT"

    return {
        "status": status,
        "is_compliant": is_compliant,
        "width_pt": width_pt,
        "height_pt": height_pt,
        "width_mm": width_mm,
        "height_mm": height_mm,
        "page_width_pt": pdf_page_w_pt,
        "page_height_pt": pdf_page_h_pt,
        "min_width_pt": min_width_pt,
        "min_width_mm": min_width_mm,
        "relative_page_width_percent": relative_page_w_pct,
        "explanation": explanation,
    }


def evaluate_resolution_quality(
    cropped_logo_bgr: np.ndarray,
    min_laplacian_variance: float = 60.0,
) -> Dict[str, Any]:
    """
    Evaluate sharpness and pixel density to detect blurry or low-resolution logo artifacts.
    Uses OpenCV Laplacian variance.
    """
    if cropped_logo_bgr is None or cropped_logo_bgr.size == 0:
        return {"status": "ANALYSIS_FAILED", "is_compliant": False}

    gray = cv2.cvtColor(cropped_logo_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape[:2]

    # If the cropped logo itself is tiny (e.g. < 30px), pixelation is severe
    if w < 30 or h < 15:
        return {
            "status": "LOW_RESOLUTION_LOGO",
            "is_compliant": False,
            "sharpness_score": 10.0,
            "explanation": f"Detected logo resolution ({w}x{h} px) is severely degraded and pixelated.",
        }

    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    is_sharp = variance >= min_laplacian_variance

    return {
        "status": "COMPLIANT" if is_sharp else "LOW_RESOLUTION_LOGO",
        "is_compliant": is_sharp,
        "sharpness_score": round(variance, 1),
        "threshold": min_laplacian_variance,
        "explanation": (
            f"Logo sharpness score ({variance:.1f}) meets minimum quality standard ({min_laplacian_variance:.1f})."
            if is_sharp else
            f"Logo appears blurred or low-resolution (Sharpness score {variance:.1f} below threshold {min_laplacian_variance:.1f})."
        ),
    }
