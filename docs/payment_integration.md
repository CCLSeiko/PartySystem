# DonationSystem 支付整合設計

## 支付方式概述

DonationSystem 支援三種捐款方式：
1. **現金捐款** - 現場或透過指定地點捐贈現金
2. **信用卡扣款** - 透過第三方支付閘道進行線上刷卡
3. **郵政劃撥** - 透過中華郵政劃撥系統進行捐款

## 支付模組架構

```
┌─────────────────────────────────────────────────────────────┐
│                    支付整合模組 (Payment Module)             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 信用卡支付   │  │ 郵政劃撥處理 │  │ 現金捐款處理 │     │
│  │ (CreditCard) │  │   (Postal)   │  │   (Cash)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  支付紀錄資料庫 (Payments Table)             │
│  - donation_id (FK)                                         │
│  - payment_method (enum: credit_card/postal/cash)          │
│  - amount                                                   │
│  - status (pending/success/failed/cancelled)               │
│  - gateway_transaction_id (第三方交易 ID)                   │
│  - created_at, updated_at                                   │
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
6. 執行 3D Secure 驗證 (若需要)
7. 確認付款

#### 後端流程：
1. 建立捐款紀錄 (status: pending)
2. 呼叫 Stripe API 建立 Payment Intent
3. 返回 client_secret 給前端
4. 前端完成付款後，接收 Webhook 通知
5. 更新捐款狀態 (success/failed)
6. 發送確認郵件

### API 設計

```python
# 建立信用卡付款
POST /api/payments/credit-card
Request:
{
  "donation_id": "uuid",
  "amount": 1000,
  "currency": "TWD",
  "card_info": {
    "number": "4242424242424242",
    "exp_month": "12",
    "exp_year": "2025",
    "cvc": "123"
  }
}

Response:
{
  "payment_intent_id": "pi_xxx",
  "client_secret": "pi_xxx_secret_xxx",
  "status": "requires_action"
}
```

### Webhook 處理
- `payment_intent.succeeded` - 付款成功
- `payment_intent.payment_failed` - 付款失敗
- `payment_intent.canceled` - 付款取消

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
1. 建立捐款紀錄 (status: pending)
2. 產生郵政劃撥單號
3. 儲存劃撥單資訊至資料庫
4. 更新捐款狀態 (postal_draft_generated)
5. 發送劃撥單至使用者電子郵件

### 資料庫設計

#### 郵政劃撥單資料表 (postal_drafts)
```sql
CREATE TABLE postal_drafts (
    id UUID PRIMARY KEY,
    donation_id UUID REFERENCES donations(id),
    draft_number VARCHAR(20) UNIQUE,  -- 劃撥單號
    postal_account VARCHAR(20),       -- 劃撥帳號 (19位郵局帳號)
    amount DECIMAL(10, 2),
    status VARCHAR(20),               -- generated/sent/received/confirmed
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 劃撥單格式
- **劃撥單號**：系統產生唯一編號 (例如：POST-20240101-001)
- **劃撥帳號**：機構郵局帳號 (19位數字)
- **金額**：捐款金額
- **備註**：捐款用途說明
- **列印格式**：PDF 格式，符合郵局標準

### 狀態管理
1. **generated** - 劃撥單已產生
2. **sent** - 劃撥單已寄送給捐款者
3. **received** - 郵局已收到劃撥單
4. **confirmed** - 劃撥款項已確認入帳

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

## 支付模組 API 設計

### 信用卡支付 API

#### 1. 建立信用卡付款
```python
POST /api/payments/credit-card
```

#### 2. 確認付款狀態
```python
GET /api/payments/{payment_id}/status
```

#### 3. Webhook 處理
```python
POST /api/webhooks/stripe
```

### 郵政劃撥 API

#### 1. 建立劃撥單
```python
POST /api/payments/postal
```

#### 2. 下載劃撥單
```python
GET /api/payments/postal/{draft_id}/download
```

#### 3. 更新劃撥狀態
```python
PUT /api/payments/postal/{draft_id}/status
```

### 現金捐款 API

#### 1. 建立現金捐款記錄
```python
POST /api/payments/cash
```

#### 2. 確認現金捐款
```python
PUT /api/payments/cash/{cash_id}/confirm
```

## 安全性考量

### 信用卡支付
1. **PCI DSS 合規**：不儲存完整信用卡資訊
2. **HTTPS 傳輸**：所有通訊使用加密
3. **3D Secure 驗證**：降低詐騙風險
4. **Webhook 驗證**：驗證 Webhook 來源

### 郵政劃撥
1. **劃撥單號唯一性**：防止重複使用
2. **狀態追蹤**：完整記錄劃撥流程
3. **對帳機制**：定期與郵局對帳

### 現金捐款
1. **工作人員驗證**：確認工作人員身份
2. **收據管理**：提供正式收據
3. **現金保管**：遵循現金管理規範

## 測試策略

### 單元測試
- 信用卡支付邏輯測試
- 郵政劃撥單產生測試
- 現金捐款記錄測試

### 整合測試
- Stripe API 整合測試 (使用測試模式)
- 郵政劃撥流程測試
- 支付狀態更新測試

### 端到端測試
- 完整捐款流程測試
- 支付失敗處理測試
- Webhook 處理測試

## 監控與錯誤處理

### 監控指標
- 付款成功率
- 付款失敗原因分析
- 郵政劃撥處理時間
- 現金捐款記錄延遲

### 錯誤處理
- 信用卡付款失敗：顯示錯誤訊息，提供重試機制
- 郵政劃撥失敗：通知使用者，提供協助管道
- 現金捐款記錄錯誤：工作人員確認後手動修正

## 未來擴充

1. **行動支付**：支援 Line Pay、Apple Pay、Google Pay
2. **定期捐款**：信用卡定期扣款功能
3. **多幣別支援**：支援外幣捐款
4. **捐款證明**：線上捐款證明下載
