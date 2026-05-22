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

    async def get_with_payment(self, donation_id: UUID) -> Donation | None:
        """Get a donation with the payment relationship eagerly loaded."""
        from sqlalchemy.orm import selectinload
        stmt = (
            select(Donation)
            .where(Donation.id == donation_id)
            .options(selectinload(Donation.payment))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

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

    async def search(
        self,
        user_id: UUID | None = None,
        status: str | None = None,
        payment_method: str | None = None,
        purpose: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        is_recurring: bool | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Donation]:
        """Flexible search with multiple optional filters, newest first."""
        from sqlalchemy.orm import selectinload
        stmt = select(Donation).options(selectinload(Donation.user)).order_by(Donation.created_at.desc())

        if user_id is not None:
            stmt = stmt.where(Donation.user_id == user_id)
        if status is not None:
            stmt = stmt.where(Donation.status == status)
        if payment_method is not None:
            stmt = stmt.where(Donation.payment_method == payment_method)
        if purpose is not None:
            stmt = stmt.where(Donation.purpose == purpose)
        if is_recurring is not None:
            stmt = stmt.where(Donation.is_recurring == is_recurring)
        if start_date is not None:
            stmt = stmt.where(Donation.created_at >= start_date)
        if end_date is not None:
            stmt = stmt.where(Donation.created_at <= end_date)

        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_search(
        self,
        user_id: UUID | None = None,
        status: str | None = None,
        payment_method: str | None = None,
        purpose: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        is_recurring: bool | None = None,
    ) -> int:
        """Count donations matching the given filters (for pagination)."""
        stmt = select(func.count(Donation.id))

        if user_id is not None:
            stmt = stmt.where(Donation.user_id == user_id)
        if status is not None:
            stmt = stmt.where(Donation.status == status)
        if payment_method is not None:
            stmt = stmt.where(Donation.payment_method == payment_method)
        if purpose is not None:
            stmt = stmt.where(Donation.purpose == purpose)
        if is_recurring is not None:
            stmt = stmt.where(Donation.is_recurring == is_recurring)
        if start_date is not None:
            stmt = stmt.where(Donation.created_at >= start_date)
        if end_date is not None:
            stmt = stmt.where(Donation.created_at <= end_date)

        result = await self.session.execute(stmt)
        return result.scalar_one()
