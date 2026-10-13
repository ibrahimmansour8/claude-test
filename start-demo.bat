@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed. Install version 22 or newer from https://nodejs.org
  echo then double-click this file again.
  start https://nodejs.org
  pause
  exit /b 1
)
node --disable-warning=ExperimentalWarning scripts\demo.js
pause
