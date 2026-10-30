---
project: BRANDTRACE
document_type: Technical Documentation
status: Current
last_verified: 2026-10-30
source_of_truth: Repository implementation
---

# 24 — WCAG Contrast and Limitations

## Purpose

This document details the mathematical algorithms, implementation specifics, and operational limitations of the Web Content Accessibility Guidelines (WCAG 2.1) color contrast evaluation system in **BRANDTRACE** (`backend/app/color_science.py`).

---

## 1. Algorithmic Foundation

The BRANDTRACE color science module implements the official W3C WCAG 2.1 specification for relative luminance and contrast ratio between foreground text and background colors.

### Relative Luminance ($L$)

Relative luminance represents the relative brightness of any point in a colorspace, normalized to 0 for darkest black and 1 for lightest white. For the sRGB colorspace, the relative luminance of a color is defined as:

$$L = 0.2126 \cdot R_{lin} + 0.7152 \cdot G_{lin} + 0.0722 \cdot B_{lin}$$

where $R_{lin}$, $G_{lin}$, and $B_{lin}$ represent linearized sRGB color components:

$$C_{lin} = \begin{cases} \frac{C_{srgb}}{12.92} & \text{if } C_{srgb} \le 0.04045 \\ \left(\frac{C_{srgb} + 0.055}{1.055}\right)^{2.4} & \text{if } C_{srgb} > 0.04045 \end{cases}$$

Here, $C_{srgb} = \frac{C}{255}$ for $C \in \{R, G, B\}$.

### Contrast Ratio ($CR$)

The contrast ratio is calculated between the lighter relative luminance ($L_1$) and darker relative luminance ($L_2$):

$$CR = \frac{L_1 + 0.05}{L_2 + 0.05} \quad \text{where } L_1 \ge L_2$$

The resulting ratio ranges from $1:1$ (identical colors, zero contrast) to $21:1$ (pure black `#000000` versus pure white `#FFFFFF`).

---

## 2. Compliance Thresholds (WCAG 2.1)

BRANDTRACE assesses calculated contrast ratios against standard WCAG 2.1 Level AA and Level AAA thresholds:

| Criterion | Level AA Minimum | Level AAA Minimum | Implementation in BRANDTRACE |
| :--- | :--- | :--- | :--- |
| **Normal Text** (< 18pt or < 14pt bold) | **4.5 : 1** | **7.0 : 1** | Evaluated for declared typography pairs |
| **Large Text** ($\ge$ 18pt or $\ge$ 14pt bold) | **3.0 : 1** | **4.5 : 1** | Evaluated for headings and hero copy |
| **UI Components & Graphical Objects** | **3.0 : 1** | N/A | Evaluated for buttons, borders, and icons |

---

## 3. Implementation in Code

In `backend/app/color_science.py`, the contrast evaluation is exposed via:

```python
def calculate_relative_luminance(rgb: tuple[int, int, int]) -> float:
    """Calculates relative luminance according to WCAG 2.1 formula."""
    r, g, b = [c / 255.0 for c in rgb]
    r_lin = r / 12.92 if r <= 0.04045 else ((r + 0.055) / 1.055) ** 2.4
    g_lin = g / 12.92 if g <= 0.04045 else ((g + 0.055) / 1.055) ** 2.4
    b_lin = b / 12.92 if b <= 0.04045 else ((b + 0.055) / 1.055) ** 2.4
    return 0.2126 * r_lin + 0.7152 * g_lin + 0.0722 * b_lin

def calculate_contrast_ratio(rgb1: tuple[int, int, int], rgb2: tuple[int, int, int]) -> float:
    """Calculates contrast ratio between two RGB colors (returns 1.0 to 21.0)."""
    l1 = calculate_relative_luminance(rgb1)
    l2 = calculate_relative_luminance(rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
```

---

## 4. Technical Scope and Explicit Boundaries

To maintain rigorous engineering honesty, the exact boundaries of BRANDTRACE's accessibility verification are defined as follows:

### What Is Implemented
1. **Token-to-Token Pair Analysis**: Rigorous contrast calculation between explicitly declared foreground (text) and background hex colors.
2. **Brand Profile Color Palette Testing**: Verification that brand primary, secondary, and accent colors satisfy minimum contrast ratios when paired with light and dark surfaces.
3. **Deterministic Pass/Fail Scoring**: Unambiguous reporting of contrast ratios against WCAG 2.1 AA (4.5:1 / 3.0:1) thresholds.

### What Is Deferred / Excluded
1. **Arbitrary Image Text Segmentation**: BRANDTRACE does **not** perform automatic pixel-level text contrast segmentation across arbitrary raster images without text coordinate bounding boxes (which would require an OCR engine).
2. **Gradient and Texture Background Analysis**: BRANDTRACE evaluates dominant or declared flat color values; it does not compute localized variance across multi-color photographic backgrounds or complex CSS mesh gradients.
3. **Anti-Aliasing Sub-Pixel Blending**: Contrast is evaluated between solid base color values, excluding sub-pixel font rasterization edge bleeding.
