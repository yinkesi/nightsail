@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "" "http://127.0.0.1:8123"
echo ============================================
echo   夜航 NightSail  ^|  http://127.0.0.1:8123
echo   关闭本窗口即停止服务（页面数据存本机）
echo ============================================
python -m http.server 8123
pause
