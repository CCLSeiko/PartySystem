# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-TW/).

## [0.5.0] - 2026-06-03

### Added
- **新增角色：捐款資料維護管理人員 (`data_maintainer`)**
  - 可執行捐款人、捐款記錄、定期定額的 CRUD 操作
  - 可手動發起捐款人密碼重設
  - 不可存取系統管理功能（對帳、稅務等）
- **密碼重設功能（維護人員手動觸發）**
  - 維護人員可重設捐款人密碼
  - 系統產生臨時密碼並顯示於畫面上
  - 捐款人下次登入時強制修改密碼
- **修改密碼頁面 (`/member/change-password`)**
  - 捐款人可自行變更密碼
  - 強制密碼變更時顯示提示訊息
- **新增 API 端點**
  - `POST /api/maintenance/donors/{donor_id}/password-reset` - 維護人員重設密碼
  - `PUT /api/users/me/password` - 使用者變更密碼
- **資料庫 Migration**
  - 新增 `force_password_change` 欄位至 `users` 表

### Changed
- **簡化密碼重設流程**
  - 移除 Email 通知（暫不使用）
  - 直接產生臨時密碼並回傳給維護人員
  - 捐款人登入後強制修改密碼
- **登入回應格式**
  - 新增 `force_password_change` 欄位
- **User 類型**
  - 新增 `force_password_change` 屬性

### Fixed
- 修正密碼重設 API 缺少 `user_id` 參數的問題
- 修正前端顯示「密碼重設信件已寄出」改為顯示臨時密碼

## [0.4.0] - 2026-06-02

### Added
- 公眾捐款頁面定期定額選項
- 信用卡付款整合（Stripe）
- 郵政劃撥付款
- 會員訂閱管理
- 管理後台儀表板

### Changed
- Nginx 反向代理設定優化
- Docker Compose 服務架構調整

## [0.3.0] - 2026-06-01

### Added
- 捐款人帳號管理
- 捐款記錄查詢
- 定期定額訂閱功能

## [0.2.1] - 2026-05-31

### Added
- 捐款人電話欄位（家用、手機、公司）
- 訂閱用途欄位

## [0.2.0] - 2026-05-30

### Added
- 捐款人授權帳戶管理
- 信用卡資訊加密儲存

## [0.1.0] - 2026-05-29

### Added
- 初始版本
- 使用者註冊/登入
- 捐款功能
- 管理後台
