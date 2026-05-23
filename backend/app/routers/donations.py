"""Donation API routers — full implementation.

Supports:
- Member donations (authenticated via JWT)
- Anonymous / guest donations (no auth required)
- Search, filter, pagination
- Cancel within 24h (pending only)
- Receipt download (placeholder for PDF generation)
"""

from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    get_current_user,
    get_db_session,
    get_donation_repo,
    get_optional_user,
)
from app.models.donation import Donation
from app.models.user import User
from app.repositories.donation import DonationRepository
from app.schemas.donation import (
    CancelDonationResponse,
    CreateDonationRequest,
    CreateDonationResponse,
    DonationDetailResponse,
    PaymentInfo,
)
from app.services.receipt import generate_receipt_number

router = APIRouter(prefix="/api/donations", tags=["Donations"])


@router.post("", status_code=201, response_model=CreateDonationResponse)
async def create_donation(
    req: CreateDonationRequest,
    current_user: User | None = Depends(get_optional_user),
    repo: DonationRepository = Depends(get_donation_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """建立捐款紀錄。

    對應 API 設計文件：2.1 建立捐款

    - **會員**：從 JWT 自動取得 user_id
    - **匿名**：無需 JWT，使用 guest_email / guest_name
    - **狀態**：建立時為 pending，待金流完成後更新
    """
    if current_user:
        # ── Member donation ─────────────────────────────────
        donation = await repo.create(
            user_id=current_user.id,
            amount=req.amount,
            currency=req.currency,
            purpose=req.purpose,
            payment_method=req.payment_method,
            status="pending",
            is_recurring=req.is_recurring,
            tax_deductible=True,
        )
    else:
        # ── Anonymous / guest donation ──────────────────────
        if not req.guest_email and not req.guest_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Anonymous donations must provide at least guest_email or guest_name",
            )
        donation = await repo.create(
            user_id=None,
            guest_email=req.guest_email,
            guest_name=req.guest_name,
            amount=req.amount,
            currency=req.currency,
            purpose=req.purpose,
            payment_method=req.payment_method,
            status="pending",
            is_recurring=False,
            tax_deductible=True,
        )

    await session.commit()

    return CreateDonationResponse(
        id=donation.id,
        amount=donation.amount,
        currency=donation.currency,
        status=donation.status,
        payment_method=donation.payment_method,
        payment_url=f"/api/payments/{donation.payment_method}?donation_id={donation.id}",
        created_at=donation.created_at,
    )


@router.get("", response_model=dict)
async def list_donations(
    status_filter: str | None = Query(None, alias="status"),
    payment_method: str | None = Query(None),
    purpose: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    repo: DonationRepository = Depends(get_donation_repo),
):
    """查詢目前使用者的捐款列表。

    對應 API 設計文件：2.2 查詢捐款列表
    支援分頁與多維度篩選。只回傳自己的捐款。
    """
    skip = (page - 1) * per_page

    donations = await repo.search(
        user_id=current_user.id,
        status=status_filter,
        payment_method=payment_method,
        purpose=purpose,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=per_page,
    )
    total = await repo.count_search(
        user_id=current_user.id,
        status=status_filter,
        payment_method=payment_method,
        purpose=purpose,
        start_date=start_date,
        end_date=end_date,
    )

    return {
        "data": [
            {
                "id": d.id,
                "amount": d.amount,
                "currency": d.currency,
                "purpose": d.purpose,
                "payment_method": d.payment_method,
                "status": d.status,
                "is_recurring": d.is_recurring,
                "receipt_number": d.receipt_number,
                "created_at": d.created_at,
            }
            for d in donations
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }


@router.get("/{donation_id}", response_model=DonationDetailResponse)
async def get_donation(
    donation_id: UUID,
    current_user: User = Depends(get_current_user),
    repo: DonationRepository = Depends(get_donation_repo),
):
    """取得特定捐款詳細資訊（含 Payment 資料）。

    對應 API 設計文件：2.3 取得特定捐款
    只能查詢自己的捐款（管理員除外，待 admin 權限補實）。
    """
    donation = await repo.get_with_payment(donation_id)
    if donation is None:
        raise HTTPException(status_code=404, detail="Donation not found")

    # ── Permission check: only the owner or admin ───────────
    if donation.user_id is not None and donation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # ── Build payment sub-object ────────────────────────────
    payment_obj = None
    if donation.payment:
        payment_obj = PaymentInfo(
            id=donation.payment.id,
            payment_gateway=donation.payment.payment_gateway,
            gateway_transaction_id=donation.payment.gateway_transaction_id,
            status=donation.payment.status,
            created_at=donation.payment.created_at,
        )

    return DonationDetailResponse(
        id=donation.id,
        amount=donation.amount,
        currency=donation.currency,
        purpose=donation.purpose,
        payment_method=donation.payment_method,
        status=donation.status,
        is_recurring=donation.is_recurring,
        subscription_id=donation.subscription_id,
        receipt_number=donation.receipt_number,
        tax_deductible=donation.tax_deductible,
        payment=payment_obj,
        created_at=donation.created_at,
        updated_at=donation.updated_at,
    )


@router.delete("/{donation_id}", response_model=CancelDonationResponse)
async def cancel_donation(
    donation_id: UUID,
    reason: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    repo: DonationRepository = Depends(get_donation_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """取消捐款。

    對應 API 設計文件：2.4 取消捐款

    限制：
    - 僅限建立後 **24 小時內**
    - 僅限 **pending** 狀態
    - 僅限自己的捐款
    """
    donation = await repo.get(donation_id)
    if donation is None:
        raise HTTPException(status_code=404, detail="Donation not found")

    # ── Permission check ────────────────────────────────────
    if donation.user_id is not None and donation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # ── Time check (24h window) ─────────────────────────────
    if datetime.utcnow() - donation.created_at > timedelta(hours=24):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot cancel donations older than 24 hours",
        )

    # ── Status check ────────────────────────────────────────
    if donation.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot cancel donation with status '{donation.status}'",
        )

    donation.status = "cancelled"
    donation.updated_at = datetime.utcnow()
    await session.commit()

    return CancelDonationResponse(
        id=donation.id,
        status="cancelled",
        cancelled_at=donation.updated_at,
    )


@router.get("/{donation_id}/receipt")
async def download_receipt(
    donation_id: UUID,
    current_user: User = Depends(get_current_user),
    repo: DonationRepository = Depends(get_donation_repo),
):
    """下載捐款收據 PDF。

    對應 API 設計文件：2.5 下載捐款收據

    注意：PDF 產生引擎尚未實作，目前回傳 placeholder。
    待收據服務就緒後補實。
    """
    donation = await repo.get(donation_id)
    if donation is None:
        raise HTTPException(status_code=404, detail="Donation not found")

    if donation.user_id is not None and donation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if donation.status != "success":
        raise HTTPException(
            status_code=422,
            detail=f"Receipt not available for status '{donation.status}'",
        )

    # TODO: 產生 PDF 收據並回傳
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Receipt PDF generation not yet implemented",
    )
