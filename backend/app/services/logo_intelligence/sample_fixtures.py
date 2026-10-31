"""
Synthetic demo fixtures and test asset generation for Logo Intelligence evaluation.
Generates approved sample references and deliberate negative test variants.
"""
from __future__ import annotations

import io
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from .reference_registry import register_reference_logo, approve_reference_logo


def generate_synthetic_logo(
    primary_color: Tuple[int, int, int] = (10, 115, 82),  # #0a7352 Emerald
    secondary_color: Tuple[int, int, int] = (17, 24, 39),  # #111827 Slate
    text: str = "NEXUS",
    symbol_type: str = "diamond",  # "diamond", "hexagon", "altered"
    width: int = 300,
    height: int = 100,
    background: Optional[Tuple[int, int, int, int]] = None,
) -> bytes:
    """
    Generate synthetic clean logo image bytes.
    Default aspect ratio: 3.0 (300 x 100).
    """
    # Create RGBA canvas
    img = Image.new("RGBA", (width, height), background or (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Draw geometric symbol on left
    sym_size = int(height * 0.65)
    sym_x = int(width * 0.08)
    sym_y = int((height - sym_size) / 2)

    cx = sym_x + sym_size // 2
    cy = sym_y + sym_size // 2
    radius = sym_size // 2

    if symbol_type == "diamond":
        # Approved primary symbol: 4-pointed diamond mark
        points = [(cx, cy - radius), (cx + radius, cy), (cx, cy + radius), (cx - radius, cy)]
        draw.polygon(points, fill=primary_color + (255,))
        # Inner cutout
        inner_r = radius // 2
        inner_pts = [(cx, cy - inner_r), (cx + inner_r, cy), (cx, cy + inner_r), (cx - inner_r, cy)]
        draw.polygon(inner_pts, fill=(255, 255, 255, 255) if not background else background)
    elif symbol_type == "altered":
        # Modified symbol for negative test: jagged star/circle
        draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(220, 38, 38, 255))
        # Asymmetrical slice
        draw.rectangle([cx, cy - radius, cx + radius, cy + radius], fill=(255, 255, 255, 255))
    else:
        # Monochrome or alternate geometry
        draw.rectangle([cx - radius, cy - radius, cx + radius, cy + radius], fill=primary_color + (255,))

    # Draw wordmark text on right
    # Clear scalable lettering for deterministic cross-platform rendering
    text_x = sym_x + sym_size + int(width * 0.06)
    text_y = int(height * 0.22)

    try:
        font_large = ImageFont.load_default(size=32)
        font_small = ImageFont.load_default(size=14)
    except Exception:
        font_large = ImageFont.load_default()
        font_small = font_large

    draw.text((text_x, text_y), text, fill=secondary_color + (255,), font=font_large)
    # Draw subtitle "LOGISTICS"
    draw.text((text_x, text_y + 36), "LOGISTICS", fill=(100, 116, 139, 255), font=font_small)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def get_all_demo_fixtures() -> Dict[str, bytes]:
    """
    Generate the complete canonical suite of positive and negative test fixtures:
    1. Approved Primary Logo (Horizontal)
    2. Approved Monochrome Logo (Dark)
    3. Approved Reversed Logo (White)
    4. Deliberately Modified Symbol Logo (Negative test: STYLE_MISMATCH)
    5. Deliberately Stretched Logo (Negative test: DISTORTION_DETECTED)
    6. Deliberately Incorrectly Colored Logo (Negative test: COLOUR_MISMATCH)
    7. Deliberately Undersized Logo (Negative test: LOGO_TOO_SMALL)
    8. Deliberately Cropped Logo (Negative test: CROPPED_OR_OBSTRUCTED_LOGO)
    """
    primary = generate_synthetic_logo(
        primary_color=(10, 115, 82),
        secondary_color=(17, 24, 39),
        text="NEXUS",
        symbol_type="diamond",
        width=300,
        height=100,
    )

    monochrome = generate_synthetic_logo(
        primary_color=(17, 24, 39),
        secondary_color=(17, 24, 39),
        text="NEXUS",
        symbol_type="diamond",
        width=300,
        height=100,
    )

    reversed_white = generate_synthetic_logo(
        primary_color=(255, 255, 255),
        secondary_color=(240, 240, 240),
        text="NEXUS",
        symbol_type="diamond",
        width=300,
        height=100,
    )

    # Negative 1: Modified symbol
    modified_symbol = generate_synthetic_logo(
        primary_color=(220, 38, 38),
        secondary_color=(17, 24, 39),
        text="NEXUS",
        symbol_type="altered",
        width=300,
        height=100,
    )

    # Negative 2: Stretched horizontally (Aspect ratio = 5.0 instead of 3.0)
    p_img = Image.open(io.BytesIO(primary))
    stretched_img = p_img.resize((500, 100), Image.Resampling.LANCZOS)
    st_buf = io.BytesIO()
    stretched_img.save(st_buf, format="PNG")
    stretched = st_buf.getvalue()

    # Negative 3: Incorrectly colored (Purple / Hot Pink unapproved colors)
    recolored = generate_synthetic_logo(
        primary_color=(147, 51, 234),  # Purple
        secondary_color=(219, 39, 119),  # Hot Pink
        text="NEXUS",
        symbol_type="diamond",
        width=300,
        height=100,
    )

    # Negative 4: Undersized (40 x 14 px)
    undersized = generate_synthetic_logo(
        primary_color=(10, 115, 82),
        secondary_color=(17, 24, 39),
        text="NEXUS",
        symbol_type="diamond",
        width=40,
        height=14,
    )

    # Negative 5: Cropped (Left 40% cut off)
    full_img = Image.open(io.BytesIO(primary))
    cropped_img = full_img.crop((120, 0, 300, 100))
    buf = io.BytesIO()
    cropped_img.save(buf, format="PNG")
    cropped = buf.getvalue()

    return {
        "approved_primary": primary,
        "approved_monochrome": monochrome,
        "approved_reversed": reversed_white,
        "negative_modified_symbol": modified_symbol,
        "negative_stretched": stretched,
        "negative_recolored": recolored,
        "negative_undersized": undersized,
        "negative_cropped": cropped,
    }


def seed_demo_logo_references(workspace_id: str = "ws_default") -> List[Dict[str, Any]]:
    """
    Seed the fictional 'NEXUS Brand Standards' reference logos and approved color standards into the database.
    """
    fixtures = get_all_demo_fixtures()

    # 1. Primary Horizontal
    ref1 = register_reference_logo(
        file_bytes=fixtures["approved_primary"],
        filename="nexus_logo_primary_horizontal.png",
        name="Nexus Primary Brand Logo",
        workspace_id=workspace_id,
        category="primary",
        variant="primary_horizontal",
        owner_id="system.brand_admin",
        description="Official synthetic primary logo for Nexus Logistics demonstration.",
        auto_approve=True,
        approved_colors=["#0a7352", "#111827", "#ffffff"],
    )

    # 2. Black Monochrome
    ref2 = register_reference_logo(
        file_bytes=fixtures["approved_monochrome"],
        filename="nexus_logo_monochrome.png",
        name="Nexus Monochrome Dark Logo",
        workspace_id=workspace_id,
        category="primary",
        variant="black_monochrome",
        owner_id="system.brand_admin",
        description="Official dark monochrome lockup for single-color print applications.",
        auto_approve=True,
        approved_colors=["#111827", "#000000", "#ffffff"],
    )

    # 3. Reversed White
    ref3 = register_reference_logo(
        file_bytes=fixtures["approved_reversed"],
        filename="nexus_logo_reversed_white.png",
        name="Nexus Reversed White Logo",
        workspace_id=workspace_id,
        category="primary",
        variant="white_negative",
        owner_id="system.brand_admin",
        description="Official white reversed logo for dark backgrounds and imagery.",
        auto_approve=True,
        approved_colors=["#ffffff"],
    )

    return [ref1, ref2, ref3]
