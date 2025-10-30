@echo off
echo ========================================
echo Meez Chat App - Setup
echo ========================================
echo.

echo Step 1: Installing server dependencies...
cd server
call npm install
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure MongoDB is installed and running
echo 2. Run: start-server.bat
echo 3. Open index.html in your browser
echo.
pause
