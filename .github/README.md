# CI/CD配置��明

本目錄包含 GitHub Actions workflow 配置。

## workflows/security-ci.yml

自動化安全掃描與測試流程，在每次 push 和 pull request 時觸發。

### 功能：

1. **安全掃描** - Bandit 靜態分析
2. **依賴檢查** - Safety 檢查已知漏洞
3. **程式碼檢查** - Flake8 語法檢查
4. **前端安全** - npm audit
5. **Docker 測試** - 建置和健康檢查

### 使用：

Push 到任何分支即會自動執行。查看 GitHub Actions 標籤頁查看結果。
