@echo off
title Kemaskini SYNO
rem Letak fail ni dalam folder stream_overlay (sama tempat dengan START_OVERLAY.bat), kemudian klik dua kali.
cd /d "%~dp0"
if not exist "%~dp0START_OVERLAY.bat" (
  echo.
  echo   Fail ni mesti diletak dalam folder stream_overlay, sama tempat dengan START_OVERLAY.bat.
  echo.
  pause
  exit /b 1
)
if not exist "%~dp0tools" mkdir "%~dp0tools"
echo.
echo   Ambil skrip kemaskini terbaru...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { [Net.ServicePointManager]::SecurityProtocol = 'Tls12' } catch {}; Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/tuyulrevival1/https-anthropic.com-claude-code/claude/streaming-layout-chou-kof-vie6x8/stream_overlay/tools/kemaskini.ps1' -OutFile '%~dp0tools\kemaskini.ps1'"
if errorlevel 1 (
  echo   Gagal muat turun. Semak internet, kemudian cuba lagi.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\kemaskini.ps1"
pause
