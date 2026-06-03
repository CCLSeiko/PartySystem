"""Maintenance schemas — request/response models for back-office donor management.

All endpoints in the maintenance router use these schemas for CRUD operations
on donors, donor accounts, and subscriptions.
"""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


# ── Donor ───────────────────────────────────────────────────────

class DonorCreateRequest(BaseModel):
    """Create a new donor user (sets role='user')."""
    name: str = Field(..., min_length=1, max_length=100)
    email: str | None = None
    phone: str | None = Field(None, max_length=20)
    phone_home: str | None = Field(None, max_length=20)
    phone_mobile: str | None = Field(None, max_length=20)
    phone_work: str | None = Field(None, max_length=20)
    address: str | None = None
    identity_number: str | None = Field(None, max_length=20)
    birthday: str | None = Field(None, pattern=r"^\d{8}$")
    tax_consent: bool = False


class DonorUpdateRequest(BaseModel):
    """Update donor fields — all optional."""
    name: str | None = Field(None, min_length=1, max_length=100)
    email: str | None = None
    phone: str | None = Field(None, max_length=20)
    phone_home: str | None = Field(None, max_length=20)
    phone_mobile: str | None = Field(None, max_length=20)
    phone_work: str | None = Field(None, max_length=20)
    address: str | None = None
    identity_number: str | None = Field(None, max_length=20)
    birthday: str | None = Field(None, pattern=r"^\d{8}$")
    tax_consent: bool | None = None


class DonorResponse(BaseModel):
    """Donor (User) detail response for maintenance views."""
    id: UUID
    email: str
    name: str
    phone: str | None = None
    phone_home: str | None = None
    phone_mobile: str | None = None
    phone_work: str | None = None
    birthday: str | None = None
    address: str | None = None
    has_identity_number: bool = False
    tax_consent: bool = False
    is_active: bool = True
    role: str = "user"
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Donor Account ───────────────────────────────────────────────

class DonorAccountCreateRequest(BaseModel):
    """Create a new donor payment-authorization record."""
    user_id: UUID | None = None
    guest_name: str | None = Field(None, max_length=100)
    guest_email: str | None = None
    account_type: str = Field(..., pattern=r"^(credit_card|postal|bank_transfer)$")
    auth_start_date: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    auth_end_date: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    authorized_person: str = Field(..., max_length=100)
    donation_amount: Decimal = Field(..., gt=0, decimal_places=2)
    card_issuing_bank: str | None = Field(None, max_length=100)
    card_cvv: str | None = Field(None, max_length=10)  # ⚠️ PCI-DSS: not returned by API; for legacy write only
    card_type: str | None = Field(None, pattern=r"^(visa|mastercard|jcb|unionpay)$")
    card_expiry_month: str | None = Field(None, pattern=r"^\d{2}$")
    card_expiry_year: str | None = Field(None, pattern=r"^\d{4}$")
    postal_account: str | None = Field(None, max_length=50)
    bank_account: str | None = Field(None, max_length=50)


class DonorAccountUpdateRequest(BaseModel):
    """Update an existing donor account — all optional."""
    guest_name: str | None = Field(None, max_length=100)
    guest_email: str | None = None
    account_type: str | None = Field(None, pattern=r"^(credit_card|postal|bank_transfer)$")
    auth_start_date: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    auth_end_date: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    authorized_person: str | None = Field(None, max_length=100)
    donation_amount: Decimal | None = Field(None, gt=0, decimal_places=2)
    card_issuing_bank: str | None = Field(None, max_length=100)
    card_cvv: str | None = Field(None, max_length=10)  # ⚠️ PCI-DSS: not returned by API; for legacy write only
    card_type: str | None = Field(None, pattern=r"^(visa|mastercard|jcb|unionpay)$")
    card_expiry_month: str | None = Field(None, pattern=r"^\d{2}$")
    card_expiry_year: str | None = Field(None, pattern=r"^\d{4}$")
    postal_account: str | None = Field(None, max_length=50)
    bank_account: str | None = Field(None, max_length=50)


class DonorAccountResponse(BaseModel):
    """Donor account response — excludes encrypted card_number for safety."""
    id: UUID
    user_id: UUID | None = None
    guest_name: str | None = None
    guest_email: str | None = None
    account_type: str
    auth_start_date: str | None = None
    auth_end_date: str | None = None
    authorized_person: str
    donation_amount: Decimal
    card_issuing_bank: str | None = None
    # ⚠️ PCI-DSS: CVV intentionally excluded from API responses
    card_type: str | None = None
    card_expiry_month: str | None = None
    card_expiry_year: str | None = None
    postal_account: str | None = None
    bank_account: str | None = None
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Maintenance Subscription ────────────────────────────────────

class MaintenanceSubscriptionCreateRequest(BaseModel):
    """Create a subscription for any user (back-office)."""
    donor_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = "TWD"
    frequency: str = Field(..., pattern=r"^(monthly|quarterly|yearly)$")
    payment_method: str = "credit_card"
    purpose: str | None = None
    total_cycles: int = Field(default=0, ge=0)
    start_date: date | None = None
    end_date: date | None = None


class MaintenanceSubscriptionUpdateRequest(BaseModel):
    """Update a subscription — all fields optional."""
    amount: Decimal | None = Field(None, gt=0, decimal_places=2)
    currency: str | None = None
    frequency: str | None = Field(None, pattern=r"^(monthly|quarterly|yearly)$")
    payment_method: str | None = Field(None, pattern=r"^(credit_card|postal|cash)$")
    purpose: str | None = None
    status: str | None = Field(None, pattern=r"^(active|paused|cancelled|expired)$")
    start_date: date | None = None
    end_date: date | None = None
    next_billing_date: date | None = None
    total_cycles: int | None = Field(None, ge=0)
    cycles_completed: int | None = Field(None, ge=0)
