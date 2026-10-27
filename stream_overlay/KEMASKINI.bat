@echo off
title Kemaskini SYNO
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\kemaskini.ps1"
pause
