# BRANDTRACE — Geometric, Chromatic & Layout Logo Compliance Rules

## Executive Summary

BRANDTRACE evaluates detected logo candidates against seven deterministic brand compliance rules defined in the organization's **Brand Constitution**. Each rule produces quantitative numerical measurements, explains the observed deviation vs the expected standard, and generates structured findings for human governance review.

---

## 1. Aspect Ratio & Geometric Distortion Rule

### Policy Definition
Logos must never be squished, stretched, or non-uniformly scaled during layout design or document compilation.

### Mathematical Formulation
Let $\text{AR}_{\text{observed}} = \frac{W_{\text{detected}}}{H_{\text{detected}}}$ and $\text{AR}_{\text{target}}$ be the approved reference aspect ratio.
$$\text{Deviation \%} = \frac{\text{AR}_{\text{observed}} - \text{AR}_{\text{target}}}{\text{AR}_{\text{target}}} \times 100\%$$

### Compliance Classification
- **Compliant:** $|\text{Deviation \%}| \le \text{Tolerance}$ (default $\pm 5.0\%$).
- **Distorted (Stretched Horizontal):** $\text{Deviation \%} > +\text{Tolerance}$.
- **Distorted (Compressed Horizontal / Stretched Vertical):** $\text{Deviation \%} < -\text{Tolerance}$.

### Finding Emitted:
```json
{
  "finding_type": "DISTORTION_DETECTED",
  "severity": "HIGH",
  "title": "Distorted Logo Proportions (Stretched/Compressed)",
  "expected_standard": "Aspect ratio 3.000 (+/- 5.0%)",
  "observed_value": "Aspect ratio 5.000 (STRETCHED_HORIZONTAL)",
  "recommended_action": "Lock aspect ratio during resizing to ensure uniform scaling without distortion."
}
```

---

## 2. Color Science & Delta-E Chromatic Compliance Rule

### Policy Definition
All displayed logos must adhere strictly to approved corporate color swatches. Unapproved tints, gradients, or recolorings violate brand integrity.

### Mathematical Formulation
Colors are converted from device RGB to device-independent CIELAB ($L^*, a^*, b^*$) coordinates via CIE Standard Illuminant D65:
$$\Delta E^*_{\text{ab}} = \sqrt{(L^*_2 - L^*_1)^2 + (a^*_2 - a^*_1)^2 + (b^*_2 - b^*_1)^2}$$

### Anti-Aliasing & Background Filtering
In digital media and compressed PDFs/JPEGs:
1. **Perimeter Background Exclusion:** Outer border pixels of the crop region are sampled to determine canvas background color. All pixels within Euclidean distance $< 30$ are filtered out as background.
2. **Morphological Core Stroke Erosion:** A $3 \times 3$ erosion removes transitional anti-aliased edge ringing, isolating the pure solid interior fills.
3. **Calibrated Tolerance:** Digital tolerance is calibrated to $\Delta E \le 16.0$ CIE76, permitting DCT compression ringing while easily detecting unapproved colors (which exhibit $\Delta E > 50.0$).

---

## 3. Minimum Display Size Rule (Digital & Print)

### Digital Display Dimensions
- **Rule:** $\text{Width}_{\text{px}} \ge \text{Min Width}_{\text{px}}$ and $\text{Height}_{\text{px}} \ge \text{Min Height}_{\text{px}}$.
- **Default Standards:** Min $80 \times 24\text{ px}$.
- **Violation:** `LOGO_TOO_SMALL` (Severity: `MEDIUM`).

### Print / PDF Physical Dimensions
Physical measurements in Points ($\text{pt}$) and Millimeters ($\text{mm}$):
$$\text{Width}_{\text{pt}} = \frac{W_{\text{px}}}{W_{\text{rendered\_px}}} \times \text{Page Width}_{\text{pt}}, \quad \text{Width}_{\text{mm}} = \text{Width}_{\text{pt}} \times 0.352778$$
- **Default Print Standard:** $\ge 50.0\text{ pt}$ ($17.6\text{ mm}$).

---

## 4. Clearspace Exclusion Zone Rule

### Policy Definition
A mandatory buffer zone around the logo perimeter must remain completely free of text, borders, headers, and graphics.
$$\text{Clearspace Margin } M \ge 0.50 \times H_{\text{logo}}$$

### Verification Algorithm
1. Compute exclusion boundary:
$$[X - M, Y - M, X + W + M, Y + H + M]$$
2. Mask out the logo mark itself.
3. Apply Canny edge detection ($\sigma = 1.0, T_{\text{low}} = 50, T_{\text{high}} = 150$) within the exclusion margin.
4. Edge density $> 1.0\%$ in the margin flags an unambiguous `CLEARSPACE_VIOLATION`.
5. Proximity to canvas boundary is evaluated; if the margin infringes on canvas bounds, violating edges (`TOP`, `BOTTOM`, `LEFT`, `RIGHT`) are logged.

---

## 5. Cropping & Artwork Boundary Obstruction Rule

### Policy Definition
Logos must be fully visible and never cut off at canvas margins or clipped by container frames.

### Verification Algorithm
Let canvas bounds be $[0, 0, W_{\text{canvas}}, H_{\text{canvas}}]$:
- If $X \le 2$, clipped at `LEFT`.
- If $Y \le 2$, clipped at `TOP`.
- If $X + W \ge W_{\text{canvas}} - 2$, clipped at `RIGHT`.
- If $Y + H \ge H_{\text{canvas}} - 2$, clipped at `BOTTOM`.
If any edge is clipped and correlation $< 0.85$, flags `CROPPED_OR_OBSTRUCTED_LOGO`.

---

## 6. Permitted Placement Quadrants Rule

### Policy Definition
Guidelines may restrict logo placement to approved zones (e.g. Header Only, Top-Right Corner Only).

### Quadrant Centroid Classification
$$\bar{X} = X + \frac{W}{2}, \quad \bar{Y} = Y + \frac{H}{2}$$
- `TOP_LEFT`: $\bar{X} < 0.5 W_c \land \bar{Y} < 0.5 H_c$
- `TOP_RIGHT`: $\bar{X} \ge 0.5 W_c \land \bar{Y} < 0.5 H_c$
- `BOTTOM_LEFT`: $\bar{X} < 0.5 W_c \land \bar{Y} \ge 0.5 H_c$
- `BOTTOM_RIGHT`: $\bar{X} \ge 0.5 W_c \land \bar{Y} \ge 0.5 H_c$

Permitted presets: `ALL`, `TOP_LEFT`, `TOP_RIGHT`, `HEADER_ONLY`, `BOTTOM_RIGHT`.

---

## 7. Multi-Page PDF Policy (`enforce_on_every_page`)

When enabled in standards configuration:
- Every page in a multi-page PDF document is required to feature an approved logo mark.
- If Page $N$ contains no verified logo mark, a document-level `MISSING_REQUIRED_LOGO` finding is generated.
