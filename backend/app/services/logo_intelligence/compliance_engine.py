"""
Master Logo Compliance Decision Engine.
Coordinates candidate detection, multi-dimensional standards evaluation,
visual evidence generation, database persistence, and audit logging.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

from app.models import db, row, rows, ident, now, audit
from .image_normalization import load_opencv_images, load_pil_image, compute_sha256
from .reference_registry import (
    list_reference_logos,
    get_reference_image_bytes,
    get_reference_logo,
)
from .candidate_detection import detect_all_logo_candidates
from .logo_matching import match_candidate_against_reference
from .geometric_analysis import evaluate_aspect_ratio, evaluate_cropping_and_boundary
from .colour_analysis import (
    extract_logo_foreground_colors,
    evaluate_logo_color_compliance,
)
from .size_analysis import (
    evaluate_digital_size,
    evaluate_pdf_page_size,
    evaluate_resolution_quality,
)
from .clearspace_analysis import evaluate_clearspace
from .placement_analysis import evaluate_placement
from .pdf_logo_extraction import render_pdf_pages_to_matrices
from .evidence_builder import create_annotated_overlay, create_side_by_side_comparison


def analyze_visual_document(
    file_bytes: bytes,
    filename: str,
    workspace_id: str = "ws_default",
    source_type: Optional[str] = None,
    actor_id: str = "demo.reviewer",
    actor_role: str = "reviewer",
) -> Dict[str, Any]:
    """
    Execute full reference-based logo compliance verification on an uploaded image or PDF document.
    """
    if not file_bytes or len(file_bytes) < 10:
        raise ValueError("Submitted file data is empty or corrupted.")

    # Determine source type
    clean_filename = filename.lower()
    if source_type:
        stype = source_type.upper()
    elif clean_filename.endswith(".pdf") or file_bytes[:4] == b"%PDF":
        stype = "PDF"
    else:
        stype = "IMAGE"

    # Validate file integrity upfront
    if stype == "PDF":
        if not file_bytes.startswith(b"%PDF"):
            raise ValueError("Corrupt or invalid PDF document header.")
    else:
        try:
            test_img = load_pil_image(file_bytes)
        except Exception as exc:
            raise ValueError(f"Corrupt or unreadable image file: {exc}")

    analysis_id = ident("lana")
    created_at = now()
    file_size = len(file_bytes)
    input_sha256 = compute_sha256(file_bytes)

    # 1. Fetch all approved logo references for this workspace
    approved_refs = list_reference_logos(workspace_id=workspace_id, status_filter="APPROVED")

    if not approved_refs:
        # No approved references configured
        with db() as conn:
            conn.execute(
                """
                INSERT INTO logo_analyses (
                    id, workspace_id, source_filename, source_type, source_file_hash, file_size,
                    page_count, status, overall_verdict, candidates_detected,
                    compliant_candidates, findings_count, reference_versions_used_json,
                    error_summary, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    analysis_id, workspace_id, filename, stype, input_sha256, file_size,
                    1, "COMPLETED", "REFERENCE_NOT_CONFIGURED", 0,
                    0, 0, "[]",
                    "No approved logo reference registered for this workspace. Register an official logo first.",
                    created_at, now(),
                ),
            )
        return {
            "analysis_id": analysis_id,
            "workspace_id": workspace_id,
            "filename": filename,
            "source_type": stype,
            "source_file_hash": input_sha256,
            "overall_verdict": "REFERENCE_NOT_CONFIGURED",
            "candidates": [],
            "findings": [],
            "summary": {
                "total_candidates": 0,
                "approved_matches": 0,
                "findings_count": 0,
                "status": "REFERENCE_NOT_CONFIGURED",
            },
            "explanation": "No approved logo references exist in this workspace. Please register and approve an official reference logo.",
        }

    # Load templates into memory
    reference_templates = []
    for ref in approved_refs:
        try:
            ref_bytes = get_reference_image_bytes(ref["id"], workspace_id)
            ref_bgr, ref_gray, _ = load_opencv_images(ref_bytes)
            reference_templates.append({
                "id": ref["id"],
                "name": ref["name"],
                "variant": ref["variant"],
                "version": ref["version"],
                "aspect_ratio": ref["aspect_ratio"],
                "standards": ref["standards"],
                "bgr_image": ref_bgr,
                "gray_image": ref_gray,
                "sha256": ref["original_hash"],
            })
        except Exception as e:
            continue

    if not reference_templates:
        raise ValueError("Could not load binary data for approved reference templates.")

    input_sha256 = compute_sha256(file_bytes)

    # Containers for results
    all_candidates: List[Dict[str, Any]] = []
    all_findings: List[Dict[str, Any]] = []
    page_count = 1

    if stype == "PDF":
        rendered_pages = render_pdf_pages_to_matrices(file_bytes, dpi_scale=2.0, max_pages=10)
        page_count = len(rendered_pages)

        for p_info in rendered_pages:
            p_num = p_info["page_number"]
            p_bgr = p_info["bgr_image"]

            # Candidate detection on page
            cands = detect_all_logo_candidates(p_bgr, reference_templates)

            for c in cands:
                _process_candidate(
                    candidate=c,
                    canvas_bgr=p_bgr,
                    reference_templates=reference_templates,
                    analysis_id=analysis_id,
                    workspace_id=workspace_id,
                    page_number=p_num,
                    pdf_page_info=p_info,
                    all_candidates=all_candidates,
                    all_findings=all_findings,
                )

        # Check document-level rule: enforce_on_every_page
        for ref in reference_templates:
            std = ref["standards"]
            if std.get("enforce_on_every_page") and page_count > 1:
                pages_with_logo = {c["page_number"] for c in all_candidates if c.get("matched_reference_id") == ref["id"]}
                for pn in range(1, page_count + 1):
                    if pn not in pages_with_logo:
                        f_id = ident("lfnd")
                        all_findings.append({
                            "id": f_id,
                            "analysis_id": analysis_id,
                            "candidate_id": "doc_level",
                            "workspace_id": workspace_id,
                            "page_number": pn,
                            "finding_type": "MISSING_REQUIRED_LOGO",
                            "severity": "HIGH",
                            "title": f"Missing Logo on Page {pn}",
                            "explanation": f"Brand policy requires approved logo on all pages, but Page {pn} contains no recognized logo.",
                            "expected_standard": f"Logo '{ref['name']}' on every page",
                            "observed_value": "No logo detected",
                            "evidence_numerical_json": json.dumps({"page_number": pn}),
                            "visual_overlay_region_json": None,
                            "recommended_action": f"Add approved {ref['variant']} logo to Page {pn}.",
                            "disposition": "UNRESOLVED",
                        })

    else:
        # Single image processing
        canvas_bgr, canvas_gray, _ = load_opencv_images(file_bytes)

        # Check exact hash match
        exact_matched_ref = next((r for r in reference_templates if r["sha256"] == input_sha256), None)

        cands = detect_all_logo_candidates(canvas_bgr, reference_templates)
        if not cands and exact_matched_ref:
            # The uploaded file IS the logo
            ch, cw = canvas_bgr.shape[:2]
            cands = [{
                "box": {"x": 0, "y": 0, "width": cw, "height": ch, "canvas_width": cw, "canvas_height": ch},
                "cropped_bgr": canvas_bgr,
                "cropped_gray": canvas_gray,
                "detected_aspect_ratio": round(cw / float(ch), 4) if ch > 0 else 1.0,
                "preliminary_score": 100.0,
                "preliminary_ref_id": exact_matched_ref["id"],
                "preliminary_variant": exact_matched_ref["variant"],
            }]

        for c in cands:
            _process_candidate(
                candidate=c,
                canvas_bgr=canvas_bgr,
                reference_templates=reference_templates,
                analysis_id=analysis_id,
                workspace_id=workspace_id,
                page_number=1,
                pdf_page_info=None,
                all_candidates=all_candidates,
                all_findings=all_findings,
                exact_hash_ref=exact_matched_ref,
            )

    # 3. Determine overall verdict
    has_critical = any(f["severity"] in ("CRITICAL", "HIGH") for f in all_findings)
    has_medium_low = any(f["severity"] in ("MEDIUM", "LOW") for f in all_findings)
    has_ambiguous = any(c.get("confidence_band") == "AMBIGUOUS" for c in all_candidates)

    if has_critical:
        overall_verdict = "NON_COMPLIANT"
    elif has_ambiguous:
        overall_verdict = "NEEDS_REVIEW"
    elif has_medium_low:
        overall_verdict = "PARTIALLY_COMPLIANT"
    elif len(all_candidates) == 0:
        overall_verdict = "NEEDS_REVIEW"
    else:
        overall_verdict = "COMPLIANT"

    compliant_count = sum(1 for c in all_candidates if c.get("candidate_verdict") == "APPROVED_MATCH")

    # 4. Database Persistence
    completed_at = now()
    ref_versions_used = [{"id": r["id"], "name": r["name"], "variant": r["variant"], "version": r["version"]} for r in reference_templates]

    with db() as conn:
        conn.execute(
            """
            INSERT INTO logo_analyses (
                id, workspace_id, source_filename, source_type, source_file_hash, file_size,
                page_count, status, overall_verdict, candidates_detected,
                compliant_candidates, findings_count, reference_versions_used_json,
                error_summary, created_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                analysis_id, workspace_id, filename, stype, input_sha256, file_size,
                page_count, "COMPLETED", overall_verdict, len(all_candidates),
                compliant_count, len(all_findings), json.dumps(ref_versions_used),
                None, created_at, completed_at,
            ),
        )

        for c in all_candidates:
            conn.execute(
                """
                INSERT INTO logo_candidates (
                    id, analysis_id, workspace_id, page_number, bounding_box_json,
                    page_space_coords_json, detected_aspect_ratio, matched_reference_id,
                    matched_variant, similarity_method, similarity_score, confidence_band,
                    candidate_verdict, checks_summary_json, detected_colors_json,
                    difference_overlay_base64, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    c["id"], analysis_id, workspace_id, c["page_number"],
                    json.dumps(c["bounding_box"]),
                    json.dumps(c["page_space_coords"]) if c.get("page_space_coords") else None,
                    c["detected_aspect_ratio"], c.get("matched_reference_id"),
                    c.get("matched_variant"), c.get("similarity_method", "TEMPLATE_MULTI_SCALE"),
                    c.get("similarity_score", 0.0), c.get("confidence_band", "AMBIGUOUS"),
                    c.get("candidate_verdict", "APPROVED_MATCH"),
                    json.dumps(c.get("checks_summary", {})),
                    json.dumps(c.get("detected_colors", [])),
                    c.get("difference_overlay"),
                    created_at,
                ),
            )

        for f in all_findings:
            conn.execute(
                """
                INSERT INTO logo_findings (
                    id, analysis_id, candidate_id, workspace_id, page_number,
                    finding_type, severity, title, explanation, expected_standard,
                    observed_value, evidence_numerical_json, visual_overlay_region_json,
                    recommended_action, disposition, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f["id"], analysis_id, f["candidate_id"], workspace_id, f["page_number"],
                    f["finding_type"], f["severity"], f["title"], f["explanation"],
                    f["expected_standard"], f["observed_value"],
                    f.get("evidence_numerical_json", "{}"),
                    f.get("visual_overlay_region_json"),
                    f["recommended_action"], f.get("disposition", "UNRESOLVED"),
                    created_at,
                ),
            )

    audit(
        review_id=analysis_id,
        action="LOGO_ANALYSIS_COMPLETED",
        actor=actor_id,
        actor_role=actor_role,
        details=json.dumps({
            "analysis_id": analysis_id,
            "overall_verdict": overall_verdict,
            "candidates": len(all_candidates),
            "findings": len(all_findings),
            "source_type": stype,
        }),
        workspace_id=workspace_id,
    )

    return {
        "analysis_id": analysis_id,
        "workspace_id": workspace_id,
        "filename": filename,
        "source_type": stype,
        "source_file_hash": input_sha256,
        "page_count": page_count,
        "overall_verdict": overall_verdict,
        "candidates": all_candidates,
        "findings": all_findings,
        "summary": {
            "total_candidates": len(all_candidates),
            "approved_matches": compliant_count,
            "findings_count": len(all_findings),
            "status": overall_verdict,
        },
        "reference_versions_used": ref_versions_used,
        "created_at": created_at,
        "completed_at": completed_at,
    }


def _process_candidate(
    candidate: Dict[str, Any],
    canvas_bgr: np.ndarray,
    reference_templates: List[Dict[str, Any]],
    analysis_id: str,
    workspace_id: str,
    page_number: int,
    pdf_page_info: Optional[Dict[str, Any]],
    all_candidates: List[Dict[str, Any]],
    all_findings: List[Dict[str, Any]],
    exact_hash_ref: Optional[Dict[str, Any]] = None,
):
    """Evaluate an individual detected logo candidate against all reference standards."""
    c_id = ident("lcan")
    box = candidate["box"]
    c_bgr = candidate["cropped_bgr"]
    c_gray = candidate["cropped_gray"]
    detected_aspect = candidate["detected_aspect_ratio"]

    # Match candidate against each approved reference to find the best match
    best_match_info = None
    best_score = -1.0
    matched_ref = None

    for ref in reference_templates:
        is_exact = exact_hash_ref and (exact_hash_ref["id"] == ref["id"])
        match_res = match_candidate_against_reference(
            candidate_gray=c_gray,
            reference_gray=ref["gray_image"],
            reference_id=ref["id"],
            reference_variant=ref["variant"],
            reference_aspect_ratio=ref["aspect_ratio"],
            exact_hash_match=bool(is_exact),
        )
        if match_res["similarity_score"] > best_score:
            best_score = match_res["similarity_score"]
            best_match_info = match_res
            matched_ref = ref

    if not matched_ref:
        matched_ref = reference_templates[0]
        best_match_info = {
            "status": "UNRECOGNISED_LOGO",
            "similarity_score": 0.0,
            "confidence_band": "HIGH_CONFIDENCE_MISMATCH",
            "method": "UNMATCHED",
            "explanation": "No approved reference logo matched.",
        }

    std = matched_ref["standards"]
    checks_summary = {}
    candidate_findings = []

    # 1. Identity & Style Check
    identity_status = best_match_info["status"]
    checks_summary["identity"] = identity_status

    if identity_status == "STYLE_MISMATCH":
        f_id = ident("lfnd")
        candidate_findings.append({
            "id": f_id,
            "analysis_id": analysis_id,
            "candidate_id": c_id,
            "workspace_id": workspace_id,
            "page_number": page_number,
            "finding_type": "STYLE_MISMATCH",
            "severity": "HIGH",
            "title": "Modified Logo Style Detected",
            "explanation": best_match_info["explanation"],
            "expected_standard": f"Official {matched_ref['name']} geometry",
            "observed_value": f"Deviating graphic contours (Score: {best_match_info['similarity_score']}%)",
            "evidence_numerical_json": json.dumps({"similarity_score": best_match_info["similarity_score"]}),
            "visual_overlay_region_json": json.dumps(box),
            "recommended_action": "Replace with official vector artwork from the Brand Asset Registry.",
            "disposition": "UNRESOLVED",
        })
    elif identity_status == "UNRECOGNISED_LOGO":
        f_id = ident("lfnd")
        candidate_findings.append({
            "id": f_id,
            "analysis_id": analysis_id,
            "candidate_id": c_id,
            "workspace_id": workspace_id,
            "page_number": page_number,
            "finding_type": "UNRECOGNISED_LOGO",
            "severity": "HIGH",
            "title": "Unrecognized / Unapproved Logo",
            "explanation": "Detected graphic candidate does not match any approved reference logo in the Brand Constitution.",
            "expected_standard": "Authorized brand logo reference",
            "observed_value": "Unregistered visual mark",
            "evidence_numerical_json": json.dumps({"similarity_score": best_match_info["similarity_score"]}),
            "visual_overlay_region_json": json.dumps(box),
            "recommended_action": "Verify if this graphic is authorized or replace with an approved brand mark.",
            "disposition": "UNRESOLVED",
        })

    # 2. Aspect Ratio & Distortion Check
    geom_res = evaluate_aspect_ratio(
        detected_width=box["width"],
        detected_height=box["height"],
        reference_aspect_ratio=matched_ref["aspect_ratio"],
        tolerance=std.get("aspect_ratio_tolerance", 0.05),
    )
    checks_summary["aspect_ratio"] = geom_res["status"]

    if geom_res["is_distorted"]:
        f_id = ident("lfnd")
        candidate_findings.append({
            "id": f_id,
            "analysis_id": analysis_id,
            "candidate_id": c_id,
            "workspace_id": workspace_id,
            "page_number": page_number,
            "finding_type": "DISTORTION_DETECTED",
            "severity": "HIGH",
            "title": "Distorted Logo Proportions (Stretched/Compressed)",
            "explanation": geom_res["explanation"],
            "expected_standard": f"Aspect ratio {matched_ref['aspect_ratio']:.3f} (+/- {std.get('aspect_ratio_tolerance', 0.05):.1%})",
            "observed_value": f"Aspect ratio {geom_res['detected_aspect_ratio']:.3f} ({geom_res['distortion_type']})",
            "evidence_numerical_json": json.dumps({
                "detected_aspect": geom_res["detected_aspect_ratio"],
                "reference_aspect": matched_ref["aspect_ratio"],
                "deviation_percent": geom_res["deviation_percent"],
            }),
            "visual_overlay_region_json": json.dumps(box),
            "recommended_action": "Lock aspect ratio during resizing to ensure uniform scaling without distortion.",
            "disposition": "UNRESOLVED",
        })

    # 3. Cropping & Obstruction Check
    crop_res = evaluate_cropping_and_boundary(
        box["x"], box["y"], box["width"], box["height"],
        box["canvas_width"], box["canvas_height"],
        correlation_score=best_match_info.get("correlation_score", 0.8),
    )
    checks_summary["cropping"] = crop_res["status"]

    if crop_res["is_cropped"]:
        f_id = ident("lfnd")
        candidate_findings.append({
            "id": f_id,
            "analysis_id": analysis_id,
            "candidate_id": c_id,
            "workspace_id": workspace_id,
            "page_number": page_number,
            "finding_type": "CROPPED_OR_OBSTRUCTED_LOGO",
            "severity": "HIGH",
            "title": "Cropped or Obstructed Logo",
            "explanation": crop_res["explanation"],
            "expected_standard": "Fully visible logo within canvas margins",
            "observed_value": f"Clipped at {', '.join(crop_res['clipped_edges'])}",
            "evidence_numerical_json": json.dumps({"clipped_edges": crop_res["clipped_edges"]}),
            "visual_overlay_region_json": json.dumps(box),
            "recommended_action": "Reposition logo away from artwork perimeter.",
            "disposition": "UNRESOLVED",
        })

    # 4. Color Compliance Check
    cand_pil = Image.fromarray(cv2.cvtColor(c_bgr, cv2.COLOR_BGR2RGB))
    det_colors = extract_logo_foreground_colors(cand_pil, num_colors=4)
    approved_colors = std.get("approved_colors") or []
    color_res = evaluate_logo_color_compliance(
        detected_colors=det_colors,
        approved_colors=approved_colors,
        delta_e_tolerance=std.get("color_delta_e_tolerance", 16.0),
    )
    checks_summary["colour"] = color_res["status"]

    if not color_res["is_compliant"]:
        f_id = ident("lfnd")
        candidate_findings.append({
            "id": f_id,
            "analysis_id": analysis_id,
            "candidate_id": c_id,
            "workspace_id": workspace_id,
            "page_number": page_number,
            "finding_type": "COLOUR_MISMATCH",
            "severity": "HIGH",
            "title": "Unapproved Logo Color Treatment",
            "explanation": color_res["explanation"],
            "expected_standard": f"Approved brand colors: {', '.join(approved_colors)}",
            "observed_value": f"Detected {', '.join(c['detected_hex'] for c in color_res['findings'])}",
            "evidence_numerical_json": json.dumps({"measurements": color_res["color_measurements"]}),
            "visual_overlay_region_json": json.dumps(box),
            "recommended_action": "Use approved monochrome, reversed, or primary color variants only.",
            "disposition": "UNRESOLVED",
        })

    # 5. Size Evaluation (Digital or PDF page space)
    page_space_coords = None
    if pdf_page_info:
        size_res = evaluate_pdf_page_size(
            width_px=box["width"],
            height_px=box["height"],
            rendered_page_w_px=pdf_page_info["render_width_px"],
            rendered_page_h_px=pdf_page_info["render_height_px"],
            pdf_page_w_pt=pdf_page_info["page_width_pt"],
            pdf_page_h_pt=pdf_page_info["page_height_pt"],
            min_width_pt=std.get("min_width_pt", 50.0),
            min_width_mm=std.get("min_width_mm", 17.6),
        )
        checks_summary["size"] = size_res["status"]
        page_space_coords = {
            "x_pt": round((box["x"] / float(pdf_page_info["render_width_px"])) * pdf_page_info["page_width_pt"], 2),
            "y_pt": round((box["y"] / float(pdf_page_info["render_height_px"])) * pdf_page_info["page_height_pt"], 2),
            "width_pt": size_res.get("width_pt"),
            "height_pt": size_res.get("height_pt"),
            "width_mm": size_res.get("width_mm"),
            "height_mm": size_res.get("height_mm"),
            "page_width_pt": pdf_page_info["page_width_pt"],
            "page_height_pt": pdf_page_info["page_height_pt"],
        }
        if not size_res["is_compliant"]:
            f_id = ident("lfnd")
            candidate_findings.append({
                "id": f_id,
                "analysis_id": analysis_id,
                "candidate_id": c_id,
                "workspace_id": workspace_id,
                "page_number": page_number,
                "finding_type": "LOGO_TOO_SMALL",
                "severity": "MEDIUM",
                "title": "Logo Display Size Below PDF Standard",
                "explanation": size_res["explanation"],
                "expected_standard": f"Min {std.get('min_width_pt', 50.0)} pt ({std.get('min_width_mm', 17.6)} mm)",
                "observed_value": f"{size_res.get('width_pt')} pt ({size_res.get('width_mm')} mm)",
                "evidence_numerical_json": json.dumps(size_res),
                "visual_overlay_region_json": json.dumps(box),
                "recommended_action": "Increase logo size to meet physical print legibility standards.",
                "disposition": "UNRESOLVED",
            })
    else:
        size_res = evaluate_digital_size(
            width_px=box["width"],
            height_px=box["height"],
            min_width_px=std.get("min_width_px", 80),
            min_height_px=std.get("min_height_px", 24),
            max_width_px=std.get("max_width_px"),
            max_height_px=std.get("max_height_px"),
        )
        checks_summary["size"] = size_res["status"]
        if not size_res["is_compliant"]:
            f_type = size_res["status"]
            f_id = ident("lfnd")
            candidate_findings.append({
                "id": f_id,
                "analysis_id": analysis_id,
                "candidate_id": c_id,
                "workspace_id": workspace_id,
                "page_number": page_number,
                "finding_type": f_type,
                "severity": "MEDIUM",
                "title": f"Logo Display Dimensions Non-Compliant ({f_type})",
                "explanation": size_res["explanation"],
                "expected_standard": f"Min {std.get('min_width_px', 80)}x{std.get('min_height_px', 24)} px",
                "observed_value": f"{box['width']}x{box['height']} px",
                "evidence_numerical_json": json.dumps(size_res),
                "visual_overlay_region_json": json.dumps(box),
                "recommended_action": "Adjust logo display dimensions to satisfy brand guidelines.",
                "disposition": "UNRESOLVED",
            })

    # 6. Clearspace Check
    is_standalone_logo = bool(exact_hash_ref) or (box["width"] >= box["canvas_width"] - 10 and box["height"] >= box["canvas_height"] - 10)
    if is_standalone_logo:
        cs_res = {
            "status": "COMPLIANT",
            "is_compliant": True,
            "measured_ratio": 1.0,
            "required_ratio": std.get("min_clearspace_ratio", 0.5),
            "violating_edges": [],
            "required_margin_px": 0,
            "exclusion_box": None,
            "explanation": "Standalone logo asset file; layout clearspace rules apply when embedded in collateral.",
        }
    else:
        canvas_gray = cv2.cvtColor(canvas_bgr, cv2.COLOR_BGR2GRAY)
        cs_res = evaluate_clearspace(
            canvas_gray=canvas_gray,
            box_x=box["x"],
            box_y=box["y"],
            box_w=box["width"],
            box_h=box["height"],
            required_clearspace_ratio=std.get("min_clearspace_ratio", 0.5),
        )
    checks_summary["clearspace"] = cs_res["status"]

    if not cs_res["is_compliant"]:
        f_id = ident("lfnd")
        candidate_findings.append({
            "id": f_id,
            "analysis_id": analysis_id,
            "candidate_id": c_id,
            "workspace_id": workspace_id,
            "page_number": page_number,
            "finding_type": "CLEARSPACE_VIOLATION",
            "severity": "HIGH",
            "title": "Clearspace Exclusion Margin Infringement",
            "explanation": cs_res["explanation"],
            "expected_standard": f"M >= {std.get('min_clearspace_ratio', 0.5):.2f}H ({cs_res['required_margin_px']} px)",
            "observed_value": f"Clearance ratio {cs_res['measured_ratio']:.2f}H",
            "evidence_numerical_json": json.dumps({
                "measured_ratio": cs_res["measured_ratio"],
                "required_ratio": cs_res["required_ratio"],
                "violating_edges": cs_res["violating_edges"],
            }),
            "visual_overlay_region_json": json.dumps(cs_res.get("exclusion_box")),
            "recommended_action": "Ensure surrounding perimeter is free of text, borders, or graphics.",
            "disposition": "UNRESOLVED",
        })

    # 7. Placement Check
    if is_standalone_logo:
        place_res = {
            "status": "COMPLIANT",
            "is_compliant": True,
            "detected_quadrant": "CENTER",
            "permitted_quadrants": ["ALL"],
            "explanation": "Standalone logo asset file; placement rules apply within document/collateral layouts.",
        }
    else:
        permitted_quads = std.get("permitted_quadrants") or ["ALL"]
        place_res = evaluate_placement(
            box_x=box["x"],
            box_y=box["y"],
            box_w=box["width"],
            box_h=box["height"],
            canvas_w=box["canvas_width"],
            canvas_h=box["canvas_height"],
            permitted_quadrants=permitted_quads,
        )
    checks_summary["placement"] = place_res["status"]

    if not place_res["is_compliant"]:
        f_id = ident("lfnd")
        candidate_findings.append({
            "id": f_id,
            "analysis_id": analysis_id,
            "candidate_id": c_id,
            "workspace_id": workspace_id,
            "page_number": page_number,
            "finding_type": "VARIANT_OR_PLACEMENT_MISMATCH",
            "severity": "LOW",
            "title": "Unauthorized Logo Placement Location",
            "explanation": place_res["explanation"],
            "expected_standard": f"Permitted: {', '.join(permitted_quads)}",
            "observed_value": place_res["detected_quadrant"],
            "evidence_numerical_json": json.dumps(place_res),
            "visual_overlay_region_json": json.dumps(box),
            "recommended_action": f"Move logo to authorized placement zone: {', '.join(permitted_quads)}.",
            "disposition": "UNRESOLVED",
        })

    # Determine candidate overall verdict
    if candidate_findings:
        cand_verdict = candidate_findings[0]["finding_type"]
    else:
        cand_verdict = "APPROVED_MATCH"

    # Generate Visual Evidence Overlays
    exclusion_box = cs_res.get("exclusion_box")
    overlay_b64 = create_annotated_overlay(
        canvas_bgr=canvas_bgr,
        candidate_box=box,
        exclusion_box=exclusion_box,
        verdict=cand_verdict,
        title_text=matched_ref["variant"].upper() if matched_ref else "",
    )

    side_by_side_b64 = create_side_by_side_comparison(
        reference_bgr=matched_ref["bgr_image"],
        detected_bgr=c_bgr,
        verdict=cand_verdict,
    )

    # Candidate object
    candidate_record = {
        "id": c_id,
        "page_number": page_number,
        "bounding_box": box,
        "page_space_coords": page_space_coords,
        "detected_aspect_ratio": detected_aspect,
        "matched_reference_id": matched_ref["id"],
        "matched_reference_name": matched_ref["name"],
        "matched_variant": matched_ref["variant"],
        "matched_version": matched_ref["version"],
        "similarity_method": best_match_info["method"],
        "similarity_score": best_match_info["similarity_score"],
        "confidence_band": best_match_info["confidence_band"],
        "candidate_verdict": cand_verdict,
        "checks_summary": checks_summary,
        "detected_colors": [c[0] for c in det_colors],
        "difference_overlay": overlay_b64,
        "side_by_side_overlay": side_by_side_b64,
        "findings_count": len(candidate_findings),
    }

    all_candidates.append(candidate_record)
    all_findings.extend(candidate_findings)
