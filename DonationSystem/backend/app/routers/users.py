"""User API routers — full implementation with Auth + Repository."""

import secrets
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.deps import (
    get_current_user,
    get_db_session,
    get_user_repo,
)
from app.core.security import UserRole, create_access_token
from app.core.limiter import limiter
from app.models.user import User
from app.repositories.user import UserRepository
from app.services.email import send_password_reset_email
from app.schemas.user import (
    ChangePasswordRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    TaxConsentRequest,
    UserLoginRequest,
    UserLoginResponse,
    UserRegisterRequest,
    UserResponse,
    UserUpdateRequest,
)

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("/register", status_code=201, response_model=UserResponse)
@limiter.limit("5/minute")
async def register(
    request: Request,
    req: UserRegisterRequest, repo: UserRepository = Depends(get_user_repo)):
    """註冊新使用者。

    - email 必須唯一
    - password 最少 8 字元
    - identity_number 選填，AES-256-GCM 加密儲存（預留）
    """
    existing = await repo.get_by_email(req.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = await repo.create_user(
        email=req.email,
        password=req.password,
        name=req.name,
        phone=req.phone,
        tax_consent=req.tax_consent,
    )

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        has_identity_number=False,
        tax_consent=user.tax_consent,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/login", response_model=UserLoginResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    req: UserLoginRequest, repo: UserRepository = Depends(get_user_repo)):
    """使用者登入，回傳 JWT Token。

    驗證 Email + Password 後發放 Token，有效期 24 小時。
    """
    user = await repo.verify_login(req.email, req.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(subject=str(user.id), role=UserRole(user.role))
    return UserLoginResponse(
        access_token=token,
        force_password_change=user.force_password_change,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """取得目前登入使用者資料。

    identity_number 不回傳明文，僅以 has_identity_number 表示。
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        phone=current_user.phone,
        has_identity_number=current_user.identity_number is not None,
        tax_consent=current_user.tax_consent,
        role=current_user.role,
        is_active=current_user.is_active,
        force_password_change=current_user.force_password_change,
        created_at=current_user.created_at,
    )


@router.put("/me", response_model=UserResponse)
async def update_me(
    req: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    repo: UserRepository = Depends(get_user_repo),
):
    """更新目前使用者資料。所有欄位皆為選填。"""
    updated = await repo.update(
        current_user.id,
        name=req.name,
        phone=req.phone,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=updated.id,
        email=updated.email,
        name=updated.name,
        phone=updated.phone,
        has_identity_number=updated.identity_number is not None,
        tax_consent=updated.tax_consent,
        role=updated.role,
        is_active=updated.is_active,
        created_at=updated.created_at,
    )


@router.put("/me/tax-consent", response_model=dict)
async def update_tax_consent(
    req: TaxConsentRequest,
    current_user: User = Depends(get_current_user),
    repo: UserRepository = Depends(get_user_repo),
):
    """更新稅務申報同意設定。"""
    await repo.update(current_user.id, tax_consent=req.tax_consent)
    return {
        "tax_consent": req.tax_consent,
        "updated_at": datetime.utcnow().isoformat(),
    }


@router.put("/me/password", response_model=dict)
async def change_my_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    repo: UserRepository = Depends(get_user_repo),
):
    """變更目前使用者密碼。"""
    from app.core.security import verify_password, hash_password

    # Verify current password
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="目前密碼不正確",
        )

    # Update password and clear force_password_change flag
    await repo.update_password(current_user.id, req.new_password)
    current_user.force_password_change = False
    await repo.session.commit()

    return {"message": "密碼已變更"}


@router.post("/password/reset", response_model=dict)
@limiter.limit("3/minute")
async def reset_password(
    request: Request,
    req: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    repo: UserRepository = Depends(get_user_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """密碼重設 — 產生一次性 Token 並寄送重設信。

    出於安全考量，不論 Email 是否存在皆回傳相同訊息。
    若 Email 存在：
    - 產生 64 字元隨機 Token
    - 設定 60 分鐘有效期
    - 透過 Email 寄送重設連結
    """
    user = await repo.get_by_email(req.email)

    if user:
        # Generate reset token (64 hex chars = 256-bit)
        token = secrets.token_urlsafe(48)
        expires = datetime.utcnow() + timedelta(minutes=60)

        user.password_reset_token = token
        user.password_reset_token_expires = expires
        await session.flush()

        # Send email in background
        background_tasks.add_task(
            send_password_reset_email,
            to_email=user.email,
            name=user.name,
            token=token,
            expires_minutes=60,
        )

    await session.commit()
    return {
        "message": "如果該 Email 已註冊，重設連結已寄送",
        "email": req.email,
    }


@router.post("/password/reset/confirm", response_model=dict)
async def confirm_password_reset(
    req: PasswordResetConfirmRequest,
    repo: UserRepository = Depends(get_user_repo),
    session: AsyncSession = Depends(get_db_session),
):
    """確認密碼重設 — 使用 Token 更新密碼。

    驗證 Token 有效且未過期後，更新密碼。
    Token 使用後立即失效（一次性使用）。
    """
    # Find user by token
    user = await repo.get_by_reset_token(req.token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無效或已過期的重設連結",
        )

    # Check expiry
    if user.password_reset_token_expires is None or datetime.utcnow() > user.password_reset_token_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="重設連結已過期，請重新申請",
        )

    # Update password and clear token
    await repo.update_password(user.id, req.new_password)
    user.password_reset_token = None
    user.password_reset_token_expires = None
    await session.commit()

    return {
        "message": "密碼重設成功",
        "updated_at": datetime.utcnow().isoformat(),
    }
