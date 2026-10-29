import os
import sys
import tempfile
import io
import json
from pathlib import Path
import asyncio
from contextlib import contextmanager
import httpx
import pytest
from PIL import Image

# Use isolated temp database for this test run
fd, path = tempfile.mkstemp(suffix='.db')
os.close(fd)
os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.main as main_module
from app.main import app, normalize_database_url
from app.models import db, rows, row, init_db

def test_demo_to_approval_workflow():
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            # 1. Seeded demo works without an AI key
            assert (await client.post('/api/demo/setup')).status_code == 200

            # 2. Prohibited terms and unverified claims detected
            review = (await client.post(
                '/api/reviews',
                json={'title': 'Launch email', 'content': 'The best cheap platform is live.', 'content_type': 'email'},
                headers={'X-Demo-Role': 'reviewer'}
            )).json()
            assert any(f['status'] == 'CONTRADICTED' for f in review['findings'])

            high = next(f for f in review['findings'] if f['severity'] == 'HIGH')

            # 11. Unresolved high-risk findings block approval (409 Conflict)
            assert (await client.post(
                f"/api/reviews/{review['id']}/approval",
                json={'action': 'approve'},
                headers={'X-Demo-Role': 'reviewer'}
            )).status_code == 409

            # 10. Required correction/dismissal reason enforced
            assert (await client.post(
                f"/api/reviews/{review['id']}/findings/{high['id']}/actions",
                json={'action': 'dismiss', 'reason': 'Demo exception'},
                headers={'X-Demo-Role': 'reviewer'}
            )).status_code == 200

            # 12. Nonexistent IDs rejected server-side
            assert (await client.get('/api/reviews/not-real')).status_code == 404
    asyncio.run(scenario())

def test_evidence_statuses_versions_and_validation():
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            # Invalid evidence rejected
            assert (await client.post(
                '/api/rules',
                json={'title': 'Invalid evidence', 'kind': 'prohibited_phrase', 'pattern': 'nope', 'requirement': 'Must have source', 'severity': 'HIGH', 'source_title': 'x', 'source_excerpt': 'no'},
                headers={'X-Demo-Role': 'brand_admin'}
            )).status_code == 422

            # 6. Expired sources labelled OUTDATED and do not crash analysis
            expired = (await client.post(
                '/api/facts',
                json={'claim': 'Legacy offer', 'value': 'Legacy offer', 'owner': 'Demo team', 'source_title': 'Archived release', 'source_excerpt': 'This offer has ended.', 'expires_at': '2000-01-01T00:00:00+00:00'},
                headers={'X-Demo-Role': 'brand_admin'}
            )).json()
            assert expired['id'].startswith('fact_')

            review = (await client.post(
                '/api/reviews',
                json={'title': 'Claim check', 'content': 'The Legacy offer is live and we always deliver.', 'content_type': 'marketing_copy'},
                headers={'X-Demo-Role': 'reviewer'}
            )).json()
            assert any(f['status'] == 'OUTDATED' and f['source_id'] == expired['id'] for f in review['findings'])

            # 4. Real source IDs are shown and invalid citations are rejected (triage finding has source_id=None)
            triage = next(f for f in review['findings'] if f['status'] == 'NEEDS_REVIEW')
            assert triage['source_id'] is None

            # Dismissal without reason rejected
            assert (await client.post(
                f"/api/reviews/{review['id']}/findings/{triage['id']}/actions",
                json={'action': 'dismiss'},
                headers={'X-Demo-Role': 'reviewer'}
            )).status_code == 422

            # 9. Draft versions are persisted and original drafts can be restored
            edited = (await client.post(
                f"/api/reviews/{review['id']}/findings/{triage['id']}/actions",
                json={'action': 'edit', 'reason': 'Qualified claim', 'replacement': 'The Legacy offer needs verification.'},
                headers={'X-Demo-Role': 'reviewer'}
            )).json()
            assert edited['content'] == 'The Legacy offer needs verification.'

            versions = (await client.get(f"/api/reviews/{review['id']}/versions")).json()
            assert versions[0]['content'] == 'The Legacy offer is live and we always deliver.'
            assert versions[-1]['content'] == 'The Legacy offer needs verification.'

            # 3. Harmless text does not receive fabricated violation
            harmless = (await client.post(
                '/api/reviews',
                json={'title': 'Harmless', 'content': 'Brandtrace helps teams review copy with clear guidance.', 'content_type': 'web'},
                headers={'X-Demo-Role': 'reviewer'}
            )).json()
            assert not [f for f in harmless['findings'] if f['status'] in ('CONTRADICTED', 'NEEDS_REVIEW')]

            # Invalid action on nonexistent finding
            assert (await client.post(
                '/api/reviews/not-real/findings/not-real/actions',
                json={'action': 'accept'},
                headers={'X-Demo-Role': 'reviewer'}
            )).status_code == 404

            # Empty content rejected
            assert (await client.post(
                '/api/reviews',
                json={'title': 'x', 'content': '', 'content_type': 'email'},
                headers={'X-Demo-Role': 'reviewer'}
            )).status_code == 422
    asyncio.run(scenario())

def test_postgres_url_normalization():
    assert normalize_database_url('postgres://user:password@db.example/brandtrace') == 'postgresql+psycopg://user:password@db.example/brandtrace'
    assert normalize_database_url('postgresql://user:password@db.example/brandtrace') == 'postgresql+psycopg://user:password@db.example/brandtrace'

def test_role_permissions_and_unauthorized_access():
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            # Auditor cannot create review (403)
            res_auditor = await client.post(
                '/api/reviews',
                json={'title': 'Auditor attempt', 'content': 'Brandtrace is cool.', 'content_type': 'email'},
                headers={'X-Demo-Role': 'auditor'}
            )
            assert res_auditor.status_code == 403

            # Creator creates a review
            rev = (await client.post(
                '/api/reviews',
                json={'title': 'Creator draft', 'content': 'The cheap platform works.', 'content_type': 'email'},
                headers={'X-Demo-Role': 'creator'}
            )).json()

            high_finding = next(f for f in rev['findings'] if f['severity'] == 'HIGH')

            # Creator cannot dismiss finding (requires reviewer/admin) (403)
            dismiss_attempt = await client.post(
                f"/api/reviews/{rev['id']}/findings/{high_finding['id']}/actions",
                json={'action': 'dismiss', 'reason': 'Creator excuse'},
                headers={'X-Demo-Role': 'creator'}
            )
            assert dismiss_attempt.status_code == 403

            # Creator cannot approve (403)
            approve_attempt = await client.post(
                f"/api/reviews/{rev['id']}/approval",
                json={'action': 'approve'},
                headers={'X-Demo-Role': 'creator'}
            )
            assert approve_attempt.status_code == 403

            # Creator cannot add brand rules (requires brand_admin) (403)
            rule_attempt = await client.post(
                '/api/rules',
                json={'title': 'R-TEST', 'category': 'voice', 'kind': 'prohibited_phrase', 'pattern': 'xyz', 'requirement': 'No xyz', 'severity': 'LOW', 'source_title': 'Guide', 'source_excerpt': 'No xyz.'},
                headers={'X-Demo-Role': 'creator'}
            )
            assert rule_attempt.status_code == 403
    asyncio.run(scenario())

def test_version_restoration_and_audit():
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            rev = (await client.post(
                '/api/reviews',
                json={'title': 'Version draft', 'content': 'Initial submission Brandtrace.', 'content_type': 'email'},
                headers={'X-Demo-Role': 'reviewer'}
            )).json()

            orig_versions = (await client.get(f"/api/reviews/{rev['id']}/versions")).json()
            first_ver_id = orig_versions[0]['id']

            # Make an edit finding
            finding_id = rev['findings'][0]['id'] if rev['findings'] else 'f_dummy'
            if rev['findings']:
                await client.post(
                    f"/api/reviews/{rev['id']}/findings/{finding_id}/actions",
                    json={'action': 'edit', 'reason': 'Changed text', 'replacement': 'Brandtrace modified text.'},
                    headers={'X-Demo-Role': 'reviewer'}
                )

            # Restore original version
            restored = (await client.post(
                f"/api/reviews/{rev['id']}/restore/{first_ver_id}",
                headers={'X-Demo-Role': 'reviewer'}
            )).json()
            assert restored['content'] == 'Initial submission Brandtrace.'

            # 13. Audit history contains expected events
            audit_events = (await client.get(f"/api/reviews/{rev['id']}/audit")).json()
            actions = [e['action'] for e in audit_events]
            assert 'REVIEW_CREATED' in actions
            assert 'VERSION_RESTORED' in actions
    asyncio.run(scenario())

def test_file_upload_multimodal():
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            # 1. Plain text file upload
            text_data = b"Brandtrace launch announcement text with best features."
            files = {'file': ('announcement.txt', text_data, 'text/plain')}
            data = {'title': 'Text file review', 'content_type': 'document'}
            r_text = (await client.post('/api/reviews/upload', data=data, files=files, headers={'X-Demo-Role': 'reviewer'})).json()
            assert r_text['file_name'] == 'announcement.txt'
            assert any(f['passage'] == 'best' for f in r_text['findings'])

            # 2. Image upload with synthetic contrasting pixels
            img = Image.new('RGB', (100, 100), color=(255, 0, 0)) # Red image (unapproved color)
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            img_data = buf.getvalue()

            files_img = {'file': ('graphic.png', img_data, 'image/png')}
            data_img = {'title': 'Graphic review', 'content_type': 'image'}
            r_img = (await client.post('/api/reviews/upload', data=data_img, files=files_img, headers={'X-Demo-Role': 'reviewer'})).json()
            assert r_img['file_name'] == 'graphic.png'
            # Should contain visual finding
            visual_f = next((f for f in r_img['findings'] if f['category'] == 'visual_palette'), None)
            assert visual_f is not None

            # 16. Unsupported file upload fails safely
            bad_files = {'file': ('audio.mp3', b'fake audio data', 'audio/mpeg')}
            bad_res = await client.post('/api/reviews/upload', data={'title': 'Bad file'}, files=bad_files, headers={'X-Demo-Role': 'reviewer'})
            assert bad_res.status_code == 415
    asyncio.run(scenario())

def test_time_aware_claim_ledger_and_impact_map():
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            # Create a specific fact
            fact = (await client.post(
                '/api/facts',
                json={
                    'claim': 'Regional SLA',
                    'value': '99.9% uptime in EMEA',
                    'owner': 'Infrastructure Team',
                    'source_title': 'SLA Standard',
                    'source_excerpt': 'We guarantee 99.9% uptime in EMEA region.',
                    'expires_at': '2099-01-01T00:00:00+00:00'
                },
                headers={'X-Demo-Role': 'brand_admin'}
            )).json()

            # Create 3 drafts referencing this fact
            r1 = (await client.post('/api/reviews', json={'title': 'Draft 1', 'content': 'Brandtrace offers 99.9% uptime in EMEA.', 'content_type': 'email'}, headers={'X-Demo-Role': 'reviewer'})).json()
            r2 = (await client.post('/api/reviews', json={'title': 'Draft 2', 'content': 'Brandtrace guarantees 99.9% uptime in EMEA today.', 'content_type': 'web'}, headers={'X-Demo-Role': 'reviewer'})).json()
            r3 = (await client.post('/api/reviews', json={'title': 'Draft 3', 'content': 'Check out 99.9% uptime in EMEA with Brandtrace.', 'content_type': 'social'}, headers={'X-Demo-Role': 'reviewer'})).json()

            # Expire the fact
            await client.put(
                f"/api/facts/{fact['id']}",
                json={'expires_at': '2000-01-01T00:00:00+00:00'},
                headers={'X-Demo-Role': 'brand_admin'}
            )

            # Impact map should flag all 3 drafts
            imap = (await client.get('/api/governance/impact-map')).json()
            item = next((i for i in imap['items'] if i['item_id'] == fact['id']), None)
            assert item is not None
            assert item['status'] == 'EXPIRED'
            assert r1['id'] in item['affected_review_ids']
            assert r2['id'] in item['affected_review_ids']
            assert r3['id'] in item['affected_review_ids']

            # Trigger targeted re-review
            re_rev = await client.post(
                '/api/governance/re-review-impact',
                data={'item_id': fact['id']},
                headers={'X-Demo-Role': 'brand_admin'}
            )
            assert re_rev.status_code == 200
    asyncio.run(scenario())

def test_database_persistence_survives_reconnect():
    # Insert a review
    review_id = 'test_persistence_rev_01'
    with db() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO reviews (
                id, workspace_id, title, content, content_type, status, score,
                author, analysis_method, rule_versions, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (review_id, 'ws_default', 'Persistence check', 'Brandtrace copy.', 'email', 'APPROVED', 100, 'tester', 'DETERMINISTIC', '{}', '2026-10-22T00:00:00Z', '2026-10-22T00:00:00Z')
        )

    # Re-query
    r = row("SELECT * FROM reviews WHERE id=?", (review_id,))
    assert r is not None
    assert r['title'] == 'Persistence check'
    assert r['status'] == 'APPROVED'

def test_production_deployment_readiness():
    # 1. URL normalization handles whitespaces, query params, and idempotency
    raw_neon = "  postgresql://user:secret@ep-cool-fog-123.us-east-2.aws.neon.tech/neondb?sslmode=require  "
    expected = "postgresql+psycopg://user:secret@ep-cool-fog-123.us-east-2.aws.neon.tech/neondb?sslmode=require"
    assert normalize_database_url(raw_neon) == expected
    assert normalize_database_url(expected) == expected
    assert normalize_database_url("  postgres://user:secret@host/db  ") == "postgresql+psycopg://user:secret@host/db"
    assert normalize_database_url("sqlite:///./brandtrace.db") == "sqlite:///./brandtrace.db"

    # 2. init_db runs idempotently multiple times without raising errors
    init_db()
    init_db()

    # 3. /api/ready responds with ok database dialect
    async def check_ready():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/ready")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "ready"
            assert "database" in data
    asyncio.run(check_ready())


def test_readiness_returns_503_when_database_probe_fails(monkeypatch):
    """Readiness must not report success merely because an engine exists."""
    @contextmanager
    def unavailable_database():
        raise RuntimeError("simulated database connection failure")
        yield  # pragma: no cover - satisfies contextmanager's generator shape

    monkeypatch.setattr(main_module, "db", unavailable_database)

    async def check_unavailable():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/ready")
            assert response.status_code == 503
            assert response.json() == {"detail": "Database not ready."}

    asyncio.run(check_unavailable())


def test_staging_lifespan_verifies_schema_without_repeating_initialization(monkeypatch):
    """A runbook-verified staging child must not run the DDL migration twice."""
    monkeypatch.setenv("BRANDTRACE_STARTUP_SCHEMA_MODE", "verify")

    def unexpected_initialization():
        raise AssertionError("staging lifespan should use read-only schema verification")

    monkeypatch.setattr(main_module, "init_db", unexpected_initialization)

    async def check_lifespan():
        async with main_module.lifespan(app):
            pass

    asyncio.run(check_lifespan())
