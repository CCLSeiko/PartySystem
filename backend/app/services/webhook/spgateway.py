"""Spgateway (藍新金流) Webhook — signature verification (CheckCode).

藍新金流 sends transaction results as HTTP form-encoded POST data.
The signature is computed by the merchant (us) and verified by the
gateway on the outbound leg; on the return leg the gateway includes
a ``CheckCode`` that we must verify ourselves.

Verification steps
──────────────────
1. Receive the form-encoded POST from 藍新.
2. Gather the required fields: Status, MerchantID, Version, TradeInfo, TradeSha.
3. Sort, concatenate and hash per 藍新 spec to produce an expected CheckCode.
4. Compare the computed CheckCode with the one in the payload.
"""

import hashlib
import logging
from typing import Any

from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)

# ── Supported transaction statuses ────────────────────────────

TRADE_SUCCESS = "SUCCESS"
TRADE_FAIL = "FAIL"


class SpgatewayWebhookError(Exception):
    """Raised when Spgateway webhook verification or processing fails."""


async def parse_and_verify(request: Request) -> dict[str, Any]:
    """Parse the form POST body and verify the CheckCode.

    Steps:
    1. Read the raw body and parse form fields.
    2. Check for a ``CheckCode`` field.
    3. Re-compute the expected CheckCode using the shared secret.
    4. Raise HTTPException(400) on mismatch.

    Returns the raw form data as a dict (already verified).
    """
    form = await request.form()
    # Convert FormData to a plain string dict (values are either str or UploadFile;
    # webhook payloads only carry text fields, so safe to str() them all.)
    data: dict[str, str] = {k: str(v) for k, v in form.items()}

    # ── Verify CheckCode ──────────────────────────────────────
    received_check_code = data.get("CheckCode")
    if not received_check_code:
        logger.warning("Spgateway webhook called without CheckCode")
        raise HTTPException(status_code=400, detail="Missing CheckCode")

    expected = _compute_check_code(data)
    if received_check_code != expected:
        logger.warning(
            "Spgateway CheckCode mismatch: received=%s expected=%s",
            received_check_code,
            expected,
        )
        raise HTTPException(status_code=400, detail="Invalid CheckCode")

    return data


def _compute_check_code(data: dict[str, str]) -> str:
    """Compute the expected CheckCode for the BlueNew payload.

    The 藍新 specification uses:
        CheckCode = SHA256(
            HashKey=key &
            Amt=value &
            MerchantID=value &
            MerchantOrderNo=value &
            TradeNo=value &
            Version=value &
            HashIV=iv
        ).hexdigest().upper()

    Note: the exact field list and ordering may be updated per
    your 藍新 contract.  Adjust SPGATEWAY_FIELDS_FOR_CHECKCODE
    in ``app.config`` (or override here) as needed.
    """
    fields = [
        ("Amt", data.get("Amt", "")),
        ("MerchantID", data.get("MerchantID", "")),
        ("MerchantOrderNo", data.get("MerchantOrderNo", "")),
        ("TradeNo", data.get("TradeNo", "")),
        ("Version", data.get("Version", "1.0")),
    ]

    raw = f"HashKey={settings.spgateway_hash_key or ''}&"
    for key, value in fields:
        raw += f"{key}={value}&"
    raw += f"HashIV={settings.spgateway_hash_iv or ''}"

    return hashlib.sha256(raw.encode("utf-8")).hexdigest().upper()


def classify_result(data: dict[str, str]) -> str | None:
    """Map the 藍新 Status to a canonical action name.

    Returns:
        ``"payment_intent.succeeded"`` if SUCCESS,
        ``"payment_intent.payment_failed"`` if FAIL,
        ``None`` for unknown statuses.
    """
    status = data.get("Status")
    if status == TRADE_SUCCESS:
        return "payment_intent.succeeded"
    if status == TRADE_FAIL:
        return "payment_intent.payment_failed"
    return None


def extract_payment_info(data: dict[str, str]) -> dict[str, Any]:
    """Extract structured payment info from a 藍新 payload.

    Returns:
        gateway_transaction_id  — 藍新 TradeNo
        status                  — success / failed
        amount                  — int from Amt
        currency                — always TWD for 藍新
        failure_reason          — ErrDesc if Status=FAIL
    """
    info: dict[str, Any] = {
        "gateway_transaction_id": data.get("TradeNo"),
        "amount": int(data.get("Amt", 0)),
        "currency": "TWD",
    }

    if data.get("Status") == TRADE_SUCCESS:
        info["status"] = "success"
    else:
        info["status"] = "failed"
        info["failure_reason"] = data.get("ErrDesc", "Unknown error")

    return info
