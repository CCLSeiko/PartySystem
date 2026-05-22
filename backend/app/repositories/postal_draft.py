"""PostalDraft repository."""

from app.models.postal_draft import PostalDraft
from app.repositories.base import BaseRepository


class PostalDraftRepository(BaseRepository[PostalDraft]):
    """Repository for the ``PostalDraft`` model."""

    def __init__(self, session) -> None:
        super().__init__(PostalDraft, session)
