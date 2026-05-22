"""Admin API routers — dashboard, reconciliation, tax reporting."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile

from app.schemas.admin import (
    AdminSettingsRequest,
    AdminSettingsResponse,
    StatsResponse,
    ReconciliationUploadResponse,
    ReconciliationItem,
    ReconciliationDetailResponse,
    TaxSummaryResponse,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/donations", response_model=dict)
async def admin_list_donations(
    status: str | None = None,
    payment_method: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    is_recurring: bool | None = None,
    user_id: str | None = None,
    q: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=200),
):
    """管理後台捐款列表（管理員權限）。

    對應 API 設計文件：5.1 捐款管理
    支援全文搜尋、多維度篩選、分頁。
    """
    ...


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    period: str = "month",
    start_date: str | None = None,
    end_date: str | None = None,
    group_by: str | None = None,
):
    """統計報表（管理員權限）。

    對應 API 設計文件：5.2 統計報表
    - period: day / week / month / year
    - group_by: date / method / purpose
    """
    ...


@router.get("/users", response_model=dict)
async def admin_list_users(
    q: str | None = None,
    is_active: bool | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    """使用者管理列表（管理員權限）。

    對應 API 設計文件：5.3 使用者管理
    """
    ...


@router.put("/users/{user_id}/status")
async def update_user_status(user_id: UUID, is_active: bool, reason: str | None = None):
    """停用/啟用使用者帳號（管理員權限）。

    對應 API 設計文件：5.4 停用/啟用使用者
    """
    ...


@router.put("/settings", response_model=AdminSettingsResponse)
async def update_settings(req: AdminSettingsRequest):
    """系統設定更新（管理員權限）。

    對應 API 設計文件：5.9 系統設定
    """
    ...


@router.post("/reconciliation/upload", status_code=202, response_model=ReconciliationUploadResponse)
async def upload_reconciliation(file: UploadFile):
    """上傳郵局對帳檔案（管理員權限）。

    對應 API 設計文件：5.5 上傳對帳檔案
    - 支援 CSV/TXT 格式
    - 背景非同步處理
    - SHA-256 雜湊防止重複上傳
    """
    ...


@router.get("/reconciliation", response_model=dict)
async def list_reconciliations(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    """查詢對帳紀錄列表（管理員權限）。

    對應 API 設計文件：5.6 查詢對帳紀錄
    """
    ...


@router.get("/reconciliation/{recon_id}", response_model=ReconciliationDetailResponse)
async def get_reconciliation_detail(recon_id: UUID):
    """取得對帳詳情（管理員權限）。

    對應 API 設計文件：5.7 取得對帳詳情
    包含不相符項目的詳細資訊。
    """
    ...


@router.get("/reconciliation/{recon_id}/report")
async def download_reconciliation_report(recon_id: UUID):
    """下載對帳差異報告（管理員權限）。

    對應 API 設計文件：5.8 下載對帳差異報告
    回傳 text/csv。
    """
    ...


@router.get("/tax/report/{year}")
async def download_tax_report(year: int):
    """匯出年度國稅局申報 CSV（管理員權限）。

    對應 API 設計文件：5.10 匯出年度國稅局 CSV
    僅包含已同意資料上傳的捐款人。
    """
    ...


@router.get("/tax/summary/{year}", response_model=TaxSummaryResponse)
async def get_tax_summary(year: int):
    """年度捐款統計（管理員權限）。

    對應 API 設計文件：5.11 年度捐款統計
    """
    ...
