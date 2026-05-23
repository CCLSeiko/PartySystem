"""TaxReport repository."""

from sqlalchemy import select

from app.models.tax_report import TaxReport
from app.repositories.base import BaseRepository


class TaxReportRepository(BaseRepository[TaxReport]):
    """Repository for the ``TaxReport`` model."""

    def __init__(self, session) -> None:
        super().__init__(TaxReport, session)

    async def get_by_year(self, year: int) -> TaxReport | None:
        """Get the latest tax report for a given year."""
        stmt = (
            select(TaxReport)
            .where(TaxReport.year == year)
            .order_by(TaxReport.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
