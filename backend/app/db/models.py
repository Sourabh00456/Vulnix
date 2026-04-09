from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    plan_type = Column(String, default="free") # free, pro
    verification_token = Column(String, default=lambda: str(uuid.uuid4()))
    
    scans = relationship("Scan", back_populates="owner")

class Scan(Base):
    __tablename__ = "scans"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    target_url = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    progress = Column(Integer, default=0)
    current_step = Column(String, default="queued")
    status = Column(String, default="queued")  # queued, running, completed, failed
    threat_score = Column(Float, nullable=True)
    logs = Column(String, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="scans")
    vulnerabilities = relationship("Vulnerability", back_populates="scan")
    scan_logs = relationship("ScanLog", back_populates="scan")

class Vulnerability(Base):
    __tablename__ = "vulnerabilities"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String, ForeignKey("scans.id"))
    
    type = Column(String) # e.g. SQL_INJECTION
    severity = Column(String) # LOW, MEDIUM, HIGH, CRITICAL
    source = Column(String) # NMAP, ZAP, AI
    endpoint = Column(String)
    description = Column(String)
    fix = Column(String)
    confidence = Column(Float, default=1.0)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    # Using String if SQLite/fallback, or JSONB if strictly Postgres:
    raw_data = Column(JSONB) 
    
    scan = relationship("Scan", back_populates="vulnerabilities")

class ScanLog(Base):
    __tablename__ = "scan_logs"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String, ForeignKey("scans.id"))
    step = Column(String)
    message = Column(String)
    is_error = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    scan = relationship("Scan", back_populates="scan_logs")
