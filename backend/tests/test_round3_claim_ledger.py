import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime, timedelta, timezone
import httpx
import pytest
import asyncio

# Isolated test DB
fd, path = tempfile.mkstemp(suffix='.db')
os.close(fd)
os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, rows, row, init_db, now
from app.governance import run_governance_analysis
from app.ai_adapter import OfflineProvider

@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM evidence_dependencies")
        conn.execute("DELETE FROM fact_versions")
        conn.execute("DELETE FROM findings")
        conn.execute("DELETE FROM review_versions")
        conn.execute("DELETE FROM audit")
        conn.execute("DELETE FROM reviews")
        conn.execute("DELETE FROM facts")
        conn.execute("DELETE FROM rules")
    yield


def test_governance_analysis_uses_only_the_review_workspace_policy_and_facts(monkeypatch):
    """A review must not produce findings from another workspace's evidence."""
    monkeypatch.setattr("app.governance.get_ai_provider", lambda: OfflineProvider())
    with db() as conn:
        conn.execute(
            "INSERT INTO rules (id, workspace_id, title, category, kind, pattern, requirement, severity, version, status, owner, source_title, source_excerpt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("rule_foreign", "ws_unrelated", "Foreign rule", "terminology", "prohibited_phrase", "foreign-only", "Do not use it", "HIGH", "1", "APPROVED", "Admin", "Foreign policy", "Foreign policy excerpt", now()),
        )
        conn.execute(
            "INSERT INTO facts (id, workspace_id, claim, value, owner, status, version, source_title, source_excerpt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("fact_foreign", "ws_unrelated", "Foreign fact", "foreign fact value", "Admin", "APPROVED", "1", "Foreign evidence", "Foreign evidence excerpt", now()),
        )
        conn.execute(
            "INSERT INTO reviews (id, workspace_id, title, content, content_type, status, score, author, analysis_method, rule_versions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("review_default", "ws_default", "Default review", "foreign-only foreign fact value", "web", "IN_REVIEW", 100, "demo.creator", "DETERMINISTIC_FIRST", "{}", now(), now()),
        )

    asyncio.run(run_governance_analysis({
        "id": "review_default", "workspace_id": "ws_default", "content": "foreign-only foreign fact value",
    }))
    assert rows("SELECT * FROM findings WHERE review_id=?", ("review_default",)) == []

@pytest.mark.asyncio
async def test_fact_update_preserves_snapshot_and_impacts_only_linked_reviews():
    """A changed fact uses stored review-time dependencies, never keyword inference."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        created = await client.post('/api/facts', json={
            'claim': 'Release capacity', 'value': 'supports 500 users', 'owner': 'Ops',
            'source_title': 'Capacity report', 'source_excerpt': 'Validated at 500 users.',
            'version': '1.0', 'status': 'APPROVED'
        }, headers={'X-Demo-Role': 'brand_admin'})
        fact_id = created.json()['id']
        linked = await client.post('/api/reviews', json={
            'title': 'Linked', 'content': 'The release supports 500 users.', 'content_type': 'web'
        })
        unrelated = await client.post('/api/reviews', json={
            # Deliberately shares the generic word "support" but not the
            # approved fact value. Keyword similarity alone must not create a
            # persisted fact dependency.
            'title': 'Unrelated', 'content': 'The support team planned a workshop for new hires.', 'content_type': 'web'
        })
        changed = await client.put(f'/api/facts/{fact_id}', json={
            'value': 'supports 750 users', 'source_excerpt': 'Validated at 750 users.'
        }, headers={'X-Demo-Role': 'brand_admin'})
        assert changed.status_code == 200
        assert changed.json()['version'] == '2'
        snapshots = rows('SELECT version, value FROM fact_versions WHERE fact_id=? ORDER BY created_at', (fact_id,))
        assert {(s['version'], s['value']) for s in snapshots} == {('1.0', 'supports 500 users'), ('2', 'supports 750 users')}
        impact = (await client.get('/api/governance/impact-map')).json()
        item = next(i for i in impact['items'] if i['item_id'] == fact_id)
        assert item['status'] == 'CHANGED'
        assert item['affected_review_ids'] == [linked.json()['id']]
        assert unrelated.json()['id'] not in item['affected_review_ids']
        unrelated_deps = rows(
            "SELECT id FROM evidence_dependencies WHERE review_id=? AND source_id=?",
            (unrelated.json()['id'], fact_id),
        )
        assert unrelated_deps == []

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


@pytest.mark.asyncio
async def test_claim_ledger_five_drafts_exact_isolation_and_workflow():
    """Verify 3 dependent drafts + 2 unrelated drafts: fact change & expiry, exact impact isolation, targeted re-review, version preservation, and audit persistence."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # 1. Create approved active fact
        f_res = await client.post(
            '/api/facts',
            json={
                'claim': 'SLA Guarantee',
                'value': '99.99% uptime SLA',
                'owner': 'Infrastructure',
                'source_title': 'SLA Contract 2026',
                'source_excerpt': 'We guarantee a 99.99% uptime SLA for enterprise clients.',
                'status': 'APPROVED',
                'version': '1.0'
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert f_res.status_code == 201
        fact_id = f_res.json()['id']

        # 2. Create 3 dependent drafts (D1, D2, D3)
        d1 = await client.post('/api/reviews', json={
            'title': 'Enterprise Overview',
            'content': 'Our cloud infrastructure provides a 99.99% uptime SLA across all regions.',
            'content_type': 'web'
        })
        d2 = await client.post('/api/reviews', json={
            'title': 'SLA Summary Deck',
            'content': 'Clients enjoy our committed 99.99% uptime SLA with 24/7 monitoring.',
            'content_type': 'email'
        })
        d3 = await client.post('/api/reviews', json={
            'title': 'Product Data Sheet',
            'content': 'Built on resilient nodes featuring 99.99% uptime SLA guarantee.',
            'content_type': 'document'
        })
        d1_id = d1.json()['id']
        d2_id = d2.json()['id']
        d3_id = d3.json()['id']

        # Verify persisted dependencies exist for all 3
        for rid in (d1_id, d2_id, d3_id):
            deps = rows("SELECT id FROM evidence_dependencies WHERE review_id=? AND source_id=?", (rid, fact_id))
            assert len(deps) >= 1

        # 3. Create 2 unrelated drafts (U1, U2)
        u1 = await client.post('/api/reviews', json={
            'title': 'Design Guidelines',
            'content': 'We maintain consistent typography and spacing across interfaces.',
            'content_type': 'marketing_copy'
        })
        u2 = await client.post('/api/reviews', json={
            'title': 'Operations Note',
            'content': 'General uptime and maintenance schedules are reviewed monthly.',
            'content_type': 'marketing_copy'
        })
        u1_id = u1.json()['id']
        u2_id = u2.json()['id']

        # Verify no dependencies for unrelated drafts
        for uid in (u1_id, u2_id):
            assert rows("SELECT id FROM evidence_dependencies WHERE review_id=? AND source_id=?", (uid, fact_id)) == []

        # 4. Set drafts to APPROVED in DB to simulate published collateral
        with db() as conn:
            for rid in (d1_id, d2_id, d3_id, u1_id, u2_id):
                conn.execute("UPDATE reviews SET status='APPROVED' WHERE id=?", (rid,))

        # 5. Fact changes value and expires
        past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        fact_update = await client.put(
            f'/api/facts/{fact_id}',
            json={
                'value': '99.999% uptime SLA',
                'source_excerpt': 'Upgraded to 99.999% uptime SLA in updated schedule.',
                'expires_at': past_date
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert fact_update.status_code == 200

        # 6. Verify Exact Impact Isolation in Impact Map
        imap = (await client.get('/api/governance/impact-map')).json()
        item = next(i for i in imap['items'] if i['item_id'] == fact_id)
        assert item['affected_count'] == 3
        assert set(item['affected_review_ids']) == {d1_id, d2_id, d3_id}
        assert u1_id not in item['affected_review_ids']
        assert u2_id not in item['affected_review_ids']

        # 7. Targeted re-review trigger
        rereview_res = await client.post(
            '/api/governance/re-review-impact',
            data={'item_id': fact_id},
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert rereview_res.status_code == 200
        assert rereview_res.json()['affected_count'] == 3

        # 8. Verify status updates, version preservation, and audit persistence
        for rid in (d1_id, d2_id, d3_id):
            r_data = (await client.get(f'/api/reviews/{rid}')).json()
            assert r_data['status'] == 'CHANGES_REQUESTED'

            # Audit trail contains re-review event
            audit_events = (await client.get(f'/api/reviews/{rid}/audit')).json()
            assert any(a['action'] == 'IMPACT_REREVIEW_FLAGGED' for a in audit_events)

        # Unrelated drafts are completely untouched
        for uid in (u1_id, u2_id):
            u_data = (await client.get(f'/api/reviews/{uid}')).json()
            assert u_data['status'] == 'APPROVED'
            u_audit = (await client.get(f'/api/reviews/{uid}/audit')).json()
            assert not any(a['action'] == 'IMPACT_REREVIEW_FLAGGED' for a in u_audit)
