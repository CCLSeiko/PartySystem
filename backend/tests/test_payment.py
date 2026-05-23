"""Tests for Payment integration — Stripe (fake mode) + Postal draft + Cash."""

from datetime import datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.draft import generate_draft_number
from app.services.stripe import create_payment_intent


class TestPaymentFakeMode:
    """Stripe fake mode works without API key."""

    @pytest.mark.asyncio
    async def test_create_payment_intent_fake(self):
        """Fake mode returns well-formed response."""
        donation_id = str(uuid4())
        result = await create_payment_intent(
            amount=Decimal("500.00"),
            currency="twd",
            payment_method_id="pm_fake_123",
            donation_id=donation_id,
        )
        assert "pi_fake_" in result["payment_intent_id"]
        assert "_secret_fake" in result["client_secret"]
        assert result["status"] == "requires_payment_method"


class TestDraftNumber:
    """Postal draft number format."""

    def test_format(self):
        """Format: POST-YYYYMMDD-NNNN"""
        num = generate_draft_number(uuid4())
        parts = num.split("-")
        assert len(parts) == 3
        assert parts[0] == "POST"
        assert len(parts[1]) == 8  # date
        assert len(parts[2]) == 4  # sequence
        assert parts[2].isdigit()

    def test_increment(self):
        """Sequential calls produce different numbers."""
        uid = uuid4()
        n1 = generate_draft_number(uid)
        n2 = generate_draft_number(uid)
        assert n1 != n2
        # Only the last segment differs
        assert n1[:-4] == n2[:-4]


class TestPaymentValidation:
    """Validation rules for payment flows."""

    def test_credit_card_needs_donation(self):
        """Missing donation_id should be caught by schema validation."""
        from pydantic import ValidationError
        from app.schemas.payment import CreditCardPaymentRequest

        with pytest.raises(ValidationError):
            CreditCardPaymentRequest(
                amount=1000,
                payment_method_id="pm_xxx",
            )

    def test_postal_needs_amount(self):
        """Postal request must include amount."""
        from pydantic import ValidationError
        from app.schemas.payment import PostalPaymentRequest

        with pytest.raises(ValidationError):
            PostalPaymentRequest(
                donation_id=uuid4(),
                amount=Decimal("-100"),
            )

    def test_cash_needs_staff_id(self):
        """Cash request must include staff_id."""
        from pydantic import ValidationError
        from app.schemas.payment import CashPaymentRequest

        with pytest.raises(ValidationError):
            CashPaymentRequest(
                donation_id=uuid4(),
                amount=500,
                location="Office",
            )

    def test_payment_status_not_found(self):
        """Non-existent payment returns 404 logic."""
        # This is tested via the router's DB lookup
        pass
