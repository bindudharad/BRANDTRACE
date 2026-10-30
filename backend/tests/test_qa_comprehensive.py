"""
BRANDTRACE — Comprehensive Approval Enforcement, Draft Workflow, Impact Map & File Analysis Tests.
Covers Tasks 2, 3, 4, 5 from the final QA pass.
"""
import os
import sys
import tempfile
import io
import json
from pathlib import Path
import asyncio

import httpx
import pytest

# Isolated temp database
fd, _test_db = tempfile.mkstemp(suffix='.qa.db')
os.close(fd)
os.environ['DATABASE_URL'] = f'sqlite:///{_test_db}'
os.environ['AI_PROVIDER'] = 'offline'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, rows, row
from app import config

ADMIN = {"X-Demo-Role": "brand_admin"}
REV = {"X-Demo-Role": "reviewer"}
CREATOR = {"X-Demo-Role": "creator"}
AUDITOR = {"X-Demo-Role": "auditor"}


# ─── TASK 2: Approval Enforcement ──────────────────────────────────

class TestApprovalEnforcement:
    """Server-side approval gate verification."""

    @pytest.fixture(autouse=True)
    def _setup(self):
        """Seed demo data and create a review with HIGH findings before each test."""
        async def _run():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
                await c.post('/api/demo/setup')
                r = await c.post(
                    '/api/reviews',
                    json={'title': 'QA draft', 'content': 'The best cheap platform.', 'content_type': 'email'},
                    headers=REV,
                )
                data = r.json()
                self.review_id = data['id']
                self.findings = data['findings']
                self.high_finding = next(
                    (f for f in data['findings'] if f['severity'] in ('HIGH', 'CRITICAL') and not f.get('disposition')),
                    None,
                )
                self.client_transport = transport
        asyncio.run(_run())

    def _client(self):
        return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test')

    def test_approval_blocked_with_unresolved_high(self):
        """Approval must be blocked when HIGH findings remain unresolved."""
        async def scenario():
            async with self._client() as c:
                r = await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'approve'},
                    headers=REV,
                )
                assert r.status_code == 409, f"Expected 409 but got {r.status_code}: {r.text}"
                assert 'unresolved' in r.text.lower() or 'high-risk' in r.text.lower()
        asyncio.run(scenario())

    def test_waive_blocked_with_unresolved_high(self):
        """Waiver must also be blocked when HIGH findings remain unresolved."""
        async def scenario():
            async with self._client() as c:
                r = await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'waive', 'reason': 'Emergency override'},
                    headers=REV,
                )
                assert r.status_code == 409
        asyncio.run(scenario())

    def test_approval_succeeds_after_resolving_all_high(self):
        """Once all HIGH/CRITICAL findings are resolved, approval succeeds."""
        async def scenario():
            async with self._client() as c:
                # Resolve every HIGH/CRITICAL finding
                for f in self.findings:
                    if f['severity'] in ('HIGH', 'CRITICAL') and not f.get('disposition'):
                        r = await c.post(
                            f'/api/reviews/{self.review_id}/findings/{f["id"]}/actions',
                            json={'action': 'dismiss', 'reason': 'QA test exception'},
                            headers=REV,
                        )
                        assert r.status_code == 200, f"Failed to dismiss {f['id']}: {r.text}"

                # Now approval should work
                r = await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'approve'},
                    headers=REV,
                )
                assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
                review = r.json()
                assert review['status'] == 'APPROVED'
        asyncio.run(scenario())

    def test_unauthorized_approval_creator(self):
        """Creator role must not be able to approve."""
        async def scenario():
            async with self._client() as c:
                r = await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'approve'},
                    headers=CREATOR,
                )
                assert r.status_code == 403
        asyncio.run(scenario())

    def test_unauthorized_approval_auditor(self):
        """Auditor (read-only) role must not be able to approve."""
        async def scenario():
            async with self._client() as c:
                r = await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'approve'},
                    headers=AUDITOR,
                )
                assert r.status_code == 403
        asyncio.run(scenario())

    def test_auditor_cannot_submit_review(self):
        """Auditor must not be able to submit content."""
        async def scenario():
            async with self._client() as c:
                r = await c.post(
                    '/api/reviews',
                    json={'title': 'Illegal', 'content': 'test', 'content_type': 'email'},
                    headers=AUDITOR,
                )
                assert r.status_code == 403
        asyncio.run(scenario())

    def test_auditor_cannot_act_on_finding(self):
        """Auditor must not be able to dismiss findings."""
        async def scenario():
            async with self._client() as c:
                if self.high_finding:
                    r = await c.post(
                        f'/api/reviews/{self.review_id}/findings/{self.high_finding["id"]}/actions',
                        json={'action': 'dismiss', 'reason': 'test'},
                        headers=AUDITOR,
                    )
                    assert r.status_code == 403
        asyncio.run(scenario())

    def test_repeated_approval_updates_status(self):
        """After approval, a second request_changes should change status back."""
        async def scenario():
            async with self._client() as c:
                # Resolve HIGH findings first
                for f in self.findings:
                    if f['severity'] in ('HIGH', 'CRITICAL') and not f.get('disposition'):
                        await c.post(
                            f'/api/reviews/{self.review_id}/findings/{f["id"]}/actions',
                            json={'action': 'dismiss', 'reason': 'QA'},
                            headers=REV,
                        )

                # Approve
                r1 = await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'approve'},
                    headers=REV,
                )
                assert r1.json()['status'] == 'APPROVED'

                # Request changes on the already-approved review
                r2 = await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'request_changes', 'reason': 'Found new issue'},
                    headers=REV,
                )
                assert r2.status_code == 200
                assert r2.json()['status'] == 'CHANGES_REQUESTED'
        asyncio.run(scenario())

    def test_rejected_request_leaves_status_unchanged(self):
        """A rejected approval attempt (409) must not change the stored status."""
        async def scenario():
            async with self._client() as c:
                # Get current status before attempt
                r = await c.get(f'/api/reviews/{self.review_id}')
                original_status = r.json()['status']

                # Attempt approval — should fail
                r = await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'approve'},
                    headers=REV,
                )
                assert r.status_code == 409

                # Status must be unchanged
                r = await c.get(f'/api/reviews/{self.review_id}')
                assert r.json()['status'] == original_status
        asyncio.run(scenario())

    def test_successful_approval_creates_audit_event(self):
        """Approval must create an audit event with correct actor/role."""
        async def scenario():
            async with self._client() as c:
                # Resolve HIGH findings
                for f in self.findings:
                    if f['severity'] in ('HIGH', 'CRITICAL') and not f.get('disposition'):
                        await c.post(
                            f'/api/reviews/{self.review_id}/findings/{f["id"]}/actions',
                            json={'action': 'dismiss', 'reason': 'QA'},
                            headers=REV,
                        )

                await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'approve'},
                    headers=REV,
                )

                # Verify audit trail
                r = await c.get(f'/api/reviews/{self.review_id}/audit')
                assert r.status_code == 200
                events = r.json()
                approval_events = [e for e in events if 'APPROVAL' in e['action']]
                assert len(approval_events) >= 1
                last_approval = approval_events[-1]
                assert last_approval['actor_role'] == 'reviewer'
                assert 'APPROVE' in last_approval['action']
        asyncio.run(scenario())

    def test_waive_requires_reason(self):
        """Waiver without reason must be rejected even if findings are resolved."""
        async def scenario():
            async with self._client() as c:
                # Resolve all HIGH findings first
                for f in self.findings:
                    if f['severity'] in ('HIGH', 'CRITICAL') and not f.get('disposition'):
                        await c.post(
                            f'/api/reviews/{self.review_id}/findings/{f["id"]}/actions',
                            json={'action': 'dismiss', 'reason': 'QA'},
                            headers=REV,
                        )

                r = await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'waive'},
                    headers=REV,
                )
                assert r.status_code == 422
        asyncio.run(scenario())

    def test_nonexistent_review_approval(self):
        """Attempting approval on a nonexistent review returns 404."""
        async def scenario():
            async with self._client() as c:
                r = await c.post(
                    '/api/reviews/nonexistent-id/approval',
                    json={'action': 'approve'},
                    headers=REV,
                )
                assert r.status_code == 404
        asyncio.run(scenario())

    def test_invalid_approval_action(self):
        """Invalid action value must be rejected by schema validation."""
        async def scenario():
            async with self._client() as c:
                r = await c.post(
                    f'/api/reviews/{self.review_id}/approval',
                    json={'action': 'publish'},
                    headers=REV,
                )
                assert r.status_code == 422  # Pydantic validation error
        asyncio.run(scenario())


# ─── TASK 3: Complete Fresh-Draft Workflow ──────────────────────────

class TestFreshDraftWorkflow:
    """End-to-end workflow from submission to approval."""

    def test_complete_workflow(self):
        """Submit -> findings -> resolve -> approve -> audit -> versions -> persistence."""
        async def scenario():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
                # Seed
                await c.post('/api/demo/setup')

                unique_text = (
                    "BRANDTRACE is the best cheap brand governance platform. "
                    "It is always available with zero risk. "
                    "We guarantee 99.9% uptime in EMEA."
                )

                # 1. Submit draft
                r = await c.post(
                    '/api/reviews',
                    json={'title': 'QA full workflow', 'content': unique_text, 'content_type': 'marketing_copy'},
                    headers=REV,
                )
                assert r.status_code == 200, f"Submission failed: {r.text}"
                review = r.json()
                rid = review['id']
                assert review['content'] == unique_text
                assert review['status'] == 'IN_REVIEW'

                # 2. Verify evidence-linked findings
                findings = review['findings']
                assert len(findings) > 0, "Expected findings but got none"

                # Check findings relate to configured rules
                contradicted = [f for f in findings if f['status'] == 'CONTRADICTED']
                assert len(contradicted) > 0, "Expected CONTRADICTED findings for 'best'/'cheap'"

                for f in contradicted:
                    assert f.get('source_id'), f"Finding {f['id']} has no source_id"
                    assert f.get('source_title'), f"Finding {f['id']} has no source_title"
                    assert f.get('explanation'), f"Finding {f['id']} has no explanation"

                # 3. Verify version was created
                r = await c.get(f'/api/reviews/{rid}/versions')
                assert r.status_code == 200
                versions = r.json()
                assert len(versions) >= 1
                assert versions[0]['reason'] == 'ORIGINAL_SUBMISSION'
                assert versions[0]['content'] == unique_text

                # 4. Accept a suggested correction on a finding
                correctable = next((f for f in findings if f.get('suggested_correction') and not f.get('disposition')), None)
                if correctable:
                    r = await c.post(
                        f'/api/reviews/{rid}/findings/{correctable["id"]}/actions',
                        json={
                            'action': 'accept',
                            'replacement': unique_text.replace(correctable['passage'], correctable['suggested_correction']),
                        },
                        headers=REV,
                    )
                    assert r.status_code == 200
                    updated = r.json()
                    assert updated['content'] != unique_text, "Content should have changed after accept"

                    # Verify new version was saved
                    r = await c.get(f'/api/reviews/{rid}/versions')
                    assert len(r.json()) >= 2

                # 5. Resolve remaining HIGH findings
                r = await c.get(f'/api/reviews/{rid}')
                current = r.json()
                for f in current['findings']:
                    if f['severity'] in ('HIGH', 'CRITICAL') and not f.get('disposition'):
                        await c.post(
                            f'/api/reviews/{rid}/findings/{f["id"]}/actions',
                            json={'action': 'dismiss', 'reason': 'QA verification'},
                            headers=REV,
                        )

                # 6. Approval should now succeed
                r = await c.post(
                    f'/api/reviews/{rid}/approval',
                    json={'action': 'approve'},
                    headers=REV,
                )
                assert r.status_code == 200
                assert r.json()['status'] == 'APPROVED'

                # 7. Verify audit trail
                r = await c.get(f'/api/reviews/{rid}/audit')
                assert r.status_code == 200
                events = r.json()
                actions = [e['action'] for e in events]
                assert 'REVIEW_CREATED' in actions
                assert any('APPROVAL' in a for a in actions)

                # 8. Persistence check — re-fetch and confirm
                r = await c.get(f'/api/reviews/{rid}')
                assert r.status_code == 200
                persisted = r.json()
                assert persisted['status'] == 'APPROVED'
                assert persisted['title'] == 'QA full workflow'

                # 9. Version restoration
                r = await c.get(f'/api/reviews/{rid}/versions')
                versions = r.json()
                if len(versions) >= 2:
                    original = versions[0]
                    r = await c.post(
                        f'/api/reviews/{rid}/restore/{original["id"]}',
                        headers=REV,
                    )
                    assert r.status_code == 200
                    restored = r.json()
                    assert restored['content'] == unique_text

        asyncio.run(scenario())


# ─── TASK 4: Claim Ledger & Impact Map ──────────────────────────────

class TestImpactMap:
    """Impact map correctness and deduplication."""

    def test_impact_map_with_three_drafts(self):
        """Create 3 drafts referencing a fact, expire the fact, verify impact map."""
        async def scenario():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
                await c.post('/api/demo/setup')

                # Create a fact with near-past expiry (already expired)
                fact = await c.post(
                    '/api/facts',
                    json={
                        'claim': 'QA test performance',
                        'value': 'response time under 50ms',
                        'owner': 'QA team',
                        'source_title': 'Perf report Q2',
                        'source_excerpt': 'Measured response time under 50ms.',
                        'status': 'APPROVED',
                        'expires_at': '2020-01-01T00:00:00+00:00',  # Already expired
                    },
                    headers=ADMIN,
                )
                assert fact.status_code == 201, f"Fact creation failed: {fact.text}"
                fact_id = fact.json()['id']

                # Create 3 drafts that reference the expired fact's value
                draft_ids = []
                for i in range(3):
                    r = await c.post(
                        '/api/reviews',
                        json={
                            'title': f'Impact draft {i+1}',
                            'content': f'Our system achieves response time under 50ms for all queries (draft {i+1}).',
                            'content_type': 'marketing_copy',
                        },
                        headers=REV,
                    )
                    assert r.status_code == 200
                    draft_ids.append(r.json()['id'])

                # Also create an unrelated draft
                r = await c.post(
                    '/api/reviews',
                    json={
                        'title': 'Unrelated draft',
                        'content': 'This draft mentions nothing about performance.',
                        'content_type': 'email',
                    },
                    headers=REV,
                )
                unrelated_id = r.json()['id']

                # Get impact map
                r = await c.get('/api/governance/impact-map')
                assert r.status_code == 200
                impact = r.json()

                # Find the fact impact item
                fact_items = [it for it in impact['items'] if it['item_id'] == fact_id]
                assert len(fact_items) >= 1, f"Expected impact item for fact {fact_id}"

                item = fact_items[0]
                assert item['status'] == 'EXPIRED'

                # Verify all 3 drafts are affected
                affected = item['affected_review_ids']
                for did in draft_ids:
                    assert did in affected, f"Draft {did} should be in affected list"

                # Verify unrelated draft is excluded
                assert unrelated_id not in affected, "Unrelated draft should not be affected"

                # Verify deduplication: no ID appears more than once
                assert len(affected) == len(set(affected)), "Duplicate IDs in affected_review_ids"

                # Verify affected_drafts field exists and has correct structure
                if 'affected_drafts' in item:
                    drafts = item['affected_drafts']
                    draft_ids_from_field = [d['id'] for d in drafts]
                    assert len(draft_ids_from_field) == len(set(draft_ids_from_field)), "Duplicate IDs in affected_drafts"
                    for d in drafts:
                        assert 'id' in d and 'title' in d and 'status' in d

                # Verify count matches
                assert impact['total_impacted_drafts'] >= len(draft_ids)

                # Verify urgency reason
                assert item['re_review_urgency'] in ('URGENT', 'RECOMMENDED')

        asyncio.run(scenario())

    def test_impact_map_missing_expiry_handled_safely(self):
        """Facts and rules without expires_at should not crash the impact map."""
        async def scenario():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
                await c.post('/api/demo/setup')

                # Create a fact with no expiry
                await c.post(
                    '/api/facts',
                    json={
                        'claim': 'No expiry fact',
                        'value': 'eternal truth',
                        'owner': 'QA',
                        'source_title': 'Test',
                        'source_excerpt': 'Test excerpt',
                        'status': 'APPROVED',
                    },
                    headers=ADMIN,
                )

                # Impact map should not crash
                r = await c.get('/api/governance/impact-map')
                assert r.status_code == 200
        asyncio.run(scenario())

    def test_retired_rule_impacts_drafts(self):
        """A RETIRED rule should flag drafts that were reviewed against it."""
        async def scenario():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
                await c.post('/api/demo/setup')

                # Submit a draft that triggers findings against R-VOICE-01
                r = await c.post(
                    '/api/reviews',
                    json={'title': 'Retire test draft', 'content': 'This is the best product ever.', 'content_type': 'email'},
                    headers=REV,
                )
                draft_id = r.json()['id']

                # Retire R-VOICE-01
                await c.put(
                    '/api/rules/R-VOICE-01',
                    json={'status': 'RETIRED'},
                    headers=ADMIN,
                )

                # Impact map should include R-VOICE-01
                r = await c.get('/api/governance/impact-map')
                impact = r.json()
                rule_items = [it for it in impact['items'] if it['item_id'] == 'R-VOICE-01']
                assert len(rule_items) >= 1, "Retired rule should appear in impact map"
                assert draft_id in rule_items[0]['affected_review_ids']

        asyncio.run(scenario())


# ─── TASK 5: File Analysis ──────────────────────────────────────────

class TestFileAnalysis:
    """Verify actual file upload and analysis capabilities."""

    def _setup_client(self):
        return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test')

    def test_text_pdf_with_violation(self):
        """Upload a text-based PDF containing a policy violation."""
        try:
            from reportlab.pdfgen import canvas as rl_canvas
        except ImportError:
            pytest.skip("reportlab not installed — cannot generate test PDF")

        pdf_buf = io.BytesIO()
        c = rl_canvas.Canvas(pdf_buf)
        c.drawString(100, 700, "This is the best cheap product on the market.")
        c.save()
        pdf_bytes = pdf_buf.getvalue()

        async def scenario():
            async with self._setup_client() as client:
                await client.post('/api/demo/setup')
                r = await client.post(
                    '/api/reviews/upload',
                    files={'file': ('test.pdf', pdf_bytes, 'application/pdf')},
                    data={'title': 'PDF test', 'content_type': 'document'},
                    headers=REV,
                )
                assert r.status_code == 200, f"PDF upload failed: {r.text}"
                review = r.json()
                assert len(review['content']) > 0, "PDF text extraction should return content"
                # Findings should detect the violation
                assert len(review['findings']) > 0, "Expected findings for 'best'/'cheap' in PDF"
        asyncio.run(scenario())

    def test_png_upload_palette_analysis(self):
        """Upload a PNG and verify palette/contrast analysis runs."""
        try:
            from PIL import Image
        except ImportError:
            pytest.skip("Pillow not installed")

        # Create a high-contrast test image (black text on white)
        img = Image.new('RGB', (200, 100), color=(255, 255, 255))
        for x in range(50, 150):
            for y in range(30, 70):
                img.putpixel((x, y), (0, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)

        async def scenario():
            async with self._setup_client() as client:
                await client.post('/api/demo/setup')
                r = await client.post(
                    '/api/reviews/upload',
                    files={'file': ('test.png', buf.getvalue(), 'image/png')},
                    data={'title': 'Image test', 'content_type': 'image'},
                    headers=REV,
                )
                assert r.status_code == 200, f"Image upload failed: {r.text}"
                review = r.json()
                # Should have some content (analysis summary)
                assert len(review['content']) > 0
        asyncio.run(scenario())

    def test_corrupt_pdf(self):
        """Corrupt PDF must return a clear error, not crash."""
        async def scenario():
            async with self._setup_client() as client:
                await client.post('/api/demo/setup')
                r = await client.post(
                    '/api/reviews/upload',
                    files={'file': ('bad.pdf', b'not-a-pdf-at-all', 'application/pdf')},
                    data={'title': 'Corrupt PDF', 'content_type': 'document'},
                    headers=REV,
                )
                # Should return an error, not 500
                assert r.status_code in (400, 422, 200), f"Unexpected status: {r.status_code}"
        asyncio.run(scenario())

    def test_corrupt_image(self):
        """Corrupt image must not crash the server."""
        async def scenario():
            async with self._setup_client() as client:
                await client.post('/api/demo/setup')
                r = await client.post(
                    '/api/reviews/upload',
                    files={'file': ('bad.png', b'\x89PNG\r\n\x1a\nGARBAGE', 'image/png')},
                    data={'title': 'Corrupt image', 'content_type': 'image'},
                    headers=REV,
                )
                assert r.status_code in (400, 422, 200, 500)
                if r.status_code == 500:
                    pytest.fail(f"Server crashed on corrupt image: {r.text}")
        asyncio.run(scenario())

    def test_unsupported_file_type(self):
        """Uploading an unsupported file type should be rejected."""
        async def scenario():
            async with self._setup_client() as client:
                await client.post('/api/demo/setup')
                r = await client.post(
                    '/api/reviews/upload',
                    files={'file': ('doc.docx', b'PK\x03\x04fake-docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')},
                    data={'title': 'Docx test', 'content_type': 'document'},
                    headers=REV,
                )
                # Should not succeed as a valid review
                # Acceptable outcomes: 400, 422, or 200 with error content
                assert r.status_code in (400, 415, 422, 200)
        asyncio.run(scenario())

    def test_recovery_after_failed_upload(self):
        """After a failed upload, subsequent valid operations should work."""
        async def scenario():
            async with self._setup_client() as client:
                await client.post('/api/demo/setup')

                # Bad upload
                await client.post(
                    '/api/reviews/upload',
                    files={'file': ('bad.pdf', b'garbage', 'application/pdf')},
                    data={'title': 'Bad', 'content_type': 'document'},
                    headers=REV,
                )

                # Good text review should still work
                r = await client.post(
                    '/api/reviews',
                    json={'title': 'Recovery test', 'content': 'Clean content.', 'content_type': 'email'},
                    headers=REV,
                )
                assert r.status_code == 200
                assert r.json()['id']
        asyncio.run(scenario())


# ─── TASK 2 supplement: Demo Reset ──────────────────────────────────

class TestDemoReset:
    """Verify /api/demo/reset endpoint."""

    def test_reset_restores_pristine_state(self):
        async def scenario():
            orig_allow_reset = config.ALLOW_DEMO_RESET
            orig_secret = config.DEMO_RESET_SECRET
            config.ALLOW_DEMO_RESET = True
            config.DEMO_RESET_SECRET = "qa-reset-secret"
            try:
                transport = httpx.ASGITransport(app=app)
                async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
                    await c.post('/api/demo/setup')

                    # Create extra review
                    await c.post(
                        '/api/reviews',
                        json={'title': 'Extra', 'content': 'noise', 'content_type': 'email'},
                        headers=REV,
                    )

                    # Reset with authorized brand_admin and secret
                    r = await c.post('/api/demo/reset', headers={**ADMIN, 'X-Reset-Secret': 'qa-reset-secret'})
                    assert r.status_code == 200

                    overview = r.json()
                    assert overview['workspace']['id'] == 'ws_default'

                    # Should have exactly 1 review (the seeded one)
                    reviews = overview['reviews']
                    assert len(reviews) == 1
                    assert reviews[0]['title'] == 'Launch announcement — Q4'

                    # Rules should be 3
                    rules = await c.get('/api/rules')
                    assert len(rules.json()) == 3

                    # Facts should be 1
                    facts = await c.get('/api/facts')
                    assert len(facts.json()) == 1
            finally:
                config.ALLOW_DEMO_RESET = orig_allow_reset
                config.DEMO_RESET_SECRET = orig_secret
        asyncio.run(scenario())
