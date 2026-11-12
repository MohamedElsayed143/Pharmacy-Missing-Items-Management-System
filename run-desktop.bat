@echo off
title Pharmacy Desktop Workstation Client
cd /d "%~dp0"
echo ===================================================
echo   Starting Pharmacy Desktop Client Workstation...
echo ===================================================
if exist "%~dp0apps\desktop\release\win-unpacked\Pharmacy Missing Items.exe" (
    start "" "%~dp0apps\desktop\release\win-unpacked\Pharmacy Missing Items.exe"
) else (
    call npm run dev:desktop
)
