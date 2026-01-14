@echo off
echo ====================================
echo HMEICR 安全測試 - 一鍵執行
echo ====================================
echo.

echo [1/3] 檢查 Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo 錯誤: 找不到 Python，請先安裝 Python 3.7+
    pause
    exit /b 1
)

echo [2/3] 安裝依賴...
cd /d "%~dp0"
pip install -q -r requirements.txt

echo [3/3] 執行測試...
echo.
python security_test.py

echo.
echo ====================================
echo 測試完成！
echo 詳細報告: security_test_report.json
echo ====================================
pause
