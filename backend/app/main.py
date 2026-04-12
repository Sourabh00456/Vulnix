import logging
import os
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.db.database import engine, run_migrations
from app.db import models
from app.core.rate_limiter import limiter

from app.api.routers import scans, auth, history, dashboard, billing, analytics

# Initialize logging structure
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Run schema migrations first (adds missing columns to existing tables)
run_migrations()
# Then create any entirely new tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)
app.state.limiter = limiter

ENV = os.getenv("ENV", "production")

# Single source-of-truth for CORS.
# allow_origins=["*"] cannot be combined with allow_credentials=True,
# so we build the list explicitly from the env var + known Vercel domains.
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "https://vulnix-six.vercel.app"
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://vulnix.*\.vercel\.app",  # covers all preview URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error(f"Global Exception on {request.url.path}: {exc}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},  # Return real error in dev; safe enough for debugging
    )

app.include_router(scans.router)
app.include_router(auth.router)
app.include_router(history.router)
app.include_router(dashboard.router)
app.include_router(billing.router)
app.include_router(analytics.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
