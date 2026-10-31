"""
Logo standards configuration, default policies, and persistent threshold management.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from app.models import db, row, rows, ident, now


DEFAULT_LOGO_STANDARD = {
    "min_width_px": 80,
    "min_height_px": 24,
    "max_width_px": None,
    "max_height_px": None,
    "min_width_pt": 50.0,
    "min_width_mm": 17.6,
    "aspect_ratio_tolerance": 0.05,
    "min_clearspace_ratio": 0.5,
    "approved_colors_json": "[]",
    "color_delta_e_tolerance": 16.0,
    "permitted_quadrants_json": '["ALL"]',
    "permitted_backgrounds": "ANY",
    "allowed_variants_json": '["*"]',
    "min_dpi": 72,
    "enforce_on_every_page": 0,
}


def get_or_create_logo_standard(reference_id: str, workspace_id: str = "ws_default") -> Dict[str, Any]:
    """Retrieve existing standards configuration for a reference logo, or initialize defaults."""
    record = row(
        "SELECT * FROM logo_standards WHERE reference_id=? AND workspace_id=?",
        (reference_id, workspace_id),
    )
    if record:
        return _format_standard_record(record)

    # Initialize default
    std_id = ident("lstd")
    created = now()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO logo_standards (
                id, workspace_id, reference_id, min_width_px, min_height_px,
                max_width_px, max_height_px, min_width_pt, min_width_mm,
                aspect_ratio_tolerance, min_clearspace_ratio, approved_colors_json,
                color_delta_e_tolerance, permitted_quadrants_json, permitted_backgrounds,
                allowed_variants_json, min_dpi, enforce_on_every_page, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                std_id, workspace_id, reference_id,
                DEFAULT_LOGO_STANDARD["min_width_px"],
                DEFAULT_LOGO_STANDARD["min_height_px"],
                DEFAULT_LOGO_STANDARD["max_width_px"],
                DEFAULT_LOGO_STANDARD["max_height_px"],
                DEFAULT_LOGO_STANDARD["min_width_pt"],
                DEFAULT_LOGO_STANDARD["min_width_mm"],
                DEFAULT_LOGO_STANDARD["aspect_ratio_tolerance"],
                DEFAULT_LOGO_STANDARD["min_clearspace_ratio"],
                DEFAULT_LOGO_STANDARD["approved_colors_json"],
                DEFAULT_LOGO_STANDARD["color_delta_e_tolerance"],
                DEFAULT_LOGO_STANDARD["permitted_quadrants_json"],
                DEFAULT_LOGO_STANDARD["permitted_backgrounds"],
                DEFAULT_LOGO_STANDARD["allowed_variants_json"],
                DEFAULT_LOGO_STANDARD["min_dpi"],
                DEFAULT_LOGO_STANDARD["enforce_on_every_page"],
                created, created,
            ),
        )

    record = row("SELECT * FROM logo_standards WHERE id=?", (std_id,))
    return _format_standard_record(record) if record else DEFAULT_LOGO_STANDARD


def update_logo_standard(reference_id: str, updates: Dict[str, Any], workspace_id: str = "ws_default") -> Dict[str, Any]:
    """Update standards configuration for a specific reference logo."""
    # Ensure record exists
    std = get_or_create_logo_standard(reference_id, workspace_id)

    # Prepare values
    min_w_px = updates.get("min_width_px", std["min_width_px"])
    min_h_px = updates.get("min_height_px", std["min_height_px"])
    max_w_px = updates.get("max_width_px", std.get("max_width_px"))
    max_h_px = updates.get("max_height_px", std.get("max_height_px"))
    min_w_pt = updates.get("min_width_pt", std["min_width_pt"])
    min_w_mm = updates.get("min_width_mm", std["min_width_mm"])
    ar_tol = updates.get("aspect_ratio_tolerance", std["aspect_ratio_tolerance"])
    cs_ratio = updates.get("min_clearspace_ratio", std["min_clearspace_ratio"])

    approved_colors = updates.get("approved_colors")
    if approved_colors is not None:
        colors_json = json.dumps(approved_colors) if isinstance(approved_colors, list) else str(approved_colors)
    else:
        colors_json = json.dumps(std["approved_colors"])

    de_tol = updates.get("color_delta_e_tolerance", std["color_delta_e_tolerance"])

    quadrants = updates.get("permitted_quadrants")
    if quadrants is not None:
        quads_json = json.dumps(quadrants) if isinstance(quadrants, list) else str(quadrants)
    else:
        quads_json = json.dumps(std["permitted_quadrants"])

    bg = updates.get("permitted_backgrounds", std["permitted_backgrounds"])
    min_dpi = updates.get("min_dpi", std["min_dpi"])
    every_page = 1 if updates.get("enforce_on_every_page", std["enforce_on_every_page"]) else 0
    updated_at = now()

    with db() as conn:
        conn.execute(
            """
            UPDATE logo_standards SET
                min_width_px=?, min_height_px=?, max_width_px=?, max_height_px=?,
                min_width_pt=?, min_width_mm=?, aspect_ratio_tolerance=?,
                min_clearspace_ratio=?, approved_colors_json=?, color_delta_e_tolerance=?,
                permitted_quadrants_json=?, permitted_backgrounds=?, min_dpi=?,
                enforce_on_every_page=?, updated_at=?
            WHERE reference_id=? AND workspace_id=?
            """,
            (
                min_w_px, min_h_px, max_w_px, max_h_px,
                min_w_pt, min_w_mm, ar_tol,
                cs_ratio, colors_json, de_tol,
                quads_json, bg, min_dpi,
                every_page, updated_at,
                reference_id, workspace_id,
            ),
        )

    return get_or_create_logo_standard(reference_id, workspace_id)


def _format_standard_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Format database row into typed dictionary with parsed JSON fields."""
    d = dict(record)
    try:
        d["approved_colors"] = json.loads(d.get("approved_colors_json") or "[]")
    except Exception:
        d["approved_colors"] = []

    try:
        d["permitted_quadrants"] = json.loads(d.get("permitted_quadrants_json") or '["ALL"]')
    except Exception:
        d["permitted_quadrants"] = ["ALL"]

    try:
        d["allowed_variants"] = json.loads(d.get("allowed_variants_json") or '["*"]')
    except Exception:
        d["allowed_variants"] = ["*"]

    d["enforce_on_every_page"] = bool(d.get("enforce_on_every_page", 0))
    return d
