"""TaxReport model — tracks annual tax CSV generation for IRS/NT submission."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class TaxReport(Base):
    __tablename__ = "tax_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    year = Column(Integer, nullable=False, index=True)         # Tax year (e.g. 2026)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # File path in Cloud Storage
    file_path = Column(String(500), nullable=True)

    # Statistics
    total_donors = Column(Integer, default=0)
    total_amount = Column(Numeric(14, 2), default=0)

    # Status
    status = Column(String(20), default="generating", nullable=False)  # generating / completed / failed

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<TaxReport {self.year} donors={self.total_donors} amount={self.total_amount}>"
