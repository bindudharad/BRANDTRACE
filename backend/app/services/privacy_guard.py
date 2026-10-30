"""
Privacy Preflight & PII Safeguard for BRANDTRACE.

Detects personal contact information in documents (resumes, emails, CVs)
before external AI services are invoked. Never stores or logs raw matches.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

# Standard patterns for contact information & sensitive identifiers
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_PATTERN = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b")
RESUME_KEYWORDS = re.compile(
    r"\b(curriculum vitae|resume|education|work experience|employment history|references available)\b",
    re.IGNORECASE,
)


def scan_text_for_pii(text: str) -> Dict[str, Any]:
    """
    Scan text for potential personal identification information.

    Returns:
        {
            "has_pii": bool,
            "detected_types": List[str],  # e.g. ["email", "phone", "resume_metadata"]
            "warning_message": Optional[str],
            "redacted_sample": str,
        }
    """
    if not text:
        return {
            "has_pii": False,
            "detected_types": [],
            "warning_message": None,
        }

    detected_types: List[str] = []

    if EMAIL_PATTERN.search(text):
        detected_types.append("email_address")
    if PHONE_PATTERN.search(text):
        detected_types.append("phone_number")
    if RESUME_KEYWORDS.search(text):
        detected_types.append("personal_credential_document")

    has_pii = len(detected_types) > 0
    warning_msg = None
    if has_pii:
        items = ", ".join(t.replace("_", " ") for t in detected_types)
        warning_msg = (
            f"Privacy Notice: Document appears to contain personal information ({items}). "
            "Ensure you have consent to process this material externally, or choose local deterministic review."
        )

    return {
        "has_pii": has_pii,
        "detected_types": detected_types,
        "warning_message": warning_msg,
    }


def inspect_document_privacy_preflight(text: str, filename: str = "") -> Dict[str, Any]:
    """Convenience alias for scanning document text and metadata for personal data."""
    scan = scan_text_for_pii(text)
    is_personal = (
        "personal_credential_document" in scan["detected_types"]
        or bool(re.search(r"resume|cv|curriculum", filename, re.IGNORECASE))
    )
    return {
        "has_pii": scan["has_pii"] or is_personal,
        "is_likely_personal_doc": is_personal,
        "detected_types": scan["detected_types"],
        "warning_message": scan["warning_message"],
    }

