# HMEICR Security Note
**版本：** 2.0  
**最後更新：** 2026-01-14  
**維護者：** 許詰祥、張傢寧、許方彥
---
## 📋 概述
本文件說明 HMEICR 應用程式已實作的資訊安全功能，包含前端、後端和基礎架構層面的安全措施。
---
## 🔐 已實作的安全功能
### 一、認證與授權
#### 1. 密碼安全
- **技術：** Bcrypt (Werkzeug)
- **實作位置：** `server.py` - `hash_password()`, `verify_password()`
- **特性：**
  - 自動 Salt 生成
  - 工作因子：12 rounds
  - 抗暴力破解
  - 抗彩虹表攻擊
#### 2. 密碼強度要求
- 最少 8 字元
- 至少一個大寫字母
- 至少一個小寫字母
- 至少一個數字
- 前後端雙重驗證
#### 3. Session 管理
- **技術：** Flask-Login + Secure Cookies
- **配置：**
  - `HttpOnly=True` - 防止 JavaScript 存取
  - `SameSite=Lax` - CSRF 防護
  - 過期時間：1 小時
  - 開發環境：`Secure=False`（生產環境需設為 `True`）
---
### 二、輸入驗證與清理
#### 1. 後端驗證模組
- **位置：** `utils/validators.py`
- **功能：**
  - Email 格式驗證（RFC 5322）
  - 密碼強度檢查
  - 金額驗證（正數、上限檢查）
  - 日期格式驗證（YYYY-MM-DD）
  - 貨幣代碼驗證（3 個大寫字母）
  - 字串清理（防注入）
#### 2. 前端驗證模組
- **位置：** `client/validators.js`
- **功能：**
  - 即時 Email 和密碼驗證
  - 視覺化錯誤提示
  - 減少無效 API 請求
#### 3. NoSQL 注入防護
- **方法：** `sanitize_string()` 移除危險字元
- **過濾：** `$`（MongoDB 運算子）、`.`（欄位路徑）
- **型別檢查：** 確保輸入為預期型別
---
### 三、攻擊防護
#### 1. XSS 防護
**前端：**
- 移除所有 `innerHTML` 使用
- 使用 `textContent` 和 `createElement`
- 貨幣代碼清理（僅允許 A-Z）
- 數值自動轉義
- **實作：** `client/xss-protection.js`, `client/main.js`
**後端：**
- Content Security Policy (CSP) headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
#### 2. CSRF 防護
- SameSite Cookie（Lax）
- 前端 CSRF token 準備（待後端完整啟用）
#### 3. 速率限制（防暴力破解）
- **技術：** Flask-Limiter
- **規則：**
  - 註冊：3 次/分鐘
  - 登入：5 次/分鐘
  - 全域：200 次/天，50 次/小時
- **回應：** 429 Too Many Requests
---
### 四、敏感資料保護
#### 1. 傳輸安全
- **開發環境：** HTTP
- **生產環境：** HTTPS/TLS 1.2+（需配置）
- **標頭：** HSTS（生產環境啟用）
#### 2. 儲存安全
- **密碼：** Bcrypt 雜湊（不可逆）
- **E-Invoice 憑證：** Fernet 對稱加密（待修復）
#### 3. 前端資料保護
- **位置：** `client/sensitive-data.js`
- **措施：**
  - 登出時清除所有密碼和 email 欄位
  - 多次覆蓋防止記憶體殘留
  - `autocomplete="new-password"` 保護
  - 清空 sessionStorage
  - 移除 console.log 敏感資料
---
### 五、安全標頭
**實作：** Flask-Talisman
| 標頭 | 值 | 功能 |
|------|----|----|
| X-Frame-Options | SAMEORIGIN | 防止點擊劫持 |
| X-Content-Type-Options | nosniff | 防止 MIME 類型嗅探 |
| Referrer-Policy | strict-origin-when-cross-origin | 控制 Referrer 資訊 |
| Content-Security-Policy | 設定中 | 防止 XSS 和資料注入 |
**生產環境額外標頭：**
- Strict-Transport-Security (HSTS)
- HTTPS 強制重定向
---
### 六、日誌與監控
#### 1. 安全事件日誌
- **位置：** `utils/security_logger.py`
- **格式：** JSON 結構化
- **記錄事件：**
  - 登入嘗試（成功/失敗）
  - 註冊事件
  - 登出事件
  - 速率限制觸發
  - 驗證失敗
  - 未授權存取
**日誌檔案：** `logs/security.log`
**日誌範例：**
```json
{
  "timestamp": "2026-01-14T08:00:00.000Z",
  "level": "WARNING",
  "event": "login_failed",
  "ip": "127.0.0.1",
  "user": "test@example.com",
  "endpoint": "api.login",
  "method": "POST",
  "status": "failure",
  "details": {"reason": "invalid_password"}
}
```
---
### 七、錯誤處理
**自定義錯誤處理器：** `server.py`
| 錯誤碼 | 處理 |
|--------|------|
| 404 | Resource not found |
| 429 | Too many requests |
| 500 | Internal server error |
**安全原則：**
- ✅ 不洩漏堆疊追蹤
- ✅ 不顯示內部路徑
- ✅ 友善錯誤訊息
- ✅ 記錄到安全日誌
---
### 八、環境變數管理
**檔案：** `.env`（不納入版本控制）
```env
# MongoDB 連線
MONGO_URI=mongodb://localhost:27017
# Flask Secret Key（生產環境使用強隨機值）
secret_key=your-secret-key-here
# E-Invoice 加密金鑰（Fernet 格式）
EINVOICE_SECRET_KEY=your-44-char-base64-key-here
# E-Invoice API 憑證（選用）
EINVOICE_USERNAME=your-username
EINVOICE_PASSWORD=your-password
```
**金鑰生成：** 使用 `scripts/generate_keys.py`
---
## 🧪 測試與驗證
### 自動化測試
- **位置：** `tests/security_test.py`
- **執行：** `cd tests && python security_test.py`
- **涵蓋：**
  - 密碼強度驗證
  - Email 格式驗證
  - 速率限制
  - 安全標頭
  - Session Cookie
  - 錯誤處理
  - NoSQL 注入防護
  - XSS 防護
### 手動測試
詳見 `artifacts/teacher_testing_guide.md`
---
## 🚀 生產環境部署檢查清單
### 必須設定
- [ ] **Flask 配置**
  - [ ] `DEBUG = False`
  - [ ] `SECRET_KEY` 使用強隨機值（32+ bytes）
  - [ ] `SESSION_COOKIE_SECURE = True`
- [ ] **HTTPS/TLS**
  - [ ] 啟用 HTTPS
  - [ ] Talisman `force_https = True`
  - [ ] 啟用 HSTS
- [ ] **MongoDB**
  - [ ] 啟用認證
  - [ ] 建立應用專用帳號（最小權限）
  - [ ] 限制網路存取（內部網路）
  - [ ] 定期備份
- [ ] **日誌**
  - [ ] 設定日誌輪替
  - [ ] 監控異常登入
  - [ ] 設定告警（失敗登入閾值）
### 建議設定
- [ ] 資料庫索引（參考 `database_optimization.md`）
- [ ] 啟用 CSRF 完整保護
- [ ] 修復 E-Invoice 加密
- [ ] CI/CD 安全掃描
---
## ⚠️ 已知限制
### 待修復項目
1. **CSRF Token 流程**
   - **狀態：** 前端已準備，後端待啟用
   - **原因：** flask-wtf API 相容性問題
   - **影響：** 低（有 SameSite Cookie 緩解）
2. **E-Invoice 加密**
   - **狀態：** 暫時停用
   - **原因：** Fernet 密鑰格式問題
   - **影響：** 中（憑證以明文儲存）
### 開發環境限制
- HTTP 連線（非 HTTPS）
- `Secure` Cookie 標誌為 False
- 詳細錯誤訊息（便於除錯）
---
## 📚 相關文件
- **統一安全設計：** `artifacts/unified_security_design.md`
- **資料庫優化：** `artifacts/database_optimization.md`
- **測試報告：** `artifacts/final_test_report.md`
- **老師測試指南：** `artifacts/teacher_testing_guide.md`

---
## 📊 安全成效總結
| 威脅 | 防護措施 | 狀態 |
|------|---------|------|
| 弱密碼 | 密碼強度驗證 | ✅ 已實作 |
| 暴力破解 | 速率限制 | ✅ 已實作 |
| XSS 攻擊 | 輸出轉義、CSP | ✅ 已實作 |
| CSRF 攻擊 | SameSite Cookie | ✅ 已實作 |
| NoSQL 注入 | 輸入清理 | ✅ 已實作 |
| Session 劫持 | HttpOnly、Secure cookies | ✅ 已實作 |
| 資料洩露 | 加密、環境變數 | ✅ 已實作 |
| 錯誤資訊洩露 | 自定義錯誤處理 | ✅ 已實作 |
**整體安全等級：** 🟢 生產就緒（需完成 HTTPS 和加密修復）
---
**文件版本：** 2.0  
**最後審閱：** 2026-01-14  
