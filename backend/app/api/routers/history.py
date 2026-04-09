from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.scan import ScanResponse
from app.db.database import get_db
from app.db import models
from app.core.security import get_current_user

router = APIRouter(prefix="/v1/history", tags=["History"])

@router.get("", response_model=List[ScanResponse])
def get_history(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    scans = db.query(models.Scan).filter(models.Scan.user_id == current_user.id).all()
    return scans
