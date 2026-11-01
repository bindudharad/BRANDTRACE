"""
Automated unit and integration tests for BRANDTRACE version telemetry endpoints.
Verifies GET /api/version and GET /api/build-version under various deployment environments.
"""
import os
import pytest
from starlette.testclient import TestClient

from app.main import app, get_running_commit_sha

client = TestClient(app)

def test_version_endpoint_structure():
    """Verify that /api/version returns 200 with standard schema."""
    resp = client.get("/api/version")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "brandtrace"
    assert data["version"] == "0.3.0"
    assert "commit_sha" in data
    assert len(data["commit_sha"]) >= 7
    assert "environment" in data

def test_build_version_endpoint_parity():
    """Verify that /api/build-version matches /api/version."""
    v_resp = client.get("/api/version")
    bv_resp = client.get("/api/build-version")
    assert bv_resp.status_code == 200
    assert v_resp.json() == bv_resp.json()

def test_health_endpoint_telemetry():
    """Verify that /api/health includes commit_sha."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "brandtrace"
    assert data["version"] == "0.3.0"
    assert "commit_sha" in data
    assert len(data["commit_sha"]) >= 7

def test_render_environment_variable_precedence(monkeypatch):
    """Verify that RENDER_GIT_COMMIT is respected if present."""
    fake_sha = "abcdef1234567890abcdef1234567890abcdef12"
    monkeypatch.setenv("RENDER_GIT_COMMIT", fake_sha)
    assert get_running_commit_sha() == fake_sha

    resp = client.get("/api/version")
    assert resp.status_code == 200
    assert resp.json()["commit_sha"] == fake_sha

def test_ci_environment_variable_fallback(monkeypatch):
    """Verify that GIT_COMMIT_SHA is used when RENDER_GIT_COMMIT is absent."""
    fake_sha = "9876543210fedcba9876543210fedcba98765432"
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    monkeypatch.setenv("GIT_COMMIT_SHA", fake_sha)
    assert get_running_commit_sha() == fake_sha

    resp = client.get("/api/version")
    assert resp.status_code == 200
    assert resp.json()["commit_sha"] == fake_sha
