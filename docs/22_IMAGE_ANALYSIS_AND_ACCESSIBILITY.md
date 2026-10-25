# Visual Image Analysis, Color Science, and WCAG Accessibility

## Overview of Visual Compliance

Visual assets—social banners, email headers, display ads, and UI mockups—communicate brand identity just as strongly as copy. However, visual compliance is frequently neglected in automated review systems. Non-compliant colors dilute brand equity, while poor contrast ratios violate accessibility laws (such as the Americans with Disabilities Act and European Accessibility Act).

BRANDTRACE incorporates a dedicated **Color Science and Visual Analysis Engine** (`color_science.py` and `image_analyzer.py`) that extracts color palettes, verifies adherence to brand colors via perceptual color distance, and calculates exact WCAG 2.1 contrast ratios.

```
+--------------------------------------------------------------------------+
|                       VISUAL ANALYSIS PIPELINE                           |
+--------------------------------------------------------------------------+
               Uploaded Creative Asset (PNG / JPEG)
                                 |
                                 v
                     [ Pillow (PIL.Image) ]
               - Max resolution downsampling (1200x1200)
               - Quantization & Dominant Palette Extraction
                                 |
        +------------------------+------------------------+
        |                                                 |
        v                                                 v
  [ CIELAB Delta-E (CIE76) ]                    [ WCAG 2.1 Relative Luminance ]
  Perceptual color distance to                  L = 0.2126*R + 0.7152*G + 0.0722*B
  approved primary/secondary tokens             Contrast Ratio = (L1+0.05)/(L2+0.05)
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

## Pillow Image Analysis (`backend/app/image_analyzer.py`)

The `image_analyzer.py` module manages raster image processing:
1. **Safety Pre-processing**: Inspects raw byte streams. If image dimensions exceed $1200 \times 1200$, it downsamples the image using bilinear interpolation to preserve memory.
2. **Palette Quantization**: Converts the image to RGB, runs median cut color quantization (`image.quantize(colors=6)`), and extracts dominant RGB clusters sorted by pixel frequency.
3. **Compliance Findings Generation**:
   * Measures extracted colors against the active workspace's `brand_profiles` table.
   * If the closest matching color to the primary brand token exhibits $\Delta E > 12.0$, generates a `MEDIUM` severity finding.
   * If dominant foreground/background combinations fail the 4.5:1 contrast threshold, generates an accessibility finding detailing exact measured ratios.

---

## Supported Capabilities vs. Technical Boundaries

To maintain transparency, the visual module's boundaries are explicitly defined:

### Fully Implemented & Supported
* Image formats: **PNG**, **JPEG/JPG**, and standard **WebP**.
* Dominant color palette extraction and percentage calculation.
* Deterministic WCAG 2.1 relative luminance and contrast calculations.
* CIE $L^*a^*b^*$ conversion and $\Delta E_{76}$ brand color verification.

### Not Implemented in Current Release
* **Optical Character Recognition (OCR)**: Scanned text in graphics is not transcribed unless system-level Tesseract is installed and linked to PATH.
* **Logo Clearspace & Bounding Box Detection**: Identifying the physical position of brand logos within an image layout is scheduled for Round 3.
* **Font Family Identification**: Classifying typography directly from raster pixel grids is outside current release boundaries.
