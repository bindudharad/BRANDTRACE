"""
Color science and WCAG accessibility module for BRANDTRACE.
Deterministic, standalone implementation of W3C WCAG 2.1 relative luminance
and CIELAB colour difference (Delta-E CIE76) calculations.
"""
from __future__ import annotations

import math
from typing import Tuple

def hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Convert hex string (e.g. '#2dd4bf' or '2dd4bf') to RGB tuple."""
    cleaned = hex_str.strip().lstrip("#")
    if len(cleaned) == 3:
        cleaned = "".join(c * 2 for c in cleaned)
    if len(cleaned) != 6:
        raise ValueError(f"Invalid hex color format: {hex_str}")
    return (int(cleaned[0:2], 16), int(cleaned[2:4], 16), int(cleaned[4:6], 16))

def rgb_to_hex(rgb: Tuple[int, int, int]) -> str:
    """Convert RGB tuple to standard #RRGGBB hex string."""
    r = max(0, min(255, int(rgb[0])))
    g = max(0, min(255, int(rgb[1])))
    b = max(0, min(255, int(rgb[2])))
    return f"#{r:02x}{g:02x}{b:02x}"

def relative_luminance(rgb: Tuple[int, int, int]) -> float:
    """
    Calculate W3C WCAG 2.1 relative luminance of an sRGB color.
    Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
    where channel = c/255 <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4
    """
    def channel_linear(val: int) -> float:
        s = val / 255.0
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    r = channel_linear(rgb[0])
    g = channel_linear(rgb[1])
    b = channel_linear(rgb[2])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast_ratio(color_a: Tuple[int, int, int], color_b: Tuple[int, int, int]) -> float:
    """
    Calculate WCAG contrast ratio between two RGB colors.
    Returns float between 1.0 and 21.0.
    """
    l1 = relative_luminance(color_a)
    l2 = relative_luminance(color_b)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return round((lighter + 0.05) / (darker + 0.05), 2)

def rgb_to_cielab(rgb: Tuple[int, int, int]) -> Tuple[float, float, float]:
    """
    Convert sRGB (D65 illuminant, 2-degree observer) to CIELAB (L*, a*, b*).
    """
    # 1. sRGB to linear RGB
    def to_linear(c: int) -> float:
        v = c / 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    r_lin = to_linear(rgb[0])
    g_lin = to_linear(rgb[1])
    b_lin = to_linear(rgb[2])

    # 2. Linear RGB to XYZ (D65 reference white)
    x = r_lin * 0.4124564 + g_lin * 0.3575761 + b_lin * 0.1804375
    y = r_lin * 0.2126729 + g_lin * 0.7151522 + b_lin * 0.0721750
    z = r_lin * 0.0193339 + g_lin * 0.1191920 + b_lin * 0.9503041

    # D65 white point reference
    xn, yn, zn = 0.95047, 1.00000, 1.08883

    xr = x / xn
    yr = y / yn
    zr = z / zn

    epsilon = 0.008856
    kappa = 903.3

    def f(t: float) -> float:
        return t ** (1.0 / 3.0) if t > epsilon else (kappa * t + 16.0) / 116.0

    fx = f(xr)
    fy = f(yr)
    fz = f(zr)

    l_star = max(0.0, 116.0 * fy - 16.0)
    a_star = 500.0 * (fx - fy)
    b_star = 200.0 * (fy - fz)

    return (round(l_star, 3), round(a_star, 3), round(b_star, 3))

def delta_e(color_a: Tuple[int, int, int], color_b: Tuple[int, int, int]) -> float:
    """
    Calculate perceptual colour difference (Delta-E CIE76) between two RGB colors.
    <= 1.0: Not perceptible to human eye.
    1.0 - 2.0: Perceptible through close observation.
    2.0 - 10.0: Perceptible at a glance.
    11.0 - 49.0: Colors are more similar than opposite.
    100.0: Colors are exact opposite.
    """
    lab1 = rgb_to_cielab(color_a)
    lab2 = rgb_to_cielab(color_b)
    diff = math.sqrt(
        (lab1[0] - lab2[0]) ** 2 +
        (lab1[1] - lab2[1]) ** 2 +
        (lab1[2] - lab2[2]) ** 2
    )
    return round(diff, 2)
