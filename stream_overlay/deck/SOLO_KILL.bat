@echo off
rem Stream Deck: System > Open > pilih fail ni. Efek SOLO KILL di overlay.
curl -s -m 3 http://127.0.0.1:8787/api/do/kill-solo >nul 2>&1
