from pydantic import BaseModel
from typing import List, Optional, Any


class ScanRequest(BaseModel):
    target_url: str
    scan_type: Optional[str] = "quick"
    schedule_type: Optional[str] = "none"
    is_dry_run: bool = False


class ScanResponse(BaseModel):
    id: str
    target_url: str
    status: str
    progress: int
    current_step: str

    model_config = {"from_attributes": True}  # Pydantic v2 ORM mode


class VulnerabilitySchema(BaseModel):
    type: Optional[str] = ""
    severity: Optional[str] = "LOW"
    source: Optional[str] = ""
    endpoint: Optional[str] = ""
    description: Optional[str] = ""
    fix: Optional[str] = ""
    confidence: Optional[float] = 1.0
    raw_data: Optional[Any] = None

    model_config = {"from_attributes": True}


class ScanReport(BaseModel):
    id: str
    target_url: str
    status: str
    progress: int
    current_step: str
    threat_score: Optional[float] = None
    logs: List[dict] = []
    vulnerabilities: List[VulnerabilitySchema] = []

    model_config = {"from_attributes": True}
