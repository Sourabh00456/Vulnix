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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Belt-and-suspenders: also inject CORS headers at the raw response level
# so preflight OPTIONS requests are always handled correctly
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        from fastapi.responses import Response as FastAPIResponse
        response = FastAPIResponse()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

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
