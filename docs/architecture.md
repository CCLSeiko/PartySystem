# DonationSystem 系統架構設計

## 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        使用者瀏覽器                          │
│                    (Next.js 前端)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     Cloud Load Balancing                     │
│                     (GCP Load Balancer)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      後端服務層                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  使用者服務   │  │  捐款服務    │  │  支付服務    │     │
│  │  (User Svc)  │  │ (Donation)   │  │ (Payment)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 定期定額服務  │  │  對帳服務    │  │  收據服務    │     │
│  │ (Recurring)  │  │(Reconcil.)   │  │ (Receipt)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   訊息佇列 / 背景任務層                       │
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │  Cloud Pub/Sub         │  │  Cloud Tasks           │    │
│  │  (非同步事件)           │  │  (排程任務)             │    │
│  └────────────────────────┘  └────────────────────────┘    │
│  ┌────────────────────────┐                                │
│  │  Cloud Scheduler       │                                │
│  │  (定期定額觸發)         │                                │
│  └────────────────────────┘                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      資料儲存層                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  資料庫      │  │  快取        │  │  檔案儲存    │     │
│  │ (Cloud SQL   │  │  (Memorystore│  │  (Cloud      │     │
│  │  PostgreSQL) │  │   Redis)     │  │   Storage)   │     │
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
- **框架：** FastAPI (Python 3.11+) — 高效能、易於維護、自動 API 文件
- **資料庫 ORM：** SQLAlchemy 2.0+ (async) + Alembic (migrations)
- **驗證：** JWT (JSON Web Tokens)
- **排程/佇列：** Cloud Pub/Sub + Cloud Tasks + Cloud Scheduler
- **測試：** pytest (含 async 測試支援)
- **佈署：** Docker + GKE (Google Kubernetes Engine)

### 前端技術
- **框架：** Next.js 14+ (TypeScript, App Router)
- **狀態管理：** Zustand 或 React Context
- **UI 元件庫：** Shadcn/UI 或 Material-UI
- **測試：** Jest + React Testing Library
- **部署：** Vercel 或 Cloud Run

### 資料庫
- **主要資料庫：** Cloud SQL for PostgreSQL 15+
- **快取：** Memorystore for Redis (Session 快取、API 快取、佇列)
- **檔案儲存：** Cloud Storage (收據檔案、對帳檔案)

### 雲端服務 (GCP)
- **雲端平台：** Google Cloud Platform (GCP)
- **容器 orchestration：** GKE (Google Kubernetes Engine)
- **負載均衡：** Cloud Load Balancing
- **CDN：** Cloud CDN (靜態資源加速)
- **監控：** Cloud Monitoring + Cloud Logging
- **排程：** Cloud Scheduler (定期定額扣款)
- **佇列：** Cloud Pub/Sub + Cloud Tasks (非同步處理)
- **CI/CD：** Cloud Build + Artifact Registry

## 系統模組設計

### 1. 使用者管理模組
**功能：**
- 註冊、登入、登出
- 個人資料管理（含身分證字號（加密）、地址等）
- 稅務申報同意管理
- 密碼重設
- 權限管理

**API 端點：**
- `POST /api/users/register` — 註冊新使用者
- `POST /api/users/login` — 使用者登入
- `GET /api/users/me` — 取得使用者資料
- `PUT /api/users/me` — 更新使用者資料
- `POST /api/users/password/reset` — 密碼重設
- `PUT /api/users/me/tax-consent` — 更新稅務申報同意設定

### 2. 捐款管理模組
**功能：**
- 建立捐款紀錄（含已登入會員與匿名訪客）
- 查詢捐款紀錄
- 取消捐款
- 捐款收據生成
- 匿名捐款支援（user_id 可為 NULL）

**API 端點：**
- `POST /api/donations` — 建立捐款（支援匿名）
- `GET /api/donations` — 查詢捐款列表
- `GET /api/donations/{id}` — 取得特定捐款
- `DELETE /api/donations/{id}` — 取消捐款
- `GET /api/donations/{id}/receipt` — 下載捐款收據

### 3. 支付整合模組
**功能：**
- 信用卡支付處理 (Stripe + 藍新金流)
- 郵政劃撥處理
- 現金捐款記錄
- 金流 Webhook 接收與簽章驗證
- 支付狀態查詢

**API 端點：**
- `POST /api/payments/credit-card` — 信用卡支付
- `POST /api/payments/postal` — 郵政劃撥
- `POST /api/payments/cash` — 現金捐款
- `GET /api/payments/{id}/status` — 支付狀態查詢
- `POST /api/payments/webhook/stripe` — Stripe Webhook（免 JWT，使用簽章驗證）
- `POST /api/payments/webhook/spgateway` — 藍新金流 Webhook（免 JWT，使用簽章驗證）

### 4. 定期定額管理模組 (新增)
**功能：**
- 建立/修改/取消定期定額捐款方案
- 自動扣款排程（每月/每季）
- 扣款失敗重試與通知
- 定期定額捐款查詢

**API 端點：**
- `POST /api/subscriptions` — 建立定期定額捐款
- `GET /api/subscriptions` — 查詢定期定額列表
- `GET /api/subscriptions/{id}` — 取得特定定期定額
- `PUT /api/subscriptions/{id}` — 修改定期定額設定
- `DELETE /api/subscriptions/{id}` — 取消定期定額
- `GET /api/subscriptions/{id}/history` — 查詢定期定額扣款歷史

**背景排程：**
- `Cloud Scheduler` → 每月/每季觸發扣款批次
- `Cloud Tasks` → 個別扣款任務處理
- `Cloud Pub/Sub` → 扣款結果通知（成功/失敗）

### 5. 對帳管理模組 (新增)
**功能：**
- 郵政劃撥對帳檔案匯入與解析
- 批次核對捐款狀態
- 對帳差異報表
- 對帳歷史查詢

**API 端點：**
- `POST /api/admin/reconciliation/upload` — 上傳對帳檔案（CSV/TXT）
- `GET /api/admin/reconciliation` — 查詢對帳紀錄列表
- `GET /api/admin/reconciliation/{id}` — 取得對帳詳情
- `GET /api/admin/reconciliation/{id}/report` — 下載對帳差異報告

### 6. 稅務申報模組 (新增)
**功能：**
- 捐款資料匯出（符合國稅局格式 CSV）
- 年度捐款總結查詢
- 身分證字號/統編管理

**API 端點：**
- `GET /api/admin/tax/report/{year}` — 匯出年度申報 CSV
- `GET /api/admin/tax/summary/{year}` — 年度捐款統計

### 7. 管理後台模組
**功能：**
- 捐款管理
- 統計報表
- 使用者管理
- 系統設定
- 對帳管理
- 定期定額管理

**API 端點：**
- `GET /api/admin/donations` — 管理後台捐款列表
- `GET /api/admin/stats` — 統計報表
- `GET /api/admin/users` — 使用者管理
- `PUT /api/admin/settings` — 系統設定

## 資料庫設計

### 主要資料表

#### 1. Users (使用者)
| 欄位 | 型態 | 說明 |
|------|------|------|
| `id` | UUID (PK) | 主鍵 |
| `email` | VARCHAR(255) UNIQUE | 電子郵件（唯一） |
| `password_hash` | VARCHAR(255) | bcrypt 密碼雜湊 |
| `name` | VARCHAR(100) | 姓名 |
| `identity_number` | BYTEA | **身分證字號 AES-256-GCM 加密儲存** |
| `phone` | VARCHAR(20) | 電話 |
| `address` | TEXT | 地址 |
| `tax_consent` | BOOLEAN | 是否同意上傳國稅局 |
| `is_anonymous` | BOOLEAN | 是否為匿名訪客帳號 |
| `created_at` | TIMESTAMP | 建立時間 |
| `updated_at` | TIMESTAMP | 更新時間 |
| `is_active` | BOOLEAN | 是否啟用 |

#### 2. Donations (捐款紀錄)
| 欄位 | 型態 | 說明 |
|------|------|------|
| `id` | UUID (PK) | 主鍵 |
| `user_id` | UUID (FK, NULLABLE) | 使用者 ID（匿名捐款可為 NULL） |
| `guest_email` | VARCHAR(255) | 匿名捐款者 Email（選填） |
| `guest_name` | VARCHAR(100) | 匿名捐款者姓名（選填） |
| `amount` | NUMERIC(12, 2) | 捐款金額（使用 Decimal，禁用 Float） |
| `currency` | VARCHAR(3) | 幣別 (TWD/USD) |
| `purpose` | VARCHAR(100) | 捐款用途 |
| `payment_method` | ENUM | credit_card / postal / cash |
| `status` | ENUM | pending / success / failed / cancelled |
| `is_recurring` | BOOLEAN | 是否為定期定額捐款 |
| `subscription_id` | UUID (FK, NULLABLE) | 所屬定期定額方案 |
| `receipt_number` | VARCHAR(50) | 收據編號 |
| `tax_deductible` | BOOLEAN | 是否可抵稅 |
| `created_at` | TIMESTAMP | 建立時間 |
| `updated_at` | TIMESTAMP | 更新時間 |

#### 3. Payments (支付紀錄)
| 欄位 | 型態 | 說明 |
|------|------|------|
| `id` | UUID (PK) | 主鍵 |
| `donation_id` | UUID (FK) | 捐款 ID |
| `subscription_id` | UUID (FK, NULLABLE) | 定期定額 ID（如適用） |
| `payment_gateway` | ENUM | stripe / spgateway / postal / cash |
| `gateway_transaction_id` | VARCHAR(255) | 第三方交易 ID |
| `amount` | NUMERIC(12, 2) | 金額 |
| `status` | ENUM | pending / success / failed / refunded |
| `failure_reason` | TEXT | 失敗原因 |
| `webhook_received` | BOOLEAN | 是否已收到 Webhook 通知 |
| `created_at` | TIMESTAMP | 建立時間 |
| `updated_at` | TIMESTAMP | 更新時間 |

#### 4. Subscriptions (定期定額方案) — 新增
| 欄位 | 型態 | 說明 |
|------|------|------|
| `id` | UUID (PK) | 主鍵 |
| `user_id` | UUID (FK) | 使用者 ID |
| `amount` | NUMERIC(12, 2) | 每期金額 |
| `currency` | VARCHAR(3) | 幣別 |
| `frequency` | ENUM | monthly / quarterly / yearly |
| `payment_method` | ENUM | credit_card |
| `gateway_customer_id` | VARCHAR(255) | Stripe/藍新客戶授權碼 |
| `status` | ENUM | active / paused / cancelled / expired |
| `total_cycles` | INTEGER | 總期數（0 = 無限期） |
| `cycles_completed` | INTEGER | 已完成期數 |
| `next_billing_date` | DATE | 下次扣款日期 |
| `last_billing_date` | DATE | 上次扣款日期 |
| `cancelled_at` | TIMESTAMP | 取消時間 |
| `created_at` | TIMESTAMP | 建立時間 |
| `updated_at` | TIMESTAMP | 更新時間 |

#### 5. PostalDrafts (郵政劃撥單)
| 欄位 | 型態 | 說明 |
|------|------|------|
| `id` | UUID (PK) | 主鍵 |
| `donation_id` | UUID (FK) | 捐款 ID |
| `draft_number` | VARCHAR(20) UNIQUE | 劃撥單號 |
| `postal_account` | VARCHAR(20) | 劃撥帳號 |
| `amount` | NUMERIC(10, 2) | 金額 |
| `status` | ENUM | generated / sent / received / confirmed / reconciled |
| `reconciled_at` | TIMESTAMP | 對帳確認時間 |
| `created_at` | TIMESTAMP | 建立時間 |
| `updated_at` | TIMESTAMP | 更新時間 |

#### 6. ReconciliationRecords (對帳紀錄) — 新增
| 欄位 | 型態 | 說明 |
|------|------|------|
| `id` | UUID (PK) | 主鍵 |
| `file_name` | VARCHAR(255) | 上傳對帳檔案名稱 |
| `file_path` | VARCHAR(500) | Cloud Storage 檔案路徑 |
| `file_hash` | VARCHAR(64) | 檔案 SHA-256 雜湊 |
| `total_records` | INTEGER | 對帳總筆數 |
| `matched_count` | INTEGER | 相符筆數 |
| `unmatched_count` | INTEGER | 不相符筆數 |
| `status` | ENUM | processing / completed / failed |
| `uploaded_by` | UUID (FK) | 上傳管理員 |
| `created_at` | TIMESTAMP | 建立時間 |
| `updated_at` | TIMESTAMP | 更新時間 |

#### 7. TaxReports (稅務申報紀錄) — 新增
| 欄位 | 型態 | 說明 |
|------|------|------|
| `id` | UUID (PK) | 主鍵 |
| `year` | INTEGER | 申報年度 |
| `generated_at` | TIMESTAMP | 產出時間 |
| `file_path` | VARCHAR(500) | Cloud Storage CSV 路徑 |
| `total_donors` | INTEGER | 總捐款人數 |
| `total_amount` | NUMERIC(14, 2) | 總捐款金額 |
| `status` | ENUM | generating / completed / failed |
| `created_at` | TIMESTAMP | 建立時間 |

## 安全性設計

### 1. 身份驗證
- 使用 JWT 進行 API 驗證
- Token 有效期限：24 小時
- 支援 Refresh Token 機制
- Webhook 端點使用金流商簽章驗證，不走 JWT

### 2. 資料加密
- 密碼使用 bcrypt 或 Argon2 加密儲存
- **欄位層級加密：** 身分證字號、地址、電話等 PII 使用 **AES-256-GCM** 在應用層加密後寫入資料庫
- 加密金鑰由 **GCP Cloud KMS** 管理，定期輪換
- 信用卡資訊不儲存，僅儲存支付閘道授權碼
- HTTPS 傳輸加密（TLS 1.3）

### 3. 金流 Webhook 簽章驗證
- **Stripe Webhook：** 驗證 `Stripe-Signature` 頭部，使用 Webhook Secret
- **藍新金流 Webhook：** 驗證 `CheckCode` 或自訂簽章參數
- Webhook 端點獨立於主 API，不使用同一組 JWT 驗證

### 4. 防護機制
- SQL Injection 防護（使用 ORM）
- XSS 防護（輸入驗證與編碼）
- CSRF 防護（使用 CSRF Token）
- 速率限制（Rate Limiting）
- 個資存取稽核日誌
- 定期安全漏洞掃描

## 非同步處理設計 (新增)

### 背景任務佇列 (Cloud Pub/Sub + Cloud Tasks)

| 事件 | 佇列 | 處理內容 |
|------|------|---------|
| 捐款成功 | Pub/Sub | 發送收據 PDF、寄送 Email 感謝信、通知管理員 |
| 定期定額扣款 | Cloud Tasks | 執行信用卡扣款、更新狀態 |
| 定期定額扣款失敗 | Pub/Sub | 發送失敗通知、重試排程 |
| 對帳檔案上傳 | Cloud Tasks | 解析 CSV/TXT、比對捐款紀錄 |
| 年度稅務報表 | Cloud Tasks | 產生國稅局格式 CSV、上傳至 Cloud Storage |

### 排程任務 (Cloud Scheduler)

| 排程 | 頻率 | 任務 |
|------|------|------|
| 定期定額扣款 | 每日凌晨檢查 | 查詢當日到期 Subscription，建立扣款任務 |
| 對帳提醒 | 每週 | 檢查未對帳的郵政劃撥紀錄 |
| 國稅局報表 | 每年一月 | 產生上年度捐款報表 |
| 資料庫備份 | 每日 | pg_dump 備份至 Cloud Storage |

## 匿名捐款流程 (新增)

1. 訪客選擇捐款方式與金額
2. 填寫基本聯絡資訊（Email 為選填，用於收據寄送）
3. `POST /api/donations` 中 `user_id` 為 `null`
4. 系統建立捐款紀錄，分配 Anonymous UUID 作為追蹤識別
5. 付款完成後，系統使用聯絡資訊發送收據
6. 匿名捐款人可透過 Email + 捐款編號查詢捐款狀態

## 效能設計

### 1. 快取策略
- 使用 Redis 快取熱門資料（使用者資料、捐款統計）
- API 回應快取（5 分鐘）

### 2. 資料庫優化
- 建立索引（使用者 ID、捐款日期、定期定額下次扣款日等）
- 分表分庫（大數據量時）
- 讀寫分離（主從資料庫）

### 3. 靜態資源優化
- 使用 CDN 加速前端資源
- 圖片壓縮與懶加載
- 程式碼捆綁與最小化

## 監控與日誌

### 1. 監控指標
- 系統可用性
- API 回應時間
- 錯誤率
- 資料庫連線數
- **定期定額扣款成功率**（新增）
- **對帳處理時間**（新增）

### 2. 日誌記錄
- 應用程式日誌
- 訪問日誌
- 錯誤日誌
- 安全日誌（含個資存取稽核）
- 金流 Webhook 日誌（新增）

### 3. 告警機制
- 系統異常告警
- 效能瓶頸告警
- 安全事件告警
- **定期定額連續扣款失敗告警**（新增）
- **對帳差異過大告警**（新增）
