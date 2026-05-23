"""Webhook shared handler — update DB state + trigger side-effects.

Both Stripe and Spgateway webhooks converge into the same shared
functions below.  These are responsible for:

1. Looking up the Payment / Donation record by ``gateway_transaction_id``.
2. Updating the status fields.
3. Eventually publishing a Cloud Pub/Sub message for side-effects
   (receipt PDF generation, email notification, admin alert).

NOTE
────
The actual database session / repository calls use ``…`` placeholders
until the repository layer is wired up; the flow is fully documented
so it can be implemented once the DB session infrastructure is ready.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def process_successful_payment(info: dict[str, Any]) -> None:
    """Handle a successful payment notification.

    Steps (to be implemented):
    1. Query ``Payment`` by ``gateway_transaction_id`` (the pi_xxx / TradeNo).
    2. Verify the amount matches (sanity check).
    3. Update ``Payment.status = "success"``, ``webhook_received = True``.
    4. Update ``Donation.status = "success"``.
    5. Generate ``receipt_number`` (e.g. RCP-YYYYMMDD-NNN).
    6. Publish Cloud Pub/Sub message for:
       - Receipt PDF generation (async)
       - Thank-you email (async)
       - Admin notification (async)
    7. Log the result.

    Expected ``info`` keys from both gateways:
        gateway_transaction_id (str)
        status                 (str) — "success"
        amount                 (int | Decimal)
        currency               (str)
    """
    gateway_id = info.get("gateway_transaction_id", "?")
    logger.info(
        "Processing successful payment: gateway_tx=%s gateway=%s",
        gateway_id,
        info.get("_gateway", "unknown"),
    )

    # ── 1. Lookup Payment ─────────────────────────────────────
    # payment = await payment_repo.get_by_gateway_tx(gateway_id)
    # if not payment:
    #     logger.error("Payment not found for gateway_tx=%s", gateway_id)
    #     return
    #
    # ── 2. Verify amount ──────────────────────────────────────
    # expected = payment.amount
    # received = info.get("amount", 0)
    # if abs(expected - received) > Decimal("0.01"):
    #     logger.warning("Amount mismatch: expected=%s received=%s", expected, received)
    #
    # ── 3. Update Payment ─────────────────────────────────────
    # payment.status = "success"
    # payment.webhook_received = True
    # payment.updated_at = datetime.utcnow()
    #
    # ── 4. Update Donation ────────────────────────────────────
    # donation = payment.donation
    # donation.status = "success"
    # donation.receipt_number = generate_receipt_number()
    # donation.updated_at = datetime.utcnow()
    #
    # ── 5. Commit ─────────────────────────────────────────────
    # await db_session.commit()
    #
    # ── 6. Publish side-effects ───────────────────────────────
    # await publish_async(
    #     topic="donation-completed",
    #     payload={
    #         "donation_id": str(donation.id),
    #         "email": ...,
    #         "amount": str(donation.amount),
    #         "receipt_number": donation.receipt_number,
    #     },
    # )

    logger.info("Successfully processed payment %s", gateway_id)


async def process_failed_payment(info: dict[str, Any]) -> None:
    """Handle a failed payment notification.

    Steps (to be implemented):
    1. Query ``Payment`` by ``gateway_transaction_id``.
    2. Update ``Payment.status = "failed"``, ``webhook_received = True``,
       ``failure_reason``.
    3. Update ``Donation.status = "failed"``.
    4. Publish notification (optional — admin alert on consecutive failures).
    5. Log the result.

    Expected ``info`` keys:
        gateway_transaction_id (str)
        status                 (str) — "failed"
        failure_reason         (str | None)
    """
    gateway_id = info.get("gateway_transaction_id", "?")
    reason = info.get("failure_reason", "Unknown error")
    logger.warning(
        "Processing failed payment: gateway_tx=%s reason=%s",
        gateway_id,
        reason,
    )

    # ── Implementation steps (same pattern as success) ────────
    logger.info("Recorded failure for payment %s", gateway_id)


async def process_cancelled_payment(info: dict[str, Any]) -> None:
    """Handle a cancelled / refunded payment notification.

    Stripe sends ``payment_intent.canceled`` for explicit cancellations
    and ``charge.refunded`` for refunds.  Both converge here.
    """
    gateway_id = info.get("gateway_transaction_id", "?")
    new_status = info.get("status", "cancelled")
    logger.info("Processing %s payment: gateway_tx=%s", new_status, gateway_id)

    # ── Implementation steps (same pattern as success) ────────
    logger.info("Recorded %s for payment %s", new_status, gateway_id)
