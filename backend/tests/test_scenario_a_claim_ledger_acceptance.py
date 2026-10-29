"""Scenario A: Claim Ledger Acceptance Test
Exercises the complete lifecycle:
1. Create one approved fact and three dependent drafts plus one unrelated draft.
2. Change or expire the fact.
3. Verify only the dependent drafts appear in the impact set.
4. Trigger re-review and verify the expected status/version/audit changes.
5. Verify the unrelated draft remains unchanged.
"""
import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
import httpx
import pytest

if 'DATABASE_URL' not in os.environ:
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, init_db, rows, row, now


@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM evidence_dependencies")
        conn.execute("DELETE FROM review_versions")
        conn.execute("DELETE FROM findings")
        conn.execute("DELETE FROM reviews")
        conn.execute("DELETE FROM fact_versions")
        conn.execute("DELETE FROM facts")
        conn.execute("DELETE FROM audit")
        conn.execute("DELETE FROM workspaces")
        conn.execute("INSERT OR IGNORE INTO workspaces VALUES ('ws_default', 'Default WS', '2026-01-01')")
    yield


@pytest.mark.asyncio
async def test_scenario_a_claim_ledger_impact_and_rereview_lifecycle():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # Step 1: Create approved fact F-SLA-999
        future_exp = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()
        fact_res = await client.post(
            '/api/facts',
            json={
                'claim': 'Platform Availability SLA',
                'value': '99.9% Uptime',
                'source_title': 'Enterprise Cloud SLA Whitepaper',
                'source_excerpt': 'Brandtrace guarantees 99.9% availability for enterprise tiers.',
                'owner': 'Infrastructure Team',
                'expires_at': future_exp,
                'status': 'APPROVED',
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert fact_res.status_code == 201, fact_res.text
        fact = fact_res.json()
        fact_id = fact['id']
        assert fact['version'] == '1.0'

        # Step 2: Create 3 dependent drafts mentioning the fact, plus 1 unrelated draft
        # Draft 1
        d1_res = await client.post(
            '/api/reviews',
            json={'title': 'Q4 Product Pitch', 'content': 'Our cloud tier provides 99.9% Uptime SLA for mission critical workloads.', 'content_type': 'marketing_copy'},
            headers={'X-Demo-Role': 'reviewer'}
        )
        assert d1_res.status_code == 200
        d1 = d1_res.json()

        # Draft 2
        d2_res = await client.post(
            '/api/reviews',
            json={'title': 'Security & Ops Sheet', 'content': 'Certified 99.9% Uptime with automated failover across three zones.', 'content_type': 'marketing_copy'},
            headers={'X-Demo-Role': 'reviewer'}
        )
        assert d2_res.status_code == 200
        d2 = d2_res.json()

        # Draft 3
        d3_res = await client.post(
            '/api/reviews',
            json={'title': 'Customer Agreement', 'content': 'Customer is entitled to 99.9% Uptime guarantees under Schedule B.', 'content_type': 'marketing_copy'},
            headers={'X-Demo-Role': 'reviewer'}
        )
        assert d3_res.status_code == 200
        d3 = d3_res.json()

        # Draft 4: Unrelated draft (No mention of SLA or 99.9%)
        d4_res = await client.post(
            '/api/reviews',
            json={'title': 'Encryption Architecture', 'content': 'All customer data at rest is secured via AES-256 with HSM managed keys.', 'content_type': 'marketing_copy'},
            headers={'X-Demo-Role': 'reviewer'}
        )
        assert d4_res.status_code == 200
        d4 = d4_res.json()

        # Approve all 4 drafts initially
        for d in [d1, d2, d3, d4]:
            appr = await client.post(
                f"/api/reviews/{d['id']}/approval",
                json={'action': 'approve', 'reason': 'Initial pre-publication approval'},
                headers={'X-Demo-Role': 'brand_admin'}
            )
            assert appr.status_code == 200
            assert appr.json()['status'] == 'APPROVED'

        # Initially, fact is active and unexpired, so impact map should NOT flag F-SLA-999
        im_initial = await client.get('/api/governance/impact-map')
        assert im_initial.status_code == 200
        initial_items = im_initial.json().get('items', [])
        assert not any(i['item_id'] == fact_id for i in initial_items), "Unexpired fact should not appear in impact map initially"

        # Step 3: Materially update fact version (e.g. SLA upgraded to 99.99%)
        update_res = await client.put(
            f"/api/facts/{fact_id}",
            json={
                'claim': 'Platform Availability SLA',
                'value': '99.99% High Availability Uptime',
                'source_title': 'Updated 2026 Cloud SLA Whitepaper',
                'source_excerpt': 'Brandtrace guarantees 99.99% availability for enterprise tiers.',
                'expected_version': '1.0',
                'reason': 'Upgraded enterprise SLA to 99.99%',
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert update_res.status_code == 200
        updated_fact = update_res.json()
        assert updated_fact['version'] == '2'

        # Step 4: Verify ONLY dependent drafts (d1, d2, d3) appear in impact set
        im_updated = await client.get('/api/governance/impact-map')
        assert im_updated.status_code == 200
        items = im_updated.json().get('items', [])
        fact_impact = next((i for i in items if i['item_id'] == fact_id), None)
        assert fact_impact is not None, "Updated fact must appear in impact map"

        affected_ids = set(fact_impact['affected_review_ids'])
        assert d1['id'] in affected_ids, "Dependent draft 1 must be in impact set"
        assert d2['id'] in affected_ids, "Dependent draft 2 must be in impact set"
        assert d3['id'] in affected_ids, "Dependent draft 3 must be in impact set"
        assert d4['id'] not in affected_ids, "Unrelated draft 4 MUST NOT be in impact set"
        assert len(affected_ids) == 3

        # Step 5: Trigger targeted re-review
        rereview_res = await client.post(
            '/api/governance/re-review-impact',
            data={'item_id': fact_id},
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert rereview_res.status_code == 200
        assert rereview_res.json()['affected_count'] == 3

        # Step 6: Verify status, version, and audit changes for dependent vs unrelated drafts
        for did in [d1['id'], d2['id'], d3['id']]:
            rev_check = await client.get(f"/api/reviews/{did}")
            assert rev_check.status_code == 200
            data = rev_check.json()
            assert data['status'] == 'CHANGES_REQUESTED', f"Draft {did} must transition to CHANGES_REQUESTED"

            # Check audit entry exists
            audit_res = await client.get(f"/api/reviews/{did}/audit")
            assert audit_res.status_code == 200
            audits = audit_res.json()
            assert any(a['action'] == 'IMPACT_REREVIEW_FLAGGED' for a in audits), f"Audit for {did} must record IMPACT_REREVIEW_FLAGGED"

            # Check version snapshot saved
            vers_res = await client.get(f"/api/reviews/{did}/versions")
            assert vers_res.status_code == 200
            vers = vers_res.json()
            assert any('re-review flagged' in (v.get('reason') or '').lower() for v in vers), f"Version snapshot for {did} must record re-review reason"

        # Unrelated draft 4 remains APPROVED and untouched!
        d4_check = await client.get(f"/api/reviews/{d4['id']}")
        assert d4_check.status_code == 200
        d4_data = d4_check.json()
        assert d4_data['status'] == 'APPROVED', "Unrelated draft 4 must remain APPROVED"

        d4_audits = (await client.get(f"/api/reviews/{d4['id']}/audit")).json()
        assert not any(a['action'] == 'IMPACT_REREVIEW_FLAGGED' for a in d4_audits), "Unrelated draft 4 must not have re-review audit"
