"""
Comprehensive Integration Tests for Zero-Deferred Capabilities:
1. OCR Pipeline: Provider-independent optical text extraction for PDFs and images.
2. Logo Placement Detection: Multi-scale template matching, bounding boxes, quadrants, scale %, clearspace M >= 0.5H.
3. Typography Compliance: Embedded PDF font metadata extraction, rule matching, raster typography analysis.
4. Automated Expiry Worker: Background scheduler lifecycle, audit triggers, idempotent job execution ledger.
"""
from __future__ import annotations

import asyncio
import io
import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from PIL import Image, ImageDraw, ImageFont

import httpx
import pytest

# Ensure isolated SQLite database
fd, path = tempfile.mkstemp(suffix="_zero_deferred.db")
os.close(fd)
os.environ["DATABASE_URL"] = f"sqlite:///{path}"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, init_db, ident, now
from app.services.ocr_service import ocr_pipeline, OpticalPatternOcrProvider
from app.services.logo_detector import detect_logo_placement
from app.services.typography_analyzer import (
    clean_font_name,
    extract_pdf_embedded_fonts,
    analyze_raster_typography,
    evaluate_typography_compliance,
)
from app.services.expiry_worker import scheduler_worker, get_worker_status, trigger_automated_audit


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM governance_jobs")
        conn.execute("DELETE FROM governance_alerts")
        conn.execute("DELETE FROM evidence_dependencies")
        conn.execute("DELETE FROM review_comments")
        conn.execute("DELETE FROM reviews")
        conn.execute("DELETE FROM facts")
        conn.execute("DELETE FROM rules")
        conn.execute("DELETE FROM brand_assets")
    yield
    # Stop scheduler if started in tests
    scheduler_worker.stop()


def create_test_image_with_text(text: str = "BRANDTRACE 2026") -> bytes:
    """Create a synthetic PNG image with high-contrast text."""
    img = Image.new("RGB", (400, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 35), text, fill=(15, 118, 110))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_test_canvas_and_logo(
    logo_x: int = 60,
    logo_y: int = 60,
    logo_w: int = 100,
    logo_h: int = 50,
    canvas_w: int = 800,
    canvas_h: int = 600,
) -> tuple[bytes, bytes]:
    """Create a canvas and template logo for placement and clearspace testing."""
    logo = Image.new("RGB", (logo_w, logo_h), color=(15, 118, 110))
    logo_draw = ImageDraw.Draw(logo)
    logo_draw.rectangle([10, 10, logo_w - 10, logo_h - 10], fill=(45, 212, 191))

    logo_buf = io.BytesIO()
    logo.save(logo_buf, format="PNG")
    logo_bytes = logo_buf.getvalue()

    canvas = Image.new("RGB", (canvas_w, canvas_h), color=(240, 243, 246))
    canvas.paste(logo, (logo_x, logo_y))

    canvas_buf = io.BytesIO()
    canvas.save(canvas_buf, format="PNG")
    canvas_bytes = canvas_buf.getvalue()

    return canvas_bytes, logo_bytes


def create_test_pdf_with_fonts(font_name: str = "Helvetica") -> bytes:
    """Generate a valid test PDF document using reportlab."""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    c.setFont(font_name, 16)
    c.drawString(100, 700, "BRANDTRACE Enterprise Governance Report")
    c.setFont(font_name, 11)
    c.drawString(100, 670, "Approved brand claim: Available in India.")
    c.save()
    return buf.getvalue()


# -----------------------------------------------------------------------------
# 1. OCR PIPELINE TESTS
# -----------------------------------------------------------------------------

def test_ocr_optical_pattern_provider():
    """Verify fallback optical pattern provider extracts text without external dependencies."""
    provider = OpticalPatternOcrProvider()
    img = Image.new("RGB", (200, 80), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 20, 50, 40], fill=(0, 0, 0))  # Simulate glyph marks
    text, conf, words = provider.extract_text(img)
    assert conf >= 0.5
    assert words >= 1
    assert "BRANDTRACE" in text or "Visual" in text or "Optical" in text


def test_ocr_pipeline_process_image():
    """Verify DocumentOcrPipeline processes raster images."""
    img_bytes = create_test_image_with_text("BRANDTRACE ENTERPRISE")
    res = ocr_pipeline.process_image(img_bytes)
    assert res["status"] in ("SUCCESS", "EMPTY")
    assert res["width"] == 400
    assert res["height"] == 100
    assert any(eng in res["ocr_engine"].lower() for eng in ("easyocr", "optical", "tesseract"))
    assert "words_detected" in res


def test_ocr_pipeline_process_pdf():
    """Verify DocumentOcrPipeline handles digital and scanned PDFs."""
    pdf_bytes = create_test_pdf_with_fonts("Helvetica")
    res = ocr_pipeline.process_pdf(pdf_bytes)
    assert res["total_pages"] == 1
    assert "BRANDTRACE Enterprise Governance Report" in res["extracted_text"]
    assert res["digital_pages"] == 1
    assert res["scanned_pages"] == 0
    assert res["extraction_method"] == "DIGITAL_PDF"


def test_api_document_ocr_endpoint():
    """Test POST /api/documents/ocr with image and PDF payloads."""
    async def run_test():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"X-Demo-Role": "brand_admin", "X-Workspace-Id": "ws_default"}

            # Test Image OCR
            img_bytes = create_test_image_with_text("BRANDTRACE SYSTEM")
            resp = await client.post(
                "/api/documents/ocr",
                headers=headers,
                files={"file": ("test_scan.png", img_bytes, "image/png")},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "SUCCESS"
            assert data["file_type"] == "image"
            assert data["total_pages"] == 1
            assert data["confidence"] > 0

            # Test PDF OCR
            pdf_bytes = create_test_pdf_with_fonts("Helvetica")
            resp_pdf = await client.post(
                "/api/documents/ocr",
                headers=headers,
                files={"file": ("doc.pdf", pdf_bytes, "application/pdf")},
            )
            assert resp_pdf.status_code == 200
            pdf_data = resp_pdf.json()
            assert pdf_data["status"] == "SUCCESS"
            assert pdf_data["file_type"] == "pdf"
            assert "BRANDTRACE Enterprise Governance Report" in pdf_data["extracted_text"]

    asyncio.run(run_test())


# -----------------------------------------------------------------------------
# 2. LOGO PLACEMENT & CLEARSPACE TESTS
# -----------------------------------------------------------------------------

def test_logo_placement_detection_compliant():
    """Verify logo detection accurately finds bounding box, quadrant, scale and clearspace."""
    canvas_bytes, logo_bytes = create_test_canvas_and_logo(
        logo_x=60, logo_y=60, logo_w=100, logo_h=50, canvas_w=800, canvas_h=600
    )

    res = detect_logo_placement(
        canvas_bytes=canvas_bytes,
        template_logo_bytes=logo_bytes,
        expected_location="TOP_LEFT",
        min_scale_pct=5.0,
        max_scale_pct=30.0,
        required_clearspace_ratio=0.5,
    )

    assert res["matched"] is True
    assert res["match_confidence"] >= 0.70
    assert res["relative_position"]["detected_location"] == "TOP_LEFT"
    assert res["scale_percent"] > 5.0
    assert res["clearspace_compliant"] is True
    assert res["placement_compliant"] is True
    assert len(res["findings"]) == 0


def test_logo_placement_clearspace_violation():
    """Verify clearspace violation is flagged when logo is pushed against canvas boundary."""
    canvas_bytes, logo_bytes = create_test_canvas_and_logo(
        logo_x=5, logo_y=5, logo_w=100, logo_h=50, canvas_w=800, canvas_h=600
    )

    res = detect_logo_placement(
        canvas_bytes=canvas_bytes,
        template_logo_bytes=logo_bytes,
        expected_location="TOP_LEFT",
        required_clearspace_ratio=0.5,
    )

    assert res["matched"] is True
    assert res["clearspace_compliant"] is False
    assert res["placement_compliant"] is False
    assert any("insufficient_logo_clearspace" in f["type"] for f in res["findings"])


def test_api_brand_assets_placement_check():
    """Test POST /api/brand-assets/placement-check endpoint."""
    async def run_test():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"X-Demo-Role": "brand_admin", "X-Workspace-Id": "ws_default"}

            canvas_bytes, logo_bytes = create_test_canvas_and_logo(
                logo_x=60, logo_y=60, logo_w=100, logo_h=50, canvas_w=800, canvas_h=600
            )

            resp = await client.post(
                "/api/brand-assets/placement-check",
                headers=headers,
                files={
                    "canvas_file": ("canvas.png", canvas_bytes, "image/png"),
                    "template_file": ("logo.png", logo_bytes, "image/png"),
                },
                data={"expected_location": "TOP_LEFT"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["matched"] is True
            assert data["relative_position"]["detected_location"] == "TOP_LEFT"
            assert data["clearspace_compliant"] is True
            assert data["placement_compliant"] is True

    asyncio.run(run_test())


# -----------------------------------------------------------------------------
# 3. TYPOGRAPHY COMPLIANCE TESTS
# -----------------------------------------------------------------------------

def test_clean_font_name():
    """Verify font name sanitizer strips subset hashes and weight suffixes."""
    assert clean_font_name("/ABCDEF+Inter-Bold") == "Inter"
    assert clean_font_name("/Roboto,Bold") == "Roboto"
    assert clean_font_name("Helvetica-Regular") == "Helvetica"
    assert clean_font_name("") == "Unknown"


def test_pdf_embedded_font_extraction():
    """Verify extract_pdf_embedded_fonts detects font dictionaries in PDF documents."""
    pdf_bytes = create_test_pdf_with_fonts("Helvetica")
    fonts = extract_pdf_embedded_fonts(pdf_bytes)
    assert len(fonts) >= 1
    assert any("Helvetica" in f["font_family"] for f in fonts)


def test_typography_compliance_evaluation():
    """Verify evaluate_typography_compliance checks extracted fonts against approved policy."""
    # Helvetica document with approved Inter & Helvetica -> COMPLIANT
    pdf_bytes = create_test_pdf_with_fonts("Helvetica")
    res_ok = evaluate_typography_compliance(
        pdf_bytes,
        file_type="pdf",
        approved_fonts=["Inter", "Helvetica"],
    )
    assert res_ok["compliant"] is True
    assert len(res_ok["findings"]) == 0

    # Times-Roman document with approved Inter & Helvetica -> UNAPPROVED TYPOGRAPHY VIOLATION
    pdf_times = create_test_pdf_with_fonts("Times-Roman")
    res_bad = evaluate_typography_compliance(
        pdf_times,
        file_type="pdf",
        approved_fonts=["Inter", "Helvetica"],
    )
    assert res_bad["compliant"] is False
    assert any("unapproved_typeface" in f["type"] for f in res_bad["findings"])


def test_api_documents_typography_check():
    """Test POST /api/documents/typography-check endpoint."""
    async def run_test():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"X-Demo-Role": "brand_admin", "X-Workspace-Id": "ws_default"}

            pdf_bytes = create_test_pdf_with_fonts("Helvetica")
            resp = await client.post(
                "/api/documents/typography-check",
                headers=headers,
                files={"file": ("brochure.pdf", pdf_bytes, "application/pdf")},
                data={"approved_fonts": "Helvetica, Inter"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["compliant"] is True
            assert any("Helvetica" in f["font_family"] for f in data["detected_fonts"])

    asyncio.run(run_test())


# -----------------------------------------------------------------------------
# 4. AUTOMATED EXPIRY WORKER TESTS
# -----------------------------------------------------------------------------

def test_expiry_scheduler_lifecycle():
    """Verify background scheduler worker thread starts and stops safely."""
    assert scheduler_worker.is_running is False
    scheduler_worker.start()
    assert scheduler_worker.is_running is True
    scheduler_worker.stop()
    assert scheduler_worker.is_running is False


def test_on_demand_automated_audit():
    """Verify on-demand automated governance audit executes with job record."""
    job = trigger_automated_audit(workspace_id="ws_default")
    assert "job_id" in job
    assert job["job_status"] in ("SUCCESS", "COMPLETED")

    status = get_worker_status()
    assert len(status["recent_jobs"]) >= 1
    assert status["recent_jobs"][0]["id"] == job["job_id"]


def test_api_expiry_worker_endpoints():
    """Test start, stop, and status endpoints for expiry worker."""
    async def run_test():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"X-Demo-Role": "brand_admin", "X-Workspace-Id": "ws_default"}

            # Start scheduler
            r_start = await client.post(
                "/api/governance/expiry-worker/start-scheduler?interval_seconds=1800",
                headers=headers
            )
            assert r_start.status_code == 200
            assert r_start.json()["status"] == "RUNNING"
            assert scheduler_worker.is_running is True

            # Check status
            r_status = await client.get("/api/governance/expiry-worker/status", headers=headers)
            assert r_status.status_code == 200
            status_data = r_status.json()
            assert status_data["scheduler_active"] is True
            assert status_data["check_interval_seconds"] == 1800

            # Stop scheduler
            r_stop = await client.post("/api/governance/expiry-worker/stop-scheduler", headers=headers)
            assert r_stop.status_code == 200
            assert r_stop.json()["status"] == "STOPPED"
            assert scheduler_worker.is_running is False

    asyncio.run(run_test())
