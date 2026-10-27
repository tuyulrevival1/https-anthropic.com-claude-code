@echo off
title SYNO Link Awam
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\public_link.ps1"
pause
