@echo off
cd /d "%~dp0"
echo Overlay jalan di http://localhost:8787  (jangan tutup tetingkap ni masa live)
start "" http://localhost:8787/index.html
python -m http.server 8787
if errorlevel 1 py -m http.server 8787
pause
