@echo off
rem Stream Deck: System > Open > pilih fail ni. Mabar VIP CLOSED di overlay.
curl -s -m 3 http://127.0.0.1:8787/api/do/mabar-close >nul 2>&1
