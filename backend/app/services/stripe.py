"""Stripe integration — PaymentIntent creation.

Requires ``STRIPE_SECRET_KEY`` to be set in the environment.
When the key is missing (local dev) the service falls back to
a fake mode for testing.
"""

import logging
from decimal import Decimal
from typing import Optional

import stripe

from app.config import settings

logger = logging.getLogger(__name__)

# ── Initialise Stripe SDK ────────────────────────────────────

if settings.stripe_secret_key and not settings.stripe_secret_key.startswith("sk_test_"):
    stripe.api_key = settings.stripe_secret_key
    _available = True
else:
    _available = False
    logger.warning("STRIPE_SECRET_KEY not set or is a test placeholder — Stripe service is in fake/test mode")


async def create_payment_intent(
    amount: Decimal,
    currency: str,
    payment_method_id: Optional[str],
    donation_id: str,
) -> dict:
    """Create a Stripe PaymentIntent and return the client secret.

    Two modes:
    1. Elements mode (payment_method_id=None):
       - Creates PaymentIntent in ``requires_payment_method`` state
       - Frontend uses ``stripe.confirmCardPayment(client_secret, {payment_method: {card: element}})``
       - Returns ``requires_payment_method`` status

    2. Legacy mode (payment_method_id provided):
       - Attaches the tokenized PaymentMethod and auto-confirms
       - Returns the final status (succeeded / requires_action for 3DS)

    Args:
        amount:             The amount (in major units, e.g. 10.00 = $10).
        currency:           ISO 4217 currency code (e.g. ``twd``, ``usd``).
        payment_method_id:  Stripe PaymentMethod ID (Optional for Elements flow).
        donation_id:        Our internal donation UUID (used as metadata).

    Returns:
        A dict with keys:
            - payment_intent_id (str)
            - client_secret (str)
            - status (str)

    Raises:
        RuntimeError:  If Stripe is not configured.
        stripe.error.StripeError:  On API errors.
    """
    if not _available:
        # ── Fake mode for local dev / testing ────────────────
        logger.info("Fake Stripe: creating PaymentIntent for %s %s", amount, currency)
        fake_id = f"pi_fake_{donation_id[:8]}"
        return {
            "payment_intent_id": fake_id,
            "client_secret": f"{fake_id}_secret_fake",
            "status": "requires_payment_method",
        }

    # ── Convert to cents (Stripe uses smallest currency unit) ─
    # TWD has no decimals, use amount directly (TWD is zero-decimal currency)
    if currency.upper() == "TWD":
        amount_cents = int(amount)
    else:
        amount_cents = int(amount * 100)

    kwargs = {
        "amount": amount_cents,
        "currency": currency.lower(),
        "metadata": {"donation_id": donation_id},
    }

    if payment_method_id:
        # Legacy flow: attach payment method and confirm
        kwargs["payment_method"] = payment_method_id
        kwargs["confirmation_method"] = "manual"
        kwargs["confirm"] = True
        kwargs["return_url"] = "https://donationsystem.example.com/payment/callback"
    else:
        # Elements flow: just create the intent, frontend confirms later
        kwargs["automatic_payment_methods"] = {"enabled": True}

    intent = stripe.PaymentIntent.create(**kwargs)

    return {
        "payment_intent_id": intent.id,
        "client_secret": intent.client_secret,
        "status": intent.status,
    }
