@echo off
title HDeviceContentIndexer - Starting...
color 0B
echo.
echo ========================================
echo    HDeviceContentIndexer v1.0
echo ========================================
echo.
echo Starting Elasticsearch...
echo Please wait, this may take 15-20 seconds...
echo.

cd /d "%~dp0"

REM Start Elasticsearch in background
start /B "" "elasticsearch-9.1.5\bin\elasticsearch.bat"

REM Wait for Elasticsearch to start
timeout /t 15 /nobreak >nul

echo Elasticsearch started!
echo.
echo Starting application server...
echo.

REM Start Node.js server
start /B "" node index.js

REM Wait a bit for server to start
timeout /t 3 /nobreak >nul

echo Server started!
echo.
echo Opening application in browser...
echo.
echo Application URL: http://localhost:3000
echo.
echo ========================================
echo   Application is running!
echo ========================================
echo.
echo Press Ctrl+C to stop the application
echo or close this window to exit
echo.

REM Open in default browser
start http://localhost:3000

REM Keep window open
pause >nul
