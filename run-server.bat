@echo off
title Pharmacy Backend Server & Database
cd /d "%~dp0"
echo ===================================================
echo   Starting Pharmacy Management System Server...
echo ===================================================
call npm run dev:api
pause
