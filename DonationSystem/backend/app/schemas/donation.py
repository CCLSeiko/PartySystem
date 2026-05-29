"""Donation schemas — request/response models."""

from datetime import datetime
from uuid import UUID
from decimal import Decimal

from pydantic import BaseModel, Field


# ── Request ────────────────────────────────────────────────────

class CreateDonationRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = "TWD"
    purpose: str | None = None
    payment_method: str = Field(..., pattern=r"^(credit_card|postal|cash)$")
    is_recurring: bool = False
    # Guest (anonymous) fields
    guest_email: str | None = None
    guest_name: str | None = None


class DonationQueryParams(BaseModel):
    status: str | None = None
    payment_method: str | None = None
    purpose: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)


class CancelDonationRequest(BaseModel):
    reason: str | None = None


class AdminDonationQueryParams(BaseModel):
    status: str | None = None
    payment_method: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_recurring: bool | None = None
    user_id: str | None = None
    q: str | None = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=200)


# ── Response ───────────────────────────────────────────────────

class DonationListResponse(BaseModel):
    id: UUID
    amount: Decimal
    currency: str
    purpose: str | None
    payment_method: str
    status: str
    is_recurring: bool
    receipt_number: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentInfo(BaseModel):
    id: UUID
    payment_gateway: str
    gateway_transaction_id: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DonationDetailResponse(BaseModel):
    id: UUID
    amount: Decimal
    currency: str
    purpose: str | None
    payment_method: str
    status: str
    is_recurring: bool
    subscription_id: UUID | None
    receipt_number: str | None
    tax_deductible: bool
    payment: PaymentInfo | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateDonationResponse(BaseModel):
    id: UUID
    amount: Decimal
    currency: str
    status: str
    payment_method: str
    payment_url: str | None = None
    created_at: datetime


class CancelDonationResponse(BaseModel):
    id: UUID
    status: str = "cancelled"
    cancelled_at: datetime


class AdminDonationItem(BaseModel):
    id: UUID
    user: dict | None  # {id, email, name} or None for anonymous
    amount: Decimal
    purpose: str | None
    payment_method: str
    status: str
    is_recurring: bool
    receipt_number: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
