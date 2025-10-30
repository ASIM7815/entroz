@echo off
echo ========================================
echo Starting Meez Chat App
echo ========================================
echo.
echo Server: http://localhost:3000
echo.
echo Starting server...
cd server
start cmd /k "node server.js"
timeout /t 3 >nul
echo.
echo Opening browser...
start http://localhost:3000
echo.
echo Server is running in another window.
echo Close that window to stop the server.
pause
