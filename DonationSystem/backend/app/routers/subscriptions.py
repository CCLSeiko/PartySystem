"""Subscription API routers — recurring donation management.

Implements the full subscription lifecycle:
  Create → Active → (Pause ↔ Resume) → Cancel
"""

from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    get_current_user,
    get_db_session,
    get_subscription_repo,
)
from app.models.subscription import Subscription
from app.models.user import User
from app.repositories.subscription import SubscriptionRepository
from app.schemas.subscription import (
    CancelSubscriptionRequest,
    CancelSubscriptionResponse,
    CreateSubscriptionRequest,
    CreateSubscriptionResponse,
    PauseResumeResponse,
    SubscriptionHistoryItem,
    SubscriptionResponse,
    UpdateSubscriptionRequest,
    UpdateSubscriptionResponse,
)
from app.services.dates import compute_next_billing_date

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])


@router.post("", status_code=201, response_model=CreateSubscriptionResponse)
async def create_subscription(
    req: CreateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    repo: SubscriptionRepository = Depends(get_subscription_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """建立定期定額捐款方案。

    對應 API 設計文件：4.1 建立定期定額捐款

    - 首次扣款日設為今日（代表首次扣款立即執行）
    - ``total_cycles=0`` 表示無限期
    - 首次捐款會透過 Stripe PaymentMethod 立即扣款
      （待金流整合後補實）
    """
    today = date.today()
    next_billing = compute_next_billing_date(today, req.frequency)

    subscription = await repo.create(
        user_id=current_user.id,
        amount=req.amount,
        currency=req.currency,
        frequency=req.frequency,
        payment_method="credit_card",
        gateway_payment_method_id=req.payment_method_id,
        total_cycles=req.total_cycles,
        cycles_completed=0,       # Will be incremented after first charge
        status="active",
        next_billing_date=next_billing,
        consecutive_failures=0,
    )

    await session.commit()

    return CreateSubscriptionResponse(
        id=subscription.id,
        amount=subscription.amount,
        frequency=subscription.frequency,
        status=subscription.status,
        next_billing_date=subscription.next_billing_date,
        total_cycles=subscription.total_cycles,
        cycles_completed=subscription.cycles_completed,
        created_at=subscription.created_at,
    )


@router.get("", response_model=dict)
async def list_subscriptions(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    repo: SubscriptionRepository = Depends(get_subscription_repo),
):
    """查詢目前使用者的定期定額方案列表。

    對應 API 設計文件：4.2 查詢定期定額列表
    """
    skip = (page - 1) * per_page
    subs = await repo.search(
        user_id=current_user.id,
        status=status_filter,
        skip=skip,
        limit=per_page,
    )
    total = await repo.count_search(
        user_id=current_user.id,
        status=status_filter,
    )

    return {
        "data": [
            {
                "id": s.id,
                "amount": s.amount,
                "frequency": s.frequency,
                "status": s.status,
                "next_billing_date": s.next_billing_date,
                "cycles_completed": s.cycles_completed,
                "total_cycles": s.total_cycles,
                "created_at": s.created_at,
            }
            for s in subs
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: UUID,
    current_user: User = Depends(get_current_user),
    repo: SubscriptionRepository = Depends(get_subscription_repo),
):
    """取得特定定期定額方案詳細資訊。

    對應 API 設計文件：4.3 取得特定定期定額
    """
    sub = await repo.get(subscription_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return SubscriptionResponse(
        id=sub.id,
        amount=sub.amount,
        frequency=sub.frequency,
        status=sub.status,
        next_billing_date=sub.next_billing_date,
        total_cycles=sub.total_cycles,
        cycles_completed=sub.cycles_completed,
        consecutive_failures=sub.consecutive_failures,
        purpose=sub.purpose,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


@router.put("/{subscription_id}", response_model=UpdateSubscriptionResponse)
async def update_subscription(
    subscription_id: UUID,
    req: UpdateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    repo: SubscriptionRepository = Depends(get_subscription_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """修改定期定額設定。

    對應 API 設計文件：4.4 修改定期定額設定
    所有欄位皆為選填。
    """
    sub = await repo.get(subscription_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if sub.status not in ("active", "paused"):
        raise HTTPException(
            status_code=422,
            detail=f"Cannot modify subscription with status '{sub.status}'",
        )

    updated = await repo.update(
        subscription_id,
        amount=req.amount,
        frequency=req.frequency,
        total_cycles=req.total_cycles,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Subscription not found")

    # If frequency changed, recalculate next billing date
    if req.frequency is not None and updated.last_billing_date:
        updated.next_billing_date = compute_next_billing_date(
            updated.last_billing_date, req.frequency
        )

    await session.commit()

    return UpdateSubscriptionResponse(
        id=sub.id,
        amount=updated.amount,
        frequency=updated.frequency,
        status=updated.status,
        updated_at=updated.updated_at,
    )


@router.put("/{subscription_id}/pause", response_model=PauseResumeResponse)
async def pause_subscription(
    subscription_id: UUID,
    current_user: User = Depends(get_current_user),
    repo: SubscriptionRepository = Depends(get_subscription_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """暫停定期定額捐款。

    對應 API 設計文件：4.5 暫停定期定額
    暫停期間不執行扣款。
    """
    sub = await repo.get(subscription_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if sub.status != "active":
        raise HTTPException(
            status_code=422,
            detail=f"Cannot pause subscription with status '{sub.status}'",
        )

    sub.status = "paused"
    sub.updated_at = datetime.utcnow()
    await session.commit()

    return PauseResumeResponse(
        id=sub.id,
        status="paused",
    )


@router.put("/{subscription_id}/resume", response_model=PauseResumeResponse)
async def resume_subscription(
    subscription_id: UUID,
    current_user: User = Depends(get_current_user),
    repo: SubscriptionRepository = Depends(get_subscription_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """恢復已暫停的定期定額捐款。

    對應 API 設計文件：4.5 恢復定期定額
    恢復後下次扣款日期自動重算（從今日起算）。
    """
    sub = await repo.get(subscription_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if sub.status != "paused":
        raise HTTPException(
            status_code=422,
            detail=f"Cannot resume subscription with status '{sub.status}'",
        )

    today = date.today()
    sub.status = "active"
    sub.next_billing_date = compute_next_billing_date(today, sub.frequency)
    sub.updated_at = datetime.utcnow()
    await session.commit()

    return PauseResumeResponse(
        id=sub.id,
        status="active",
        next_billing_date=sub.next_billing_date,
    )


@router.delete("/{subscription_id}", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    subscription_id: UUID,
    reason: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    repo: SubscriptionRepository = Depends(get_subscription_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """取消定期定額捐款方案。

    對應 API 設計文件：4.6 取消定期定額
    取消後不再執行任何扣款。
    """
    sub = await repo.get(subscription_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if sub.status == "cancelled":
        raise HTTPException(status_code=422, detail="Subscription already cancelled")

    sub.status = "cancelled"
    sub.cancelled_at = datetime.utcnow()
    sub.updated_at = datetime.utcnow()
    await session.commit()

    return CancelSubscriptionResponse(
        id=sub.id,
        status="cancelled",
        cancelled_at=sub.cancelled_at,
    )


@router.get("/{subscription_id}/history", response_model=dict)
async def get_subscription_history(
    subscription_id: UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    repo: SubscriptionRepository = Depends(get_subscription_repo),
):
    """查詢定期定額扣款歷史。

    對應 API 設計文件：4.7 查詢扣款歷史
    回傳所有關聯的捐款紀錄。
    """
    sub = await repo.get(subscription_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    skip = (page - 1) * per_page
    donations = await repo.get_history(subscription_id, skip=skip, limit=per_page)
    total = await repo.count_history(subscription_id)

    return {
        "data": [
            SubscriptionHistoryItem(
                donation_id=d.id,
                amount=d.amount,
                status=d.status,
                billing_date=d.created_at.date(),
                receipt_number=d.receipt_number,
                failure_reason=getattr(d, "failure_reason", None),
            )
            for d in donations
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }
