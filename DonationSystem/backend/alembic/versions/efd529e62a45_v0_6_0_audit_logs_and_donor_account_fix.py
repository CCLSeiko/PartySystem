"""v0.6.0_audit_logs_and_donor_account_fix

Revision ID: efd529e62a45
Revises: b8c9d0e1f2a3
Create Date: 2026-06-03 14:31:34.876784

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'efd529e62a45'
down_revision: Union[str, Sequence[str], None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create audit_logs table."""
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('level', sa.String(20), nullable=False, index=True),
        sa.Column('category', sa.String(50), nullable=False, index=True),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('source', sa.String(20), nullable=False, server_default='backend'),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('user_email', sa.String(255), nullable=True),
        sa.Column('method', sa.String(10), nullable=True),
        sa.Column('path', sa.String(500), nullable=True),
        sa.Column('status_code', sa.String(10), nullable=True),
        sa.Column('error_type', sa.String(100), nullable=True),
        sa.Column('stack_trace', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    """Drop audit_logs table."""
    op.drop_table('audit_logs')
