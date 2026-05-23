"""initial_schema

Revision ID: 4296c43983b8
Revises: 
Create Date: 2026-05-22 18:44:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "4296c43983b8"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. users ──────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("identity_number", sa.LargeBinary, nullable=True),
        sa.Column("identity_number_iv", sa.LargeBinary, nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("tax_consent", sa.Boolean, default=False, nullable=False),
        sa.Column("is_anonymous", sa.Boolean, default=False, nullable=False),
        sa.Column("role", sa.String(10), default="user", nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # ── 2. subscriptions (created before donations due to FK) ─
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), default="TWD", nullable=False),
        sa.Column("frequency", sa.String(10), nullable=False),
        sa.Column("total_cycles", sa.Integer, default=0),
        sa.Column("cycles_completed", sa.Integer, default=0),
        sa.Column("payment_method", sa.String(20), default="credit_card"),
        sa.Column("gateway_customer_id", sa.String(255), nullable=True),
        sa.Column("gateway_payment_method_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), default="active", nullable=False, index=True),
        sa.Column("consecutive_failures", sa.Integer, default=0),
        sa.Column("next_billing_date", sa.Date, nullable=False, index=True),
        sa.Column("last_billing_date", sa.Date, nullable=True),
        sa.Column("cancelled_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # ── 3. donations ──────────────────────────────────────────
    op.create_table(
        "donations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("guest_email", sa.String(255), nullable=True),
        sa.Column("guest_name", sa.String(100), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), default="TWD", nullable=False),
        sa.Column("purpose", sa.String(100), nullable=True),
        sa.Column("payment_method", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), default="pending", nullable=False, index=True),
        sa.Column("is_recurring", sa.Boolean, default=False, nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("subscriptions.id"), nullable=True),
        sa.Column("receipt_number", sa.String(50), unique=True, nullable=True),
        sa.Column("tax_deductible", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, index=True),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # ── 4. payments ───────────────────────────────────────────
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("donation_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("donations.id"), nullable=False, unique=True),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("subscriptions.id"), nullable=True),
        sa.Column("payment_gateway", sa.String(20), nullable=False),
        sa.Column("gateway_transaction_id", sa.String(255), nullable=True, index=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), default="TWD", nullable=False),
        sa.Column("status", sa.String(20), default="pending", nullable=False, index=True),
        sa.Column("failure_reason", sa.Text, nullable=True),
        sa.Column("webhook_received", sa.Boolean, default=False, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # ── 5. postal_drafts ──────────────────────────────────────
    op.create_table(
        "postal_drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("donation_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("donations.id"), nullable=False, unique=True),
        sa.Column("draft_number", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("postal_account", sa.String(20), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(20), default="generated", nullable=False, index=True),
        sa.Column("reconciled_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # ── 6. reconciliation_records ─────────────────────────────
    op.create_table(
        "reconciliation_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=False),
        sa.Column("total_records", sa.Integer, default=0),
        sa.Column("matched_count", sa.Integer, default=0),
        sa.Column("unmatched_count", sa.Integer, default=0),
        sa.Column("status", sa.String(20), default="processing", nullable=False),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # ── 7. tax_reports ────────────────────────────────────────
    op.create_table(
        "tax_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("year", sa.Integer, nullable=False, index=True),
        sa.Column("generated_at", sa.DateTime, nullable=False),
        sa.Column("file_path", sa.String(500), nullable=True),
        sa.Column("total_donors", sa.Integer, default=0),
        sa.Column("total_amount", sa.Numeric(14, 2), default=0),
        sa.Column("status", sa.String(20), default="generating", nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    """Drop all tables in reverse dependency order."""
    op.drop_table("tax_reports")
    op.drop_table("reconciliation_records")
    op.drop_table("postal_drafts")
    op.drop_table("payments")
    op.drop_table("donations")
    op.drop_table("subscriptions")
    op.drop_table("users")
