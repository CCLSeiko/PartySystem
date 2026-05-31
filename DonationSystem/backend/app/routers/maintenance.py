"""Maintenance API router — donation data management for donation_maintainer role.

Provides endpoints for back-office donation maintenance staff to:
- Manually record offline donations (cash, postal, bank transfer)
- Look up basic donor information for verification
- Manage donor users (CRUD + soft-delete)
- Manage donor payment-authorization accounts (CRUD + soft-delete)
- Manage subscriptions (create, update, pause/resume/cancel)
- View donation statistics

All endpoints require the ``donation_maintainer`` or ``admin`` role.
"""

import logging
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    get_db_session,
    get_donation_repo,
    get_donor_account_repo,
    get_subscription_repo,
    get_user_repo,
    require_admin_or_maintainer,
)
from app.core.encryption import encrypt
from app.models.user import User
from app.repositories.donation import DonationRepository
from app.repositories.donor_account import DonorAccountRepository
from app.repositories.subscription import SubscriptionRepository
from app.repositories.user import UserRepository
from app.schemas.maintenance import (
    DonorAccountCreateRequest,
    DonorAccountResponse,
    DonorAccountUpdateRequest,
    DonorCreateRequest,
    DonorResponse,
    DonorUpdateRequest,
    MaintenanceSubscriptionCreateRequest,
    MaintenanceSubscriptionUpdateRequest,
)
from app.services.dates import compute_next_billing_date
from app.services.receipt import generate_receipt_number
from app.services.email import notify_donation_success

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/maintenance", tags=["Maintenance"])


# ── Schema ─────────────────────────────────────────────────────


class ManualDonationRequest(BaseModel):
    """Manual donation creation request — used for offline donations."""
    donor_name: str
    donor_email: str | None = None
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = "TWD"
    purpose: str | None = None
    payment_method: str = Field(..., pattern=r"^(credit_card|postal|cash)$")
    status: str = Field(default="success", pattern=r"^(pending|success|failed|cancelled)$")
    notes: str | None = None


class ManualDonationResponse(BaseModel):
    id: UUID
    amount: Decimal
    currency: str
    purpose: str | None
    payment_method: str
    status: str
    receipt_number: str | None
    donor_name: str | None
    donor_email: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DonorLookupResponse(BaseModel):
    id: UUID
    email: str
    name: str
    phone: str | None
    total_donations: int = 0
    last_donation_date: datetime | None = None

    model_config = {"from_attributes": True}


# ── Endpoints ──────────────────────────────────────────────────


@router.post("/donations", status_code=201, response_model=ManualDonationResponse)
async def create_manual_donation(
    req: ManualDonationRequest,
    background_tasks: BackgroundTasks,
    maintainer: User = Depends(require_admin_or_maintainer),
    donation_repo: DonationRepository = Depends(get_donation_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """手動建立捐款紀錄（捐款維護者/管理員權限）。

    用於線下收款（現金、郵政劃撥）的後台登錄。
    系統會自動產生收據編號，並在狀態為成功時寄送通知郵件。
    """
    user_id = None
    if req.donor_email:
        existing_user = await user_repo.get_by_email(req.donor_email)
        if existing_user:
            user_id = existing_user.id

    donation = await donation_repo.create(
        user_id=user_id,
        amount=req.amount,
        currency=req.currency,
        purpose=req.purpose,
        payment_method=req.payment_method,
        status=req.status,
        is_recurring=False,
        tax_deductible=True,
        guest_email=req.donor_email if user_id is None else None,
        guest_name=req.donor_name if user_id is None else None,
    )

    # Generate receipt number after creation (needs donation ID)
    receipt_number = generate_receipt_number(donation.id)
    donation.receipt_number = receipt_number

    await session.commit()
    await session.refresh(donation)

    # ── Send email notification for successful donations ──────
    if req.status == "success" and (req.donor_email or donation.guest_email):
        background_tasks.add_task(
            notify_donation_success,
            donation,
            donor_name=req.donor_name,
            to_email=req.donor_email or donation.guest_email,
        )

    return ManualDonationResponse(
        id=donation.id,
        amount=donation.amount,
        currency=donation.currency,
        purpose=donation.purpose,
        payment_method=donation.payment_method,
        status=donation.status,
        receipt_number=donation.receipt_number,
        donor_name=req.donor_name,
        donor_email=req.donor_email,
        created_at=donation.created_at,
    )


@router.get("/donors/search", response_model=list[DonorLookupResponse])
async def search_donors(
    q: str = Query(..., min_length=1, description="搜尋姓名或 Email"),
    limit: int = Query(default=10, ge=1, le=50),
    maintainer: User = Depends(require_admin_or_maintainer),
    user_repo: UserRepository = Depends(get_user_repo),
):
    """搜尋捐款人（捐款維護者/管理員權限）。

    根據姓名或 Email 搜尋已註冊會員，用於配對線下捐款。
    """
    users = await user_repo.search_by_name_or_email(q, limit=limit)
    return [
        DonorLookupResponse(
            id=u.id,
            email=u.email,
            name=u.name,
            phone=u.phone,
        )
        for u in users
    ]


@router.get("/stats/simple", response_model=dict)
async def get_simple_stats(
    maintainer: User = Depends(require_admin_or_maintainer),
    donation_repo: DonationRepository = Depends(get_donation_repo),
):
    """簡易統計儀表板（捐款維護者/管理員權限）。

    回傳總捐款金額等基本統計，不包含進階分析。
    """
    total_amount = await donation_repo.total_amount()

    return {
        "total_amount": total_amount,
        "currency": "TWD",
        "updated_at": datetime.utcnow().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════
#  Donor CRUD
# ═══════════════════════════════════════════════════════════════


@router.get("/donors")
async def list_donors(
    q: str | None = Query(None, description="搜尋姓名或 Email"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    maintainer: User = Depends(require_admin_or_maintainer),
    user_repo: UserRepository = Depends(get_user_repo),
):
    """列出所有捐款人（捐款維護者/管理員權限）。

    可依姓名或 Email 搜尋，支援分頁。
    回傳格式：{data: [...], pagination: {page, per_page, total, total_pages}}
    """
    skip = (page - 1) * per_page
    users = await user_repo.get_all_users(role_filter="user", q=q, skip=skip, limit=per_page)
    total = await user_repo.count_users(q=q)
    return {
        "data": [
            DonorResponse(
                id=u.id,
                email=u.email,
                name=u.name,
                phone=u.phone,
                phone_home=u.phone_home,
                phone_mobile=u.phone_mobile,
                phone_work=u.phone_work,
                birthday=u.birthday,
                address=u.address,
                has_identity_number=u.identity_number is not None,
                tax_consent=u.tax_consent,
                is_active=u.is_active,
                role=u.role,
                created_at=u.created_at,
            )
            for u in users
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }


@router.post("/donors", status_code=201, response_model=DonorResponse)
async def create_donor(
    req: DonorCreateRequest,
    maintainer: User = Depends(require_admin_or_maintainer),
    user_repo: UserRepository = Depends(get_user_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """建立新的捐款人帳號（捐款維護者/管理員權限）。

    會設定角色為 ``user``，並使用預設密碼（僅供後台使用）。
    """
    # Check for duplicate email
    if req.email:
        existing = await user_repo.get_by_email(req.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

    # Generate a random default password — the donor will reset it on first login
    import secrets
    default_password = secrets.token_urlsafe(16)

    user = await user_repo.create_user(
        email=req.email or f"donor-{secrets.token_hex(4)}@placeholder.local",
        password=default_password,
        name=req.name,
        role="user",
        phone=req.phone,
        phone_home=req.phone_home,
        phone_mobile=req.phone_mobile,
        phone_work=req.phone_work,
        address=req.address,
        identity_number=encrypt(req.identity_number)[0] if req.identity_number else None,
        identity_number_iv=encrypt(req.identity_number)[1] if req.identity_number else None,
        birthday=req.birthday,
        tax_consent=req.tax_consent,
    )

    await session.commit()
    await session.refresh(user)

    return DonorResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        phone_home=user.phone_home,
        phone_mobile=user.phone_mobile,
        phone_work=user.phone_work,
        birthday=user.birthday,
        address=user.address,
        has_identity_number=user.identity_number is not None,
        tax_consent=user.tax_consent,
        is_active=user.is_active,
        role=user.role,
        created_at=user.created_at,
    )


@router.get("/donors/{donor_id}", response_model=DonorResponse)
async def get_donor(
    donor_id: UUID,
    maintainer: User = Depends(require_admin_or_maintainer),
    user_repo: UserRepository = Depends(get_user_repo),
):
    """取得單一捐款人詳細資料（捐款維護者/管理員權限）。"""
    user = await user_repo.get(donor_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor not found",
        )

    return DonorResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        phone_home=user.phone_home,
        phone_mobile=user.phone_mobile,
        phone_work=user.phone_work,
        birthday=user.birthday,
        address=user.address,
        has_identity_number=user.identity_number is not None,
        tax_consent=user.tax_consent,
        is_active=user.is_active,
        role=user.role,
        created_at=user.created_at,
    )


@router.put("/donors/{donor_id}", response_model=DonorResponse)
async def update_donor(
    donor_id: UUID,
    req: DonorUpdateRequest,
    maintainer: User = Depends(require_admin_or_maintainer),
    user_repo: UserRepository = Depends(get_user_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """更新捐款人資料（捐款維護者/管理員權限）。

    僅更新有提供的欄位（Partial update）。
    """
    update_data = req.model_dump(exclude_unset=True)

    # identity_number is LargeBinary in DB — encrypt before storing
    if "identity_number" in update_data:
        raw = update_data.pop("identity_number")
        if raw:
            ct, iv = encrypt(raw)
            update_data["identity_number"] = ct
            update_data["identity_number_iv"] = iv
        else:
            update_data["identity_number"] = None
            update_data["identity_number_iv"] = None

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    user = await user_repo.update(donor_id, **update_data)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor not found",
        )

    await session.commit()
    await session.refresh(user)

    return DonorResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        phone_home=user.phone_home,
        phone_mobile=user.phone_mobile,
        phone_work=user.phone_work,
        birthday=user.birthday,
        address=user.address,
        has_identity_number=user.identity_number is not None,
        tax_consent=user.tax_consent,
        is_active=user.is_active,
        role=user.role,
        created_at=user.created_at,
    )


@router.delete("/donors/{donor_id}", status_code=204)
async def delete_donor(
    donor_id: UUID,
    maintainer: User = Depends(require_admin_or_maintainer),
    user_repo: UserRepository = Depends(get_user_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """軟刪除捐款人（設定 is_active=False，捐款維護者/管理員權限）。"""
    deleted = await user_repo.soft_delete(donor_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor not found",
        )
    await session.commit()


# ═══════════════════════════════════════════════════════════════
#  Donor Donation History
# ═══════════════════════════════════════════════════════════════


@router.get("/donors/{donor_id}/donation-history", response_model=dict)
async def get_donor_donation_history(
    donor_id: UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    maintainer: User = Depends(require_admin_or_maintainer),
    user_repo: UserRepository = Depends(get_user_repo),
    donation_repo: DonationRepository = Depends(get_donation_repo),
):
    """取得單一捐款人的完整捐款歷程（捐款維護者/管理員權限）。

    回傳該捐款人的所有捐款紀錄（包含訂閱與單次捐款），
    支援分頁。
    """
    user = await user_repo.get(donor_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor not found",
        )

    skip = (page - 1) * per_page
    donations = await donation_repo.get_by_user(donor_id, skip=skip, limit=per_page)
    total = await donation_repo.count_by_user(donor_id)
    total_pages = (total + per_page - 1) // per_page

    # Summary stats
    total_amount = sum(float(d.amount) for d in donations if d.status == "success")

    return {
        "donor": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
        },
        "data": [
            {
                "id": str(d.id),
                "amount": float(d.amount),
                "currency": d.currency,
                "purpose": d.purpose,
                "payment_method": d.payment_method,
                "status": d.status,
                "is_recurring": d.is_recurring,
                "receipt_number": d.receipt_number,
                "guest_name": d.guest_name,
                "guest_email": d.guest_email,
                "subscription_id": str(d.subscription_id) if d.subscription_id else None,
                "created_at": d.created_at.isoformat(),
                "updated_at": d.updated_at.isoformat(),
            }
            for d in donations
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
    }


# ═══════════════════════════════════════════════════════════════
#  Donor Account CRUD
# ═══════════════════════════════════════════════════════════════


@router.get("/donor-accounts", response_model=list[DonorAccountResponse])
async def list_donor_accounts(
    user_id: UUID | None = Query(None, description="依捐款人篩選"),
    account_type: str | None = Query(None, pattern=r"^(credit_card|postal|bank_transfer)$"),
    is_active: bool | None = Query(None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    maintainer: User = Depends(require_admin_or_maintainer),
    account_repo: DonorAccountRepository = Depends(get_donor_account_repo),
):
    """列出所有捐款授權帳號（捐款維護者/管理員權限）。

    可依 user_id、account_type 篩選，支援分頁。
    """
    accounts = await account_repo.search(
        user_id=user_id,
        account_type=account_type,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )
    return [
        DonorAccountResponse(
            id=a.id,
            user_id=a.user_id,
            guest_name=a.guest_name,
            guest_email=a.guest_email,
            account_type=a.account_type,
            auth_start_date=a.auth_start_date,
            auth_end_date=a.auth_end_date,
            authorized_person=a.authorized_person,
            donation_amount=a.donation_amount,
            card_issuing_bank=a.card_issuing_bank,
            # card_cvv intentionally excluded (PCI-DSS)
            card_type=a.card_type,
            card_expiry_month=a.card_expiry_month,
            card_expiry_year=a.card_expiry_year,
            postal_account=a.postal_account,
            bank_account=a.bank_account,
            is_active=a.is_active,
            created_at=a.created_at,
            updated_at=a.updated_at,
        )
        for a in accounts
    ]


@router.post("/donor-accounts", status_code=201, response_model=DonorAccountResponse)
async def create_donor_account(
    req: DonorAccountCreateRequest,
    maintainer: User = Depends(require_admin_or_maintainer),
    account_repo: DonorAccountRepository = Depends(get_donor_account_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """建立新的捐款授權帳號（捐款維護者/管理員權限）。"""
    account = await account_repo.create(**req.model_dump())
    await session.commit()
    await session.refresh(account)

    return DonorAccountResponse(
        id=account.id,
        user_id=account.user_id,
        guest_name=account.guest_name,
        guest_email=account.guest_email,
        account_type=account.account_type,
        auth_start_date=account.auth_start_date,
        auth_end_date=account.auth_end_date,
        authorized_person=account.authorized_person,
        donation_amount=account.donation_amount,
        card_issuing_bank=account.card_issuing_bank,
        # card_cvv intentionally excluded (PCI-DSS)
        card_type=account.card_type,
        card_expiry_month=account.card_expiry_month,
        card_expiry_year=account.card_expiry_year,
        postal_account=account.postal_account,
        bank_account=account.bank_account,
        is_active=account.is_active,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.get("/donor-accounts/{account_id}", response_model=DonorAccountResponse)
async def get_donor_account(
    account_id: UUID,
    maintainer: User = Depends(require_admin_or_maintainer),
    account_repo: DonorAccountRepository = Depends(get_donor_account_repo),
):
    """取得單一捐款授權帳號詳細資料（捐款維護者/管理員權限）。"""
    account = await account_repo.get(account_id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor account not found",
        )

    return DonorAccountResponse(
        id=account.id,
        user_id=account.user_id,
        guest_name=account.guest_name,
        guest_email=account.guest_email,
        account_type=account.account_type,
        auth_start_date=account.auth_start_date,
        auth_end_date=account.auth_end_date,
        authorized_person=account.authorized_person,
        donation_amount=account.donation_amount,
        card_issuing_bank=account.card_issuing_bank,
        # card_cvv intentionally excluded (PCI-DSS)
        card_type=account.card_type,
        card_expiry_month=account.card_expiry_month,
        card_expiry_year=account.card_expiry_year,
        postal_account=account.postal_account,
        bank_account=account.bank_account,
        is_active=account.is_active,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.put("/donor-accounts/{account_id}", response_model=DonorAccountResponse)
async def update_donor_account(
    account_id: UUID,
    req: DonorAccountUpdateRequest,
    maintainer: User = Depends(require_admin_or_maintainer),
    account_repo: DonorAccountRepository = Depends(get_donor_account_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """更新捐款授權帳號資料（捐款維護者/管理員權限）。

    僅更新有提供的欄位（Partial update）。
    """
    update_data = req.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    account = await account_repo.update(account_id, **update_data)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor account not found",
        )

    await session.commit()
    await session.refresh(account)

    return DonorAccountResponse(
        id=account.id,
        user_id=account.user_id,
        guest_name=account.guest_name,
        guest_email=account.guest_email,
        account_type=account.account_type,
        auth_start_date=account.auth_start_date,
        auth_end_date=account.auth_end_date,
        authorized_person=account.authorized_person,
        donation_amount=account.donation_amount,
        card_issuing_bank=account.card_issuing_bank,
        # card_cvv intentionally excluded (PCI-DSS)
        card_type=account.card_type,
        card_expiry_month=account.card_expiry_month,
        card_expiry_year=account.card_expiry_year,
        postal_account=account.postal_account,
        bank_account=account.bank_account,
        is_active=account.is_active,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.delete("/donor-accounts/{account_id}", status_code=204)
async def delete_donor_account(
    account_id: UUID,
    maintainer: User = Depends(require_admin_or_maintainer),
    account_repo: DonorAccountRepository = Depends(get_donor_account_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """軟刪除捐款授權帳號（設定 is_active=False，捐款維護者/管理員權限）。"""
    deleted = await account_repo.soft_delete(account_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor account not found",
        )
    await session.commit()


# ═══════════════════════════════════════════════════════════════
#  Subscription Management (back-office)
# ═══════════════════════════════════════════════════════════════


@router.post("/subscriptions", status_code=201, response_model=dict)
async def create_maintenance_subscription(
    req: MaintenanceSubscriptionCreateRequest,
    maintainer: User = Depends(require_admin_or_maintainer),
    subscription_repo: SubscriptionRepository = Depends(get_subscription_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """建立定期定額捐款訂閱（捐款維護者/管理員權限）。

    可為任何已註冊會員建立訂閱，系統自動計算下次扣款日
    並將狀態設為 ``active``。
    """
    # Verify user exists
    user = await user_repo.get(req.donor_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Compute next billing date
    today = date.today()
    next_billing = compute_next_billing_date(today, req.frequency)

    sub = await subscription_repo.create(
        user_id=req.donor_id,
        amount=req.amount,
        currency=req.currency,
        frequency=req.frequency,
        payment_method=req.payment_method,
        purpose=req.purpose,
        total_cycles=req.total_cycles,
        cycles_completed=0,
        status="active",
        next_billing_date=next_billing,
        start_date=req.start_date or today,
        end_date=req.end_date,
    )

    await session.commit()
    await session.refresh(sub)

    return {
        "id": str(sub.id),
        "user_id": str(sub.user_id),
                "amount": float(sub.amount),
        "currency": sub.currency,
        "frequency": sub.frequency,
        "status": sub.status,
        "next_billing_date": sub.next_billing_date.isoformat(),
        "total_cycles": sub.total_cycles,
        "purpose": sub.purpose,
        "start_date": sub.start_date.isoformat(),
        "end_date": sub.end_date.isoformat() if sub.end_date else None,
        "created_at": sub.created_at.isoformat(),
    }


@router.get("/subscriptions")
async def list_subscriptions(
    user_id: UUID | None = Query(None, description="依用戶篩選"),
    status: str | None = Query(None, description="依狀態篩選 (active/paused/cancelled/expired)"),
    payment_method: str | None = Query(None, description="依付款方式篩選 (credit_card/postal/cash)"),
    frequency: str | None = Query(None, description="依頻率篩選 (monthly/quarterly/yearly)"),
    end_date_from: date | None = Query(None, description="結束日期起 (YYYY-MM-DD)"),
    end_date_to: date | None = Query(None, description="結束日期迄 (YYYY-MM-DD)"),
    donor_keyword: str | None = Query(None, min_length=1, description="捐款人關鍵字 (姓名或 Email)"),
    page: int = Query(default=1, ge=1, description="頁碼"),
    per_page: int = Query(default=15, ge=1, le=100, description="每頁筆數"),
    maintainer: User = Depends(require_admin_or_maintainer),
    subscription_repo: SubscriptionRepository = Depends(get_subscription_repo),
):
    """列出所有定期定額捐款訂閱（捐款維護者/管理員權限）。

    可依 user_id、status、payment_method、end_date 日期範圍、捐款人關鍵字篩選，支援分頁。
    回傳格式: {data: [...], pagination: {page, per_page, total, total_pages}}
    """
    skip = (page - 1) * per_page
    subs = await subscription_repo.search(
        user_id=user_id,
        status=status,
        payment_method=payment_method,
        frequency=frequency,
        end_date_from=end_date_from,
        end_date_to=end_date_to,
        donor_keyword=donor_keyword,
        skip=skip,
        limit=per_page,
    )
    total = await subscription_repo.count_search(
        user_id=user_id,
        status=status,
        payment_method=payment_method,
        frequency=frequency,
        end_date_from=end_date_from,
        end_date_to=end_date_to,
        donor_keyword=donor_keyword,
    )
    total_pages = (total + per_page - 1) // per_page

    return {
        "data": [
            {
                "id": str(s.id),
                "user_id": str(s.user_id),
                "donor_name": s.user.name if s.user else None,
                "donor_id": str(s.user_id),
                "amount": float(s.amount),
                "currency": s.currency,
                "frequency": s.frequency,
                "status": s.status,
                "payment_method": s.payment_method,
                "next_billing_date": s.next_billing_date.isoformat(),
                "total_cycles": s.total_cycles,
                "cycles_completed": s.cycles_completed,
                "purpose": s.purpose,
                "start_date": s.start_date.isoformat(),
                "end_date": s.end_date.isoformat() if s.end_date else None,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
            }
            for s in subs
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
    }


@router.get("/subscriptions/{subscription_id}", response_model=dict)
async def get_subscription(
    subscription_id: UUID,
    maintainer: User = Depends(require_admin_or_maintainer),
    subscription_repo: SubscriptionRepository = Depends(get_subscription_repo),
):
    """取得單一訂閱詳細資料（捐款維護者/管理員權限）。"""
    sub = await subscription_repo.get(subscription_id)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    return {
        "id": str(sub.id),
        "user_id": str(sub.user_id),
                "amount": float(sub.amount),
        "currency": sub.currency,
        "frequency": sub.frequency,
        "status": sub.status,
        "next_billing_date": sub.next_billing_date.isoformat(),
        "last_billing_date": sub.last_billing_date.isoformat() if sub.last_billing_date else None,
        "total_cycles": sub.total_cycles,
        "cycles_completed": sub.cycles_completed,
        "consecutive_failures": sub.consecutive_failures,
        "payment_method": sub.payment_method,
        "purpose": sub.purpose,
        "start_date": sub.start_date.isoformat(),
        "end_date": sub.end_date.isoformat() if sub.end_date else None,
        "created_at": sub.created_at.isoformat(),
        "updated_at": sub.updated_at.isoformat(),
        "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
    }


@router.put("/subscriptions/{subscription_id}", response_model=dict)
async def update_subscription(
    subscription_id: UUID,
    req: MaintenanceSubscriptionUpdateRequest,
    maintainer: User = Depends(require_admin_or_maintainer),
    subscription_repo: SubscriptionRepository = Depends(get_subscription_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """更新定期定額捐款訂閱（捐款維護者/管理員權限）。

    可更新金額、頻率、付款方式、狀態、起訖日期、下次扣款日、期數。
    """
    sub = await subscription_repo.get(subscription_id)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    update_data = {}
    if req.amount is not None:
        update_data["amount"] = req.amount
    if req.currency is not None:
        update_data["currency"] = req.currency
    if req.frequency is not None:
        update_data["frequency"] = req.frequency
        today = date.today()
        update_data["next_billing_date"] = compute_next_billing_date(today, req.frequency)
    if req.payment_method is not None:
        update_data["payment_method"] = req.payment_method
    if req.purpose is not None:
        update_data["purpose"] = req.purpose
    if req.status is not None:
        from app.models.subscription import Subscription
        valid_statuses = {"active", "paused", "cancelled", "expired"}
        if req.status not in valid_statuses:
            raise HTTPException(status_code=422, detail=f"Invalid status: {req.status}")
        update_data["status"] = req.status
        if req.status == "cancelled":
            update_data["cancelled_at"] = datetime.utcnow()
    if req.start_date is not None:
        update_data["start_date"] = req.start_date
    if req.end_date is not None:
        update_data["end_date"] = req.end_date
    if req.next_billing_date is not None:
        update_data["next_billing_date"] = req.next_billing_date
    if req.total_cycles is not None:
        update_data["total_cycles"] = req.total_cycles
    if req.cycles_completed is not None:
        update_data["cycles_completed"] = req.cycles_completed

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    sub = await subscription_repo.update(subscription_id, **update_data)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    await session.commit()
    await session.refresh(sub)

    return {
        "id": str(sub.id),
        "user_id": str(sub.user_id),
                "amount": float(sub.amount),
        "currency": sub.currency,
        "frequency": sub.frequency,
        "payment_method": sub.payment_method,
        "status": sub.status,
        "purpose": sub.purpose,
        "start_date": sub.start_date.isoformat(),
        "end_date": sub.end_date.isoformat() if sub.end_date else None,
        "next_billing_date": sub.next_billing_date.isoformat(),
        "total_cycles": sub.total_cycles,
        "cycles_completed": sub.cycles_completed,
        "updated_at": sub.updated_at.isoformat(),
    }


@router.put("/subscriptions/{subscription_id}/pause", response_model=dict)
async def pause_subscription(
    subscription_id: UUID,
    maintainer: User = Depends(require_admin_or_maintainer),
    subscription_repo: SubscriptionRepository = Depends(get_subscription_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """暫停定期定額捐款訂閱（捐款維護者/管理員權限）。"""
    sub = await subscription_repo.get(subscription_id)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )
    if sub.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pause subscription with status '{sub.status}'",
        )

    sub.status = "paused"
    await session.commit()
    await session.refresh(sub)

    return {
        "id": str(sub.id),
        "status": sub.status,
        "next_billing_date": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
    }


@router.put("/subscriptions/{subscription_id}/resume", response_model=dict)
async def resume_subscription(
    subscription_id: UUID,
    maintainer: User = Depends(require_admin_or_maintainer),
    subscription_repo: SubscriptionRepository = Depends(get_subscription_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """恢復暫停的定期定額捐款訂閱（捐款維護者/管理員權限）。"""
    sub = await subscription_repo.get(subscription_id)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )
    if sub.status != "paused":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume subscription with status '{sub.status}'",
        )

    # Recompute next billing date from today
    today = date.today()
    sub.status = "active"
    sub.next_billing_date = compute_next_billing_date(today, sub.frequency)
    await session.commit()
    await session.refresh(sub)

    return {
        "id": str(sub.id),
        "status": sub.status,
        "next_billing_date": sub.next_billing_date.isoformat(),
    }


@router.put("/subscriptions/{subscription_id}/cancel", response_model=dict)
async def cancel_subscription(
    subscription_id: UUID,
    maintainer: User = Depends(require_admin_or_maintainer),
    subscription_repo: SubscriptionRepository = Depends(get_subscription_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """取消定期定額捐款訂閱（捐款維護者/管理員權限）。"""
    sub = await subscription_repo.get(subscription_id)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )
    if sub.status in ("cancelled", "expired"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subscription is already '{sub.status}'",
        )

    sub.status = "cancelled"
    sub.cancelled_at = datetime.utcnow()
    await session.commit()
    await session.refresh(sub)

    return {
        "id": str(sub.id),
        "status": sub.status,
        "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
    }


from app.models.donation import Donation


@router.get("/subscriptions/{subscription_id}/history", response_model=dict)
async def get_subscription_history(
    subscription_id: UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    maintainer: User = Depends(require_admin_or_maintainer),
    subscription_repo: SubscriptionRepository = Depends(get_subscription_repo),
):
    """取得定期定額的每期捐款明細（捐款維護者/管理員權限）。

    回傳所有關聯的捐款記錄，包含每筆的狀態（成功/失敗/待處理）。
    """
    sub = await subscription_repo.get(subscription_id)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    skip = (page - 1) * per_page
    history = await subscription_repo.get_history(subscription_id, skip=skip, limit=per_page)
    total = await subscription_repo.count_history(subscription_id)
    total_pages = (total + per_page - 1) // per_page

    return {
        "data": [
            {
                "id": str(d.id),
                "amount": float(d.amount),
                "currency": d.currency,
                "status": d.status,
                "payment_method": d.payment_method,
                "purpose": d.purpose,
                "receipt_number": d.receipt_number,
                "created_at": d.created_at.isoformat(),
            }
            for d in history
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
        "subscription": {
            "id": str(sub.id),
                "amount": float(sub.amount),
            "frequency": sub.frequency,
            "status": sub.status,
            "donor_name": sub.user.name if sub.user else None,
            "start_date": sub.start_date.isoformat(),
            "end_date": sub.end_date.isoformat() if sub.end_date else None,
        },
    }


from sqlalchemy import func as sa_func, extract


@router.get("/subscriptions/stats/monthly", response_model=dict)
async def get_monthly_subscription_stats(
    year: int = Query(default=None, ge=2020, le=2100, description="年"),
    month: int | None = Query(default=None, ge=1, le=12, description="月 (不填則整年統計)"),
    maintainer: User = Depends(require_admin_or_maintainer),
    session: AsyncSession = Depends(get_db_session),
    subscription_repo: SubscriptionRepository = Depends(get_subscription_repo),
):
    """產生日定期定額捐款統計報表（捐款維護者/管理員權限）。

    統計指定年份/月份的定期定額：
    - 有效訂閱數、總金額
    - 各狀態統計
    - 各頻率分布
    - 本月應扣款成功/失敗統計
    """
    from app.models.donation import Donation

    target_year = year or date.today().year

    # Get all subscriptions that were active during the period
    subs = await subscription_repo.search(status=None)

    # Filter to relevant subscriptions for the period
    if month:
        from datetime import timedelta
        period_start = date(target_year, month, 1)
        next_month = month + 1
        period_end = date(target_year + 1, 1, 1) if next_month > 12 else date(target_year, next_month, 1)
        period_end -= timedelta(days=1)
    else:
        period_start = date(target_year, 1, 1)
        period_end = date(target_year, 12, 31)

    # Query donations (subscription-linked) within period
    stmt = (
        select(Donation)
        .where(Donation.subscription_id.isnot(None))
        .where(Donation.created_at >= period_start)
        .where(Donation.created_at <= period_end)
    )

    # Build status-by-month data
    status_breakdown = {"success": 0, "failed": 0, "pending": 0, "cancelled": 0}
    frequency_dist = {"monthly": 0, "quarterly": 0, "yearly": 0}
    total_amount = 0
    active_subs = 0
    for s in subs:
        f = s.frequency or "monthly"
        if f in frequency_dist:
            frequency_dist[f] += 1
        if s.status == "active":
            active_subs += 1

    # Count donations in period
    result = await session.execute(stmt)
    period_donations = result.scalars().all()
    for d in period_donations:
        if d.status in status_breakdown:
            status_breakdown[d.status] += 1
        total_amount += float(d.amount)

    return {
        "year": target_year,
        "month": month,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "active_subscriptions": active_subs,
        "total_subscriptions": len(subs),
        "period_donations": len(period_donations),
        "total_amount": round(total_amount, 2),
        "currency": "TWD",
        "status_breakdown": status_breakdown,
        "frequency_distribution": frequency_dist,
    }
