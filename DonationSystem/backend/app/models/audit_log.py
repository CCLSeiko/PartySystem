"""AuditLog model — system operation and error logging."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class AuditLog(Base):
    """System audit log for tracking operations and frontend errors."""
    
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Log type: operation, error, warning, info
    level = Column(String(20), nullable=False, index=True)  # error, warning, info, debug
    
    # Category: frontend_error, api_error, operation, security, etc.
    category = Column(String(50), nullable=False, index=True)
    
    # Message
    message = Column(Text, nullable=False)
    
    # Source: frontend, backend, mobile, etc.
    source = Column(String(20), default="backend", nullable=False)
    
    # User context
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    
    # Request context
    method = Column(String(10), nullable=True)  # GET, POST, etc.
    path = Column(String(500), nullable=True)
    status_code = Column(String(10), nullable=True)
    
    # Error details
    error_type = Column(String(100), nullable=True)
    stack_trace = Column(Text, nullable=True)
    
    # Additional data (JSON) - renamed from 'metadata' to 'extra_data'
    extra_data = Column("metadata", JSONB, nullable=True)
    
    # Client info
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self) -> str:
        return f"<AuditLog {self.level} {self.category} {self.message[:50]}>"
