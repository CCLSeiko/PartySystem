"""DonorAccount model — payment authorization records for donors.

Three account types, each with type-specific fields:
- ``credit_card``: card issuer, number (encrypted), CVV, expiry
- ``postal``: postal transfer account number
- ``bank_transfer``: bank account number (encrypted)

All records link to a ``User`` (registered) or store guest info directly.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, LargeBinary, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class DonorAccount(Base):
    __tablename__ = "donor_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)

    # Guest donor info (when not linked to a registered user)
    guest_email = Column(String(255), nullable=True)
    guest_name = Column(String(100), nullable=True)

    # ── Common fields ─────────────────────────────────────────
    account_type = Column(String(20), nullable=False)        # credit_card / postal / bank_transfer
    auth_start_date = Column(String(8), nullable=True)       # YYYYMMDD
    auth_end_date = Column(String(8), nullable=True)         # YYYYMMDD
    authorized_person = Column(String(100), nullable=False)
    donation_amount = Column(Numeric(12, 2), nullable=False)

    # ── Credit-card specific (nullable for other types) ───────
    card_issuing_bank = Column(String(100), nullable=True)
    # ⚠️ PCI-DSS prohibits storing CVV — field is deprecated, new data should not populate it
    card_cvv = Column(String(10), nullable=True)
    card_type = Column(String(20), nullable=True)             # visa / mastercard / jcb / unionpay
    card_number = Column(LargeBinary, nullable=True)          # AES-256-GCM encrypted
    card_number_iv = Column(LargeBinary, nullable=True)
    card_expiry_month = Column(String(2), nullable=True)      # MM
    card_expiry_year = Column(String(4), nullable=True)       # YYYY

    # ── Postal-transfer specific ─────────────────────────────
    postal_account = Column(String(50), nullable=True)

    # ── Bank-transfer specific ───────────────────────────────
    bank_account = Column(String(50), nullable=True)          # Encrypted in production

    # ── Status ────────────────────────────────────────────────
    is_active = Column(Boolean, default=True, nullable=False)

    # ── Timestamps ────────────────────────────────────────────
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ── Relationships ─────────────────────────────────────────
    user = relationship("User", backref="donor_accounts")

    def __repr__(self) -> str:
        return f"<DonorAccount {self.id} {self.account_type} {self.authorized_person}>"
