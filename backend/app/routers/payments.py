"""Payment API routers — credit card, postal, cash, webhooks."""

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


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Stripe Webhook 端點。

    對應 API 設計文件：3.7 Stripe Webhook
    - 使用 Stripe-Signature 驗證（無 JWT）
    - 支援 payment_intent.succeeded / failed / canceled
    """
    ...


@router.post("/webhook/spgateway")
async def spgateway_webhook(request: Request):
    """藍新金流 Webhook 端點。

    對應 API 設計文件：3.8 藍新金流 Webhook
    - 使用 CheckCode 驗證（無 JWT）
    """
    ...
