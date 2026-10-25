# BRANDTRACE — Uploads and Multimodal Image Analysis

This document describes the file ingestion pipeline, safe PDF text extraction, and Pillow-based color palette compliance analysis.

---

## 1. File Upload Architecture (`POST /api/reviews/upload`)

BRANDTRACE supports multi-format document ingestion:
- **Plain Text / Markdown:** Directly pasted into the review editor.
- **PDF Documents:** Analyzed via `pdf_parser.py` using `pypdf`.
- **Images (PNG, JPEG):** Analyzed via `image_analyzer.py` and `color_science.py` using Pillow.

### Upload Security & Validation Boundaries:
- **File Size Limit:** Enforced server-side via `MAX_UPLOAD_BYTES` (default 10 MB).
- **MIME Type Validation:** Validates file signatures against allowed types (`application/pdf`, `image/png`, `image/jpeg`).
- **Memory Safety:** Files are processed as in-memory byte streams without writing unvetted executables to the local filesystem.

---

## 2. Safe PDF Extraction (`backend/app/pdf_parser.py`)

PDF documents undergo safe text extraction:
1. File bytes are validated against the standard `%PDF` header magic bytes.
2. `pypdf.PdfReader` iterates through pages, extracting raw text layers.
3. **Defensive Error Handling:**
   - Corrupted or truncated PDFs return a structured `HTTP 400 Bad Request` with an explicit diagnostic message rather than crashing the ASGI worker.
   - Encrypted or password-protected PDFs are detected, returning an informative notice to provide an unlocked file.
   - Blank or image-only scanned PDFs are identified; if no text layer is present, the parser notifies the user that OCR is required.

---

## 3. Image Palette & WCAG Accessibility Analysis

When an image asset (such as an ad banner or infographic) is uploaded, BRANDTRACE evaluates visual brand compliance:

### 1. Palette Extraction (`backend/app/image_analyzer.py`):
- Uses Pillow to extract the dominant color clusters.
- Converts RGB values to Hex and normalized CIELAB coordinates.

### 2. WCAG 2.1 Contrast Calculation (`backend/app/color_science.py`):
- Computes relative luminance $L$ according to W3C standards:
  $$L = 0.2126 \cdot R_{lin} + 0.7152 \cdot G_{lin} + 0.0722 \cdot B_{lin}$$
- Evaluates contrast ratio:
  $$\text{Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$
- Verifies compliance against:
  - WCAG AA Normal Text: $\ge 4.5:1$
  - WCAG AA Large Text: $\ge 3.0:1$

### 3. CIELAB Delta-E Color Distance:
- Measures visual distance $\Delta E^*_{ab}$ between dominant extracted colors and the brand's approved palette (e.g. Electric Teal `#2DD4BF`, Canvas Dark `#0A0F1D`).
- A $\Delta E < 2.0$ represents a perceptually imperceptible difference, confirming brand color adherence.

---

## 4. Unsupported Visual Capabilities (Honest Disclosures)

- **Scanned OCR:** Optical Character Recognition requires external `tesseract` binary installed on system PATH. When absent, the system gracefully reports OCR as unavailable.
- **Logo Clearance & Bounding Boxes:** Spatial layout validation (detecting if a logo violates margin padding) is planned for Round 3 and not claimed in this build.
- **Typeface Identification:** Font identification from rendered bitmap pixels is planned for Round 3.
