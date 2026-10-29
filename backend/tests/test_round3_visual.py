import os
import sys
import tempfile
import io
from pathlib import Path
import httpx
import pytest
from PIL import Image

# Isolated test DB
fd, path = tempfile.mkstemp(suffix='.db')
os.close(fd)
os.environ['DATABASE_URL'] = f'sqlite:///{path}'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.models import db, init_db
from app.image_analyzer import compute_sha256, analyze_image_compliance

@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM brand_assets")
        conn.execute("DELETE FROM findings")
        conn.execute("DELETE FROM reviews")
    yield

def make_solid_png(color: tuple, size: tuple = (100, 100)) -> bytes:
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def make_two_color_png(c1: tuple, c2: tuple, size: tuple = (100, 100)) -> bytes:
    img = Image.new("RGB", size, c1)
    for y in range(size[1] // 2, size[1]):
        for x in range(size[0]):
            img.putpixel((x, y), c2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

@pytest.mark.asyncio
async def test_brand_asset_registry_crud():
    """Test registry endpoints: register approved asset, list, and delete."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # 1. Non-admin cannot register asset
        res_fail = await client.post(
            '/api/brand-assets',
            json={'name': 'Hero Logo', 'content_hash': 'abc123hash', 'approval_status': 'APPROVED'},
            headers={'X-Demo-Role': 'reviewer'}
        )
        assert res_fail.status_code == 403

        # 2. Brand admin registers asset
        res = await client.post(
            '/api/brand-assets',
            json={
                'name': 'Primary Logo Vector',
                'asset_type': 'image',
                'content_hash': 'sha256_mock_hash_val_123',
                'source': 'Figma Assets 2026',
                'license_status': 'APPROVED',
                'license_notes': 'Owned outright by Brand',
                'approval_status': 'APPROVED'
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert res.status_code == 201
        asset_id = res.json()['id']

        # 3. List brand assets
        list_res = await client.get('/api/brand-assets')
        assert list_res.status_code == 200
        assets = list_res.json()
        assert any(a['id'] == asset_id and a['name'] == 'Primary Logo Vector' for a in assets)

        # 4. Brand admin deletes asset
        del_res = await client.delete(f'/api/brand-assets/{asset_id}', headers={'X-Demo-Role': 'brand_admin'})
        assert del_res.status_code == 204

        # Verify deletion
        list_res2 = await client.get('/api/brand-assets')
        assert not any(a['id'] == asset_id for a in list_res2.json())

@pytest.mark.asyncio
async def test_image_hash_matching_registered_approved():
    """Test F1: Upload image matching approved hash -> SUPPORTED finding, registered_asset_approved."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        teal_png = make_solid_png((45, 212, 191))
        teal_hash = compute_sha256(teal_png)

        await client.post(
            '/api/brand-assets',
            json={
                'name': 'Approved Brand Teal Square',
                'content_hash': teal_hash,
                'approval_status': 'APPROVED',
                'license_status': 'APPROVED'
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )

        files = {'file': ('teal.png', teal_png, 'image/png')}
        data = {'title': 'Teal Asset Test', 'content_type': 'image'}
        upload_res = await client.post('/api/reviews/upload', data=data, files=files)
        assert upload_res.status_code == 200
        review = upload_res.json()
        findings = review['findings']

        asset_finding = next((f for f in findings if f.get('type') == 'registered_asset_approved'), None)
        assert asset_finding is not None
        assert asset_finding['status'] == 'SUPPORTED'
        assert asset_finding['severity'] == 'LOW'

@pytest.mark.asyncio
async def test_image_hash_matching_unregistered_and_restricted():
    """Test F2 & F3: Unknown hash -> NEEDS_REVIEW finding; Restricted hash -> CONTRADICTED HIGH finding."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # F2: Unknown image
        unreg_png = make_solid_png((100, 150, 200))
        files = {'file': ('unreg.png', unreg_png, 'image/png')}
        data1 = {'title': 'Unregistered Asset Test', 'content_type': 'image'}
        res1 = await client.post('/api/reviews/upload', data=data1, files=files)
        assert res1.status_code == 200
        findings1 = res1.json()['findings']
        unreg_finding = next((f for f in findings1 if f.get('type') == 'unregistered_asset'), None)
        assert unreg_finding is not None
        assert unreg_finding['status'] == 'NEEDS_REVIEW'

        # F3: Register an asset as RESTRICTED
        restr_png = make_solid_png((200, 100, 50))
        restr_hash = compute_sha256(restr_png)
        await client.post(
            '/api/brand-assets',
            json={
                'name': 'Embargoed Promo Art',
                'content_hash': restr_hash,
                'approval_status': 'RESTRICTED',
                'license_status': 'RESTRICTED',
                'license_notes': 'Hold until official press release.'
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )

        files2 = {'file': ('restr.png', restr_png, 'image/png')}
        data2 = {'title': 'Restricted Asset Test', 'content_type': 'image'}
        res2 = await client.post('/api/reviews/upload', data=data2, files=files2)
        assert res2.status_code == 200
        findings2 = res2.json()['findings']
        restr_finding = next((f for f in findings2 if f.get('type') == 'registered_asset_restricted'), None)
        assert restr_finding is not None
        assert restr_finding['status'] == 'CONTRADICTED'
        assert restr_finding['severity'] == 'HIGH'

@pytest.mark.asyncio
async def test_palette_and_contrast_compliance():
    """Test D & E: Unapproved red image -> palette mismatch finding with measured values; High vs low contrast."""
    red_png = make_solid_png((255, 0, 0))
    res_red = analyze_image_compliance(red_png, approved_palette=['#2dd4bf', '#0f172a'])
    palette_finding = next((f for f in res_red['visual_findings'] if f.get('category') == 'visual_palette'), None)
    assert palette_finding is not None
    assert palette_finding['status'] == 'CONTRADICTED'
    assert 'Measured:' in palette_finding.get('source_excerpt', '')

    low_contrast_png = make_two_color_png((255, 255, 255), (240, 240, 240))
    res_low = analyze_image_compliance(low_contrast_png, approved_palette=['#ffffff'])
    contrast_finding = next((f for f in res_low['visual_findings'] if f.get('category') == 'visual_accessibility'), None)
    assert contrast_finding is not None
    assert contrast_finding['status'] == 'NEEDS_REVIEW'
    assert contrast_finding['type'] == 'contrast_pair_indeterminate'
    assert 'not an automated WCAG text-contrast determination' in contrast_finding['explanation']

    high_contrast_png = make_two_color_png((255, 255, 255), (0, 0, 0))
    res_high = analyze_image_compliance(high_contrast_png, approved_palette=['#ffffff', '#000000'])
    high_contrast_finding = next((f for f in res_high['visual_findings'] if f.get('category') == 'visual_accessibility'), None)
    assert high_contrast_finding is not None
    assert high_contrast_finding['status'] == 'NEEDS_REVIEW'


@pytest.mark.asyncio
async def test_visual_compliance_complete_workflow_and_disposition_persistence():
    """Verify visual compliance: upload-size guard, honest OCR limitation, palette/contrast evidence, reviewer disposition persistence, and asset deletion."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        # 1. Upload-size enforcement (HTTP 413)
        oversized_data = b"x" * (10 * 1024 * 1024 + 1024)
        files_huge = {'file': ('huge.png', oversized_data, 'image/png')}
        data_huge = {'title': 'Huge File', 'content_type': 'image'}
        res_huge = await client.post('/api/reviews/upload', data=data_huge, files=files_huge)
        assert res_huge.status_code == 413
        assert "exceeds maximum" in res_huge.json()["detail"].lower()

        # 2. Upload valid image
        test_png = make_two_color_png((255, 0, 0), (240, 240, 240))
        files = {'file': ('banner.png', test_png, 'image/png')}
        data = {'title': 'Hero Banner', 'content_type': 'image'}
        upload_res = await client.post('/api/reviews/upload', data=data, files=files)
        assert upload_res.status_code == 200
        review = upload_res.json()
        findings = review['findings']

        # 3. Honest OCR-not-analysed finding exists
        ocr_f = next((f for f in findings if f.get('type') == 'ocr_unsupported'), None)
        assert ocr_f is not None
        assert ocr_f['status'] == 'NEEDS_REVIEW'
        assert 'Automated text extraction from raster graphics is not configured' in ocr_f['explanation']

        # 4. Actual palette evidence contains measured colors
        palette_f = next((f for f in findings if f.get('category') == 'visual_palette'), None)
        assert palette_f is not None
        assert 'Dominant image colour' in palette_f.get('explanation', '') and 'Nearest approved colour' in palette_f.get('explanation', '')

        # 5. Reviewer applies disposition to finding and verifies persistence
        unreg_f = next((f for f in findings if f.get('type') == 'unregistered_asset'), None)
        assert unreg_f is not None
        f_id = unreg_f['id']
        rev_id = review['id']

        disp_res = await client.post(
            f'/api/reviews/{rev_id}/findings/{f_id}/actions',
            json={'action': 'dismiss', 'reason': 'Verified by Creative Director for one-off campaign.'},
            headers={'X-Demo-Role': 'reviewer'}
        )
        assert disp_res.status_code == 200
        disp_finding = next(f for f in disp_res.json()['findings'] if f['id'] == f_id)
        assert disp_finding['disposition'] == 'DISMISSED'

        # Fetch review again to verify persistence across reloads
        reloaded = (await client.get(f'/api/reviews/{rev_id}')).json()
        persisted_finding = next(f for f in reloaded['findings'] if f['id'] == f_id)
        assert persisted_finding['disposition'] == 'DISMISSED'
        assert persisted_finding['disposition_reason'] == 'Verified by Creative Director for one-off campaign.'

        # 6. Asset registration and HTTP 204 deletion
        asset_res = await client.post(
            '/api/brand-assets',
            json={
                'name': 'Temporary Asset',
                'asset_type': 'image',
                'content_hash': compute_sha256(test_png),
                'approval_status': 'APPROVED',
                'license_status': 'APPROVED'
            },
            headers={'X-Demo-Role': 'brand_admin'}
        )
        assert asset_res.status_code == 201
        asset_id = asset_res.json()['id']

        del_res = await client.delete(f'/api/brand-assets/{asset_id}', headers={'X-Demo-Role': 'brand_admin'})
        assert del_res.status_code == 204
        assert del_res.text == ""
