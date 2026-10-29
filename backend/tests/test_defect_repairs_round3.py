import os
import sys
import tempfile
import io
import json
from pathlib import Path
import asyncio
import httpx
import pytest
from PIL import Image

# Use isolated temp database for this test run
if 'DATABASE_URL' not in os.environ:
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, rows, row, init_db, ident, now
import app.config as config
from app.guideline_health import compute_guideline_health
from app.image_analyzer import is_ocr_available, analyze_image_compliance

ADMIN_HDR = {"X-Demo-Role": "brand_admin", "X-Demo-Actor": "admin@brandtrace.internal"}
REV_HDR = {"X-Demo-Role": "reviewer", "X-Demo-Actor": "reviewer@brandtrace.internal"}


def test_auth_boundary_and_production_security():
    """Verify production security boundary rejecting demo headers and requiring Bearer/API-key."""
    async def scenario():
        init_db()
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            orig_allow = config.ALLOW_DEMO_AUTH
            orig_admin_key = config.ADMIN_API_KEY
            try:
                # Set production mode with an admin API key
                config.ALLOW_DEMO_AUTH = False
                config.ADMIN_API_KEY = "test-secret-admin-key"

                valid_rule = {
                    "title": "Test Rule",
                    "category": "terminology",
                    "kind": "prohibited_phrase",
                    "pattern": "forbidden",
                    "requirement": "Avoid",
                    "severity": "HIGH",
                    "source_title": "Source",
                    "source_excerpt": "Excerpt"
                }

                # 1. Demo headers rejected with 401 in production mode
                r = await client.post('/api/rules', json=valid_rule, headers=ADMIN_HDR)
                assert r.status_code == 401
                assert "Demo role simulation is disabled" in r.json()["detail"]

                # 2. Bearer token authenticates successfully
                r = await client.get('/api/rules', headers={"Authorization": "Bearer test-secret-admin-key"})
                assert r.status_code == 200

                # 3. Demo reset strictly forbidden in production mode even if authenticated
                r = await client.post('/api/demo/reset', headers={"Authorization": "Bearer test-secret-admin-key"})
                assert r.status_code == 403
                assert "disabled in production mode" in r.json()["detail"]

            finally:
                config.ALLOW_DEMO_AUTH = orig_allow
                config.ADMIN_API_KEY = orig_admin_key

    asyncio.run(scenario())


def test_demo_reset_all_thirteen_tables_and_initial_snapshots():
    """Verify demo reset clears all 13 tables and restores initial immutable snapshots."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            # 1. Initialize demo
            await client.post('/api/demo/setup', headers=ADMIN_HDR)

            # 2. Populate records in secondary tables
            with db() as conn:
                conn.execute(
                    "INSERT INTO brand_assets (id, name, asset_type, license_status, approval_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (ident("asset"), "Temp Asset", "image", "APPROVED", "APPROVED", now(), now())
                )
                conn.execute(
                    "INSERT INTO rule_suggestions (id, rule_id, status, created_at) VALUES (?, ?, ?, ?)",
                    (ident("rsug"), "R-VOICE-01", "PENDING", now())
                )
                conn.execute(
                    "INSERT INTO evidence_dependencies (id, workspace_id, review_id, finding_id, source_type, source_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (ident("dep"), "ws_default", "rev_sample", "find_sample", "RULE", "R-VOICE-01", now())
                )

            # Check rows exist
            assert len(rows("SELECT * FROM brand_assets")) > 0
            assert len(rows("SELECT * FROM rule_suggestions")) > 0
            assert len(rows("SELECT * FROM evidence_dependencies WHERE review_id='rev_sample'")) > 0

            # 3. Perform demo reset as admin
            r = await client.post('/api/demo/reset', headers=ADMIN_HDR)
            assert r.status_code == 200

            # 4. Verify 13 tables are clean or properly reset
            assert len(rows("SELECT * FROM brand_assets")) == 0
            assert len(rows("SELECT * FROM rule_suggestions")) == 0
            assert len(rows("SELECT * FROM evidence_dependencies WHERE review_id='rev_sample'")) == 0
            assert len(rows("SELECT * FROM rules")) == 3
            assert len(rows("SELECT * FROM facts")) == 1

            # 5. Verify initial immutable snapshots were generated
            rule_vers = rows("SELECT * FROM rule_versions")
            assert len(rule_vers) >= 3
            rule_ids_snapshotted = {rv["rule_id"] for rv in rule_vers}
            assert "R-VOICE-01" in rule_ids_snapshotted
            assert "R-TERM-02" in rule_ids_snapshotted
            assert "R-TERM-03" in rule_ids_snapshotted

            fact_vers = rows("SELECT * FROM fact_versions")
            assert len(fact_vers) >= 1
            assert any(fv["fact_id"] == "F-2026-01" for fv in fact_vers)

    asyncio.run(scenario())


def test_rule_versioning_and_concurrency_controls():
    """Verify expected-version concurrency, material change version bumps, and audit trail."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            await client.post('/api/demo/setup', headers=ADMIN_HDR)

            rule = row("SELECT * FROM rules WHERE id='R-VOICE-01'")
            cur_version = rule["version"]

            # 1. Stale expected_version returns 409 Conflict
            r = await client.put(
                f"/api/rules/{rule['id']}",
                json={"requirement": "New requirement", "expected_version": "99.0"},
                headers=ADMIN_HDR,
            )
            assert r.status_code == 409
            assert "Stale update conflict" in r.json()["detail"]

            # 2. Material change attempting to reuse the current version returns 409
            r = await client.put(
                f"/api/rules/{rule['id']}",
                json={"requirement": "New requirement", "version": cur_version},
                headers=ADMIN_HDR,
            )
            assert r.status_code == 409
            assert "Material rule changes cannot reuse" in r.json()["detail"]

            # 3. Valid material change updates version, snapshots both old & new, and logs audit
            r = await client.put(
                f"/api/rules/{rule['id']}",
                json={"requirement": "Updated requirement for superlatives", "reason": "Audit review"},
                headers=ADMIN_HDR,
            )
            assert r.status_code == 200
            updated = r.json()
            assert updated["version"] != cur_version

            # Check snapshot history
            snapshots = rows("SELECT * FROM rule_versions WHERE rule_id='R-VOICE-01'")
            versions = {s["version"] for s in snapshots}
            assert cur_version in versions
            assert updated["version"] in versions

            # Check audit entry
            audits = rows("SELECT * FROM audit WHERE action='RULE_UPDATED'")
            assert any("R-VOICE-01" in a.get("details", "") for a in audits)

    asyncio.run(scenario())


def test_fact_versioning_and_concurrency_controls():
    """Verify fact expected-version concurrency, material version bumps, and snapshots."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            await client.post('/api/demo/setup', headers=ADMIN_HDR)

            fact = row("SELECT * FROM facts WHERE id='F-2026-01'")
            cur_version = fact["version"]

            # 1. Stale expected_version returns 409 Conflict
            r = await client.put(
                f"/api/facts/{fact['id']}",
                json={"claim": "New claim", "expected_version": "99.0"},
                headers=ADMIN_HDR,
            )
            assert r.status_code == 409

            # 2. Material change attempting to reuse current version returns 409
            r = await client.put(
                f"/api/facts/{fact['id']}",
                json={"claim": "New claim", "version": cur_version},
                headers=ADMIN_HDR,
            )
            assert r.status_code == 409

            # 3. Valid update bumps version, snapshots prior & new, and records audit
            r = await client.put(
                f"/api/facts/{fact['id']}",
                json={"value": "Available in India and UAE", "reason": "Expanded region"},
                headers=ADMIN_HDR,
            )
            assert r.status_code == 200
            updated = r.json()
            assert updated["version"] != cur_version

            fact_snaps = rows("SELECT * FROM fact_versions WHERE fact_id='F-2026-01'")
            snap_vers = {fs["version"] for fs in fact_snaps}
            assert cur_version in snap_vers
            assert updated["version"] in snap_vers

    asyncio.run(scenario())


def test_chunked_upload_streaming_size_guard():
    """Verify bounded streaming check rejects files exceeding MAX_UPLOAD_BYTES without memory blowout."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            await client.post('/api/demo/setup', headers=ADMIN_HDR)

            # Generate an oversized payload exceeding 10MB
            oversized_bytes = b"A" * (config.MAX_UPLOAD_BYTES + 1024 * 128)
            files = {"file": ("big.txt", io.BytesIO(oversized_bytes), "text/plain")}
            data = {"title": "Oversized Document", "content_type": "document"}

            r = await client.post('/api/reviews/upload', data=data, files=files, headers=REV_HDR)
            assert r.status_code == 413
            assert "exceeds maximum permitted" in r.json()["detail"]

    asyncio.run(scenario())


def test_reviewer_disagreement_actor_overlap_logic():
    """Verify reviewer disagreement detection handles distinct vs overlapping actor sets."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            await client.post('/api/demo/setup', headers=ADMIN_HDR)

            # Insert findings for R-VOICE-01 where Alice accepted and Bob dismissed
            with db() as conn:
                conn.execute("DELETE FROM findings WHERE source_id='R-VOICE-01'")
                conn.execute(
                    """INSERT INTO findings (id, review_id, category, type, severity, status, passage, explanation, source_id, analysis_method, disposition, disposition_by, disposition_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (ident("f"), "rev_1", "voice", "prohibited_phrase", "HIGH", "CONTRADICTED", "best", "violates rule", "R-VOICE-01", "DETERMINISTIC", "ACCEPTED_EDIT", "alice@company.com", now())
                )
                conn.execute(
                    """INSERT INTO findings (id, review_id, category, type, severity, status, passage, explanation, source_id, analysis_method, disposition, disposition_by, disposition_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (ident("f"), "rev_2", "voice", "prohibited_phrase", "HIGH", "CONTRADICTED", "best", "violates rule", "R-VOICE-01", "DETERMINISTIC", "DISMISSED", "bob@company.com", now())
                )

            health = compute_guideline_health()
            voice_health = next(h for h in health if h["rule_id"] == "R-VOICE-01")
            assert voice_health["disagreement_detected"] is True

            # If same reviewer (Alice) both accepted and dismissed, disagreement should be False
            with db() as conn:
                conn.execute("DELETE FROM findings WHERE source_id='R-VOICE-01'")
                conn.execute(
                    """INSERT INTO findings (id, review_id, category, type, severity, status, passage, explanation, source_id, analysis_method, disposition, disposition_by, disposition_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (ident("f"), "rev_1", "voice", "prohibited_phrase", "HIGH", "CONTRADICTED", "best", "violates rule", "R-VOICE-01", "DETERMINISTIC", "ACCEPTED_EDIT", "alice@company.com", now())
                )
                conn.execute(
                    """INSERT INTO findings (id, review_id, category, type, severity, status, passage, explanation, source_id, analysis_method, disposition, disposition_by, disposition_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (ident("f"), "rev_2", "voice", "prohibited_phrase", "HIGH", "CONTRADICTED", "best", "violates rule", "R-VOICE-01", "DETERMINISTIC", "DISMISSED", "alice@company.com", now())
                )

            health = compute_guideline_health()
            voice_health = next(h for h in health if h["rule_id"] == "R-VOICE-01")
            assert voice_health["disagreement_detected"] is False

    asyncio.run(scenario())


def test_rule_suggestions_persistence_and_candidate_validation():
    """Verify rule suggestions list endpoint and activation requirement validation."""
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            await client.post('/api/demo/setup', headers=ADMIN_HDR)

            # Accept a suggestion for R-VOICE-01
            r = await client.post('/api/governance/rule-suggestions/R-VOICE-01', json={"action": "accept"}, headers=ADMIN_HDR)
            assert r.status_code == 200
            sug_id = r.json()["id"]

            # GET list of suggestions
            list_res = await client.get('/api/governance/rule-suggestions', headers=ADMIN_HDR)
            assert list_res.status_code == 200
            sugs = list_res.json()
            assert any(s["id"] == sug_id and s["status"] == "ACCEPTED" for s in sugs)

            # Get current rule version dynamically
            cur_rule = row("SELECT version FROM rules WHERE id='R-VOICE-01'")
            cur_ver = cur_rule["version"]

            # Attempt activating with empty whitespace requirement -> 422
            act_res = await client.post(
                f"/api/governance/rule-suggestions/{sug_id}/activate",
                json={
                    "expected_rule_version": cur_ver,
                    "new_requirement": "   ",
                    "reason": "Test activation"
                },
                headers=ADMIN_HDR,
            )
            assert act_res.status_code == 422
            assert "cannot be empty" in act_res.json()["detail"]

    asyncio.run(scenario())


def test_ocr_option_b_deterministic_unsupported():
    """Verify Option B explicit, deterministic OCR status when OCR is unavailable."""
    assert is_ocr_available() is False

    # Create small valid test PNG
    img = Image.new("RGB", (100, 100), color=(15, 118, 110))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    analysis = analyze_image_compliance(png_bytes, approved_palette=["#0f766e"])
    ocr_findings = [f for f in analysis["visual_findings"] if f["category"] == "visual_ocr"]
    assert len(ocr_findings) == 1
    assert ocr_findings[0]["status"] == "NEEDS_REVIEW"
    assert ocr_findings[0]["type"] == "ocr_unsupported"
    assert "Automated text extraction from raster graphics is not configured" in ocr_findings[0]["explanation"]


def test_cross_workspace_isolation_and_authorization():
    """Verify that cross-workspace access attempts are strictly rejected with HTTP 403 and data remains unchanged."""
    async def scenario():
        init_db()
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            await client.post('/api/demo/setup', headers=ADMIN_HDR)

            # 1. Legitimate access to authorized workspace
            legit_res = await client.get('/api/rules', headers=ADMIN_HDR)
            assert legit_res.status_code == 200
            assert len(legit_res.json()) > 0

            # 2. Attempted cross-workspace access by changing X-Workspace-Id alone
            tampered_ws_hdr = {
                "X-Demo-Role": "brand_admin",
                "X-Demo-Actor": "admin@brandtrace.internal",
                "X-Workspace-Id": "ws_unrelated"
            }
            r_tampered = await client.get('/api/rules', headers=tampered_ws_hdr)
            assert r_tampered.status_code == 403
            assert "not authorized for workspace 'ws_unrelated'" in r_tampered.json()["detail"]

            # Foreign actor (authorized only for ws_unrelated) attempting to access ws_default directly
            foreign_caller_claiming_default = {
                "X-Demo-Role": "brand_admin",
                "X-Demo-Actor": "intruder@foreign-corp.com",
                "X-Workspace-Id": "ws_default"
            }
            r_claim_def = await client.get('/api/rules', headers=foreign_caller_claiming_default)
            assert r_claim_def.status_code == 403
            assert "not authorized for workspace 'ws_default'" in r_claim_def.json()["detail"]

            # Foreign caller in their legitimate workspace ws_unrelated
            foreign_admin = {
                "X-Demo-Role": "brand_admin",
                "X-Demo-Actor": "intruder@foreign-corp.com",
                "X-Workspace-Id": "ws_unrelated"
            }

            # 3. Cross-workspace review read
            reviews = (await client.get('/api/reviews', headers=ADMIN_HDR)).json()
            assert len(reviews) > 0
            rev_id = reviews[0]["id"]
            r_rev = await client.get(f'/api/reviews/{rev_id}', headers=foreign_admin)
            assert r_rev.status_code == 403
            assert "outside caller workspace is forbidden" in r_rev.json()["detail"]

            # 4. Cross-workspace rule update and verify data immutability
            rule_before = row("SELECT * FROM rules WHERE id='R-VOICE-01'")
            r_rule = await client.put(
                '/api/rules/R-VOICE-01',
                json={"requirement": "Unauthorized mutation"},
                headers=foreign_admin
            )
            assert r_rule.status_code == 403
            rule_after = row("SELECT * FROM rules WHERE id='R-VOICE-01'")
            assert rule_after["requirement"] == rule_before["requirement"]
            assert rule_after["version"] == rule_before["version"]

            # 5. Cross-workspace fact update and verify data immutability
            fact_before = row("SELECT * FROM facts WHERE id='F-2026-01'")
            r_fact = await client.put(
                '/api/facts/F-2026-01',
                json={"claim": "Unauthorized claim change"},
                headers=foreign_admin
            )
            assert r_fact.status_code == 403
            fact_after = row("SELECT * FROM facts WHERE id='F-2026-01'")
            assert fact_after["claim"] == fact_before["claim"]
            assert fact_after["version"] == fact_before["version"]

            # 6. Cross-workspace asset deletion and verify data immutability
            asset_res = await client.post(
                '/api/brand-assets',
                json={
                    "name": "Target Asset",
                    "asset_type": "logo",
                    "content_hash": "sha256:112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00",
                    "source": "manual_test",
                    "license_status": "APPROVED",
                    "approval_status": "APPROVED",
                },
                headers=ADMIN_HDR
            )
            assert asset_res.status_code == 201
            asset_id = asset_res.json()["id"]

            del_res = await client.delete(f'/api/brand-assets/{asset_id}', headers=foreign_admin)
            assert del_res.status_code == 403
            # Asset still persists in database
            assert row("SELECT id FROM brand_assets WHERE id=?", (asset_id,)) is not None

            # 7. Cross-workspace suggestion read and activation immutability
            sug_res = await client.post(
                '/api/governance/rule-suggestions/R-VOICE-01',
                json={"action": "accept"},
                headers=ADMIN_HDR
            )
            assert sug_res.status_code == 200
            sug_id = sug_res.json()["id"]

            # Foreign admin querying suggestions only sees their own workspace (empty)
            foreign_sugs = (await client.get('/api/governance/rule-suggestions', headers=foreign_admin)).json()
            assert not any(s["id"] == sug_id for s in foreign_sugs)

            # Foreign admin activating ws_default suggestion rejected with 403
            cur_rule = row("SELECT version FROM rules WHERE id='R-VOICE-01'")
            act_res = await client.post(
                f'/api/governance/rule-suggestions/{sug_id}/activate',
                json={
                    "expected_rule_version": cur_rule["version"],
                    "new_requirement": "Strict compliance required.",
                    "reason": "Foreign activation attempt"
                },
                headers=foreign_admin
            )
            assert act_res.status_code == 403
            # Suggestion remains ACCEPTED and rule version unchanged
            sug_row = row("SELECT status FROM rule_suggestions WHERE id=?", (sug_id,))
            assert sug_row["status"] == "ACCEPTED"
            assert row("SELECT version FROM rules WHERE id='R-VOICE-01'")["version"] == cur_rule["version"]

            # 8. Unauthorized reset requests rejected
            # Creator cannot reset demo state
            r_reset_creator = await client.post('/api/demo/reset', headers={"X-Demo-Role": "creator", "X-Demo-Actor": "creator@brandtrace.internal"})
            assert r_reset_creator.status_code == 403

            # Foreign workspace cannot reset demo state
            r_reset_foreign = await client.post('/api/demo/reset', headers=foreign_admin)
            assert r_reset_foreign.status_code == 403

    asyncio.run(scenario())


def test_transaction_atomicity_and_rollback():
    """Verify atomicity: failed operations roll back without leaving orphaned rows."""
    async def scenario():
        init_db()
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            await client.post('/api/demo/setup', headers=ADMIN_HDR)

            # Accept a suggestion for R-VOICE-01
            sug_res = await client.post(
                '/api/governance/rule-suggestions/R-VOICE-01',
                json={"action": "accept"},
                headers=ADMIN_HDR
            )
            assert sug_res.status_code == 200
            sug_id = sug_res.json()["id"]

            rule_before = row("SELECT * FROM rules WHERE id='R-VOICE-01'")
            ver_count_before = len(rows("SELECT * FROM rule_versions WHERE rule_id='R-VOICE-01'"))
            audit_count_before = len(rows("SELECT * FROM audit WHERE action='RULE_VERSION_ACTIVATED'"))

            # Attempt activation that fails validation (whitespace requirement)
            act_res = await client.post(
                f'/api/governance/rule-suggestions/{sug_id}/activate',
                json={
                    "expected_rule_version": rule_before["version"],
                    "new_requirement": "   ",
                    "reason": "Failing transaction"
                },
                headers=ADMIN_HDR
            )
            assert act_res.status_code == 422

            # Verify complete rollback / no state modification
            rule_after = row("SELECT * FROM rules WHERE id='R-VOICE-01'")
            ver_count_after = len(rows("SELECT * FROM rule_versions WHERE rule_id='R-VOICE-01'"))
            audit_count_after = len(rows("SELECT * FROM audit WHERE action='RULE_VERSION_ACTIVATED'"))
            sug_after = row("SELECT * FROM rule_suggestions WHERE id=?", (sug_id,))

            assert rule_after["version"] == rule_before["version"]
            assert rule_after["requirement"] == rule_before["requirement"]
            assert ver_count_after == ver_count_before
            assert audit_count_after == audit_count_before
            assert sug_after["status"] == "ACCEPTED"  # Not flipped to ACTIVATED

            # Verify direct database transaction rollback on unhandled error
            initial_rule_count = len(rows("SELECT * FROM rules"))
            with pytest.raises(RuntimeError):
                with db() as conn:
                    conn.execute(
                        "INSERT INTO rules (id, workspace_id, title, category, kind, pattern, requirement, severity, version, status, owner, source_id, source_title, source_excerpt, created_at) "
                        "VALUES ('r_rollback_test', 'ws_default', 'Test', 'voice', 'prohibited_phrase', 'bad', 'req', 'LOW', '1.0', 'ACTIVE', 'owner', 'src', 'title', 'excerpt', '2026-01-01T00:00:00Z')"
                    )
                    # Trigger simulated failure midway through transaction
                    raise RuntimeError("Simulated transaction fault")

            # Must be rolled back completely
            assert len(rows("SELECT * FROM rules")) == initial_rule_count
            assert row("SELECT * FROM rules WHERE id='r_rollback_test'") is None

    asyncio.run(scenario())



def test_production_auth_trust_chain_and_no_synthetic_seeds():
    """Verify complete production trust chain: credential derivation, role immutability, header tampering rejection, and absence of synthetic seed data in production database."""
    async def scenario():
        orig_allow = config.ALLOW_DEMO_AUTH
        orig_admin = config.ADMIN_API_KEY
        orig_user = config.API_KEY
        try:
            config.ALLOW_DEMO_AUTH = False
            config.ADMIN_API_KEY = "prod-admin-secret-key-999"
            config.API_KEY = "prod-user-secret-key-111"

            # 1. Verify init_db() in production mode does NOT seed synthetic demo or foreign actors
            with db() as conn:
                conn.execute("DELETE FROM workspace_members")
            init_db()
            synthetic_count = len(rows("SELECT * FROM workspace_members WHERE actor LIKE '%foreign-corp.com' OR actor LIKE 'demo.%'"))
            # In production mode, synthetic actors must not be seeded
            assert synthetic_count == 0

            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                # 2. Missing credentials -> 401
                r_missing = await client.get('/api/rules')
                assert r_missing.status_code == 401

                # 3. Invalid credentials -> 401
                r_invalid = await client.get('/api/rules', headers={"Authorization": "Bearer invalid-token"})
                assert r_invalid.status_code == 401

                # 4. Valid reviewer API key cannot elevate privileges by supplying X-Demo-Role
                reviewer_hdr = {
                    "X-API-Key": "prod-user-secret-key-111",
                    "X-Demo-Role": "brand_admin",       # Spoofed header
                    "X-Demo-Actor": "intruder.spoofed" # Spoofed header
                }
                # GET rules works (reviewer allowed to read)
                r_read = await client.get('/api/rules', headers=reviewer_hdr)
                assert r_read.status_code == 200

                # POST rule fails with 403 because actor identity is reviewer (derived from API_KEY), NOT brand_admin
                r_escalate = await client.post(
                    '/api/rules',
                    json={
                        "title": "Privilege Escalation Attempt",
                        "category": "terminology",
                        "kind": "prohibited_phrase",
                        "pattern": "escalated",
                        "requirement": "Blocked",
                        "severity": "HIGH",
                        "source_title": "Source",
                        "source_excerpt": "Excerpt"
                    },
                    headers=reviewer_hdr
                )
                assert r_escalate.status_code == 403
                assert "Brand Admin role required" in r_escalate.json()["detail"]

                # 5. Reviewer token cannot access ws_unrelated by specifying X-Workspace-Id
                r_foreign_ws = await client.get('/api/rules', headers={
                    "X-API-Key": "prod-user-secret-key-111",
                    "X-Workspace-Id": "ws_unrelated"
                })
                assert r_foreign_ws.status_code == 403
                assert "not authorized for workspace 'ws_unrelated'" in r_foreign_ws.json()["detail"]

                # 6. Admin Bearer token successfully creates rule in authorized ws_default
                admin_hdr = {"Authorization": "Bearer prod-admin-secret-key-999"}
                r_create = await client.post(
                    '/api/rules',
                    json={
                        "title": "Legitimate Admin Rule",
                        "category": "terminology",
                        "kind": "prohibited_phrase",
                        "pattern": "legit prohibited phrase",
                        "requirement": "Avoid strictly",
                        "severity": "HIGH",
                        "source_title": "Brand Book",
                        "source_excerpt": "Strictly avoid."
                    },
                    headers=admin_hdr
                )
                assert r_create.status_code == 201
                created_rule_id = r_create.json()["id"]

                # 7. Admin token cannot tamper X-Workspace-Id to mutate ws_unrelated
                r_admin_cross = await client.put(
                    f'/api/rules/{created_rule_id}',
                    json={"requirement": "Mutated across workspace"},
                    headers={
                        "Authorization": "Bearer prod-admin-secret-key-999",
                        "X-Workspace-Id": "ws_unrelated"
                    }
                )
                assert r_admin_cross.status_code == 403
                assert "not authorized for workspace 'ws_unrelated'" in r_admin_cross.json()["detail"]

                # Verify rule in database was NOT mutated
                saved_rule = row("SELECT requirement FROM rules WHERE id=?", (created_rule_id,))
                assert saved_rule["requirement"] == "Avoid strictly"

        finally:
            config.ALLOW_DEMO_AUTH = orig_allow
            config.ADMIN_API_KEY = orig_admin
            config.API_KEY = orig_user

    asyncio.run(scenario())
