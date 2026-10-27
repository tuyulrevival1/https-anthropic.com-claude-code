@echo off
title Ambil logo rank MLBB
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\ambil_rank.ps1"
pause
