"""Admin schemas — request/response models for admin endpoints."""

from datetime import datetime
from uuid import UUID
from decimal import Decimal

from pydantic import BaseModel, Field


# ── Settings ───────────────────────────────────────────────────

class AdminSettingsRequest(BaseModel):
    min_donation_amount: Decimal | None = Field(None, gt=0)
    donation_purposes: list[str] | None = None
    subscription_retry_limit: int | None = Field(None, ge=1)
    auto_pause_after_failures: int | None = Field(None, ge=1)


class AdminSettingsResponse(BaseModel):
    updated_fields: list[str]


# ── Stats ──────────────────────────────────────────────────────

class StatsSummary(BaseModel):
    total_donations: int
    total_amount: Decimal
    avg_per_donation: Decimal
    total_recurring: int = 0
    recurring_success_rate: float = 0.0


class StatsResponse(BaseModel):
    summary: StatsSummary
    by_method: dict[str, Decimal] = {}
    by_purpose: dict[str, Decimal] = {}
    time_series: list[dict] = []


# ── Reconciliation ─────────────────────────────────────────────

class ReconciliationUploadResponse(BaseModel):
    reconciliation_id: UUID
    file_name: str
    file_hash: str
    status: str = "processing"
    message: str = "對帳處理中，完成後將更新結果"


class ReconciliationItem(BaseModel):
    id: UUID
    file_name: str
    total_records: int = 0
    matched_count: int = 0
    unmatched_count: int = 0
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UnmatchedItem(BaseModel):
    row: int
    draft_number: str
    expected_amount: Decimal
    actual_amount: Decimal
    reason: str


class ReconciliationDetailResponse(BaseModel):
    id: UUID
    file_name: str
    total_records: int
    matched_count: int
    unmatched_count: int
    status: str
    unmatched_items: list[UnmatchedItem] = []
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Tax ────────────────────────────────────────────────────────

class TaxSummaryResponse(BaseModel):
    year: int
    total_donors: int
    total_tax_consented: int
    total_amount: Decimal
    tax_deductible_amount: Decimal
    status: str
    last_report_generated: datetime | None = None


class Pagination(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel):
    data: list
    pagination: Pagination
