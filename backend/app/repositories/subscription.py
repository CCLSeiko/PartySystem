"""Subscription repository."""

from datetime import date

from sqlalchemy import select

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
