# HMEICR 專案

HMEICR (家計與電子發票管理系統) 是一個用於追蹤收據並與台灣電子發票平台整合的網站應用程式。

## 系統架構

*   **前端**: Vanilla JavaScript, HTML5, CSS3 (由 Vite 提供服務)
*   **後端**: Python Flask
*   **資料庫**: MongoDB
*   **容器化**: Docker Compose

## 功能特色

*   **使用者認證**: 註冊、登入、登出 (安全的工作階段與密碼雜湊)。
*   **收據管理**:
    *   新增收據 (標題、金額、幣別、日期)。
    *   列出收據。
    *   **編輯收據** (更新詳細資訊)。
    *   **刪除收據** (包含確認提示)。
*   **E-Invoice 電子發票**:
    *   **連結載具**: 輸入手機條碼與驗證碼。
    *   **同步發票**: 從財政部平台下載近兩個月發票。
*   **數據分析**: 查看本月**總金額**。
*   **UI/UX**:
    *   簡潔、響應式設計。
    *   **深色模式** (全域切換)。
    *   互動式模態視窗 (Modals)。

## 文件

詳細文件位於 `docs/` 目錄中：

*   [API 規格書 (API Specification)](docs/api-spec.md)
*   [架構圖 (Architecture Diagram)](docs/architecture.md)
*   [系統流程圖 (System Flowchart)](docs/flowchart.md)

## 快速開始

### 前置需求

*   Docker 與 Docker Compose

### 安裝與執行 (推薦)

1.  **複製儲存庫 (Clone repo)**。
2.  在根目錄建立 **`.env` 檔案**：
    ```env
    MONGO_URI=mongodb://root:password123@mongodb:27017/myapp?authSource=admin
    EINVOICE_SECRET_KEY=您產生的密鑰
    secret_key=您的_flask_secret_key
    ```
3.  **使用 Docker Compose 執行**:
    ```bash
    docker compose up --build
    ```
4.  **存取應用程式**:
    *   前端: `http://localhost:5173` (代理 API 請求至後端)
    *   後端 API: `http://localhost:8080` (內部埠 5000 對應至 8080)

### 手動設定 (開發用)

#### 後端 (Backend)
1.  安裝相依套件: `pip install -r requirements.txt`
2.  在本地埠 27017 執行 MongoDB。
3.  啟動伺服器: `python server.py` (執行於埠 5000)。

#### 前端 (Frontend)
1.  進入 client 目錄: `cd client`
2.  安裝相依套件: `npm install`
3.  啟動開發伺服器: `npm run dev`
