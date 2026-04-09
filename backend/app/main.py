import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.app.core.config import settings
from backend.app.db.database import engine
from backend.app.db import models
from backend.app.core.rate_limiter import limiter

from backend.app.api.routers import scans, users, history

# Initialize logging structure
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Auto-migrate
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

app.include_router(scans.router)
app.include_router(users.router)
app.include_router(history.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
