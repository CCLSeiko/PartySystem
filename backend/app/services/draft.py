"""Postal draft number generation."""

from datetime import date
from uuid import UUID

# Simulated sequential counter per day
_draft_counters: dict[str, int] = {}


def generate_draft_number(donation_id: UUID) -> str:
    """Generate a unique postal draft number.

    Format: POST-YYYYMMDD-NNNN
      - POST:  固定前綴
      - YYYYMMDD: 建立日期
      - NNNN:    當日流水號（0001 起）

    Examples:
      POST-20260522-0001
      POST-20260522-0002

    Note: in production the counter should come from a DB sequence
    rather than an in-memory dict so that multiple workers stay
    consistent.
    """
    today = date.today().strftime("%Y%m%d")
    _draft_counters[today] = _draft_counters.get(today, 0) + 1
    seq = _draft_counters[today]
    return f"POST-{today}-{seq:04d}"
