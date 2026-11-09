@echo off
title MeetOrganizer Pro - by Mr.Busy
cd /d "%~dp0"
set "ELECTRON_RUN_AS_NODE="
if not exist "node_modules\electron\dist\electron.exe" (
  echo First launch: installing Electron, please wait...
  call npm install
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo.
  echo Electron install failed. Run "npm install" manually and try again.
  pause
  exit /b 1
)
".\node_modules\electron\dist\electron.exe" .
