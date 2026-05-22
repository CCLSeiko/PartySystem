"""Base repository — common CRUD operations."""

from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Generic repository providing common CRUD methods for a model.

    Usage:
        class UserRepository(BaseRepository[User]):
            ...

    Subclasses add domain-specific query methods.
    """

    def __init__(self, model: type[ModelT], session: AsyncSession) -> None:
        self.model = model
        self.session = session

    async def create(self, **kwargs) -> ModelT:
        """Create a new instance and flush (no commit)."""
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.flush()
        return instance

    async def get(self, id: UUID) -> ModelT | None:
        """Fetch by primary key."""
        return await self.session.get(self.model, id)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: str | None = None,
    ) -> list[ModelT]:
        """Fetch all rows with optional pagination and ordering."""
        stmt = select(self.model).offset(skip).limit(limit)
        if order_by:
            col = getattr(self.model, order_by, None)
            if col is not None:
                stmt = stmt.order_by(col)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, id: UUID, **kwargs) -> ModelT | None:
        """Update fields of an existing row (partial).  Returns the
        updated instance or ``None`` if not found."""
        instance = await self.get(id)
        if instance is None:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(instance, key):
                setattr(instance, key, value)
        await self.session.flush()
        return instance

    async def delete(self, id: UUID, soft: bool = False) -> bool:
        """Delete (or soft-delete) a row by PK.

        When ``soft=True`` the model must have an ``is_active`` column.
        Returns ``True`` if a row was affected.
        """
        instance = await self.get(id)
        if instance is None:
            return False
        if soft and hasattr(instance, "is_active"):
            instance.is_active = False  # type: ignore[assignment]
            await self.session.flush()
        else:
            await self.session.delete(instance)
            await self.session.flush()
        return True

    async def count(self) -> int:
        """Return the total number of rows."""
        from sqlalchemy import func as sa_func

        stmt = select(sa_func.count()).select_from(self.model)
        result = await self.session.execute(stmt)
        return result.scalar_one()
