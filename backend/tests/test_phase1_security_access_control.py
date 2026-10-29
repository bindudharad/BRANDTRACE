import os
import sys
import tempfile
from pathlib import Path
import httpx
import pytest

# Ensure isolated SQLite database for testing
if 'DATABASE_URL' not in os.environ:
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, init_db, row, rows, ident, now
import app.config as config


@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM rule_suggestions")
        conn.execute("DELETE FROM findings")
        conn.execute("DELETE FROM reviews")
        conn.execute("DELETE FROM rules")
        conn.execute("DELETE FROM fact_versions")
        conn.execute("DELETE FROM facts")
        conn.execute("DELETE FROM audit")
        conn.execute("DELETE FROM workspaces")
        conn.execute("INSERT OR IGNORE INTO workspaces VALUES ('ws_default', 'Default WS', '2026-01-01')")
        conn.execute("INSERT OR IGNORE INTO workspaces VALUES ('ws_unrelated', 'Foreign WS', '2026-01-01')")
    yield


@pytest.mark.asyncio
async def test_unauthenticated_requests_in_strict_auth_mode():
    """Verify 401 responses on unauthenticated requests when ALLOW_DEMO_AUTH is False."""
    saved = (config.ALLOW_DEMO_AUTH, config.ADMIN_API_KEY, config.API_KEY)
    config.ALLOW_DEMO_AUTH = False
    config.ADMIN_API_KEY = "admin-secret-key-12345"
    config.API_KEY = "user-secret-key-67890"

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            # 1. GET guideline-health without credentials -> 401
            res = await client.get('/api/governance/guideline-health')
            assert res.status_code == 401, f"Expected 401, got {res.status_code}"

            # 2. POST rule-suggestion action without credentials -> 401
            res_sugg = await client.post(
                '/api/governance/rule-suggestions/r-test-1',
                json={'action': 'accept'}
            )
            assert res_sugg.status_code == 401, f"Expected 401, got {res_sugg.status_code}"

            # 3. Invalid Bearer token -> 401
            res_invalid = await client.get(
                '/api/governance/guideline-health',
                headers={'Authorization': 'Bearer bad-token-999'}
            )
            assert res_invalid.status_code == 401, f"Expected 401, got {res_invalid.status_code}"
    finally:
        config.ALLOW_DEMO_AUTH, config.ADMIN_API_KEY, config.API_KEY = saved


@pytest.mark.asyncio
async def test_cross_workspace_guideline_health_isolation():
    """Verify that findings in foreign workspace do not leak into caller's guideline health."""
    ts = now()
    with db() as conn:
        # Rule in ws_default
        conn.execute(
            """INSERT INTO rules (id, workspace_id, title, category, kind, pattern, requirement, severity, version, status, owner, source_title, source_excerpt, created_at)
            VALUES ('rule_default_1', 'ws_default', 'No Superlatives', 'tone', 'prohibited_phrase', 'best', 'Avoid best', 'HIGH', '1.0', 'APPROVED', 'owner', 'Source', 'Excerpt', ?)""",
            (ts,)
        )
        # Review and finding in ws_unrelated that mentions rule_default_1
        conn.execute(
            """INSERT INTO reviews (id, workspace_id, title, content, content_type, status, score, author, analysis_method, rule_versions, created_at, updated_at)
            VALUES ('rev_foreign_1', 'ws_unrelated', 'Foreign Draft', 'We have the best tools.', 'marketing_copy', 'IN_REVIEW', 70, 'foreign@corp.com', 'DETERMINISTIC', '{}', ?, ?)""",
            (ts, ts)
        )
        conn.execute(
            """INSERT INTO findings (id, review_id, category, type, severity, status, passage, explanation, source_id, analysis_method, disposition, disposition_by)
            VALUES ('find_foreign_1', 'rev_foreign_1', 'general', 'prohibited_phrase', 'HIGH', 'CONTRADICTED', 'best', 'Violation', 'rule_default_1', 'DETERMINISTIC', 'ACCEPTED_EDIT', 'foreign.reviewer')"""
        )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # Request guideline-health for ws_default
        res = await client.get(
            '/api/governance/guideline-health',
            headers={'X-Workspace-Id': 'ws_default', 'X-Demo-Role': 'reviewer'}
        )
        assert res.status_code == 200
        items = res.json()
        target_item = next((i for i in items if i['rule_id'] == 'rule_default_1'), None)
        assert target_item is not None
        # Must be 0 findings because the finding belongs to a review in ws_unrelated!
        assert target_item['finding_count'] == 0, f"Expected 0 scoped findings, got {target_item['finding_count']}"
        assert target_item['affected_draft_count'] == 0


@pytest.mark.asyncio
async def test_cross_workspace_rule_suggestion_denial_and_zero_writes():
    """Verify 403 when acting on a rule outside caller's workspace, and prove zero database writes."""
    ts = now()
    with db() as conn:
        conn.execute(
            """INSERT INTO rules (id, workspace_id, title, category, kind, pattern, requirement, severity, version, status, owner, source_title, source_excerpt, created_at)
            VALUES ('rule_foreign_99', 'ws_unrelated', 'Foreign Rule', 'tone', 'prohibited_phrase', 'cheap', 'Avoid cheap', 'MEDIUM', '1.0', 'APPROVED', 'owner', 'Source', 'Excerpt', ?)""",
            (ts,)
        )

    # Count prior rows
    prior_sugg_count = len(rows("SELECT * FROM rule_suggestions"))
    prior_audit_count = len(rows("SELECT * FROM audit"))

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # Caller in ws_default tries to submit suggestion on rule_foreign_99
        res = await client.post(
            '/api/governance/rule-suggestions/rule_foreign_99',
            json={'action': 'accept'},
            headers={
                'X-Workspace-Id': 'ws_default',
                'X-Demo-Role': 'brand_admin',
                'X-Demo-Actor': 'demo.brand_admin'
            }
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"

    # Verify zero database writes were made
    after_sugg_count = len(rows("SELECT * FROM rule_suggestions"))
    after_audit_count = len(rows("SELECT * FROM audit"))
    assert after_sugg_count == prior_sugg_count, "Database write detected in denied suggestion request!"
    assert after_audit_count == prior_audit_count, "Audit write detected in denied suggestion request!"


@pytest.mark.asyncio
async def test_cross_workspace_suggestion_activation_defensive_validation():
    """Verify 403 when activating a suggestion whose rule belongs to another workspace, and prove zero writes."""
    ts = now()
    with db() as conn:
        conn.execute(
            """INSERT INTO rules (id, workspace_id, title, category, kind, pattern, requirement, severity, version, status, owner, source_title, source_excerpt, created_at)
            VALUES ('rule_target_33', 'ws_unrelated', 'Target Rule', 'tone', 'prohibited_phrase', 'cheap', 'Requirement', 'HIGH', '1.0', 'APPROVED', 'owner', 'Source', 'Excerpt', ?)""",
            (ts,)
        )
        conn.execute(
            """INSERT INTO rule_suggestions (id, rule_id, status, workspace_id, rule_version, created_at)
            VALUES ('sugg_target_33', 'rule_target_33', 'ACCEPTED', 'ws_default', '1.0', ?)""",
            (ts,)
        )

    prior_ver_count = len(rows("SELECT * FROM rule_versions"))

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        res = await client.post(
            '/api/governance/rule-suggestions/sugg_target_33/activate',
            json={'expected_rule_version': '1.0', 'reason': 'Test activation'},
            headers={
                'X-Workspace-Id': 'ws_default',
                'X-Demo-Role': 'brand_admin',
                'X-Demo-Actor': 'demo.brand_admin'
            }
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"

    after_ver_count = len(rows("SELECT * FROM rule_versions"))
    assert after_ver_count == prior_ver_count, "Rule version write detected in denied activation request!"
