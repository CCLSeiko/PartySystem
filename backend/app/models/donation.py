"""Donation model — core entity linking donors, payments, and subscriptions."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class DonationStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    POSTAL = "postal"
    CASH = "cash"


class Donation(Base):
    __tablename__ = "donations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # FK to user — nullable for anonymous (guest) donations
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)

    # Guest info for anonymous donations
    guest_email = Column(String(255), nullable=True)
    guest_name = Column(String(100), nullable=True)

    # Financial
    amount = Column(Numeric(12, 2), nullable=False)          # Always use NUMERIC, never float
    currency = Column(String(3), default="TWD", nullable=False)
    purpose = Column(String(100), nullable=True)

    # Payment
    payment_method = Column(String(20), nullable=False)      # credit_card / postal / cash
    status = Column(String(20), default=DonationStatus.PENDING, nullable=False, index=True)

    # Recurring linkage
    is_recurring = Column(Boolean, default=False, nullable=False)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)

    # Receipt
    receipt_number = Column(String(50), unique=True, nullable=True)
    tax_deductible = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="donations")
    payment = relationship("Payment", back_populates="donation", uselist=False)
    postal_draft = relationship("PostalDraft", back_populates="donation", uselist=False)
    subscription = relationship("Subscription", back_populates="donations")

    def __repr__(self) -> str:
        return f"<Donation {self.id} {self.amount} {self.status}>"
