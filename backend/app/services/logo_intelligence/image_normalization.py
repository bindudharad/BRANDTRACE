"""
Image normalization, EXIF handling, and color channel processing for BRANDTRACE Logo Intelligence.
"""
from __future__ import annotations

import hashlib
import io
from typing import Any, Dict, Optional, Tuple

import cv2
import numpy as np
from PIL import Image, ImageOps


def compute_sha256(data: bytes) -> str:
    """Compute cryptographic SHA-256 hex digest."""
    return hashlib.sha256(data).hexdigest()


def load_pil_image(data: bytes) -> Image.Image:
    """Load image bytes into PIL Image, normalizing EXIF orientation."""
    if not data or len(data) < 10:
        raise ValueError("Image data buffer is empty or corrupted.")
    try:
        img = Image.open(io.BytesIO(data))
        # Auto-orient based on EXIF tag if present
        img = ImageOps.exif_transpose(img)
        return img
    except Exception as exc:
        raise ValueError(f"Failed to decode image data: {exc}")


def load_opencv_images(data: bytes) -> Tuple[np.ndarray, np.ndarray, Optional[np.ndarray]]:
    """
    Load image bytes into OpenCV representations.
    Returns:
        (bgr_image, gray_image, alpha_mask_or_None)
    """
    pil_img = load_pil_image(data)
    img_np = np.array(pil_img)

    alpha_mask = None
    if pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info):
        rgba = pil_img.convert("RGBA")
        rgba_np = np.array(rgba)
        bgr = cv2.cvtColor(rgba_np, cv2.COLOR_RGBA2BGR)
        gray = cv2.cvtColor(rgba_np, cv2.COLOR_RGBA2GRAY)
        alpha_mask = rgba_np[:, :, 3]
    else:
        rgb = pil_img.convert("RGB")
        rgb_np = np.array(rgb)
        bgr = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2GRAY)

    return bgr, gray, alpha_mask


def get_image_dimensions_and_hash(data: bytes) -> Dict[str, Any]:
    """Inspect image bytes and extract core geometric & hash metadata."""
    pil_img = load_pil_image(data)
    w, h = pil_img.size
    has_transparency = False
    if pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info):
        alpha = pil_img.convert("RGBA").split()[3]
        min_alpha, _ = alpha.getextrema()
        if min_alpha < 250:
            has_transparency = True

    aspect = round(w / float(h), 4) if h > 0 else 1.0

    return {
        "width": w,
        "height": h,
        "aspect_ratio": aspect,
        "file_size": len(data),
        "sha256": compute_sha256(data),
        "has_transparency": has_transparency,
        "format": (pil_img.format or "PNG").upper(),
    }
