@echo off
title HDeviceContentIndexer - Stopping...
color 0C
echo.
echo Stopping all services...
echo.

REM Kill Node.js processes
taskkill /F /IM node.exe >nul 2>&1

REM Kill Java/Elasticsearch processes
taskkill /F /IM java.exe >nul 2>&1

echo.
echo All services stopped!
echo.
timeout /t 2 /nobreak >nul
