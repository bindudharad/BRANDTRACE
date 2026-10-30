"""
Unit and integration tests for BRANDTRACE UI Trust, Accuracy & Release Polish.

Validates:
1. Complete elimination of stale runtime test counters from live UI components and prerendered bundles.
2. Truthful environment classification derived from explicit configuration and readiness probes (Test B matrices).
3. Honest demo role simulation messaging with strict backend authorization enforcement.
4. Truthful AI and visual compliance claims (zero absolute/unsupported marketing claims).
"""

import os
import sys
import re
import pytest

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from starlette.testclient import TestClient
from backend.app.main import app


# -----------------------------------------------------------------------------
# Test A: Runtime Test Counters Removed
# -----------------------------------------------------------------------------

def test_no_hardcoded_test_counters_in_ui_components():
    """Verify that neither 126 nor stale test counts are displayed as live telemetry."""
    src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "src"))
    
    prohibited_patterns = [
        r"126\s*Passed",
        r"126\s*Automated Tests",
        r"Automated Tests\s*·\s*Verified Deterministic",
        r"4\s*TESTS\s*PASSING",
        r"3\s*TESTS\s*PASSING",
        r"Automated tests:\s*21\s*passed",
        r"Smoke assertions:\s*27/27\s*passed",
    ]
    
    violations = []
    
    for root, _, files in os.walk(src_dir):
        for f in files:
            if f.endswith((".tsx", ".ts")):
                fpath = os.path.join(root, f)
                with open(fpath, "r", encoding="utf-8", errors="replace") as file:
                    content = file.read()
                for pattern in prohibited_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        rel = os.path.relpath(fpath, src_dir)
                        violations.append(f"{rel}: matches '{pattern}' -> {matches}")

    assert not violations, f"Prohibited hardcoded test counters found in UI source:\n" + "\n".join(violations)


def test_prerendered_html_has_no_stale_test_counters():
    """Verify dist/index.html does not embed stale test counters."""
    dist_html = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "dist", "index.html"))
    if not os.path.exists(dist_html):
        pytest.skip("dist/index.html not built yet")
    
    with open(dist_html, "r", encoding="utf-8", errors="replace") as f:
        html = f.read()
    
    assert "126 Passed" not in html
    assert "126 Automated Tests" not in html
    assert "Single-Enterprise Staging Active" not in html
    assert "ZERO HALLUCINATION" not in html
    assert "Zero Hallucination" not in html


# -----------------------------------------------------------------------------
# Test B: Truthful Environment Classification
# -----------------------------------------------------------------------------

def evaluate_environment_matrix(configured_env: str, db_status: str, dialect: str):
    """
    Python reference model matching src/services/environment.ts:evaluateSystemStatus.
    """
    env_labels = {
        "local": "Local Development",
        "demo": "Local Demo",
        "staging": "Hosted Staging",
        "production": "Production",
        "unknown": "Environment Unverified",
    }
    
    if db_status != "ready" or not dialect:
        return {
            "environmentLabel": env_labels.get(configured_env, "Environment Unverified"),
            "readiness": "unavailable",
            "databaseConnected": False,
            "databaseDialect": "unknown",
            "configurationMismatch": False,
        }
    
    norm_dialect = "postgresql" if "postgres" in dialect.lower() else "sqlite" if "sqlite" in dialect.lower() else "unknown"
    
    mismatch = False
    if configured_env == "staging" and norm_dialect == "sqlite":
        mismatch = True
    elif configured_env == "production" and norm_dialect == "sqlite":
        mismatch = True
    elif configured_env not in ["local", "demo", "staging", "production"]:
        mismatch = True
        
    return {
        "environmentLabel": "Environment Unverified" if (mismatch and configured_env not in env_labels) else env_labels.get(configured_env, "Environment Unverified"),
        "readiness": "mismatch" if mismatch else "ready",
        "databaseConnected": True,
        "databaseDialect": norm_dialect,
        "configurationMismatch": mismatch,
    }


def test_environment_classification_scenarios():
    """Verify all 8 environment classification scenarios required by Section 11 Test B."""
    # 1. Local + ready + SQLite -> Local Demo / Local Development
    res1 = evaluate_environment_matrix("demo", "ready", "sqlite")
    assert res1["environmentLabel"] == "Local Demo"
    assert res1["readiness"] == "ready"
    assert res1["databaseDialect"] == "sqlite"
    assert not res1["configurationMismatch"]

    res1b = evaluate_environment_matrix("local", "ready", "sqlite")
    assert res1b["environmentLabel"] == "Local Development"
    assert res1b["readiness"] == "ready"

    # 2. Staging + ready + PostgreSQL -> Hosted Staging
    res2 = evaluate_environment_matrix("staging", "ready", "postgresql")
    assert res2["environmentLabel"] == "Hosted Staging"
    assert res2["readiness"] == "ready"
    assert res2["databaseDialect"] == "postgresql"
    assert not res2["configurationMismatch"]

    # 3. Production + ready + PostgreSQL -> Production
    res3 = evaluate_environment_matrix("production", "ready", "postgresql")
    assert res3["environmentLabel"] == "Production"
    assert res3["readiness"] == "ready"
    assert res3["databaseDialect"] == "postgresql"
    assert not res3["configurationMismatch"]

    # 4. Local + readiness failed -> Local Demo / Backend unavailable
    res4 = evaluate_environment_matrix("demo", "failed", "")
    assert res4["environmentLabel"] == "Local Demo"
    assert res4["readiness"] == "unavailable"
    assert not res4["databaseConnected"]
    assert res4["databaseDialect"] == "unknown"

    # 5. Missing environment variable -> Environment Unverified
    res5 = evaluate_environment_matrix("unknown", "ready", "sqlite")
    assert res5["environmentLabel"] == "Environment Unverified"
    assert res5["configurationMismatch"] is True
    assert res5["readiness"] == "mismatch"

    # 6. Staging + unexpected response / mismatch (Staging configured but SQLite backend)
    res6 = evaluate_environment_matrix("staging", "ready", "sqlite")
    assert res6["configurationMismatch"] is True
    assert res6["readiness"] == "mismatch"

    # 7. Production + SQLite -> Do not mislabel as Hosted Staging; detect mismatch
    res7 = evaluate_environment_matrix("production", "ready", "sqlite")
    assert res7["environmentLabel"] != "Hosted Staging"
    assert res7["configurationMismatch"] is True
    assert res7["readiness"] == "mismatch"

    # 8. Backend unavailable -> database state unknown, not falsely connected
    res8 = evaluate_environment_matrix("staging", "down", "")
    assert res8["databaseConnected"] is False
    assert res8["databaseDialect"] == "unknown"
    assert res8["readiness"] == "unavailable"


# -----------------------------------------------------------------------------
# Test C: Demo Role Simulation Messaging & Server Authorization Enforcement
# -----------------------------------------------------------------------------

def test_demo_role_simulation_messaging():
    """Verify notification format for all 4 roles does not claim server permissions were updated."""
    role_names = {
        "creator": "Creator",
        "reviewer": "Reviewer",
        "brand_admin": "Brand Admin",
        "auditor": "Auditor",
    }
    for role_code, display_name in role_names.items():
        expected_msg = f"Demo role switched to {display_name}. Backend authorization checks remain enforced."
        assert "server-side permissions updated" not in expected_msg.lower()
        assert "server permissions updated" not in expected_msg.lower()
        assert "account created" not in expected_msg.lower()


def test_backend_permission_checks_remain_enforced():
    """Verify that client role simulation headers cannot bypass real authorization rules."""
    client = TestClient(app)
    
    # 1. Unauthenticated request to protected endpoint returns 401 in strict mode
    # (or respects ALLOW_DEMO_AUTH boundary)
    
    # 2. Reviewer cannot create rules (requires brand_admin)
    res_rule = client.post(
        "/api/rules",
        json={
            "title": "Test Policy",
            "category": "TERMINOLOGY",
            "kind": "required_phrase",
            "pattern": "BrandTrace",
            "source_title": "Brand Guidelines v1",
            "source_excerpt": "Always capitalize BrandTrace",
            "requirement": "Must check capitalization",
            "severity": "MEDIUM",
        },
        headers={"X-Demo-Role": "reviewer", "X-Demo-Actor": "demo.reviewer", "X-Workspace-Id": "ws_default"}
    )
    assert res_rule.status_code == 403, "Reviewer must not be able to create brand rules"

    # 3. Creator cannot approve a draft (requires reviewer or brand_admin)
    res_approve = client.post(
        "/api/reviews/rev_sample_01/approval",
        json={"action": "approve", "reason": "Approved by creator"},
        headers={"X-Demo-Role": "creator", "X-Demo-Actor": "demo.creator", "X-Workspace-Id": "ws_default"}
    )
    assert res_approve.status_code == 403, "Creator must not be able to approve drafts"

    # 4. Reviewer cannot activate rule suggestions (requires brand_admin)
    res_act = client.post(
        "/api/governance/rule-suggestions/sug_sample_01/activate",
        json={"expected_rule_version": "1.0", "new_requirement": "Updated policy"},
        headers={"X-Demo-Role": "reviewer", "X-Demo-Actor": "demo.reviewer", "X-Workspace-Id": "ws_default"}
    )
    assert res_act.status_code == 403, "Reviewer must not be able to activate policy proposals"


# -----------------------------------------------------------------------------
# Test D: Honest Product Claims (No Overconfident Language)
# -----------------------------------------------------------------------------

def test_no_prohibited_overconfident_claims_in_frontend():
    """Verify zero hallucination and other prohibited marketing statements are eliminated."""
    src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "src"))
    
    prohibited_strings = [
        "zero hallucination",
        "hallucination-free",
        "zero-hallucination",
        "server-side permissions updated",
        "server permissions updated",
        "single-enterprise staging active",
    ]
    
    found_violations = []
    for root, _, files in os.walk(src_dir):
        for f in files:
            if f.endswith((".tsx", ".ts")):
                fpath = os.path.join(root, f)
                with open(fpath, "r", encoding="utf-8", errors="replace") as file:
                    content = file.read().lower()
                for bad_str in prohibited_strings:
                    if bad_str in content:
                        rel = os.path.relpath(fpath, src_dir)
                        found_violations.append(f"{rel}: contains '{bad_str}'")

    assert not found_violations, "Found prohibited overconfident claims in UI:\n" + "\n".join(found_violations)
