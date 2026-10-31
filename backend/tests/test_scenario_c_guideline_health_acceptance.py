"""Scenario C: Guideline Health Intelligence Acceptance Test
Exercises:
1. Seed repeated labelled findings with conflicting reviewer dispositions (disagreement detection).
2. Traceable clarification suggestion with grounded evidence references.
3. Strict reviewer vs brand_admin role permissions.
4. Proposal acceptance and activation with optimistic version concurrency.
5. Verification of immutable rule version history and comprehensive audit records.
"""
import os
import sys
import tempfile
from pathlib import Path
import httpx
import pytest

if 'DATABASE_URL' not in os.environ:
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, init_db, rows, row, ident, now


@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM rule_versions")
        conn.execute("DELETE FROM rule_suggestions")
        conn.execute("DELETE FROM findings")
        conn.execute("DELETE FROM reviews")
        conn.execute("DELETE FROM rules")
        conn.execute("DELETE FROM audit")
        conn.execute("DELETE FROM workspaces")
        conn.execute("INSERT OR IGNORE INTO workspaces VALUES ('ws_default', 'Default WS', '2026-01-01')")
    yield


@pytest.mark.asyncio
async def test_scenario_c_guideline_health_suggestion_and_activation_lifecycle():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # Step 1: Create approved rule R-COMP-01
        r_res = await client.post(
            '/api/rules',
            json={
                'title': 'No Unsubstantiated Comparative Claims',
                'kind': 'prohibited_phrase',
                'pattern': 'superior performance',
                'requirement': 'Avoid claims of superior performance without audited industry benchmarks.',
                'severity': 'HIGH',
                'source_title': 'Brand Policy Guide 2026',
                'source_excerpt': 'Claims of superior performance must cite external benchmarks.',
                'status': 'APPROVED'
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert r_res.status_code == 201
        rule = r_res.json()
        rule_id = rule['id']
        assert rule['version'] == '1.0'

        # Step 2: Create 3 independent drafts and seed conflicting reviewer dispositions
        # Draft 1: Accepted by reviewer.alice
        d1 = (await client.post('/api/reviews', json={'title': 'Draft Alpha', 'content': 'Delivers superior performance under stress.'})).json()
        # Draft 2: Dismissed by reviewer.bob
        d2 = (await client.post('/api/reviews', json={'title': 'Draft Beta', 'content': 'Engineered for superior performance always.'})).json()
        # Draft 3: Escalated by reviewer.charlie
        d3 = (await client.post('/api/reviews', json={'title': 'Draft Gamma', 'content': 'Provides superior performance metrics.'})).json()

        # Update findings in DB with distinct reviewer dispositions
        f1 = d1['findings'][0]['id']
        f2 = d2['findings'][0]['id']
        f3 = d3['findings'][0]['id']

        ts = now()
        with db() as conn:
            conn.execute(
                "UPDATE findings SET disposition='ACCEPTED_EDIT', disposition_by='reviewer.alice', disposition_at=? WHERE id=?",
                (ts, f1)
            )
            conn.execute(
                "UPDATE findings SET disposition='DISMISSED', disposition_reason='Legal authorized exception', disposition_by='reviewer.bob', disposition_at=? WHERE id=?",
                (ts, f2)
            )
            conn.execute(
                "UPDATE findings SET disposition='ESCALATED', disposition_reason='Ambiguous wording', disposition_by='reviewer.charlie', disposition_at=? WHERE id=?",
                (ts, f3)
            )

        # Step 3: Compute guideline health and verify disagreement telemetry
        health_res = await client.get('/api/governance/guideline-health', headers={'X-Workspace-Id': 'ws_default'})
        assert health_res.status_code == 200
        health_items = health_res.json()
        gh_item = next((i for i in health_items if i['rule_id'] == rule_id), None)
        assert gh_item is not None

        assert gh_item['disagreement_detected'] is True, "Disagreement between alice (accepted) and bob (dismissed) must be detected"
        assert gh_item['data_confidence'] == "SUFFICIENT", "3 independent drafts must yield SUFFICIENT confidence"
        assert gh_item['affected_draft_count'] == 3
        assert gh_item['finding_count'] == 3

        suggestion = gh_item.get('suggestion')
        assert suggestion is not None, "Deterministic clarification suggestion must be generated"
        assert "conflicting dispositions" in suggestion['observed_issue'].lower()
        assert len(suggestion['proposed_clarification']) > 10

        # Step 4: Verify role permissions on proposal decisions
        # Reviewer cannot accept policy proposal -> HTTP 403
        rev_accept = await client.post(
            f"/api/governance/rule-suggestions/{rule_id}",
            json={'action': 'accept'},
            headers={'X-Demo-Role': 'reviewer', 'X-Demo-Actor': 'demo.reviewer'}
        )
        assert rev_accept.status_code == 403, "Reviewer must not be permitted to accept policy proposals"

        # Brand admin CAN accept policy proposal -> HTTP 200
        admin_accept = await client.post(
            f"/api/governance/rule-suggestions/{rule_id}",
            json={'action': 'accept'},
            headers={'X-Demo-Role': 'brand_admin', 'X-Demo-Actor': 'admin.lead'}
        )
        assert admin_accept.status_code == 200
        sugg_data = admin_accept.json()
        suggestion_id = sugg_data['id']
        assert sugg_data['status'] == 'ACCEPTED'

        # Verify suggestion persistence and evidence references
        sugg_row = row("SELECT * FROM rule_suggestions WHERE id=?", (suggestion_id,))
        assert sugg_row is not None
        assert sugg_row['status'] == 'ACCEPTED'
        assert sugg_row['rule_version'] == '1.0'
        assert sugg_row['sample_count'] == 3

        # Step 5: Proposal activation with concurrency checks
        # Stale version check -> HTTP 409
        stale_act = await client.post(
            f"/api/governance/rule-suggestions/{suggestion_id}/activate",
            json={'expected_rule_version': '9.0', 'reason': 'Stale test'},
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert stale_act.status_code == 409, "Stale expected_rule_version must be rejected with 409"

        # Valid activation -> HTTP 200
        new_req = "Specify third-party benchmark source when using 'superior performance'."
        valid_act = await client.post(
            f"/api/governance/rule-suggestions/{suggestion_id}/activate",
            json={
                'expected_rule_version': '1.0',
                'new_requirement': new_req,
                'reason': 'Clarified benchmark citation standard following reviewer disagreement'
            },
            headers={'X-Demo-Role': 'brand_admin', 'X-Demo-Actor': 'admin.lead'}
        )
        assert valid_act.status_code == 200
        act_res = valid_act.json()
        assert act_res['status'] == 'ACTIVATED'
        assert act_res['old_version'] == '1.0'
        assert act_res['new_version'] == '2'

        # Step 6: Verify immutable version history & audit trail
        rule_db = row("SELECT * FROM rules WHERE id=?", (rule_id,))
        assert rule_db['version'] == '2'
        assert rule_db['requirement'] == new_req

        # Versions endpoint returns all versions in immutable history
        versions_res = await client.get(f"/api/rules/{rule_id}/versions")
        assert versions_res.status_code == 200
        vers = versions_res.json()
        assert len(vers) >= 2
        versions_set = {v['version'] for v in vers}
        assert '1.0' in versions_set and '2' in versions_set
        latest_ver = next(v for v in vers if v['version'] == '2')
        assert latest_ver['originating_suggestion_id'] == suggestion_id
        v1 = next(v for v in vers if v['version'] == '1.0')
        assert v1['requirement'] == "Avoid claims of superior performance without audited industry benchmarks."

        # Audit ledger record verified
        audits = rows("SELECT * FROM audit WHERE action='RULE_VERSION_ACTIVATED' AND workspace_id='ws_default'")
        assert len(audits) >= 1
        assert any(suggestion_id in (a.get('details') or '') for a in audits)
