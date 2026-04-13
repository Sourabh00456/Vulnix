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

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── DB bootstrap ─────────────────────────────────────────────────────────────
run_migrations()
models.Base.metadata.create_all(bind=engine)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Vulnix — AI-powered vulnerability scanning SaaS",
    version="1.0.0",
)
app.state.limiter = limiter

_default_origins = "https://vulnix-six.vercel.app"
ALLOWED_ORIGINS: list[str] = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

if settings.ENVIRONMENT == "development":
    dev_origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"]
    for origin in dev_origins:
        if origin not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(origin)

logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=None if settings.ENVIRONMENT == "development" else r"https://vulnix.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

# ── Rate limit handler ────────────────────────────────────────────────────────
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(scans.router)
app.include_router(auth.router)
app.include_router(history.router)
app.include_router(dashboard.router)
app.include_router(billing.router)
app.include_router(analytics.router)

# ── Root / Health ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status": "API running",
        "version": "1.0.0",
        "docs": "/docs",
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}
