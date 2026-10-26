import os
import sys
import tempfile
from pathlib import Path
import httpx
import pytest

# Isolated test DB
fd, path = tempfile.mkstemp(suffix='.db')
os.close(fd)
os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, init_db

@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM rule_suggestions")
        conn.execute("DELETE FROM findings")
        conn.execute("DELETE FROM reviews")
        conn.execute("DELETE FROM rules")
    yield

@pytest.mark.asyncio
async def test_guideline_health_aggregation_and_deduplication():
    """Test G & K: 5 independent drafts trigger rule -> affected_draft_count=5; duplicates in 1 draft don't inflate count."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # Create a rule
        r_res = await client.post(
            '/api/rules',
            json={
                'title': 'No Superlative Claims',
                'kind': 'prohibited_phrase',
                'pattern': 'world leader',
                'requirement': 'Avoid superlative claims without third-party proof.',
                'severity': 'HIGH',
                'source_title': 'Tone Guide 2026',
                'source_excerpt': 'Do not use world leader instead of recognized platform.',
                'status': 'APPROVED'
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        rule_id = r_res.json()['id']

        # Submit 5 drafts referencing this pattern
        for i in range(5):
            # In draft 0, include the pattern multiple times
            body = 'We are the world leader in technology. Again, world leader.' if i == 0 else f'Draft {i} says world leader.'
            await client.post('/api/reviews', json={'title': f'Draft {i}', 'content': body, 'content_type': 'marketing_copy'})

        health_res = await client.get('/api/governance/guideline-health')
        assert health_res.status_code == 200
        items = health_res.json()

        rule_item = next((item for item in items if item['rule_id'] == rule_id), None)
        assert rule_item is not None
        assert rule_item['affected_draft_count'] == 5
        assert rule_item['finding_count'] >= 5
        assert rule_item['data_confidence'] == 'SUFFICIENT'

@pytest.mark.asyncio
async def test_guideline_health_insufficient_data():
    """Test I: Rule with only 1 observation -> data_confidence=INSUFFICIENT."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        r_res = await client.post(
            '/api/rules',
            json={
                'title': 'Avoid Cheap Phrase',
                'kind': 'prohibited_phrase',
                'pattern': 'bargain basement',
                'requirement': 'Use value-priced.',
                'severity': 'MEDIUM',
                'source_title': 'Brand Value Spec',
                'source_excerpt': 'Avoid bargain basement instead of accessible.',
                'status': 'APPROVED'
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        rule_id = r_res.json()['id']

        # Only 1 draft
        await client.post('/api/reviews', json={'title': 'Single Draft', 'content': 'This is bargain basement pricing.', 'content_type': 'marketing_copy'})

        health = (await client.get('/api/governance/guideline-health')).json()
        item = next(i for i in health if i['rule_id'] == rule_id)
        assert item['affected_draft_count'] == 1
        assert item['data_confidence'] == 'INSUFFICIENT'

@pytest.mark.asyncio
async def test_disagreement_detection_and_suggestion_lifecycle():
    """Test H & J: Conflicting dispositions detected; rule-suggestions action recorded; live rule NOT altered."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # Create rule
        r_res = await client.post(
            '/api/rules',
            json={
                'title': 'Ambiguous Guarantee Rule',
                'kind': 'prohibited_phrase',
                'pattern': 'guaranteed success',
                'requirement': 'Claims of guaranteed success must be substantiated.',
                'severity': 'HIGH',
                'source_title': 'Compliance Manual',
                'source_excerpt': 'guaranteed success requires legal clearance.',
                'status': 'APPROVED'
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        rule_id = r_res.json()['id']

        # Draft 1 -> Reviewer Alice accepts edit
        d1 = (await client.post('/api/reviews', json={'title': 'Draft 1', 'content': 'We promise guaranteed success.', 'content_type': 'email'})).json()
        f1_id = d1['findings'][0]['id']
        await client.post(
            f"/api/reviews/{d1['id']}/findings/{f1_id}/actions",
            json={'action': 'accept'},
            headers={'X-Demo-Role': 'reviewer', 'X-Demo-Actor': 'reviewer.alice'}
        )

        # Draft 2 -> Reviewer Bob dismisses finding
        d2 = (await client.post('/api/reviews', json={'title': 'Draft 2', 'content': 'We offer guaranteed success.', 'content_type': 'email'})).json()
        f2_id = d2['findings'][0]['id']
        await client.post(
            f"/api/reviews/{d2['id']}/findings/{f2_id}/actions",
            json={'action': 'dismiss', 'reason': 'Exception granted for enterprise pilot.'},
            headers={'X-Demo-Role': 'reviewer', 'X-Demo-Actor': 'reviewer.bob'}
        )

        # Health endpoint should detect disagreement
        health = (await client.get('/api/governance/guideline-health')).json()
        item = next(i for i in health if i['rule_id'] == rule_id)
        assert item['disagreement_detected'] is True
        assert item['suggestion'] is not None
        assert 'conflicting dispositions' in item['suggestion']['observed_issue']

        # Submit action on rule suggestion (POST)
        sugg_res = await client.post(
            f'/api/governance/rule-suggestions/{rule_id}',
            json={'action': 'accept'},
            headers={'X-Demo-Role': 'brand_admin', 'X-Demo-Actor': 'admin.lead'}
        )
        assert sugg_res.status_code == 200
        sugg_data = sugg_res.json()
        assert sugg_data['status'] == 'ACCEPTED'
        assert sugg_data['reviewed_by'] == 'admin.lead'

        # Verify live rule was NOT modified
        rule_check = (await client.get('/api/rules')).json()
        r_rec = next(r for r in rule_check if r['id'] == rule_id)
        assert r_rec['pattern'] == 'guaranteed success'
        assert r_rec['title'] == 'Ambiguous Guarantee Rule'
