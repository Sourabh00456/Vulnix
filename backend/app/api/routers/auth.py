from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, Token
from app.db.database import get_db
from app.db import models
from app.core import security
from fastapi import HTTPException
from app.core.rate_limiter import limiter

router = APIRouter(prefix="/v1/auth", tags=["Auth"])

@router.post("/register", response_model=Token)
@limiter.limit("5/hour")
def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pass = security.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pass)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create Default Organization inherently tied to user (MVP Single-tenant model)
    default_org = models.Organization(name=f"{user.email.split('@')[0]}'s Organization", owner_id=new_user.id)
    db.add(default_org)
    db.commit()
    db.refresh(default_org)
    
    # Update user association back to org
    new_user.org_id = default_org.id
    db.commit()
    
    access_token = security.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access_token = security.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
