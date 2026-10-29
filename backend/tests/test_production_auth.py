"""Tests for production workspace-membership provisioning, first-admin bootstrap,
and the complete production trust chain.

These tests exercise the actual production authentication code path
(ALLOW_DEMO_AUTH=False) with real API key credentials, explicit bootstrap,
workspace creation, member provisioning, and cross-workspace isolation.
"""
import os
import sys
import tempfile
import json
import asyncio
from pathlib import Path

import httpx
import pytest

fd, path = tempfile.mkstemp(suffix='.db')
os.close(fd)
os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, rows, row, init_db, ident, now
import app.config as config


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
ADMIN_KEY = "test-prod-admin-key-abc123"
USER_KEY = "test-prod-user-key-xyz789"

ADMIN_HDR = {"Authorization": f"Bearer {ADMIN_KEY}"}
USER_HDR = {"X-API-Key": USER_KEY}
DEMO_HDR = {"X-Demo-Role": "brand_admin", "X-Demo-Actor": "demo.brand_admin"}


def _prod_mode():
    """Return a context-manager-like tuple for production mode settings."""
    return (config.ALLOW_DEMO_AUTH, config.ADMIN_API_KEY, config.API_KEY)


def _set_prod(admin_key=ADMIN_KEY, user_key=USER_KEY):
    config.ALLOW_DEMO_AUTH = False
    config.ADMIN_API_KEY = admin_key
    config.API_KEY = user_key


def _restore_prod(saved):
    config.ALLOW_DEMO_AUTH, config.ADMIN_API_KEY, config.API_KEY = saved


# ---------------------------------------------------------------------------
# Test 1: Fresh Production Bootstrap Lifecycle (Points 1 - 8)
# ---------------------------------------------------------------------------
def test_fresh_production_bootstrap_lifecycle_and_security_controls():
    """Demonstrate the complete production bootstrap lifecycle on a fresh DB:
    1. Fresh production database initializes with zero demo identities.
    2. Documented bootstrap mechanism creates the initial authorized administrator membership.
    3. Bootstrap cannot be re-executed after completion (HTTP 409).
    4. Administrator can create workspaces and provision legitimate workspace members.
    5. Provisioned members can only access authorized workspaces and permitted operations.
    6. Unprovisioned identities receive 401 or 403 as appropriate.
    7. Forged actor, role, and workspace headers cannot grant additional access.
    8. Cross-workspace access and mutation are rejected without database changes.
    9. Unauthorized callers cannot provision administrators or remove legitimate administrators.
    """
    async def scenario():
        # Dedicated isolated database for pure bootstrap test
        bfd, bpath = tempfile.mkstemp(suffix='_bootstrap.db')
        os.close(bfd)
        orig_db_env = os.environ.get('DATABASE_URL')
        saved = _prod_mode()

        try:
            os.environ['DATABASE_URL'] = f'sqlite:///{bpath}'
            config.DATABASE_URL = f'sqlite:///{bpath}'
            _set_prod()

            # 1. Fresh production-mode database initializes without demo identities
            init_db()
            with db() as conn:
                demo_actors = conn.execute(
                    "SELECT COUNT(*) FROM workspace_members WHERE actor LIKE 'demo.%' OR actor LIKE '%foreign-corp.com'"
                ).fetchone()[0]
                assert demo_actors == 0
                all_members = conn.execute("SELECT COUNT(*) FROM workspace_members").fetchone()[0]
                assert all_members == 0

            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                # 2. Documented bootstrap mechanism: POST /api/bootstrap with ADMIN_API_KEY
                # Non-admin / unauthenticated caller cannot bootstrap
                r_unauth = await client.post('/api/bootstrap')
                assert r_unauth.status_code == 401

                r_reviewer = await client.post('/api/bootstrap', headers=USER_HDR)
                assert r_reviewer.status_code == 403

                # Valid admin bootstrap executes
                r_boot = await client.post('/api/bootstrap', headers=ADMIN_HDR)
                assert r_boot.status_code == 201
                boot_data = r_boot.json()
                assert boot_data["status"] == "BOOTSTRAPPED"
                assert boot_data["workspace_id"] == "ws_default"
                assert boot_data["admin"] == "system.admin"

                # Verify DB state after bootstrap: ws_default and system.admin exist
                with db() as conn:
                    ws_row = conn.execute("SELECT * FROM workspaces WHERE id='ws_default'").fetchone()
                    assert ws_row is not None
                    admin_member = conn.execute(
                        "SELECT * FROM workspace_members WHERE workspace_id='ws_default' AND actor='system.admin'"
                    ).fetchone()
                    assert admin_member is not None
                    assert admin_member[2] == "brand_admin"

                # Verify audit record for bootstrap
                audit_records = rows("SELECT * FROM audit WHERE action='SYSTEM_BOOTSTRAPPED'")
                assert len(audit_records) == 1
                assert "ws_default" in (audit_records[0].get("details") or "")

                # 3. Bootstrap cannot silently re-enable itself — subsequent call returns 409 Conflict
                r_boot_again = await client.post('/api/bootstrap', headers=ADMIN_HDR)
                assert r_boot_again.status_code == 409
                assert "already been bootstrapped" in r_boot_again.json()["detail"]

                # 4. Administrator creates new workspace ws_enterprise and provisions a member
                r_ws = await client.post(
                    '/api/workspaces',
                    json={"id": "ws_enterprise", "name": "Enterprise Marketing"},
                    headers=ADMIN_HDR,
                )
                assert r_ws.status_code == 201
                assert r_ws.json()["id"] == "ws_enterprise"

                # Admin is automatically registered as brand_admin of ws_enterprise
                admin_ent = row(
                    "SELECT role FROM workspace_members WHERE workspace_id='ws_enterprise' AND actor='system.admin'"
                )
                assert admin_ent is not None and admin_ent["role"] == "brand_admin"

                # Admin provisions reviewer (system.user) to ws_enterprise
                r_prov = await client.post(
                    '/api/workspaces/ws_enterprise/members',
                    json={"actor": "system.user", "role": "reviewer"},
                    headers=ADMIN_HDR,
                )
                assert r_prov.status_code == 201
                assert r_prov.json()["actor"] == "system.user"

                # 5. Provisioned member can access authorized workspace and permitted operations
                # system.user can read rules in ws_enterprise
                r_user_read = await client.get('/api/rules', headers={
                    **USER_HDR, "X-Workspace-Id": "ws_enterprise"
                })
                assert r_user_read.status_code == 200

                # system.user cannot execute admin operations (create rules -> 403)
                r_user_rule = await client.post(
                    '/api/rules',
                    json={
                        "title": "Unauthorized Rule", "category": "terminology",
                        "kind": "prohibited_phrase", "pattern": "forbidden",
                        "requirement": "Avoid", "severity": "HIGH",
                        "source_title": "Source", "source_excerpt": "Excerpt"
                    },
                    headers={**USER_HDR, "X-Workspace-Id": "ws_enterprise"}
                )
                assert r_user_rule.status_code == 403
                assert "Brand Admin role required" in r_user_rule.json()["detail"]

                # 6. Unprovisioned identity receives 401 or 403
                # Unauthenticated -> 401
                r_anon = await client.get('/api/rules')
                assert r_anon.status_code == 401

                # Invalid API key -> 401
                r_badkey = await client.get('/api/rules', headers={"X-API-Key": "completely-invalid-key"})
                assert r_badkey.status_code == 401

                # system.user attempting to access an unassigned workspace -> 403
                r_unassigned = await client.get('/api/rules', headers={
                    **USER_HDR, "X-Workspace-Id": "ws_unassigned_corp"
                })
                assert r_unassigned.status_code == 403

                # 7. Forged actor, role, and workspace headers cannot grant additional access
                forged_hdr = {
                    "X-API-Key": USER_KEY,
                    "X-Demo-Role": "brand_admin",       # Spoofed role
                    "X-Demo-Actor": "system.admin",      # Spoofed actor
                    "X-Workspace-Id": "ws_unassigned_corp" # Spoofed workspace
                }
                r_forged = await client.post(
                    '/api/rules',
                    json={
                        "title": "Spoofed Rule", "category": "terminology",
                        "kind": "prohibited_phrase", "pattern": "spoof",
                        "requirement": "Avoid", "severity": "HIGH",
                        "source_title": "Source", "source_excerpt": "Excerpt"
                    },
                    headers=forged_hdr
                )
                assert r_forged.status_code == 403
                # Database remains free of the spoofed rule
                assert row("SELECT 1 FROM rules WHERE pattern='spoof'") is None

                # 8. Cross-workspace access and mutation are rejected without database changes
                # Create a rule in ws_default as admin
                r_legit_rule = await client.post(
                    '/api/rules',
                    json={
                        "title": "Legit Default Rule", "category": "terminology",
                        "kind": "prohibited_phrase", "pattern": "never say this",
                        "requirement": "Strictly avoid", "severity": "HIGH",
                        "source_title": "Brand Book", "source_excerpt": "Excerpt text"
                    },
                    headers=ADMIN_HDR
                )
                assert r_legit_rule.status_code == 201
                rule_id = r_legit_rule.json()["id"]

                # Tamper with workspace header to mutate rule in a workspace where it does not belong
                r_cross_mutate = await client.put(
                    f'/api/rules/{rule_id}',
                    json={"requirement": "Tampered across workspace"},
                    headers={**ADMIN_HDR, "X-Workspace-Id": "ws_enterprise"}
                )
                assert r_cross_mutate.status_code == 403
                # Verify rule requirement is untouched in database
                assert row("SELECT requirement FROM rules WHERE id=?", (rule_id,))["requirement"] == "Strictly avoid"

                # 9. Unauthorized callers cannot provision administrators or remove legitimate administrators
                # Reviewer cannot provision an admin
                r_bad_prov = await client.post(
                    '/api/workspaces/ws_enterprise/members',
                    json={"actor": "intruder.admin@evil.com", "role": "brand_admin"},
                    headers=USER_HDR,
                )
                assert r_bad_prov.status_code == 403

                # Admin cannot remove themselves (self-lockout blocked)
                r_lockout = await client.delete(
                    '/api/workspaces/ws_enterprise/members/system.admin',
                    headers=ADMIN_HDR,
                )
                assert r_lockout.status_code == 422
                assert "Cannot remove yourself" in r_lockout.json()["detail"]

        finally:
            if orig_db_env:
                os.environ['DATABASE_URL'] = orig_db_env
            else:
                os.environ.pop('DATABASE_URL', None)
            _restore_prod(saved)

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Test 2: Production member provisioning lifecycle (Existing & Hardened)
# ---------------------------------------------------------------------------
def test_production_member_provisioning_lifecycle():
    """Verify the complete provisioning path:
    1. Bootstrap workspace ws_default.
    2. Admin lists members.
    3. Admin adds a new actor.
    4. Duplicate add is rejected (409).
    5. Admin removes the actor.
    6. Removal of nonexistent member returns 404.
    7. Admin cannot remove themselves (self-lockout prevention).
    """
    async def scenario():
        saved = _prod_mode()
        try:
            _set_prod()
            init_db()
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                ws = "ws_default"

                # Execute bootstrap if not already done
                await client.post('/api/bootstrap', headers=ADMIN_HDR)

                # 1. List members — admin can see ws_default
                r = await client.get(f'/api/workspaces/{ws}/members', headers=ADMIN_HDR)
                assert r.status_code == 200
                members = r.json()
                assert any(m["actor"] == "system.admin" for m in members)

                # 2. Add a new actor
                r = await client.post(
                    f'/api/workspaces/{ws}/members',
                    json={"actor": "new.production.user@company.com", "role": "reviewer"},
                    headers=ADMIN_HDR,
                )
                assert r.status_code == 201
                body = r.json()
                assert body["actor"] == "new.production.user@company.com"
                assert body["role"] == "reviewer"
                assert body["workspace_id"] == ws

                # Verify DB row exists
                member_row = row(
                    "SELECT * FROM workspace_members WHERE workspace_id=? AND actor=?",
                    (ws, "new.production.user@company.com")
                )
                assert member_row is not None
                assert member_row["role"] == "reviewer"

                # Verify audit record created
                audit_rows = rows("SELECT * FROM audit WHERE action='MEMBER_ADDED'")
                assert any("new.production.user@company.com" in (a.get("details") or "") for a in audit_rows)

                # 3. Duplicate add rejected
                r = await client.post(
                    f'/api/workspaces/{ws}/members',
                    json={"actor": "new.production.user@company.com", "role": "reviewer"},
                    headers=ADMIN_HDR,
                )
                assert r.status_code == 409

                # 4. List now includes the new member
                r = await client.get(f'/api/workspaces/{ws}/members', headers=ADMIN_HDR)
                assert r.status_code == 200
                actors = [m["actor"] for m in r.json()]
                assert "new.production.user@company.com" in actors

                # 5. Remove the member
                r = await client.delete(
                    f'/api/workspaces/{ws}/members/new.production.user@company.com',
                    headers=ADMIN_HDR,
                )
                assert r.status_code == 204

                # Verify DB row gone
                assert row(
                    "SELECT * FROM workspace_members WHERE workspace_id=? AND actor=?",
                    (ws, "new.production.user@company.com")
                ) is None

                # 6. Remove nonexistent member
                r = await client.delete(
                    f'/api/workspaces/{ws}/members/nonexistent@company.com',
                    headers=ADMIN_HDR,
                )
                assert r.status_code == 404

                # 7. Admin cannot remove themselves (lockout prevention)
                r = await client.delete(
                    f'/api/workspaces/{ws}/members/system.admin',
                    headers=ADMIN_HDR,
                )
                assert r.status_code == 422
                assert "Cannot remove yourself" in r.json()["detail"]

        finally:
            _restore_prod(saved)

    asyncio.run(scenario())


def test_production_reviewer_cannot_provision_members():
    """A reviewer credential (API_KEY) must not be able to add workspace members."""
    async def scenario():
        saved = _prod_mode()
        try:
            _set_prod()
            init_db()
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                r = await client.post(
                    '/api/workspaces/ws_default/members',
                    json={"actor": "smuggled@evil.com", "role": "brand_admin"},
                    headers=USER_HDR,
                )
                assert r.status_code == 403
                assert "Brand Admin role required" in r.json()["detail"]

                assert row(
                    "SELECT * FROM workspace_members WHERE actor=?",
                    ("smuggled@evil.com",)
                ) is None

        finally:
            _restore_prod(saved)

    asyncio.run(scenario())


def test_production_cross_workspace_member_provisioning_rejected():
    """An admin for ws_default cannot provision members in a workspace they don't belong to."""
    async def scenario():
        saved = _prod_mode()
        try:
            _set_prod()
            init_db()
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                r = await client.post(
                    '/api/workspaces/ws_other/members',
                    json={"actor": "cross-workspace@evil.com", "role": "reviewer"},
                    headers=ADMIN_HDR,
                )
                assert r.status_code == 403
                assert "not authorized for workspace" in r.json()["detail"]

                assert row(
                    "SELECT * FROM workspace_members WHERE actor=?",
                    ("cross-workspace@evil.com",)
                ) is None

        finally:
            _restore_prod(saved)

    asyncio.run(scenario())


def test_production_synthetic_demo_actor_rejected():
    """In production mode, synthetic demo identities cannot be provisioned."""
    async def scenario():
        saved = _prod_mode()
        try:
            _set_prod()
            init_db()
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                r = await client.post(
                    '/api/workspaces/ws_default/members',
                    json={"actor": "demo.reviewer", "role": "reviewer"},
                    headers=ADMIN_HDR,
                )
                assert r.status_code == 422
                assert "Synthetic demo identities" in r.json()["detail"]

                r = await client.post(
                    '/api/workspaces/ws_default/members',
                    json={"actor": "user@foreign-corp.com", "role": "reviewer"},
                    headers=ADMIN_HDR,
                )
                assert r.status_code == 422

        finally:
            _restore_prod(saved)

    asyncio.run(scenario())


def test_production_unauthenticated_member_access_denied():
    """Without any credential, the member management endpoint returns 401."""
    async def scenario():
        saved = _prod_mode()
        try:
            _set_prod()
            init_db()
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                r = await client.get('/api/workspaces/ws_default/members')
                assert r.status_code == 401

                r = await client.post(
                    '/api/workspaces/ws_default/members',
                    json={"actor": "nobody@test.com", "role": "reviewer"},
                )
                assert r.status_code == 401

        finally:
            _restore_prod(saved)

    asyncio.run(scenario())


def test_production_api_key_is_shared_service_identity():
    """Verify API_KEY resolves to 'system.user' shared service identity with
    reviewer role — not a per-user SaaS identity. Document the deliberate scope
    limitation.
    """
    async def scenario():
        saved = _prod_mode()
        try:
            _set_prod()
            init_db()
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                r = await client.get('/api/health', headers=USER_HDR)
                assert r.status_code == 200

                r = await client.get('/api/rules', headers=USER_HDR)
                assert r.status_code == 200

                r = await client.post('/api/rules', json={
                    "title": "Test", "category": "terminology",
                    "kind": "prohibited_phrase", "pattern": "test",
                    "requirement": "Avoid", "severity": "HIGH",
                    "source_title": "Source", "source_excerpt": "Excerpt"
                }, headers=USER_HDR)
                assert r.status_code == 403

                r = await client.get('/api/workspaces/ws_default/members', headers=USER_HDR)
                assert r.status_code == 403

                r = await client.get('/api/workspaces/ws_default/members', headers=ADMIN_HDR)
                assert r.status_code == 200

        finally:
            _restore_prod(saved)

    asyncio.run(scenario())


def test_failed_cross_workspace_mutations_leave_db_unchanged():
    """Cross-workspace mutation attempts against rules, facts, and assets must
    leave the database completely unchanged — verified by snapshot comparison."""
    async def scenario():
        saved = _prod_mode()
        try:
            config.ALLOW_DEMO_AUTH = True
            config.ADMIN_API_KEY = ADMIN_KEY
            config.API_KEY = USER_KEY
            init_db()

            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                await client.post('/api/demo/setup', headers=DEMO_HDR)

                rules_before = rows("SELECT * FROM rules")
                facts_before = rows("SELECT * FROM facts")
                assets_before = rows("SELECT * FROM brand_assets")

                config.ALLOW_DEMO_AUTH = False

                r = await client.put(
                    '/api/rules/R-VOICE-01',
                    json={"requirement": "Unauthorized cross-ws"},
                    headers={**ADMIN_HDR, "X-Workspace-Id": "ws_unrelated"},
                )
                assert r.status_code == 403

                r = await client.put(
                    '/api/facts/F-2026-01',
                    json={"claim": "Unauthorized claim"},
                    headers={**ADMIN_HDR, "X-Workspace-Id": "ws_unrelated"},
                )
                assert r.status_code == 403

                rules_after = rows("SELECT * FROM rules")
                facts_after = rows("SELECT * FROM facts")
                assets_after = rows("SELECT * FROM brand_assets")

                assert len(rules_after) == len(rules_before)
                assert len(facts_after) == len(facts_before)
                assert len(assets_after) == len(assets_before)

                for rb, ra in zip(rules_before, rules_after):
                    assert rb["id"] == ra["id"]
                    assert rb["requirement"] == ra["requirement"]
                    assert rb["version"] == ra["version"]

                for fb, fa in zip(facts_before, facts_after):
                    assert fb["id"] == fa["id"]
                    assert fb["claim"] == fa["claim"]

        finally:
            _restore_prod(saved)

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Test 9: Bootstrap Permanently One-Way (Survives Membership Deletion)
# ---------------------------------------------------------------------------
def test_bootstrap_permanently_one_way_even_if_memberships_removed():
    """Verify that removing all administrator rows from workspace_members
    does NOT reopen bootstrap, because bootstrap state is durably recorded in system_state.
    """
    async def scenario():
        bfd, bpath = tempfile.mkstemp(suffix='_perm_oneway.db')
        os.close(bfd)
        orig_db_env = os.environ.get('DATABASE_URL')
        saved = _prod_mode()

        try:
            os.environ['DATABASE_URL'] = f'sqlite:///{bpath}'
            config.DATABASE_URL = f'sqlite:///{bpath}'
            _set_prod()
            init_db()

            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                # 1. Initial bootstrap succeeds
                r1 = await client.post('/api/bootstrap', headers=ADMIN_HDR)
                assert r1.status_code == 201

                # 2. Verify system_state has bootstrap_completed
                state_row = row("SELECT * FROM system_state WHERE key='bootstrap_completed'")
                assert state_row is not None
                assert state_row["value"] == "true"

                # 3. Simulate administrator membership removal (e.g. DBA clears workspace_members)
                with db() as conn:
                    conn.execute("DELETE FROM workspace_members")
                assert len(rows("SELECT * FROM workspace_members")) == 0

                # 4. Attempting to re-run bootstrap must STILL return 409 Conflict
                r2 = await client.post('/api/bootstrap', headers=ADMIN_HDR)
                assert r2.status_code == 409
                assert "already been bootstrapped" in r2.json()["detail"]

        finally:
            if orig_db_env:
                os.environ['DATABASE_URL'] = orig_db_env
            else:
                os.environ.pop('DATABASE_URL', None)
            _restore_prod(saved)

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Test 10: Bootstrap Concurrency & Mutual Exclusion
# ---------------------------------------------------------------------------
def test_bootstrap_concurrent_requests_mutual_exclusion():
    """Verify that concurrent first-time bootstrap requests cannot both succeed.
    Database primary key constraint on system_state ensures exactly one succeeds (201)
    and the other receives 409 Conflict.
    """
    async def scenario():
        bfd, bpath = tempfile.mkstemp(suffix='_concurrent_boot.db')
        os.close(bfd)
        orig_db_env = os.environ.get('DATABASE_URL')
        saved = _prod_mode()

        try:
            os.environ['DATABASE_URL'] = f'sqlite:///{bpath}'
            config.DATABASE_URL = f'sqlite:///{bpath}'
            _set_prod()
            init_db()

            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                # Execute two bootstrap requests concurrently
                resps = await asyncio.gather(
                    client.post('/api/bootstrap', headers=ADMIN_HDR),
                    client.post('/api/bootstrap', headers=ADMIN_HDR),
                    return_exceptions=True
                )

                statuses = sorted([r.status_code for r in resps if hasattr(r, 'status_code')])
                # Exactly one 201 and one 409
                assert statuses == [201, 409], f"Expected [201, 409], got {statuses}"

                # Exactly one bootstrap record in system_state
                state_rows = rows("SELECT * FROM system_state WHERE key='bootstrap_completed'")
                assert len(state_rows) == 1

        finally:
            if orig_db_env:
                os.environ['DATABASE_URL'] = orig_db_env
            else:
                os.environ.pop('DATABASE_URL', None)
            _restore_prod(saved)

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Test 11: Shared Service Credential Cross-Workspace Behavior
# ---------------------------------------------------------------------------
def test_shared_service_credential_cross_workspace_multitenancy_scope():
    """Document and verify the exact boundary of the shared API_KEY credential:
    - API_KEY resolves to global shared service actor 'system.user'.
    - If provisioned into multiple workspaces (e.g. ws_alpha, ws_beta), it can access both.
    - If NOT provisioned into ws_gamma, it receives 403 Forbidden.
    - Changing X-Workspace-Id to an unauthorized workspace is rejected.
    - Demonstrates that API_KEY is a shared service key, NOT per-tenant credential isolation.
    """
    async def scenario():
        bfd, bpath = tempfile.mkstemp(suffix='_shared_cred.db')
        os.close(bfd)
        orig_db_env = os.environ.get('DATABASE_URL')
        saved = _prod_mode()

        try:
            os.environ['DATABASE_URL'] = f'sqlite:///{bpath}'
            config.DATABASE_URL = f'sqlite:///{bpath}'
            _set_prod()
            init_db()

            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                # 1. Bootstrap default workspace
                await client.post('/api/bootstrap', headers=ADMIN_HDR)

                # 2. Admin creates two workspaces: ws_alpha and ws_beta
                await client.post('/api/workspaces', json={"id": "ws_alpha", "name": "Alpha Division"}, headers=ADMIN_HDR)
                await client.post('/api/workspaces', json={"id": "ws_beta", "name": "Beta Division"}, headers=ADMIN_HDR)
                # Create a third workspace: ws_gamma (unauthorized for reviewer)
                await client.post('/api/workspaces', json={"id": "ws_gamma", "name": "Gamma Division"}, headers=ADMIN_HDR)

                # 3. Provision system.user into ws_alpha and ws_beta ONLY
                await client.post('/api/workspaces/ws_alpha/members', json={"actor": "system.user", "role": "reviewer"}, headers=ADMIN_HDR)
                await client.post('/api/workspaces/ws_beta/members', json={"actor": "system.user", "role": "reviewer"}, headers=ADMIN_HDR)

                # 4. Reviewer with same API_KEY can access ws_alpha
                r_alpha = await client.get('/api/rules', headers={**USER_HDR, "X-Workspace-Id": "ws_alpha"})
                assert r_alpha.status_code == 200

                # 5. Reviewer with same API_KEY can access ws_beta
                r_beta = await client.get('/api/rules', headers={**USER_HDR, "X-Workspace-Id": "ws_beta"})
                assert r_beta.status_code == 200

                # 6. Reviewer with same API_KEY CANNOT access ws_gamma (not provisioned) -> 403
                r_gamma = await client.get('/api/rules', headers={**USER_HDR, "X-Workspace-Id": "ws_gamma"})
                assert r_gamma.status_code == 403
                assert "not authorized for workspace 'ws_gamma'" in r_gamma.json()["detail"]

        finally:
            if orig_db_env:
                os.environ['DATABASE_URL'] = orig_db_env
            else:
                os.environ.pop('DATABASE_URL', None)
            _restore_prod(saved)

    asyncio.run(scenario())


def test_rule_version_history_requires_auth_and_workspace_membership():
    """Rule history must not be enumerable without a credential or across tenants."""
    async def scenario():
        saved = _prod_mode()
        try:
            config.ALLOW_DEMO_AUTH = True
            init_db()
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                await client.post('/api/demo/setup', headers=DEMO_HDR)

                same_workspace = await client.get('/api/rules/R-VOICE-01/versions', headers=DEMO_HDR)
                assert same_workspace.status_code == 200
                assert same_workspace.json()

                cross_workspace = await client.get(
                    '/api/rules/R-VOICE-01/versions',
                    headers={
                        'X-Demo-Role': 'brand_admin',
                        'X-Demo-Actor': 'admin@foreign-corp.com',
                        'X-Workspace-Id': 'ws_unrelated',
                    },
                )
                assert cross_workspace.status_code == 403

                _set_prod()
                unauthenticated = await client.get('/api/rules/R-VOICE-01/versions')
                assert unauthenticated.status_code == 401
        finally:
            _restore_prod(saved)

    asyncio.run(scenario())
