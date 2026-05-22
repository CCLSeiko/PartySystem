"""User repository — auth-specific queries."""

from uuid import UUID

from sqlalchemy import select

from app.models.user import User
from app.repositories.base import BaseRepository
from app.core.security import hash_password, verify_password


class UserRepository(BaseRepository[User]):
    """Repository for the ``User`` model."""

    def __init__(self, session) -> None:
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> User | None:
        """Look up a user by email address."""
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_user(
        self,
        email: str,
        password: str,
        name: str,
        **extra,
    ) -> User:
        """Create a new user with a hashed password."""
        return await self.create(
            email=email,
            password_hash=hash_password(password),
            name=name,
            **extra,
        )

    async def verify_login(self, email: str, password: str) -> User | None:
        """Authenticate a user by email + password.

        Returns the ``User`` on success, ``None`` on failure.
        """
        user = await self.get_by_email(email)
        if user is None:
            return None
        if not verify_password(password, user.password_hash):
            return None
        if not user.is_active:
            return None
        return user

    async def update_password(self, user_id: UUID, new_password: str) -> bool:
        """Update a user's password hash."""
        user = await self.get(user_id)
        if user is None:
            return False
        user.password_hash = hash_password(new_password)
        await self.session.flush()
        return True
