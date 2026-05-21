# DonationSystem 系統架構設計

## 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        使用者瀏覽器                          │
│                    (React/Vue.js 前端)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway / Load Balancer              │
│                    (Nginx / AWS ALB)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      後端服務層                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  使用者服務   │  │  捐款服務    │  │  支付服務    │     │
│  │  (User Svc)  │  │ (Donation)   │  │ (Payment)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      資料儲存層                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  資料庫      │  │  快取        │  │  檔案儲存    │     │
│  │ (PostgreSQL) │  │  (Redis)     │  │  (S3)        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    第三方服務整合                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Stripe      │  │  藍新金流    │  │  郵政系統    │     │
│  │  (信用卡)    │  │  (信用卡)    │  │  (劃撥)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 技術棧選擇

### 後端技術
- **框架：** FastAPI (Python) - 高效能、易於維護、自動 API 文件
- **資料庫 ORM：** SQLAlchemy + Alembic ( migrations )
- **驗證：** JWT (JSON Web Tokens)
- **測試：** pytest
- **佈署：** Docker + Kubernetes

### 前端技術
- **框架：** React (TypeScript)
- **狀態管理：** Redux Toolkit
- **UI 元件庫：** Material-UI 或 Ant Design
- **測試：** Jest + React Testing Library

### 資料庫
- **主要資料庫：** PostgreSQL (關係型資料庫)
- **快取：** Redis (Session 快取、API 快取)
- **檔案儲存：** AWS S3 (收據檔案儲存)

### 雲端服務
- **雲端平台：** AWS (Amazon Web Services)
- **容器 orchestration：** AWS EKS (Elastic Kubernetes Service)
- **負載均衡：** AWS ALB (Application Load Balancer)
- **CDN：** AWS CloudFront (靜態資源加速)
- **監控：** AWS CloudWatch

## 系統模組設計

### 1. 使用者管理模組
**功能：**
- 註冊、登入、登出
- 個人資料管理
- 密碼重設
- 權限管理

**API 端點：**
- `POST /api/users/register` - 註冊新使用者
- `POST /api/users/login` - 使用者登入
- `GET /api/users/me` - 取得使用者資料
- `PUT /api/users/me` - 更新使用者資料
- `POST /api/users/password/reset` - 密碼重設

### 2. 捐款管理模組
**功能：**
- 建立捐款紀錄
- 查詢捐款紀錄
- 取消捐款
- 捐款收據生成

**API 端點：**
- `POST /api/donations` - 建立捐款
- `GET /api/donations` - 查詢捐款列表
- `GET /api/donations/{id}` - 取得特定捐款
- `DELETE /api/donations/{id}` - 取消捐款
- `GET /api/donations/{id}/receipt` - 下載捐款收據

### 3. 支付整合模組
**功能：**
- 信用卡支付處理
- 郵政劃撥處理
- 現金捐款記錄
- 支付狀態查詢

**API 端點：**
- `POST /api/payments/credit-card` - 信用卡支付
- `POST /api/payments/postal` - 郵政劃撥
- `POST /api/payments/cash` - 現金捐款
- `GET /api/payments/{id}/status` - 支付狀態查詢

### 4. 管理後台模組
**功能：**
- 捐款管理
- 統計報表
- 使用者管理
- 系統設定

**API 端點：**
- `GET /api/admin/donations` - 管理後台捐款列表
- `GET /api/admin/stats` - 統計報表
- `GET /api/admin/users` - 使用者管理
- `PUT /api/admin/settings` - 系統設定

## 資料庫設計

### 主要資料表

#### 1. Users (使用者)
- `id` (PK)
- `email` (唯一)
- `password_hash`
- `name`
- `phone`
- `address`
- `created_at`
- `updated_at`
- `is_active`

#### 2. Donations (捐款紀錄)
- `id` (PK)
- `user_id` (FK)
- `amount`
- `currency` (TWD/USD)
- `purpose` (捐款用途)
- `payment_method` (credit_card/postal/cash)
- `status` (pending/success/failed/cancelled)
- `receipt_number` (收據編號)
- `created_at`
- `updated_at`

#### 3. Payments (支付紀錄)
- `id` (PK)
- `donation_id` (FK)
- `payment_gateway` (stripe/postal/cash)
- `gateway_transaction_id`
- `amount`
- `status`
- `created_at`
- `updated_at`

#### 4. PostalDrafts (郵政劃撥單)
- `id` (PK)
- `donation_id` (FK)
- `draft_number` (劃撥單號)
- `postal_account` (劃撥帳號)
- `amount`
- `status` (generated/sent/received)
- `created_at`
- `updated_at`

## 安全性設計

### 1. 身份驗證
- 使用 JWT 進行 API 驗證
- Token 有效期限：24 小時
- 支援 Refresh Token 機制

### 2. 資料加密
- 密碼使用 bcrypt 加密儲存
- 敏感資料（信用卡資訊）不儲存，僅儲存交易 ID
- HTTPS 傳輸加密

### 3. 防護機制
- SQL Injection 防護（使用 ORM）
- XSS 防護（輸入驗證與編碼）
- CSRF 防護（使用 CSRF Token）
- 速率限制（Rate Limiting）

## 效能設計

### 1. 快取策略
- 使用 Redis 快取熱門資料（使用者資料、捐款統計）
- API 回應快取（5 分鐘）

### 2. 資料庫優化
- 建立索引（使用者 ID、捐款日期等）
- 分表分庫（大數據量時）
- 讀寫分離（主從資料庫）

### 3. 靜態資源優化
- 使用 CDN 加速前端資源
- 圖片壓縮與懒加载
- 程式碼捆綁與最小化

## 監控與日誌

### 1. 監控指標
- 系統可用性
- API 回應時間
- 錯誤率
- 資料庫連線數

### 2. 日誌記錄
- 應用程式日誌
- 訪問日誌
- 錯誤日誌
- 安全日誌

### 3. 告警機制
- 系統異常告警
- 效能瓶頸告警
- 安全事件告警
