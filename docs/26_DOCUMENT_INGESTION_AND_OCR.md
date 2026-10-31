# 26 — DOCUMENT INGESTION & PDF EXTRACTION
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Multi-Format Ingestion Pipeline

BRANDTRACE supports multi-format document ingestion via `backend/app/pdf_parser.py`:
- **Direct Text / Markdown:** Preserves whitespace and paragraph structures up to 50,000 characters.
- **Digital PDFs:** Evaluated using pure-Python `pypdf`, extracting page-indexed text blocks, headers, and section numbers.
- **Image Documents:** Supports PNG, JPEG, and WebP uploads up to 20MB.

---

## 2. Text Extraction Boundaries

- **Digital-First Priority:** Text is extracted from embedded digital font streams.
- **Scanned Document Handling:** If a PDF contains zero extractable text (e.g. pure scanned bitmap pages), the system provides clear user feedback noting that scanned image OCR is required.
- **Memory Streaming:** All file parsing occurs within streaming memory buffers without writing unencrypted temporary files to the local file system.
