"""User API routers — full implementation with Auth + Repository."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.deps import (
    get_current_user,
    get_db_session,
    get_user_repo,
)
from app.core.security import UserRole, create_access_token
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import (
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
async def register(req: UserRegisterRequest, repo: UserRepository = Depends(get_user_repo)):
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
async def login(req: UserLoginRequest, repo: UserRepository = Depends(get_user_repo)):
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
    return UserLoginResponse(access_token=token)


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


@router.post("/password/reset", response_model=dict)
async def reset_password(req: PasswordResetRequest):
    """密碼重設（寄送重設信）— placeholder，待 Email 服務就緒。

    出於安全考量，不論 Email 是否存在皆回傳相同訊息。
    """
    # TODO: 實作重設 Token 產生 + Email 寄送
    return {
        "message": "如果該 Email 已註冊，重設連結已寄送",
        "email": req.email,
    }
