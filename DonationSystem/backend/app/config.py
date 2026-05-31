"""Application configuration."""
import secrets

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    app_name: str = "DonationSystem"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/donationsystem"
    database_url_sync: str = "postgresql://postgres:***@localhost:5432/donationsystem"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    # Encryption (AES-256-GCM for PII)
    encryption_key: Optional[str] = None  # Base64-encoded 32-byte key; use Cloud KMS in prod

    # Stripe
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None

    # Spgateway (藍新金流)
    spgateway_merchant_id: Optional[str] = None
    spgateway_hash_key: Optional[str] = None
    spgateway_hash_iv: Optional[str] = None

    # GCP
    gcp_project_id: Optional[str] = None
    gcp_credentials_path: Optional[str] = None

    # Redis
    redis_url: str = "redis://localhost:***@donationsystem.dev"
    email_from_name: str = "捐款系統"
    email_enabled: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# ── Startup safeguards ──────────────────────────────────────────

if settings.jwt_secret_key in ("change-me-in-production", ""):
    import warnings
    warnings.warn(
        "JWT_SECRET_KEY is still the default value! "
        "Set a strong random key in .env for production.\n"
        "  Generate one:  python3 -c \"import secrets; print(secrets.token_hex(32))\""
    )

if not settings.encryption_key:
    import warnings
    warnings.warn(
        "ENCRYPTION_KEY is not set — PII fields (identity_number) "
        "will NOT be encrypted in storage!"
    )
