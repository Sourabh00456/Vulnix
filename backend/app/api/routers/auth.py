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


# ── GET /register — browser info (prevents 405 when visited directly) ─────────
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
    logger.info(f"[REGISTER] Attempt — email: {user.email}")

    # ── Step 1: Email uniqueness ──────────────────────────────────────────────
    try:
        existing = db.query(models.User).filter(models.User.email == user.email).first()
    except Exception as e:
        logger.error(f"[REGISTER] DB query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error during lookup")

    if existing:
        logger.warning(f"[REGISTER] Email already registered: {user.email}")
        raise HTTPException(status_code=400, detail="Email already registered")

    # ── Step 2: Hash password ─────────────────────────────────────────────────
    try:
        hashed_pass = security.get_password_hash(user.password)
        logger.info(f"[REGISTER] Password hashed OK")
    except Exception as e:
        logger.error(f"[REGISTER] Hashing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Password processing error")

    # ── Step 3: Create user + org (single transaction) ────────────────────────
    try:
        # Create user
        new_user = models.User(email=user.email, hashed_password=hashed_pass)
        db.add(new_user)
        db.flush()  # assigns new_user.id without committing — stays in transaction
        logger.info(f"[REGISTER] User flushed with id={new_user.id}")

        # Create default org
        org_name = f"{user.email.split('@')[0]}'s Organization"
        default_org = models.Organization(name=org_name, owner_id=new_user.id)
        db.add(default_org)
        db.flush()  # assigns default_org.id
        logger.info(f"[REGISTER] Org flushed with id={default_org.id}")

        # Link user → org
        new_user.org_id = default_org.id

        # Single commit for the whole operation (atomic)
        db.commit()
        logger.info(f"[REGISTER] Transaction committed OK")

        # Capture values BEFORE refresh expires the attributes
        user_email = new_user.email

        db.refresh(new_user)
        logger.info(f"[REGISTER] User refreshed — email: {user_email}")

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[REGISTER] DB transaction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

    # ── Step 4: Issue JWT ─────────────────────────────────────────────────────
    try:
        access_token = security.create_access_token(data={"sub": user_email})
        logger.info(f"[REGISTER] JWT issued for {user_email}")
    except Exception as e:
        logger.error(f"[REGISTER] JWT creation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Token generation error")

    return {"access_token": access_token, "token_type": "bearer"}


# ── GET /login — browser info ─────────────────────────────────────────────────
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
    logger.info(f"[LOGIN] Attempt — email: {form_data.username}")

    try:
        user = db.query(models.User).filter(models.User.email == form_data.username).first()
    except Exception as e:
        logger.error(f"[LOGIN] DB query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error")

    if not user or not security.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"[LOGIN] Bad credentials for: {form_data.username}")
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    try:
        # Capture email before session expiry
        user_email = user.email
        access_token = security.create_access_token(data={"sub": user_email})
        logger.info(f"[LOGIN] Success — {user_email}")
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.error(f"[LOGIN] JWT creation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Token generation error")
