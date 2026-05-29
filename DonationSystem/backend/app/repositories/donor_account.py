"""DonorAccount repository — CRUD operations for payment-authorization records."""

from uuid import UUID

from sqlalchemy import func, select

from app.models.donor_account import DonorAccount
from app.repositories.base import BaseRepository


class DonorAccountRepository(BaseRepository[DonorAccount]):
    """Repository for the ``DonorAccount`` model."""

    def __init__(self, session) -> None:
        super().__init__(DonorAccount, session)

    async def get_by_user(self, user_id: UUID) -> list[DonorAccount]:
        """Get all active donor accounts for a given user."""
        stmt = (
            select(DonorAccount)
            .where(DonorAccount.user_id == user_id)
            .where(DonorAccount.is_active.is_(True))
            .order_by(DonorAccount.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, id: UUID, **kwargs) -> DonorAccount | None:
        """Update fields of an existing donor account (partial)."""
        instance = await self.get(id)
        if instance is None:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(instance, key):
                setattr(instance, key, value)
        await self.session.flush()
        return instance

    async def soft_delete(self, account_id: UUID) -> bool:
        """Soft-delete a donor account by setting is_active=False."""
        account = await self.get(account_id)
        if account is None:
            return False
        account.is_active = False
        await self.session.flush()
        return True

    async def search(
        self,
        user_id: UUID | None = None,
        account_type: str | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[DonorAccount]:
        """Search donor accounts with optional filters."""
        stmt = select(DonorAccount).order_by(DonorAccount.created_at.desc())
        if user_id is not None:
            stmt = stmt.where(DonorAccount.user_id == user_id)
        if account_type is not None:
            stmt = stmt.where(DonorAccount.account_type == account_type)
        if is_active is not None:
            stmt = stmt.where(DonorAccount.is_active.is_(is_active))
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_search(
        self,
        user_id: UUID | None = None,
        account_type: str | None = None,
        is_active: bool | None = None,
    ) -> int:
        """Count donor accounts matching filters (for pagination)."""
        stmt = select(func.count(DonorAccount.id))
        if user_id is not None:
            stmt = stmt.where(DonorAccount.user_id == user_id)
        if account_type is not None:
            stmt = stmt.where(DonorAccount.account_type == account_type)
        if is_active is not None:
            stmt = stmt.where(DonorAccount.is_active.is_(is_active))
        result = await self.session.execute(stmt)
        return result.scalar_one()
