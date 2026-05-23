"""Subscription model — recurring donation plans with auto-billing."""

import uuid
from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Financial
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="TWD", nullable=False)

    # Schedule
    frequency = Column(String(10), nullable=False)       # monthly / quarterly / yearly
    total_cycles = Column(Integer, default=0)             # 0 = indefinite
    cycles_completed = Column(Integer, default=0)

    # Gateway
    payment_method = Column(String(20), default="credit_card")
    gateway_customer_id = Column(String(255), nullable=True)       # Stripe customer / source ID
    gateway_payment_method_id = Column(String(255), nullable=True) # Stripe PaymentMethod ID

    # Status
    status = Column(String(20), default="active", nullable=False, index=True)  # active / paused / cancelled / expired
    consecutive_failures = Column(Integer, default=0)

    # Billing dates
    next_billing_date = Column(Date, nullable=False, index=True)
    last_billing_date = Column(Date, nullable=True)

    cancelled_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="subscriptions")
    donations = relationship("Donation", back_populates="subscription")
    payments = relationship("Payment", back_populates="subscription")

    def __repr__(self) -> str:
        return f"<Subscription {self.id} {self.amount}/{self.frequency} {self.status}>"
