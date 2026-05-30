"""v0.4.0 system_settings + password_reset

Create ``system_settings`` table and add ``password_reset_token`` /
``password_reset_token_expires`` columns to ``users`` table.

Revision ID: 7a8b9c0d1e2f
Revises: 570d9c8081e5
Create Date: 2026-05-30 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "7a8b9c0d1e2f"
down_revision: Union[str, None] = "570d9c8081e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── system_settings table ─────────────────────────────────
    op.create_table(
        "system_settings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("key", sa.String(100), nullable=False, index=True, unique=True),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    # ── password_reset columns on users table ─────────────────
    op.add_column("users", sa.Column("password_reset_token", sa.String(255), nullable=True, index=True))
    op.add_column("users", sa.Column("password_reset_token_expires", sa.DateTime(), nullable=True))


def downgrade() -> None:
    # ── Drop password_reset columns ───────────────────────────
    op.drop_column("users", "password_reset_token_expires")
    op.drop_column("users", "password_reset_token")

    # ── Drop system_settings table ────────────────────────────
    op.drop_table("system_settings")
