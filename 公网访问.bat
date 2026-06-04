@echo off
chcp 65001 >nul
echo =====================================
echo   南水北调工程 - 公网访问
echo =====================================
echo.
echo [1/2] 正在启动本地服务器...
start "南水北调-服务器" /min cmd /c "npx --yes serve . -l 8080 -s"
echo [2/2] 正在创建公网隧道（首次需要下载，稍等片刻）...
echo.
npx --yes localtunnel --port 8080
echo.
pause
