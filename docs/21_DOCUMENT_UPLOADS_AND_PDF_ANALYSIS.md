# Document Uploads and PDF Text Extraction

## Ingestion Architecture

While direct text drafting is common for short-form social copy, enterprise marketing collateral frequently originates as formatted documents (PDF brochures, one-pagers, whitepapers) or visual creative assets (PNG, JPEG campaign graphics).

BRANDTRACE provides a unified ingestion gateway via `POST /api/reviews/upload` supporting both document text parsing and visual image analysis.

```
+--------------------------------------------------------------------------+
|                  MULTIPART FILE UPLOAD (POST /api/reviews/upload)         |
+--------------------------------------------------------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
      [ PDF Document Stream ]                     [ Image Stream (PNG/JPEG) ]
               |                                           |
               v                                           v
    [ pdf_parser.py (pypdf) ]                 [ image_analyzer.py (Pillow) ]
  - Byte size limit check                    - Byte size limit check
  - Stream validity check                    - Palette quantization
  - Text layer extraction                    - WCAG contrast & Delta-E
  - Empty / corrupt handling                               |
               |                                           v
               +---------------------------------> [ Governance Engine ]
                                                   run_governance_analysis()
```

---

## Supported File Formats and Ingestion Limits

The upload endpoint enforces strict boundary validation:
* **Plain Text**: Submitted directly via JSON payload in `POST /api/reviews`.
* **PDF Documents (`application/pdf`)**: Processed via `pdf_parser.py`.
* **Raster Images (`image/png`, `image/jpeg`, `image/jpg`, `image/webp`)**: Processed via `image_analyzer.py`.
* **File Size Limit (`MAX_UPLOAD_BYTES`)**: Default is 10 MB (`10,485,760` bytes). Payloads exceeding this limit are rejected immediately with `HTTP 400 Bad Request`.
* **MIME Type Validation**: Files with unsupported MIME types (e.g., `.docx`, `.zip`, `.exe`) are rejected with `HTTP 400 Bad Request` and a descriptive message.

---

## PDF Text Layer Extraction (`backend/app/pdf_parser.py`)

PDF documents are parsed using **`pypdf`**, an efficient, pure-Python PDF extraction library.

### Extraction Pipeline
1. **Stream Reading**: The incoming raw bytes are wrapped in a `io.BytesIO` buffer.
2. **PdfReader Initialization**: Validates PDF header markers and builds internal object xref tables.
3. **Page Iteration**: Iterates sequentially across all pages, invoking `page.extract_text()`.
4. **Text Aggregation**: Cleans whitespace and concatenates page text streams with double-newline page breaks.

---

## Defensive Error Handling & Edge Cases

PDF files in enterprise environments frequently suffer from encoding issues, encryption, or corruption. The parser provides robust error recovery:

### 1. Corrupt or Malformed PDF Files
If a file has a `.pdf` extension but contains invalid binary data or broken xref tables, `pypdf` raises `PdfStreamError` or `ValueError`.
* **Engine Response**: Caught cleanly and converted to `HTTP 400 Bad Request`:
  > *"Could not parse PDF file. The document appears to be corrupted, malformed, or missing valid page structures."*

### 2. Encrypted or Password-Protected PDFs
If a PDF requires a password for reading (`reader.is_encrypted == True`):
* **Engine Response**: The parser attempts decryption with an empty password. If access remains restricted, it raises `HTTP 400 Bad Request`:
  > *"PDF is encrypted or password-protected. Please upload an unencrypted document for governance review."*

### 3. Blank or Image-Only Scanned PDFs
If a PDF has valid page structures but contains zero extractable text (e.g., a scanned document without an embedded OCR text layer):
* **Engine Response**: The parser detects that the aggregated text length is zero and raises `HTTP 400 Bad Request`:
  > *"No extractable text found in PDF. The document may be blank, scanned without an OCR text layer, or contain non-standard font encodings."*

---

## Post-Upload Lifecycle

Once text is successfully extracted:
1. A standard review record is created in `reviews` with:
   * `content`: The extracted text stream.
   * `file_name`: Original uploaded filename (e.g., `apac_launch_brochure.pdf`).
   * `file_mime`: `application/pdf`.
   * `file_size`: Byte count of uploaded file.
2. `save_version()` snapshots the extracted text as `ORIGINAL_SUBMISSION`.
3. `run_governance_analysis()` executes immediately, scanning the extracted text for brand rule violations, claim validity, and health score deductions.
4. The client receives the complete `ReviewOut` payload, instantly rendering the document's compliance status in the workspace.
