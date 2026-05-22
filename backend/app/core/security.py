"""Security utilities — JWT, password hashing, role enums.

Uses:
- ``python-jose`` for JWT creation / verification
- ``bcrypt`` for password hashing
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Any

import bcrypt as _bcrypt
from jose import JWTError, jwt

from app.config import settings

# ── Password hashing ──────────────────────────────────────────


def hash_password(password: str) -> str:
    """Return a bcrypt hash of the password."""
    return _bcrypt.hashpw(
        password.encode("utf-8"),
        _bcrypt.gensalt(),
    ).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plain-text password against its bcrypt hash."""
    return _bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ── Role definitions ──────────────────────────────────────────

class UserRole(str, Enum):
    USER = "user"           # Regular user (default)
    ADMIN = "admin"         # Back-office administrator


# ── JWT ───────────────────────────────────────────────────────

ALGORITHM = settings.jwt_algorithm
SECRET_KEY = settings.jwt_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES = settings.jwt_expire_minutes


def create_access_token(
    subject: str,
    role: UserRole = UserRole.USER,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token.

    Args:
        subject:  The user ID (as a string).
        role:     The user's role.
        expires_delta:  Override the default expiry.

    Returns:
        The encoded JWT string.
    """
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role.value,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token.

    Returns:
        The decoded payload dict.

    Raises:
        JWTError:  If the token is expired, malformed, or signed with
                   a different key.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
