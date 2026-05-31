"""AES-256-GCM encryption / decryption for PII fields (identity_number)."""

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings


def _get_key() -> bytes | None:
    """Decode the Base64-encoded 32-byte encryption key."""
    key_b64 = settings.encryption_key
    if not key_b64:
        return None
    return base64.b64decode(key_b64)


def encrypt(plaintext: str) -> tuple[bytes, bytes]:
    """Encrypt plaintext with AES-256-GCM.

    Returns:
        (ciphertext, iv) — store both, the IV is non-secret.
    Raises:
        RuntimeError:  If ENCRYPTION_KEY is not configured.
    """
    key = _get_key()
    if key is None:
        raise RuntimeError("ENCRYPTION_KEY not set — cannot encrypt PII")
    aesgcm = AESGCM(key)
    iv = os.urandom(12)  # 96-bit nonce, standard for GCM
    ct = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    return ct, iv


def decrypt(ciphertext: bytes, iv: bytes) -> str:
    """Decrypt AES-256-GCM ciphertext.

    Args:
        ciphertext:  The encrypted bytes.
        iv:          The 12-byte nonce returned from ``encrypt``.

    Returns:
        The original plaintext string.
    """
    key = _get_key()
    if key is None:
        raise RuntimeError("ENCRYPTION_KEY not set — cannot decrypt PII")
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ciphertext, None).decode("utf-8")


def has_encryption_key() -> bool:
    """Return True if ENCRYPTION_KEY is configured."""
    key_b64 = settings.encryption_key
    return key_b64 is not None and key_b64.strip() != ""
