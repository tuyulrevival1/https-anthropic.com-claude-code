@echo off
rem Buka semula App Kawalan SYNO (START_OVERLAY.bat mesti dah jalan)
start "" msedge --app=http://127.0.0.1:8787/control.html
if errorlevel 1 start "" http://127.0.0.1:8787/control.html
