"""
Brand Guideline Importer Service for BRANDTRACE.
Extracts structured governance rule and fact candidates from digital brand guideline PDFs
with strict source provenance (document hash, exact page, excerpt, category, severity).
Works 100% deterministically; optional Groq structuring can supplement when configured and consented.
"""
from __future__ import annotations

import hashlib
import re
from typing import Any, Dict, List, Optional, Tuple

from app.pdf_parser import extract_pdf_pages, PDFExtractionError
from app.services.groq_client import is_groq_configured, get_groq_client
from app.config import GROQ_TEXT_MODEL


def clean_text_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def find_section_heading(lines: List[str], current_idx: int) -> Optional[str]:
    """Inspect preceding lines to locate the nearest section heading."""
    for i in range(current_idx - 1, max(-1, current_idx - 10), -1):
        line = lines[i].strip()
        if not line:
            continue
        # Headings often start with numbers, capitals, or symbols like #
        if (
            re.match(r"^(?:Section\s+\d+|Chapter\s+\d+|\d+\.|\d+\.\d+|#+)\s*", line, re.IGNORECASE)
            or (len(line) < 60 and line.isupper())
            or (len(line) < 50 and line.endswith(":"))
            or (len(line) < 45 and not line.endswith("."))
        ):
            return line.rstrip(":")
    return None


def extract_candidates_from_pdf(
    file_bytes: bytes,
    filename: str,
    consent_ai: bool = False,
) -> Dict[str, Any]:
    """
    Deterministically parses brand guideline PDF into structured candidate rules and facts.
    """
    if not file_bytes:
        raise PDFExtractionError("Uploaded PDF file is empty.")

    doc_hash = hashlib.sha256(file_bytes).hexdigest()
    pages = extract_pdf_pages(file_bytes, max_pages=60)

    if not pages:
        raise PDFExtractionError("PDF contains no extractable digital text. If scanned, OCR may be required.")

    candidates: List[Dict[str, Any]] = []
    seen_patterns = set()

    for page_num, page_text in pages:
        lines = [clean_text_whitespace(l) for l in page_text.splitlines() if l.strip()]

        for idx, line in enumerate(lines):
            # Prohibited phrases / Forbidden terms
            # E.g. "Do not use 'cheap'", "Prohibited: 'best in class'", "Avoid 'guaranteed'"
            prohib_matches = re.finditer(
                r"(?:do\s+not\s+use|prohibited(?:\s*terms?)?:?|avoid\s+(?:using)?|never\s+use|forbidden(?:\s*terms?)?:?)\s+['\"“]([^'\"”\n,;]+)['\"”]",
                line,
                re.IGNORECASE,
            )
            for m in prohib_matches:
                phrase = m.group(1).strip()
                norm = phrase.lower()
                if norm and norm not in seen_patterns and len(phrase) >= 2:
                    seen_patterns.add(norm)
                    heading = find_section_heading(lines, idx)
                    excerpt = line[:250]
                    candidates.append({
                        "candidate_type": "rule",
                        "category": "terminology",
                        "kind": "prohibited_phrase",
                        "pattern": phrase,
                        "requirement": f"Do not use '{phrase}' in brand and marketing communications.",
                        "severity": "HIGH",
                        "page_number": page_num,
                        "section_heading": heading,
                        "original_excerpt": excerpt,
                        "extraction_method": "DETERMINISTIC_PARSER",
                    })

            # "Instead of X, use Y"
            instead_matches = re.finditer(
                r"use\s+['\"“]([^'\"”\n,;]+)['\"”]\s+instead\s+of\s+['\"“]([^'\"”\n,;]+)['\"”]",
                line,
                re.IGNORECASE,
            )
            for m in instead_matches:
                approved_term = m.group(1).strip()
                forbidden_term = m.group(2).strip()
                norm = forbidden_term.lower()
                if norm and norm not in seen_patterns:
                    seen_patterns.add(norm)
                    heading = find_section_heading(lines, idx)
                    candidates.append({
                        "candidate_type": "rule",
                        "category": "terminology",
                        "kind": "forbidden_term",
                        "pattern": forbidden_term,
                        "requirement": f"Use '{approved_term}' instead of '{forbidden_term}'.",
                        "severity": "HIGH",
                        "page_number": page_num,
                        "section_heading": heading,
                        "original_excerpt": line[:250],
                        "extraction_method": "DETERMINISTIC_PARSER",
                    })

            # Mandatory / Required phrases
            # E.g. "Must include 'Brandtrace'", "Mandatory phrase: 'all rights reserved'"
            req_matches = re.finditer(
                r"(?:must\s+(?:always\s+)?(?:include|use|contain)|mandatory(?:\s*phrase)?:?|required(?:\s*phrase)?:?|always\s+capitalize(?:\s*as)?:?)\s+['\"“]([^'\"”\n,;]+)['\"”]",
                line,
                re.IGNORECASE,
            )
            for m in req_matches:
                phrase = m.group(1).strip()
                norm = phrase.lower()
                if norm and norm not in seen_patterns and len(phrase) >= 2:
                    seen_patterns.add(norm)
                    heading = find_section_heading(lines, idx)
                    candidates.append({
                        "candidate_type": "rule",
                        "category": "terminology",
                        "kind": "required_phrase",
                        "pattern": phrase,
                        "requirement": f"Drafts must include approved term '{phrase}'.",
                        "severity": "MEDIUM",
                        "page_number": page_num,
                        "section_heading": heading,
                        "original_excerpt": line[:250],
                        "extraction_method": "DETERMINISTIC_PARSER",
                    })

            # Superlatives / Voice restrictions
            # E.g. "Avoid unsupported superlatives like 'best' or 'fastest'"
            if re.search(r"\b(?:superlatives?|unsubstantiated\s+claims?|exaggerat(?:ed|ions?))\b", line, re.IGNORECASE):
                word_matches = re.findall(r"['\"“]([a-zA-Z\s]{2,30})['\"”]", line)
                for w in word_matches:
                    w_norm = w.strip().lower()
                    if w_norm and w_norm not in seen_patterns:
                        seen_patterns.add(w_norm)
                        heading = find_section_heading(lines, idx)
                        candidates.append({
                            "candidate_type": "rule",
                            "category": "voice",
                            "kind": "prohibited_phrase",
                            "pattern": w.strip(),
                            "requirement": f"Avoid unsubstantiated superlative '{w.strip()}' in customer-facing messaging.",
                            "severity": "HIGH",
                            "page_number": page_num,
                            "section_heading": heading,
                            "original_excerpt": line[:250],
                            "extraction_method": "DETERMINISTIC_PARSER",
                        })

            # Brand facts & geographic availability
            # E.g. "Available in India", "Founded in 2024", "Headquartered in Bangalore"
            fact_matches = re.finditer(
                r"(?:available\s+in|headquartered\s+in|founded\s+in|certified\s+by|backed\s+by)\s+([A-Za-z0-9\s,\.\-]{3,40})",
                line,
                re.IGNORECASE,
            )
            for fm in fact_matches:
                fact_val = fm.group(0).strip()
                norm = fact_val.lower()
                if norm and norm not in seen_patterns and len(fact_val) <= 60:
                    seen_patterns.add(norm)
                    heading = find_section_heading(lines, idx)
                    candidates.append({
                        "candidate_type": "fact",
                        "category": "fact",
                        "kind": "fact",
                        "pattern": fact_val,
                        "requirement": f"Verified factual claim: {fact_val}.",
                        "severity": "HIGH",
                        "page_number": page_num,
                        "section_heading": heading,
                        "original_excerpt": line[:250],
                        "extraction_method": "DETERMINISTIC_PARSER",
                    })

            # Visual color / contrast rules
            # E.g. "Primary color: #0f766e", "Minimum contrast ratio 4.5:1"
            hex_match = re.search(r"(?:primary|secondary|accent)\s+(?:brand\s+)?colo[u]?r:?\s*(#[0-9a-fA-F]{6})", line, re.IGNORECASE)
            if hex_match:
                color_hex = hex_match.group(1).lower()
                norm = f"color_{color_hex}"
                if norm not in seen_patterns:
                    seen_patterns.add(norm)
                    heading = find_section_heading(lines, idx)
                    candidates.append({
                        "candidate_type": "rule",
                        "category": "visual",
                        "kind": "approved_term",
                        "pattern": color_hex,
                        "requirement": f"Brand approved color palette hex {color_hex}.",
                        "severity": "MEDIUM",
                        "page_number": page_num,
                        "section_heading": heading,
                        "original_excerpt": line[:250],
                        "extraction_method": "DETERMINISTIC_PARSER",
                    })

    # Optional AI enhancement if configured and explicitly consented
    if consent_ai and is_groq_configured():
        try:
            ai_candidates = _extract_with_groq_ai(pages, seen_patterns)
            candidates.extend(ai_candidates)
        except Exception:
            # Fallback gracefully to deterministic extraction
            pass

    return {
        "document_hash": doc_hash,
        "page_count": len(pages),
        "candidates": candidates,
    }


def _extract_with_groq_ai(pages: List[Tuple[int, str]], seen_patterns: set) -> List[Dict[str, Any]]:
    """Use Groq to organize additional candidate rules from complex paragraphs."""
    client = get_groq_client()
    if not client:
        return []

    # Sample text from first few pages
    sample_text = "\n\n".join([f"[Page {p}]\n{t[:1000]}" for p, t in pages[:3]])
    prompt = f"""You are a brand governance compliance specialist. Analyze these brand guideline pages.
Extract up to 5 clear candidate rules (prohibited phrases, required phrases, or approved terms).
Return strictly a JSON array of objects with keys:
"pattern", "kind" (prohibited_phrase, required_phrase, or approved_term), "category" (terminology, voice, or visual), "requirement", "severity" (HIGH, MEDIUM, LOW), "page_number", "original_excerpt".
Text:
{sample_text}
"""
    try:
        resp = client.chat.completions.create(
            model=GROQ_TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"},
            max_tokens=800,
        )
        content = resp.choices[0].message.content or "{}"
        import json
        data = json.loads(content)
        items = data.get("rules") or data.get("candidates") or (data if isinstance(data, list) else [])
        ai_cands = []
        for it in items:
            pat = it.get("pattern", "").strip()
            norm = pat.lower()
            if norm and norm not in seen_patterns:
                seen_patterns.add(norm)
                ai_cands.append({
                    "candidate_type": "rule",
                    "category": it.get("category", "terminology"),
                    "kind": it.get("kind", "prohibited_phrase"),
                    "pattern": pat,
                    "requirement": it.get("requirement", f"Brand guideline rule for '{pat}'."),
                    "severity": it.get("severity", "MEDIUM"),
                    "page_number": int(it.get("page_number", 1)),
                    "section_heading": "AI Synthesized Rule",
                    "original_excerpt": it.get("original_excerpt", "")[:250],
                    "extraction_method": "GROQ_AI_ORGANIZED",
                })
        return ai_cands
    except Exception:
        return []
