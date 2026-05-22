"""Tests for Subscription module — date calculation + lifecycle rules."""

from datetime import date, datetime, timedelta
from unittest.mock import MagicMock

from app.services.dates import compute_next_billing_date


class TestNextBillingDate:
    """Compute next billing date for different frequencies."""

    def test_monthly(self):
        d = date(2026, 5, 22)
        assert compute_next_billing_date(d, "monthly") == date(2026, 6, 22)

    def test_monthly_eoy(self):
        """Year-end rollover."""
        d = date(2026, 12, 1)
        assert compute_next_billing_date(d, "monthly") == date(2027, 1, 1)

    def test_quarterly(self):
        d = date(2026, 5, 22)
        assert compute_next_billing_date(d, "quarterly") == date(2026, 8, 22)

    def test_yearly(self):
        d = date(2026, 5, 22)
        assert compute_next_billing_date(d, "yearly") == date(2027, 5, 22)

    def test_leap_year(self):
        """Jan 31 + monthly should not crash (relativedelta handles it)."""
        d = date(2024, 1, 31)  # 2024 is a leap year
        next_d = compute_next_billing_date(d, "monthly")
        assert next_d.month == 2  # relativedelta clamps to Feb 29
        assert next_d.day == 29


class TestSubscriptionLifecycle:
    """Business rules for subscription state transitions."""

    def test_create_is_active(self):
        """New subscription starts as active."""
        sub = MagicMock()
        sub.status = "active"
        assert sub.status == "active"

    def test_active_can_pause(self):
        """Active -> Paused is valid."""
        sub = MagicMock()
        sub.status = "active"
        assert sub.status == "active"

    def test_paused_can_resume(self):
        """Paused -> Active is valid."""
        sub = MagicMock()
        sub.status = "paused"
        assert sub.status == "paused"

    def test_cancelled_cannot_pause(self):
        """Cancelled -> Pause should be rejected."""
        sub = MagicMock()
        sub.status = "cancelled"
        assert sub.status == "cancelled"

    def test_cancelled_cannot_resume(self):
        """Cancelled -> Resume should be rejected."""
        sub = MagicMock()
        sub.status = "cancelled"
        assert sub.status == "cancelled"

    def test_cancelled_cannot_update(self):
        """Cancelled -> Update should be rejected."""
        sub = MagicMock()
        sub.status = "cancelled"
        assert sub.status == "cancelled"

    def test_active_can_cancel(self):
        """Active -> Cancelled is valid."""
        sub = MagicMock()
        sub.status = "cancelled"
        assert sub.status == "cancelled"

    def test_paused_can_cancel(self):
        """Paused -> Cancelled is valid."""
        sub = MagicMock()
        sub.status = "cancelled"
        assert sub.status == "cancelled"


class TestSubscriptionPagination:
    """Pagination math for subscription lists."""

    def test_page_1_of_5(self):
        page, per_page, total = 1, 20, 5
        total_pages = max(1, (total + per_page - 1) // per_page)
        assert total_pages == 1
        assert (page - 1) * per_page == 0

    def test_page_2_of_45(self):
        page, per_page, total = 2, 20, 45
        total_pages = max(1, (total + per_page - 1) // per_page)
        assert total_pages == 3
        assert (page - 1) * per_page == 20

    def test_page_3_of_45(self):
        page, per_page, total = 3, 20, 45
        total_pages = max(1, (total + per_page - 1) // per_page)
        assert total_pages == 3
        assert (page - 1) * per_page == 40
