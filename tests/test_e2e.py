import pytest
import httpx
import websockets
import json
import asyncio

API_BASE = "https://vulnix.up.railway.app/v1"
WS_BASE = "wss://vulnix.up.railway.app/v1"

@pytest.mark.asyncio
async def test_end_to_end_scan_flow():
    # 1. Register User & Ensure Login
    async with httpx.AsyncClient() as client:
        # Avoid duplicate mock users
        test_email = "test_tester@example.com"
        password = "strongpassword123"
        
        reg_res = await client.post(f"{API_BASE}/auth/register", json={
            "email": test_email,
            "password": password
        })
        # If already exists, just login
        if reg_res.status_code == 400:
            pass
            
        login_res = await client.post(f"{API_BASE}/auth/login", data={
            "username": test_email,
            "password": password
        })
        
        assert login_res.status_code == 200, "User Authentication failed"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Add Target triggers Scan (Mock Bypass for Token Verification is handled cleanly in routers)
        scan_req = await client.post(f"{API_BASE}/scans", json={
            "target_url": "https://example.com"
        }, headers=headers)
        
        assert scan_req.status_code == 200, f"Scan request failed: {scan_req.text}"
        scan_id = scan_req.json()["id"]

        # 3. Wait a moment for scan to complete (since backend uses async processing)
        import asyncio
        await asyncio.sleep(5)
        
        # 4. Validate Normalized Format!
        report_res = await client.get(f"{API_BASE}/scans/{scan_id}", headers=headers)
        assert report_res.status_code == 200
        report = report_res.json()
        
        # Strict normalizations validation
        vulns = report["vulnerabilities"]
        assert isinstance(vulns, list), "Vulnerabilities must be an array"
        if len(vulns) > 0:
            v_spec = vulns[0]
            assert "type" in v_spec
            assert "severity" in v_spec
            assert "source" in v_spec
            assert "fix" in v_spec
            assert "confidence" in v_spec
