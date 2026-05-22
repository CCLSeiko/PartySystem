"""Donation API routers."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.schemas.donation import (
    CreateDonationRequest,
    CancelDonationRequest,
    CreateDonationResponse,
    DonationDetailResponse,
    DonationListResponse,
    CancelDonationResponse,
)

router = APIRouter(prefix="/api/donations", tags=["Donations"])


@router.post("", status_code=201, response_model=CreateDonationResponse)
async def create_donation(req: CreateDonationRequest):
    """建立捐款紀錄。

    對應 API 設計文件：2.1 建立捐款
    - 會員：從 JWT 取得 user_id
    - 匿名：user_id=null，使用 guest_email/guest_name
    """
    ...


@router.get("", response_model=dict)
async def list_donations(
    status: str | None = None,
    payment_method: str | None = None,
    purpose: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    """查詢捐款列表（目前使用者）。

    對應 API 設計文件：2.2 查詢捐款列表
    支援分頁、狀態/方式/用途/日期篩選。
    """
    ...


@router.get("/{donation_id}", response_model=DonationDetailResponse)
async def get_donation(donation_id: UUID):
    """取得特定捐款詳細資訊。

    對應 API 設計文件：2.3 取得特定捐款
    包含關聯的 Payment 資訊。
    """
    ...


@router.delete("/{donation_id}", response_model=CancelDonationResponse)
async def cancel_donation(donation_id: UUID, reason: str | None = Query(None)):
    """取消捐款（24 小時內且 pending 狀態）。

    對應 API 設計文件：2.4 取消捐款
    """
    ...


@router.get("/{donation_id}/receipt")
async def download_receipt(donation_id: UUID):
    """下載捐款收據 PDF。

    對應 API 設計文件：2.5 下載捐款收據
    回傳 application/pdf。
    """
    ...
