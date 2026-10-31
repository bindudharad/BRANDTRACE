# 05 — PRODUCT SCOPE AND NON-GOALS
**Platform:** BRANDTRACE
**Status:** **VERIFIED IMPLEMENTED**

---

## 1. Supported In-Scope Capabilities

- **Document Formats:** Direct plain text, Markdown, digital PDFs (`pypdf` extraction), and standard image formats (PNG, JPEG, WebP).
- **Rule Categories:** Voice & Tone, Required Terminology, Prohibited Phrases, and Corporate Fact Matching.
- **Visual Compliance:** Exact SHA-256 binary matching, dominant palette extraction, CIELAB Delta-E color distance, and WCAG 2.1 relative luminance contrast evaluation.
- **Workflow Control:** Multi-tenant workspace scoping (`workspace_id`), 4-role RBAC, exact-span text replacements, version history snapshots, and server-side approval gates.
- **Compliance Dossiers:** Exportable tamper-evident JSON and PDF dossiers via ReportLab.

---

## 2. Explicit Non-Goals & Architectural Boundaries

To preserve architectural integrity and avoid overclaiming, BRANDTRACE explicitly defines what it is **not**:
1. **Not an Automated Legal Decision System:** BRANDTRACE provides decision support and evidence triage. Final publication approval requires an authorized human decision maker.
2. **Not a Generative Copywriting Tool:** BRANDTRACE does not write marketing copy from scratch; its focus is inspecting and governing pre-written human or AI content.
3. **Not a Universal OCR Scanner:** OCR is supported on a best-effort basis for scanned images; digital document extraction is prioritized.
4. **Not a Perceptual 3D Layout Engine:** Visual asset analysis validates color accuracy, clearspace, and binary integrity, but does not claim complete 3D scene understanding.
