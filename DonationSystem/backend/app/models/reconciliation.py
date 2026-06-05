"""ReconciliationRecord model — tracks batch reconciliation of postal/cash donations."""
"""ReconciliationRecord model — tracks batch reconciliation of postal/cash donations."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ReconciliationRecord(Base):
    __tablename__ = "reconciliation_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # File metadata
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)           # Cloud Storage path
    file_hash = Column(String(64), nullable=False)             # SHA-256 to prevent duplicate uploads

    # Counts
    total_records = Column(Integer, default=0)
    matched_count = Column(Integer, default=0)
    unmatched_count = Column(Integer, default=0)

    # Details — store matched and unmatched items for later review
    details = Column(JSONB, nullable=True)  # { matched: [...], unmatched: [...] }

    # Processing status
    status = Column(String(20), default="processing", nullable=False)  # processing / completed / failed

    # Error info
    error_message = Column(Text, nullable=True)

    # Who uploaded
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<ReconciliationRecord {self.file_name} matched={self.matched_count}/{self.total_records}>"
