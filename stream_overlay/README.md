# SYNO Stream Overlay (TikTok / YouTube live portrait 1080×1920)

Overlay live MLBB tema merah, dengan app kawalan untuk timer, Win/Lose, queue Mabar VIP dan baki VIP.
Semua dalam HTML: tak perlu edit video, tak perlu install Python.

**Mula di sini: [MULA_DI_SINI.md](MULA_DI_SINI.md)** · Cara pasang penuh: [PASANG_OBS.md](PASANG_OBS.md)

## Fail utama

| Fail | Guna |
|---|---|
| `START_OVERLAY.bat` | Hidupkan server kecil (PowerShell Windows) + buka App Kawalan. Biar terbuka masa live. |
| `BUKA_APP.bat` | Buka semula tetingkap App Kawalan |
| `KEMASKINI.bat` | Kemas kini ke versi terbaru dari GitHub (data\ dan seed_doc.js tak disentuh) |
| `PASANG_STREAMDECK.bat` | Pasang plugin Stream Deck SYNO Mabar (tekan = +1, tahan = -1, tahan lama = reset) |
| `deck/` | Fail .bat untuk butang Stream Deck (Menang, Kalah, …) |
| `PASANG_LINK_KEKAL.bat` | Sekali sahaja: pasang Tailscale & hidupkan link kekal untuk admin / penonton di luar Wi-Fi |
| `rank_tool.html` | Potong logo rank dari satu gambar (latar putih) dan simpan ke overlay |
| `AMBIL_LOGO_RANK.bat` | Muat turun logo rank MLBB asli (Epic hingga Immortal) dari wiki |
| `overlay.html` | Overlay 1080×1920 untuk OBS |
| `control.html` | **App Kawalan SYNO**: timer, W/L, game habis, queue (ID ML + tarikh), baki VIP, order Sociabuzz, YouTube, link |
| `viewer.html` | Halaman penonton (lihat sahaja): Waiting list, Hutang mabar, MVP, Slot akaun, Peraturan |
| `assets/seed_doc.js` | Data lama dari dokumen MABAR VIP SYNO (tak ada dalam repo: letak sendiri, diimport sekali) |
| `banner.html` | Banner sahaja, 1080×192 |
| `obs-overlay.html` | Overlay untuk OBS "Local file" (tanpa server) |
| `assets/config.js` | **Ubah teks & harga di sini** |
| `exports/banner_*.mp4` | Banner siap render (loop 24 s) |
| `logos/` | Logo maskot (3 gaya), wordmark SYNO STORE, gambar profil (PNG telus) |
| `data/` | Dibuat automatik: `state.txt` (queue, baki VIP, W/L), `admin_pin.txt`, `webhook_key.txt`, `orders_log.txt` |

## Layout

Satu layout sahaja (atas ke bawah): facecam 1080×522 › bar LIVE (timer stream, lagu Spotify, jam, penonton YouTube) › **gameplay 1080×720** › banner › queue Mabar (kiri, bawahnya kosong), handcam + DEVICE + W/L (kanan).
Koordinat penuh dalam [PASANG_OBS.md](PASANG_OBS.md). `&hand=0` buang handcam · `&bgfx=0` matikan asap latar.

## Banner

- `power` (utama): panel logo dengan sinar berputar, maskot bertukar gaya dengan transisi lancar (main tablet / GG / wink), wordmark SYNO STORE 3D, teks metalik, lencana hook melantun, medallion krom dengan ikon diamond / rank 3D / VIP / album / link.
- `minimal` (gaya SOLOZ): babak jenama › babak servis, maskot besar, teks kabur-pudar.

Mesej, kicker, tag harga dan hook banner diubah dalam `config.js` › `banner.messages`.

## Queue Mabar & baki VIP

- Setiap VIP: nama, **ID ML**, **baki game**, tarikh order. Queue di overlay tunjuk nama + ID.
- Tambah dalam app: taip bilangan game sendiri (atau isi cepat RM4 / RM10 / Immortal RM6), tarikh order, ID.
- **Menang / Kalah**: tambah W/L, setiap yang sedang main tolak 1 game. Baki habis keluar, queue naik sendiri.
- **Order Sociabuzz automatik**: webhook › server › terus masuk queue (ID ML dari mesej pembeli).

## Link kekal & admin luar

Tailscale Funnel memberi link tetap `https://<pc>.<tailnet>.ts.net` untuk `viewer.html` (Linktree / bio) dan `control.html` (admin, perlu PIN). Klik `PASANG_LINK_KEKAL.bat` sekali. Langkah dalam [PASANG_OBS.md](PASANG_OBS.md) › bahagian 7.

## Ikon rank asli

Logo asli Epic, Legend, Mythic, Mythical Honor, Mythical Glory dan Mythical Immortal dah dipasang dalam `assets/ranks/` (tanpa nama rank). Banner putar 3D dengan glow & kilauan. Nak tukar: ganti PNG sama nama, guna `rank_tool.html`, atau `AMBIL_LOGO_RANK.bat`.

## Render semula video banner / logo

```bash
npm i playwright && npx playwright install chromium
node tools/render_banner.js          # power + minimal
node tools/render_banner.js power    # satu gaya
node tools/export_logos.js           # logos/*.png
```

## Nota

- Bilangan penonton TikTok tak boleh diambil secara automatik (tiada API); YouTube boleh (API key percuma).
- TikTok potong sikit tepi kiri/kanan pada sesetengah phone dan letak chat di kiri bawah; panel dijauhkan dari tepi.
