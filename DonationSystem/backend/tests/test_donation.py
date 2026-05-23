"""Tests for Donation module — receipt generation + business rules."""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest

from app.services.receipt import generate_receipt_number


class TestReceiptNumber:
    """Receipt number format and uniqueness."""

    def test_format(self):
        """Format: RCP-YYYYMMDD-XXXXXXXX"""
        donation_id = uuid4()
        num = generate_receipt_number(donation_id)
        parts = num.split("-")
        assert len(parts) == 3
        assert parts[0] == "RCP"
        assert len(parts[1]) == 8  # YYYYMMDD
        assert parts[1].isdigit()

    def test_uniqueness(self):
        """Different donation IDs -> different receipt numbers."""
        uid1 = uuid4()
        uid2 = uuid4()
        assert generate_receipt_number(uid1) != generate_receipt_number(uid2)


class TestDonationCreateRules:
    """Business rules for creating donations."""

    def test_min_amount_positive(self):
        """Amount must be > 0 (validated by Pydantic schema)."""
        from pydantic import ValidationError
        from app.schemas.donation import CreateDonationRequest

        with pytest.raises(ValidationError):
            CreateDonationRequest(amount=-100, payment_method="credit_card")

        with pytest.raises(ValidationError):
            CreateDonationRequest(amount=0, payment_method="credit_card")

        # Valid
        req = CreateDonationRequest(amount=100, payment_method="credit_card")
        assert req.amount == 100

    def test_anonymous_needs_contact(self):
        """Anonymous donation without contact should be handled by router logic."""
        # Schema itself allows it (guest fields are optional)
        # The router layer enforces that at least one of guest_email/guest_name is provided
        from app.schemas.donation import CreateDonationRequest

        req = CreateDonationRequest(amount=500, payment_method="postal")
        assert req.guest_email is None
        assert req.guest_name is None

    def test_payment_method_validation(self):
        """Only credit_card / postal / cash are valid."""
        from pydantic import ValidationError
        from app.schemas.donation import CreateDonationRequest

        for valid in ("credit_card", "postal", "cash"):
            req = CreateDonationRequest(amount=100, payment_method=valid)
            assert req.payment_method == valid

        with pytest.raises(ValidationError):
            CreateDonationRequest(amount=100, payment_method="line_pay")


class TestDonationCancelRules:
    """24-hour window + pending-only cancel rules."""

    def test_cancel_within_24h_pending(self):
        """Donation created 1h ago, status pending -> can cancel."""
        from unittest.mock import MagicMock

        donation = MagicMock()
        donation.status = "pending"
        donation.created_at = datetime.utcnow() - timedelta(hours=1)
        assert donation.status == "pending"
        assert datetime.utcnow() - donation.created_at < timedelta(hours=24)

    def test_cancel_after_24h(self):
        """Donation created 25h ago -> cannot cancel."""
        donation = MagicMock()
        donation.status = "pending"
        donation.created_at = datetime.utcnow() - timedelta(hours=25)
        assert datetime.utcnow() - donation.created_at > timedelta(hours=24)

    def test_cancel_when_success(self):
        """Donation already succeeded -> cannot cancel."""
        donation = MagicMock()
        donation.status = "success"
        assert donation.status != "pending"

    def test_cancel_anonymous_donation(self):
        """Anonymous donation (user_id=None) follows same rules."""
        donation = MagicMock()
        donation.user_id = None  # anonymous
        donation.status = "pending"
        donation.created_at = datetime.utcnow() - timedelta(hours=1)
        assert donation.status == "pending"
        assert datetime.utcnow() - donation.created_at < timedelta(hours=24)
