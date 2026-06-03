"""Audit Log API router — system operation and error logging.

Provides endpoints for:
- Frontend error reporting (POST /api/audit/frontend-error)
- System operation logging (POST /api/audit/log)
- Query audit logs (GET /api/audit/logs) — admin only
"""

import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    get_audit_log_repo,
    get_current_user,
    get_db_session,
    require_admin,
)
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit", tags=["Audit Log"])


# ── Schemas ──────────────────────────────────────────────────────

class FrontendErrorRequest(BaseModel):
    """Schema for frontend error reports."""
    level: str = Field(default="error", pattern=r"^(error|warning|info|debug)$")
    category: str = Field(default="frontend_error", max_length=50)
    message: str = Field(..., max_length=2000)
    error_type: str | None = Field(None, max_length=100)
    stack_trace: str | None = Field(None, max_length=5000)
    path: str | None = Field(None, max_length=500)
    method: str | None = Field(None, max_length=10)
    status_code: str | None = Field(None, max_length=10)
    extra_data: dict | None = None


class AuditLogResponse(BaseModel):
    """Schema for audit log responses."""
    id: UUID
    level: str
    category: str
    message: str
    source: str
    user_id: UUID | None = None
    user_email: str | None = None
    method: str | None = None
    path: str | None = None
    status_code: str | None = None
    error_type: str | None = None
    stack_trace: str | None = None
    extra_data: dict | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    """Paginated audit log list."""
    data: list[AuditLogResponse]
    total: int
    has_more: bool


# ── Endpoints ────────────────────────────────────────────────────

@router.post("/frontend-error", status_code=201, response_model=AuditLogResponse)
async def report_frontend_error(
    req: FrontendErrorRequest,
    request: Request,
    audit_repo: AuditLogRepository = Depends(get_audit_log_repo),
):
    """接收前端錯誤回報。

    前端可透過此端點回報 JavaScript 錯誤、API 呼叫失敗等問題。
    """
    # Get client info
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")

    # Create log entry
    log_entry = await audit_repo.log(
        level=req.level,
        category=req.category,
        message=req.message,
        source="frontend",
        method=req.method,
        path=req.path,
        status_code=req.status_code,
        error_type=req.error_type,
        stack_trace=req.stack_trace,
        extra_data=req.extra_data,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    await audit_repo.session.commit()
    await audit_repo.session.refresh(log_entry)

    logger.info(f"Frontend error reported: {req.level} - {req.message[:100]}")

    return log_entry


@router.post("/log", status_code=201, response_model=AuditLogResponse)
async def create_audit_log(
    req: FrontendErrorRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    audit_repo: AuditLogRepository = Depends(get_audit_log_repo),
):
    """建立系統操作紀錄（需登入）。

    可記錄各種操作事件。
    """
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")

    log_entry = await audit_repo.log(
        level=req.level,
        category=req.category,
        message=req.message,
        source="backend",
        user_id=current_user.id,
        user_email=current_user.email,
        method=req.method,
        path=req.path,
        status_code=req.status_code,
        error_type=req.error_type,
        stack_trace=req.stack_trace,
        extra_data=req.extra_data,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    await audit_repo.session.commit()
    await audit_repo.session.refresh(log_entry)

    return log_entry


@router.get("/logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    level: str | None = None,
    category: str | None = None,
    limit: int = 100,
    admin: User = Depends(require_admin),
    audit_repo: AuditLogRepository = Depends(get_audit_log_repo),
):
    """查詢系統操作紀錄（管理員權限）。"""
    logs = await audit_repo.get_recent(limit=limit, level=level, category=category)
    return AuditLogListResponse(
        data=[AuditLogResponse.model_validate(log) for log in logs],
        total=len(logs),
        has_more=len(logs) == limit,
    )


@router.get("/errors/count")
async def get_error_count(
    minutes: int = 60,
    admin: User = Depends(require_admin),
    audit_repo: AuditLogRepository = Depends(get_audit_log_repo),
):
    """取得最近 N 分鐘的錯誤數量（管理員權限）。"""
    count = await audit_repo.get_error_count(minutes=minutes)
    return {"minutes": minutes, "error_count": count}
