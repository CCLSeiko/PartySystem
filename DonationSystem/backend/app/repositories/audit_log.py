"""AuditLog repository — CRUD for audit logs."""

from sqlalchemy import select, func
from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    """Repository for the ``AuditLog`` model."""

    def __init__(self, session) -> None:
        super().__init__(AuditLog, session)

    async def log(
        self,
        level: str,
        category: str,
        message: str,
        source: str = "backend",
        user_id=None,
        user_email: str = None,
        method: str = None,
        path: str = None,
        status_code: str = None,
        error_type: str = None,
        stack_trace: str = None,
        extra_data: dict = None,
        ip_address: str = None,
        user_agent: str = None,
    ) -> AuditLog:
        """Create a log entry."""
        return await self.create(
            level=level,
            category=category,
            message=message,
            source=source,
            user_id=user_id,
            user_email=user_email,
            method=method,
            path=path,
            status_code=status_code,
            error_type=error_type,
            stack_trace=stack_trace,
            extra_data=extra_data,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def get_recent(self, limit: int = 100, level: str = None, category: str = None) -> list[AuditLog]:
        """Get recent log entries with optional filters."""
        stmt = select(AuditLog)
        if level:
            stmt = stmt.where(AuditLog.level == level)
        if category:
            stmt = stmt.where(AuditLog.category == category)
        stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_error_count(self, minutes: int = 60) -> int:
        """Get count of errors in the last N minutes."""
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        stmt = select(func.count(AuditLog.id)).where(
            AuditLog.level == "error",
            AuditLog.created_at >= cutoff,
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0
