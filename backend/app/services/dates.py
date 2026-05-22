"""Date calculation utilities for subscription billing schedules."""

from datetime import date, timedelta
from dateutil.relativedelta import relativedelta


def compute_next_billing_date(
    from_date: date,
    frequency: str,
) -> date:
    """Compute the next billing date based on frequency.

    Args:
        from_date:  The reference date (usually the last billing date or the
                    initial creation date).
        frequency:  ``monthly``, ``quarterly``, or ``yearly``.

    Returns:
        The next billing date.
    """
    if frequency == "monthly":
        return from_date + relativedelta(months=1)
    elif frequency == "quarterly":
        return from_date + relativedelta(months=3)
    elif frequency == "yearly":
        return from_date + relativedelta(years=1)
    else:
        raise ValueError(f"Unknown frequency: {frequency}")
