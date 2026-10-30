"""
High-Performance, Safe PDF Page Renderer for BRANDTRACE using pypdfium2.

Renders selected PDF pages to optimized JPEG images for Groq Vision OCR ingestion.
Enforces:
- Maximum page limits (GROQ_MAX_PDF_PAGES).
- Maximum pixel dimension scaling to prevent payload bloat.
- Clean memory reclamation.
"""
from __future__ import annotations

import io
import logging
from typing import Any, Dict, List, Optional

from app.config import GROQ_MAX_PDF_PAGES

logger = logging.getLogger("brandtrace.pdf_renderer")


class PDFRenderingError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def render_pdf_pages_to_images(
    pdf_bytes: bytes,
    max_pages: Optional[int] = None,
    dpi_scale: float = 2.0,  # ~144-150 DPI for crisp OCR
    max_dimension: int = 1600,
    jpeg_quality: int = 85,
) -> List[Dict[str, Any]]:
    """
    Render PDF pages to JPEG byte buffers.

    Returns:
        List of dicts:
        {
            "page_number": int (1-indexed),
            "jpeg_bytes": bytes,
            "width": int,
            "height": int,
        }
    """
    if not pdf_bytes or len(pdf_bytes) < 10:
        raise PDFRenderingError("PDF document is empty or corrupted.")

    limit = max_pages or GROQ_MAX_PDF_PAGES

    try:
        import pypdfium2 as pdfium
    except ImportError:
        raise PDFRenderingError("PDF rendering engine (pypdfium2) is not available.")

    try:
        doc = pdfium.PdfDocument(pdf_bytes)
    except Exception as exc:
        raise PDFRenderingError(f"Could not open PDF for page rendering: {exc}")

    total_pages = len(doc)
    if total_pages == 0:
        raise PDFRenderingError("PDF contains zero pages.")

    pages_to_render = min(total_pages, limit)
    rendered_pages: List[Dict[str, Any]] = []

    for idx in range(pages_to_render):
        page_num = idx + 1
        try:
            page = doc[idx]
            pil_image = page.render(scale=dpi_scale).to_pil()

            # Bound image dimensions to avoid oversized LLM vision payloads
            if max(pil_image.size) > max_dimension:
                pil_image.thumbnail((max_dimension, max_dimension))

            # Convert to RGB if needed
            if pil_image.mode != "RGB":
                pil_image = pil_image.convert("RGB")

            # Compress to JPEG
            out_buf = io.BytesIO()
            pil_image.save(out_buf, format="JPEG", quality=jpeg_quality, optimize=True)
            jpeg_bytes = out_buf.getvalue()

            rendered_pages.append({
                "page_number": page_num,
                "jpeg_bytes": jpeg_bytes,
                "width": pil_image.width,
                "height": pil_image.height,
            })
        except Exception as exc:
            logger.warning(f"Failed to render page {page_num}: {exc}")
            continue

    return rendered_pages
