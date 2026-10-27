@echo off
title Pasang plugin Stream Deck SYNO
cd /d "%~dp0"
set "SRC=%~dp0streamdeck\com.syno.mabar.sdPlugin"
set "PLUG=%APPDATA%\Elgato\StreamDeck\Plugins"
set "DST=%PLUG%\com.syno.mabar.sdPlugin"
if not exist "%SRC%\manifest.json" (
  echo   Folder plugin tak jumpa. Jalankan KEMASKINI.bat dulu.
  pause
  exit /b 1
)
echo.
echo   [1] Tutup Stream Deck...
taskkill /IM StreamDeck.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
echo   [2] Salin plugin SYNO Mabar...
if not exist "%PLUG%" mkdir "%PLUG%"
if exist "%DST%" rmdir /S /Q "%DST%"
xcopy "%SRC%" "%DST%\" /E /I /Y /Q >nul
echo   [3] Buka semula Stream Deck...
if exist "%ProgramFiles%\Elgato\StreamDeck\StreamDeck.exe" (
  start "" "%ProgramFiles%\Elgato\StreamDeck\StreamDeck.exe"
) else (
  echo   Buka app Stream Deck sendiri.
)
echo.
echo   SIAP! Dalam Stream Deck, cari kategori "SYNO Mabar" di sebelah kanan.
echo   Seret "Win (tekan / tahan)" dan "Lose (tekan / tahan)" ke butang.
echo.
pause
