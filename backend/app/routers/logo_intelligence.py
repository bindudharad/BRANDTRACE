"""
FastAPI Router for BRANDTRACE Reference-Based Logo Intelligence & Standards Engine.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Header,
    Response,
    Query,
    status,
)
from pydantic import BaseModel, Field

from app import config
from app.models import db, row, rows, ident, now, audit
from app.services.logo_intelligence import (
    register_reference_logo,
    approve_reference_logo,
    deactivate_reference_logo,
    get_reference_logo,
    list_reference_logos,
    get_reference_image_bytes,
    get_or_create_logo_standard,
    update_logo_standard,
    analyze_visual_document,
    seed_demo_logo_references,
    get_all_demo_fixtures,
)

router = APIRouter(prefix="/api/logo-intelligence", tags=["Logo Intelligence"])


def get_auth_context_dep(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
    x_demo_role: Optional[str] = Header(None),
    x_demo_actor: Optional[str] = Header(None),
    x_workspace_id: Optional[str] = Header(None),
) -> Dict[str, str]:
    """Dependency for resolving workspace, actor, and role."""
    from app.main import get_auth_context
    return get_auth_context(
        authorization=authorization,
        x_api_key=x_api_key,
        x_demo_role=x_demo_role,
        x_demo_actor=x_demo_actor,
        x_workspace_id=x_workspace_id,
    )


# -----------------------------------------------------------------------------
# Request & Response Schemas
# -----------------------------------------------------------------------------

class LogoStandardUpdateIn(BaseModel):
    min_width_px: Optional[int] = Field(None, ge=10)
    min_height_px: Optional[int] = Field(None, ge=10)
    max_width_px: Optional[int] = None
    max_height_px: Optional[int] = None
    min_width_pt: Optional[float] = Field(None, ge=1.0)
    min_width_mm: Optional[float] = Field(None, ge=1.0)
    aspect_ratio_tolerance: Optional[float] = Field(None, ge=0.0, le=0.50)
    min_clearspace_ratio: Optional[float] = Field(None, ge=0.0, le=3.0)
    approved_colors: Optional[List[str]] = None
    color_delta_e_tolerance: Optional[float] = Field(None, ge=1.0, le=50.0)
    permitted_quadrants: Optional[List[str]] = None
    permitted_backgrounds: Optional[str] = None
    min_dpi: Optional[int] = Field(None, ge=30)
    enforce_on_every_page: Optional[bool] = None


class FindingResolveIn(BaseModel):
    disposition: str = Field(..., description="'ACCEPTED', 'OVERRIDDEN', 'DISMISSED'")
    reason: Optional[str] = Field(None, description="Documented rationale for disposition")


class ReferencePatchIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    usage_notes: Optional[str] = None
    category: Optional[str] = None
    variant: Optional[str] = None


# -----------------------------------------------------------------------------
# 1. Reference Logo Management Endpoints
# -----------------------------------------------------------------------------

@router.post("/references", status_code=status.HTTP_201_CREATED)
async def upload_reference_logo(
    file: UploadFile = File(...),
    name: str = Form(...),
    variant: str = Form("primary_horizontal"),
    category: str = Form("primary"),
    description: Optional[str] = Form(None),
    usage_notes: Optional[str] = Form(None),
    approved_colors: Optional[str] = Form(None),
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """
    Register an official brand reference logo.
    Extracts dimensions, aspect ratio, transparency, and color swatches.
    Sets status to PENDING_APPROVAL pending brand admin activation.
    """
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to register official reference logos.")

    file_bytes = await file.read()
    if len(file_bytes) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File exceeds maximum size {config.MAX_UPLOAD_BYTES // (1024*1024)} MB.")

    parsed_colors = None
    if approved_colors:
        parsed_colors = [c.strip() for c in approved_colors.split(",") if c.strip()]

    try:
        ref = register_reference_logo(
            file_bytes=file_bytes,
            filename=file.filename or "reference_logo.png",
            name=name,
            workspace_id=ctx["workspace_id"],
            category=category,
            variant=variant,
            owner_id=ctx["actor"],
            description=description,
            usage_notes=usage_notes,
            auto_approve=False,
            approved_colors=parsed_colors,
        )
        return ref
    except ValueError as ve:
        raise HTTPException(422, str(ve))
    except Exception as exc:
        raise HTTPException(500, f"Failed to register reference logo: {exc}")


@router.get("/references")
async def get_reference_logos(
    status_filter: Optional[str] = Query(None, alias="status"),
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """List all registered reference logos for the requesting workspace."""
    return list_reference_logos(workspace_id=ctx["workspace_id"], status_filter=status_filter)


@router.get("/references/{reference_id}")
async def get_reference_logo_details(
    reference_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Retrieve full metadata and standards configuration for a specific reference logo."""
    ref = get_reference_logo(reference_id, workspace_id=ctx["workspace_id"])
    if not ref:
        raise HTTPException(404, f"Reference logo '{reference_id}' not found.")
    return ref


@router.get("/references/{reference_id}/image")
async def get_reference_logo_image(
    reference_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Stream raw image binary for a stored reference logo."""
    ref = get_reference_logo(reference_id, workspace_id=ctx["workspace_id"])
    if not ref:
        raise HTTPException(404, f"Reference logo '{reference_id}' not found.")

    try:
        img_bytes = get_reference_image_bytes(reference_id, workspace_id=ctx["workspace_id"])
        mime = ref.get("mime_type", "image/png")
        return Response(content=img_bytes, media_type=mime)
    except Exception as exc:
        raise HTTPException(404, f"Could not retrieve reference image binary: {exc}")


@router.patch("/references/{reference_id}")
async def update_reference_metadata(
    reference_id: str,
    payload: ReferencePatchIn,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Update non-geometric metadata for a reference logo."""
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to update reference metadata.")

    ref = get_reference_logo(reference_id, workspace_id=ctx["workspace_id"])
    if not ref:
        raise HTTPException(404, f"Reference logo '{reference_id}' not found.")

    updates = []
    params = []
    if payload.name is not None:
        updates.append("name=?")
        params.append(payload.name)
    if payload.description is not None:
        updates.append("description=?")
        params.append(payload.description)
    if payload.usage_notes is not None:
        updates.append("usage_notes=?")
        params.append(payload.usage_notes)
    if payload.category is not None:
        updates.append("category=?")
        params.append(payload.category)
    if payload.variant is not None:
        updates.append("variant=?")
        params.append(payload.variant)

    if updates:
        params.extend([reference_id, ctx["workspace_id"]])
        with db() as conn:
            conn.execute(f"UPDATE logo_references SET {', '.join(updates)} WHERE id=? AND workspace_id=?", params)

    return get_reference_logo(reference_id, workspace_id=ctx["workspace_id"])


@router.post("/references/{reference_id}/approve")
async def approve_logo_reference(
    reference_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Activate a pending reference logo as an approved organization standard."""
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to approve reference logos.")

    try:
        return approve_reference_logo(reference_id, actor=ctx["actor"], workspace_id=ctx["workspace_id"])
    except ValueError as ve:
        raise HTTPException(404, str(ve))


@router.post("/references/{reference_id}/deactivate")
async def deactivate_logo_reference(
    reference_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Deactivate an approved reference logo, removing it from active validation."""
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to deactivate reference logos.")

    try:
        return deactivate_reference_logo(reference_id, actor=ctx["actor"], workspace_id=ctx["workspace_id"])
    except ValueError as ve:
        raise HTTPException(404, str(ve))


@router.get("/references/{reference_id}/versions")
async def get_reference_versions(
    reference_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Inspect version history for a reference logo."""
    ref = get_reference_logo(reference_id, workspace_id=ctx["workspace_id"])
    if not ref:
        raise HTTPException(404, f"Reference logo '{reference_id}' not found.")

    version_rows = rows(
        "SELECT id, name, variant, version, approval_status, created_at, approved_at, superseded_by "
        "FROM logo_references WHERE name=? AND workspace_id=? ORDER BY created_at DESC",
        (ref["name"], ctx["workspace_id"]),
    )
    return {"reference_id": reference_id, "versions": version_rows}


# -----------------------------------------------------------------------------
# 2. Logo Standards Configuration Endpoints
# -----------------------------------------------------------------------------

@router.get("/standards/{reference_id}")
async def get_reference_standards(
    reference_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Retrieve configured design and usage standards for a reference logo."""
    ref = get_reference_logo(reference_id, workspace_id=ctx["workspace_id"])
    if not ref:
        raise HTTPException(404, f"Reference logo '{reference_id}' not found.")
    return get_or_create_logo_standard(reference_id, workspace_id=ctx["workspace_id"])


@router.put("/standards/{reference_id}")
async def update_reference_standards(
    reference_id: str,
    payload: LogoStandardUpdateIn,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Update design and usage standards (size, clearspace, colors, aspect tolerance)."""
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to modify brand standards.")

    ref = get_reference_logo(reference_id, workspace_id=ctx["workspace_id"])
    if not ref:
        raise HTTPException(404, f"Reference logo '{reference_id}' not found.")

    updates = payload.model_dump(exclude_unset=True)
    updated = update_logo_standard(reference_id, updates, workspace_id=ctx["workspace_id"])

    audit(
        review_id=reference_id,
        action="LOGO_STANDARDS_UPDATED",
        actor=ctx["actor"],
        actor_role=ctx["role"],
        details=json.dumps({"reference_id": reference_id, "updates": list(updates.keys())}),
        workspace_id=ctx["workspace_id"],
    )

    return updated


# -----------------------------------------------------------------------------
# 3. Visual Document Analysis Endpoints
# -----------------------------------------------------------------------------

@router.post("/analyze/image")
async def analyze_image_for_logos(
    file: UploadFile = File(...),
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """
    Analyze raster image artwork (PNG, JPEG) for logo compliance against reference library.
    Evaluates: Identity, Variant, Aspect Ratio Distortion, Display Size, Colors, Clearspace, Placement.
    """
    file_bytes = await file.read()
    if len(file_bytes) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Uploaded image exceeds size limit.")

    try:
        result = analyze_visual_document(
            file_bytes=file_bytes,
            filename=file.filename or "artwork.png",
            workspace_id=ctx["workspace_id"],
            source_type="IMAGE",
            actor_id=ctx["actor"],
            actor_role=ctx["role"],
        )
        return result
    except ValueError as ve:
        raise HTTPException(422, str(ve))
    except Exception as exc:
        raise HTTPException(500, f"Visual analysis failed: {exc}")


@router.post("/analyze/pdf")
async def analyze_pdf_for_logos(
    file: UploadFile = File(...),
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """
    Analyze multi-page PDF document for logo compliance.
    Measures page-space physical dimensions (points and mm) and generates page-by-page findings.
    """
    file_bytes = await file.read()
    if len(file_bytes) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Uploaded PDF exceeds size limit.")

    try:
        result = analyze_visual_document(
            file_bytes=file_bytes,
            filename=file.filename or "document.pdf",
            workspace_id=ctx["workspace_id"],
            source_type="PDF",
            actor_id=ctx["actor"],
            actor_role=ctx["role"],
        )
        return result
    except ValueError as ve:
        raise HTTPException(422, str(ve))
    except Exception as exc:
        raise HTTPException(500, f"PDF logo analysis failed: {exc}")


@router.get("/analyses/{analysis_id}")
async def get_analysis_summary(
    analysis_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Retrieve summary and status for a previously executed analysis job."""
    rec = row("SELECT * FROM logo_analyses WHERE id=? AND workspace_id=?", (analysis_id, ctx["workspace_id"]))
    if not rec:
        raise HTTPException(404, f"Analysis job '{analysis_id}' not found.")

    d = dict(rec)
    try:
        d["reference_versions_used"] = json.loads(d.get("reference_versions_used_json") or "[]")
    except Exception:
        d["reference_versions_used"] = []
    return d


@router.get("/analyses/{analysis_id}/candidates")
async def get_analysis_candidates(
    analysis_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Retrieve all detected logo candidates with visual overlays for an analysis job."""
    rec = row("SELECT id FROM logo_analyses WHERE id=? AND workspace_id=?", (analysis_id, ctx["workspace_id"]))
    if not rec:
        raise HTTPException(404, f"Analysis job '{analysis_id}' not found.")

    cand_rows = rows(
        "SELECT * FROM logo_candidates WHERE analysis_id=? AND workspace_id=? ORDER BY page_number ASC",
        (analysis_id, ctx["workspace_id"]),
    )
    formatted = []
    for cr in cand_rows:
        item = dict(cr)
        try:
            item["bounding_box"] = json.loads(item.get("bounding_box_json") or "{}")
        except Exception:
            item["bounding_box"] = {}
        try:
            item["page_space_coords"] = json.loads(item.get("page_space_coords_json") or "{}") if item.get("page_space_coords_json") else None
        except Exception:
            item["page_space_coords"] = None
        try:
            item["checks_summary"] = json.loads(item.get("checks_summary_json") or "{}")
        except Exception:
            item["checks_summary"] = {}
        try:
            item["detected_colors"] = json.loads(item.get("detected_colors_json") or "[]")
        except Exception:
            item["detected_colors"] = []
        formatted.append(item)

    return formatted


@router.get("/analyses/{analysis_id}/report")
async def get_analysis_full_report(
    analysis_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Retrieve full analysis report including summary, candidates, overlays, and findings."""
    analysis = await get_analysis_summary(analysis_id, ctx)
    candidates = await get_analysis_candidates(analysis_id, ctx)
    findings = rows(
        "SELECT * FROM logo_findings WHERE analysis_id=? AND workspace_id=? ORDER BY page_number ASC",
        (analysis_id, ctx["workspace_id"]),
    )
    return {
        "analysis": analysis,
        "candidates": candidates,
        "findings": findings,
    }


# -----------------------------------------------------------------------------
# 4. Compliance Findings Endpoints
# -----------------------------------------------------------------------------

@router.get("/findings")
async def list_logo_findings(
    analysis_id: Optional[str] = Query(None),
    candidate_id: Optional[str] = Query(None),
    disposition: Optional[str] = Query(None),
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """List visual compliance findings with optional filters."""
    query = "SELECT * FROM logo_findings WHERE workspace_id=?"
    params: List[Any] = [ctx["workspace_id"]]

    if analysis_id:
        query += " AND analysis_id=?"
        params.append(analysis_id)
    if candidate_id:
        query += " AND candidate_id=?"
        params.append(candidate_id)
    if disposition:
        query += " AND disposition=?"
        params.append(disposition)

    query += " ORDER BY created_at DESC"
    return rows(query, params)


@router.get("/findings/{finding_id}")
async def get_logo_finding(
    finding_id: str,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Retrieve single finding detail with numerical evidence and recommended action."""
    rec = row("SELECT * FROM logo_findings WHERE id=? AND workspace_id=?", (finding_id, ctx["workspace_id"]))
    if not rec:
        raise HTTPException(404, f"Finding '{finding_id}' not found.")
    return dict(rec)


@router.post("/findings/{finding_id}/resolve")
async def resolve_logo_finding(
    finding_id: str,
    payload: FindingResolveIn,
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Resolve, override, or dismiss a logo compliance finding with human justification."""
    rec = row("SELECT * FROM logo_findings WHERE id=? AND workspace_id=?", (finding_id, ctx["workspace_id"]))
    if not rec:
        raise HTTPException(404, f"Finding '{finding_id}' not found.")

    disp = payload.disposition.upper().strip()
    if disp not in ("ACCEPTED", "OVERRIDDEN", "DISMISSED"):
        raise HTTPException(400, "Disposition must be 'ACCEPTED', 'OVERRIDDEN', or 'DISMISSED'.")

    if disp in ("OVERRIDDEN", "DISMISSED") and not payload.reason:
        raise HTTPException(422, "A documented justification reason is required when overriding or dismissing a finding.")

    resolved_time = now()
    with db() as conn:
        conn.execute(
            """
            UPDATE logo_findings SET
                disposition=?,
                disposition_reason=?,
                disposition_by=?,
                disposition_at=?
            WHERE id=? AND workspace_id=?
            """,
            (disp, payload.reason, ctx["actor"], resolved_time, finding_id, ctx["workspace_id"]),
        )

    audit(
        review_id=rec["analysis_id"],
        action="LOGO_FINDING_RESOLVED",
        actor=ctx["actor"],
        actor_role=ctx["role"],
        details=json.dumps({
            "finding_id": finding_id,
            "disposition": disp,
            "reason": payload.reason,
        }),
        workspace_id=ctx["workspace_id"],
    )

    return row("SELECT * FROM logo_findings WHERE id=?", (finding_id,))


# -----------------------------------------------------------------------------
# 5. Synthetic Demonstration & Test Fixture Endpoints
# -----------------------------------------------------------------------------

@router.post("/demo/seed")
async def seed_demo_references_endpoint(
    ctx: Dict[str, str] = Depends(get_auth_context_dep),
):
    """Seed synthetic approved brand reference standards ('NEXUS Brand Standards') for judge demonstration."""
    if ctx["role"] not in ("brand_admin",):
        raise HTTPException(403, "Brand Admin role required to seed demo standards.")

    refs = seed_demo_logo_references(workspace_id=ctx["workspace_id"])
    return {
        "status": "SEEDED",
        "workspace_id": ctx["workspace_id"],
        "brand_name": "Nexus Logistics (Demo)",
        "references_created": len(refs),
        "references": refs,
    }


@router.get("/demo/fixtures")
async def list_available_fixtures():
    """List all pre-generated synthetic test fixtures available for testing."""
    fixtures = get_all_demo_fixtures()
    return {
        "available_fixtures": list(fixtures.keys()),
        "descriptions": {
            "approved_primary": "Approved primary horizontal logo (300x100, Emerald #0a7352)",
            "approved_monochrome": "Approved dark monochrome logo (300x100, Slate #111827)",
            "approved_reversed": "Approved reversed white logo (300x100, White #ffffff)",
            "negative_modified_symbol": "Deliberately altered symbol mark (Negative test: STYLE_MISMATCH)",
            "negative_stretched": "Deliberately stretched aspect ratio 5.0 (Negative test: DISTORTION_DETECTED)",
            "negative_recolored": "Deliberately unapproved purple color (Negative test: COLOUR_MISMATCH)",
            "negative_undersized": "Deliberately tiny display size 40x14 px (Negative test: LOGO_TOO_SMALL)",
            "negative_cropped": "Deliberately clipped left edge (Negative test: CROPPED_OR_OBSTRUCTED_LOGO)",
        },
    }


@router.get("/demo/fixtures/{fixture_name}")
async def download_fixture_image(fixture_name: str):
    """Download a synthetic test fixture directly as PNG image bytes."""
    fixtures = get_all_demo_fixtures()
    if fixture_name not in fixtures:
        raise HTTPException(404, f"Fixture '{fixture_name}' not found. Available: {list(fixtures.keys())}")

    return Response(content=fixtures[fixture_name], media_type="image/png")
