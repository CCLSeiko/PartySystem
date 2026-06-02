# 捐款管理系統 (DonationSystem) - 系統架構說明

## 目錄

1. [系統概述](#系統概述)
2. [技術架構](#技術架構)
3. [目錄結構](#目錄結構)
4. [服務架構](#服務架構)
5. [資料庫設計](#資料庫設計)
6. [API 架構](#api-架構)
7. [認證與授權](#認證與授權)
8. [部署架構](#部署架構)
9. [環境變數](#環境變數)

---

## 系統概述

捐款管理系統是一個用於管理公益捐款的全端應用程式，支援：
- 公眾捐款（單次/定期定額）
- 會員管理
- 捐款記錄管理
- 定期定額訂閱
- 管理後台

---

## 技術架構

### 前端
- **框架**: Next.js 16 (React 19)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **UI 元件**: 自訂元件庫
- **狀態管理**: React Context
- **HTTP 客戶端**: 自訂 API 封裝

### 後端
- **框架**: FastAPI (Python 3.11)
- **ORM**: SQLAlchemy (async)
- **資料庫**: PostgreSQL 15
- **認證**: JWT (JSON Web Token)
- **密碼雜湊**: bcrypt
- **PII 加密**: AES-256-GCM

### 部署
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **郵件服務**: MailHog (開發環境)

---

## 目錄結構

```
DonationSystem/
├── backend/                    # 後端 FastAPI 應用
│   ├── app/
│   │   ├── core/              # 核心功能
│   │   │   ├── deps.py        # 依賴注入
│   │   │   ├── encryption.py  # PII 加密
│   │   │   └── security.py    # 認證與授權
│   │   ├── models/            # SQLAlchemy 模型
│   │   │   ├── user.py        # 使用者模型
│   │   │   ├── donation.py    # 捐款模型
│   │   │   ├── subscription.py # 訂閱模型
│   │   │   └── ...
│   │   ├── repositories/      # 資料存取層
│   │   ├── routers/           # API 路由
│   │   │   ├── users.py       # 使用者 API
│   │   │   ├── donations.py   # 捐款 API
│   │   │   ├── maintenance.py # 維護管理 API
│   │   │   └── admin.py       # 管理 API
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # 業務邏輯
│   ├── alembic/               # 資料庫迁移
│   └── Dockerfile
├── frontend/                   # 前端 Next.js 應用
│   ├── src/
│   │   ├── app/               # App Router 頁面
│   │   │   ├── donate/        # 公眾捐款頁
│   │   │   ├── login/         # 登入頁
│   │   │   ├── register/      # 註冊頁
│   │   │   ├── member/        # 會員區
│   │   │   ├── maintainer/    # 維護管理區
│   │   │   └── admin/         # 管理區
│   │   ├── components/        # React 元件
│   │   ├── lib/               # 工具函數
│   │   │   ├── api.ts         # API 客戶端
│   │   │   └── auth-context.tsx # 認證狀態
│   │   └── types/             # TypeScript 類型
│   └── Dockerfile
├── nginx/                      # Nginx 設定
│   └── nginx.conf
├── docker-compose.yml          # Docker Compose 設定
├── VERSION                     # 版本號
└── CHANGELOG.md                # 變更日誌
```

---

## 服務架構

```
┌─────────────────────────────────────────────────────────────┐
│                      使用者瀏覽器                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (Port 8080)                        │
│                    反向代理 + 靜態檔案                       │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Frontend (Port 3000)  │     │   Backend (Port 8000)   │
│   Next.js Standalone    │     │   FastAPI + Uvicorn     │
└─────────────────────────┘     └─────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Port 5432)                    │
│                   資料庫: donationsystem                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 資料庫設計

### 主要資料表

#### `users` - 使用者
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| email | VARCHAR(255) | 唯一 Email |
| password_hash | VARCHAR(255) | 密碼雜湊 |
| name | VARCHAR(100) | 姓名 |
| identity_number | BYTEA | 身分證字號 (AES 加密) |
| phone | VARCHAR(20) | 電話 |
| role | VARCHAR(20) | 角色 (user/donation_maintainer/data_maintainer/admin) |
| force_password_change | BOOLEAN | 強制修改密碼標記 |
| is_active | BOOLEAN | 帳號啟用狀態 |
| created_at | TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | 更新時間 |

#### `donations` - 捐款記錄
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| user_id | UUID | 捐款人 ID (可為 null) |
| guest_email | VARCHAR | 訪客 Email |
| guest_name | VARCHAR | 訪客姓名 |
| amount | DECIMAL | 金額 |
| currency | VARCHAR(3) | 幣別 |
| purpose | VARCHAR | 用途 |
| payment_method | VARCHAR | 付款方式 |
| status | VARCHAR | 狀態 |
| is_recurring | BOOLEAN | 是否定期定額 |
| created_at | TIMESTAMP | 建立時間 |

#### `subscriptions` - 訂閱
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| user_id | UUID | 使用者 ID |
| amount | DECIMAL | 金額 |
| frequency | VARCHAR | 頻率 (monthly/quarterly/yearly) |
| status | VARCHAR | 狀態 |
| next_billing_date | DATE | 下次扣款日 |
| created_at | TIMESTAMP | 建立時間 |

#### `donor_accounts` - 捐款人授權帳戶
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| user_id | UUID | 使用者 ID |
| account_type | VARCHAR | 帳戶類型 |
| card_number | BYTEA | 卡號 (AES 加密) |
| card_expiry_month | VARCHAR | 到期月 |
| card_expiry_year | VARCHAR | 到期年 |
| postal_account | VARCHAR | 郵政劃撥帳號 |
| bank_account | VARCHAR | 銀行帳號 |

---

## API 架構

### 使用者 API (`/api/users`)
- `POST /register` - 註冊
- `POST /login` - 登入
- `GET /me` - 取得個人資料
- `PUT /me` - 更新個人資料
- `PUT /me/password` - 變更密碼
- `PUT /me/tax-consent` - 稅務同意
- `POST /password/reset` - 密碼重設申請
- `POST /password/reset/confirm` - 確認密碼重設

### 捐款 API (`/api/donations`)
- `POST /` - 建立捐款
- `GET /` - 查詢捐款記錄
- `GET /{id}` - 取得捐款詳情

### 定期定額 API (`/api/subscriptions`)
- `POST /` - 建立訂閱
- `GET /` - 查詢訂閱列表
- `PUT /{id}` - 更新訂閱
- `DELETE /{id}` - 取消訂閱

### 維護管理 API (`/api/maintenance`)
- `POST /donations` - 手動建立捐款
- `GET /donors` - 查詢捐款人列表
- `POST /donors` - 建立捐款人
- `GET /donors/{id}` - 取得捐款人詳情
- `PUT /donors/{id}` - 更新捐款人
- `DELETE /donors/{id}` - 刪除捐款人
- `POST /donors/{id}/password-reset` - 重設密碼
- `GET /stats/simple` - 統計資料

### 管理 API (`/api/admin`)
- `GET /dashboard` - 儀表板資料
- `GET /settings` - 系統設定
- `PUT /settings` - 更新系統設定

---

## 認證與授權

### JWT 認證
- 登入後發放 JWT Token
- Token 有效期: 24 小時
- 使用 `HS256` 演算法

### 角色權限

| 功能 | user | donation_maintainer | data_maintainer | admin |
|------|:----:|:-------------------:|:---------------:|:-----:|
| 捐款 | ✅ | ✅ | ✅ | ✅ |
| 查看自己的捐款 | ✅ | ✅ | ✅ | ✅ |
| 捐款人管理 | ❌ | ✅ | ✅ | ✅ |
| 捐款記錄管理 | ❌ | ✅ | ✅ | ✅ |
| 定期定額管理 | ❌ | ✅ | ✅ | ✅ |
| 密碼重設 | ❌ | ❌ | ✅ | ✅ |
| 系統設定 | ❌ | ❌ | ❌ | ✅ |
| 對帳/稅務 | ❌ | ❌ | ❌ | ✅ |

---

## 部署架構

### Docker Compose 服務

| 服務 | 端口 | 說明 |
|------|------|------|
| nginx | 8080 | 反向代理 + 靜態檔案 |
| frontend | 3000 | Next.js 前端 |
| backend | 8000 | FastAPI 後端 |
| postgres | 5432 | PostgreSQL 資料庫 |
| mailhog | 8025 | 郵件測試 (開發環境) |

### 啟動命令

```bash
# 啟動所有服務
docker compose -p donationsystem up -d

# 查看服務狀態
docker compose -p donationsystem ps

# 查看日誌
docker compose -p donationsystem logs -f [服務名稱]

# 重建服務
docker compose -p donationsystem build [服務名稱]

# 停止所有服務
docker compose -p donationsystem down
```

---

## 環境變數

### 後端 (.env.production)

| 變數 | 說明 | 範例 |
|------|------|------|
| DATABASE_URL | 資料庫連線 | postgresql+asyncpg://user:pass@host/db |
| JWT_SECRET | JWT 密鑰 | your-secret-key |
| JWT_ALGORITHM | JWT 演算法 | HS256 |
| EMAIL_FROM | 發件人 Email | noreply@example.com |
| ENCRYPTION_KEY | PPI 加密金鑰 | (32 bytes hex) |

### 前端 (Next.js)

| 變數 | 說明 |
|------|------|
| NEXT_PUBLIC_API_URL | 後端 API 網址 |

---

## 版本資訊

- **目前版本**: 0.5.0
- **最後更新**: 2026-06-03
- **維護者**: CCL Chen
