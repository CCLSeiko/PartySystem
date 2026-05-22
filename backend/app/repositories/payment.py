"""Payment repository."""

from uuid import UUID

from sqlalchemy import select

from app.models.payment import Payment
from app.repositories.base import BaseRepository


class PaymentRepository(BaseRepository[Payment]):
    """Repository for the ``Payment`` model."""

    def __init__(self, session) -> None:
        super().__init__(Payment, session)

    async def get_by_donation(self, donation_id: UUID) -> Payment | None:
        """Get the payment linked to a specific donation."""
        stmt = select(Payment).where(Payment.donation_id == donation_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_gateway_tx(self, gateway_tx_id: str) -> Payment | None:
        """Look up a payment by its gateway transaction ID (e.g. pi_xxx / TradeNo)."""
        stmt = select(Payment).where(Payment.gateway_transaction_id == gateway_tx_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_webhook_pending(self) -> list[Payment]:
        """Get payments waiting for a webhook callback."""
        stmt = (
            select(Payment)
            .where(Payment.webhook_received == False)
            .where(Payment.status == "pending")
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
