"""Subscription API routers — recurring donation management."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.schemas.subscription import (
    CreateSubscriptionRequest,
    UpdateSubscriptionRequest,
    CancelSubscriptionRequest,
    SubscriptionResponse,
    CreateSubscriptionResponse,
    UpdateSubscriptionResponse,
    PauseResumeResponse,
    CancelSubscriptionResponse,
    SubscriptionHistoryItem,
)

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])


@router.post("", status_code=201, response_model=CreateSubscriptionResponse)
async def create_subscription(req: CreateSubscriptionRequest):
    """建立定期定額捐款方案。

    對應 API 設計文件：4.1 建立定期定額捐款
    - 首次扣款立即執行
    - total_cycles=0 表示無限期
    """
    ...


@router.get("", response_model=dict)
async def list_subscriptions(
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    """查詢定期定額方案列表。

    對應 API 設計文件：4.2 查詢定期定額列表
    """
    ...


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(subscription_id: UUID):
    """取得特定定期定額方案詳細資訊。

    對應 API 設計文件：4.3 取得特定定期定額
    """
    ...


@router.put("/{subscription_id}", response_model=UpdateSubscriptionResponse)
async def update_subscription(subscription_id: UUID, req: UpdateSubscriptionRequest):
    """修改定期定額設定。

    對應 API 設計文件：4.4 修改定期定額設定
    所有欄位皆為選填。
    """
    ...


@router.put("/{subscription_id}/pause", response_model=PauseResumeResponse)
async def pause_subscription(subscription_id: UUID):
    """暫停定期定額捐款。

    對應 API 設計文件：4.5 暫停定期定額
    暫停期間不執行扣款。
    """
    ...


@router.put("/{subscription_id}/resume", response_model=PauseResumeResponse)
async def resume_subscription(subscription_id: UUID):
    """恢復已暫停的定期定額捐款。

    對應 API 設計文件：4.5 恢復定期定額
    恢復後下次扣款日期自動重算。
    """
    ...


@router.delete("/{subscription_id}", response_model=CancelSubscriptionResponse)
async def cancel_subscription(subscription_id: UUID, reason: str | None = Query(None)):
    """取消定期定額捐款方案。

    對應 API 設計文件：4.6 取消定期定額
    取消後不再執行任何扣款。
    """
    ...


@router.get("/{subscription_id}/history", response_model=dict)
async def get_subscription_history(
    subscription_id: UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    """查詢定期定額扣款歷史。

    對應 API 設計文件：4.7 查詢扣款歷史
    傳回所有關聯的捐款紀錄（成功/失敗）。
    """
    ...
