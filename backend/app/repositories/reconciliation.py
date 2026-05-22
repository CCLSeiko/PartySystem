"""ReconciliationRecord repository."""

from app.models.reconciliation import ReconciliationRecord
from app.repositories.base import BaseRepository


class ReconciliationRepository(BaseRepository[ReconciliationRecord]):
    """Repository for the ``ReconciliationRecord`` model."""

    def __init__(self, session) -> None:
        super().__init__(ReconciliationRecord, session)

    async def get_by_hash(self, file_hash: str) -> ReconciliationRecord | None:
        """Check if a file with the same SHA-256 hash was already uploaded."""
        from sqlalchemy import select

        stmt = select(ReconciliationRecord).where(
            ReconciliationRecord.file_hash == file_hash
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
