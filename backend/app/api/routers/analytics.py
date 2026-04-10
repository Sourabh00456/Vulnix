from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta
from typing import List

from app.db.database import get_db
from app.db import models
from app.core.security import get_current_user

router = APIRouter(prefix="/v1/analytics", tags=["Analytics"])


@router.get("")
def get_analytics(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id
    since = datetime.utcnow() - timedelta(days=30)

    # --- 1. Daily scan volume over last 30 days ---
    daily_scans_raw = (
        db.query(
            cast(models.Scan.created_at, Date).label("day"),
            func.count(models.Scan.id).label("count")
        )
        .filter(
            models.Scan.user_id == user_id,
            models.Scan.created_at >= since
        )
        .group_by(cast(models.Scan.created_at, Date))
        .order_by(cast(models.Scan.created_at, Date))
        .all()
    )

    # Build a full 30-day series filling in 0s for missing days
    date_map = {str(row.day): row.count for row in daily_scans_raw}
    scan_trend = []
    for i in range(30):
        day = (datetime.utcnow() - timedelta(days=29 - i)).strftime("%Y-%m-%d")
        scan_trend.append({"date": day, "scans": date_map.get(day, 0)})

    # --- 2. Severity breakdown (all time) ---
    severity_raw = (
        db.query(
            models.Vulnerability.severity,
            func.count(models.Vulnerability.id).label("count")
        )
        .join(models.Scan, models.Vulnerability.scan_id == models.Scan.id)
        .filter(models.Scan.user_id == user_id)
        .group_by(models.Vulnerability.severity)
        .all()
    )
    severity_breakdown = [
        {"severity": row.severity, "count": row.count}
        for row in severity_raw
    ]

    # --- 3. Top 10 most vulnerable endpoints ---
    top_endpoints_raw = (
        db.query(
            models.Vulnerability.endpoint,
            func.count(models.Vulnerability.id).label("vuln_count")
        )
        .join(models.Scan, models.Vulnerability.scan_id == models.Scan.id)
        .filter(models.Scan.user_id == user_id)
        .group_by(models.Vulnerability.endpoint)
        .order_by(func.count(models.Vulnerability.id).desc())
        .limit(10)
        .all()
    )
    top_endpoints = [
        {"endpoint": row.endpoint, "count": row.vuln_count}
        for row in top_endpoints_raw
    ]

    # --- 4. Scan status breakdown ---
    status_raw = (
        db.query(
            models.Scan.status,
            func.count(models.Scan.id).label("count")
        )
        .filter(models.Scan.user_id == user_id)
        .group_by(models.Scan.status)
        .all()
    )
    status_breakdown = [
        {"status": row.status, "count": row.count}
        for row in status_raw
    ]

    # --- 5. Avg threat score over last 30 days ---
    avg_score = (
        db.query(func.avg(models.Scan.threat_score))
        .filter(
            models.Scan.user_id == user_id,
            models.Scan.created_at >= since,
            models.Scan.threat_score.isnot(None)
        )
        .scalar()
    )

    return {
        "scan_trend": scan_trend,
        "severity_breakdown": severity_breakdown,
        "top_endpoints": top_endpoints,
        "status_breakdown": status_breakdown,
        "avg_threat_score": round(float(avg_score), 1) if avg_score else None,
    }
