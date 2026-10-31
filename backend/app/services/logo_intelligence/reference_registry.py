"""
Official Reference Logo Library registry, lifecycle state machine, and persistent storage.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.models import db, row, rows, ident, now, audit
from app.config import ROOT
from .image_normalization import get_image_dimensions_and_hash, load_pil_image
from .colour_analysis import extract_logo_foreground_colors
from .standards_manager import get_or_create_logo_standard, update_logo_standard

STORAGE_BASE = ROOT / "uploads" / "logo_references"


def _ensure_storage_dir(workspace_id: str) -> Path:
    target_dir = STORAGE_BASE / workspace_id
    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir


def register_reference_logo(
    file_bytes: bytes,
    filename: str,
    name: str,
    workspace_id: str = "ws_default",
    category: str = "primary",
    variant: str = "horizontal",
    owner_id: str = "demo.brand_admin",
    description: Optional[str] = None,
    usage_notes: Optional[str] = None,
    auto_approve: bool = False,
    approved_colors: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Register an official brand logo reference in the library.
    Analyzes dimensions, aspect ratio, transparency, and dominant colors.
    Stores binary file securely and creates database record in PENDING_APPROVAL status.
    """
    if not file_bytes or len(file_bytes) < 10:
        raise ValueError("Reference logo file is empty or corrupted.")

    meta = get_image_dimensions_and_hash(file_bytes)
    pil_img = load_pil_image(file_bytes)

    # Extract dominant colors
    extracted_colors = extract_logo_foreground_colors(pil_img, num_colors=4)
    detected_hexes = [c[0] for c in extracted_colors]

    primary_hex = detected_hexes[0] if detected_hexes else None
    secondary_hex = detected_hexes[1] if len(detected_hexes) > 1 else None

    # Generate persistent storage key
    ref_id = ident("lref")
    storage_dir = _ensure_storage_dir(workspace_id)
    ext = (Path(filename).suffix or ".png").lower()
    storage_filename = f"{ref_id}{ext}"
    storage_path = storage_dir / storage_filename

    with open(storage_path, "wb") as f:
        f.write(file_bytes)

    created_at = now()
    status = "APPROVED" if auto_approve else "PENDING_APPROVAL"
    approved_at = created_at if auto_approve else None
    approved_by = owner_id if auto_approve else None

    with db() as conn:
        conn.execute(
            """
            INSERT INTO logo_references (
                id, workspace_id, name, category, variant, file_storage_key,
                original_filename, original_hash, file_size, mime_type,
                width, height, aspect_ratio, has_transparency, primary_color_hex,
                secondary_color_hex, detected_colors_json, approval_status,
                version, owner_id, description, usage_notes, created_at,
                approved_at, approved_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ref_id, workspace_id, name, category, variant, str(storage_path),
                filename, meta["sha256"], meta["file_size"], f"image/{meta['format'].lower()}",
                meta["width"], meta["height"], meta["aspect_ratio"], 1 if meta["has_transparency"] else 0,
                primary_hex, secondary_hex, json.dumps(detected_hexes), status,
                "1.0", owner_id, description or "", usage_notes or "", created_at,
                approved_at, approved_by,
            ),
        )

    # Initialize associated standards
    initial_colors = approved_colors if approved_colors is not None else detected_hexes
    standards = get_or_create_logo_standard(ref_id, workspace_id)
    if initial_colors:
        update_logo_standard(ref_id, {"approved_colors": initial_colors}, workspace_id)

    audit(
        review_id=ref_id,
        action="LOGO_REFERENCE_REGISTERED",
        actor=owner_id,
        actor_role="brand_admin",
        details=json.dumps({
            "reference_id": ref_id,
            "name": name,
            "variant": variant,
            "status": status,
            "aspect_ratio": meta["aspect_ratio"],
        }),
        workspace_id=workspace_id,
    )

    return get_reference_logo(ref_id, workspace_id)


def approve_reference_logo(
    reference_id: str,
    actor: str = "demo.brand_admin",
    workspace_id: str = "ws_default",
) -> Dict[str, Any]:
    """Approve a pending reference logo, activating it for compliance verification."""
    rec = row("SELECT * FROM logo_references WHERE id=? AND workspace_id=?", (reference_id, workspace_id))
    if not rec:
        raise ValueError(f"Logo reference '{reference_id}' not found.")

    approved_time = now()
    with db() as conn:
        conn.execute(
            """
            UPDATE logo_references SET
                approval_status='APPROVED',
                approved_at=?,
                approved_by=?
            WHERE id=? AND workspace_id=?
            """,
            (approved_time, actor, reference_id, workspace_id),
        )

    audit(
        review_id=reference_id,
        action="LOGO_REFERENCE_APPROVED",
        actor=actor,
        actor_role="brand_admin",
        details=json.dumps({"reference_id": reference_id, "previous_status": rec["approval_status"]}),
        workspace_id=workspace_id,
    )

    return get_reference_logo(reference_id, workspace_id)


def deactivate_reference_logo(
    reference_id: str,
    actor: str = "demo.brand_admin",
    workspace_id: str = "ws_default",
) -> Dict[str, Any]:
    """Deactivate an approved reference logo, removing it from active matching."""
    rec = row("SELECT * FROM logo_references WHERE id=? AND workspace_id=?", (reference_id, workspace_id))
    if not rec:
        raise ValueError(f"Logo reference '{reference_id}' not found.")

    with db() as conn:
        conn.execute(
            "UPDATE logo_references SET approval_status='DEACTIVATED' WHERE id=? AND workspace_id=?",
            (reference_id, workspace_id),
        )

    audit(
        review_id=reference_id,
        action="LOGO_REFERENCE_DEACTIVATED",
        actor=actor,
        actor_role="brand_admin",
        details=json.dumps({"reference_id": reference_id}),
        workspace_id=workspace_id,
    )

    return get_reference_logo(reference_id, workspace_id)


def get_reference_logo(reference_id: str, workspace_id: str = "ws_default") -> Optional[Dict[str, Any]]:
    """Retrieve complete metadata and standards for a reference logo."""
    rec = row("SELECT * FROM logo_references WHERE id=? AND workspace_id=?", (reference_id, workspace_id))
    if not rec:
        return None

    d = dict(rec)
    try:
        d["detected_colors"] = json.loads(d.get("detected_colors_json") or "[]")
    except Exception:
        d["detected_colors"] = []

    d["has_transparency"] = bool(d.get("has_transparency", 0))
    d["standards"] = get_or_create_logo_standard(reference_id, workspace_id)
    return d


def list_reference_logos(
    workspace_id: str = "ws_default",
    status_filter: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """List reference logos for a workspace with optional status filter."""
    if status_filter:
        raw_rows = rows(
            "SELECT * FROM logo_references WHERE workspace_id=? AND approval_status=? ORDER BY created_at DESC",
            (workspace_id, status_filter),
        )
    else:
        raw_rows = rows(
            "SELECT * FROM logo_references WHERE workspace_id=? ORDER BY created_at DESC",
            (workspace_id,),
        )

    results = []
    for r in raw_rows:
        item = dict(r)
        try:
            item["detected_colors"] = json.loads(item.get("detected_colors_json") or "[]")
        except Exception:
            item["detected_colors"] = []
        item["has_transparency"] = bool(item.get("has_transparency", 0))
        item["standards"] = get_or_create_logo_standard(item["id"], workspace_id)
        results.append(item)

    return results


def get_reference_image_bytes(reference_id: str, workspace_id: str = "ws_default") -> bytes:
    """Retrieve raw image bytes for a stored reference logo."""
    rec = row("SELECT file_storage_key FROM logo_references WHERE id=? AND workspace_id=?", (reference_id, workspace_id))
    if not rec:
        raise FileNotFoundError(f"Reference logo '{reference_id}' not found.")

    path = Path(rec["file_storage_key"])
    if not path.exists():
        raise FileNotFoundError(f"Binary asset at '{path}' is missing.")

    with open(path, "rb") as f:
        return f.read()
