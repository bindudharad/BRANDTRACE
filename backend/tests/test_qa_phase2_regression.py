"""
Regression test suite for Phase 2: Semantic Correctness, Deduplication & Comprehensive Claims.
Verifies:
1. No duplicate findings for the same phrase ('best' is not duplicated across deterministic and offline triage).
2. Neutral, intent-preserving suggested corrections that do not introduce new unsupported claims.
3. Multi-claim detection: SLA (99.9% uptime), productivity (save 50% of their time), territory (across every region), service continuity (uninterrupted service).
4. Non-claim numbers ('Draft 02', 'Step 1', 'Room 402', 'in 2026') do not trigger false positive claim findings.
5. Health score semantic correctness: escalation stays unresolved, dismiss/waive restores points, SUPPORTED findings never penalize.
6. Geographic claim classification: broad claims classified as NEEDS_REVIEW (not CONTRADICTED) when approved evidence only confirms a narrower region without explicit exclusivity.
7. Productivity claim regex: trailing word-boundary fix for '%' followed by space.
8. Suggested corrections do not replace one unsupported promotional claim with another.
"""
import os
import sys
import tempfile
import asyncio
from pathlib import Path

import httpx
import pytest

# Isolated test DB
fd, _test_db = tempfile.mkstemp(suffix='.qa2.db')
os.close(fd)
os.environ['DATABASE_URL'] = f'sqlite:///{_test_db}'
os.environ['AI_PROVIDER'] = 'offline'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.governance import calculate_health_score, UNRESOLVED_DISPOSITIONS, RESOLVED_DISPOSITIONS

REV = {"X-Demo-Role": "reviewer"}
ADMIN = {"X-Demo-Role": "brand_admin"}


@pytest.fixture(autouse=True)
def setup_db():
    async def _init():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            await c.post('/api/demo/setup')
    asyncio.run(_init())


def test_no_duplicate_findings_and_comprehensive_claims():
    """Verify that the QA draft produces rich, non-duplicated claims."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            qa_content = (
                "Discover why our platform is the best choice for modern businesses. "
                "Get guaranteed results with zero risk and uninterrupted service across every region. "
                "Our solution delivers 99.9% uptime and helps teams save 50% of their time on daily tasks."
            )

            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Manual QA — Email Campaign 02',
                    'content': qa_content,
                    'content_type': 'email'
                },
                headers=REV,
            )
            assert r.status_code == 200
            review = r.json()
            findings = review['findings']

            # 1. Deduplication check: 'best' must appear at most ONCE
            best_findings = [f for f in findings if f['passage'].lower() == 'best']
            assert len(best_findings) == 1, f"Expected exactly 1 finding for 'best', got {len(best_findings)}"
            assert best_findings[0]['status'] == 'CONTRADICTED'
            assert best_findings[0]['source_id'] == 'R-VOICE-01'
            # Suggested correction matches exact span of passage ("best" -> "effective") to prevent duplicate words
            assert best_findings[0]['suggested_correction'] == 'effective'
            # Verify exact span replacement prevents duplicate word:
            replaced_phrase = "best choice".replace(best_findings[0]['passage'], best_findings[0]['suggested_correction'])
            assert replaced_phrase == 'effective choice'
            assert 'choice choice' not in replaced_phrase

            # 2. Check that remaining claims from the draft ARE detected
            passages_lower = [f['passage'].lower() for f in findings]

            # 'guarantee' / 'guaranteed'
            assert any('guarantee' in p for p in passages_lower), "Expected finding for guaranteed"

            # 'zero risk'
            assert any('zero risk' in p for p in passages_lower), "Expected finding for zero risk"

            # 'uninterrupted service'
            assert any('uninterrupted service' in p for p in passages_lower), "Expected finding for uninterrupted service"

            # 'across every region' — should be NEEDS_REVIEW (not CONTRADICTED) with F-2026-01 as narrow evidence
            territory_finding = next((f for f in findings if 'across every region' in f['passage'].lower()), None)
            assert territory_finding is not None, "Expected territory claim finding for 'across every region'"
            assert territory_finding['status'] == 'NEEDS_REVIEW', \
                f"Expected NEEDS_REVIEW for broad territory claim with narrow fact, got {territory_finding['status']}"
            assert territory_finding['source_id'] == 'F-2026-01'

            # '99.9% uptime'
            sla_finding = next((f for f in findings if '99.9% uptime' in f['passage'].lower()), None)
            assert sla_finding is not None, "Expected finding for '99.9% uptime'"
            assert sla_finding['status'] == 'NEEDS_REVIEW'

            # 'save 50% of their time'
            quant_finding = next((f for f in findings if 'save 50%' in f['passage'].lower()), None)
            assert quant_finding is not None, "Expected finding for 'save 50% of their time'"
            assert quant_finding['status'] == 'NEEDS_REVIEW'

    asyncio.run(scenario())


def test_non_claim_numbers_not_flagged():
    """Numbers that are not factual promises (e.g. Draft 02, Step 1, in 2026) must not trigger claim findings."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            content = "Brandtrace is reviewing Draft 02 on Step 1 in Room 402 for the year 2026 with 5 members."
            r = await c.post(
                '/api/reviews',
                json={'title': 'Harmless numbers', 'content': content, 'content_type': 'document'},
                headers=REV,
            )
            assert r.status_code == 200
            findings = r.json()['findings']
            # None of these numbers should trigger claim findings
            claim_findings = [f for f in findings if f['category'] == 'claims']
            assert len(claim_findings) == 0
            assert len(findings) == 0

    asyncio.run(scenario())


def test_health_score_recomputed_upon_disposition():
    """Health score should dynamically recalculate and improve when findings are resolved."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={'title': 'Score test', 'content': 'The cheap platform is the best.', 'content_type': 'email'},
                headers=REV,
            )
            review = r.json()
            rid = review['id']
            initial_score = review['score']
            assert initial_score < 100, "Initial score should have deductions"

            # Dismiss all findings with reason
            for f in review['findings']:
                await c.post(
                    f'/api/reviews/{rid}/findings/{f["id"]}/actions',
                    json={'action': 'dismiss', 'reason': 'Approved exception'},
                    headers=REV,
                )

            # Re-fetch review and verify score restored to 100
            updated = (await c.get(f'/api/reviews/{rid}')).json()
            assert updated['score'] == 100, f"Expected restored score 100, got {updated['score']}"
    asyncio.run(scenario())


# ========================================================================================
# NEW TESTS: Health Score Semantics
# ========================================================================================

def test_escalation_keeps_score_penalized():
    """Escalation (ESCALATED) must NOT count as resolution — the score should stay penalized."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={'title': 'Escalation test', 'content': 'Brandtrace is the best.', 'content_type': 'email'},
                headers=REV,
            )
            review = r.json()
            rid = review['id']
            initial_score = review['score']
            assert initial_score < 100

            # Escalate the finding
            for f in review['findings']:
                await c.post(
                    f'/api/reviews/{rid}/findings/{f["id"]}/actions',
                    json={'action': 'escalate'},
                    headers=REV,
                )

            updated = (await c.get(f'/api/reviews/{rid}')).json()
            assert updated['score'] < 100, \
                f"Escalation must NOT restore score. Got {updated['score']} (initial was {initial_score})"
            # Score should remain at the same penalty level
            assert updated['score'] == initial_score, \
                f"Escalated score ({updated['score']}) should equal initial ({initial_score})"
    asyncio.run(scenario())


def test_accept_edit_restores_score():
    """Accepting a suggested edit should fully restore the points deducted by that finding."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={'title': 'Accept test', 'content': 'Brandtrace is the best.', 'content_type': 'email'},
                headers=REV,
            )
            review = r.json()
            rid = review['id']
            assert review['score'] < 100

            for f in review['findings']:
                if f.get('suggested_correction'):
                    await c.post(
                        f'/api/reviews/{rid}/findings/{f["id"]}/actions',
                        json={'action': 'accept', 'replacement': f['suggested_correction']},
                        headers=REV,
                    )
                else:
                    await c.post(
                        f'/api/reviews/{rid}/findings/{f["id"]}/actions',
                        json={'action': 'dismiss', 'reason': 'Accepted by reviewer'},
                        headers=REV,
                    )

            updated = (await c.get(f'/api/reviews/{rid}')).json()
            assert updated['score'] == 100, f"Expected 100 after accepting edits, got {updated['score']}"
    asyncio.run(scenario())


def test_manual_edit_restores_score():
    """Manually editing a finding should restore the points."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={'title': 'Edit test', 'content': 'Brandtrace is the best.', 'content_type': 'email'},
                headers=REV,
            )
            review = r.json()
            rid = review['id']

            for f in review['findings']:
                await c.post(
                    f'/api/reviews/{rid}/findings/{f["id"]}/actions',
                    json={'action': 'edit', 'reason': 'Manually corrected', 'replacement': 'Brandtrace is effective.'},
                    headers=REV,
                )

            updated = (await c.get(f'/api/reviews/{rid}')).json()
            assert updated['score'] == 100, f"Expected 100 after manual edit, got {updated['score']}"
    asyncio.run(scenario())


def test_calculate_health_score_unit():
    """Unit test for calculate_health_score with various disposition states."""
    # Unresolved HIGH
    f1 = [{"severity": "HIGH", "disposition": None, "status": "CONTRADICTED"}]
    assert calculate_health_score(f1) == 82

    # Resolved (DISMISSED)
    f2 = [{"severity": "HIGH", "disposition": "DISMISSED", "status": "CONTRADICTED"}]
    assert calculate_health_score(f2) == 100

    # Escalated (stays unresolved)
    f3 = [{"severity": "HIGH", "disposition": "ESCALATED", "status": "CONTRADICTED"}]
    assert calculate_health_score(f3) == 82

    # Waived (resolved)
    f4 = [{"severity": "HIGH", "disposition": "WAIVED", "status": "NEEDS_REVIEW"}]
    assert calculate_health_score(f4) == 100

    # SUPPORTED finding (never penalizes regardless of disposition)
    f5 = [{"severity": "LOW", "disposition": None, "status": "SUPPORTED"}]
    assert calculate_health_score(f5) == 100

    # Mix: 1 resolved, 1 escalated, 1 unresolved
    f6 = [
        {"severity": "HIGH", "disposition": "ACCEPTED_EDIT", "status": "CONTRADICTED"},
        {"severity": "HIGH", "disposition": "ESCALATED", "status": "NEEDS_REVIEW"},
        {"severity": "MEDIUM", "disposition": None, "status": "NEEDS_REVIEW"},
    ]
    assert calculate_health_score(f6) == 100 - 18 - 10  # 72

    # Score floors at 0
    many = [{"severity": "CRITICAL", "disposition": None, "status": "NEEDS_REVIEW"} for _ in range(5)]
    assert calculate_health_score(many) == 0


# ========================================================================================
# NEW TESTS: Geographic Claim Classification
# ========================================================================================

def test_geographic_broad_claim_not_contradicted_by_narrow_fact():
    """
    'across every region' with fact F-2026-01 'Available in India' (no exclusivity)
    should be NEEDS_REVIEW, NOT CONTRADICTED.
    """
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Geo broad test',
                    'content': 'Brandtrace is available across every region.',
                    'content_type': 'marketing_copy',
                },
                headers=REV,
            )
            findings = r.json()['findings']
            geo = [f for f in findings if 'across every region' in f['passage'].lower()]
            assert len(geo) == 1
            assert geo[0]['status'] == 'NEEDS_REVIEW', \
                f"Expected NEEDS_REVIEW for broad claim with narrow fact, got {geo[0]['status']}"
            assert geo[0]['source_id'] == 'F-2026-01'
    asyncio.run(scenario())


def test_geographic_globally_available_needs_review():
    """'globally available' should also be NEEDS_REVIEW with narrow fact."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Geo global test',
                    'content': 'Brandtrace is globally available for enterprise customers.',
                    'content_type': 'marketing_copy',
                },
                headers=REV,
            )
            findings = r.json()['findings']
            geo = [f for f in findings if 'globally available' in f['passage'].lower()]
            assert len(geo) == 1
            assert geo[0]['status'] == 'NEEDS_REVIEW'
    asyncio.run(scenario())


def test_geographic_exclusive_fact_contradicts():
    """If approved fact says 'only in India', broad claim IS contradicted."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            # Create an exclusive territory fact
            await c.post(
                '/api/facts',
                json={
                    'claim': 'Exclusive territory restriction',
                    'value': 'Available only in India',
                    'owner': 'Legal Team',
                    'source_title': 'Regulatory Filing 2026',
                    'source_excerpt': 'Product distribution is restricted to India only.',
                    'status': 'APPROVED',
                },
                headers=ADMIN,
            )
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Geo exclusive test',
                    'content': 'Brandtrace is available across every region.',
                    'content_type': 'marketing_copy',
                },
                headers=REV,
            )
            findings = r.json()['findings']
            geo = [f for f in findings if 'across every region' in f['passage'].lower()]
            assert len(geo) == 1
            assert geo[0]['status'] == 'CONTRADICTED', \
                f"Expected CONTRADICTED with exclusive fact, got {geo[0]['status']}"
    asyncio.run(scenario())


# ========================================================================================
# NEW TESTS: Productivity Claim Regex
# ========================================================================================

def test_productivity_save_50_percent():
    """'save 50% of their time' must be detected."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Prod save test',
                    'content': 'Brandtrace helps teams save 50% of their time.',
                    'content_type': 'email',
                },
                headers=REV,
            )
            findings = r.json()['findings']
            quant = [f for f in findings if 'save 50%' in f['passage'].lower()]
            assert len(quant) >= 1, f"Expected productivity claim finding, got passages: {[f['passage'] for f in findings]}"
            assert quant[0]['status'] == 'NEEDS_REVIEW'
    asyncio.run(scenario())


def test_productivity_reduce_by_25_percent():
    """'reduce processing time by 25%' must be detected."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Prod reduce test',
                    'content': 'Brandtrace will reduce processing time by 25% across workflows.',
                    'content_type': 'email',
                },
                headers=REV,
            )
            findings = r.json()['findings']
            quant = [f for f in findings if '25%' in f['passage']]
            assert len(quant) >= 1, f"Expected productivity claim finding for 'reduce ... by 25%', got passages: {[f['passage'] for f in findings]}"
    asyncio.run(scenario())


def test_productivity_save_100_percent():
    """'save 100% of costs' must be detected."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Prod 100 test',
                    'content': 'Brandtrace will save 100% of costs in the first year.',
                    'content_type': 'email',
                },
                headers=REV,
            )
            findings = r.json()['findings']
            quant = [f for f in findings if 'save 100%' in f['passage'].lower() or '100%' in f['passage']]
            assert len(quant) >= 1, f"Expected productivity claim finding for '100%', got passages: {[f['passage'] for f in findings]}"
    asyncio.run(scenario())


def test_productivity_no_false_positive_on_ordinary_text():
    """'save time on daily tasks' (no percentage) must NOT trigger a quantitative claim."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'No false positive',
                    'content': 'Brandtrace helps save time on daily tasks in Room 402 during 2026.',
                    'content_type': 'email',
                },
                headers=REV,
            )
            findings = r.json()['findings']
            quant = [f for f in findings if f['category'] == 'claims' and '%' in f.get('passage', '')]
            assert len(quant) == 0, f"Unexpected false-positive quantitative finding: {[f['passage'] for f in quant]}"
    asyncio.run(scenario())


# ========================================================================================
# NEW TESTS: Suggested Corrections Must Not Introduce New Unsupported Claims
# ========================================================================================

def test_suggested_corrections_are_neutral():
    """
    Corrections for 'best' and 'cheap' should use neutral, non-promotional terms
    rather than introducing new unsupported factual claims.
    'best' → 'effective' (neutral), NOT 'proven' or 'leading' (promotional)
    'cheap' → 'accessible' (neutral), NOT 'cost-effective' (could imply substantiation)
    """
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Corrections neutrality test',
                    'content': 'Brandtrace is the best and cheap solution for governance.',
                    'content_type': 'marketing_copy',
                },
                headers=REV,
            )
            findings = r.json()['findings']

            best_f = next((f for f in findings if f['passage'].lower() == 'best'), None)
            assert best_f is not None
            assert best_f['suggested_correction'] == 'effective', \
                f"Expected neutral 'effective' for 'best', got '{best_f['suggested_correction']}'"

            cheap_f = next((f for f in findings if f['passage'].lower() == 'cheap'), None)
            assert cheap_f is not None
            assert cheap_f['suggested_correction'] == 'accessible', \
                f"Expected neutral 'accessible' for 'cheap', got '{cheap_f['suggested_correction']}'"
    asyncio.run(scenario())


def test_best_choice_correction_is_neutral():
    """'best choice' context should produce 'effective choice', not 'leading choice'."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Best choice test',
                    'content': 'Brandtrace is the best choice for teams.',
                    'content_type': 'email',
                },
                headers=REV,
            )
            findings = r.json()['findings']
            best_f = next((f for f in findings if f['passage'].lower() == 'best'), None)
            assert best_f is not None
            # Passage is 'best' and suggestion is 'effective' to ensure exact span integrity
            assert best_f['suggested_correction'] == 'effective', \
                f"Expected exact span replacement 'effective', got '{best_f['suggested_correction']}'"
            replaced = 'Brandtrace is the best choice for teams.'.replace(best_f['passage'], best_f['suggested_correction'])
            assert replaced == 'Brandtrace is the effective choice for teams.'
            assert 'choice choice' not in replaced
    asyncio.run(scenario())


# ========================================================================================
# TESTS: Guidance Separation, Span Integrity & Missing Terminology
# ========================================================================================

def test_missing_required_terminology_semantics_and_no_editorial_replacement():
    """Missing required brand terms should not have editorial instructions in suggested_correction."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Missing term check',
                    'content': 'We provide comprehensive content verification for all teams.',
                    'content_type': 'document',
                },
                headers=REV,
            )
            assert r.status_code == 200
            findings = r.json()['findings']
            # Rule R-TERM-02 requires 'Brandtrace'
            missing_term_f = next((f for f in findings if f.get('type') == 'required_phrase'), None)
            assert missing_term_f is not None, "Expected required_phrase finding for missing 'Brandtrace'"
            assert missing_term_f['passage'] == 'Brandtrace'
            assert missing_term_f['status'] == 'UNSUPPORTED_BY_APPROVED_EVIDENCE'
            # Must NOT place editorial instructions ("Include 'Brandtrace'...") into suggested_correction
            assert missing_term_f.get('suggested_correction') is None, \
                f"Expected None for suggested_correction, got '{missing_term_f.get('suggested_correction')}'"
    asyncio.run(scenario())


def test_guidance_separated_from_replacement_text():
    """
    Editorial instructions (such as 'cite verified infrastructure SLA' or 'cite verified benchmark')
    must NEVER be placed in suggested_correction.
    """
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Guidance separation check',
                    'content': 'We deliver 99.9% uptime and save 50% of processing time across every region.',
                    'content_type': 'marketing_copy',
                },
                headers=REV,
            )
            assert r.status_code == 200
            findings = r.json()['findings']

            # SLA promise
            sla_f = next((f for f in findings if '99.9%' in f['passage']), None)
            assert sla_f is not None
            assert sla_f.get('suggested_correction') is None, \
                f"SLA finding must not have editorial instruction in suggested_correction, got: {sla_f.get('suggested_correction')}"

            # Productivity promise
            prod_f = next((f for f in findings if 'save 50%' in f['passage']), None)
            assert prod_f is not None
            assert prod_f.get('suggested_correction') is None, \
                f"Productivity finding must not have editorial instruction in suggested_correction, got: {prod_f.get('suggested_correction')}"

            # Territory scope
            geo_f = next((f for f in findings if 'across every region' in f['passage']), None)
            assert geo_f is not None
            assert geo_f.get('suggested_correction') is None, \
                f"Territory finding must not have editorial instruction in suggested_correction, got: {geo_f.get('suggested_correction')}"
    asyncio.run(scenario())


def test_unsupported_replacement_claims_avoided():
    """
    Replacing 'zero risk' or 'uninterrupted service' with other unverified claims
    ('low risk' or 'high-availability service') must be avoided.
    """
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Unsupported claims check',
                    'content': 'Brandtrace offers zero risk and uninterrupted service for enterprises.',
                    'content_type': 'marketing_copy',
                },
                headers=REV,
            )
            assert r.status_code == 200
            findings = r.json()['findings']

            zero_risk_f = next((f for f in findings if 'zero risk' in f['passage'].lower()), None)
            assert zero_risk_f is not None
            # Must NOT propose 'low risk' without evidence
            assert zero_risk_f.get('suggested_correction') is None, \
                f"Expected None for zero risk correction, got: {zero_risk_f.get('suggested_correction')}"

            uninterrupted_f = next((f for f in findings if 'uninterrupted service' in f['passage'].lower()), None)
            assert uninterrupted_f is not None
            # Must NOT propose 'high-availability service' without evidence
            assert uninterrupted_f.get('suggested_correction') is None, \
                f"Expected None for uninterrupted service correction, got: {uninterrupted_f.get('suggested_correction')}"
    asyncio.run(scenario())


def test_accept_action_updates_content_and_creates_version():
    """Accepting a valid correction must change only intended text and save a version."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            original = "Brandtrace is the best choice for marketing compliance."
            r = await c.post(
                '/api/reviews',
                json={'title': 'Accept test', 'content': original, 'content_type': 'marketing_copy'},
                headers=REV,
            )
            rev = r.json()
            rid = rev['id']
            best_f = next(f for f in rev['findings'] if f['passage'].lower() == 'best')

            # Accept the correction
            new_content = original.replace(best_f['passage'], best_f['suggested_correction'])
            assert new_content == "Brandtrace is the effective choice for marketing compliance."

            r_act = await c.post(
                f'/api/reviews/{rid}/findings/{best_f["id"]}/actions',
                json={'action': 'accept', 'replacement': new_content},
                headers=REV,
            )
            assert r_act.status_code == 200
            updated_rev = r_act.json()
            assert updated_rev['content'] == new_content

            # Check that a version was recorded
            v_res = await c.get(f'/api/reviews/{rid}/versions')
            assert v_res.status_code == 200
            versions = v_res.json()
            assert len(versions) >= 2
            assert any(v['reason'] == 'FINDING_ACCEPT' for v in versions)
            assert versions[-1]['content'] == new_content
    asyncio.run(scenario())


def test_guaranteed_claim_no_broken_grammar_replacement():
    """
    'Get guaranteed results with zero risk' must NOT suggest 'committed to delivering',
    which causes ungrammatical copy ('Get committed to delivering results with zero risk').
    Suggested correction must be None with clear reviewer guidance.
    """
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Grammar & span check',
                    'content': 'Brandtrace helps users get guaranteed results with zero risk.',
                    'content_type': 'marketing_copy',
                },
                headers=REV,
            )
            assert r.status_code == 200
            findings = r.json()['findings']

            guaranteed_f = next((f for f in findings if 'guaranteed' in f['passage'].lower()), None)
            assert guaranteed_f is not None
            assert guaranteed_f.get('suggested_correction') is None, \
                f"Expected None for guaranteed, got: {guaranteed_f.get('suggested_correction')}"
            assert "promotional claim" in guaranteed_f.get('explanation', '').lower()

            zero_risk_f = next((f for f in findings if 'zero risk' in f['passage'].lower()), None)
            assert zero_risk_f is not None
            assert zero_risk_f.get('suggested_correction') is None
    asyncio.run(scenario())


def test_missing_required_term_enforcement_in_finding_action():
    """
    Resolving a missing required term via accept/edit MUST include the required term in the replacement.
    Otherwise the server rejects it with HTTP 422 Unprocessable Entity.
    """
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            # Copy that omits 'Brandtrace'
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'Missing term enforcement',
                    'content': 'Save 50% of processing time across every region with our cloud platform.',
                    'content_type': 'marketing_copy',
                },
                headers=REV,
            )
            assert r.status_code == 200
            rev = r.json()
            rid = rev['id']

            missing_term_f = next((f for f in rev['findings'] if f['type'] == 'required_phrase'), None)
            assert missing_term_f is not None, "Expected required_phrase finding for missing 'Brandtrace'"
            assert missing_term_f['passage'] == 'Brandtrace'

            # 1. Attempt to accept replacement that STILL lacks 'Brandtrace'
            bad_replacement = "Save 50% of processing time across every region with our enhanced platform."
            r_bad = await c.post(
                f'/api/reviews/{rid}/findings/{missing_term_f["id"]}/actions',
                json={'action': 'accept', 'replacement': bad_replacement},
                headers=REV,
            )
            assert r_bad.status_code == 422
            assert "must include the required term" in r_bad.json()['detail'].lower()

            # 2. Accept replacement with proper placement of 'Brandtrace'
            good_replacement = f"{bad_replacement}\n\n— Verified with Brandtrace."
            r_good = await c.post(
                f'/api/reviews/{rid}/findings/{missing_term_f["id"]}/actions',
                json={'action': 'accept', 'replacement': good_replacement},
                headers=REV,
            )
            assert r_good.status_code == 200
            updated_rev = r_good.json()
            assert updated_rev['content'] == good_replacement
            assert 'Brandtrace' in updated_rev['content']

            # Finding is now marked resolved
            updated_f = next(f for f in updated_rev['findings'] if f['id'] == missing_term_f['id'])
            assert updated_f['disposition'] == 'ACCEPTED_EDIT'
    asyncio.run(scenario())


def test_approval_blocked_on_unresolved_high_risk_leaves_status_unchanged():
    """
    Attempting approval on a review with unresolved HIGH/CRITICAL findings returns HTTP 409
    and leaves status unchanged (IN_REVIEW). No approval event may be created.
    """
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            # Create review with high-risk violation (prohibited phrase 'cheap' has severity HIGH)
            r = await c.post(
                '/api/reviews',
                json={
                    'title': 'High risk approval gate test',
                    'content': 'The best cheap platform in India.',
                    'content_type': 'marketing_copy',
                },
                headers=REV,
            )
            assert r.status_code == 200
            rev = r.json()
            rid = rev['id']
            initial_status = rev['status']
            assert initial_status == 'IN_REVIEW'

            # Check that there is an unresolved HIGH or CRITICAL finding
            unresolved_high = [
                f for f in rev['findings']
                if not f.get('disposition') and f.get('severity') in ('HIGH', 'CRITICAL')
            ]
            assert len(unresolved_high) >= 1, "Expected at least one high-risk finding"

            # Attempt approval
            r_app = await c.post(
                f'/api/reviews/{rid}/approval',
                json={'action': 'approve'},
                headers=REV,
            )
            assert r_app.status_code == 409
            assert "must be resolved before approval" in r_app.json()['detail']

            # Verify review status is unchanged
            r_get = await c.get(f'/api/reviews/{rid}')
            assert r_get.status_code == 200
            assert r_get.json()['status'] == initial_status
            assert r_get.json()['status'] != 'APPROVED'

            # Verify no APPROVED audit events exist
            audit_r = await c.get(f'/api/reviews/{rid}/audit')
            assert audit_r.status_code == 200
            events = audit_r.json()
            assert not any(e.get('action') == 'APPROVED' for e in events)

            # Now explicitly create a CRITICAL rule to verify CRITICAL severity blocks approval
            r_crit_rule = await c.post(
                '/api/rules',
                json={
                    'title': 'Critical Regulatory Term Gate',
                    'category': 'REGULATORY',
                    'kind': 'forbidden_term',
                    'pattern': 'critical-unauthorized-claim',
                    'source_title': 'Statutory Brand Mandate',
                    'source_excerpt': 'critical-unauthorized-claim constitutes critical violation',
                    'requirement': 'Strictly avoid critical-unauthorized-claim',
                    'severity': 'CRITICAL',
                },
                headers=ADMIN,
            )
            assert r_crit_rule.status_code in (200, 201)

            # Create review with the CRITICAL violation
            r_crit_review = await c.post(
                '/api/reviews',
                json={
                    'title': 'Critical risk approval gate test',
                    'content': 'This announcement features a critical-unauthorized-claim in the text.',
                    'content_type': 'marketing_copy',
                },
                headers=REV,
            )
            assert r_crit_review.status_code == 200
            crit_rev = r_crit_review.json()
            crit_rid = crit_rev['id']
            crit_findings = [
                f for f in crit_rev['findings']
                if not f.get('disposition') and f.get('severity') == 'CRITICAL'
            ]
            assert len(crit_findings) >= 1, "Expected at least one CRITICAL severity finding"

            # Attempt approval on CRITICAL finding -> strictly blocked with HTTP 409
            r_crit_app = await c.post(
                f'/api/reviews/{crit_rid}/approval',
                json={'action': 'approve'},
                headers=REV,
            )
            assert r_crit_app.status_code == 409
            assert "High-risk findings" in r_crit_app.json()['detail']

            # Resolve the CRITICAL finding with documented dismissal
            r_dismiss = await c.post(
                f'/api/reviews/{crit_rid}/findings/{crit_findings[0]["id"]}/actions',
                json={'action': 'dismiss', 'reason': 'Audited regulatory waiver with legal counsel'},
                headers=REV,
            )
            assert r_dismiss.status_code == 200

            # After resolving all CRITICAL findings, approval succeeds
            r_crit_app_ok = await c.post(
                f'/api/reviews/{crit_rid}/approval',
                json={'action': 'approve'},
                headers=REV,
            )
            assert r_crit_app_ok.status_code == 200
            assert r_crit_app_ok.json()['status'] == 'APPROVED'
    asyncio.run(scenario())
