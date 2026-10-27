# SYNO Stream Overlay (TikTok / YouTube live portrait 1080×1920)

Overlay live MLBB tema merah, dengan app kawalan untuk timer, Win/Lose, queue Mabar VIP dan baki VIP.
Semua dalam HTML: tak perlu edit video, tak perlu install Python.

**Cara pasang langkah demi langkah: [PASANG_OBS.md](PASANG_OBS.md)**

## Fail utama

| Fail | Guna |
|---|---|
| `START_OVERLAY.bat` | Hidupkan server kecil (PowerShell Windows) + buka App Kawalan. Biar terbuka masa live. |
| `BUKA_APP.bat` | Buka semula tetingkap App Kawalan |
| `LINK_PENONTON.bat` | Link awam (Cloudflare) untuk penonton & admin luar |
| `overlay.html` | Overlay 1080×1920 untuk OBS (`?layout=4&banner=power`) |
| `control.html` | **App Kawalan SYNO**: timer, W/L, game habis, queue, baki VIP, YouTube, link |
| `viewer.html` | Halaman penonton: semak baki & queue (lihat sahaja) |
| `banner.html` | Banner sahaja, 1080×192 |
| `obs-*.html` | Overlay siap set untuk OBS "Local file" (tanpa server) |
| `assets/config.js` | **Ubah teks & harga di sini** |
| `exports/banner_*.mp4` | Banner siap render (loop 24 s) |
| `logos/` | Logo maskot (3 gaya), wordmark, gambar profil (PNG telus) |
| `data/` | Dibuat automatik: `state.txt` (queue, baki VIP, W/L) & `admin_pin.txt` |

## Layout

| Layout | Untuk |
|---|---|
| **4 Arena** (utama) | Facecam › bar LIVE (timer stream, jam, penonton YouTube) › gameplay › banner › queue Mabar + bingkai lagu (kiri), handcam + DEVICE + W/L (kanan) |
| 1 Klasik · 2 Mabar · 3 Solo Push | Susunan alternatif |

`&hand=0` buang handcam · `&bgfx=0` matikan asap latar (PC lag).

## Banner

- `power` (utama): maskot 3D bertukar gaya (main / GG / wink), wordmark SYNO STORE 3D, teks metalik, lencana hook melantun, medallion krom dengan ikon diamond / rank 3D / VIP / album / link.
- `slash`, `pro-crimson`, `scene-mascot` (gaya minimal SOLOZ): pilihan lain.

Mesej, kicker, tag harga dan hook banner diubah dalam `config.js` › `banner.messages`.

## Queue Mabar & baki VIP

- Baki dikira dalam **game**. Top up dalam app: +1 game RM4, +3 game RM10, +1 Immortal RM6, atau nombor sendiri.
- **Menang / Kalah** dalam app: tambah W/L, setiap yang sedang main tolak 1 game. Baki habis keluar, queue naik sendiri.
- Admin di phone / PC lain: link Wi-Fi + PIN. Penonton: `viewer.html` (tak boleh ubah).

## Ikon rank asli

Letak PNG asli dalam `assets/ranks/` (`epic`, `legend`, `mythic`, `honor`, `glory`, `immortal` .png). Banner putar 3D dengan glow & kilauan. Tanpa fail, lencana ganti dipakai.

## Render semula video banner / logo

```bash
npm i playwright && npx playwright install chromium
node tools/render_banner.js          # power, slash, pro-crimson
node tools/render_banner.js power    # satu gaya
node tools/export_logos.js           # logos/*.png
```

## Nota

- Bilangan penonton TikTok tak boleh diambil secara automatik (tiada API); YouTube boleh (API key percuma).
- TikTok potong sikit tepi kiri/kanan pada sesetengah phone dan letak chat di kiri bawah; panel dijauhkan dari tepi.
