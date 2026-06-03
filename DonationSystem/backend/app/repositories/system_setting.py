"""SystemSetting repository — key-value CRUD."""

from sqlalchemy import select

from app.models.system_setting import SystemSetting
from app.repositories.base import BaseRepository


class SystemSettingRepository(BaseRepository[SystemSetting]):
    """Repository for the ``SystemSetting`` model."""

    def __init__(self, session) -> None:
        super().__init__(SystemSetting, session)

    async def get_by_key(self, key: str) -> SystemSetting | None:
        """Fetch a setting by its key."""
        stmt = select(SystemSetting).where(SystemSetting.key == key)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_value(self, key: str) -> str | None:
        """Fetch a setting value by its key. Returns None if not found."""
        setting = await self.get_by_key(key)
        return setting.value if setting else None

    async def upsert(self, key: str, value: str) -> SystemSetting:
        """Insert or update a setting by key."""
        existing = await self.get_by_key(key)
        if existing:
            existing.value = value
            await self.session.flush()
            return existing
        return await self.create(key=key, value=value)

    async def get_all_as_dict(self) -> dict[str, str]:
        """Return all settings as a flat dict."""
        stmt = select(SystemSetting)
        result = await self.session.execute(stmt)
        rows = result.scalars().all()
        return {r.key: r.value for r in rows}
