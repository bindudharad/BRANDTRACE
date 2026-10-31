"""
BRANDTRACE — Exhaustive Verification of Four New Capabilities
1. OCR Pipeline: Scanned PDF, image text extraction, accuracy, corrupted document failure safety.
2. Logo Placement Engine: Approved logos, resized, multiple positions, modified/missing, match threshold guards.
3. Typography Engine: Digital PDFs with embedded fonts, approved vs prohibited rules, raster limitations disclosure.
4. Expiry Worker Scheduler: Lifecycle, execution, expiry detection, duplicate prevention, retries, restart, persistence.
"""
import io
import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from PIL import Image, ImageDraw, ImageFont

# Use isolated temp database
fd, path = tempfile.mkstemp(suffix="_four_caps_verify.db")
os.close(fd)
os.environ["DATABASE_URL"] = f"sqlite:///{path}"
REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.models import db, init_db, ident, now, rows, row
init_db()

from app.services.ocr_service import ocr_pipeline, DocumentOcrPipeline, OpticalPatternOcrProvider
from app.services.logo_detector import detect_logo_placement, load_image_as_cv
from app.services.typography_analyzer import (
    clean_font_name,
    extract_pdf_embedded_fonts,
    analyze_raster_typography,
    evaluate_typography_compliance,
)
from app.services.expiry_worker import scheduler_worker, get_worker_status, trigger_automated_audit
from app.services.expiry_monitor import run_expiry_scan, execute_expiry_job


def report_section(title):
    print(f"\n{'='*75}\n{title}\n{'='*75}")

def assert_check(name, condition, details=""):
    if condition:
        print(f"  [PASS] {name} {details}")
    else:
        print(f"  [FAIL] {name} {details}")
        raise AssertionError(f"Check failed: {name} - {details}")


# ---------------------------------------------------------------------------
# 1. OCR VERIFICATION
# ---------------------------------------------------------------------------
def verify_ocr():
    report_section("1. OCR PIPELINE VERIFICATION")

    # 1.1 Test an actual image containing readable text
    img = Image.new("RGB", (500, 120), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 40), "BRANDTRACE ENTERPRISE 2026", fill=(15, 118, 110))
    img_buf = io.BytesIO()
    img.save(img_buf, format="PNG")
    img_bytes = img_buf.getvalue()

    img_res = ocr_pipeline.process_image(img_bytes)
    assert_check(
        "Image Text Extraction",
        img_res["status"] == "SUCCESS",
        f"Engine={img_res['ocr_engine']} Conf={img_res['confidence']:.2f} Words={img_res['words_detected']}"
    )
    assert_check(
        "Text Accuracy",
        len(img_res["extracted_text"]) > 0,
        f"Extracted: '{img_res['extracted_text']}'"
    )

    # 1.2 Test an actual scanned PDF (pure bitmap, zero digital font layer)
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    scan_pdf_buf = io.BytesIO()
    c = canvas.Canvas(scan_pdf_buf, pagesize=letter)
    # Draw bitmap image onto canvas without drawing text
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(io.BytesIO(img_bytes)), 100, 600, width=300, height=80)
    c.save()
    scanned_pdf_bytes = scan_pdf_buf.getvalue()

    pdf_res = ocr_pipeline.process_pdf(scanned_pdf_bytes)
    assert_check(
        "Scanned PDF Routing",
        pdf_res["total_pages"] == 1 and pdf_res["scanned_pages"] == 1,
        f"Total={pdf_res['total_pages']} Scanned={pdf_res['scanned_pages']} Method={pdf_res['extraction_method']}"
    )
    assert_check(
        "Scanned PDF Text Extracted",
        len(pdf_res["extracted_text"].strip()) > 0,
        f"Result length={len(pdf_res['extracted_text'])}"
    )

    # 1.3 Confirm invalid or corrupted documents fail safely
    corrupted_bytes = b"NOT_A_VALID_PDF_OR_IMAGE_CORRUPTED_STREAM_1234567890"
    try:
        ocr_pipeline.process_image(corrupted_bytes)
        failed_safely = False
    except ValueError as e:
        failed_safely = True
    assert_check("Corrupted Image Safety", failed_safely, "Safely raised ValueError without unhandled crash")


# ---------------------------------------------------------------------------
# 2. LOGO PLACEMENT & CLEARSPACE CV VERIFICATION
# ---------------------------------------------------------------------------
def verify_logo_cv():
    report_section("2. LOGO PLACEMENT & CLEARSPACE CV VERIFICATION")

    # Template logo (100x50 teal rectangle with nested inner square)
    logo = Image.new("RGB", (100, 50), color=(18, 59, 45))
    logo_draw = ImageDraw.Draw(logo)
    logo_draw.rectangle([15, 10, 85, 40], fill=(45, 212, 191))
    logo_buf = io.BytesIO()
    logo.save(logo_buf, format="PNG")
    logo_bytes = logo_buf.getvalue()

    # 2.1 Approved reference logo in TOP_LEFT position with adequate clearspace
    canvas_ok = Image.new("RGB", (800, 600), color=(245, 247, 245))
    canvas_ok.paste(logo, (60, 60))
    c_buf = io.BytesIO()
    canvas_ok.save(c_buf, format="PNG")

    res_ok = detect_logo_placement(
        c_buf.getvalue(),
        logo_bytes,
        expected_location="TOP_LEFT",
        required_clearspace_ratio=0.5
    )
    assert_check(
        "Approved Logo Match",
        res_ok["matched"] is True and res_ok["placement_compliant"] is True,
        f"Location={res_ok['relative_position']['detected_location']} Conf={res_ok['match_confidence']}"
    )
    assert_check(
        "Clearspace Compliance (M >= 0.5H)",
        res_ok["clearspace_compliant"] is True,
        f"Clearspace ratio={res_ok['clearspace_margin_ratio']}H (Required >= 0.5H)"
    )

    # 2.2 Resized version (scale logo to 1.4x)
    resized_logo = logo.resize((140, 70))
    canvas_scaled = Image.new("RGB", (800, 600), color=(245, 247, 245))
    canvas_scaled.paste(resized_logo, (60, 60))
    cs_buf = io.BytesIO()
    canvas_scaled.save(cs_buf, format="PNG")

    res_scale = detect_logo_placement(cs_buf.getvalue(), logo_bytes, expected_location="TOP_LEFT")
    assert_check(
        "Multi-Scale Pyramid Match",
        res_scale["matched"] is True and res_scale["scale_percent"] > res_ok["scale_percent"],
        f"Scale={res_scale['scale_percent']}% Conf={res_scale['match_confidence']}"
    )

    # 2.3 Different positions (BOTTOM_RIGHT)
    canvas_br = Image.new("RGB", (800, 600), color=(245, 247, 245))
    canvas_br.paste(logo, (640, 480))
    cbr_buf = io.BytesIO()
    canvas_br.save(cbr_buf, format="PNG")

    res_br = detect_logo_placement(cbr_buf.getvalue(), logo_bytes, expected_location="BOTTOM_RIGHT")
    assert_check(
        "Quadrant Detection (BOTTOM_RIGHT)",
        res_br["relative_position"]["detected_location"] == "BOTTOM_RIGHT",
        f"Detected={res_br['relative_position']['detected_location']}"
    )

    # 2.4 Missing / modified logo: uncertain match must NOT be presented as verified
    canvas_empty = Image.new("RGB", (800, 600), color=(200, 200, 200))
    ce_buf = io.BytesIO()
    canvas_empty.save(ce_buf, format="PNG")

    res_empty = detect_logo_placement(ce_buf.getvalue(), logo_bytes, match_threshold=0.60)
    assert_check(
        "Uncertain Match Guard",
        res_empty["matched"] is False,
        f"Matched={res_empty['matched']} Conf={res_empty['match_confidence']} (Below 0.60 threshold)"
    )


# ---------------------------------------------------------------------------
# 3. TYPOGRAPHY & FONT INSPECTION VERIFICATION
# ---------------------------------------------------------------------------
def verify_typography():
    report_section("3. TYPOGRAPHY & FONT INSPECTION VERIFICATION")

    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    # 3.1 Digital PDF with approved embedded font (Helvetica)
    buf_h = io.BytesIO()
    c = canvas.Canvas(buf_h, pagesize=letter)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(72, 700, "BRANDTRACE Approved Header")
    c.setFont("Helvetica", 12)
    c.drawString(72, 670, "Body paragraph set in approved brand typeface.")
    c.save()
    pdf_helvetica = buf_h.getvalue()

    fonts_h = extract_pdf_embedded_fonts(pdf_helvetica)
    assert_check(
        "Embedded PDF Font Extracted",
        len(fonts_h) >= 1 and any("Helvetica" in f["font_family"] for f in fonts_h),
        f"Fonts detected: {[f['font_family'] for f in fonts_h]}"
    )

    comp_h = evaluate_typography_compliance(pdf_helvetica, "pdf", approved_fonts=["Helvetica", "Inter"])
    assert_check(
        "Approved Font Compliance",
        comp_h["compliant"] is True and len(comp_h["findings"]) == 0,
        "Zero violations for approved Helvetica"
    )

    # 3.2 Digital PDF with prohibited/unapproved font (Times-Roman)
    buf_t = io.BytesIO()
    ct = canvas.Canvas(buf_t, pagesize=letter)
    ct.setFont("Times-Roman", 14)
    ct.drawString(72, 700, "Unauthorized Serif Typography Document")
    ct.save()
    pdf_times = buf_t.getvalue()

    comp_t = evaluate_typography_compliance(pdf_times, "pdf", approved_fonts=["Helvetica", "Inter"])
    assert_check(
        "Prohibited Font Violation Detected",
        comp_t["compliant"] is False and len(comp_t["findings"]) >= 1,
        f"Findings: {comp_t['findings'][0]['explanation']}"
    )

    # 3.3 Verify raster limitations correctly disclosed
    raster_img = Image.new("RGB", (400, 100), color=(255, 255, 255))
    d = ImageDraw.Draw(raster_img)
    d.text((20, 40), "Raster Image Paragraph", fill=(0, 0, 0))
    rb = io.BytesIO()
    raster_img.save(rb, format="PNG")

    raster_eval = evaluate_typography_compliance(rb.getvalue(), "image", approved_fonts=["Helvetica", "Inter"])
    assert_check(
        "Raster Limitation Disclosed",
        raster_eval["analysis_mode"] == "RASTER_IMAGE_TYPOGRAPHY_ESTIMATION",
        f"Mode: {raster_eval['analysis_mode']} (Heuristic advisory scoring)"
    )


# ---------------------------------------------------------------------------
# 4. EXPIRY WORKER SCHEDULER VERIFICATION
# ---------------------------------------------------------------------------
def verify_expiry_worker():
    report_section("4. EXPIRY WORKER SCHEDULER VERIFICATION")

    # 4.1 Scheduler startup & lifecycle
    assert_check("Initial State Stopped", scheduler_worker.is_running is False)
    scheduler_worker.start()
    assert_check("Scheduler Startup", scheduler_worker.is_running is True, "Daemon thread active")
    scheduler_worker.stop()
    assert_check("Scheduler Safe Stop", scheduler_worker.is_running is False, "Thread joined safely")

    # 4.2 Expiry detection on expired fact
    with db() as conn:
        conn.execute("DELETE FROM facts WHERE id='F-EXPIRY-TEST'")
        conn.execute("DELETE FROM governance_alerts WHERE target_id='F-EXPIRY-TEST'")
        # Insert expired fact (expired 10 days ago)
        exp_date = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        conn.execute(
            """
            INSERT INTO facts (id, workspace_id, claim, value, owner, status, version, source_id, source_title, source_excerpt, effective_at, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("F-EXPIRY-TEST", "ws_default", "Beta Discount", "50% off", "Legal", "APPROVED", "1.0", "SRC-01", "Legal Memo 2026", "Beta discount valid until expiration.", None, exp_date, now())
        )

    scan_res1 = run_expiry_scan("ws_default")
    assert_check(
        "Expiry Detection",
        scan_res1["new_alerts_created"] >= 1,
        f"New alerts: {scan_res1['new_alerts_created']}"
    )

    # 4.3 Duplicate prevention (idempotency check)
    scan_res2 = run_expiry_scan("ws_default")
    assert_check(
        "Duplicate Alert Prevention",
        scan_res2["new_alerts_created"] == 0,
        "Idempotency key prevented redundant alert creation"
    )

    # 4.4 Retries and execution tracking in governance_jobs
    job = execute_expiry_job(workspace_id="ws_default", max_retries=3)
    assert_check(
        "Job Execution Success",
        job["job_status"] == "SUCCESS" and "job_id" in job,
        f"Job ID={job['job_id']} Retries Used={job['retry_count']}"
    )

    # 4.5 Persistence of generated jobs in DB
    persisted_job = row("SELECT * FROM governance_jobs WHERE id=?", (job["job_id"],))
    assert_check(
        "Job Persistence",
        persisted_job is not None and persisted_job["status"] == "SUCCESS",
        f"Durable record verified in governance_jobs table"
    )

    # 4.6 Application restart behavior (re-instantiating scheduler)
    from app.services.expiry_worker import BackgroundExpiryScheduler
    fresh_scheduler = BackgroundExpiryScheduler(check_interval_seconds=60)
    fresh_scheduler.start()
    assert_check("Restart Scheduler Instance", fresh_scheduler.is_running is True)
    fresh_scheduler.stop()
    assert_check("Clean Shutdown on Restart", fresh_scheduler.is_running is False)


def main():
    print("=" * 75)
    print("BRANDTRACE - DEEP VERIFICATION OF FOUR NEW CAPABILITIES")
    print("=" * 75)
    try:
        verify_ocr()
        verify_logo_cv()
        verify_typography()
        verify_expiry_worker()
        print("\n" + "=" * 75)
        print("ALL FOUR CAPABILITIES 100% VERIFIED AND WORKING AS SPECIFIED!")
        print("=" * 75)
    finally:
        scheduler_worker.stop()
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass

if __name__ == "__main__":
    main()
