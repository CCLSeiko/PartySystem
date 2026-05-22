# DonationSystem API 規格設計

> 版本：0.2.0  
> 基礎路徑：`https://api.donationsystem.com/api`  
> 認證方式：JWT Bearer Token（部分端點除外，如 Webhook、註冊、登入）

---

## 目錄

1. [使用者管理 API](#1-使用者管理-api)
2. [捐款管理 API](#2-捐款管理-api)
3. [支付整合 API](#3-支付整合-api)
4. [定期定額 API](#4-定期定額-api)
5. [管理後台 API](#5-管理後台-api)
6. [通用錯誤格式](#6-通用錯誤格式)

---

## 1. 使用者管理 API

### 1.1 註冊

```
POST /api/users/register
Auth: None
```

**Request Body：**

```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "name": "王小明",
  "identity_number": "A123456789",
  "phone": "0912345678",
  "tax_consent": false
}
```

| 欄位 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `email` | string | ✅ | 有效 Email，將做為登入帳號 |
| `password` | string | ✅ | 最少 8 字元，含大小寫與數字 |
| `name` | string | ✅ | 真實姓名 |
| `identity_number` | string | ❌ | 身分證字號/統編，AES-256-GCM 加密儲存 |
| `phone` | string | ❌ | 聯絡電話 |
| `tax_consent` | boolean | ❌ | 預設 false；是否同意上傳國稅局 |

**Response 201：**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "王小明",
  "created_at": "2026-05-22T10:00:00Z"
}
```

---

### 1.2 登入

```
POST /api/users/login
Auth: None
```

**Request Body：**

```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

**Response 200：**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1440
}
```

---

### 1.3 取得個人資料

```
GET /api/users/me
Auth: JWT
```

**Response 200：**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "王小明",
  "phone": "0912345678",
  "has_identity_number": true,
  "tax_consent": false,
  "is_active": true,
  "created_at": "2026-05-22T10:00:00Z"
}
```

> ⚠️ `identity_number` 不直接回傳明文，僅以 `has_identity_number` 布林值表示是否已設定。

---

### 1.4 更新個人資料

```
PUT /api/users/me
Auth: JWT
```

**Request Body：**

```json
{
  "name": "王大明",
  "phone": "0987654321",
  "identity_number": "A123456789"
}
```

所有欄位皆為選填，僅更新有提供的欄位。

**Response 200：**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "王大明",
  "phone": "0987654321",
  "updated_at": "2026-05-22T11:00:00Z"
}
```

---

### 1.5 更新稅務申報同意

```
PUT /api/users/me/tax-consent
Auth: JWT
```

**Request Body：**

```json
{
  "tax_consent": true
}
```

**Response 200：**

```json
{
  "tax_consent": true,
  "updated_at": "2026-05-22T11:00:00Z"
}
```

---

### 1.6 密碼重設（寄送重設信）

```
POST /api/users/password/reset
Auth: None
```

**Request Body：**

```json
{
  "email": "user@example.com"
}
```

**Response 200：**

```json
{
  "message": "如果該 Email 已註冊，重設連結已寄送"
}
```

> 出於安全考量，不論 Email 是否存在皆回傳相同訊息。

---

## 2. 捐款管理 API

### 2.1 建立捐款

```
POST /api/donations
Auth: JWT 或 None（匿名捐款）
```

**Request Body（會員）：**

```json
{
  "amount": 1000,
  "currency": "TWD",
  "purpose": "general",
  "payment_method": "credit_card",
  "is_recurring": false
}
```

**Request Body（匿名訪客）：**

```json
{
  "amount": 500,
  "currency": "TWD",
  "purpose": "emergency_relief",
  "payment_method": "postal",
  "guest_email": "guest@example.com",
  "guest_name": "王匿名"
}
```

| 欄位 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `amount` | number | ✅ | 捐款金額，最小值 1 |
| `currency` | string | ❌ | 預設 TWD |
| `purpose` | string | ❌ | 捐款用途代碼 |
| `payment_method` | string | ✅ | credit_card / postal / cash |
| `is_recurring` | boolean | ❌ | 預設 false |
| `guest_email` | string | ❌ | 匿名捐款者 Email（無 JWT 時可用） |
| `guest_name` | string | ❌ | 匿名捐款者姓名（無 JWT 時可用） |

**Response 201：**

```json
{
  "id": "uuid",
  "amount": 1000,
  "currency": "TWD",
  "status": "pending",
  "payment_method": "credit_card",
  "payment_url": "https://...",
  "created_at": "2026-05-22T10:00:00Z"
}
```

> `payment_url` 為前端導向付款頁面的 URL。

---

### 2.2 查詢捐款列表

```
GET /api/donations
Auth: JWT
```

**Query Parameters：**

| 參數 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `status` | string | ❌ | 篩選狀態：pending/success/failed/cancelled |
| `payment_method` | string | ❌ | 篩選方式：credit_card/postal/cash |
| `purpose` | string | ❌ | 篩選用途 |
| `start_date` | string | ❌ | 起始日期 (ISO 8601) |
| `end_date` | string | ❌ | 結束日期 (ISO 8601) |
| `page` | integer | ❌ | 頁碼，預設 1 |
| `per_page` | integer | ❌ | 每頁筆數，預設 20，最大 100 |

**Response 200：**

```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 1000,
      "currency": "TWD",
      "purpose": "general",
      "payment_method": "credit_card",
      "status": "success",
      "is_recurring": false,
      "receipt_number": "RCP-20260522-001",
      "created_at": "2026-05-22T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

---

### 2.3 取得特定捐款

```
GET /api/donations/{id}
Auth: JWT
```

**Response 200：**

```json
{
  "id": "uuid",
  "amount": 1000,
  "currency": "TWD",
  "purpose": "general",
  "payment_method": "credit_card",
  "status": "success",
  "is_recurring": false,
  "subscription_id": null,
  "receipt_number": "RCP-20260522-001",
  "tax_deductible": true,
  "payment": {
    "id": "uuid",
    "payment_gateway": "stripe",
    "gateway_transaction_id": "pi_xxx",
    "status": "success",
    "created_at": "2026-05-22T10:00:00Z"
  },
  "created_at": "2026-05-22T10:00:00Z",
  "updated_at": "2026-05-22T10:05:00Z"
}
```

---

### 2.4 取消捐款

```
DELETE /api/donations/{id}
Auth: JWT
```

**Query Parameters：**

| 參數 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `reason` | string | ❌ | 取消原因 |

**Response 200：**

```json
{
  "id": "uuid",
  "status": "cancelled",
  "cancelled_at": "2026-05-22T11:00:00Z"
}
```

> 僅允許在捐款建立 24 小時內且狀態為 pending 時取消。

---

### 2.5 下載捐款收據

```
GET /api/donations/{id}/receipt
Auth: JWT
```

**Response 200：**

Content-Type: `application/pdf`  
Content-Disposition: `attachment; filename="receipt-RCP-20260522-001.pdf"`

---

## 3. 支付整合 API

### 3.1 建立信用卡付款

```
POST /api/payments/credit-card
Auth: JWT
```

**Request Body：**

```json
{
  "donation_id": "uuid",
  "amount": 1000,
  "currency": "TWD",
  "payment_method_id": "pm_xxx"
}
```

| 欄位 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `donation_id` | string | ✅ | 先前建立的捐款 ID |
| `amount` | number | ✅ | 付款金額 |
| `currency` | string | ❌ | 預設 TWD |
| `payment_method_id` | string | ✅ | Stripe PaymentMethod ID（前端已 tokenize） |

**Response 200：**

```json
{
  "payment_intent_id": "pi_xxx",
  "client_secret": "pi_xxx_secret_xxx",
  "status": "requires_action"
}
```

> 前端收到 `requires_action` 時應執行 3D Secure 驗證。

---

### 3.2 建立郵政劃撥單

```
POST /api/payments/postal
Auth: JWT
```

**Request Body：**

```json
{
  "donation_id": "uuid",
  "amount": 500
}
```

**Response 201：**

```json
{
  "draft_id": "uuid",
  "draft_number": "POST-20260522-001",
  "postal_account": "1234567890123456789",
  "amount": 500,
  "status": "generated",
  "download_url": "/api/payments/postal/xxx/download",
  "created_at": "2026-05-22T10:00:00Z"
}
```

---

### 3.3 下載劃撥單

```
GET /api/payments/postal/{draft_id}/download
Auth: JWT
```

**Response 200：**

Content-Type: `application/pdf`

---

### 3.4 建立現金捐款記錄

```
POST /api/payments/cash
Auth: JWT（管理員權限）
```

**Request Body：**

```json
{
  "donation_id": "uuid",
  "amount": 300,
  "location": "台北服務中心",
  "staff_id": "uuid",
  "notes": "現場捐款箱"
}
```

**Response 201：**

```json
{
  "cash_id": "uuid",
  "status": "pending",
  "received_at": null,
  "created_at": "2026-05-22T10:00:00Z"
}
```

---

### 3.5 確認現金捐款收款

```
PUT /api/payments/cash/{cash_id}/confirm
Auth: JWT（管理員權限）
```

**Response 200：**

```json
{
  "cash_id": "uuid",
  "status": "confirmed",
  "received_at": "2026-05-22T10:30:00Z"
}
```

---

### 3.6 查詢付款狀態

```
GET /api/payments/{payment_id}/status
Auth: JWT
```

**Response 200：**

```json
{
  "payment_id": "uuid",
  "donation_id": "uuid",
  "payment_gateway": "stripe",
  "amount": 1000,
  "status": "success",
  "gateway_transaction_id": "pi_xxx",
  "webhook_received": true,
  "created_at": "2026-05-22T10:00:00Z"
}
```

---

### 3.7 Stripe Webhook

```
POST /api/payments/webhook/stripe
Auth: Stripe-Signature（無 JWT）
```

**Request Body：**

原始 Stripe Event JSON（由 Stripe 發送）。

**Response 200：**

```json
{
  "status": "ok"
}
```

> 此端點使用 Stripe Webhook Secret 驗證簽章，不使用 JWT。

**支援的事件：**

| 事件類型 | 處理邏輯 |
|---------|---------|
| `payment_intent.succeeded` | 更新 Donation + Payment 為 success，觸發收據生成 |
| `payment_intent.payment_failed` | 更新 Payment 為 failed，記錄失敗原因 |
| `payment_intent.canceled` | 更新狀態為 cancelled |
| `charge.refunded` | 更新狀態為 refunded |

---

### 3.8 藍新金流 Webhook

```
POST /api/payments/webhook/spgateway
Auth: CheckCode（無 JWT）
```

> 此端點使用藍新金流 CheckCode 驗證簽章，不使用 JWT。

**Response 200：**

```json
{
  "status": "ok"
}
```

---

## 4. 定期定額 API

### 4.1 建立定期定額捐款

```
POST /api/subscriptions
Auth: JWT
```

**Request Body：**

```json
{
  "amount": 500,
  "currency": "TWD",
  "frequency": "monthly",
  "payment_method_id": "pm_xxx",
  "total_cycles": 0,
  "purpose": "general"
}
```

| 欄位 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `amount` | number | ✅ | 每期金額 |
| `currency` | string | ❌ | 預設 TWD |
| `frequency` | string | ✅ | monthly / quarterly / yearly |
| `payment_method_id` | string | ✅ | Stripe PaymentMethod ID |
| `total_cycles` | integer | ❌ | 0 = 無限期（預設） |
| `purpose` | string | ❌ | 捐款用途 |

**Response 201：**

```json
{
  "id": "uuid",
  "amount": 500,
  "frequency": "monthly",
  "status": "active",
  "next_billing_date": "2026-06-22",
  "total_cycles": 0,
  "cycles_completed": 1,
  "created_at": "2026-05-22T10:00:00Z"
}
```

> 首次扣款立即執行，`cycles_completed` 計為 1。

---

### 4.2 查詢定期定額列表

```
GET /api/subscriptions
Auth: JWT
```

**Query Parameters：**

| 參數 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `status` | string | ❌ | active / paused / cancelled / expired |
| `page` | integer | ❌ | 預設 1 |
| `per_page` | integer | ❌ | 預設 20 |

**Response 200：**

```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 500,
      "frequency": "monthly",
      "status": "active",
      "next_billing_date": "2026-06-22",
      "cycles_completed": 3,
      "total_cycles": 0,
      "created_at": "2026-03-22T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

---

### 4.3 取得特定定期定額

```
GET /api/subscriptions/{id}
Auth: JWT
```

**Response 200：**

```json
{
  "id": "uuid",
  "amount": 500,
  "frequency": "monthly",
  "status": "active",
  "next_billing_date": "2026-06-22",
  "last_billing_date": "2026-05-22",
  "cycles_completed": 3,
  "total_cycles": 0,
  "consecutive_failures": 0,
  "purpose": "general",
  "created_at": "2026-03-22T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

---

### 4.4 修改定期定額設定

```
PUT /api/subscriptions/{id}
Auth: JWT
```

**Request Body：**

```json
{
  "amount": 1000,
  "frequency": "quarterly"
}
```

所有欄位皆為選填，僅更新有提供的欄位。

| 欄位 | 型態 | 說明 |
|------|------|------|
| `amount` | number | 新每期金額 |
| `frequency` | string | 新頻率：monthly / quarterly / yearly |
| `total_cycles` | integer | 新總期數 |

**Response 200：**

```json
{
  "id": "uuid",
  "amount": 1000,
  "frequency": "quarterly",
  "status": "active",
  "updated_at": "2026-05-22T11:00:00Z"
}
```

---

### 4.5 暫停/恢復定期定額

```
PUT /api/subscriptions/{id}/pause
PUT /api/subscriptions/{id}/resume
Auth: JWT
```

**Response (pause) 200：**

```json
{
  "id": "uuid",
  "status": "paused",
  "paused_at": "2026-05-22T11:00:00Z"
}
```

**Response (resume) 200：**

```json
{
  "id": "uuid",
  "status": "active",
  "next_billing_date": "2026-06-22"
}
```

---

### 4.6 取消定期定額

```
DELETE /api/subscriptions/{id}
Auth: JWT
```

**Request Body：**

```json
{
  "reason": "經濟因素"
}
```

**Response 200：**

```json
{
  "id": "uuid",
  "status": "cancelled",
  "cancelled_at": "2026-05-22T11:00:00Z"
}
```

---

### 4.7 查詢扣款歷史

```
GET /api/subscriptions/{id}/history
Auth: JWT
```

**Query Parameters：**

| 參數 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `page` | integer | ❌ | 預設 1 |
| `per_page` | integer | ❌ | 預設 20 |

**Response 200：**

```json
{
  "data": [
    {
      "donation_id": "uuid",
      "amount": 500,
      "status": "success",
      "billing_date": "2026-05-22",
      "receipt_number": "RCP-20260522-001"
    },
    {
      "donation_id": "uuid",
      "amount": 500,
      "status": "failed",
      "failure_reason": "card_declined",
      "billing_date": "2026-04-22"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 3,
    "total_pages": 1
  }
}
```

---

## 5. 管理後台 API

### 5.1 捐款管理（管理員列表）

```
GET /api/admin/donations
Auth: JWT（管理員權限）
```

**Query Parameters：**

| 參數 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `status` | string | ❌ | 篩選狀態 |
| `payment_method` | string | ❌ | 篩選方式 |
| `start_date` | string | ❌ | 起始日期 |
| `end_date` | string | ❌ | 結束日期 |
| `is_recurring` | boolean | ❌ | 是否為定期定額 |
| `user_id` | string | ❌ | 指定使用者 |
| `q` | string | ❌ | 全文搜尋關鍵字 |
| `page` | integer | ❌ | 預設 1 |
| `per_page` | integer | ❌ | 預設 20，最大 200 |

**Response 200：**

```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "王小明"
      },
      "amount": 1000,
      "payment_method": "credit_card",
      "status": "success",
      "is_recurring": true,
      "receipt_number": "RCP-20260522-001",
      "created_at": "2026-05-22T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

---

### 5.2 統計報表

```
GET /api/admin/stats
Auth: JWT（管理員權限）
```

**Query Parameters：**

| 參數 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `period` | string | ❌ | day / week / month / year，預設 month |
| `start_date` | string | ❌ | 起始日期 |
| `end_date` | string | ❌ | 結束日期 |
| `group_by` | string | ❌ | 分組方式：date / method / purpose |

**Response 200：**

```json
{
  "summary": {
    "total_donations": 156,
    "total_amount": 250000,
    "avg_per_donation": 1602.56,
    "total_recurring": 45,
    "recurring_success_rate": 0.97
  },
  "by_method": {
    "credit_card": 120000,
    "postal": 80000,
    "cash": 50000
  },
  "by_purpose": {
    "general": 150000,
    "emergency_relief": 100000
  },
  "time_series": [
    {
      "date": "2026-05-01",
      "amount": 8500,
      "count": 6
    }
  ]
}
```

---

### 5.3 使用者管理

```
GET /api/admin/users
Auth: JWT（管理員權限）
```

**Query Parameters：**

| 參數 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `q` | string | ❌ | 搜尋（Email / 姓名） |
| `is_active` | boolean | ❌ | 啟用狀態篩選 |
| `page` | integer | ❌ | 預設 1 |
| `per_page` | integer | ❌ | 預設 20 |

**Response 200：**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "王小明",
      "is_active": true,
      "total_donated": 15000,
      "has_active_subscription": true,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 89,
    "total_pages": 5
  }
}
```

---

### 5.4 停用/啟用使用者

```
PUT /api/admin/users/{id}/status
Auth: JWT（管理員權限）
```

**Request Body：**

```json
{
  "is_active": false,
  "reason": "違反使用條款"
}
```

**Response 200：**

```json
{
  "id": "uuid",
  "is_active": false,
  "updated_at": "2026-05-22T11:00:00Z"
}
```

---

### 5.5 上傳對帳檔案

```
POST /api/admin/reconciliation/upload
Auth: JWT（管理員權限）
Content-Type: multipart/form-data
```

**Request：**

| 欄位 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `file` | file | ✅ | 郵局對帳 CSV/TXT 檔案 |

**Response 202：**

```json
{
  "reconciliation_id": "uuid",
  "file_name": "postal_recon_202605.csv",
  "file_hash": "sha256-xxx",
  "status": "processing",
  "message": "對帳處理中，完成後將更新結果"
}
```

> 回傳 202 Accepted，對帳為背景非同步處理。

---

### 5.6 查詢對帳紀錄

```
GET /api/admin/reconciliation
Auth: JWT（管理員權限）
```

**Response 200：**

```json
{
  "data": [
    {
      "id": "uuid",
      "file_name": "postal_recon_202605.csv",
      "total_records": 120,
      "matched_count": 118,
      "unmatched_count": 2,
      "status": "completed",
      "created_at": "2026-05-22T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 12,
    "total_pages": 1
  }
}
```

---

### 5.7 取得對帳詳情

```
GET /api/admin/reconciliation/{id}
Auth: JWT（管理員權限）
```

**Response 200：**

```json
{
  "id": "uuid",
  "file_name": "postal_recon_202605.csv",
  "total_records": 120,
  "matched_count": 118,
  "unmatched_count": 2,
  "status": "completed",
  "unmatched_items": [
    {
      "row": 45,
      "draft_number": "POST-20260515-045",
      "expected_amount": 1000,
      "actual_amount": 900,
      "reason": "金額不符"
    },
    {
      "row": 78,
      "draft_number": "POST-20260518-078",
      "expected_amount": 500,
      "actual_amount": 0,
      "reason": "系統有紀錄但郵局無對應資料"
    }
  ],
  "created_at": "2026-05-22T10:00:00Z"
}
```

---

### 5.8 下載對帳差異報告

```
GET /api/admin/reconciliation/{id}/report
Auth: JWT（管理員權限）
```

**Response 200：**

Content-Type: `text/csv`  
Content-Disposition: `attachment; filename="reconciliation_diff_20260522.csv"`

---

### 5.9 系統設定

```
PUT /api/admin/settings
Auth: JWT（管理員權限）
```

**Request Body：**

```json
{
  "min_donation_amount": 10,
  "donation_purposes": ["general", "emergency_relief", "education"],
  "subscription_retry_limit": 3,
  "auto_pause_after_failures": 3
}
```

**Response 200：**

```json
{
  "updated_fields": [
    "min_donation_amount",
    "subscription_retry_limit"
  ]
}
```

---

### 5.10 匯出年度國稅局 CSV

```
GET /api/admin/tax/report/{year}
Auth: JWT（管理員權限）
```

**Response 200：**

Content-Type: `text/csv`  
Content-Disposition: `attachment; filename="tax_deduction_2026.csv"`

CSV 格式範例：

```csv
身分證字號,姓名,捐款金額合計,捐款日期,收據編號
A123456789,王小明,12000,2026-05-22,RCP-20260522-001
B987654321,李大華,5000,2026-05-21,RCP-20260521-003
```

---

### 5.11 年度捐款統計

```
GET /api/admin/tax/summary/{year}
Auth: JWT（管理員權限）
```

**Response 200：**

```json
{
  "year": 2026,
  "total_donors": 89,
  "total_tax_consented": 67,
  "total_amount": 250000,
  "tax_deductible_amount": 235000,
  "status": "ready",
  "last_report_generated": "2026-05-22T10:00:00Z"
}
```

---

## 6. 通用錯誤格式

### 6.1 錯誤回應結構

所有 API 錯誤回傳以下格式：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "捐款金額必須大於 0",
    "details": [
      {
        "field": "amount",
        "message": "ensure this value is greater than 0"
      }
    ]
  }
}
```

### 6.2 錯誤碼對照表

| HTTP Status | Error Code | 說明 |
|------------|-----------|------|
| 400 | `VALIDATION_ERROR` | 請求資料驗證失敗 |
| 401 | `UNAUTHORIZED` | 未提供或無效的 JWT Token |
| 403 | `FORBIDDEN` | 無權限執行此操作 |
| 404 | `NOT_FOUND` | 資源不存在 |
| 409 | `CONFLICT` | 資源衝突（如 Email 已註冊） |
| 422 | `UNPROCESSABLE_ENTITY` | 請求語法正確但語意錯誤 |
| 429 | `RATE_LIMITED` | 請求過於頻繁，請稍後再試 |
| 500 | `INTERNAL_ERROR` | 伺服器內部錯誤 |

---

## 附錄 A：API 端點總表

| 方法 | 端點 | 認證 | 模組 |
|------|------|------|------|
| POST | `/api/users/register` | — | 使用者 |
| POST | `/api/users/login` | — | 使用者 |
| GET | `/api/users/me` | JWT | 使用者 |
| PUT | `/api/users/me` | JWT | 使用者 |
| PUT | `/api/users/me/tax-consent` | JWT | 使用者 |
| POST | `/api/users/password/reset` | — | 使用者 |
| POST | `/api/donations` | JWT/匿名 | 捐款 |
| GET | `/api/donations` | JWT | 捐款 |
| GET | `/api/donations/{id}` | JWT | 捐款 |
| DELETE | `/api/donations/{id}` | JWT | 捐款 |
| GET | `/api/donations/{id}/receipt` | JWT | 捐款 |
| POST | `/api/payments/credit-card` | JWT | 支付 |
| POST | `/api/payments/postal` | JWT | 支付 |
| GET | `/api/payments/postal/{draft_id}/download` | JWT | 支付 |
| POST | `/api/payments/cash` | JWT(管理員) | 支付 |
| PUT | `/api/payments/cash/{cash_id}/confirm` | JWT(管理員) | 支付 |
| GET | `/api/payments/{payment_id}/status` | JWT | 支付 |
| POST | `/api/payments/webhook/stripe` | 簽章 | 支付 |
| POST | `/api/payments/webhook/spgateway` | 簽章 | 支付 |
| POST | `/api/subscriptions` | JWT | 定期定額 |
| GET | `/api/subscriptions` | JWT | 定期定額 |
| GET | `/api/subscriptions/{id}` | JWT | 定期定額 |
| PUT | `/api/subscriptions/{id}` | JWT | 定期定額 |
| PUT | `/api/subscriptions/{id}/pause` | JWT | 定期定額 |
| PUT | `/api/subscriptions/{id}/resume` | JWT | 定期定額 |
| DELETE | `/api/subscriptions/{id}` | JWT | 定期定額 |
| GET | `/api/subscriptions/{id}/history` | JWT | 定期定額 |
| GET | `/api/admin/donations` | JWT(管理員) | 管理後台 |
| GET | `/api/admin/stats` | JWT(管理員) | 管理後台 |
| GET | `/api/admin/users` | JWT(管理員) | 管理後台 |
| PUT | `/api/admin/users/{id}/status` | JWT(管理員) | 管理後台 |
| PUT | `/api/admin/settings` | JWT(管理員) | 管理後台 |
| POST | `/api/admin/reconciliation/upload` | JWT(管理員) | 管理後台 |
| GET | `/api/admin/reconciliation` | JWT(管理員) | 管理後台 |
| GET | `/api/admin/reconciliation/{id}` | JWT(管理員) | 管理後台 |
| GET | `/api/admin/reconciliation/{id}/report` | JWT(管理員) | 管理後台 |
| GET | `/api/admin/tax/report/{year}` | JWT(管理員) | 管理後台 |
| GET | `/api/admin/tax/summary/{year}` | JWT(管理員) | 管理後台 |
| GET | `/api/health` | — | 系統 |
