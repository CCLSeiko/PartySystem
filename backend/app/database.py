"""Database connection and session management.

The async engine is created lazily so that Alembic's offline mode
can import models without requiring asyncpg installation.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


def get_async_engine():
    """Create the async engine on demand to avoid premature connection."""
    return create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_size=10,
        max_overflow=20,
    )


def get_async_session_factory():
    """Create the async session factory on demand."""
    engine = get_async_engine()
    return async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
