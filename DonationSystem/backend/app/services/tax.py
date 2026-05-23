"""Tax service — generate CSV for tax authority submission."""

import csv
import io
import logging
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.donation import Donation
from app.models.user import User
from app.repositories.tax_report import TaxReportRepository

logger = logging.getLogger(__name__)


async def generate_tax_csv(year: int, session: AsyncSession) -> str:
    """Generate a CSV string for the given tax year.

    CSV columns (符合國稅局格式):
        身分證字號,姓名,捐款金額合計,捐款日期,收據編號

    Only includes donors who have:
    - ``tax_consent = True``
    - At least one successful donation in the given year
    """
    # Query successful donations for the year, joined with users who consented
    stmt = (
        select(
            User.identity_number,
            User.name,
            Donation.amount,
            Donation.created_at,
            Donation.receipt_number,
        )
        .join(Donation, Donation.user_id == User.id)
        .where(User.tax_consent == True)
        .where(Donation.status == "success")
        .where(func.extract("year", Donation.created_at) == year)
        .order_by(User.name, Donation.created_at)
    )
    result = await session.execute(stmt)
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["身分證字號", "姓名", "捐款金額合計", "捐款日期", "收據編號"])

    for identity_number, name, amount, created_at, receipt_number in rows:
        # identity_number is stored as encrypted BYTEA; if we can't decrypt,
        # we default to empty string.  In production the decryption key
        # (Cloud KMS) must be available.
        id_str = _decrypt_identity(identity_number) if identity_number else ""
        writer.writerow([
            id_str,
            name,
            str(amount),
            created_at.strftime("%Y-%m-%d") if created_at else "",
            receipt_number or "",
        ])

    return output.getvalue()


async def get_year_summary(year: int, session: AsyncSession) -> dict:
    """Compute summary statistics for a tax year."""
    # Total donors (unique users with at least one successful donation in the year)
    donor_count_stmt = (
        select(func.count(func.distinct(Donation.user_id)))
        .where(Donation.status == "success")
        .where(func.extract("year", Donation.created_at) == year)
    )
    total_donors = (await session.execute(donor_count_stmt)).scalar_one()

    # Donors who consented to tax reporting
    consented_stmt = (
        select(func.count(func.distinct(Donation.user_id)))
        .join(User, Donation.user_id == User.id)
        .where(Donation.status == "success")
        .where(User.tax_consent == True)
        .where(func.extract("year", Donation.created_at) == year)
    )
    tax_consented = (await session.execute(consented_stmt)).scalar_one()

    # Total successful amount
    amount_stmt = (
        select(func.sum(Donation.amount))
        .where(Donation.status == "success")
        .where(func.extract("year", Donation.created_at) == year)
    )
    total_amount = (await session.execute(amount_stmt)).scalar_one() or Decimal("0")

    # Tax-deductible amount (all successful donations are tax deductible)
    tax_deductible_stmt = (
        select(func.sum(Donation.amount))
        .where(Donation.status == "success")
        .where(Donation.tax_deductible == True)
        .where(func.extract("year", Donation.created_at) == year)
    )
    tax_deductible = (await session.execute(tax_deductible_stmt)).scalar_one() or Decimal("0")

    return {
        "year": year,
        "total_donors": total_donors,
        "total_tax_consented": tax_consented,
        "total_amount": total_amount,
        "tax_deductible_amount": tax_deductible,
    }


def _decrypt_identity(encrypted_data) -> str:
    """Placeholder — decrypt the AES-256-GCM encrypted identity_number.

    TODO: Implement with Cloud KMS when the encryption service is ready.
    """
    return "[加密資料]"
