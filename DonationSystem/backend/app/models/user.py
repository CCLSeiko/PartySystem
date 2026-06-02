"""User model with PII encryption support."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, LargeBinary, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    # Personal info (name stored in plaintext; identity_number encrypted via AES-256-GCM)
    name = Column(String(100), nullable=False)
    identity_number = Column(LargeBinary, nullable=True)      # AES-256-GCM encrypted
    identity_number_iv = Column(LargeBinary, nullable=True)   # IV prepended to ciphertext
    # Phone
    phone = Column(String(20), nullable=True)
    phone_home = Column(String(20), nullable=True)
    phone_mobile = Column(String(20), nullable=True)
    phone_work = Column(String(20), nullable=True)

    # Address
    address = Column(Text, nullable=True)

    # Tax reporting consent
    tax_consent = Column(Boolean, default=False, nullable=False)

    # Anonymous guest account flag
    is_anonymous = Column(Boolean, default=False, nullable=False)

    # Birthday (YYYYMMDD)
    birthday = Column(String(8), nullable=True)

    # Role (user / donation_maintainer / admin)
    role = Column(String(20), default="user", nullable=False)

    # Password reset
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_token_expires = Column(DateTime, nullable=True)

    # Force password change on next login (set by admin/maintainer reset)
    force_password_change = Column(Boolean, default=False, nullable=False)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    donations = relationship("Donation", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")

    def __repr__(self) -> str:
        return f"<User {self.email}>"
