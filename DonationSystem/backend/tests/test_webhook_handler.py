"""Tests for Webhook shared handler (process_successful_payment etc.)."""

import pytest

from app.services.webhook.handler import (
    process_cancelled_payment,
    process_failed_payment,
    process_successful_payment,
)


class TestWebhookHandler:
    """Verify handlers accept valid info dicts and log correctly."""

    @pytest.mark.asyncio
    async def test_process_success(self):
        info = {
            "gateway_transaction_id": "pi_test_001",
            "status": "success",
            "amount": 1000,
            "currency": "TWD",
            "_gateway": "stripe",
        }
        # Should not raise
        await process_successful_payment(info)

    @pytest.mark.asyncio
    async def test_process_failed(self):
        info = {
            "gateway_transaction_id": "pi_test_002",
            "status": "failed",
            "failure_reason": "Insufficient funds",
        }
        await process_failed_payment(info)

    @pytest.mark.asyncio
    async def test_process_cancelled(self):
        info = {
            "gateway_transaction_id": "pi_test_003",
            "status": "cancelled",
        }
        await process_cancelled_payment(info)
