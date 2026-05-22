"""Tests for Spgateway (藍新金流) webhook signature verification."""

import pytest
from fastapi import HTTPException

from app.services.webhook import spgateway as svc


class TestSpgatewayCheckCode:
    """Verify CheckCode computation and comparison."""

    def test_compute_check_code(self):
        """SHA256 of concatenated fields matches expected format."""
        data = {
            "Amt": "1000",
            "MerchantID": "123456",
            "MerchantOrderNo": "ORDER20260522001",
            "TradeNo": "22051200001",
            "Version": "1.0",
        }
        # We can't hardcode the expected hash because it depends on
        # the secret key/IV, but we can verify the output is uppercase hex.
        result = svc._compute_check_code(data)
        assert len(result) == 64  # SHA256 hex = 64 chars
        assert result == result.upper()
        assert all(c in "0123456789ABCDEF" for c in result)

    def test_same_input_produces_same_output(self):
        """Consistent hashing — same input = same output."""
        data = {"Amt": "500", "MerchantID": "ABC", "MerchantOrderNo": "ORD-001", "TradeNo": "TX-001", "Version": "1.0"}
        assert svc._compute_check_code(data) == svc._compute_check_code(data)

    def test_different_input_produces_different_output(self):
        """Different input = different hash (avalanche effect)."""
        d1 = {"Amt": "100", "MerchantID": "A", "MerchantOrderNo": "O1", "TradeNo": "T1", "Version": "1.0"}
        d2 = {"Amt": "101", "MerchantID": "A", "MerchantOrderNo": "O1", "TradeNo": "T1", "Version": "1.0"}
        assert svc._compute_check_code(d1) != svc._compute_check_code(d2)


class TestSpgatewayClassifyResult:
    """Map 藍新 Status values to canonical actions."""

    def test_success(self):
        assert svc.classify_result({"Status": "SUCCESS"}) == "payment_intent.succeeded"

    def test_fail(self):
        assert svc.classify_result({"Status": "FAIL"}) == "payment_intent.payment_failed"

    def test_unknown(self):
        assert svc.classify_result({"Status": "UNKNOWN"}) is None


class TestSpgatewayExtractPaymentInfo:
    """Extract structured info from 藍新 payload."""

    def test_success(self):
        data = {"Status": "SUCCESS", "TradeNo": "TX-001", "Amt": "1000"}
        info = svc.extract_payment_info(data)
        assert info["status"] == "success"
        assert info["gateway_transaction_id"] == "TX-001"
        assert info["amount"] == 1000
        assert info["currency"] == "TWD"

    def test_fail(self):
        data = {"Status": "FAIL", "TradeNo": "TX-002", "Amt": "500", "ErrDesc": "Card declined"}
        info = svc.extract_payment_info(data)
        assert info["status"] == "failed"
        assert info["failure_reason"] == "Card declined"
