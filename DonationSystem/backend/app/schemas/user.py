"""User schemas — request/response models."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ── Request ────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=100)
    identity_number: str | None = Field(None, max_length=20)
    phone: str | None = Field(None, max_length=20)
    tax_consent: bool = False


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserUpdateRequest(BaseModel):
    name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=20)
    identity_number: str | None = Field(None, max_length=20)


class TaxConsentRequest(BaseModel):
    tax_consent: bool


class PasswordResetRequest(BaseModel):
    email: EmailStr


class UserStatusUpdateRequest(BaseModel):
    is_active: bool
    reason: str | None = None


# ── Response ───────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    phone: str | None
    has_identity_number: bool = False
    tax_consent: bool
    role: str = "user"
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 1440


class UserMinimal(BaseModel):
    """Compact user info embedded in donation/admin responses."""
    id: UUID
    email: str
    name: str

    model_config = {"from_attributes": True}
