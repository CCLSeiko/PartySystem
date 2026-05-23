"""Reconciliation service — parse postal CSV/TXT and match against donations."""

import csv
import hashlib
import io
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.postal_draft import PostalDraft
from app.models.reconciliation import ReconciliationRecord
from app.repositories.postal_draft import PostalDraftRepository
from app.repositories.reconciliation import ReconciliationRepository
from sqlalchemy import select as sa_select

logger = logging.getLogger(__name__)

# Expected CSV columns from the post office
# Adjust field names to match the actual postal CSV format
EXPECTED_COLUMNS = {"draft_number", "amount", "transaction_date"}


class ReconciliationResult:
    """Result of a single reconciliation batch."""

    def __init__(self) -> None:
        self.total: int = 0
        self.matched: int = 0
        self.unmatched: list[dict[str, Any]] = []


async def process_reconciliation_file(
    file_content: bytes,
    file_name: str,
    session: AsyncSession,
    uploaded_by: UUID | None = None,
) -> ReconciliationRecord:
    """Parse the uploaded file, reconcile against postal_drafts, and store results.

    Steps:
    1. Compute SHA-256 hash and check for duplicates.
    2. Parse CSV content.
    3. For each row, look up the matching ``PostalDraft`` by ``draft_number``.
    4. Compare amounts — mark as matched or unmatched.
    5. Save the ``ReconciliationRecord`` to the database.
    """
    # 1. SHA-256
    file_hash = hashlib.sha256(file_content).hexdigest()
    recon_repo = ReconciliationRepository(session)

    existing = await recon_repo.get_by_hash(file_hash)
    if existing:
        logger.warning("Duplicate reconciliation file uploaded: %s", file_hash)
        existing.status = "completed"
        existing.updated_at = datetime.utcnow()
        await session.flush()
        return existing

    # 2. Parse CSV
    try:
        rows = _parse_csv(file_content)
    except Exception as exc:
        record = await recon_repo.create(
            file_name=file_name,
            file_path=f"memory://{file_name}",
            file_hash=file_hash,
            total_records=0,
            matched_count=0,
            unmatched_count=0,
            status="failed",
            error_message=str(exc),
            uploaded_by=uploaded_by,
        )
        await session.commit()
        return record

    # 3-4. Match
    result = await _match_rows(rows, session)

    # 5. Save
    record = await recon_repo.create(
        file_name=file_name,
        file_path=f"memory://{file_name}",
        file_hash=file_hash,
        total_records=result.total,
        matched_count=result.matched,
        unmatched_count=result.unmatched,
        status="completed" if not result.unmatched else "completed",
        uploaded_by=uploaded_by,
    )
    await session.commit()

    return record


def _parse_csv(file_content: bytes) -> list[dict[str, str]]:
    """Parse CSV bytes into a list of dicts."""
    text = file_content.decode("utf-8-sig")  # handles BOM
    reader = csv.DictReader(io.StringIO(text))

    # Normalise column names (strip, lower)
    rows = []
    for row in reader:
        normalised = {k.strip().lower(): v.strip() for k, v in row.items()}
        rows.append(normalised)

    if not rows:
        raise ValueError("CSV file is empty")

    return rows


async def _match_rows(
    rows: list[dict[str, str]],
    session: AsyncSession,
) -> ReconciliationResult:
    """Match parsed CSV rows against PostalDraft records."""
    result = ReconciliationResult()
    draft_repo = PostalDraftRepository(session)

    for i, row in enumerate(rows):
        result.total += 1
        draft_number = row.get("draft_number", "")
        amount_str = row.get("amount", "0")

        try:
            file_amount = Decimal(amount_str)
        except Exception:
            result.unmatched.append({
                "row": i + 1,
                "draft_number": draft_number,
                "expected_amount": Decimal("0"),
                "actual_amount": Decimal("0"),
                "reason": f"Invalid amount: {amount_str}",
            })
            continue

        draft_result = await draft_repo.session.execute(
            sa_select(PostalDraft).where(
                PostalDraft.draft_number == draft_number
            )
        )
        draft = draft_result.scalar_one_or_none()

        if draft is None:
            result.unmatched.append({
                "row": i + 1,
                "draft_number": draft_number,
                "expected_amount": Decimal("0"),
                "actual_amount": file_amount,
                "reason": "Draft number not found in system",
            })
            continue

        if draft.amount != file_amount:
            result.unmatched.append({
                "row": i + 1,
                "draft_number": draft_number,
                "expected_amount": draft.amount,
                "actual_amount": file_amount,
                "reason": "Amount mismatch",
            })
            continue

        # Match! Update the draft status
        draft.status = "reconciled"
        draft.reconciled_at = datetime.utcnow()
        await session.flush()
        result.matched += 1

    return result
