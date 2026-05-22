"""Donation repository."""

from uuid import UUID

from sqlalchemy import func, select

from app.models.donation import Donation
from app.repositories.base import BaseRepository


class DonationRepository(BaseRepository[Donation]):
    """Repository for the ``Donation`` model."""

    def __init__(self, session) -> None:
        super().__init__(Donation, session)

    async def get_by_user(self, user_id: UUID, skip: int = 0, limit: int = 20) -> list[Donation]:
        """Get donations for a specific user, newest first."""
        stmt = (
            select(Donation)
            .where(Donation.user_id == user_id)
            .order_by(Donation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_status(self, status: str, skip: int = 0, limit: int = 50) -> list[Donation]:
        """Get donations by status (pending / success / failed / cancelled)."""
        stmt = (
            select(Donation)
            .where(Donation.status == status)
            .order_by(Donation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_receipt_by_number(self, receipt_number: str) -> Donation | None:
        """Look up a donation by its receipt number."""
        stmt = select(Donation).where(Donation.receipt_number == receipt_number)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_gateway_tx(self, gateway_tx_id: str) -> Donation | None:
        """Look up a donation by its associated payment gateway transaction ID."""
        from app.models.payment import Payment

        stmt = (
            select(Donation)
            .join(Payment, Payment.donation_id == Donation.id)
            .where(Payment.gateway_transaction_id == gateway_tx_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def total_amount(self) -> float:
        """Sum of all successful donations."""
        stmt = select(func.sum(Donation.amount)).where(Donation.status == "success")
        result = await self.session.execute(stmt)
        return float(result.scalar_one() or 0)
