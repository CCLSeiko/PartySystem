# DonationSystem — 系統說明文件

> **版本：0.1.0**  
> **最後更新：2026-05-25**  
> **專案代號：DonationSystem**

---

## 目錄

1. [系統概述](#1-系統概述)
2. [技術架構](#2-技術架構)
3. [目錄結構](#3-目錄結構)
4. [資料庫模型](#4-資料庫模型)
5. [API 路由](#5-api-路由)
6. [前端頁面](#6-前端頁面)
7. [部署方式](#7-部署方式)
8. [金流整合](#8-金流整合)
9. [開發指南](#9-開發指南)

---

## 1. 系統概述

DonationSystem 是一套完整的捐款管理系統，提供捐款人管理、捐款記錄追蹤、定期定額扣款、對帳報表與稅務申報等功能。系統同時支援**會員捐款**與**訪客捐款**兩種模式，並整合多種金流管道，包含信用卡（Stripe）、郵政劃撥與現金捐款。

### 核心功能

| 功能 | 說明 |
|------|------|
| 捐款管理 | 單筆捐款建立、狀態管理、收據編號 |
| 定期定額 | 每月/每季/每年定期扣款，自動暫停與重試機制 |
| 金流整合 | Stripe 信用卡、郵政劃撥、現金 |
| 對帳功能 | 上傳 CSV/XLSX 對帳檔案，比對與標示不符項目 |
| 稅務報表 | 年度國稅局申報 CSV 下載 |
| 會員系統 | 註冊/登入、個人資料編輯、稅務同意設定 |
| 管理後台 | 統計儀表板、捐款/會員/定期定額管理、系統設定 |

### 角色權限

- **user（一般會員）**：瀏覽自己的捐款記錄、管理定期定額、編輯個人資料
- **admin（管理員）**：所有 user 權限 + 管理後台、捐款管理、會員管理、對帳、稅務報表、系統設定

---

## 2. 技術架構

```
┌─────────────────────────────────────────────────────┐
│                     Nginx (Port 80)                   │
│         反向代理 — 靜態檔案 /api → Backend            │
└────────────┬────────────────────────────┬────────────┘
             │                            │
    ┌────────▼────────┐         ┌─────────▼──────────┐
    │   Next.js       │         │   FastAPI Backend   │
    │   Frontend      │  /api   │   (Port 8000)       │
    │   (Static)      │◄───────►│   Python 3.12       │
    │   React 19      │         │                     │
    └─────────────────┘         └─────────┬───────────┘
                                          │
                                 ┌────────▼───────────┐
                                 │   PostgreSQL 16      │
                                 │   (Port 5432)        │
                                 └─────────────────────┘
```

### 前端技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.2.6 | 靜態頁面產生 (output: export) |
| React | 19.2.4 | UI 框架 |
| TypeScript | 5.x | 型別安全 |
| Tailwind CSS | 4.x | 樣式 |
| Recharts | 3.8.1 | 圖表（儀表板圓餅圖、趨勢圖） |
| Stripe.js | 9.6.0 | 信用卡付款表單 |
| Lucide React | 1.16.0 | 圖示 |
| date-fns | 4.2.1 | 日期處理 |

### 後端技術棧

| 技術 | 用途 |
|------|------|
| FastAPI | Web 框架 |
| SQLAlchemy (async) | ORM（非同步連線） |
| Alembic | 資料庫遷移 |
| Pydantic | 資料驗證 |
| python-jose | JWT 認證 |
| passlib + bcrypt | 密碼雜湊 |
| Stripe SDK | 信用卡金流 |
| pytest | 單元測試 |

### 基礎設施

- **容器化**：Docker Compose（4 個服務）
- **資料庫**：PostgreSQL 16 (Alpine)
- **反向代理**：Nginx (Alpine)
- **前端輸出**：Next.js 靜態匯出 (out/)

---

## 3. 目錄結構

```
DonationSystem/
├── docker-compose.yml          # 生產環境 Docker Compose
├── DOCUMENTATION.md            # 本文件
├── backend/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 4296c43983b8_initial_schema.py
│   ├── init_db.py              # 資料庫初始化腳本
│   ├── seed_admin.py           # 管理員種子腳本
│   └── app/
│       ├── main.py             # FastAPI 進入點
│       ├── config.py           # 設定檔 (Pydantic Settings)
│       ├── database.py         # DB 連線管理
│       ├── core/
│       │   ├── security.py     # JWT、密碼雜湊、角色枚舉
│       │   └── deps.py         # FastAPI 依賴注入
│       ├── models/             # SQLAlchemy 模型
│       │   ├── user.py
│       │   ├── donation.py
│       │   ├── payment.py
│       │   ├── subscription.py
│       │   ├── reconciliation.py
│       │   ├── tax_report.py
│       │   └── postal_draft.py
│       ├── schemas/            # Pydantic 請求/回應 schema
│       │   ├── user.py
│       │   ├── donation.py
│       │   ├── payment.py
│       │   ├── subscription.py
│       │   └── admin.py
│       ├── routers/            # API 路由
│       │   ├── users.py
│       │   ├── donations.py
│       │   ├── payments.py
│       │   ├── subscriptions.py
│       │   └── admin.py
│       ├── services/           # 商業邏輯
│       │   ├── dates.py        # 帳單日期計算
│       │   ├── draft.py        # 郵政劃撥單產生
│       │   ├── receipt.py      # 收據編號產生
│       │   ├── reconciliation.py
│       │   ├── stripe.py
│       │   ├── tax.py
│       │   └── webhook/
│       │       ├── handler.py
│       │       ├── stripe.py
│       │       └── spgateway.py
│       ├── repositories/       # 資料存取層
│       └── tests/              # 單元測試
│           ├── test_auth.py
│           ├── test_admin.py
│           ├── test_donation.py
│           ├── test_payment.py
│           ├── test_subscription.py
│           └── test_webhook_*.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── app/                # Next.js App Router 頁面
│       ├── components/         # 共用元件
│       │   ├── ui/             # UI 基底元件
│       │   │   └── index.tsx   # DataTable, Pagination, Card, StatusBadge, etc.
│       │   ├── layout/         # 版面元件
│       │   │   ├── Navbar.tsx
│       │   │   └── Sidebar.tsx
│       │   └── payment/        # 付款元件
│       │       ├── StripeCardForm.tsx
│       │       └── StripePaymentWrapper.tsx
│       ├── lib/                # 共用函式庫
│       │   ├── api.ts          # API 客戶端
│       │   ├── auth-context.tsx # 認證 Context
│       │   └── utils.ts        # 工具函式
│       └── types/
│           └── index.ts        # TypeScript 型別定義
└── nginx/
    └── nginx.conf              # Nginx 設定
```

---

## 4. 資料庫模型

### 4.1 users（使用者）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID (PK) | 主鍵 |
| email | String(255) | 登入 Email，唯一索引 |
| password_hash | String(255) | bcrypt 雜湊 |
| name | String(100) | 姓名 |
| identity_number | LargeBinary | 身分證字號（AES-256-GCM 加密） |
| identity_number_iv | LargeBinary | 加密 IV |
| phone | String(20) | 電話 |
| address | Text | 地址 |
| tax_consent | Boolean | 同意稅務申報 |
| is_anonymous | Boolean | 匿名捐款 |
| role | String(10) | user / admin |
| is_active | Boolean | 帳號啟用狀態 |
| created_at | DateTime | |
| updated_at | DateTime | |

### 4.2 donations（捐款）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID (PK) | 主鍵 |
| user_id | UUID (FK → users) | 會員 ID（null 表示訪客） |
| guest_email | String(255) | 訪客 Email |
| guest_name | String(100) | 訪客姓名 |
| amount | Numeric(12,2) | 金額 |
| currency | String(3) | 幣別（預設 TWD） |
| purpose | String(100) | 捐款用途 |
| payment_method | String(20) | credit_card / postal / cash |
| status | String(20) | pending / success / failed / cancelled |
| is_recurring | Boolean | 是否為定期定額 |
| subscription_id | UUID (FK → subscriptions) | 關聯定期定額 |
| receipt_number | String(50) | 收據編號（唯一） |
| tax_deductible | Boolean | 可抵稅 |
| created_at | DateTime | 索引 |
| updated_at | DateTime | |

### 4.3 subscriptions（定期定額）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID (PK) | 主鍵 |
| user_id | UUID (FK → users) | 會員 ID |
| amount | Numeric(12,2) | 每期金額 |
| currency | String(3) | 幣別 |
| frequency | String(10) | monthly / quarterly / yearly |
| total_cycles | Integer | 總期數（0 = 無限期） |
| cycles_completed | Integer | 已完成期數 |
| payment_method | String(20) | 付款方式 |
| gateway_customer_id | String(255) | Stripe Customer ID |
| gateway_payment_method_id | String(255) | Stripe Payment Method ID |
| status | String(20) | active / paused / cancelled / expired |
| consecutive_failures | Integer | 連續失敗次數 |
| next_billing_date | Date | 下次扣款日 |
| last_billing_date | Date | 上次扣款日 |
| cancelled_at | DateTime | |
| created_at | DateTime | |
| updated_at | DateTime | |

### 4.4 payments（付款交易）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID (PK) | 主鍵 |
| donation_id | UUID (FK → donations) | 關聯捐款（唯一） |
| subscription_id | UUID (FK → subscriptions) | 關聯定期定額 |
| payment_gateway | String(20) | stripe / spgateway / postal / cash |
| gateway_transaction_id | String(255) | 金流交易編號 |
| amount | Numeric(12,2) | 金額 |
| currency | String(3) | 幣別 |
| status | String(20) | pending / success / failed |
| failure_reason | Text | 失敗原因 |
| webhook_received | Boolean | 是否已收到 Webhook |
| created_at | DateTime | |
| updated_at | DateTime | |

### 4.5 postal_drafts（郵政劃撥單）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID (PK) | 主鍵 |
| donation_id | UUID (FK → donations) | 關聯捐款（唯一） |
| draft_number | String(20) | 劃撥單號（唯一） |
| postal_account | String(20) | 郵政帳號 |
| amount | Numeric(10,2) | 金額 |
| status | String(20) | generated / confirmed / reconciled |
| reconciled_at | DateTime | 對帳完成時間 |
| created_at | DateTime | |
| updated_at | DateTime | |

### 4.6 reconciliation_records（對帳記錄）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID (PK) | 主鍵 |
| file_name | String(255) | 上傳檔案名稱 |
| file_path | String(500) | 檔案儲存路徑 |
| file_hash | String(64) | SHA-256 檔案雜湊 |
| total_records | Integer | 總筆數 |
| matched_count | Integer | 相符筆數 |
| unmatched_count | Integer | 不符筆數 |
| status | String(20) | processing / completed / failed |
| error_message | Text | 錯誤訊息 |
| uploaded_by | UUID (FK → users) | 上傳管理員 |
| created_at | DateTime | |
| updated_at | DateTime | |

### 4.7 tax_reports（稅務報表）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID (PK) | 主鍵 |
| year | Integer | 年度 |
| generated_at | DateTime | 產生時間 |
| file_path | String(500) | CSV 檔案路徑 |
| total_donors | Integer | 捐款人數 |
| total_amount | Numeric(14,2) | 總金額 |
| status | String(20) | generating / generated / failed |
| created_at | DateTime | |
| updated_at | DateTime | |

---

## 5. API 路由

### 5.1 認證與會員

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | /api/users/register | 會員註冊 | 公開 |
| POST | /api/users/login | 會員登入（回傳 JWT） | 公開 |
| GET | /api/users/me | 取得目前使用者 | 登入 |
| PUT | /api/users/me | 更新個人資料 | 登入 |
| PUT | /api/users/me/tax-consent | 更新稅務同意設定 | 登入 |
| POST | /api/users/password-reset | 密碼重設申請 | 公開 |

### 5.2 捐款

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | /api/donations | 建立捐款 | 登入/訪客 |
| GET | /api/donations | 查詢捐款記錄（分頁） | 登入 |

### 5.3 付款

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | /api/payments/credit-card | 信用卡付款（回傳 PaymentIntent） | 登入/訪客 |
| POST | /api/payments/postal | 產生郵政劃撥單 | 登入 |
| PUT | /api/payments/postal/{id}/confirm | 確認劃撥單 | 登入 |

### 5.4 定期定額

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | /api/subscriptions | 建立定期定額 | 登入 |
| GET | /api/subscriptions | 查詢定期定額（分頁） | 登入 |
| PUT | /api/subscriptions/{id}/pause | 暫停 | 登入 |
| PUT | /api/subscriptions/{id}/resume | 恢復 | 登入 |
| PUT | /api/subscriptions/{id}/cancel | 取消 | 登入 |

### 5.5 管理後台

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | /api/admin/stats | 統計摘要 | admin |
| GET | /api/admin/donations | 捐款列表（分頁、篩選） | admin |
| PUT | /api/admin/donations/{id}/status | 更新捐款狀態 | admin |
| GET | /api/admin/users | 會員列表 | admin |
| PUT | /api/admin/users/{id}/status | 啟用/停用會員 | admin |
| GET | /api/admin/reconciliation | 對帳記錄列表 | admin |
| POST | /api/admin/reconciliation/upload | 上傳對帳檔案 | admin |
| GET | /api/admin/reconciliation/{id} | 對帳詳情 | admin |
| GET | /api/admin/settings | 取得系統設定 | admin |
| PUT | /api/admin/settings | 更新系統設定 | admin |
| GET | /api/admin/tax/summary/{year} | 年度稅務摘要 | admin |
| GET | /api/admin/tax/report/{year} | 下載稅務 CSV | admin |

### 5.6 系統

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | /api/health | 健康檢查 | 公開 |
| GET | /api/docs | Swagger API 文件 | 公開 |

---

## 6. 前端頁面

### 6.1 公開頁面

| 路由 | 頁面 | 說明 |
|------|------|------|
| / | 首頁 | Landing page，介紹與 CTA |
| /donate | 捐款頁面 | 捐款表單（金額、用途、付款方式） |
| /login | 登入 | Email + 密碼登入 |
| /register | 註冊 | 會員註冊表單 |

### 6.2 會員頁面（需登入）

| 路由 | 頁面 | 說明 |
|------|------|------|
| /member/dashboard | 會員儀表板 | 捐款統計、近期記錄、定期定額概覽 |
| /member/donations | 捐款記錄 | 歷史捐款列表（可展開明細、篩選） |
| /member/subscriptions | 定期定額管理 | 列表、暫停/恢復/取消操作 |
| /member/profile | 個人設定 | 編輯姓名/電話、稅務同意開關 |

### 6.3 管理頁面（需 admin 權限）

| 路由 | 頁面 | 說明 |
|------|------|------|
| /admin/dashboard | 管理儀表板 | 統計卡片 + 圓餅圖（付款方式/用途） + 趨勢折線圖 |
| /admin/donations | 捐款管理 | 捐款列表、篩選、狀態變更 |
| /admin/users | 使用者管理 | 會員列表、搜尋、啟用/停用 |
| /admin/subscriptions | 定期定額管理 | 所有會員定期定額列表 |
| /admin/reconciliation | 對帳管理 | 上傳 CSV、對帳記錄列表、檢視不符明細 |
| /admin/tax | 稅務報表 | 年度摘要卡片、下載國稅局 CSV |
| /admin/settings | 系統設定 | 最低捐款金額、用途管理、重試次數設定 |

---

## 7. 部署方式

### 7.1 Docker Compose 部署

```bash
# 1. 建立 .env 檔案（請參考 .env.example）
cd DonationSystem
cp .env.example .env

# 2. 編輯 .env，設定必要的環境變數
#    - POSTGRES_PASSWORD（資料庫密碼）
#    - JWT_SECRET_KEY（JWT 簽章金鑰）
#    - ENCRYPTION_KEY（個資 AES 加密金鑰）
#    - STRIPE_SECRET_KEY（Stripe 密鑰，選填）

# 3. 建置並啟動所有服務
docker compose up -d --build

# 4. 確認服務狀態
docker compose ps

# 5. 初始化資料庫（首次部署時執行）
docker compose exec backend python init_db.py

# 6. 建立管理員帳號
docker compose exec backend python seed_admin.py
```

### 7.2 服務架構

| 服務 | 映像/來源 | 連接埠 | 說明 |
|------|-----------|--------|------|
| postgres | postgres:16-alpine | 127.0.0.1:5432 | 資料庫 |
| backend | ./backend/Dockerfile | 127.0.0.1:8000 | FastAPI |
| frontend-build | ./frontend/Dockerfile | — | 一次性建置 Next.js 靜態匯出 |
| nginx | nginx:alpine | 0.0.0.0:80 | 反向代理 + 靜態檔案伺服 |

### 7.3 Nginx 設定重點

- 靜態檔案（`/`）由 Nginx 直接提供（掛載 `frontend_out` volume）
- `/api/` 路徑由 Nginx proxy_pass 到 `http://backend:8000`
- 支援 client_max_body_size 100M（對帳檔案上傳）
- CORS 由後端 FastAPI 處理

---

## 8. 金流整合

### 8.1 Stripe（信用卡）

- 前端使用 Stripe Elements 收集卡號（`StripeCardForm.tsx`）
- 後端建立 PaymentIntent 回傳 client_secret
- 前端 stripe.confirmCardPayment 完成付款
- Webhook 監聽 `payment_intent.succeeded` / `payment_intent.payment_failed` 事件

### 8.2 郵政劃撥

- 後端產生劃撥單號（`draft.py`）
- 捐款人持劃撥單至郵局繳費
- 管理員收到郵局回報後確認入帳
- 支援對帳功能：上傳郵局 CSV 批次比對

### 8.3 現金捐款

- 管理員手動記錄現金捐款
- 記錄收款地點與經手人員

### 8.4 Spgateway（藍新金流）

- 藍新金流 Webhook 處理（`webhook/spgateway.py`）
- 支援信用卡與超商付款

---

## 9. 開發指南

### 9.1 環境需求

- Docker & Docker Compose
- Python 3.12+（本機開發）
- Node.js 20+（本機開發）

### 9.2 本機開發（後端）

```bash
cd backend

# 建立虛擬環境
python -m venv venv
source venv/bin/activate

# 安裝相依套件
pip install -r requirements.txt

# 複製環境變數
cp .env.example .env

# 啟動資料庫（如已使用 Docker Compose 則跳過）
docker compose up postgres -d

# 執行資料庫遷移
alembic upgrade head

# 啟動開發伺服器（熱載入）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 9.3 本機開發（前端）

```bash
cd frontend

# 安裝相依套件
npm install

# 啟動開發伺服器
npm run dev

# 建置靜態匯出
npm run build
```

### 9.4 執行測試

```bash
cd backend
pytest -v
```

### 9.5 資料庫遷移

```bash
# 產生新的遷移腳本
alembic revision --autogenerate -m "description"

# 套用遷移
alembic upgrade head

# 回退
alembic downgrade -1
```

### 9.6 建立管理員

```bash
cd backend
python seed_admin.py
# 預設帳號：admin@donationsystem.dev
# 密碼由 seed_admin.py 產生（首次執行時顯示於終端機）
```

---

## 附錄 A：環境變數

| 變數 | 必要 | 預設值 | 說明 |
|------|------|--------|------|
| POSTGRES_DB | 否 | donationsystem | 資料庫名稱 |
| POSTGRES_USER | 否 | donation | 資料庫使用者 |
| POSTGRES_PASSWORD | **是** | — | 資料庫密碼 |
| JWT_SECRET_KEY | **是** | change-me-in-production | JWT 簽章金鑰 |
| JWT_ALGORITHM | 否 | HS256 | JWT 演算法 |
| JWT_EXPIRE_MINUTES | 否 | 1440 | Token 有效期限（分鐘） |
| ENCRYPTION_KEY | 否 | — | AES-256-GCM 加密金鑰（Base64） |
| STRIPE_SECRET_KEY | 否 | — | Stripe 密鑰 |
| STRIPE_WEBHOOK_SECRET | 否 | — | Stripe Webhook 簽章 |
| SPGATEWAY_MERCHANT_ID | 否 | — | 藍新商店代號 |
| SPGATEWAY_HASH_KEY | 否 | — | 藍新 Hash Key |
| SPGATEWAY_HASH_IV | 否 | — | 藍新 Hash IV |
| NGINX_PORT | 否 | 80 | Nginx 對外埠號 |

---

## 附錄 B：版本歷史

| 版本 | 日期 | 說明 |
|------|------|------|
| 0.1.0 | 2026-05-25 | 初版系統說明文件建立 |
