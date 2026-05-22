"""Payment schemas — request/response models."""

from datetime import datetime
from uuid import UUID
from decimal import Decimal

from pydantic import BaseModel, Field


# ── Request ────────────────────────────────────────────────────

class CreditCardPaymentRequest(BaseModel):
    donation_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = "TWD"
    payment_method_id: str  # Stripe PaymentMethod ID (tokenized by frontend)


class PostalPaymentRequest(BaseModel):
    donation_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)


class CashPaymentRequest(BaseModel):
    donation_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    location: str
    staff_id: UUID
    notes: str | None = None


class CashConfirmRequest(BaseModel):
    pass  # No body needed for confirm action


# ── Response ───────────────────────────────────────────────────

class CreditCardPaymentResponse(BaseModel):
    payment_intent_id: str
    client_secret: str
    status: str


class PostalPaymentResponse(BaseModel):
    draft_id: UUID
    draft_number: str
    postal_account: str
    amount: Decimal
    status: str = "generated"
    download_url: str
    created_at: datetime


class CashPaymentResponse(BaseModel):
    cash_id: UUID
    status: str = "pending"
    received_at: datetime | None = None
    created_at: datetime


class CashConfirmResponse(BaseModel):
    cash_id: UUID
    status: str = "confirmed"
    received_at: datetime


class PaymentStatusResponse(BaseModel):
    payment_id: UUID
    donation_id: UUID
    payment_gateway: str
    amount: Decimal
    status: str
    gateway_transaction_id: str | None
    webhook_received: bool
    created_at: datetime

    model_config = {"from_attributes": True}
