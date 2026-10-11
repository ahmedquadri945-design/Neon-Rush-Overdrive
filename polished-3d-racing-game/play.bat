@echo off
title Neon Rush: Overdrive - Launcher
cd /d "%~dp0"

echo ========================================================
echo        NEON RUSH: OVERDRIVE - 3D RACING GAME
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Node.js is not found on this computer.
    echo Launching the Standalone Browser Version (play.html)...
    echo.
    start "" "play.html"
    exit /b 0
)

if not exist "node_modules" (
    echo [1/2] Installing dependencies for first-time setup...
    call npm install
    if %errorlevel% neq 0 (
        echo [WARNING] npm install failed. Launching standalone browser version instead...
        start "" "play.html"
        exit /b 0
    )
) else (
    echo [1/2] Dependencies ready!
)

echo.
echo [2/2] Launching game dev server...
echo Browser opening at http://localhost:5173
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"
call npm run dev
