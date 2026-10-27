@echo off
title SYNO - Link Kekal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\link_kekal.ps1"
