"""Expand auth_start_date and auth_end_date columns to YYYY-MM-DD format

Revision ID: expand_date_001
Revises: b8c9d0e1f2a3
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'expand_date_001'
down_revision = 'efd529e62a45'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.alter_column('donor_accounts', 'auth_start_date',
                     type_=sa.String(10),
                     existing_type=sa.String(8))
    op.alter_column('donor_accounts', 'auth_end_date',
                     type_=sa.String(10),
                     existing_type=sa.String(8))

def downgrade() -> None:
    op.alter_column('donor_accounts', 'auth_start_date',
                     type_=sa.String(8),
                     existing_type=sa.String(10))
    op.alter_column('donor_accounts', 'auth_end_date',
                     type_=sa.String(8),
                     existing_type=sa.String(10))
