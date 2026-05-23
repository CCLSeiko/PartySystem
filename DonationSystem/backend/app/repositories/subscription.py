"""Subscription repository."""

from datetime import date
from uuid import UUID

from sqlalchemy import func, select

from app.models.donation import Donation
from app.models.subscription import Subscription
from app.repositories.base import BaseRepository


class SubscriptionRepository(BaseRepository[Subscription]):
    """Repository for the ``Subscription`` model."""

    def __init__(self, session) -> None:
        super().__init__(Subscription, session)

    async def get_active_by_user(self, user_id) -> list[Subscription]:
        """Get all active subscriptions for a user."""
        stmt = (
            select(Subscription)
            .where(Subscription.user_id == user_id)
            .where(Subscription.status == "active")
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_due_for_billing(self, billing_date: date | None = None) -> list[Subscription]:
        """Get active subscriptions whose ``next_billing_date`` is today or earlier."""
        target = billing_date or date.today()
        stmt = (
            select(Subscription)
            .where(Subscription.status == "active")
            .where(Subscription.next_billing_date <= target)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def cancel(self, subscription_id) -> Subscription | None:
        """Cancel a subscription (soft: status -> cancelled)."""
        sub = await self.get(subscription_id)
        if sub is None:
            return None
        sub.status = "cancelled"
        await self.session.flush()
        return sub

    async def search(
        self,
        user_id: UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Subscription]:
        """Search subscriptions with optional filters."""
        stmt = select(Subscription).order_by(Subscription.created_at.desc())
        if user_id is not None:
            stmt = stmt.where(Subscription.user_id == user_id)
        if status is not None:
            stmt = stmt.where(Subscription.status == status)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_search(
        self,
        user_id: UUID | None = None,
        status: str | None = None,
    ) -> int:
        """Count subscriptions matching filters (for pagination)."""
        stmt = select(func.count(Subscription.id))
        if user_id is not None:
            stmt = stmt.where(Subscription.user_id == user_id)
        if status is not None:
            stmt = stmt.where(Subscription.status == status)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def get_history(
        self,
        subscription_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Donation]:
        """Get billing history (Donations) for a subscription."""
        stmt = (
            select(Donation)
            .where(Donation.subscription_id == subscription_id)
            .order_by(Donation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_history(self, subscription_id: UUID) -> int:
        """Count billing history records for a subscription."""
        stmt = select(func.count(Donation.id)).where(
            Donation.subscription_id == subscription_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
