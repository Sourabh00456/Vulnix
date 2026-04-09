from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.db.database import get_db
from app.db import models
from app.core.security import get_current_user

router = APIRouter(prefix="/v1/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id
    
    total_scans = db.query(models.Scan).filter(models.Scan.user_id == user_id).count()
    
    # We join vulnerabilities with scans to only count vulnerabilities matching this user's scans
    vulns = db.query(models.Vulnerability.severity, func.count(models.Vulnerability.id)).join(
        models.Scan, models.Vulnerability.scan_id == models.Scan.id
    ).filter(
        models.Scan.user_id == user_id
    ).group_by(models.Vulnerability.severity).all()
    
    severity_counts = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0
    }
    
    for severity, count in vulns:
        if severity and severity.upper() in severity_counts:
            severity_counts[severity.upper()] = count
            
    return {
        "total_scans": total_scans,
        "severities": severity_counts
    }

@router.get("/recent")
def get_recent_scans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    recent_scans = db.query(models.Scan).filter(
        models.Scan.user_id == current_user.id
    ).order_by(models.Scan.created_at.desc()).limit(10).all()
    
    # We might want to construct a neat payload.
    payload = []
    for s in recent_scans:
        payload.append({
            "id": s.id,
            "target_url": s.target_url,
            "status": s.status,
            "threat_score": s.threat_score,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return payload
