# 42 — KNOWN LIMITATIONS AND TECHNICAL DEBT
**Platform:** BRANDTRACE
**Status:** **FULLY DOCUMENTED & TRANSPARENT**

---

## 1. Authentication & Role Simulation
- **Current State:** Role-based access control is simulated via HTTP headers (`X-Demo-Role` and `X-Workspace-Id`) for frictionless hackathon demonstration.
- **Enterprise Roadmap:** Integrate with OIDC / SAML 2.0 enterprise identity providers (Okta, Azure AD) using signed JWT bearer tokens.

---

## 2. Optical Character Recognition (OCR) Boundaries
- **Current State:** Pure-Python `pypdf` extracts digital text streams directly. Scanned pure-image PDFs without text streams provide diagnostic notices.
- **Enterprise Roadmap:** Integrate Tesseract OCR or Google Cloud Vision OCR for rasterized scanned documents.

---

## 3. Visual Layout Understanding
- **Current State:** Visual compliance verifies exact SHA-256 asset hashes, 64-bit dHash similarity, OpenCV logo clearspace, and CIELAB Delta-E color distance.
- **Enterprise Roadmap:** Implement deep learning object detection (YOLOv8) for complex 3D perspective distortion and font typography classification.
