@echo off
rem Stream Deck: System > Open > pilih fail ni. Overlay / App mesti terbuka.
curl -s -m 3 http://127.0.0.1:8787/api/do/timer-pause >nul 2>&1
