@echo off
rem Stream Deck: System > Open > pilih fail ni. On / off handcam (portrait & landscape).
curl -s -m 3 http://127.0.0.1:8787/api/do/handcam-toggle >nul 2>&1
