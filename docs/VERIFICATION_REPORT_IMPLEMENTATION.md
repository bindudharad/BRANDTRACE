# BRANDTRACE — OFFICIAL LOGO VERIFICATION REPORT GENERATOR
**Architecture Specification:** ReportLab Dynamic Two-Pass PDF Generation  
**Date:** 2026-10-31  
**Module:** `backend/app/services/logo_report_generator.py`  
**Endpoint:** `POST /api/logo-intelligence/reports`, `GET /api/logo-intelligence/reports/{id}/download`  

---

## 1. System Objective & Core Constraints

The BRANDTRACE Verification Report generator produces an official, standalone, downloadable PDF document certifying the outcomes of reference-based logo verification and visual compliance analysis.

### Non-Negotiable Operational Constraints
1. **Analysis Report Only:** The generator outputs a forensic compliance report. It **never reproduces the entire uploaded PDF or document text**.
2. **Deterministic Data Grounding:** Reports are generated strictly from persisted backend analysis records (`logo_analyses` and `logo_findings` tables). No visual overlays or numbers are fabricated.
3. **Cryptographic Integrity:** Every report calculates a `SHA-256` digest across the source asset, reference asset, and compliance findings, guaranteeing tamper-evident authenticity.
4. **Historical Snapshot Preservation:** Once issued, report records are immutable. Changing organization brand standards later never alters historical verification reports.

---

## 2. Dynamic Two-Pass Canvas Architecture

Single-pass PDF engines cannot determine total page counts before flowables are completely laid out. To guarantee exact pagination (`Page X of Y`) on multi-page vector reports, BRANDTRACE implements `NumberedVerificationCanvas`:

```python
class NumberedVerificationCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        # Save page drawing commands in memory for pass two
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)  # Renders "Page X of Y" and SHA-256 footer
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)
```

---

## 3. Official Report Anatomy

### Header & Metadata
- **Title:** `BRANDTRACE`
- **Subtitle:** `OFFICIAL LOGO VERIFICATION REPORT`
- **Document Identification:** Unique Report Number (`rep_20261031_xxxx`), Analysis ID, Workspace ID.
- **Asset Metadata:** Filename, File Size, Source Format (`image/png` or `application/pdf`), SHA-256 Checksum.
- **Reference Standard:** Matched Reference Name, Variant, Reference Version, Standards Version.

### Overall Compliance Status Badge
Rendered with distinct color profiles:
- `COMPLIANT` (Emerald `#0A7352`) — All mandatory evaluated checks satisfied.
- `NON_COMPLIANT` (Rose `#E11D48`) — High or Critical violations detected.
- `NEEDS_REVIEW` (Amber `#D97706`) — Ambiguous match requiring human reviewer sign-off.

### 8-Dimension Compliance Matrix
Each dimension evaluates expected standard vs. measured reality:
1. **Logo Identity & Variant:** Approved reference match vs. candidate visual profile.
2. **Aspect Ratio Preservation:** Native ratio vs. measured ratio ($\Delta \le 3\%$).
3. **Color Accuracy:** Approved hex codes vs. measured CIELAB Delta-E ($\le 5.0$).
4. **Minimum Display Size:** Configured print/display minimums vs. candidate bounding box.
5. **Clearspace Buffer Zone:** Required margin ratio ($0.25 \times H$) vs. detected intrusion.
6. **Geometric Distortion:** Stretch / skew deformation evaluation.
7. **Resolution Density:** Minimum DPI / pixel density verification.
8. **Background Contrast:** WCAG contrast against underlying page canvas.

### Page-Indexed Finding Schedule
For multi-page documents, each violation details:
- `Finding ID` & `Page Number`
- `Violation Type` (e.g., `DISTORTION_DETECTED`, `COLOUR_MISMATCH`)
- `Severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`)
- `Measured Evidence` (e.g., `Aspect ratio distorted by 14.2% (1.85 vs. expected 1.62)`)
- `Recommended Remediation Action`

### Official Issuing Conclusion
Computed strictly from real persisted findings:
- *Compliant:* "BRANDTRACE analysed the submitted asset against the configured approved logo reference and applicable logo standards. All evaluated mandatory checks passed. No deviations were detected within the evaluated scope."
- *Non-Compliant:* "BRANDTRACE identified logo compliance deviations. The supporting findings and measurements are included in this report."
- *Needs Review:* "Some required logo characteristics could not be conclusively verified. Human review is recommended."

### Legal Disclaimer
"This report reflects the checks performed by BRANDTRACE using the approved references and configured standards available at the time of analysis. It is not a universal guarantee of legal, design or brand compliance."
