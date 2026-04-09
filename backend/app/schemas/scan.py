from pydantic import BaseModel
from typing import List, Optional, Any

class ScanRequest(BaseModel):
    target_url: str

class ScanResponse(BaseModel):
    id: str
    target_url: str
    status: str
    progress: int
    current_step: str

class VulnerabilitySchema(BaseModel):
    type: str
    severity: str
    source: str
    endpoint: str
    description: Optional[str]
    fix: str
    confidence: float
    raw_data: Any

class ScanReport(BaseModel):
    id: str
    target_url: str
    status: str
    progress: int
    current_step: str
    threat_score: Optional[float]
    logs: List[dict]
    vulnerabilities: List[VulnerabilitySchema]
