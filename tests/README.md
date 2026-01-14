# 安全測試使用說明

## 快速開始

### Windows:
```cmd
cd tests
pip install -r requirements.txt
python security_test.py
```

### Linux/Mac:
```bash
cd tests
pip3 install -r requirements.txt
python3 security_test.py
```

## 測試項目

腳本會自動測試以下安全功能：

1. **密碼強度驗證** - 檢查是否拒絕弱密碼
2. **Email 格式驗證** - 檢查是否拒絕無效 email
3. **速率限制** - 測試暴力破解防護（5次/分鐘）
4. **安全標頭** - 驗證 X-Frame-Options, X-Content-Type-Options
5. **Session 安全** - 檢查 HttpOnly, SameSite cookie
6. **錯誤處理** - 確認不洩漏堆疊追蹤
7. **NoSQL 注入防護** - 測試注入攻擊被阻擋
8. **XSS 防護** - 前端防護說明

## 輸出

- 彩色終端輸出顯示每個測試結果
- 生成 `security_test_report.json` 詳細報告
- 顯示通過率統計

## 注意事項

- 請確保應用程式正在運行 (`docker compose up -d`)
- 測試會需要約 2-3 分鐘完成（包含速率限制等待時間）
- 某些測試可能會在資料庫中建立測試帳號
