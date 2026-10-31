# BRANDTRACE — REFERENCE-BASED LOGO INTELLIGENCE & VISUAL COMPLIANCE ENGINE
**Subsystem:** Multimodal Visual Brand Compliance Architecture  
**Date:** 2026-10-31  
**Authors:** Team_Nexus (Principal CV Architect, Senior Full-Stack Engineer)  

---

## 1. Architectural Overview

The BRANDTRACE Logo Intelligence subsystem is a production-oriented, multi-layered visual brand verification engine. Rather than relying on rigid exact binary hashing (`SHA-256`), which fails under minor JPEG re-compression, scaling, or antialiasing, BRANDTRACE implements a reference-based computer vision architecture that separates **Logo Identity Recognition** from **Usage Compliance Verification**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    LOGO INTELLIGENCE PIPELINE ARCHITECTURE                     │
├─────────────────────┬───────────────────────────────┬───────────────────────────┤
│ 1. INGESTION        │ 2. RECOGNITION (IDENTITY)     │ 3. COMPLIANCE (USAGE)     │
├─────────────────────┼───────────────────────────────┼───────────────────────────┤
│ Artwork Image (PNG) │ Multi-layer Perceptual Hash   │ CIELAB Delta-E (Color)    │
│ Multi-Page PDF      │ (dHash, aHash, wHash, pHash)  │ Aspect Ratio Distortion   │
│ Vector Rasterization│ Multi-Scale Template Matching │ Clearspace Buffer Zone    │
│ PyMuPDF Page Stream │ Keypoint & Contour Comparison │ Minimum Size Thresholds   │
└─────────────────────┴───────────────────────────────┴───────────────────────────┘
```

---

## 2. Reference Asset Registration & Standards Lifecycle

### Reference Asset Schema (`logo_references` table)
Each approved corporate reference logo stores:
- `id`: Unique identifier (`ref_xxxx`).
- `workspace_id`: Tenant workspace scoping.
- `name`: Display name (e.g., "Aster Labs Primary Horizontal").
- `variant`: `primary`, `horizontal`, `vertical`, `symbol`, `wordmark`, `monochrome`, `reversed`.
- `category`: `official`, `partner`, `sub_brand`.
- `file_path` & `sha256`: Storage location and exact binary cryptographic fingerprint.
- `width` & `height`: Native pixel dimensions.
- `aspect_ratio`: Native width-to-height ratio ($W / H$).
- `primary_color` & `secondary_color`: Dominant extracted hexadecimal color codes.
- `status`: `PENDING_APPROVAL`, `APPROVED`, `DEACTIVATED`, `SUPERSEDED`.
- `version`: Monotonically increasing version counter.
- `created_at` & `approved_at`: Immutable timestamps.

### Configurable Usage Standards (`standards_json`)
Administrators configure precise tolerances per logo variant:
1. `approved_colors`: Array of approved hexadecimal color codes (e.g., `["#173B63", "#18A999", "#FFFFFF"]`).
2. `color_tolerance_delta_e`: Maximum permitted CIELAB Delta-E difference (default: 5.0).
3. `min_width` & `min_height`: Minimum permitted displayed size in pixels / points.
4. `aspect_ratio_tolerance`: Maximum permitted stretch / squeeze distortion (default: 3%).
5. `min_clearspace_ratio`: Minimum buffer zone surrounding the mark relative to height (default: 0.25).
6. `permitted_backgrounds`: Permitted background luminance / contrast profiles (`dark`, `light`, `transparent`).

---

## 3. Layered Recognition & Verification Engine

When an artwork image or multi-page PDF is analyzed:

### Layer 1: Cryptographic Match (Fast Path)
Computes SHA-256 digest of candidate bounding box bytes. If identical to an approved reference, identity confidence is $1.00$.

### Layer 2: Multi-Scale Perceptual Hashing
Computes difference hash (`dHash`), average hash (`aHash`), and perceptual discrete cosine transform hash (`pHash`).
- Hamming distance $\le 4$: Match confidence $\ge 0.95$.
- Hamming distance $\le 10$: Match confidence $\ge 0.80$.

### Layer 3: Geometric & Color Compliance Evaluation
Once identity is matched against an approved reference, the engine independently evaluates 8 compliance dimensions:
1. **Aspect Ratio Preservation:** Detects non-uniform horizontal or vertical stretching.
2. **Color Fidelity:** Computes perceptual Delta-E in CIELAB space against configured approved colors.
3. **Display Size Compliance:** Checks candidate dimensions against `min_width` and `min_height`.
4. **Clearspace Zone:** Analyzes the outer bounding perimeter for intruding text or graphical elements.
5. **Resolution Adequacy:** Flags pixelation or sub-sampling below configured DPI thresholds.
6. **Background Contrast:** Calculates WCAG contrast between logo boundary and surrounding page canvas.

---

## 4. Discrete Classification Schema

Every candidate detection yields one of the following authoritative classifications:

| Classification | Meaning | Recommended Action |
| :--- | :--- | :--- |
| `APPROVED_MATCH` | Matches approved reference and satisfies all usage standards | Safe for production publication |
| `STYLE_MISMATCH` | Detected logo alters approved typography, symbol, or arrangement | Revert to official brand asset |
| `COLOUR_MISMATCH` | Detected logo colors deviate from approved brand palette ($\Delta E > 5.0$) | Use approved brand color values |
| `DISTORTION_DETECTED`| Logo aspect ratio deformed beyond 3% tolerance | Constrain aspect ratio during resizing |
| `LOGO_TOO_SMALL` | Logo dimensions below minimum legibility standard | Increase logo scale to approved size |
| `LOGO_TOO_LARGE` | Logo dimensions exceed configured maximum boundary | Scale down logo to standard placement |
| `CLEARSPACE_VIOLATION`| Other content intrudes into required perimeter buffer | Provide required clearspace margin |
| `VARIANT_MISMATCH` | Used variant does not match permitted context | Replace with approved variant |
| `CROPPED_OR_OBSTRUCTED`| Part of the logo mark is cut off by document edge | Reposition logo inside page margins |
| `LOW_RESOLUTION_LOGO` | Insufficient pixel density causing blur or artifacting | Provide high-resolution vector/raster |
| `UNRECOGNISED_LOGO` | Graphical element present with no reference match | Review or register reference logo |
| `REFERENCE_NOT_CONFIGURED`| Organization has not uploaded an approved reference | Upload official corporate logo standard |
| `NEEDS_REVIEW` | Borderline similarity requiring human brand reviewer judgment | Human brand reviewer inspection |
| `ANALYSIS_FAILED` | Corrupt image payload or extraction error | Resubmit file in valid format |

---

## 5. Architectural Separation: Identity vs. Usage

A fundamental tenet of BRANDTRACE is that **Identity Matching** and **Usage Compliance** are independent:
- An uploaded asset may be recognized with 99% confidence as the **Aster Labs Primary Logo** (`APPROVED_MATCH` on identity), yet simultaneously be flagged as `LOGO_TOO_SMALL` and `CLEARSPACE_VIOLATION` (Non-Compliant on usage).
- Uniform resizing is never incorrectly flagged as a style mismatch.
