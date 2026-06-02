"""Subscription schemas — request/response models."""

from datetime import date, datetime
from uuid import UUID
from decimal import Decimal

from pydantic import BaseModel, Field


# ── Request ────────────────────────────────────────────────────

class CreateSubscriptionRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = "TWD"
    frequency: str = Field(..., pattern=r"^(monthly|quarterly|yearly)$")
    payment_method: str = Field(default="credit_card", pattern=r"^(credit_card|postal|cash)$")
    payment_method_id: str | None = None  # Stripe PaymentMethod ID (optional for non-credit_card)
    total_cycles: int = Field(default=0, ge=0)  # 0 = indefinite
    purpose: str | None = None
    # Guest (anonymous) fields
    guest_email: str | None = None
    guest_name: str | None = None


class UpdateSubscriptionRequest(BaseModel):
    amount: Decimal | None = Field(None, gt=0, decimal_places=2)
    frequency: str | None = Field(None, pattern=r"^(monthly|quarterly|yearly)$")
    total_cycles: int | None = Field(None, ge=0)


class CancelSubscriptionRequest(BaseModel):
    reason: str | None = None


# ── Response ───────────────────────────────────────────────────

class SubscriptionResponse(BaseModel):
    id: UUID
    amount: Decimal
    frequency: str
    status: str
    next_billing_date: date
    total_cycles: int
    cycles_completed: int
    consecutive_failures: int = 0
    purpose: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateSubscriptionResponse(BaseModel):
    id: UUID
    amount: Decimal
    frequency: str
    status: str = "active"
    next_billing_date: date
    total_cycles: int
    cycles_completed: int = 1
    created_at: datetime


class UpdateSubscriptionResponse(BaseModel):
    id: UUID
    amount: Decimal | None
    frequency: str | None
    status: str
    updated_at: datetime


class PauseResumeResponse(BaseModel):
    id: UUID
    status: str
    next_billing_date: date | None = None


class CancelSubscriptionResponse(BaseModel):
    id: UUID
    status: str = "cancelled"
    cancelled_at: datetime


class SubscriptionHistoryItem(BaseModel):
    donation_id: UUID
    amount: Decimal
    status: str
    billing_date: date
    receipt_number: str | None
    failure_reason: str | None = None

    model_config = {"from_attributes": True}
