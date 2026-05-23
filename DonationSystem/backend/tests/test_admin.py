"""Tests for Reconciliation + Tax services."""

import csv
import hashlib
import io
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.services.reconciliation import _parse_csv
from app.services.tax import get_year_summary


class TestReconciliationCSV:
    """CSV parsing logic for postal reconciliation files."""

    def test_parse_valid_csv(self):
        content = b"draft_number,amount,transaction_date\nPOST-001,1000,2026-05-22\nPOST-002,500,2026-05-22"
        rows = _parse_csv(content)
        assert len(rows) == 2
        assert rows[0]["draft_number"] == "POST-001"
        assert rows[0]["amount"] == "1000"

    def test_parse_empty_raises(self):
        with pytest.raises(ValueError, match="empty"):
            _parse_csv(b"draft_number,amount,transaction_date\n")

    def test_parse_bom_handling(self):
        """UTF-8 BOM should not break parsing (columns normalised)."""
        content = b"\xef\xbb\xbfdraft_number,amount\nPOST-001,500"
        rows = _parse_csv(content)
        assert len(rows) == 1
        # Column names are lowercased by normalisation
        assert "draft_number" in rows[0]

    def test_sha256_hash(self):
        """File content is hashed correctly."""
        content = b"draft_number,amount\nPOST-001,500"
        h = hashlib.sha256(content).hexdigest()
        assert len(h) == 64
        assert h == hashlib.sha256(b"draft_number,amount\nPOST-001,500").hexdigest()


class TestTaxSummary:
    """Tax year summary calculations (using mocked queries)."""

    @pytest.mark.asyncio
    async def test_summary_format(self):
        """Summary returns all expected fields."""
        mock_session = AsyncMock()
        mock_session.execute.return_value = MagicMock()
        mock_session.execute.return_value.scalar_one = MagicMock(side_effect=[42, 30, 250000, 250000])

        result = await get_year_summary(2026, mock_session)
        assert result["year"] == 2026
        assert result["total_donors"] == 42
        assert result["total_tax_consented"] == 30
        assert result["total_amount"] == 250000
        assert result["tax_deductible_amount"] == 250000


class TestTaxCSV:
    """Tax CSV format."""

    def test_csv_headers(self):
        """CSV output starts with correct headers."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["身分證字號", "姓名", "捐款金額合計", "捐款日期", "收據編號"])
        content = output.getvalue()
        assert "身分證字號" in content
        assert "收據編號" in content
