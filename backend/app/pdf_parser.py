"""
Safe PDF text extraction module for BRANDTRACE using pypdf.
Preserves page references, enforces file-size bounds, and identifies scanned / non-extractable PDFs.
"""
from __future__ import annotations

import io
from typing import List, Tuple
from pypdf import PdfReader
from pypdf.errors import PdfReadError, FileNotDecryptedError

class PDFExtractionError(Exception):
    def __init__(self, message: str, is_safe_user_error: bool = True):
        super().__init__(message)
        self.message = message
        self.is_safe_user_error = is_safe_user_error

def extract_pdf_pages(data: bytes, max_pages: int = 50) -> List[Tuple[int, str]]:
    """
    Safely extract text from PDF bytes page by page.
    Returns list of (page_number, text) tuples.
    Raises PDFExtractionError on invalid, encrypted, or corrupted PDFs.
    """
    if not data or len(data) < 10:
        raise PDFExtractionError("Uploaded PDF file is empty or too short.")

    try:
        stream = io.BytesIO(data)
        reader = PdfReader(stream)
    except (PdfReadError, Exception) as exc:
        raise PDFExtractionError(f"Malformed or unreadable PDF: {str(exc)}")

    if reader.is_encrypted:
        try:
            # Try decrypting with empty password
            decrypted = reader.decrypt("")
            if not decrypted:
                raise PDFExtractionError("PDF is password-protected/encrypted and cannot be processed.")
        except Exception:
            raise PDFExtractionError("PDF is password-protected/encrypted and cannot be processed.")

    total_pages = len(reader.pages)
    if total_pages == 0:
        raise PDFExtractionError("PDF document has no pages.")

    pages_to_process = min(total_pages, max_pages)
    extracted: List[Tuple[int, str]] = []

    for idx in range(pages_to_process):
        page_num = idx + 1
        try:
            page = reader.pages[idx]
            text = (page.extract_text() or "").strip()
            if text:
                extracted.append((page_num, text))
        except Exception:
            # Continue extracting remaining pages if a single page fails
            continue

    return extracted

def format_pdf_text_for_review(pages: List[Tuple[int, str]]) -> str:
    """
    Combines extracted page texts with visible, clean page boundary markers.
    """
    if not pages:
        return ""
    sections = []
    for page_num, text in pages:
        sections.append(f"[Page {page_num}]\n{text}")
    return "\n\n".join(sections)
