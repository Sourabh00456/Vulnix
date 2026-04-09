import pytest
import httpx
import websockets
import json
import asyncio

API_BASE = "http://localhost:8000/v1"
WS_BASE = "ws://localhost:8000/v1"

@pytest.mark.asyncio
async def test_end_to_end_scan_flow():
    # 1. Register User & Ensure Login
    async with httpx.AsyncClient() as client:
        # Avoid duplicate mock users
        test_email = "test_tester@example.com"
        password = "strongpassword123"
        
        reg_res = await client.post(f"{API_BASE}/users/register", json={
            "email": test_email,
            "password": password
        })
        # If already exists, just login
        if reg_res.status_code == 400:
            pass
            
        login_res = await client.post(f"{API_BASE}/users/login", data={
            "username": test_email,
            "password": password
        })
        
        assert login_res.status_code == 200, "User Authentication failed"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Add Target triggers Scan (Mock Bypass for Token Verification is handled cleanly in routers)
        scan_req = await client.post(f"{API_BASE}/scans", json={
            "target_url": "example.com"
        }, headers=headers)
        
        assert scan_req.status_code == 200, f"Scan request failed: {scan_req.text}"
        scan_id = scan_req.json()["id"]

        # 3. Stream WebSocket Progress
        # We wait incrementally till it hits 100 or disconnects
        completed = False
        async with websockets.connect(f"{WS_BASE}/scans/{scan_id}/ws") as ws:
            while True:
                try:
                    response = await asyncio.wait_for(ws.recv(), timeout=30.0)
                    data = json.loads(response)
                    if data["type"] == "progress":
                        assert "progress" in data
                    if data["type"] == "completed":
                        completed = True
                        break
                    if data["type"] == "error" and "CRITICAL" in data.get("log", ""):
                        pytest.fail(f"Pipeline crashed remotely: {data['log']}")
                except asyncio.TimeoutError:
                    break
                    
        assert completed, "WebSocket stream timed out or did not return completed."
        
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
