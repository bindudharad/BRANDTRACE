"""
Test Brand Asset Cryptographic Hash Integrity & Binary Upload Verification.
Verifies:
- 64-character SHA-256 hex digest validation.
- Rejection of invalid, 40-char SHA-1, and non-hex hashes with HTTP 422.
- Upload of actual image binary with automatic SHA-256 computation.
- Retrieval of stored asset record and matching cryptographic hash.
- Streaming retrieval of stored file binary and successful image decoding.
"""
import io
import hashlib
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def generate_test_image_bytes(width=200, height=100, color=(23, 59, 99)):
    img = Image.new("RGBA", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_brand_asset_valid_sha256_accepted(client):
    """Confirm a valid 64-character hexadecimal SHA-256 hash is accepted."""
    test_bytes = generate_test_image_bytes()
    expected_hash = hashlib.sha256(test_bytes).hexdigest()
    assert len(expected_hash) == 64

    resp = client.post(
        "/api/brand-assets",
        json={
            "name": "Aster Labs Verified Logo",
            "asset_type": "logo",
            "content_hash": expected_hash,
            "source": "Corporate Guidelines",
            "license_status": "APPROVED",
            "approval_status": "APPROVED",
        },
        headers={"X-Demo-Role": "brand_admin", "X-Workspace-Id": "ws_default"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["content_hash"] == expected_hash.lower()

    # Retrieve individual asset record
    get_resp = client.get(
        f"/api/brand-assets/{data['id']}",
        headers={"X-Workspace-Id": "ws_default"},
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["content_hash"] == expected_hash


def test_brand_asset_invalid_hash_rejected_with_422(client):
    """Confirm 40-char hashes, short strings, and non-hex inputs are rejected with HTTP 422."""
    # 40-character SHA-1 hash (like da39a3ee5e6b4b0d3255bfef95601890afd80709)
    sha1_hash = "da39a3ee5e6b4b0d3255bfef95601890afd80709"
    resp = client.post(
        "/api/brand-assets",
        json={
            "name": "Fake Hash Asset",
            "asset_type": "logo",
            "content_hash": sha1_hash,
        },
        headers={"X-Demo-Role": "brand_admin", "X-Workspace-Id": "ws_default"},
    )
    assert resp.status_code == 422
    assert "64-character SHA-256" in resp.json()["detail"]

    # Non-hex string of length 64
    invalid_chars = "z" * 64
    resp = client.post(
        "/api/brand-assets",
        json={
            "name": "Non-Hex Hash Asset",
            "content_hash": invalid_chars,
        },
        headers={"X-Demo-Role": "brand_admin", "X-Workspace-Id": "ws_default"},
    )
    assert resp.status_code == 422


def test_brand_asset_binary_upload_and_image_decode(client):
    """Confirm binary upload calculates real SHA-256 and stored file can be retrieved and decoded."""
    img_bytes = generate_test_image_bytes(width=320, height=120, color=(24, 169, 153))
    actual_hash = hashlib.sha256(img_bytes).hexdigest()

    resp = client.post(
        "/api/brand-assets/upload",
        data={
            "name": "Aster Labs Binary Logo Upload",
            "asset_type": "logo",
            "source": "Playwright Automation Suite",
            "approval_status": "APPROVED",
        },
        files={
            "file": ("aster_logo_upload.png", img_bytes, "image/png"),
        },
        headers={"X-Demo-Role": "brand_admin", "X-Workspace-Id": "ws_default"},
    )
    assert resp.status_code == 201, resp.text
    asset = resp.json()

    # 1. Verify 64-char hash matches actual bytes
    assert asset["content_hash"] == actual_hash
    assert len(asset["content_hash"]) == 64
    assert asset["width"] == 320
    assert asset["height"] == 120
    assert asset["file_size"] == len(img_bytes)

    # 2. Retrieve saved asset record
    get_rec = client.get(
        f"/api/brand-assets/{asset['id']}",
        headers={"X-Workspace-Id": "ws_default"},
    )
    assert get_rec.status_code == 200
    assert get_rec.json()["content_hash"] == actual_hash

    # 3. Retrieve stored file and decode as image
    file_resp = client.get(
        f"/api/brand-assets/{asset['id']}/file",
        headers={"X-Workspace-Id": "ws_default"},
    )
    assert file_resp.status_code == 200
    assert file_resp.headers["content-type"] == "image/png"

    # Decode retrieved binary with Pillow
    retrieved_img = Image.open(io.BytesIO(file_resp.content))
    assert retrieved_img.size == (320, 120)


def test_brand_asset_empty_file_rejected(client):
    """Confirm empty file upload returns HTTP 422."""
    resp = client.post(
        "/api/brand-assets/upload",
        data={"name": "Empty File"},
        files={"file": ("empty.png", b"", "image/png")},
        headers={"X-Demo-Role": "brand_admin", "X-Workspace-Id": "ws_default"},
    )
    assert resp.status_code == 422
