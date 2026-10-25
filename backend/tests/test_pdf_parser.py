"""
Unit tests for safe PDF extraction using pypdf.
Verifies page-linked extraction, format boundaries, and safe failure handling.
"""
import io
import pytest
from pypdf import PdfWriter

from app.pdf_parser import (
    extract_pdf_pages,
    format_pdf_text_for_review,
    PDFExtractionError,
)

def test_empty_pdf_raises_safe_error():
    with pytest.raises(PDFExtractionError, match="empty or too short"):
        extract_pdf_pages(b"")

def test_corrupted_pdf_raises_safe_error():
    with pytest.raises(PDFExtractionError, match="Malformed or unreadable PDF"):
        extract_pdf_pages(b"Not a valid PDF header content")

def test_blank_page_pdf_handling():
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    data = buf.getvalue()

    # Document with pages but no text returns empty list
    pages = extract_pdf_pages(data)
    assert pages == []
    formatted = format_pdf_text_for_review(pages)
    assert formatted == ""

def test_encrypted_pdf_handling():
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.encrypt(user_password="secret_password")
    buf = io.BytesIO()
    writer.write(buf)

    with pytest.raises(PDFExtractionError, match="password-protected/encrypted"):
        extract_pdf_pages(buf.getvalue())
