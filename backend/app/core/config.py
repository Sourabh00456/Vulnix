import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Forensic Intelligence API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/forensic_intelligence")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    ZAP_URL: str = os.getenv("ZAP_URL", "http://localhost:8080")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "SUPER_SECRET_JWT_KEY_FOR_MVP")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    STRIPE_API_KEY: str = os.getenv("STRIPE_API_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

settings = Settings()
