@echo off
echo ========================================
echo Manta Project - Quick Start
echo ========================================
echo.

echo Step 1: Installing Server Dependencies...
cd manta\server
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install server dependencies
    pause
    exit /b 1
)
echo.

echo Step 2: Installing Extension Dependencies...
cd ..\extension
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install extension dependencies
    pause
    exit /b 1
)
echo.

echo Step 3: Installing AI Service Dependencies...
cd ..\ai
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install AI dependencies
    pause
    exit /b 1
)
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To run the project, you need 3 terminals:
echo.
echo Terminal 1 - Backend Server:
echo   cd manta/server
echo   npm run dev
echo.
echo Terminal 2 - AI Service:
echo   cd manta/ai
echo   uvicorn main:app --reload --port 8000
echo.
echo Terminal 3 - VS Code Extension:
echo   1. Open manta/extension folder in VS Code
echo   2. Press F5 to launch Extension Development Host
echo.
pause
