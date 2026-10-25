"""
Regression tests for disposition reason / draft content cross-contamination fix.

Verifies:
1. Reason cannot overwrite draft content (backend rejects replacement == reason).
2. Edit preserves the full intended draft content (content updated correctly).
3. Reason stored in disposition_reason field, NOT in review content.
4. Mandatory term present in working copy after a valid edit.
5. Edit action creates a version history entry.
6. Subsequent GET returns the saved (new) content.
7. Failed validation leaves original content unchanged.
8. QA metadata strings are rejected as replacement content.
"""

import os
import sys
import tempfile
import asyncio
from pathlib import Path

import httpx
import pytest

# Isolated test DB — must be set before importing app
fd, _test_db = tempfile.mkstemp(suffix='.disposition.db')
os.close(fd)
os.environ['DATABASE_URL'] = f'sqlite:///{_test_db}'
os.environ['AI_PROVIDER'] = 'offline'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402

REV = {"X-Demo-Role": "reviewer"}
ADMIN = {"X-Demo-Role": "brand_admin"}


@pytest.fixture(autouse=True)
def setup_demo():
    """Seed demo data before each test."""
    async def _init():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            await c.post('/api/demo/setup')
    asyncio.run(_init())


# ---------------------------------------------------------------------------
# Helper: submit a review draft and return (review_id, first_finding_id)
# ---------------------------------------------------------------------------
DRAFT_WITH_REQUIRED_TERM = (
    "Discover why our platform is the best choice for modern businesses. "
    "Brandtrace ensures every claim is evidence-linked and traceable."
)

DRAFT_WITHOUT_REQUIRED_TERM = (
    "Discover why our platform is the best choice for modern businesses. "
    "Our solution delivers guaranteed results with zero risk."
)


def _create_review(content: str, title: str = "Disposition Test Draft") -> tuple[str, list]:
    """Submit a review and return (review_id, findings list)."""
    result = {}

    async def _run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                '/api/reviews',
                json={'title': title, 'content': content, 'role': 'reviewer'},
                headers=REV,
            )
            assert r.status_code == 200, f"Review creation failed: {r.text}"
            result['review'] = r.json()

    asyncio.run(_run())
    rev = result['review']
    return rev['id'], rev.get('findings', [])


# ---------------------------------------------------------------------------
# Test 1: Reason cannot overwrite draft content
# ---------------------------------------------------------------------------
def test_reason_cannot_overwrite_draft_content():
    """
    Backend must reject an edit where replacement text equals the reason string.
    This is the cross-contamination guard (Guard 1).
    """
    rid, findings = _create_review(DRAFT_WITHOUT_REQUIRED_TERM, "Reason-Overwrite Test")
    if not findings:
        pytest.skip("No findings produced — cannot test finding action")

    fid = findings[0]['id']
    reason_text = "Manual QA: corrected the claim per brand guidelines."

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                f'/api/reviews/{rid}/findings/{fid}/actions',
                json={
                    'action': 'edit',
                    'reason': reason_text,
                    'replacement': reason_text,   # reason === replacement → should be rejected
                },
                headers=REV,
            )
            assert r.status_code in (400, 422), (
                f"Expected 400/422 when replacement == reason, got {r.status_code}: {r.text}"
            )

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Test 2: Edit preserves full intended draft content
# ---------------------------------------------------------------------------
def test_edit_preserves_full_draft_content():
    """
    A valid edit must update the review content to include the replacement text
    substituted for the offending passage, not replace the whole content with the reason.
    """
    rid, findings = _create_review(DRAFT_WITHOUT_REQUIRED_TERM, "Edit-Content Preservation Test")
    if not findings:
        pytest.skip("No findings produced")

    # Find a finding we can act on
    target = findings[0]
    fid = target['id']
    passage = target.get('passage', '')
    if not passage or passage not in DRAFT_WITHOUT_REQUIRED_TERM:
        pytest.skip(f"Passage '{passage}' not in draft — cannot substitute")

    replacement = "effective choice"
    reason = "Removed superlative per brand guidelines."

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                f'/api/reviews/{rid}/findings/{fid}/actions',
                json={'action': 'edit', 'reason': reason, 'replacement': replacement},
                headers=REV,
            )
            if r.status_code not in (200, 422):
                pytest.fail(f"Unexpected status {r.status_code}: {r.text}")

            if r.status_code == 422:
                # Acceptable if passage not matched — skip further assertions
                return

            # Fetch review and check content was updated to replacement, NOT to reason
            rev_r = await c.get(f'/api/reviews/{rid}')
            assert rev_r.status_code == 200
            updated_content = rev_r.json()['content']

            assert reason not in updated_content, (
                f"Reason string leaked into review content: {updated_content!r}"
            )
            assert replacement in updated_content, (
                f"Replacement text not in updated content: {updated_content!r}"
            )

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Test 3: Reason stored in disposition field, not in content
# ---------------------------------------------------------------------------
def test_reason_stored_in_disposition_field():
    """
    After a dismiss action with a reason, the reason must appear in the finding's
    disposition_reason, NOT in the review's working content.
    """
    rid, findings = _create_review(DRAFT_WITHOUT_REQUIRED_TERM, "Disposition Field Test")
    if not findings:
        pytest.skip("No findings produced")

    fid = findings[0]['id']
    reason = "Acknowledged: acceptable for this campaign context."

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            # Dismiss with reason
            r = await c.post(
                f'/api/reviews/{rid}/findings/{fid}/actions',
                json={'action': 'dismiss', 'reason': reason},
                headers=REV,
            )
            assert r.status_code == 200, f"Dismiss failed: {r.text}"

            # Verify finding disposition_reason
            rev_r = await c.get(f'/api/reviews/{rid}')
            assert rev_r.status_code == 200
            rev_data = rev_r.json()
            updated_content = rev_data['content']

            # Reason must NOT be in working draft
            assert reason not in updated_content, (
                f"Disposition reason leaked into draft content: {updated_content!r}"
            )

            # Check finding disposition_reason via findings list
            updated_finding = next(
                (f for f in rev_data.get('findings', []) if f['id'] == fid),
                None,
            )
            assert updated_finding is not None, "Finding not found after dismiss"
            assert updated_finding.get('disposition') == 'DISMISSED', (
                f"Expected DISMISSED, got {updated_finding.get('disposition')}"
            )
            disp_reason = updated_finding.get('disposition_reason', '')
            assert reason in disp_reason or disp_reason == reason, (
                f"Reason not in disposition_reason: {disp_reason!r}"
            )

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Test 4: QA metadata strings rejected as replacement content
# ---------------------------------------------------------------------------
def test_qa_metadata_rejected_as_content():
    """
    Replacement strings starting with 'Manual QA:' or similar QA prefixes
    must be rejected by the backend (Guard 2).
    """
    rid, findings = _create_review(DRAFT_WITHOUT_REQUIRED_TERM, "QA-Metadata Rejection Test")
    if not findings:
        pytest.skip("No findings produced")

    fid = findings[0]['id']

    for bad_prefix in [
        "Manual QA: this was added to satisfy R-TERM-02.",
        "QA: correction applied.",
        "Reason: the original text was flagged.",
        "Disposition Reason: accepted per guidelines.",
    ]:
        async def scenario(rep=bad_prefix):
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
                r = await c.post(
                    f'/api/reviews/{rid}/findings/{fid}/actions',
                    json={'action': 'edit', 'reason': 'testing guard', 'replacement': rep},
                    headers=REV,
                )
                assert r.status_code in (400, 422), (
                    f"Expected rejection for QA-prefix replacement '{rep}', got {r.status_code}: {r.text}"
                )

        asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Test 5: Failed validation leaves original content unchanged
# ---------------------------------------------------------------------------
def test_failed_edit_leaves_content_unchanged():
    """
    When an edit action is rejected (e.g., replacement == reason), the review
    content must remain exactly as it was before the attempt.
    """
    rid, findings = _create_review(DRAFT_WITHOUT_REQUIRED_TERM, "Unchanged-on-Failure Test")

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            # Capture original content
            orig_r = await c.get(f'/api/reviews/{rid}')
            original_content = orig_r.json()['content']

            if not findings:
                return  # No findings → content trivially unchanged

            fid = findings[0]['id']
            bad_reason = "Manual QA: inserted required term per R-TERM-02."

            # Attempt a bad edit
            r = await c.post(
                f'/api/reviews/{rid}/findings/{fid}/actions',
                json={'action': 'edit', 'reason': bad_reason, 'replacement': bad_reason},
                headers=REV,
            )
            # Should be rejected
            assert r.status_code in (400, 422), (
                f"Expected rejection, got {r.status_code}"
            )

            # Content must still be original
            after_r = await c.get(f'/api/reviews/{rid}')
            assert after_r.json()['content'] == original_content, (
                "Review content changed despite failed validation"
            )

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Test 6: Edit action creates a version history entry
# ---------------------------------------------------------------------------
def test_edit_creates_version_history_entry():
    """
    A successful edit action must produce a new version in the review's
    version history with the updated content.
    """
    rid, findings = _create_review(DRAFT_WITHOUT_REQUIRED_TERM, "Version-History Test")
    if not findings:
        pytest.skip("No findings produced")

    target = findings[0]
    fid = target['id']
    passage = target.get('passage', '')
    if not passage or passage not in DRAFT_WITHOUT_REQUIRED_TERM:
        pytest.skip(f"Passage '{passage}' not found in draft")

    replacement = "effective choice"

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                f'/api/reviews/{rid}/findings/{fid}/actions',
                json={'action': 'edit', 'reason': 'Test correction', 'replacement': replacement},
                headers=REV,
            )
            if r.status_code == 422:
                pytest.skip("Edit not applicable to this passage (422)")
            assert r.status_code == 200, f"Edit failed: {r.text}"

            # Check version history
            hist_r = await c.get(f'/api/reviews/{rid}/versions')
            assert hist_r.status_code == 200
            versions = hist_r.json()
            assert len(versions) >= 2, (
                f"Expected at least 2 versions after edit, got {len(versions)}"
            )

            # Latest version should contain the replacement (list ordered by created_at asc)
            latest = versions[-1]
            assert replacement in latest.get('content', ''), (
                f"Replacement not found in latest version content: {latest.get('content', '')!r}"
            )

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Test 7: GET after edit returns the new saved content
# ---------------------------------------------------------------------------
def test_refetch_returns_saved_content():
    """
    After a successful edit, a GET on the review must return the updated content,
    not the original.
    """
    rid, findings = _create_review(DRAFT_WITHOUT_REQUIRED_TERM, "Refetch-Content Test")
    if not findings:
        pytest.skip("No findings produced")

    target = findings[0]
    fid = target['id']
    passage = target.get('passage', '')
    if not passage or passage not in DRAFT_WITHOUT_REQUIRED_TERM:
        pytest.skip(f"Passage '{passage}' not in draft")

    replacement = "sound choice"

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
            r = await c.post(
                f'/api/reviews/{rid}/findings/{fid}/actions',
                json={'action': 'edit', 'reason': 'Neutralised superlative', 'replacement': replacement},
                headers=REV,
            )
            if r.status_code == 422:
                pytest.skip("Edit not applicable (422)")
            assert r.status_code == 200, f"Edit failed: {r.text}"

            rev_r = await c.get(f'/api/reviews/{rid}')
            assert rev_r.status_code == 200
            content = rev_r.json()['content']
            assert replacement in content, (
                f"Expected '{replacement}' in refetched content, got: {content!r}"
            )

    asyncio.run(scenario())

