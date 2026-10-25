"""
Unit tests for replaceable AI model adapter.
Verifies offline heuristic triage, safe fallback on error/timeout,
and honest provider status reporting.
"""
import os
import pytest
from app.ai_adapter import OfflineProvider, GeminiProvider, get_ai_provider

@pytest.mark.asyncio
async def test_offline_provider_detects_promotional_claims():
    provider = OfflineProvider()
    rules = []
    facts = []

    content = "Our revolutionary platform is guaranteed to provide the best results."
    findings = await provider.triage_content(content, rules, facts)

    assert len(findings) >= 2
    passages = [f.passage.lower() for f in findings]
    assert "revolutionary" in passages or "guaranteed" in passages or "best" in passages

    for f in findings:
        assert f.status == "NEEDS_REVIEW"
        assert f.cited_source_id is None
        assert f.analysis_method == "OFFLINE_TRIAGE"

@pytest.mark.asyncio
async def test_offline_provider_harmless_text_no_findings():
    provider = OfflineProvider()
    rules = []
    facts = []

    content = "Brandtrace is a governance workflow platform for teams."
    findings = await provider.triage_content(content, rules, facts)
    assert len(findings) == 0

@pytest.mark.asyncio
async def test_gemini_provider_safe_fallback_on_invalid_key():
    # Intentionally test that an invalid key safely falls back to offline provider without raising
    provider = GeminiProvider(api_key="invalid_dummy_key_for_test", timeout=1.0)
    rules = [{"id": "r1", "title": "Tone", "requirement": "Be humble", "source_title": "Voice"}]
    facts = [{"id": "f1", "claim": "Availability", "value": "Global", "source_title": "Brief"}]

    content = "We always offer revolutionary performance."
    findings = await provider.triage_content(content, rules, facts)

    # Fallback should succeed and return offline triage findings safely
    assert len(findings) > 0
    assert any(f.status == "NEEDS_REVIEW" for f in findings)

def test_live_provider_configuration_status():
    api_key = os.getenv("AI_PROVIDER_API_KEY") or os.getenv("GEMINI_API_KEY")
    ai_provider = os.getenv("AI_PROVIDER", "mock").lower()
    if ai_provider != "gemini" or not api_key:
        # Transparent hackathon requirement: explicitly mark live-provider test as unverified without secret
        pytest.skip("LIVE_AI_PROVIDER_UNVERIFIED: AI_PROVIDER is not set to 'gemini' or no live API key present. Mock/offline fallback active.")
    else:
        provider = get_ai_provider()
        assert isinstance(provider, GeminiProvider)
