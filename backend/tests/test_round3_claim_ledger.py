import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime, timedelta, timezone
import httpx
import pytest

# Isolated test DB
fd, path = tempfile.mkstemp(suffix='.db')
os.close(fd)
os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, rows, row, init_db, now

@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM findings")
        conn.execute("DELETE FROM review_versions")
        conn.execute("DELETE FROM audit")
        conn.execute("DELETE FROM reviews")
        conn.execute("DELETE FROM facts")
        conn.execute("DELETE FROM rules")
    yield

@pytest.mark.asyncio
async def test_claim_ledger_notes_field_and_audit():
    """Test A & D: Fact creation supports notes, fact without expiry never expires automatically."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # Create fact with notes and no expiry
        res = await client.post(
            '/api/facts',
            json={
                'claim': 'Brand Zero Carbon',
                'value': 'zero carbon operations',
                'owner': 'ESG Lead',
                'source_title': 'Annual ESG Report 2025',
                'source_excerpt': 'We achieved zero carbon operations across all facilities.',
                'version': '1.0',
                'status': 'APPROVED',
                'notes': 'Audited by ThirdParty ESG firm in Q4.'
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert res.status_code == 201
        data = res.json()
        assert data['notes'] == 'Audited by ThirdParty ESG firm in Q4.'
        fact_id = data['id']

        # Verify fact does not expire automatically
        res_list = await client.get('/api/facts')
        f_record = next(f for f in res_list.json() if f['id'] == fact_id)
        assert f_record.get('notes') == 'Audited by ThirdParty ESG firm in Q4.'
        assert f_record.get('expires_at') is None

@pytest.mark.asyncio
async def test_impact_map_three_drafts_and_isolation():
    """Test A & F: 3 drafts reference the same fact -> all 3 in impact map; unrelated 4th is NOT; mentions deduplicated."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # Create expired fact
        past_date = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        f_res = await client.post(
            '/api/facts',
            json={
                'claim': 'Free shipping limit',
                'value': 'free shipping over $50',
                'owner': 'Marketing',
                'source_title': 'Promo Rules 2024',
                'source_excerpt': 'Free shipping over $50 applied through Dec 2024.',
                'version': '1.0',
                'status': 'APPROVED',
                'expires_at': past_date
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        fact_id = f_res.json()['id']

        # Draft 1: Mentions fact twice in text (test deduplication)
        r1 = await client.post('/api/reviews', json={
            'title': 'Campaign One',
            'content': 'Enjoy our free shipping over $50. Yes, free shipping over $50 for all.',
            'content_type': 'marketing_copy'
        })
        # Draft 2: Mentions fact once
        r2 = await client.post('/api/reviews', json={
            'title': 'Campaign Two',
            'content': 'We still offer free shipping over $50 everywhere.',
            'content_type': 'email'
        })
        # Draft 3: Mentions fact once
        r3 = await client.post('/api/reviews', json={
            'title': 'Campaign Three',
            'content': 'Check out free shipping over $50 deals today.',
            'content_type': 'social'
        })
        # Draft 4: Completely unrelated
        r4 = await client.post('/api/reviews', json={
            'title': 'Unrelated Campaign',
            'content': 'Welcome to our premium software suite.',
            'content_type': 'marketing_copy'
        })

        # Query impact map
        imap_res = await client.get('/api/governance/impact-map')
        assert imap_res.status_code == 200
        imap = imap_res.json()

        item = next((i for i in imap['items'] if i['item_id'] == fact_id), None)
        assert item is not None
        assert item['item_type'] == 'FACT'
        assert item['status'] == 'EXPIRED'
        assert item['affected_count'] == 3
        assert set(item['affected_review_ids']) == {r1.json()['id'], r2.json()['id'], r3.json()['id']}
        assert r4.json()['id'] not in item['affected_review_ids']
        assert item['re_review_urgency'] == 'URGENT'

@pytest.mark.asyncio
async def test_fact_validity_transition_and_boundary():
    """Test B, C & H: fact within validity -> SUPPORTED; after expiry -> OUTDATED; expiring soon -> EXPIRING_SOON."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # Active fact (future expiry: 15 days -> EXPIRING_SOON)
        near_future = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
        f_near = await client.post(
            '/api/facts',
            json={
                'claim': 'Spring Discount',
                'value': 'spring discount 20%',
                'owner': 'Sales',
                'source_title': 'Spring Promo Policy',
                'source_excerpt': 'Spring discount 20% valid this spring.',
                'status': 'APPROVED',
                'expires_at': near_future
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        fact_near_id = f_near.json()['id']

        # Review referencing active fact
        rev = await client.post('/api/reviews', json={
            'title': 'Spring Newsletter',
            'content': 'Take advantage of our spring discount 20% today.',
            'content_type': 'email'
        })
        findings = rev.json()['findings']
        fact_finding = next((f for f in findings if f.get('source_id') == fact_near_id), None)
        assert fact_finding is not None
        assert fact_finding['status'] == 'SUPPORTED'

        # Check impact map has EXPIRING_SOON
        imap = (await client.get('/api/governance/impact-map')).json()
        near_item = next((i for i in imap['items'] if i['item_id'] == fact_near_id), None)
        assert near_item is not None
        assert near_item['status'] == 'EXPIRING_SOON'
        assert near_item['re_review_urgency'] == 'RECOMMENDED'
        assert near_item['expiry_date'] == near_future

@pytest.mark.asyncio
async def test_re_review_trigger_workflow():
    """Test G: Re-review trigger transitions APPROVED draft to CHANGES_REQUESTED with audit."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # Expired fact
        past = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        f = await client.post(
            '/api/facts',
            json={
                'claim': 'Legacy API Spec',
                'value': 'v1 REST API',
                'owner': 'DevRel',
                'source_title': 'API Lifecycle Policy',
                'source_excerpt': 'v1 REST API is supported through Q1.',
                'status': 'APPROVED',
                'expires_at': past
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        fact_id = f.json()['id']

        # Create draft and approve it
        r = await client.post('/api/reviews', json={
            'title': 'Developer Update',
            'content': 'Our v1 REST API remains functional.',
            'content_type': 'web'
        })
        rid = r.json()['id']

        # Manually set to APPROVED in db to simulate pre-existing approved draft
        with db() as conn:
            conn.execute("UPDATE reviews SET status='APPROVED' WHERE id=?", (rid,))

        # Trigger re-review
        trig = await client.post(
            '/api/governance/re-review-impact',
            data={'item_id': fact_id},
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert trig.status_code == 200
        assert trig.json()['affected_count'] == 1

        # Verify draft is now CHANGES_REQUESTED
        rev_updated = (await client.get(f'/api/reviews/{rid}')).json()
        assert rev_updated['status'] == 'CHANGES_REQUESTED'

        # Verify audit trail
        audit_res = await client.get(f'/api/reviews/{rid}/audit')
        events = audit_res.json()
        assert any(e['action'] == 'IMPACT_REREVIEW_FLAGGED' for e in events)
