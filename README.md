# DonationSystem

一個支援現金、信用卡扣款、郵政劃撥的捐款系統。

## 功能特性

- 使用者管理（註冊、登入、個人資料）
- 捐款管理（建立捐款、查詢捐款、取消捐款）
- 支付整合（現金、信用卡、郵政劃撥）
- 管理後台（捐款統計、報表、使用者管理）

## 技術棧

- **後端：** Python (FastAPI/Django) 或 Node.js (Express)
- **前端：** React / Vue.js
- **資料庫：** PostgreSQL / MySQL
- **雲端服務：** AWS / Google Cloud / Azure
- **支付整合：** Stripe API、藍新金流 API、郵政劃撥處理流程

## 安裝與設定

### 前置需求

- Python 3.9+ 或 Node.js 16+
- PostgreSQL 或 MySQL 資料庫
- 雲端服務帳號（AWS/GCP/Azure）

### 安裝步驟

1. 克隆儲存庫：
   ```bash
   git clone <repository-url>
   cd DonationSystem
   ```

2. 設定後端環境：
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

3. 設定前端環境：
   ```bash
   cd frontend
   npm install
   ```

4. 設定環境變數：
   ```bash
   cp .env.example .env
   # 編輯 .env 檔案，填入必要的設定值
   ```

5. 執行資料庫 migrations：
   ```bash
   cd backend
   python manage.py migrate  # Django
   # 或 alembic upgrade head  # FastAPI + Alembic
   ```

6. 啟動服務：
   ```bash
   # 後端
   cd backend
   python manage.py runserver  # Django
   # 或 uvicorn main:app --reload  # FastAPI

   # 前端
   cd frontend
   npm start
   ```

## 開發指南

### 專案結構

```
DonationSystem/
├── backend/          # 後端程式碼
│   ├── src/          # 應用程式碼
│   ├── tests/        # 測試
│   └── ...
├── frontend/         # 前端程式碼
│   ├── src/          # 應用程式碼
│   ├── tests/        # 測試
│   └── ...
├── database/         # 資料庫設定與 migrations
├── docs/             # 文件
├── deploy/           # 佈署腳本
└── ...
```

### 開發流程

1. 開發新功能時，請從 `develop` 或 `feature/*` 分支開始
2. 撰寫單元測試
3. 執行測試：`pytest` (後端) 或 `npm test` (前端)
4. 提交程式碼：`git commit -m "feat: add new feature"`
5. 建立 Pull Request 進行程式碼審查

### 測試

後端測試：
```bash
cd backend
pytest -v
```

前端測試：
```bash
cd frontend
npm test
```

## 文件

- [使用者手冊](docs/user_manual.md)
- [技術文件](docs/technical_documentation.md)
- [API 規格](docs/api_spec.yaml)

## 佈署

請參考 [deploy/](deploy/) 目錄中的佈署腳本與說明。

## 授權

MIT License
