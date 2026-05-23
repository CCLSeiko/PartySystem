"""Payment model — tracks individual payment transactions through gateways."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # FK links
    donation_id = Column(UUID(as_uuid=True), ForeignKey("donations.id"), nullable=False, unique=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)

    # Gateway info
    payment_gateway = Column(String(20), nullable=False)      # stripe / spgateway / postal / cash
    gateway_transaction_id = Column(String(255), nullable=True, index=True)  # Stripe pi_xxx etc.

    # Financial
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="TWD", nullable=False)
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending / success / failed / refunded

    # Failure tracking
    failure_reason = Column(Text, nullable=True)
    webhook_received = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    donation = relationship("Donation", back_populates="payment")
    subscription = relationship("Subscription", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment {self.id} {self.payment_gateway} {self.status}>"
