"""Tests for authentication system — JWT + password hashing."""

from uuid import uuid4

import pytest
from jose import JWTError

from app.core.security import (
    UserRole,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    """bcrypt password hashing."""

    def test_hash_and_verify(self):
        pw = "MySecureP@ss123"
        h = hash_password(pw)
        assert h != pw
        assert verify_password(pw, h)

    def test_wrong_password_fails(self):
        h = hash_password("correct-password")
        assert not verify_password("wrong-password", h)

    def test_same_password_different_hash(self):
        """bcrypt uses a random salt — same input should produce different hashes."""
        pw = "test-password"
        assert hash_password(pw) != hash_password(pw)


class TestJWT:
    """JWT token creation and decoding."""

    def test_create_and_decode(self):
        user_id = uuid4()
        token = create_access_token(subject=str(user_id), role=UserRole.USER)
        payload = decode_access_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["role"] == "user"
        assert payload["type"] == "access"

    def test_admin_role(self):
        user_id = uuid4()
        token = create_access_token(subject=str(user_id), role=UserRole.ADMIN)
        payload = decode_access_token(token)
        assert payload["role"] == "admin"

    def test_expired_token_raises(self):
        from datetime import timedelta

        token = create_access_token(
            subject=str(uuid4()),
            expires_delta=timedelta(seconds=-10),  # already expired
        )
        with pytest.raises(JWTError):
            decode_access_token(token)

    def test_invalid_token_raises(self):
        with pytest.raises(JWTError):
            decode_access_token("this.is.not.a.valid.token")
