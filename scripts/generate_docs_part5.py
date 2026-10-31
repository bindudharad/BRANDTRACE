"""
Generator for BRANDTRACE Master Documentation Ecosystem (Category E: Docs 25 to 28).
"""
import os

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))
os.makedirs(DOCS_DIR, exist_ok=True)

docs = {}

# =============================================================================
# 25_AI_ASSISTED_ANALYSIS_ARCHITECTURE.md
# =============================================================================
docs["25_AI_ASSISTED_ANALYSIS_ARCHITECTURE.md"] = """# 25 — AI-ASSISTED ANALYSIS ARCHITECTURE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Optional AI Advisory Model

BRANDTRACE integrates external generative AI strictly as an **optional, advisory layer** via `backend/app/ai_adapter.py`.

```
[ User Input Document ]
           │
           ▼
[ Deterministic Governance Engine ] ──(Always Executes First)──► [ Base Findings & Score ]
           │
           ├──► [ consent_ai == false ] ──────────────► [ Complete Evaluation (100% Offline) ]
           │
           └──► [ consent_ai == true ]
                      │
                      ▼
               [ PII Preflight Check ]
                      │
                      ▼
               [ Groq API Adapter ] ──────────────────► [ Advisory Suggestions & Explanations ]
```

---

## 2. Ethical Safeguards & Degradation Fallback

1. **PII Preflight Screening:** Automatic regex screening detects credit card numbers, email patterns, and phone numbers before dispatching payloads to third-party endpoints.
2. **Explicit Consent Gate:** The user must explicitly toggle `AI Analysis` on the submission interface.
3. **Graceful Offline Fallback:** If the external AI service returns an error, rate limit, or timeout, the review completes successfully using deterministic findings alone. External AI failure never blocks content evaluation.
"""

# =============================================================================
# 26_DOCUMENT_INGESTION_AND_OCR.md
# =============================================================================
docs["26_DOCUMENT_INGESTION_AND_OCR.md"] = """# 26 — DOCUMENT INGESTION & PDF EXTRACTION
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
"""

# =============================================================================
# 27_MULTIMODAL_VISUAL_BRAND_ANALYSIS.md
# =============================================================================
docs["27_MULTIMODAL_VISUAL_BRAND_ANALYSIS.md"] = """# 27 — MULTIMODAL VISUAL BRAND COMPLIANCE & COLOR SCIENCE
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Visual Verification Technologies

BRANDTRACE evaluates visual creative assets through three complementary algorithms:
1. **Cryptographic SHA-256 Binary Matching:** Identifies registered brand marks in `brand_assets` as `SUPPORTED` (approved), `CONTRADICTED` (restricted/deprecated), or `NEEDS_REVIEW` (unregistered).
2. **64-bit Difference Hashing (dHash):** Computes perceptual hashes and Hamming distance to calculate perceptual similarity percentages ($0–100\%$) across scaled or slightly modified logos.
3. **CIELAB Delta-E Color Science:** Converts RGB pixels to the perceptually uniform CIE $L^*a^*b^*$ color space, calculating Euclidean color difference:
   $$\\Delta E^* = \\sqrt{(\\Delta L^*)^2 + (\\Delta a^*)^2 + (\\Delta b^*)^2}$$
   Where $\\Delta E^* \\le 2.0$ represents standard industrial color compliance.

---

## 2. Measurable Logo Clearspace ($M \\ge 0.5H$)

Using OpenCV multi-scale normalized cross-correlation (`cv2.matchTemplate`), the visual intelligence engine detects logo bounding boxes and computes exclusion margins:
$$M = \\min(D_{\\text{top}}, D_{\\text{bottom}}, D_{\\text{left}}, D_{\\text{right}})$$
If surrounding design elements infringe upon $M < 0.5H$, a visual finding (`HIGH` severity) is generated.
"""

# =============================================================================
# 28_EVIDENCE_EXPORT_AND_REPORT_GENERATION.md
# =============================================================================
docs["28_EVIDENCE_EXPORT_AND_REPORT_GENERATION.md"] = """# 28 — COMPLIANCE EVIDENCE PACKET EXPORT
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Export Formats & Auditor Utility

To support compliance audits, agency client deliverables, and legal defense files, BRANDTRACE exports comprehensive evidence dossiers via `backend/app/services/compliance_exporter.py`:
- **Machine-Readable JSON (`?format=json`):** Full structured payload containing review metadata, SHA-256 fingerprints, finding dispositions, and chronological audit entries.
- **Publication-Ready PDF (`?format=pdf`):** Multi-page branded PDF dossier compiled on-the-fly using ReportLab.

---

## 2. Dossier Content Structure

Every compliance packet contains:
1. **Document Header:** Review ID, document title, clearance score, author, and timestamp.
2. **Cryptographic Signatures:** SHA-256 hashes of original submission and approved draft.
3. **Governance Summary:** Total findings, high-risk counts, and dismissal justifications.
4. **Findings Breakdown:** Flagged passage, policy excerpt, rule version, and reviewer action.
5. **Immutable Revision History:** Chronological snapshot of every edit made to the draft.
6. **Chain of Custody Audit Ledger:** Complete log of actions, actor IDs, roles, and timestamps.
"""

for fname, content in docs.items():
    fpath = os.path.join(DOCS_DIR, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Generated: {fname}")
