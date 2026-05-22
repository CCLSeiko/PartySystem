"""PostalDraft model — tracks postal transfer drafts for non-real-time payments."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PostalDraft(Base):
    __tablename__ = "postal_drafts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donation_id = Column(UUID(as_uuid=True), ForeignKey("donations.id"), nullable=False, unique=True)

    # Draft info
    draft_number = Column(String(20), unique=True, nullable=False, index=True)  # e.g. POST-20260522-001
    postal_account = Column(String(20), nullable=False)                         # 19-digit postal account
    amount = Column(Numeric(10, 2), nullable=False)

    # Status lifecycle: generated → sent → received → confirmed → reconciled
    status = Column(String(20), default="generated", nullable=False, index=True)
    reconciled_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    donation = relationship("Donation", back_populates="postal_draft")

    def __repr__(self) -> str:
        return f"<PostalDraft {self.draft_number} {self.status}>"
