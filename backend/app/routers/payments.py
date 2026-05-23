"""Payment API routers — credit card, postal, cash, webhooks.

Implements:
- Stripe PaymentIntent creation (POST /credit-card)
- Postal draft generation (POST /postal)
- Cash donation recording (POST /cash)
- Payment status lookup (GET /{payment_id}/status)
- Webhook endpoints (Stripe + Spgateway) — already implemented in phase 2
"""

import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.deps import (
    get_current_user,
    get_db_session,
    get_donation_repo,
    get_payment_repo,
    get_postal_draft_repo,
    require_admin,
)
from app.models.user import User
from app.repositories.donation import DonationRepository
from app.repositories.payment import PaymentRepository
from app.repositories.postal_draft import PostalDraftRepository
from app.schemas.payment import (
    CashConfirmResponse,
    CashPaymentRequest,
    CashPaymentResponse,
    CreditCardPaymentRequest,
    CreditCardPaymentResponse,
    PaymentStatusResponse,
    PostalPaymentRequest,
    PostalPaymentResponse,
)
from app.services.draft import generate_draft_number
from app.services.stripe import create_payment_intent as stripe_create_pi
from app.services.webhook import stripe as stripe_webhook
from app.services.webhook import spgateway as spgateway_webhook
from app.services.webhook.handler import (
    process_cancelled_payment,
    process_failed_payment,
    process_successful_payment,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["Payments"])

POSTAL_ACCOUNT = "1234567890123456789"  # TODO: move to settings / env


# ═══════════════════════════════════════════════════════════════
#  Credit Card
# ═══════════════════════════════════════════════════════════════


@router.post("/credit-card", response_model=CreditCardPaymentResponse)
async def credit_card_payment(
    req: CreditCardPaymentRequest,
    current_user: User = Depends(get_current_user),
    donation_repo: DonationRepository = Depends(get_donation_repo),
    payment_repo: PaymentRepository = Depends(get_payment_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """建立信用卡付款（Stripe PaymentIntent）。

    流程（Elements 模式）：
    1. 查詢捐款紀錄，驗證為 pending
    2. 建立 Payment 紀錄（status=pending）
    3. 呼叫 Stripe 建立 PaymentIntent（不 auto-confirm）
    4. 回傳 client_secret 供前端 Stripe Elements 執行 confirmCardPayment

    流程（Legacy 模式 — 提供 payment_method_id）：
    1-2 同上
    3. 呼叫 Stripe 建立 PaymentIntent 並 auto-confirm
    4. 回傳 client_secret + 最終狀態（可能需 3DS）
    """
    # 1. 查詢捐款
    donation = await donation_repo.get(req.donation_id)
    if donation is None:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.user_id is not None and donation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if donation.status != "pending":
        raise HTTPException(
            status_code=422,
            detail=f"Cannot pay for donation with status '{donation.status}'",
        )

    # 2. 建立 Payment 紀錄
    payment = await payment_repo.create(
        donation_id=donation.id,
        payment_gateway="stripe",
        amount=req.amount,
        currency=req.currency,
        status="pending",
        webhook_received=False,
    )

    # 3. 呼叫 Stripe
    try:
        result = await stripe_create_pi(
            amount=req.amount,
            currency=req.currency,
            payment_method_id=req.payment_method_id,
            donation_id=str(donation.id),
        )
    except Exception as exc:
        payment.status = "failed"
        payment.failure_reason = str(exc)
        await session.commit()
        logger.error("Stripe PaymentIntent failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payment gateway error: {exc}",
        )

    # 4. 更新 Payment 紀錄
    payment.gateway_transaction_id = result["payment_intent_id"]
    await session.commit()

    return CreditCardPaymentResponse(
        payment_intent_id=result["payment_intent_id"],
        client_secret=result["client_secret"],
        status=result["status"],
    )


# ═══════════════════════════════════════════════════════════════
#  Postal Draft
# ═══════════════════════════════════════════════════════════════


@router.post("/postal", status_code=201, response_model=PostalPaymentResponse)
async def postal_payment(
    req: PostalPaymentRequest,
    current_user: User = Depends(get_current_user),
    donation_repo: DonationRepository = Depends(get_donation_repo),
    payment_repo: PaymentRepository = Depends(get_payment_repo),
    draft_repo: PostalDraftRepository = Depends(get_postal_draft_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """建立郵政劃撥單。

    對應 API 設計文件：3.2 建立郵政劃撥單
    - 產生唯一 draft_number
    - 建立 Payment + PostalDraft 紀錄
    - 回傳 download_url 供下載 PDF 劃撥單
    """
    # 查詢捐款
    donation = await donation_repo.get(req.donation_id)
    if donation is None:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.user_id is not None and donation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if donation.status != "pending":
        raise HTTPException(
            status_code=422,
            detail=f"Cannot process postal for donation with status '{donation.status}'",
        )

    # 產生劃撥單號
    draft_number = generate_draft_number(donation.id)

    # 建立 Payment
    payment = await payment_repo.create(
        donation_id=donation.id,
        payment_gateway="postal",
        amount=req.amount,
        currency="TWD",
        status="pending",
        webhook_received=False,
    )

    # 建立 PostalDraft
    draft = await draft_repo.create(
        donation_id=donation.id,
        draft_number=draft_number,
        postal_account=POSTAL_ACCOUNT,
        amount=req.amount,
        status="generated",
    )

    await session.commit()

    return PostalPaymentResponse(
        draft_id=draft.id,
        draft_number=draft.draft_number,
        postal_account=draft.postal_account,
        amount=draft.amount,
        status="generated",
        download_url=f"/api/payments/postal/{draft.id}/download",
        created_at=draft.created_at,
    )


@router.get("/postal/{draft_id}/download")
async def download_postal_draft(draft_id: UUID):
    """下載郵政劃撥單 PDF。

    對應 API 設計文件：3.3 下載劃撥單
    TODO: 實作 PDF 產生引擎後補實。
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Postal draft PDF generation not yet implemented",
    )


# ═══════════════════════════════════════════════════════════════
#  Cash
# ═══════════════════════════════════════════════════════════════


@router.post("/cash", status_code=201, response_model=CashPaymentResponse)
async def cash_payment(
    req: CashPaymentRequest,
    admin: User = Depends(require_admin),
    donation_repo: DonationRepository = Depends(get_donation_repo),
    payment_repo: PaymentRepository = Depends(get_payment_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """建立現金捐款記錄（管理員權限）。

    對應 API 設計文件：3.4 建立現金捐款記錄
    """
    donation = await donation_repo.get(req.donation_id)
    if donation is None:
        raise HTTPException(status_code=404, detail="Donation not found")

    payment = await payment_repo.create(
        donation_id=donation.id,
        payment_gateway="cash",
        amount=req.amount,
        currency="TWD",
        status="pending",
        webhook_received=False,
    )
    await session.commit()

    return CashPaymentResponse(
        cash_id=payment.id,
        status="pending",
        created_at=payment.created_at,
    )


@router.put("/cash/{cash_id}/confirm", response_model=CashConfirmResponse)
async def confirm_cash(
    cash_id: UUID,
    admin: User = Depends(require_admin),
    payment_repo: PaymentRepository = Depends(get_payment_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """確認現金捐款已收款（管理員權限）。

    對應 API 設計文件：3.5 確認現金捐款收款
    """
    payment = await payment_repo.get(cash_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Cash payment not found")
    if payment.payment_gateway != "cash":
        raise HTTPException(status_code=422, detail="Payment is not a cash donation")

    payment.status = "success"
    payment.webhook_received = True
    payment.updated_at = datetime.utcnow()

    # Also mark the linked donation as success
    donation = payment.donation
    if donation:
        donation.status = "success"

    await session.commit()

    return CashConfirmResponse(
        cash_id=payment.id,
        status="confirmed",
        received_at=payment.updated_at,
    )


# ═══════════════════════════════════════════════════════════════
#  Payment Status
# ═══════════════════════════════════════════════════════════════


@router.get("/{payment_id}/status", response_model=PaymentStatusResponse)
async def get_payment_status(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    payment_repo: PaymentRepository = Depends(get_payment_repo),
):
    """查詢特定付款狀態。

    對應 API 設計文件：3.6 查詢付款狀態
    """
    payment = await payment_repo.get(payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Permission check: only the donation owner can see
    donation = payment.donation
    if donation and donation.user_id is not None and donation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return PaymentStatusResponse(
        payment_id=payment.id,
        donation_id=payment.donation_id,
        payment_gateway=payment.payment_gateway,
        amount=payment.amount,
        status=payment.status,
        gateway_transaction_id=payment.gateway_transaction_id,
        webhook_received=payment.webhook_received,
        created_at=payment.created_at,
    )


# ═══════════════════════════════════════════════════════════════
#  Webhook (已實作 — 保留原有程式碼)
# ═══════════════════════════════════════════════════════════════


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Stripe Webhook 端點 — 簽章驗證 + 事件分派。"""
    event = await stripe_webhook.verify_and_parse(request)
    action = stripe_webhook.classify_event(event)
    if action is None:
        event_type = event.get("type", "unknown")
        logger.info("Ignoring unhandled Stripe event type: %s", event_type)
        return {"status": "ok", "event_type": event_type}

    info = stripe_webhook.extract_payment_info(event)
    if info is None:
        logger.warning("Could not extract payment info from event %s", event.get("id"))
        return {"status": "ok", "warning": "no payment info"}

    info["_gateway"] = "stripe"

    if action == "payment_intent.succeeded":
        await process_successful_payment(info)
    elif action == "payment_intent.payment_failed":
        await process_failed_payment(info)
    elif action in ("payment_intent.canceled", "charge.refunded"):
        await process_cancelled_payment(info)

    return {"status": "ok"}


@router.post("/webhook/spgateway")
async def spgateway_webhook(request: Request):
    """藍新金流 Webhook 端點 — CheckCode 驗證 + 事件分派。"""
    data = await spgateway_webhook.parse_and_verify(request)
    action = spgateway_webhook.classify_result(data)
    if action is None:
        logger.info("Ignoring unhandled Spgateway status: %s", data.get("Status"))
        return {"status": "ok"}

    info = spgateway_webhook.extract_payment_info(data)
    info["_gateway"] = "spgateway"

    if action == "payment_intent.succeeded":
        await process_successful_payment(info)
    elif action == "payment_intent.payment_failed":
        await process_failed_payment(info)

    return {"status": "ok"}
