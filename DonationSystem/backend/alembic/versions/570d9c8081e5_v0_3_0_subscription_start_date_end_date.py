"""v0.3.0 subscription start_date end_date

Revision ID: 570d9c8081e5
Revises: 4a7b2c83d901
Create Date: 2026-05-29 13:31:19.880822

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '570d9c8081e5'
down_revision: Union[str, Sequence[str], None] = '4a7b2c83d901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add start_date as nullable first so existing rows get populated
    op.add_column('subscriptions', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('subscriptions', sa.Column('end_date', sa.Date(), nullable=True))

    # Backfill start_date for existing rows using created_at or today
    op.execute(
        "UPDATE subscriptions SET start_date = DATE(created_at) WHERE start_date IS NULL"
    )

    # Now make start_date NOT NULL
    op.alter_column('subscriptions', 'start_date', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('subscriptions', 'end_date')
    op.drop_column('subscriptions', 'start_date')
