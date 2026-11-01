"""
Automated unit and integration tests for BRANDTRACE version telemetry endpoints.
Verifies GET /api/version and GET /api/build-version under various deployment environments:
- Render container runtime (RENDER_GIT_COMMIT)
- Standard CI metadata (GIT_COMMIT_SHA, COMMIT_SHA, VERCEL_GIT_COMMIT_SHA)
- Local Git fallback (git rev-parse HEAD)
- Missing deployment metadata ('unknown' fallback, no hardcoded fabricated SHA)
- Invalid metadata validation
"""
import os
import subprocess
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


def test_render_commit_metadata(monkeypatch):
    """Verify that RENDER_GIT_COMMIT is respected and prioritized."""
    fake_sha = "abcdef1234567890abcdef1234567890abcdef12"
    monkeypatch.setenv("RENDER_GIT_COMMIT", fake_sha.upper())
    assert get_running_commit_sha() == fake_sha.lower()

    resp = client.get("/api/version")
    assert resp.status_code == 200
    assert resp.json()["commit_sha"] == fake_sha.lower()


def test_ci_commit_metadata(monkeypatch):
    """Verify standard CI environment variable fallback when Render var is absent."""
    fake_sha = "9876543210fedcba9876543210fedcba98765432"
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    monkeypatch.setenv("GIT_COMMIT_SHA", fake_sha)
    assert get_running_commit_sha() == fake_sha.lower()

    resp = client.get("/api/version")
    assert resp.status_code == 200
    assert resp.json()["commit_sha"] == fake_sha.lower()


def test_local_git_fallback(monkeypatch):
    """Verify that local git is used when env vars are absent in a valid git repo."""
    for var in ["RENDER_GIT_COMMIT", "GIT_COMMIT_SHA", "COMMIT_SHA", "VERCEL_GIT_COMMIT_SHA"]:
        monkeypatch.delenv(var, raising=False)

    sha = get_running_commit_sha()
    assert sha != "unknown"
    assert len(sha) >= 7


def test_missing_metadata_reports_unknown(monkeypatch):
    """Verify that missing metadata reports 'unknown' without fabricating a SHA."""
    for var in ["RENDER_GIT_COMMIT", "GIT_COMMIT_SHA", "COMMIT_SHA", "VERCEL_GIT_COMMIT_SHA"]:
        monkeypatch.delenv(var, raising=False)

    def fake_subprocess_run(*args, **kwargs):
        raise FileNotFoundError("git not found")

    monkeypatch.setattr(subprocess, "run", fake_subprocess_run)

    assert get_running_commit_sha() == "unknown"
    resp = client.get("/api/version")
    assert resp.status_code == 200
    assert resp.json()["commit_sha"] == "unknown"


def test_invalid_metadata_handling(monkeypatch):
    """Verify that invalid/malformed metadata is safely rejected."""
    # Too short (< 7 chars)
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc")
    # Defeat git subprocess so it falls to unknown
    monkeypatch.setattr(subprocess, "run", lambda *a, **k: subprocess.CompletedProcess([], 1, stdout=""))
    assert get_running_commit_sha() == "unknown"

    # Non-hex characters
    monkeypatch.setenv("RENDER_GIT_COMMIT", "this-is-not-a-valid-sha-1234567890")
    assert get_running_commit_sha() == "unknown"


def test_no_false_hardcoded_fallback(monkeypatch):
    """Verify that no fabricated hardcoded commit SHA is ever returned when metadata is missing."""
    for var in ["RENDER_GIT_COMMIT", "GIT_COMMIT_SHA", "COMMIT_SHA", "VERCEL_GIT_COMMIT_SHA"]:
        monkeypatch.delenv(var, raising=False)

    monkeypatch.setattr(subprocess, "run", lambda *a, **k: subprocess.CompletedProcess([], 1, stdout=""))

    result = get_running_commit_sha()
    assert result == "unknown"
    assert result != "7638a3fb5154f92161f5cb3bcb194add2f1b8ae4"
    assert result != "73adbc07a9286daf769d1c1aa843944cf94ef497"
    assert result != "41940fc"
