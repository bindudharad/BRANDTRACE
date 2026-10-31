"""
BRANDTRACE Advanced Logo Intelligence & Visual Brand Compliance Engine.
"""
from .image_normalization import (
    load_opencv_images,
    load_pil_image,
    get_image_dimensions_and_hash,
    compute_sha256,
)
from .reference_registry import (
    register_reference_logo,
    approve_reference_logo,
    deactivate_reference_logo,
    get_reference_logo,
    list_reference_logos,
    get_reference_image_bytes,
)
from .standards_manager import (
    get_or_create_logo_standard,
    update_logo_standard,
)
from .geometric_analysis import (
    evaluate_aspect_ratio,
    evaluate_cropping_and_boundary,
)
from .colour_analysis import (
    extract_logo_foreground_colors,
    evaluate_logo_color_compliance,
)
from .size_analysis import (
    evaluate_digital_size,
    evaluate_pdf_page_size,
    evaluate_resolution_quality,
)
from .clearspace_analysis import (
    evaluate_clearspace,
)
from .placement_analysis import (
    classify_quadrant,
    evaluate_placement,
)
from .logo_matching import (
    match_template_multiscale,
    compute_structural_difference,
    match_candidate_against_reference,
)
from .candidate_detection import (
    detect_all_logo_candidates,
    apply_nms,
)
from .evidence_builder import (
    create_annotated_overlay,
    create_side_by_side_comparison,
)
from .pdf_logo_extraction import (
    render_pdf_pages_to_matrices,
    get_pdf_page_dimensions,
)
from .compliance_engine import (
    analyze_visual_document,
)
from .sample_fixtures import (
    generate_synthetic_logo,
    get_all_demo_fixtures,
    seed_demo_logo_references,
)
from .report_generator import (
    generate_logo_verification_report,
    get_logo_report,
    get_logo_report_pdf_bytes,
    verify_logo_report_authenticity,
    list_logo_reports,
)

__all__ = [
    "load_opencv_images",
    "load_pil_image",
    "get_image_dimensions_and_hash",
    "compute_sha256",
    "register_reference_logo",
    "approve_reference_logo",
    "deactivate_reference_logo",
    "get_reference_logo",
    "list_reference_logos",
    "get_reference_image_bytes",
    "get_or_create_logo_standard",
    "update_logo_standard",
    "evaluate_aspect_ratio",
    "evaluate_cropping_and_boundary",
    "extract_logo_foreground_colors",
    "evaluate_logo_color_compliance",
    "evaluate_digital_size",
    "evaluate_pdf_page_size",
    "evaluate_resolution_quality",
    "evaluate_clearspace",
    "classify_quadrant",
    "evaluate_placement",
    "match_template_multiscale",
    "compute_structural_difference",
    "match_candidate_against_reference",
    "detect_all_logo_candidates",
    "apply_nms",
    "create_annotated_overlay",
    "create_side_by_side_comparison",
    "render_pdf_pages_to_matrices",
    "get_pdf_page_dimensions",
    "analyze_visual_document",
    "generate_synthetic_logo",
    "get_all_demo_fixtures",
    "seed_demo_logo_references",
    "generate_logo_verification_report",
    "get_logo_report",
    "get_logo_report_pdf_bytes",
    "verify_logo_report_authenticity",
    "list_logo_reports",
]
