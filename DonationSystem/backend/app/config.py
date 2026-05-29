"""Application configuration."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    app_name: str = "DonationSystem"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/donationsystem"
    database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/donationsystem"

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
    redis_url: str = "redis://localhost:6379/0"

    # Cloud Storage
    storage_bucket: str = "donationsystem-receipts"

    # SMTP / Email
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = False
    email_from: str = "noreply@donationsystem.dev"
    email_from_name: str = "捐款系統"
    email_enabled: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
