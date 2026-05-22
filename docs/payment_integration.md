# DonationSystem 支付整合設計

## 支付方式概述

DonationSystem 支援三種捐款方式：
1. **現金捐款** — 現場或透過指定地點捐贈現金
2. **信用卡扣款** — 透過第三方支付閘道進行線上刷卡
3. **郵政劃撥** — 透過中華郵政劃撥系統進行捐款

此外，支援**定期定額捐款**功能，透過信用卡自動扣款。

## 支付模組架構

```
┌─────────────────────────────────────────────────────────────┐
│                    支付整合模組 (Payment Module)             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 信用卡支付   │  │ 郵政劃撥處理 │  │ 現金捐款處理 │     │
│  │ (CreditCard) │  │   (Postal)   │  │   (Cash)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ 定期定額扣款 │  │ 對帳處理     │                        │
│  │ (Recurring)  │  │(Reconcil.)   │                        │
│  └──────────────┘  └──────────────┘                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              背景任務處理層 (Cloud Tasks / Pub/Sub)          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 收據生成     │  │ Email 發送   │  │ 對帳解析     │     │
│  │ (Receipt)    │  │ (Notification)│  │ (Parse)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  支付紀錄資料庫 (Payments Table)             │
└─────────────────────────────────────────────────────────────┘
```

## 1. 信用卡支付整合

### 技術選擇
- **支付閘道**：Stripe (主要) + 藍新金流 (備援)
- **整合方式**：RESTful API + Webhook
- **安全性**：3D Secure 2.0 驗證

### 流程設計

#### 前端流程：
1. 使用者選擇「信用卡捐款」
2. 填寫捐款金額與個人資訊
3. 進入信用卡資訊輸入頁面
4. 系統產生 Payment Intent (Stripe)
5. 使用者輸入信用卡資訊
6. 執行 3D Secure 驗證（若需要）
7. 確認付款

#### 後端流程：
1. 建立捐款紀錄（status: pending）
2. 呼叫 Stripe API 建立 Payment Intent
3. 返回 client_secret 給前端
4. 前端完成付款後，接收 Webhook 通知
5. 驗證 Webhook 簽章
6. 更新捐款狀態（success/failed）
7. 透過 Cloud Pub/Sub 觸發收據生成與 Email 發送

### API 設計

```python
# 建立信用卡付款
POST /api/payments/credit-card
Request:
{
  "donation_id": "uuid",
  "amount": 1000,
  "currency": "TWD"
}

Response:
{
  "payment_intent_id": "pi_xxx",
  "client_secret": "pi_xxx_secret_xxx",
  "status": "requires_action"
}
```

### Webhook 處理

#### Stripe Webhook

```
POST /api/payments/webhook/stripe
```
- **驗證方式**：驗證 `Stripe-Signature` 頭部，使用 Stripe Webhook Secret
- **無 JWT 驗證**：此端點使用 Stripe 簽章驗證取代 JWT

```python
import stripe
from fastapi import Request, HTTPException

async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 處理事件
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        # 更新捐款狀態
    elif event["type"] == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        # 記錄失敗原因

    return {"status": "ok"}
```

#### 藍新金流 (Spgateway) Webhook

```
POST /api/payments/webhook/spgateway
```
- **驗證方式**：驗證 `CheckCode` 或自訂簽章參數
- **無 JWT 驗證**：此端點使用藍新金流簽章驗證取代 JWT

### Webhook 事件處理

| Stripe 事件 | 處理邏輯 |
|------------|---------|
| `payment_intent.succeeded` | 更新捐款 → success，觸發收據生成 |
| `payment_intent.payment_failed` | 更新捐款 → failed，記錄失敗原因 |
| `payment_intent.canceled` | 更新捐款 → cancelled |
| `charge.refunded` | 更新捐款 → refunded |

## 2. 郵政劃撥處理

### 流程設計

#### 線上劃撥流程：
1. 使用者選擇「郵政劃撥」捐款
2. 填寫捐款金額與個人資訊
3. 系統產生劃撥單號
4. 顯示劃撥單資訊（帳號、金額、備註）
5. 提供劃撥單下載與列印功能
6. 使用者至郵局辦理劃撥
7. 系統記錄劃撥狀態

#### 後端處理流程：
1. 建立捐款紀錄（status: pending）
2. 產生郵政劃撥單號
3. 儲存劃撥單資訊至資料庫
4. 更新捐款狀態（postal_draft_generated）
5. 發送劃撥單至使用者電子郵件

### 對帳處理流程 (新增)

由於郵政劃撥屬於**非即時支付**，需要異步對帳機制：

1. **管理員上傳對帳檔：** `POST /api/admin/reconciliation/upload`
2. **系統驗證檔案：** 檢查 SHA-256 雜湊防止重複上傳
3. **背景解析：** Cloud Tasks 解析 CSV/TXT，讀取郵局回傳的捐款資料
4. **自動比對：** 依劃撥單號、金額、日期比對資料庫中的 PostalDrafts 紀錄
5. **狀態更新：** 相符的更新為 `reconciled`，不相符的標記差異
6. **產出差異報告：** `GET /api/admin/reconciliation/{id}/report`

### API 設計

#### 對帳檔案上傳
```python
POST /api/admin/reconciliation/upload
Content-Type: multipart/form-data

Request:
- file: 郵局對帳 CSV/TXT 檔案
```

#### 資料庫設計

##### 郵政劃撥單資料表 (postal_drafts)
```sql
CREATE TABLE postal_drafts (
    id UUID PRIMARY KEY,
    donation_id UUID REFERENCES donations(id),
    draft_number VARCHAR(20) UNIQUE,      -- 劃撥單號
    postal_account VARCHAR(20),           -- 劃撥帳號
    amount NUMERIC(10, 2),
    status VARCHAR(20),                   -- generated/sent/received/confirmed/reconciled
    reconciled_at TIMESTAMP,              -- 對帳確認時間
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

##### 狀態管理
1. **generated** — 劃撥單已產生
2. **sent** — 劃撥單已寄送給捐款者
3. **received** — 郵局已收到劃撥單
4. **confirmed** — 劃撥款項已確認入帳
5. **reconciled** — 已通過對帳核對

## 3. 現金捐款處理

### 流程設計

#### 現場捐款流程：
1. 使用者至指定地點捐贈現金
2. 工作人員記錄捐款資訊
3. 系統建立捐款紀錄
4. 發送收據給捐款者

#### 線上記錄流程：
1. 使用者選擇「現金捐款」
2. 填寫預計捐款資訊
3. 系統產生捐款編號
4. 提供捐款地點與時間資訊
5. 使用者至指定地點捐款
6. 工作人員確認後更新狀態

### 資料庫設計

#### 現金捐款資料表 (cash_donations)
```sql
CREATE TABLE cash_donations (
    id UUID PRIMARY KEY,
    donation_id UUID REFERENCES donations(id),
    location VARCHAR(100),           -- 捐款地點
    staff_id UUID,                   -- 工作人員 ID
    received_at TIMESTAMP,           -- 收款時間
    notes TEXT,                      -- 備註
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 4. 定期定額捐款 (新增)

### 技術選擇
- **排程觸發**：Cloud Scheduler（每日凌晨檢查到期扣款）
- **任務處理**：Cloud Tasks（個別扣款任務）
- **支付方式**：信用卡（Stripe / 藍新金流）
- **客戶授權**：使用 Stripe PaymentMethod / 藍新金流 Token 化

### 流程設計

#### 建立定期定額：
1. 使用者選擇「定期定額捐款」
2. 選擇頻率（每月/每季/每年）
3. 設定每期金額
4. 輸入信用卡資訊（首次授權）
5. Stripe/藍新金流回傳授權 Token
6. 建立 Subscription 紀錄
7. 首次扣款立即執行
8. 剩餘扣款排入 Cloud Scheduler

#### 自動扣款流程（每月執行）：
1. Cloud Scheduler 每日凌晨觸發檢查任務
2. 查詢 `next_billing_date = today` 的 Subscription
3. 對每筆到期 Subscription，建立扣款 Task 送入 Cloud Tasks
4. Cloud Tasks 執行信用卡扣款
5. 扣款成功 → 建立 Donation + Payment 紀錄，更新 `cycles_completed`
6. 扣款失敗 → 更新 Subscription 狀態，記入失敗計數，發送通知

#### 扣款失敗處理：
- 首次失敗：發送 Email 通知，3 天後重試
- 連續 3 次失敗：自動暫停 Subscription，標記需人工處理
- 管理員可手動重啟或取消

### API 設計

```python
# 建立定期定額
POST /api/subscriptions
Request:
{
  "amount": 500,
  "currency": "TWD",
  "frequency": "monthly",
  "payment_method_id": "pm_xxx",      # Stripe PaymentMethod ID
  "total_cycles": 0                    # 0 = 無限期
}

Response:
{
  "id": "uuid",
  "status": "active",
  "next_billing_date": "2026-06-01",
  "amount": 500,
  "frequency": "monthly"
}

# 取消定期定額
DELETE /api/subscriptions/{id}
Response:
{
  "status": "cancelled",
  "cancelled_at": "2026-05-22T10:00:00Z"
}
```

### 資料庫設計

#### 定期定額方案資料表 (subscriptions)
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TWD',
    frequency VARCHAR(10) NOT NULL,           -- monthly/quarterly/yearly
    payment_method VARCHAR(20) DEFAULT 'credit_card',
    gateway_customer_id VARCHAR(255),          -- Stripe/藍新客戶授權碼
    gateway_payment_method_id VARCHAR(255),    -- Stripe PaymentMethod ID
    status VARCHAR(20) DEFAULT 'active',       -- active/paused/cancelled/expired
    total_cycles INTEGER DEFAULT 0,            -- 0 = 無限期
    cycles_completed INTEGER DEFAULT 0,
    consecutive_failures INTEGER DEFAULT 0,    -- 連續失敗次數
    next_billing_date DATE NOT NULL,
    last_billing_date DATE,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date)
    WHERE status = 'active';
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
```

## 5. 匿名捐款處理 (新增)

### 流程設計

1. 訪客進入捐款頁面，選擇金額與方式
2. 系統顯示「會員捐款」與「訪客捐款」兩個選項
3. 訪客選擇匿名捐款，填寫選填聯絡資訊（Email、姓名）
4. `POST /api/donations` 送出，`user_id` 為 `null`
5. 系統建立捐款紀錄，產生 Anonymous 追蹤 ID
6. 完成付款後，系統使用 Email（如有提供）發送收據
7. 匿名捐款人可透過 Email + 捐款編號查詢狀態

### API 調整

```python
# 建立捐款（支援匿名）
POST /api/donations
Request:
{
  "amount": 1000,
  "currency": "TWD",
  "purpose": "general",
  "payment_method": "credit_card",
  "guest_info": {                          # 匿名捐款者資訊（選填）
    "email": "guest@example.com",
    "name": "王小明",
    "phone": "0912345678"
  }
}

# 會員與匿名捐款統一使用同一 API
# user_id 從 JWT Token 取得；無 Token 時視為匿名
```

## 支付模組 API 完整列表

### 信用卡支付 API

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/payments/credit-card` | 建立信用卡付款 |
| GET | `/api/payments/{payment_id}/status` | 確認付款狀態 |
| POST | `/api/payments/webhook/stripe` | Stripe Webhook（免 JWT） |
| POST | `/api/payments/webhook/spgateway` | 藍新金流 Webhook（免 JWT） |

### 郵政劃撥 API

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/payments/postal` | 建立劃撥單 |
| GET | `/api/payments/postal/{draft_id}/download` | 下載劃撥單 |
| PUT | `/api/payments/postal/{draft_id}/status` | 更新劃撥狀態 |

### 現金捐款 API

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/payments/cash` | 建立現金捐款記錄 |
| PUT | `/api/payments/cash/{cash_id}/confirm` | 確認現金捐款 |

### 定期定額 API (新增)

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/subscriptions` | 建立定期定額 |
| GET | `/api/subscriptions` | 查詢定期定額列表 |
| GET | `/api/subscriptions/{id}` | 取得特定定期定額 |
| PUT | `/api/subscriptions/{id}` | 修改定期定額設定 |
| DELETE | `/api/subscriptions/{id}` | 取消定期定額 |
| GET | `/api/subscriptions/{id}/history` | 查詢扣款歷史 |

### 管理後台 API (對帳與稅務)

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/admin/reconciliation/upload` | 上傳對帳檔案 |
| GET | `/api/admin/reconciliation` | 查詢對帳紀錄 |
| GET | `/api/admin/reconciliation/{id}` | 取得對帳詳情 |
| GET | `/api/admin/reconciliation/{id}/report` | 下載差異報告 |
| GET | `/api/admin/tax/report/{year}` | 匯出年度國稅局 CSV |
| GET | `/api/admin/tax/summary/{year}` | 年度捐款統計 |

## 安全性考量

### 信用卡支付
1. **PCI DSS 合規**：不儲存完整信用卡資訊
2. **HTTPS 傳輸**：所有通訊使用加密（TLS 1.3）
3. **3D Secure 驗證**：降低詐騙風險
4. **Webhook 簽章驗證**：驗證 Webhook 來源（Stripe-Signature / 藍新 CheckCode）

### 郵政劃撥
1. **劃撥單號唯一性**：防止重複使用
2. **狀態追蹤**：完整記錄劃撥流程
3. **對帳機制**：檔案雜湊驗證防止重複上傳

### 定期定額 (新增)
1. **授權 Token 化**：使用 Stripe PaymentMethod ID，不儲存卡號
2. **扣款限額保護**：單次扣款不超過設定金額的 2 倍
3. **失敗重試限制**：連續 3 次失敗自動暫停

### 現金捐款
1. **工作人員驗證**：確認工作人員身份
2. **收據管理**：提供正式收據
3. **現金保管**：遵循現金管理規範

## 測試策略

### 單元測試
- 信用卡支付邏輯測試
- 郵政劃撥單產生測試
- 現金捐款記錄測試
- 定期定額排程邏輯測試（新增）
- 對帳檔案解析邏輯測試（新增）

### 整合測試
- Stripe API 整合測試（使用測試模式）
- 藍新金流 API 整合測試（使用測試模式）
- 郵政劃撥流程測試
- 支付狀態更新測試
- Webhook 簽章驗證測試（新增）
- 定期定額扣款全流程測試（新增）

### 端到端測試
- 完整捐款流程測試（會員 + 匿名）
- 支付失敗處理測試
- Webhook 處理測試
- 定期定額完整生命週期測試（新增）
- 對帳流程測試（新增）

## 監控與錯誤處理

### 監控指標
- 付款成功率
- 付款失敗原因分析
- 郵政劃撥處理時間
- 現金捐款記錄延遲
- **定期定額扣款成功率（新增）**
- **對帳處理時間與差異率（新增）**
- **Webhook 處理延遲（新增）**

### 錯誤處理
- 信用卡付款失敗：顯示錯誤訊息，提供重試機制
- 郵政劃撥失敗：通知使用者，提供協助管道
- 現金捐款記錄錯誤：工作人員確認後手動修正
- **定期定額扣款失敗：自動重試（最多 3 次），後續標記人工處理（新增）**
- **對帳解析失敗：記錄錯誤，通知管理員手動處理（新增）**

## 未來擴充
1. **行動支付**：支援 Line Pay、Apple Pay、Google Pay
2. **多幣別支援**：支援外幣捐款
3. **捐款證明**：線上捐款證明下載
4. **超商代碼繳費**：支援超商條碼繳費
5. **ATM 虛擬帳號**：支援 ATM 轉帳捐款
