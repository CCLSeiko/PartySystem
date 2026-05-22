"""Stripe integration — PaymentIntent creation.

Requires ``STRIPE_SECRET_KEY`` to be set in the environment.
When the key is missing (local dev) the service falls back to
a fake mode for testing.
"""

import logging
from decimal import Decimal

import stripe

from app.config import settings

logger = logging.getLogger(__name__)

# ── Initialise Stripe SDK ────────────────────────────────────

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key
    _available = True
else:
    _available = False
    logger.warning("STRIPE_SECRET_KEY not set — Stripe service is in fake/test mode")


async def create_payment_intent(
    amount: Decimal,
    currency: str,
    payment_method_id: str,
    donation_id: str,
) -> dict:
    """Create a Stripe PaymentIntent and return the client secret.

    Args:
        amount:             The amount (in major units, e.g. 10.00 = $10).
        currency:           ISO 4217 currency code (e.g. ``twd``, ``usd``).
        payment_method_id:  Tokenized Stripe PaymentMethod ID from the frontend.
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
    # TWD has no decimals, so amount * 100 for cents.
    # For most currencies: int(amount * 100).
    amount_cents = int(amount * 100)

    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency.lower(),
        payment_method=payment_method_id,
        confirmation_method="manual",
        confirm=True,
        metadata={
            "donation_id": donation_id,
        },
        return_url="https://donationsystem.example.com/payment/callback",
    )

    return {
        "payment_intent_id": intent.id,
        "client_secret": intent.client_secret,
        "status": intent.status,
    }
