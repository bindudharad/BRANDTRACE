"""
Groq Vision OCR Service for BRANDTRACE.

Uses Groq vision models (e.g. llama-3.2-11b-vision-preview, qwen/qwen3.8-27b)
to perform optical character recognition on scanned PDF pages and image assets.
Adheres to:
- Max image batch limits (GROQ_MAX_IMAGES_PER_REQUEST <= 3).
- Structured JSON output parsing.
- Truthful provenance marking.
- Fallback resilience when unconfigured or offline.
"""
from __future__ import annotations

import base64
import json
import logging
from typing import Any, Dict, List, Optional

from app.config import (
    GROQ_VISION_MODEL,
    GROQ_MAX_IMAGES_PER_REQUEST,
)
from app.services.groq_client import get_groq_client, is_groq_configured

logger = logging.getLogger("brandtrace.groq_ocr")


class GroqOCRError(Exception):
    def __init__(self, message: str, is_retryable: bool = False):
        super().__init__(message)
        self.message = message
        self.is_retryable = is_retryable


def extract_text_from_image_bytes(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    prompt_context: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Perform Groq Vision OCR on a single image (PNG, JPEG, WebP).

    Returns:
        {
            "extracted_text": str,
            "provenance": "GROQ_VISION_OCR",
            "model": str,
            "warnings": List[str],
        }
    """
    if not is_groq_configured():
        raise GroqOCRError("Groq Vision OCR is not configured in this environment.")

    client = get_groq_client()
    if not client:
        raise GroqOCRError("Groq client could not be initialized.")

    b64_img = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{b64_img}"

    system_instruction = (
        "You are an accurate OCR engine for BRANDTRACE brand governance. "
        "Extract all readable text from the provided image accurately, preserving "
        "layout order and line breaks. Do not summarize, interpret, or add markdown commentary. "
        "Return ONLY the verbatim extracted text."
    )

    user_text = prompt_context or "Transcribe all visible text from this image exactly as written."

    try:
        response = client.chat.completions.create(
            model=GROQ_VISION_MODEL,
            messages=[
                {"role": "system", "content": system_instruction},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_text},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
            temperature=0.0,
            max_tokens=2048,
        )

        extracted = response.choices[0].message.content or ""
        return {
            "extracted_text": extracted.strip(),
            "provenance": "GROQ_VISION_OCR",
            "model": GROQ_VISION_MODEL,
            "warnings": [],
        }
    except Exception as exc:
        logger.error(f"Groq Vision OCR error: {exc}")
        raise GroqOCRError(f"Groq Vision OCR processing failed: {exc}")


def extract_text_from_pdf_pages_ocr(
    rendered_pages: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Perform Groq Vision OCR on a sequence of rendered PDF pages.
    Batches pages up to GROQ_MAX_IMAGES_PER_REQUEST.

    Returns:
        {
            "combined_text": str,
            "pages": List[{"page_number": int, "extracted_text": str, "warnings": List[str]}],
            "provenance": "GROQ_VISION_OCR",
            "model": str,
            "document_warnings": List[str],
        }
    """
    if not is_groq_configured():
        raise GroqOCRError("Groq Vision OCR is not configured.")

    if not rendered_pages:
        return {
            "combined_text": "",
            "pages": [],
            "provenance": "GROQ_VISION_OCR",
            "model": GROQ_VISION_MODEL,
            "document_warnings": ["No pages rendered for OCR."],
        }

    client = get_groq_client()
    if not client:
        raise GroqOCRError("Groq client could not be initialized.")

    batch_size = max(1, min(GROQ_MAX_IMAGES_PER_REQUEST, 3))
    all_page_results: List[Dict[str, Any]] = []
    doc_warnings: List[str] = []

    # Process in batches
    for i in range(0, len(rendered_pages), batch_size):
        batch = rendered_pages[i : i + batch_size]

        content_parts: List[Dict[str, Any]] = [
            {
                "type": "text",
                "text": (
                    f"Perform OCR on the attached {len(batch)} document page(s). "
                    "For each page, output the extracted text in a strictly valid JSON object matching:\n"
                    '{"pages": [{"page_number": <number>, "extracted_text": "<text>"}]}'
                ),
            }
        ]

        for p in batch:
            b64_data = base64.b64encode(p["jpeg_bytes"]).decode("utf-8")
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64_data}"},
            })

        system_instruction = (
            "You are an accurate OCR engine for document governance. Transcribe the text from each page image. "
            "Output MUST be valid JSON with key 'pages' containing a list of objects with 'page_number' and 'extracted_text'. "
            "Do NOT add markdown fences or conversational preambles."
        )

        try:
            response = client.chat.completions.create(
                model=GROQ_VISION_MODEL,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": content_parts},
                ],
                temperature=0.0,
                response_format={"type": "json_object"},
                max_tokens=4096,
            )

            raw_resp = response.choices[0].message.content or "{}"
            parsed = json.loads(raw_resp)
            pages_data = parsed.get("pages", [])

            # Reconcile page numbers with actual batch
            for idx, p_info in enumerate(batch):
                actual_page_num = p_info["page_number"]
                found_text = ""
                # Match by returned page_number or fallback to index
                matched = next(
                    (p for p in pages_data if p.get("page_number") == actual_page_num),
                    None
                )
                if matched and matched.get("extracted_text"):
                    found_text = matched["extracted_text"].strip()
                elif idx < len(pages_data):
                    found_text = (pages_data[idx].get("extracted_text") or "").strip()

                all_page_results.append({
                    "page_number": actual_page_num,
                    "extracted_text": found_text,
                    "warnings": [] if found_text else ["Page returned empty OCR text."],
                })

        except Exception as exc:
            logger.error(f"Groq OCR batch failure (pages {[p['page_number'] for p in batch]}): {exc}")
            doc_warnings.append(f"OCR failed for pages {[p['page_number'] for p in batch]}: {str(exc)}")
            # Fallback for failed batch
            for p_info in batch:
                all_page_results.append({
                    "page_number": p_info["page_number"],
                    "extracted_text": "",
                    "warnings": [f"OCR call failed: {exc}"],
                })

    # Combine pages with clear page markers
    page_sections = []
    for pr in all_page_results:
        if pr["extracted_text"]:
            page_sections.append(f"[Page {pr['page_number']}]\n{pr['extracted_text']}")

    combined = "\n\n".join(page_sections)

    return {
        "combined_text": combined,
        "pages": all_page_results,
        "provenance": "GROQ_VISION_OCR",
        "model": GROQ_VISION_MODEL,
        "document_warnings": doc_warnings,
    }
