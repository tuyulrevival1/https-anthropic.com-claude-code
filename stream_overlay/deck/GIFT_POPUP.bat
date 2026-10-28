@echo off
rem Stream Deck: System > Open > pilih fail ni. Popup "hantar gift" keluar sekarang di overlay.
curl -s -m 3 http://127.0.0.1:8787/api/do/gift-hint >nul 2>&1
