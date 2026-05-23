"""Tests for Stripe webhook signature verification."""

import json
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.services.webhook import stripe as svc


class TestStripeVerifyAndParse:
    """Verify that construct_event is called correctly and errors are mapped."""

    @patch("stripe.Webhook.construct_event")
    @pytest.mark.asyncio
    async def test_valid_signature(self, mock_construct):
        """A valid signature returns the parsed event."""
        fake_event = {"id": "evt_xxx", "type": "payment_intent.succeeded"}
        mock_construct.return_value = fake_event

        class FakeRequest:
            async def body(self):
                return b'{"id": "pi_xxx"}'

            @property
            def headers(self):
                return {"stripe-signature": "valid_sig"}

        result = await svc.verify_and_parse(FakeRequest())
        assert result == fake_event
        mock_construct.assert_called_once()

    @patch("stripe.Webhook.construct_event")
    @pytest.mark.asyncio
    async def test_missing_signature_header(self, mock_construct):
        """Missing stripe-signature header -> 400."""
        class FakeRequest:
            async def body(self):
                return b"{}"

            @property
            def headers(self):
                return {}

        with pytest.raises(HTTPException) as exc_info:
            await svc.verify_and_parse(FakeRequest())
        assert exc_info.value.status_code == 400
        assert "Missing stripe-signature" in exc_info.value.detail

    @patch("stripe.Webhook.construct_event")
    @pytest.mark.asyncio
    async def test_invalid_signature(self, mock_construct):
        """Bad signature from Stripe SDK -> 400."""
        import stripe as stripe_lib

        mock_construct.side_effect = (
            stripe_lib.error.SignatureVerificationError("bad sig", "raw_body")
        )

        class FakeRequest:
            async def body(self):
                return b"{}"

            @property
            def headers(self):
                return {"stripe-signature": "bad_sig"}

        with pytest.raises(HTTPException) as exc_info:
            await svc.verify_and_parse(FakeRequest())
        assert exc_info.value.status_code == 400
        assert "Invalid signature" in exc_info.value.detail


class TestStripeClassifyEvent:
    """Map known Stripe event types to actions."""

    def test_success(self):
        assert svc.classify_event({"type": "payment_intent.succeeded"}) == "payment_intent.succeeded"

    def test_failed(self):
        assert svc.classify_event({"type": "payment_intent.payment_failed"}) == "payment_intent.payment_failed"

    def test_canceled(self):
        assert svc.classify_event({"type": "payment_intent.canceled"}) == "payment_intent.canceled"

    def test_refunded(self):
        assert svc.classify_event({"type": "charge.refunded"}) == "charge.refunded"

    def test_unhandled(self):
        assert svc.classify_event({"type": "charge.succeeded"}) is None


class TestStripeExtractPaymentInfo:
    """Extract structured info from Stripe events."""

    def test_success_event(self):
        event = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "object": "payment_intent",
                    "id": "pi_success_123",
                    "amount_received": 10000,
                    "currency": "twd",
                }
            },
        }
        info = svc.extract_payment_info(event)
        assert info["status"] == "success"
        assert info["gateway_transaction_id"] == "pi_success_123"
        assert info["amount"] == 10000
        assert info["currency"] == "TWD"

    def test_failed_event(self):
        event = {
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "object": "payment_intent",
                    "id": "pi_fail_456",
                    "amount": 5000,
                    "currency": "twd",
                    "last_payment_error": {
                        "message": "Your card was declined.",
                    },
                }
            },
        }
        info = svc.extract_payment_info(event)
        assert info["status"] == "failed"
        assert info["failure_reason"] == "Your card was declined."
        assert info["amount"] == 5000
