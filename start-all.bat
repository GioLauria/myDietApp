@echo off
setlocal

REM Resolve script directory so paths work no matter the current folder
set "ROOT=%~dp0"

echo Stopping any existing Node backend and Angular client...
REM Force-kill any existing Node and npm processes (previous server/client runs)
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM npm.exe /T >nul 2>&1

echo Starting Backend Server...
start "Backend Server" cmd /k cd /d "%ROOT%server" ^&^& node server.js

echo Starting Angular Client...
start "Angular Client" cmd /k cd /d "%ROOT%" ^&^& npm start

echo App is starting...
