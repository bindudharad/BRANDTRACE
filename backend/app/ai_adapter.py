"""
Replaceable AI Model Adapter for BRANDTRACE.
Provides:
- BaseAIProvider interface
- OfflineProvider (deterministic BM25-style keyword retrieval & triage for offline demo mode)
- GeminiProvider (server-side REST integration with strict JSON schemas, timeouts, and fallback)
"""
from __future__ import annotations

import json
import logging
import math
import re
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

import httpx

from .config import (
    AI_PROVIDER,
    AI_PROVIDER_API_KEY,
    AI_MODEL_NAME,
    AI_TIMEOUT_SECONDS,
)

logger = logging.getLogger("brandtrace.ai")

class AIFindingCandidate(BaseModel):
    category: str = Field(..., description="Issue category e.g. tone, claims, messaging")
    passage: str = Field(..., description="Exact quoted phrase from text")
    severity: str = Field("MEDIUM", description="LOW, MEDIUM, HIGH, CRITICAL")
    status: str = Field("NEEDS_REVIEW", description="SUPPORTED, CONTRADICTED, OUTDATED, UNSUPPORTED_BY_APPROVED_EVIDENCE, NEEDS_REVIEW")
    explanation: str = Field(..., description="Clear explanation of the problem")
    suggested_correction: Optional[str] = Field(None, description="Suggested minimal edit preserving creator intent")
    cited_source_title: Optional[str] = Field(None, description="Title of approved guideline or fact cited")
    cited_source_id: Optional[str] = Field(None, description="ID of persisted source cited")
    analysis_method: str = Field("OFFLINE_TRIAGE", description="Method used to detect this issue")
    uncertainty: str = Field("Human review required", description="Confidence or limitation note")

class BaseAIProvider(ABC):
    @abstractmethod
    async def triage_content(
        self,
        content: str,
        rules: List[Dict[str, Any]],
        facts: List[Dict[str, Any]],
    ) -> List[AIFindingCandidate]:
        """Triage content for tone, unverified claims, and messaging against guidelines."""
        pass

class OfflineProvider(BaseAIProvider):
    """
    Offline model provider for local demo mode.
    Runs completely offline with zero API keys or external dependencies.
    Uses BM25-style token overlap and deterministic regex heuristics to detect
    promotional claims, absolute statements, service commitments, and quantitative claims.
    """
    ABSOLUTE_TERMS = [
        "always", "never", "guarantee", "guaranteed", "100%", "best",
        "revolutionary", "unmatched", "flawless", "cheapest", "miracle",
        "zero risk", "uninterrupted service", "zero downtime"
    ]

    def _tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r"\b\w{3,}\b", text)]

    def _bm25_similarity(self, query_tokens: List[str], doc_tokens: List[str]) -> float:
        """Lightweight BM25 score approximation over short strings."""
        if not query_tokens or not doc_tokens:
            return 0.0
        doc_len = len(doc_tokens)
        avg_len = 10.0
        k1 = 1.2
        b = 0.75

        score = 0.0
        doc_freq = {}
        for t in doc_tokens:
            doc_freq[t] = doc_freq.get(t, 0) + 1

        for q in set(query_tokens):
            if q in doc_freq:
                tf = doc_freq[q]
                numerator = tf * (k1 + 1)
                denominator = tf + k1 * (1 - b + b * (doc_len / avg_len))
                score += numerator / denominator
        return score

    async def triage_content(
        self,
        content: str,
        rules: List[Dict[str, Any]],
        facts: List[Dict[str, Any]],
    ) -> List[AIFindingCandidate]:
        findings: List[AIFindingCandidate] = []
        lower = content.lower()
        content_tokens = self._tokenize(content)
        seen_spans: List[Tuple[int, int]] = []

        def _is_overlapping(start: int, end: int) -> bool:
            return any(not (end <= s or start >= e) for s, e in seen_spans)

        # 1. Absolute & Promotional Term Triage
        sorted_terms = sorted(self.ABSOLUTE_TERMS, key=len, reverse=True)
        pattern = r"\b(" + "|".join(re.escape(w) for w in sorted_terms) + r")\b"
        for match in re.finditer(pattern, content, re.IGNORECASE):
            s, e = match.span()
            if _is_overlapping(s, e):
                continue
            seen_spans.append((s, e))
            token = match.group(0)

            # Context-sensitive neutral suggested corrections
            # Avoid replacing one unsupported claim with another promotional claim.
            # Do not introduce claims that require evidence (e.g. "zero risk" -> "low risk"
            # or "uninterrupted service" -> "high-availability service") unless approved evidence exists.
            t_lower = token.lower()
            if t_lower == "best":
                sugg = "effective"
            elif t_lower == "best choice":
                sugg = "effective choice"
            elif t_lower == "cheap":
                sugg = "accessible"
            else:
                # Absolute and promotional promises like "guarantee", "guaranteed", "zero risk",
                # "uninterrupted service" should NOT have speculative automated replacements that
                # break grammar (e.g. "Get committed to delivering results") or introduce unverified
                # claims. Reviewers must provide manual substantiation or edit directly.
                sugg = None

            findings.append(
                AIFindingCandidate(
                    category="claims",
                    passage=token,
                    severity="MEDIUM",
                    status="NEEDS_REVIEW",
                    explanation=f"Offline triage identified an absolute or promotional claim '{token}'. Promotional claims require substantiation with approved evidence.",
                    suggested_correction=sugg,
                    cited_source_title=None,
                    cited_source_id=None,
                    analysis_method="OFFLINE_TRIAGE",
                    uncertainty="Offline heuristic triage; human review required.",
                )
            )

        # 2. SLA & Uptime Percentage Promises (e.g. 99.9% uptime, 99.99% availability)
        sla_pattern = r"\b(\d{1,2}(?:\.\d+)?%\s*(?:uptime|availability))\b"
        for match in re.finditer(sla_pattern, content, re.IGNORECASE):
            s, e = match.span()
            if _is_overlapping(s, e):
                continue
            seen_spans.append((s, e))
            token = match.group(0)

            # Check if an approved fact verifies this SLA claim
            matching_fact = next(
                (f for f in facts if token.lower() in f.get("value", "").lower() and f.get("status") == "APPROVED"),
                None
            )
            if matching_fact:
                findings.append(
                    AIFindingCandidate(
                        category="claims",
                        passage=token,
                        severity="LOW",
                        status="SUPPORTED",
                        explanation=f"SLA claim '{token}' is supported by approved fact '{matching_fact.get('claim')}'.",
                        suggested_correction=None,
                        cited_source_title=matching_fact.get("source_title"),
                        cited_source_id=matching_fact.get("id"),
                        analysis_method="OFFLINE_TRIAGE",
                        uncertainty="Grounded against approved fact ledger.",
                    )
                )
            else:
                findings.append(
                    AIFindingCandidate(
                        category="claims",
                        passage=token,
                        severity="HIGH",
                        status="NEEDS_REVIEW",
                        explanation=f"Service-availability promise '{token}' is not grounded in the approved claim ledger. SLA commitments require verified infrastructure documentation.",
                        suggested_correction=None,
                        cited_source_title=None,
                        cited_source_id=None,
                        analysis_method="OFFLINE_TRIAGE",
                        uncertainty="Quantitative availability claim requiring infrastructure documentation.",
                    )
                )

        # 3. Quantitative Productivity / Time-Saving Claims (e.g. save 50% of their time)
        # NOTE: trailing \b removed after % because % is a non-word char; \b between two non-word
        # chars (% and space) never matches.  The leading \b anchors correctly.
        quant_pattern = r"\b((?:save|reduce)\s+(?:up\s+to\s+)?(?:100|\d{1,2})%(?:\s+(?:of|on|in)\s+[\w]{2,15}(?:\s+[\w]{2,15})?)?|reduce\s+[\w]{2,15}(?:\s+[\w]{2,15})?\s+by\s+(?:100|\d{1,2})%|\d{1,3}x\s+(?:faster|more\s+efficient|increase\b))"
        for match in re.finditer(quant_pattern, content, re.IGNORECASE):
            s, e = match.span()
            if _is_overlapping(s, e):
                continue
            seen_spans.append((s, e))
            token = match.group(0).strip()

            matching_fact = next(
                (f for f in facts if token.lower() in f.get("value", "").lower() and f.get("status") == "APPROVED"),
                None
            )
            if matching_fact:
                findings.append(
                    AIFindingCandidate(
                        category="claims",
                        passage=token,
                        severity="LOW",
                        status="SUPPORTED",
                        explanation=f"Performance claim '{token}' is substantiated by approved fact '{matching_fact.get('claim')}'.",
                        suggested_correction=None,
                        cited_source_title=matching_fact.get("source_title"),
                        cited_source_id=matching_fact.get("id"),
                        analysis_method="OFFLINE_TRIAGE",
                        uncertainty="Grounded against approved fact ledger.",
                    )
                )
            else:
                findings.append(
                    AIFindingCandidate(
                        category="claims",
                        passage=token,
                        severity="MEDIUM",
                        status="NEEDS_REVIEW",
                        explanation=f"Quantitative benchmark claim '{token}' is unverified. Statistical productivity claims require a verified benchmark report or approved case study.",
                        suggested_correction=None,
                        cited_source_title=None,
                        cited_source_id=None,
                        analysis_method="OFFLINE_TRIAGE",
                        uncertainty="Quantitative productivity claim without verified claim ledger entry.",
                    )
                )

        # 4. Geographic Territory Claims vs Approved Scope (e.g. across every region)
        geo_pattern = r"\b(across\s+every\s+region|globally\s+available|in\s+all\s+regions|available\s+worldwide)\b"
        for match in re.finditer(geo_pattern, content, re.IGNORECASE):
            s, e = match.span()
            if _is_overlapping(s, e):
                continue
            seen_spans.append((s, e))
            token = match.group(0)

            # Collect ALL territory-related approved facts
            territory_facts = [
                f for f in facts
                if f.get("status") == "APPROVED" and (
                    "availability" in f.get("claim", "").lower()
                    or "territory" in f.get("claim", "").lower()
                    or "market" in f.get("claim", "").lower()
                )
            ]

            if territory_facts:
                # Check across ALL territory facts for the strongest signal
                global_keywords = ("globally", "worldwide", "every region", "all regions", "all markets")
                exclusive_keywords = ("only in", "exclusively in", "restricted to", "limited to", "solely in")

                # Priority 1: Does any fact confirm global availability?
                global_fact = next(
                    (f for f in territory_facts if any(kw in f.get("value", "").lower() for kw in global_keywords)),
                    None,
                )
                if global_fact:
                    findings.append(
                        AIFindingCandidate(
                            category="claims",
                            passage=token,
                            severity="LOW",
                            status="SUPPORTED",
                            explanation=f"Broad territory claim '{token}' is substantiated by approved fact '{global_fact.get('claim')}': '{global_fact.get('value')}'.",
                            suggested_correction=None,
                            cited_source_title=global_fact.get("source_title"),
                            cited_source_id=global_fact.get("id"),
                            analysis_method="OFFLINE_TRIAGE",
                            uncertainty="Grounded against approved fact ledger confirming global scope.",
                        )
                    )
                    continue

                # Priority 2: Does any fact establish an exclusive territorial restriction?
                exclusive_fact = next(
                    (f for f in territory_facts if any(
                        kw in f.get("value", "").lower() or kw in f.get("source_excerpt", "").lower()
                        for kw in exclusive_keywords
                    )),
                    None,
                )
                if exclusive_fact:
                    findings.append(
                        AIFindingCandidate(
                            category="claims",
                            passage=token,
                            severity="HIGH",
                            status="CONTRADICTED",
                            explanation=f"Broad territory claim '{token}' contradicts approved fact '{exclusive_fact.get('claim')}': '{exclusive_fact.get('value')}'. The approved evidence explicitly limits availability to a specific region.",
                            suggested_correction=None,
                            cited_source_title=exclusive_fact.get("source_title"),
                            cited_source_id=exclusive_fact.get("id"),
                            analysis_method="OFFLINE_TRIAGE",
                            uncertainty="Territory claim directly contradicts an exclusive territorial restriction in the approved claim ledger.",
                        )
                    )
                else:
                    # Facts confirm narrower regions but do NOT state exclusivity.
                    # Broad claim is unsupported — needs human review.
                    ref_fact = territory_facts[0]
                    findings.append(
                        AIFindingCandidate(
                            category="claims",
                            passage=token,
                            severity="HIGH",
                            status="NEEDS_REVIEW",
                            explanation=f"Broad territory claim '{token}' is not substantiated by the approved claim ledger. The relevant approved fact is '{ref_fact.get('claim')}': '{ref_fact.get('value')}', which confirms a narrower region without establishing global availability.",
                            suggested_correction=None,
                            cited_source_title=ref_fact.get("source_title"),
                            cited_source_id=ref_fact.get("id"),
                            analysis_method="OFFLINE_TRIAGE",
                            uncertainty="Broad scope claim lacks approved evidence for the full claimed territory. Approved facts cover a narrower region only.",
                        )
                    )
            else:
                findings.append(
                    AIFindingCandidate(
                        category="claims",
                        passage=token,
                        severity="MEDIUM",
                        status="NEEDS_REVIEW",
                        explanation=f"Broad territory claim '{token}' requires regional regulatory and distribution confirmation.",
                        suggested_correction=None,
                        cited_source_title=None,
                        cited_source_id=None,
                        analysis_method="OFFLINE_TRIAGE",
                        uncertainty="Regional availability statement requires territorial confirmation.",
                    )
                )

        # 5. Fact Grounding Check (BM25 token retrieval)
        for fact in facts:
            fact_tokens = self._tokenize(fact.get("claim", "") + " " + fact.get("value", ""))
            sim = self._bm25_similarity(content_tokens, fact_tokens)
            if sim > 2.0:
                fact_val = fact.get("value", "")
                if fact_val and fact_val.lower() not in lower:
                    findings.append(
                        AIFindingCandidate(
                            category="claims",
                            passage=fact.get("claim", "Approved claim topic"),
                            severity="HIGH",
                            status="UNSUPPORTED_BY_APPROVED_EVIDENCE",
                            explanation=f"Draft touches on approved topic '{fact.get('claim')}', but does not include verified claim value '{fact_val}'.",
                            suggested_correction=None,
                            cited_source_title=fact.get("source_title"),
                            cited_source_id=fact.get("id"),
                            analysis_method="OFFLINE_TRIAGE",
                            uncertainty="BM25 topic grounding match against approved facts ledger.",
                        )
                    )

        return findings

class GeminiProvider(BaseAIProvider):
    """
    Server-side Google Gemini REST API model adapter.
    Uses strict system prompts, bounded JSON outputs, configurable timeouts,
    and post-generation citation validation.
    """
    def __init__(self, api_key: str, model_name: str = AI_MODEL_NAME, timeout: float = AI_TIMEOUT_SECONDS):
        self.api_key = api_key
        self.model_name = model_name
        self.timeout = timeout
        self.fallback = OfflineProvider()

    async def triage_content(
        self,
        content: str,
        rules: List[Dict[str, Any]],
        facts: List[Dict[str, Any]],
    ) -> List[AIFindingCandidate]:
        if not self.api_key:
            return await self.fallback.triage_content(content, rules, facts)

        # Prepare bounded guidelines and facts prompt
        guideline_summaries = [
            f"Rule [{r.get('id')}]: {r.get('title')} - Requirement: {r.get('requirement')} (Source: {r.get('source_title')})"
            for r in rules[:10]
        ]
        fact_summaries = [
            f"Fact [{f.get('id')}]: {f.get('claim')} => Value: {f.get('value')} (Source: {f.get('source_title')})"
            for f in facts[:10]
        ]

        system_instruction = (
            "You are the BRANDTRACE brand governance assistant. Analyze the given content for tone violations, "
            "unsupported promotional claims, and consistency issues against approved brand guidelines and facts.\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. You MUST ONLY cite Source IDs and Titles that are explicitly provided in the guidelines or facts list.\n"
            "2. If an issue is an unsubstantiated claim without a matching approved fact, mark status as 'NEEDS_REVIEW' and set cited_source_id to null.\n"
            "3. Output MUST be a strictly valid JSON array of objects with keys: category, passage, severity, status, explanation, suggested_correction, cited_source_id, cited_source_title.\n"
            "4. Do NOT invent citations. Do NOT add markdown code fence formatting outside the JSON array."
        )

        user_prompt = (
            f"APPROVED GUIDELINES:\n" + "\n".join(guideline_summaries) + "\n\n"
            f"APPROVED FACTS:\n" + "\n".join(fact_summaries) + "\n\n"
            f"DRAFT CONTENT TO REVIEW:\n{content[:4000]}"
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"

        payload = {
            "contents": [{"parts": [{"text": user_prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    logger.warning(f"Gemini API returned status {response.status_code}: {response.text}")
                    return await self.fallback.triage_content(content, rules, facts)

                data = response.json()
                text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                raw_findings = json.loads(text_response)

                validated_findings: List[AIFindingCandidate] = []
                known_rule_ids = {r.get("id"): r for r in rules}
                known_fact_ids = {f.get("id"): f for f in facts}

                for item in raw_findings:
                    cited_id = item.get("cited_source_id")
                    cited_title = item.get("cited_source_title")

                    # Enforce citation grounding: if cited_id does not exist in persisted records, nullify it
                    if cited_id and cited_id not in known_rule_ids and cited_id not in known_fact_ids:
                        cited_id = None
                        cited_title = None

                    validated_findings.append(
                        AIFindingCandidate(
                            category=item.get("category", "tone"),
                            passage=item.get("passage", ""),
                            severity=item.get("severity", "MEDIUM"),
                            status=item.get("status", "NEEDS_REVIEW"),
                            explanation=item.get("explanation", "Identified by AI assistant."),
                            suggested_correction=item.get("suggested_correction"),
                            cited_source_title=cited_title,
                            cited_source_id=cited_id,
                            analysis_method="GEMINI_ASSISTED",
                            uncertainty="Verified Gemini response; citations resolved against persisted records.",
                        )
                    )
                return validated_findings

        except (httpx.TimeoutException, httpx.RequestError, json.JSONDecodeError, KeyError, Exception) as exc:
            logger.warning(f"Gemini provider call failed or timed out ({type(exc).__name__}): {exc}. Falling back to offline provider.")
            return await self.fallback.triage_content(content, rules, facts)

def get_ai_provider() -> BaseAIProvider:
    """Factory function returning the configured AI provider."""
    if AI_PROVIDER in ("gemini", "google") and AI_PROVIDER_API_KEY:
        return GeminiProvider(api_key=AI_PROVIDER_API_KEY)
    return OfflineProvider()
