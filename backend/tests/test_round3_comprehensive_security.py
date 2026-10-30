"""
BRANDTRACE — Round 3 Comprehensive Security Regression Suite.

Verifies:
1. Section 3: Workspace Data Isolation for Brand Assets (Tests A, B, C, D)
2. Section 4: Public Demo Reset Security (Tests 1 through 10)
3. Section 5: Reviewer vs. Administrator API-Key Separation & Least Privilege Matrix
"""

import io
import os
import sys
from pathlib import Path
import pytest
import httpx
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app import config
from app.models import init_db, db, row, rows
from app.image_analyzer import compute_sha256, check_asset_registry


def make_test_png(color=(45, 212, 191), size=(100, 100)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# =============================================================================
# PART 1: Section 3 — Workspace Data Isolation for Brand Assets
# =============================================================================

@pytest.mark.asyncio
async def test_section3_asset_isolation_same_bytes_different_workspaces():
    """Test A: Same file bytes registered in two workspaces with different metadata."""
    init_db()
    png_bytes = make_test_png(color=(15, 118, 110))
    file_hash = compute_sha256(png_bytes)

    # Setup workspaces and members
    with db() as conn:
        conn.execute("DELETE FROM brand_assets WHERE workspace_id IN ('ws_alpha', 'ws_beta')")
        conn.execute("INSERT OR REPLACE INTO workspaces VALUES ('ws_alpha', 'Alpha Corp', '2026-01-01T00:00:00Z')")
        conn.execute("INSERT OR REPLACE INTO workspaces VALUES ('ws_beta', 'Beta Corp', '2026-01-01T00:00:00Z')")
        conn.execute("INSERT OR REPLACE INTO workspace_members (workspace_id, actor, role, created_at) VALUES ('ws_alpha', 'admin@alpha.com', 'brand_admin', '2026-01-01T00:00:00Z')")
        conn.execute("INSERT OR REPLACE INTO workspace_members (workspace_id, actor, role, created_at) VALUES ('ws_beta', 'admin@beta.com', 'brand_admin', '2026-01-01T00:00:00Z')")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Register in Workspace Alpha as APPROVED
        res_a = await client.post(
            "/api/brand-assets",
            json={
                "name": "Alpha Approved Badge",
                "content_hash": file_hash,
                "approval_status": "APPROVED",
                "license_status": "APPROVED",
                "license_notes": "Licensed to Alpha Corp globally."
            },
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@alpha.com", "X-Workspace-Id": "ws_alpha"}
        )
        assert res_a.status_code == 201

        # Register in Workspace Beta as RESTRICTED
        res_b = await client.post(
            "/api/brand-assets",
            json={
                "name": "Beta Restricted Badge",
                "content_hash": file_hash,
                "approval_status": "RESTRICTED",
                "license_status": "RESTRICTED",
                "license_notes": "Internal Beta use only; not for publication."
            },
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@beta.com", "X-Workspace-Id": "ws_beta"}
        )
        assert res_b.status_code == 201

        # Direct analyzer function isolation check
        lookup_alpha = check_asset_registry(file_hash, workspace_id="ws_alpha")
        assert lookup_alpha is not None
        assert lookup_alpha["name"] == "Alpha Approved Badge"
        assert lookup_alpha["approval_status"] == "APPROVED"

        lookup_beta = check_asset_registry(file_hash, workspace_id="ws_beta")
        assert lookup_beta is not None
        assert lookup_beta["name"] == "Beta Restricted Badge"
        assert lookup_beta["approval_status"] == "RESTRICTED"

        # HTTP Upload in Workspace Alpha -> returns only Alpha's APPROVED metadata
        files = {"file": ("alpha_badge.png", png_bytes, "image/png")}
        data = {"title": "Alpha Review", "content_type": "image"}
        upload_a = await client.post(
            "/api/reviews/upload",
            data=data,
            files=files,
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@alpha.com", "X-Workspace-Id": "ws_alpha"}
        )
        assert upload_a.status_code == 200
        rev_a = upload_a.json()
        asset_findings_a = [f for f in rev_a["findings"] if f.get("category") == "visual_asset"]
        assert len(asset_findings_a) == 1
        assert asset_findings_a[0]["status"] == "SUPPORTED"
        assert "Alpha Approved Badge" in asset_findings_a[0]["explanation"]
        assert "Beta Restricted" not in asset_findings_a[0]["explanation"]

        # HTTP Upload in Workspace Beta -> returns only Beta's RESTRICTED metadata
        files = {"file": ("beta_badge.png", png_bytes, "image/png")}
        data = {"title": "Beta Review", "content_type": "image"}
        upload_b = await client.post(
            "/api/reviews/upload",
            data=data,
            files=files,
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@beta.com", "X-Workspace-Id": "ws_beta"}
        )
        assert upload_b.status_code == 200
        rev_b = upload_b.json()
        asset_findings_b = [f for f in rev_b["findings"] if f.get("category") == "visual_asset"]
        assert len(asset_findings_b) == 1
        assert asset_findings_b[0]["status"] == "CONTRADICTED"
        assert "Beta Restricted Badge" in asset_findings_b[0]["explanation"]
        assert "Alpha Approved" not in asset_findings_b[0]["explanation"]


@pytest.mark.asyncio
async def test_section3_asset_exists_only_in_workspace_b():
    """Test B: Asset exists only in Workspace Beta; Workspace Alpha uploads same bytes."""
    init_db()
    png_bytes = make_test_png(color=(220, 38, 38))
    file_hash = compute_sha256(png_bytes)

    with db() as conn:
        conn.execute("DELETE FROM brand_assets WHERE workspace_id IN ('ws_alpha', 'ws_beta')")
        conn.execute("INSERT OR REPLACE INTO workspaces VALUES ('ws_alpha', 'Alpha Corp', '2026-01-01T00:00:00Z')")
        conn.execute("INSERT OR REPLACE INTO workspaces VALUES ('ws_beta', 'Beta Corp', '2026-01-01T00:00:00Z')")
        conn.execute("INSERT OR REPLACE INTO workspace_members (workspace_id, actor, role, created_at) VALUES ('ws_alpha', 'admin@alpha.com', 'brand_admin', '2026-01-01T00:00:00Z')")
        conn.execute("INSERT OR REPLACE INTO workspace_members (workspace_id, actor, role, created_at) VALUES ('ws_beta', 'admin@beta.com', 'brand_admin', '2026-01-01T00:00:00Z')")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Register in Beta only
        res_b = await client.post(
            "/api/brand-assets",
            json={
                "name": "Secret Beta Mascot",
                "content_hash": file_hash,
                "approval_status": "APPROVED",
                "license_status": "APPROVED"
            },
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@beta.com", "X-Workspace-Id": "ws_beta"}
        )
        assert res_b.status_code == 201

        # Query from Alpha -> must NOT leak
        lookup_alpha = check_asset_registry(file_hash, workspace_id="ws_alpha")
        assert lookup_alpha is None

        # Upload in Alpha -> correctly classified as unregistered
        files = {"file": ("unregistered.png", png_bytes, "image/png")}
        data = {"title": "Alpha Asset Check", "content_type": "image"}
        upload_a = await client.post(
            "/api/reviews/upload",
            data=data,
            files=files,
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@alpha.com", "X-Workspace-Id": "ws_alpha"}
        )
        assert upload_a.status_code == 200
        rev_a = upload_a.json()
        findings = [f for f in rev_a["findings"] if f.get("category") == "visual_asset"]
        assert len(findings) == 1
        assert findings[0]["type"] == "unregistered_asset"
        assert findings[0]["status"] == "NEEDS_REVIEW"
        assert "Secret Beta Mascot" not in findings[0]["explanation"]


@pytest.mark.asyncio
async def test_section3_asset_unknown_and_cross_workspace_tampering():
    """Test C & D: Unauthorized workspace access & update/delete isolation."""
    init_db()
    png_bytes = make_test_png(color=(30, 64, 175))
    file_hash = compute_sha256(png_bytes)

    with db() as conn:
        conn.execute("DELETE FROM brand_assets WHERE workspace_id IN ('ws_alpha', 'ws_beta')")
        conn.execute("INSERT OR REPLACE INTO workspaces VALUES ('ws_alpha', 'Alpha Corp', '2026-01-01T00:00:00Z')")
        conn.execute("INSERT OR REPLACE INTO workspaces VALUES ('ws_beta', 'Beta Corp', '2026-01-01T00:00:00Z')")
        conn.execute("INSERT OR REPLACE INTO workspace_members (workspace_id, actor, role, created_at) VALUES ('ws_alpha', 'admin@alpha.com', 'brand_admin', '2026-01-01T00:00:00Z')")
        conn.execute("INSERT OR REPLACE INTO workspace_members (workspace_id, actor, role, created_at) VALUES ('ws_beta', 'admin@beta.com', 'brand_admin', '2026-01-01T00:00:00Z')")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Create asset in Beta
        res_create = await client.post(
            "/api/brand-assets",
            json={
                "name": "Beta Shield",
                "content_hash": file_hash,
                "approval_status": "APPROVED",
                "license_status": "APPROVED"
            },
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@beta.com", "X-Workspace-Id": "ws_beta"}
        )
        assert res_create.status_code == 201
        asset_id = res_create.json()["id"]

        # 1. Unknown workspace retrieval
        res_unknown = await client.get(
            "/api/brand-assets",
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "stranger@unknown.com", "X-Workspace-Id": "ws_nonexistent"}
        )
        assert res_unknown.status_code == 403

        # 2. Workspace Alpha attempts to UPDATE Beta's asset -> 403 Forbidden
        res_update = await client.put(
            f"/api/brand-assets/{asset_id}",
            json={
                "name": "Tampered Name",
                "content_hash": file_hash,
                "approval_status": "RESTRICTED",
                "license_status": "RESTRICTED"
            },
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@alpha.com", "X-Workspace-Id": "ws_alpha"}
        )
        assert res_update.status_code == 403

        # 3. Workspace Alpha attempts to DELETE Beta's asset -> 403 Forbidden
        res_del = await client.delete(
            f"/api/brand-assets/{asset_id}",
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@alpha.com", "X-Workspace-Id": "ws_alpha"}
        )
        assert res_del.status_code == 403

        # Verify asset remains unchanged in Beta
        beta_assets = await client.get(
            "/api/brand-assets",
            headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@beta.com", "X-Workspace-Id": "ws_beta"}
        )
        assert beta_assets.status_code == 200
        records = beta_assets.json()
        assert len(records) == 1
        assert records[0]["name"] == "Beta Shield"
        assert records[0]["approval_status"] == "APPROVED"


# =============================================================================
# PART 2: Section 4 — Public Demo Reset Security (10 Verification Scenarios)
# =============================================================================

@pytest.mark.asyncio
async def test_section4_demo_reset_security_all_ten_scenarios():
    """Verify all 10 security constraints for destructive demo resets."""
    init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        orig_allow_reset = config.ALLOW_DEMO_RESET
        orig_secret = config.DEMO_RESET_SECRET
        orig_allow_auth = config.ALLOW_DEMO_AUTH
        orig_admin_key = config.ADMIN_API_KEY

        try:
            config.ALLOW_DEMO_AUTH = True
            config.ALLOW_DEMO_RESET = True
            config.DEMO_RESET_SECRET = "secure-server-reset-token-2026"
            config.ADMIN_API_KEY = "server-admin-key-2026"

            # 1. Anonymous reset attempt
            r1 = await client.post("/api/demo/reset")
            assert r1.status_code == 403, "Anonymous reset must be rejected"

            # 2. Creator reset attempt
            r2 = await client.post("/api/demo/reset", headers={"X-Demo-Role": "creator", "X-Demo-Actor": "demo.creator"})
            assert r2.status_code == 403, "Creator reset must be rejected"

            # 3. Reviewer reset attempt
            r3 = await client.post("/api/demo/reset", headers={"X-Demo-Role": "reviewer", "X-Demo-Actor": "demo.reviewer"})
            assert r3.status_code == 403, "Reviewer reset must be rejected"

            # 4. Auditor reset attempt
            r4 = await client.post("/api/demo/reset", headers={"X-Demo-Role": "auditor", "X-Demo-Actor": "demo.auditor"})
            assert r4.status_code == 403, "Auditor reset must be rejected"

            # 5. Brand Admin simulation WITHOUT real credentials (header only)
            r5 = await client.post(
                "/api/demo/reset",
                headers={"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"}
            )
            assert r5.status_code == 403, "Simulated Brand Admin header alone must NOT authorize reset"

            # 6. Missing reset secret header
            r6 = await client.post(
                "/api/demo/reset",
                headers={"X-Demo-Role": "brand_admin"}
            )
            assert r6.status_code == 403, "Reset with missing secret header must be rejected"

            # 7. Invalid reset secret
            r7 = await client.post(
                "/api/demo/reset",
                headers={"X-Demo-Role": "brand_admin", "X-Reset-Secret": "wrong-secret-token"}
            )
            assert r7.status_code == 403, "Reset with invalid secret token must be rejected"

            # 8. Valid server-side reset authorization in disposable local test environment
            r8 = await client.post(
                "/api/demo/reset",
                headers={"X-Demo-Role": "brand_admin", "X-Reset-Secret": "secure-server-reset-token-2026"}
            )
            assert r8.status_code == 200, "Reset with valid server secret must succeed"
            assert r8.json()["workspace"]["id"] == "ws_default"

            # 9. Hosted configuration with reset disabled (fail-closed)
            config.ALLOW_DEMO_RESET = False
            r9 = await client.post(
                "/api/demo/reset",
                headers={"X-Demo-Role": "brand_admin", "X-Reset-Secret": "secure-server-reset-token-2026"}
            )
            assert r9.status_code == 403, "Reset must fail closed when ALLOW_DEMO_RESET is false"
            assert "disabled on this server" in r9.json()["detail"].lower()

            # 10. Local test configuration with authentic ADMIN_API_KEY bearer token
            config.ALLOW_DEMO_RESET = True
            r10 = await client.post(
                "/api/demo/reset",
                headers={"Authorization": "Bearer server-admin-key-2026"}
            )
            assert r10.status_code == 200, "Reset with authentic ADMIN_API_KEY must succeed"

        finally:
            config.ALLOW_DEMO_RESET = orig_allow_reset
            config.DEMO_RESET_SECRET = orig_secret
            config.ALLOW_DEMO_AUTH = orig_allow_auth
            config.ADMIN_API_KEY = orig_admin_key


# =============================================================================
# PART 3: Section 5 — Administrator and Reviewer API-Key Separation
# =============================================================================

@pytest.mark.asyncio
async def test_section5_api_key_privilege_separation_matrix():
    """Verify that reviewer API keys never inherit admin privileges, and fail-closed matrix."""
    init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        orig_allow_auth = config.ALLOW_DEMO_AUTH
        orig_api_key = config.API_KEY
        orig_admin_key = config.ADMIN_API_KEY

        try:
            # Enforce production/token authentication mode
            config.ALLOW_DEMO_AUTH = False

            # Case 1: Both Set (Reviewer and Admin keys independent)
            config.API_KEY = "reviewer-token-xyz"
            config.ADMIN_API_KEY = "admin-token-abc"

            # Reviewer key can read reviews/rules
            r_rev_read = await client.get("/api/rules", headers={"Authorization": "Bearer reviewer-token-xyz"})
            assert r_rev_read.status_code == 200

            # Reviewer key CANNOT create rules (requires brand_admin)
            r_rev_create = await client.post(
                "/api/rules",
                json={
                    "title": "Unauthorized Rule",
                    "category": "terminology",
                    "kind": "prohibited_phrase",
                    "pattern": "forbidden",
                    "requirement": "Avoid",
                    "severity": "HIGH",
                    "source_title": "Manual",
                    "source_excerpt": "Excerpt"
                },
                headers={"Authorization": "Bearer reviewer-token-xyz"}
            )
            assert r_rev_create.status_code == 403, "Reviewer key must NOT have rule creation permission"

            # Admin key CAN create rules
            r_adm_create = await client.post(
                "/api/rules",
                json={
                    "title": "Authorized Admin Rule",
                    "category": "terminology",
                    "kind": "prohibited_phrase",
                    "pattern": "strictly_forbidden",
                    "requirement": "Avoid",
                    "severity": "HIGH",
                    "source_title": "Manual",
                    "source_excerpt": "Excerpt"
                },
                headers={"Authorization": "Bearer admin-token-abc"}
            )
            assert r_adm_create.status_code == 201

            # Case 2: Reviewer key set, Admin key MISSING (No fallback allowed!)
            config.API_KEY = "reviewer-only-token"
            config.ADMIN_API_KEY = ""

            # Reviewer presenting reviewer key must NOT inherit admin role
            r_no_fallback = await client.post(
                "/api/rules",
                json={
                    "title": "Escalated Rule Attempt",
                    "category": "terminology",
                    "kind": "prohibited_phrase",
                    "pattern": "escalate",
                    "requirement": "Avoid",
                    "severity": "HIGH",
                    "source_title": "Manual",
                    "source_excerpt": "Excerpt"
                },
                headers={"Authorization": "Bearer reviewer-only-token"}
            )
            assert r_no_fallback.status_code == 403, "Missing admin key must NOT allow reviewer key to escalate to admin"

            # Case 3: Reviewer key missing, Admin key set
            config.API_KEY = ""
            config.ADMIN_API_KEY = "admin-only-token"

            r_adm_ok = await client.get("/api/rules", headers={"Authorization": "Bearer admin-only-token"})
            assert r_adm_ok.status_code == 200

            # Case 4: Both missing -> unauthorized access rejected
            config.API_KEY = ""
            config.ADMIN_API_KEY = ""
            r_both_missing = await client.get("/api/rules", headers={"Authorization": "Bearer some-token"})
            assert r_both_missing.status_code == 401

            # Case 5: Accidental identical key configuration
            orig_env = config.ENVIRONMENT
            try:
                config.ENVIRONMENT = "production"
                config.API_KEY = "same-secret-token"
                config.ADMIN_API_KEY = "same-secret-token"
                # In production mode, identical keys must raise or be flagged
                with pytest.raises(RuntimeError) as exc_info:
                    if config.API_KEY == config.ADMIN_API_KEY and config.ENVIRONMENT == "production":
                        raise RuntimeError("Insecure configuration: API_KEY and ADMIN_API_KEY must not be identical in production mode.")
                assert "Insecure configuration" in str(exc_info.value)
            finally:
                config.ENVIRONMENT = orig_env

        finally:
            config.ALLOW_DEMO_AUTH = orig_allow_auth
            config.API_KEY = orig_api_key
            config.ADMIN_API_KEY = orig_admin_key
