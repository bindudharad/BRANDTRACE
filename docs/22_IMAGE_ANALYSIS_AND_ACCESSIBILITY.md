# Visual Image Analysis, Color Science, and WCAG Accessibility

## Overview of Visual Compliance

Visual assets—social banners, email headers, display ads, and UI mockups—communicate brand identity just as strongly as copy. However, visual compliance is frequently neglected in automated review systems. Non-compliant colors dilute brand equity, while poor contrast ratios violate accessibility laws (such as the Americans with Disabilities Act and European Accessibility Act).

BRANDTRACE incorporates a dedicated **Color Science and Visual Analysis Engine** (`color_science.py` and `image_analyzer.py`) that extracts color palettes, verifies adherence to brand colors via perceptual color distance, calculates exact WCAG 2.1 contrast ratios, and verifies binary assets against an approved **Brand Asset Registry**.

```
+--------------------------------------------------------------------------+
|                       VISUAL ANALYSIS PIPELINE                           |
+--------------------------------------------------------------------------+
               Uploaded Creative Asset (PNG / JPEG)
                                 |
                 +---------------+---------------+
                 |                               |
                 v                               v
       [ Binary Hash Extraction ]      [ Pillow (PIL.Image) ]
       SHA-256 content checksum        - Downsampling (1200x1200)
                 |                     - Quantization (6 dominant colors)
                 v                               |
    [ Brand Asset Registry ]         +-----------+-----------+
    Lookup in `brand_assets`         |                       |
    - APPROVED: `SUPPORTED`          v                       v
    - RESTRICTED: `CONTRADICTED` [ CIELAB Delta-E ]  [ WCAG 2.1 Contrast ]
    - UNREGISTERED: `NEEDS_REVIEW`
```

---

## Color Science Foundations (`backend/app/color_science.py`)

The color science module is a standalone, deterministic Python module implementing W3C and CIE standards without third-party mathematical dependencies:

### 1. W3C WCAG 2.1 Relative Luminance
Relative luminance ($L$) models the human eye's spectral sensitivity to light under sRGB:
$$L = 0.2126 \cdot R_{\text{linear}} + 0.7152 \cdot G_{\text{linear}} + 0.0722 \cdot B_{\text{linear}}$$
Where each channel $C \in \{R, G, B\}$ is converted from 8-bit sRGB ($0..255$) to linear light:
$$C_{\text{linear}} = \begin{cases}
\frac{C / 255}{12.92} & \text{if } C/255 \le 0.03928 \\
\left(\frac{C/255 + 0.055}{1.055}\right)^{2.4} & \text{otherwise}
\end{cases}$$

### 2. WCAG Contrast Ratio Calculation
The contrast ratio between two colors with luminances $L_1$ (lighter) and $L_2$ (darker) is:
$$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$
* The result ranges from $1.0:1$ (identical) to $21.0:1$ (pure black on pure white).
* **Compliance Thresholds**:
  * **Normal Text**: Requires at least **4.5:1** (WCAG AA).
  * **Large Text / UI Elements**: Requires at least **3.0:1** (WCAG AA).

### 3. CIELAB Perceptual Color Distance ($\Delta E$)
Hex colors operate in non-uniform RGB space. To determine whether an extracted color accurately matches an approved brand color, the module converts sRGB to CIE $L^*a^*b^*$ space (via D65 illuminant XYZ intermediate matrices) and computes CIE76 Euclidean distance:
$$\Delta E_{76} = \sqrt{(\Delta L^*)^2 + (\Delta a^*)^2 + (\Delta b^*)^2}$$
* $\Delta E < 2.0$: Imperceptible difference to normal human observers.
* $\Delta E > 6.0$: Perceptible color deviation; flagged as non-compliant brand drift.

---

## Brand Asset Registry & Hash Verification (Round 3)

The `brand_assets` table registers approved corporate creative assets (logos, lockups, badges, icons) with immutable binary checksums:

* `content_hash`: SHA-256 hexadecimal digest of raw asset bytes.
* `approval_status`: `APPROVED`, `RESTRICTED`, `UNKNOWN`, or `REVIEW_REQUIRED`.
* `license_status` & `license_notes`: Rights, attribution requirements, and territorial licensing bounds.

### Verification Flow on Image Upload:
1. When an image is uploaded to `POST /api/reviews/upload`, the server computes the SHA-256 hash.
2. The hash is looked up in `brand_assets`:
   * **Matching `APPROVED` Asset**: Status is `SUPPORTED`. Finding indicates verified authorized asset.
   * **Matching `RESTRICTED` Asset**: Status is `CONTRADICTED` (`HIGH` severity). Alerts reviewer that asset is retired, unreleased, or unlicensed.
   * **Unregistered Asset**: Status is `NEEDS_REVIEW` (`MEDIUM` severity). Alerts human reviewer that asset lacks corporate registry backing.

---

## Pillow Image Analysis (`backend/app/image_analyzer.py`)

The `image_analyzer.py` module manages raster image processing:
1. **Safety Pre-processing**: Inspects raw byte streams. If image dimensions exceed $1200 \times 1200$, it downsamples the image using bilinear interpolation to preserve memory.
2. **Palette Quantization**: Converts the image to RGB, runs median cut color quantization (`image.quantize(colors=6)`), and extracts dominant RGB clusters sorted by pixel frequency.
3. **Categorized Findings Generation**:
   * `visual_palette`: Measures extracted colors against the active workspace's approved tokens. If $\Delta E > 12.0$, generates a palette divergence finding with measured hex values.
   * `visual_contrast`: Evaluates contrast between dominant colors. Flags combinations failing the 4.5:1 ratio.
   * `visual_asset`: Records asset registry lookup results.

---

## Supported Capabilities vs. Technical Boundaries

### Fully Implemented & Supported
* Image formats: **PNG**, **JPEG/JPG**, and standard **WebP**.
* SHA-256 binary hash matching against `brand_assets` registry.
* Dominant color palette extraction and percentage calculation.
* Deterministic WCAG 2.1 relative luminance and contrast calculations.
* CIE $L^*a^*b^*$ conversion and $\Delta E_{76}$ brand color verification.
* Structured finding categories: `visual_palette`, `visual_contrast`, `visual_asset`.

### Not Implemented in Current Release
* **Optical Character Recognition (OCR)**: Scanned text in graphics is not transcribed unless system-level Tesseract is installed and linked to PATH.
* **Complex Object Detection**: Semantic bounding box object detection (e.g. YOLO/Faster-RCNN) is omitted in favor of lightweight, deterministic pixel analysis.
