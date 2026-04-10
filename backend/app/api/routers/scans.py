import json
import requests
import socket
import urllib.parse
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Request, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.schemas.scan import ScanRequest, ScanResponse, ScanReport
from app.db.database import get_db
from app.db import models
from app.core.security import get_current_user_optional, get_current_user
from app.core.rate_limiter import limiter
from app.tasks.scan_tasks import execute_scan
from app.core.redis_client import get_async_redis

router = APIRouter(prefix="/v1/scans", tags=["Scans"])

def verify_target(target_url: str, token: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(target_url)
        base_url = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme else f"http://{parsed.netloc}"
        
        # 1. HTTP Verification
        try:
            res = requests.get(f"{base_url}/.well-known/security.txt", timeout=3)
            if res.status_code == 200 and f"breachme-verify={token}" in res.text:
                return True
        except:
            pass
            
        # 2. DNS Verification (Simple mock check for MVP, or you can implement dnspython here)
        # Using dnspython for TXT isn't installed natively, so HTTP is the primary robust method.
        # Fallback to false if HTTP fails.
        return False
    except:
        return False

@router.post("", response_model=ScanResponse)
@limiter.limit("5/minute")
def create_scan(request: Request, req: ScanRequest, db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required for SaaS features.")
        
    # Input Sanitization and Schema validation
    parsed_target = urllib.parse.urlparse(req.target_url)
    if not parsed_target.scheme in ["http", "https"] or not parsed_target.netloc:
        raise HTTPException(status_code=400, detail="Invalid target URL schema. Must include http:// or https://")

    # SaaS Limit Check
    if current_user.plan_type == "free":
        today_scans = db.query(models.Scan).filter(
            models.Scan.user_id == current_user.id,
            func.date(models.Scan.created_at) == date.today()
        ).count()
        
        if today_scans >= 3:
            raise HTTPException(status_code=429, detail="Free plan limited to 3 scans per day.")

    # Target Verification Check
    # (Commented out in local development to prevent blocking yourself, but the logic is fully wired)
    is_verified = verify_target(req.target_url, current_user.verification_token)
    if not is_verified:
         # raise HTTPException(status_code=403, detail="Target verification failed. Add breachme-verify token to /.well-known/security.txt")
         pass # Allow bypass for Hackathon/MVP demo

    next_run = None
    if req.schedule_type == "daily":
        next_run = datetime.utcnow() + timedelta(days=1)
    elif req.schedule_type == "weekly":
        next_run = datetime.utcnow() + timedelta(days=7)

    db_scan = models.Scan(
        target_url=req.target_url, 
        user_id=current_user.id,
        scan_type=req.scan_type,
        schedule_type=req.schedule_type,
        next_run_at=next_run,
        progress=0,
        current_step="queued"
    )
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)
    
    # Send to celery
    execute_scan.delay(db_scan.id, req.target_url)
    
    return db_scan

@router.websocket("/{scan_id}/ws")
async def websocket_endpoint(websocket: WebSocket, scan_id: str):
    await websocket.accept()
    redis = await get_async_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"scan_{scan_id}")
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                await websocket.send_json(data)
                
                if data["type"] == "completed" or data["type"] == "error":
                    break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"scan_{scan_id}")
        await redis.close()

@router.get("/{scan_id}", response_model=ScanReport)
def get_scan(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    vuls = db.query(models.Vulnerability).filter(models.Vulnerability.scan_id == scan_id).all()
    
    logs_data = []
    try:
        logs_data = json.loads(scan.logs) if scan.logs else []
    except:
        pass
        
    return {
        "id": scan.id,
        "target_url": scan.target_url,
        "status": scan.status,
        "progress": scan.progress,
        "current_step": scan.current_step,
        "threat_score": scan.threat_score,
        "logs": logs_data,
        "vulnerabilities": vuls
    }

@router.get("/{scan_id}/report", response_model=dict)
def get_scan_report(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    vulnerabilities = db.query(models.Vulnerability).filter(models.Vulnerability.scan_id == scan_id).all()
    return {
        "scan": scan,
        "vulnerabilities": vulnerabilities
    }
