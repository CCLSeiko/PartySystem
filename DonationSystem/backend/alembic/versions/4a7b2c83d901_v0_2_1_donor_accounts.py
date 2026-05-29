"""v0.2.1 — donor accounts, user phone fields, subscription purpose

Adds:
1. ``phone_home``, ``phone_mobile``, ``phone_work``, ``birthday`` to ``users``
2. New ``donor_accounts`` table (payment authorization records)
3. ``purpose`` column to ``subscriptions``

Revision ID: 4a7b2c83d901
Revises: 4296c43983b8
Create Date: 2026-05-25 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "4a7b2c83d901"
down_revision: Union[str, None] = "4296c43983b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. users — add phone variants + birthday ──────────────
    op.add_column("users", sa.Column("phone_home", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("phone_mobile", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("phone_work", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("birthday", sa.String(8), nullable=True))
    # Widen role column from 10 to 20 to accommodate "donation_maintainer"
    op.alter_column("users", "role", type_=sa.String(20), existing_type=sa.String(10))

    # ── 2. donor_accounts (new table) ─────────────────────────
    op.create_table(
        "donor_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("guest_email", sa.String(255), nullable=True),
        sa.Column("guest_name", sa.String(100), nullable=True),

        # Common fields
        sa.Column("account_type", sa.String(20), nullable=False),
        sa.Column("auth_start_date", sa.String(8), nullable=True),
        sa.Column("auth_end_date", sa.String(8), nullable=True),
        sa.Column("authorized_person", sa.String(100), nullable=False),
        sa.Column("donation_amount", sa.Numeric(12, 2), nullable=False),

        # Credit-card specific
        sa.Column("card_issuing_bank", sa.String(100), nullable=True),
        sa.Column("card_cvv", sa.String(10), nullable=True),
        sa.Column("card_type", sa.String(20), nullable=True),
        sa.Column("card_number", sa.LargeBinary, nullable=True),
        sa.Column("card_number_iv", sa.LargeBinary, nullable=True),
        sa.Column("card_expiry_month", sa.String(2), nullable=True),
        sa.Column("card_expiry_year", sa.String(4), nullable=True),

        # Postal-transfer specific
        sa.Column("postal_account", sa.String(50), nullable=True),

        # Bank-transfer specific
        sa.Column("bank_account", sa.String(50), nullable=True),

        # Status & timestamps
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # ── 3. subscriptions — add purpose ────────────────────────
    op.add_column("subscriptions", sa.Column("purpose", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("subscriptions", "purpose")
    op.drop_table("donor_accounts")
    op.drop_column("users", "birthday")
    op.drop_column("users", "phone_work")
    op.drop_column("users", "phone_mobile")
    op.drop_column("users", "phone_home")
