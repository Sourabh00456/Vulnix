from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr          # validates format: must be a real email
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class Token(BaseModel):
    access_token: str
    token_type: str


class UserProfile(BaseModel):
    id: int
    email: str
    plan_type: str
    verification_token: Optional[str] = None   # nullable — DB may not have it yet

    model_config = {"from_attributes": True}   # replaces orm_mode in Pydantic v2
