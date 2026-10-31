"""
Multi-page PDF logo extraction, vector rendering, and page-space dimensional analysis.
"""
from __future__ import annotations

import io
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

try:
    import pypdfium2 as pdfium
    HAS_PDFIUM = True
except ImportError:
    HAS_PDFIUM = False

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False


class PDFProcessingError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def get_pdf_page_dimensions(pdf_bytes: bytes) -> List[Dict[str, float]]:
    """
    Extract native MediaBox/CropBox dimensions in PDF points (1/72 inch) for each page.
    """
    if not HAS_PYPDF:
        raise PDFProcessingError("pypdf is required for PDF dimension inspection.")

    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        dimensions = []
        for idx, page in enumerate(reader.pages):
            box = page.mediabox
            w_pt = float(box.width)
            h_pt = float(box.height)
            dimensions.append({
                "page_number": idx + 1,
                "width_pt": round(w_pt, 2),
                "height_pt": round(h_pt, 2),
                "width_mm": round(w_pt * (25.4 / 72.0), 2),
                "height_mm": round(h_pt * (25.4 / 72.0), 2),
            })
        return dimensions
    except Exception as exc:
        raise PDFProcessingError(f"Failed to inspect PDF page dimensions: {exc}")


def render_pdf_pages_to_matrices(
    pdf_bytes: bytes,
    dpi_scale: float = 2.0,  # ~144-150 DPI
    max_pages: int = 10,
) -> List[Dict[str, Any]]:
    """
    Render PDF pages to OpenCV BGR matrices for visual candidate detection.
    Preserves true page dimensions in points for spatial calculation.
    """
    if not HAS_PDFIUM:
        raise PDFProcessingError("pypdfium2 engine is required for PDF page rendering.")

    if not pdf_bytes or len(pdf_bytes) < 10:
        raise PDFProcessingError("PDF document is empty.")

    try:
        doc = pdfium.PdfDocument(pdf_bytes)
    except Exception as exc:
        raise PDFProcessingError(f"Could not parse PDF document: {exc}")

    total_pages = len(doc)
    if total_pages == 0:
        raise PDFProcessingError("PDF contains zero pages.")

    # Get page dimension info from pypdf
    dim_info = []
    try:
        dim_info = get_pdf_page_dimensions(pdf_bytes)
    except Exception:
        pass

    pages_to_render = min(total_pages, max_pages)
    rendered_pages = []

    for idx in range(pages_to_render):
        page_num = idx + 1
        page = doc[idx]
        pil_img = page.render(scale=dpi_scale).to_pil()

        # Convert to BGR for OpenCV
        rgb_np = np.array(pil_img.convert("RGB"))
        bgr_np = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2BGR)

        # Dimension metadata
        w_pt = dim_info[idx]["width_pt"] if idx < len(dim_info) else float(pil_img.size[0] / dpi_scale)
        h_pt = dim_info[idx]["height_pt"] if idx < len(dim_info) else float(pil_img.size[1] / dpi_scale)

        rendered_pages.append({
            "page_number": page_num,
            "bgr_image": bgr_np,
            "render_width_px": pil_img.size[0],
            "render_height_px": pil_img.size[1],
            "page_width_pt": w_pt,
            "page_height_pt": h_pt,
            "page_width_mm": round(w_pt * (25.4 / 72.0), 2),
            "page_height_mm": round(h_pt * (25.4 / 72.0), 2),
        })

    return rendered_pages
