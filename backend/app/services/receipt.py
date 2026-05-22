"""Receipt number generation utilities."""

from datetime import date, datetime


def generate_receipt_number(donation_id) -> str:
    """Generate a unique receipt number.

    Format: RCP-YYYYMMDD-XXXXXXXX
      - RCP: 固定前綴
      - YYYYMMDD: 建立日期
      - XXXXXXXX: donation_id 前 8 碼（確保唯一性）

    Examples:
      RCP-20260522-1a2b3c4d
    """
    today = date.today().strftime("%Y%m%d")
    short_id = str(donation_id).replace("-", "")[:8]
    return f"RCP-{today}-{short_id}"
