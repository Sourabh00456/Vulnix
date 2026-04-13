import json
import logging
import requests
import socket
import urllib.parse
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.schemas.scan import ScanRequest, ScanResponse, ScanReport
from app.db.database import get_db
from app.db import models
from app.core.security import get_current_user_optional, get_current_user
from app.core.rate_limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/scans", tags=["Scans"])


def verify_target(target_url: str, token: Optional[str]) -> bool:
    """Check domain ownership via /.well-known/security.txt. Non-blocking — returns False on any error."""
    if not token:
        return False
    try:
        parsed = urllib.parse.urlparse(target_url)
        base_url = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme else f"http://{parsed.netloc}"
        res = requests.get(f"{base_url}/.well-known/security.txt", timeout=3)
        if res.status_code == 200 and f"breachme-verify={token}" in res.text:
            return True
        return False
    except Exception:
        return False


@router.post("", response_model=ScanResponse)
@limiter.limit("5/minute")
def create_scan(
    request: Request,
    req: ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    logger.info(f"[SCAN] Create request from user={current_user.email} target={req.target_url} type={req.scan_type}")

    # ── URL validation ────────────────────────────────────────────────────────
    parsed_target = urllib.parse.urlparse(req.target_url)
    if parsed_target.scheme not in ["http", "https"] or not parsed_target.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL. Must include http:// or https://")

    # ── Free plan daily limit ─────────────────────────────────────────────────
    if current_user.plan_type == "free":
        try:
            today_scans = db.query(models.Scan).filter(
                models.Scan.user_id == current_user.id,
                func.date(models.Scan.created_at) == date.today(),
            ).count()
            if today_scans >= 3:
                raise HTTPException(status_code=429, detail="Free plan: 3 scans/day limit reached.")
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"[SCAN] Quota check failed (non-fatal): {e}")

    # ── Scheduling ────────────────────────────────────────────────────────────
    next_run = None
    if req.schedule_type == "daily":
        next_run = datetime.utcnow() + timedelta(days=1)
    elif req.schedule_type == "weekly":
        next_run = datetime.utcnow() + timedelta(days=7)

    # ── Create scan record ────────────────────────────────────────────────────
    try:
        db_scan = models.Scan(
            target_url=req.target_url,
            user_id=current_user.id,
            scan_type=req.scan_type,
            schedule_type=req.schedule_type,
            next_run_at=next_run,
            progress=0,
            current_step="queued",
            status="queued"
        )
        db.add(db_scan)
        db.commit()
        db.refresh(db_scan)
        logger.info(f"[SCAN] Created scan id={db_scan.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"[SCAN] DB insert failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create scan record")

    # ── Dispatch mechanism ────────────────────────────────────────────────────
    dispatched = False
    
    # Try Celery first in production
    if settings.ENVIRONMENT != "development":
        try:
            from app.tasks.scan_tasks import execute_scan
            execute_scan.delay(db_scan.id, req.target_url)
            logger.info(f"[SCAN] Dispatched to Celery: scan_id={db_scan.id}")
            dispatched = True
        except Exception as e:
            logger.error(f"[SCAN] Celery dispatch failed: {e}")

    # Dev fallback or local execution if Celery failed
    if not dispatched and settings.ENVIRONMENT == "development":
        logger.info(f"[SCAN] Using BackgroundTasks fallback for scan_id={db_scan.id}")
        from app.services.scan_orchestrator import run_synchronous_orchestrator
        background_tasks.add_task(run_synchronous_orchestrator, db_scan.id, req.target_url, req.scan_type)
        dispatched = True

    return db_scan


@router.get("/{scan_id}", response_model=ScanReport)
def get_scan(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    vuls = db.query(models.Vulnerability).filter(models.Vulnerability.scan_id == scan_id).all()

    logs_data = []
    try:
        logs_data = json.loads(scan.logs) if scan.logs else []
    except Exception:
        logs_data = []

    return {
        "id": scan.id,
        "target_url": scan.target_url,
        "status": scan.status,
        "progress": scan.progress,
        "current_step": scan.current_step,
        "threat_score": scan.threat_score,
        "logs": logs_data,
        "vulnerabilities": vuls,
    }


@router.get("/{scan_id}/report", response_model=dict)
def get_scan_report(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    vulnerabilities = db.query(models.Vulnerability).filter(models.Vulnerability.scan_id == scan_id).all()
    return {"scan": scan, "vulnerabilities": vulnerabilities}
