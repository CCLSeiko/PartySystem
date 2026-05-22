"""Payment API routers — credit card, postal, cash, webhooks."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.schemas.payment import (
    CreditCardPaymentRequest,
    PostalPaymentRequest,
    CashPaymentRequest,
    CreditCardPaymentResponse,
    PostalPaymentResponse,
    CashPaymentResponse,
    CashConfirmResponse,
    PaymentStatusResponse,
)
from app.services.webhook import stripe as stripe_webhook
from app.services.webhook import spgateway as spgateway_webhook
from app.services.webhook.handler import (
    process_cancelled_payment,
    process_failed_payment,
    process_successful_payment,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/credit-card", response_model=CreditCardPaymentResponse)
async def credit_card_payment(req: CreditCardPaymentRequest):
    """建立信用卡付款（Stripe PaymentIntent）。

    對應 API 設計文件：3.1 建立信用卡付款
    - payment_method_id 為前端已 tokenize 的 Stripe PaymentMethod ID
    - 回傳 client_secret 供前端執行 3D Secure
    """
    ...


@router.post("/postal", status_code=201, response_model=PostalPaymentResponse)
async def postal_payment(req: PostalPaymentRequest):
    """建立郵政劃撥單。

    對應 API 設計文件：3.2 建立郵政劃撥單
    - 產生 draft_number
    - 回傳 download_url 供下載 PDF 劃撥單
    """
    ...


@router.get("/postal/{draft_id}/download")
async def download_postal_draft(draft_id: UUID):
    """下載郵政劃撥單 PDF。

    對應 API 設計文件：3.3 下載劃撥單
    """
    ...


@router.post("/cash", status_code=201, response_model=CashPaymentResponse)
async def cash_payment(req: CashPaymentRequest):
    """建立現金捐款記錄（管理員權限）。

    對應 API 設計文件：3.4 建立現金捐款記錄
    """
    ...


@router.put("/cash/{cash_id}/confirm", response_model=CashConfirmResponse)
async def confirm_cash(cash_id: UUID):
    """確認現金捐款已收款（管理員權限）。

    對應 API 設計文件：3.5 確認現金捐款收款
    """
    ...


@router.get("/{payment_id}/status", response_model=PaymentStatusResponse)
async def get_payment_status(payment_id: UUID):
    """查詢特定付款狀態。

    對應 API 設計文件：3.6 查詢付款狀態
    """
    ...


# ═══════════════════════════════════════════════════════════════
#  Webhook 端點（無 JWT 驗證，使用金流商簽章驗證取代）
# ═══════════════════════════════════════════════════════════════


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Stripe Webhook 端點。

    對應 API 設計文件：3.7 Stripe Webhook

    流程：
    1. 讀取 raw body + stripe-signature header
    2. Stripe SDK 驗證簽章（construct_event）
    3. 分類事件類型（succeeded / failed / canceled / refunded）
    4. 提取付款資訊
    5. 呼叫共享 Handler 更新資料庫狀態
    """
    # 1-2. 簽章驗證
    event = await stripe_webhook.verify_and_parse(request)

    # 3. 分類事件
    action = stripe_webhook.classify_event(event)
    if action is None:
        event_type = event.get("type", "unknown")
        logger.info("Ignoring unhandled Stripe event type: %s", event_type)
        return {"status": "ok", "event_type": event_type}

    # 4. 提取付款資訊
    info = stripe_webhook.extract_payment_info(event)
    if info is None:
        logger.warning("Could not extract payment info from event %s", event.get("id"))
        return {"status": "ok", "warning": "no payment info"}

    info["_gateway"] = "stripe"

    # 5. 分派處理
    if action == "payment_intent.succeeded":
        await process_successful_payment(info)
    elif action == "payment_intent.payment_failed":
        await process_failed_payment(info)
    elif action in ("payment_intent.canceled", "charge.refunded"):
        await process_cancelled_payment(info)

    return {"status": "ok"}


@router.post("/webhook/spgateway")
async def spgateway_webhook(request: Request):
    """藍新金流 Webhook 端點。

    對應 API 設計文件：3.8 藍新金流 Webhook

    流程：
    1. 讀取 form-encoded POST body
    2. 驗證 CheckCode（SHA256 簽章）
    3. 分類交易結果（SUCCESS / FAIL）
    4. 提取付款資訊
    5. 呼叫共享 Handler 更新資料庫狀態
    """
    # 1-2. 簽章驗證
    data = await spgateway_webhook.parse_and_verify(request)

    # 3. 分類結果
    action = spgateway_webhook.classify_result(data)
    if action is None:
        logger.info("Ignoring unhandled Spgateway status: %s", data.get("Status"))
        return {"status": "ok"}

    # 4. 提取付款資訊
    info = spgateway_webhook.extract_payment_info(data)
    info["_gateway"] = "spgateway"

    # 5. 分派處理
    if action == "payment_intent.succeeded":
        await process_successful_payment(info)
    elif action == "payment_intent.payment_failed":
        await process_failed_payment(info)

    return {"status": "ok"}
