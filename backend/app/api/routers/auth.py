import logging
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.schemas.user import UserCreate, Token
from app.db.database import get_db
from app.db import models
from app.core import security
from app.core.rate_limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/auth", tags=["Auth"])


# ── GET /register — browser-friendly info endpoint ───────────────────────────
# Prevents "Method Not Allowed" when someone navigates to /v1/auth/register
# directly in a browser or hit it via GET (e.g. a misconfigured redirect).
@router.get("/register")
def register_info():
    return {
        "message": "Use POST to register",
        "method": "POST",
        "endpoint": "/v1/auth/register",
        "body": {"email": "string", "password": "string"},
    }


# ── POST /register ────────────────────────────────────────────────────────────
@router.post("/register", response_model=Token)
@limiter.limit("5/hour")
def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    logger.info(f"Register attempt — email: {user.email}")

    # Email uniqueness check
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        logger.warning(f"Register failed — email already registered: {user.email}")
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        # Create user
        hashed_pass = security.get_password_hash(user.password)
        new_user = models.User(email=user.email, hashed_password=hashed_pass)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Create default org (single-tenant MVP)
        org_name = f"{user.email.split('@')[0]}'s Organization"
        default_org = models.Organization(name=org_name, owner_id=new_user.id)
        db.add(default_org)
        db.commit()
        db.refresh(default_org)

        # Link user → org
        new_user.org_id = default_org.id
        db.commit()

        access_token = security.create_access_token(data={"sub": new_user.email})
        logger.info(f"Register success — user created: {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Register error for {user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


# ── GET /login — browser-friendly info endpoint ───────────────────────────────
@router.get("/login")
def login_info():
    return {
        "message": "Use POST to log in",
        "method": "POST",
        "endpoint": "/v1/auth/login",
        "content_type": "application/x-www-form-urlencoded",
        "body": {"username": "your@email.com", "password": "string"},
    }


# ── POST /login ───────────────────────────────────────────────────────────────
@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    logger.info(f"Login attempt — email: {form_data.username}")

    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Login failed — bad credentials: {form_data.username}")
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = security.create_access_token(data={"sub": user.email})
    logger.info(f"Login success — user authenticated: {form_data.username}")
    return {"access_token": access_token, "token_type": "bearer"}
