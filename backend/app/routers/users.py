"""User API routers."""

from fastapi import APIRouter, Depends

from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    UserUpdateRequest,
    TaxConsentRequest,
    PasswordResetRequest,
    UserResponse,
    UserLoginResponse,
)

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("/register", status_code=201, response_model=UserResponse)
async def register(req: UserRegisterRequest):
    """註冊新使用者。

    對應 API 設計文件：1.1 註冊
    - email 必須是有效格式
    - password 最少 8 字元
    - identity_number 選填，AES-256-GCM 加密儲存
    """
    ...


@router.post("/login", response_model=UserLoginResponse)
async def login(req: UserLoginRequest):
    """使用者登入，回傳 JWT Token。

    對應 API 設計文件：1.2 登入
    """
    ...


@router.get("/me", response_model=UserResponse)
async def get_me():
    """取得目前登入使用者資料。

    對應 API 設計文件：1.3 取得個人資料
    注意：identity_number 不回傳明文，以 has_identity_number 表示
    """
    ...


@router.put("/me", response_model=UserResponse)
async def update_me(req: UserUpdateRequest):
    """更新目前使用者資料。

    對應 API 設計文件：1.4 更新個人資料
    所有欄位皆為選填，僅更新有提供的欄位。
    """
    ...


@router.put("/me/tax-consent", response_model=dict)
async def update_tax_consent(req: TaxConsentRequest):
    """更新稅務申報同意設定。

    對應 API 設計文件：1.5 更新稅務申報同意
    """
    ...


@router.post("/password/reset", response_model=dict)
async def reset_password(req: PasswordResetRequest):
    """密碼重設（寄送重設信）。

    對應 API 設計文件：1.6 密碼重設
    出於安全考量，不論 Email 是否存在皆回傳相同訊息。
    """
    ...
