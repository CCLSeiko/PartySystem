"""Stripe Webhook — signature verification and event dispatching.

Uses the official Stripe SDK to verify the `Stripe-Signature` header,
then dispatches known event types (payment_intent.succeeded, etc.)
to the shared handler.
"""

import logging
from typing import Any

import stripe
from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)

# ── Supported event types ─────────────────────────────────────

# Events we actively process (all others are logged and ignored)
HANDLED_EVENTS = {
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "payment_intent.canceled",
    "charge.refunded",
}


class StripeWebhookError(Exception):
    """Raised when Stripe webhook verification or processing fails."""


async def verify_and_parse(request: Request) -> dict[str, Any]:
    """Verify the Stripe-Signature header and return the parsed event dict.

    Steps:
    1. Read the raw request body (required for signature verification).
    2. Extract the ``stripe-signature`` header.
    3. Call ``stripe.Webhook.construct_event()`` — the SDK does the
       cryptographic verification using the configured webhook secret.
    4. Return the deserialised event object.

    Raises:
        HTTPException(400) — invalid payload or bad signature.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        logger.warning("Stripe webhook called without stripe-signature header")
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            webhook_secret=settings.stripe_webhook_secret,
        )
    except ValueError as exc:
        logger.error("Stripe webhook received invalid payload: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid payload") from exc
    except stripe.error.SignatureVerificationError as exc:
        logger.warning("Stripe webhook signature verification failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid signature") from exc

    return event


def classify_event(event: dict[str, Any]) -> str | None:
    """Return a canonical action name for the event type, or None if unhandled."""
    event_type = event.get("type", "")
    if event_type in HANDLED_EVENTS:
        return event_type
    return None


def extract_payment_intent(event: dict[str, Any]) -> dict[str, Any] | None:
    """Extract the PaymentIntent object from a Stripe event."""
    data = event.get("data", {})
    obj = data.get("object", {})

    # Most events have the PaymentIntent directly…
    if obj.get("object") == "payment_intent":
        return obj
    # …but charge.refunded wraps it inside a Charge object
    if obj.get("object") == "charge":
        return obj.get("payment_intent_details") or obj

    return obj


def extract_payment_info(event: dict[str, Any]) -> dict[str, Any] | None:
    """Extract structured payment info from a Stripe event.

    Returns a dict with keys useful for the shared handler:
        gateway_transaction_id  — Stripe PaymentIntent ID (pi_xxx)
        status                  — success / failed / cancelled / refunded
        amount                  — amount in smallest currency unit (cents)
        currency                — ISO currency code
        failure_reason          — failure message if applicable
    """
    event_type = event.get("type", "")
    pi = extract_payment_intent(event)

    if not pi:
        return None

    info: dict[str, Any] = {
        "gateway_transaction_id": pi.get("id"),
        "currency": pi.get("currency", "").upper(),
    }

    if event_type == "payment_intent.succeeded":
        info["status"] = "success"
        info["amount"] = pi.get("amount_received", 0)
    elif event_type == "payment_intent.payment_failed":
        info["status"] = "failed"
        info["amount"] = pi.get("amount", 0)
        last_error = pi.get("last_payment_error") or {}
        info["failure_reason"] = last_error.get("message", "Unknown error")
    elif event_type == "payment_intent.canceled":
        info["status"] = "cancelled"
        info["amount"] = pi.get("amount", 0)
    elif event_type == "charge.refunded":
        info["status"] = "refunded"
        info["amount"] = pi.get("amount_refunded", 0)
    else:
        info["status"] = "unknown"
        info["amount"] = pi.get("amount", 0)

    return info
