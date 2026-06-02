"""add force_password_change to users

Revision ID: b8c9d0e1f2a3
Revises: 7a8b9c0d1e2f
Create Date: 2026-06-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "b8c9d0e1f2a3"
down_revision = "7a8b9c0d1e2f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "force_password_change",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "force_password_change")
