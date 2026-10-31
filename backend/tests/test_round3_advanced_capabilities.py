"""
Integration tests for Round 3 Advanced Capabilities:
- Automated Expiry Worker with multi-interval alerts (30d, 7d, 1d)
- Dependent draft re-review task generation & audit
- Governance jobs execution ledger with retry tracking
- Advanced Visual Intelligence: dHash perceptual similarity & measurable logo clearspace
"""
import io
import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from PIL import Image

import httpx
import pytest

# Ensure isolated SQLite database
fd, path = tempfile.mkstemp(suffix="_adv_test.db")
os.close(fd)
os.environ["DATABASE_URL"] = f"sqlite:///{path}"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, init_db, ident, now
from app.services.expiry_monitor import run_expiry_scan, execute_expiry_job, list_governance_jobs
from app.services.visual_intelligence import (
    compute_difference_hash,
    hamming_distance,
    perceptual_similarity_score,
    evaluate_logo_clearspace,
    compute_visual_coverage,
)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM governance_jobs")
        conn.execute("DELETE FROM governance_alerts")
        conn.execute("DELETE FROM evidence_dependencies")
        conn.execute("DELETE FROM review_comments")
        conn.execute("DELETE FROM reviews")
        conn.execute("DELETE FROM facts")
        conn.execute("DELETE FROM rules")
        conn.execute("DELETE FROM brand_assets")
    yield


@pytest.mark.asyncio
async def test_expiry_worker_multi_intervals_and_rereview_generation():
    """Verify that expiry scan checks 1d, 7d, 30d and triggers re-review for dependent drafts."""
    now_dt = datetime.now(timezone.utc)
    ts_now = now_dt.isoformat()
    ts_exp_1d = (now_dt + timedelta(hours=18)).isoformat()
    ts_exp_7d = (now_dt + timedelta(days=5)).isoformat()
    ts_expired = (now_dt - timedelta(days=2)).isoformat()

    with db() as conn:
        # 1. Fact expiring in 18 hours
        conn.execute(
            """
            INSERT INTO facts (id, workspace_id, claim, value, status, version, owner, source_title, source_excerpt, effective_at, expires_at, created_at)
            VALUES ('f_1d', 'ws_default', 'Battery duration', 'Up to 24 hours', 'APPROVED', '1.0', 'Product Legal', 'Tech Specs v2', 'Battery lasts 24h', ?, ?, ?)
            """,
            (ts_now, ts_exp_1d, ts_now)
        )
        # 2. Fact expiring in 5 days
        conn.execute(
            """
            INSERT INTO facts (id, workspace_id, claim, value, status, version, owner, source_title, source_excerpt, effective_at, expires_at, created_at)
            VALUES ('f_7d', 'ws_default', 'Customer NPS Score', '94% satisfaction', 'APPROVED', '1.0', 'Support Lead', 'CSAT Survey 2026', '94% satisfaction score', ?, ?, ?)
            """,
            (ts_now, ts_exp_7d, ts_now)
        )
        # 3. Expired fact
        conn.execute(
            """
            INSERT INTO facts (id, workspace_id, claim, value, status, version, owner, source_title, source_excerpt, effective_at, expires_at, created_at)
            VALUES ('f_exp', 'ws_default', '2024 Market Share', '1st in Europe', 'APPROVED', '1.0', 'Legal Lead', 'Analyst Report 2024', 'Number one in market share', ?, ?, ?)
            """,
            (ts_now, ts_expired, ts_now)
        )
        # 4. Dependent approved review
        conn.execute(
            """
            INSERT INTO reviews (id, workspace_id, title, content, content_type, status, score, author, assigned_to, rule_versions, created_at, updated_at)
            VALUES ('rev_dep', 'ws_default', 'Q4 Annual Report Draft', 'We lead market share in Europe.', 'marketing_copy', 'APPROVED', 100, 'creator', 'reviewer.alice', '{}', ?, ?)
            """,
            (ts_now, ts_now)
        )
        # Link dependency
        conn.execute(
            """
            INSERT INTO evidence_dependencies (id, workspace_id, review_id, source_type, source_id, created_at)
            VALUES ('dep_1', 'ws_default', 'rev_dep', 'fact', 'f_exp', ?)
            """,
            (ts_now,)
        )

    # Execute expiry job
    job_result = execute_expiry_job(workspace_id="ws_default")
    assert job_result["job_status"] == "SUCCESS"
    assert job_result["scanned_items"] >= 3
    assert job_result["new_alerts_created"] >= 3  # Expired, 1d, 7d
    assert job_result["re_reviews_generated"] >= 1

    # Verify dependent review was transitioned to CHANGES_REQUESTED with priority URGENT
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/reviews/rev_dep")
        assert res.status_code == 200
        rev = res.json()
        assert rev["status"] == "CHANGES_REQUESTED"
        assert rev["priority"] == "URGENT"

        # Verify review discussion thread received automated notification
        comments_res = await client.get("/api/reviews/rev_dep/comments")
        assert comments_res.status_code == 200
        comments = comments_res.json()
        assert any("Automated Governance Alert" in c["comment"] for c in comments)

        # Verify governance job history API
        jobs_res = await client.get("/api/governance/expiry-jobs")
        assert jobs_res.status_code == 200
        jobs = jobs_res.json()
        assert len(jobs) >= 1
        assert jobs[0]["status"] == "SUCCESS"
        assert jobs[0]["re_reviews_generated"] >= 1


@pytest.mark.asyncio
async def test_visual_intelligence_perceptual_similarity_and_clearspace():
    """Verify difference hashing, perceptual similarity scoring, and logo clearspace calculation."""
    # Create two solid images: one red, one slightly shifted red
    img_red1 = Image.new("RGB", (100, 100), (220, 20, 20))
    img_red2 = Image.new("RGB", (100, 100), (225, 25, 25))
    img_blue = Image.new("RGB", (100, 100), (20, 20, 220))

    hash_r1 = compute_difference_hash(img_red1)
    hash_r2 = compute_difference_hash(img_red2)
    hash_b = compute_difference_hash(img_blue)

    assert len(hash_r1) == 16
    assert len(hash_r2) == 16

    # Identical/near-identical solid fills have identical or near-identical gradients
    sim_red = perceptual_similarity_score(hash_r1, hash_r2)
    assert sim_red >= 90.0

    # Test clearspace evaluation
    # Case A: Ample margin (bbox [20, 20, 60, 60] on 100x100 canvas -> margin 20px >= 0.25 * 60 = 15px)
    res_ample = evaluate_logo_clearspace(img_red1, bbox=[20, 20, 60, 60], min_margin_factor=0.25)
    assert res_ample["meets_clearspace"] is True
    assert res_ample["measured_margin_px"] == 20

    # Case B: Infringing margin (bbox [2, 2, 80, 80] on 100x100 canvas -> margin 2px < 0.25 * 80 = 20px)
    res_infringe = evaluate_logo_clearspace(img_red1, bbox=[2, 2, 80, 80], min_margin_factor=0.25)
    assert res_infringe["meets_clearspace"] is False
    assert res_infringe["measured_margin_px"] == 2

    # Test visual coverage computation
    findings = [
        {"category": "visual_palette", "type": "color_match"},
        {"category": "visual_accessibility", "type": "contrast_checked"},
        {"category": "visual_asset", "type": "registered_asset_approved"},
        {"category": "visual_logo", "type": "logo_clearspace"},
    ]
    cov = compute_visual_coverage(findings, 100, 100, has_logo_detected=True)
    assert cov["coverage_percentage"] == 100.0
    assert cov["overall_confidence_pct"] >= 95.0


@pytest.mark.asyncio
async def test_asset_similarity_endpoint():
    """Verify endpoint /api/brand-assets/{id}/similarity compares perceptual hashes."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Register two brand assets with known perceptual hashes
        with db() as conn:
            conn.execute(
                """
                INSERT INTO brand_assets (id, workspace_id, name, asset_type, content_hash, perceptual_hash, source, approval_status, created_at, updated_at)
                VALUES ('ast_1', 'ws_default', 'Primary Logo v1', 'logo', 'hash_aaa', '0000000000000000', 'Figma', 'APPROVED', ?, ?)
                """,
                (now(), now())
            )
            conn.execute(
                """
                INSERT INTO brand_assets (id, workspace_id, name, asset_type, content_hash, perceptual_hash, source, approval_status, created_at, updated_at)
                VALUES ('ast_2', 'ws_default', 'Primary Logo v2 (Derivative)', 'logo', 'hash_bbb', '0000000000000001', 'Figma', 'APPROVED', ?, ?)
                """,
                (now(), now())
            )

        res = await client.get("/api/brand-assets/ast_1/similarity?target_asset_id=ast_2")
        assert res.status_code == 200
        data = res.json()
        assert data["asset_1"] == "Primary Logo v1"
        assert data["asset_2"] == "Primary Logo v2 (Derivative)"
        assert data["similarity_score"] > 95.0
        assert data["is_perceptually_equivalent"] is True
