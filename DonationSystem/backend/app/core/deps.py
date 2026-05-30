"""FastAPI dependencies — authentication, authorisation, repository injection."""

from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import UserRole, decode_access_token
from app.database import get_db_session
from app.models.user import User
from app.repositories import (
    DonationRepository,
    DonorAccountRepository,
    PaymentRepository,
    PostalDraftRepository,
    ReconciliationRepository,
    SubscriptionRepository,
    SystemSettingRepository,
    TaxReportRepository,
    UserRepository,
)

# ── Bearer token scheme for OpenAPI docs ──────────────────────

bearer_scheme = HTTPBearer(auto_error=False)


# ── Dependency: get current user from JWT ─────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db_session),
) -> User:
    """Extract and validate the JWT from the ``Authorization: Bearer`` header.

    Returns the ``User`` instance.

    Raises:
        HTTPException(401):  missing / expired / invalid token, or user disabled.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )

    try:
        user_id = UUID(user_id_str)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )

    repo = UserRepository(session)
    user = await repo.get(user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled",
        )

    return user


# ── Dependency: require admin role ────────────────────────────

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to have the ``admin`` role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


# ── Dependency: require admin OR donation_maintainer ────────────

async def require_admin_or_maintainer(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to have ``admin`` or ``donation_maintainer`` role."""
    if current_user.role not in ("admin", "donation_maintainer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or donation-maintainer privileges required",
        )
    return current_user


# ── Dependency: require donation_maintainer only ───────────────

async def require_donation_maintainer(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to have the ``donation_maintainer`` role only."""
    if current_user.role != "donation_maintainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Donation-maintainer privileges required",
        )
    return current_user


# ── Optional user (endpoints that work for both auth and anonymous) ──

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db_session),
) -> User | None:
    """Like ``get_current_user`` but returns ``None`` for unauthenticated requests.

    Used by endpoints that support both member and anonymous access
    (e.g. ``POST /api/donations``).
    """
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, session)
    except HTTPException:
        return None


# ── Repository injection helpers ──────────────────────────────

def get_user_repo(session: AsyncSession = Depends(get_db_session)) -> UserRepository:
    return UserRepository(session)


def get_donation_repo(session: AsyncSession = Depends(get_db_session)) -> DonationRepository:
    return DonationRepository(session)


def get_payment_repo(session: AsyncSession = Depends(get_db_session)) -> PaymentRepository:
    return PaymentRepository(session)


def get_subscription_repo(session: AsyncSession = Depends(get_db_session)) -> SubscriptionRepository:
    return SubscriptionRepository(session)


def get_postal_draft_repo(session: AsyncSession = Depends(get_db_session)) -> PostalDraftRepository:
    return PostalDraftRepository(session)


def get_reconciliation_repo(session: AsyncSession = Depends(get_db_session)) -> ReconciliationRepository:
    return ReconciliationRepository(session)


def get_tax_report_repo(session: AsyncSession = Depends(get_db_session)) -> TaxReportRepository:
    return TaxReportRepository(session)


def get_donor_account_repo(session: AsyncSession = Depends(get_db_session)) -> DonorAccountRepository:
    return DonorAccountRepository(session)


def get_system_setting_repo(session: AsyncSession = Depends(get_db_session)) -> SystemSettingRepository:
    return SystemSettingRepository(session)
