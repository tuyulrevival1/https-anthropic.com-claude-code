# Mula di sini: senarai semak SYNO

Ikut urutan. Langkah penuh setiap satu ada dalam [PASANG_OBS.md](PASANG_OBS.md).

## A. Sekali sahaja (PC stream)

1. **Muat turun** ZIP branch ni › Extract › letak folder `stream_overlay` di tempat tetap (contoh `C:\SYNO\stream_overlay`). Ada versi lama? Salin folder `data\` lama ke sini.
2. **Data lama**: letak `seed_doc.js` (dihantar berasingan) dalam `stream_overlay\assets\`.
3. Klik **`START_OVERLAY.bat`** › App Kawalan terbuka. Hutang Mabar (32 orang) dan MVP (82) masuk sendiri. Semak baki dalam App.
4. **OBS**: Settings › Video 1080x1920. Susun source ikut jadual dalam PASANG_OBS.md bahagian 4. Browser source `http://127.0.0.1:8787/overlay.html` dengan Page permissions "Read access to OBS status information".
5. **Link kekal**: klik **`PASANG_LINK_KEKAL.bat`** › log masuk Tailscale › nama `synostore` › Enable Funnel. Simpan dua link yang keluar.
6. **Linktree**: letak link penonton `https://synostore.xxxx.ts.net/viewer.html`.
7. **Admin**: hantar link `…/control.html` dan PIN (dalam tetingkap hitam / `data\admin_pin.txt`) kepada admin. Admin tekan Add to Home screen.
8. **Sociabuzz**: App › Link › salin Sociabuzz Webhook URL › tampal di Sociabuzz › Save › Test Notification. Semak App › Order masuk › Status webhook.
9. **YouTube viewers** (pilihan): App › YouTube › API key + link live.

## B. Setiap kali live

1. Klik `START_OVERLAY.bat` (jangan tutup tetingkap hitam).
2. Buka Spotify kalau nak lagu keluar di bar LIVE.
3. OBS › Start Streaming (timer mula sendiri).
4. Lepas setiap game: App › **Menang / Kalah** (baki tolak sendiri, rotation sendiri).
5. Tak muncul bila dipanggil: **Tak muncul** pada nama tu.
6. MVP: App › Senarai MVP › **+**.

## C. Kalau ada masalah

Lihat jadual "Masalah biasa" di hujung PASANG_OBS.md. Untuk Sociabuzz, ikut "Test langkah demi langkah" (bahagian 8).
