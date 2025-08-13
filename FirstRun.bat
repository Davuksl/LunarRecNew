@echo off
echo Installing...
npm install
npm install chalk@^4.1.2

if %errorlevel% neq 0 (
    echo Error, try again
    pause
    exit /b %errorlevel%
)

echo Starting server...
node index

pause
