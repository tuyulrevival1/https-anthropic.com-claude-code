# Cara pasang overlay + App Kawalan SYNO dalam OBS

Tak perlu install Python. Cuma perlu **OBS Studio** (versi 30 ke atas) dan Windows 10/11.

---

## 1. Muat turun fail

1. Di PC, log masuk GitHub dan buka:
   `https://github.com/tuyulrevival1/https-anthropic.com-claude-code/archive/refs/heads/claude/streaming-layout-chou-kof-vie6x8.zip`
2. Klik kanan ZIP › **Extract All…**.
3. Pindahkan folder **`stream_overlay`** ke tempat tetap, contoh `C:\SYNO\stream_overlay`.

## 2. Hidupkan (setiap kali nak live)

1. Klik dua kali **`START_OVERLAY.bat`**. Kalau keluar amaran biru Windows: **More info › Run anyway**.
2. Kalau Windows Firewall tanya, pilih **Private networks** › **Allow** (supaya phone/admin boleh kawal).
3. Tetingkap hitam keluar dan tunjuk:
   - link overlay, link app, link phone/admin
   - **PIN admin** (4 nombor). Simpan PIN ni; admin di peranti lain perlukannya.
4. **App Kawalan SYNO** terbuka sendiri sebagai tetingkap app. Tertutup? Klik dua kali `BUKA_APP.bat`.
5. **Jangan tutup tetingkap hitam** selagi live. Minimize sahaja.

## 3. OBS portrait

OBS › **Settings** › **Video**: Base dan Output **1080x1920**, FPS 30 (atau 60) › Apply.

## 4. Scene "LIVE"

Tambah source ikut urutan (yang dulu duduk paling bawah):

| # | Source | Position (x, y) | Saiz (w × h) |
|---|---|---|---|
| 1 | Facecam (Video Capture Device) | 0, 0 | 1080 × 522 |
| 2 | Gameplay (capture card / scrcpy / Window Capture) | 0, 550 | 1080 × 720 |
| 3 | Handcam (Video Capture Device) | 548, 1474 | 508 × 286 |
| 4 | **Overlay** (Browser, langkah 5) | 0, 0 | 1080 × 1920 |
| 5 | Widget lagu (letak **atas** overlay) | 36, 1806 | 476 × 88 |

Cara letak tepat: klik kanan source › Transform › **Edit Transform** (Ctrl+E):
Position = x, y · Bounding Box Type = **Scale to outer bounds** · Bounding Box Size = w × h · tanda **Crop to Bounding Box**.

Susunan skrin (atas ke bawah): facecam › bar LIVE (timer + jam + penonton YouTube) › gameplay › banner › queue Mabar (kiri) + handcam & W/L (kanan) › bingkai lagu (kiri bawah).

## 5. Overlay (Browser source)

1. **+** › **Browser** › nama `Overlay`.
2. Local file: **jangan tanda**. URL: `http://127.0.0.1:8787/overlay.html`
3. Width `1080`, Height `1920`, FPS `30`.
4. **Page permissions**: pilih **Read access to OBS status information** (atau lebih tinggi). Ini buat timer live mula sendiri bila tekan **Start Streaming**.
5. OK › klik kanan Overlay › Order › **Move to Top** (widget lagu kekal di atasnya).

## 6. App Kawalan SYNO

Semua dikawal dari satu app:

| Bahagian | Fungsi |
|---|---|
| **Live** | Timer stream: Mula / Jeda / Reset. On/off queue & banner. |
| **Win / Lose** | Tambah / tolak W/L manual, reset. |
| **Game habis** | Menang / Kalah: tambah W/L **dan** tolak 1 game dari baki semua yang sedang main. Baki habis keluar, queue naik sendiri. |
| **Sedang main / Queue** | Susun queue, naikkan, main sekarang, keluarkan. |
| **VIP & baki** | Taip nama › tekan pakej (+1 game RM4, +3 game RM10, +1 Immortal RM6) atau nombor sendiri. Baki boleh +/−. Cari nama. |
| **YouTube** | Tunjuk bilangan penonton live YouTube pada bar LIVE (perlu API key, lihat bawah). |
| **Link** | Link overlay, penonton, phone/admin, dan link pantas. |

Nak app dalam OBS juga: **Docks › Custom Browser Docks** › URL `http://127.0.0.1:8787/control.html`.

### Admin / phone (Wi-Fi sama)
- Buka link **Phone / admin** dari tetingkap hitam, contoh `http://192.168.1.20:8787/control.html`.
- Masukkan **PIN admin**. Tanpa PIN, peranti lain hanya boleh tengok.

### Link pantas (Stream Deck / bookmark)
`http://127.0.0.1:8787/control.html?do=win` (juga `lose`, `end-win`, `end-lose`, `timer-start`, `timer-pause`, `queue-off` …). Senarai penuh dalam app › Link.

## 7. Halaman penonton (baki & queue)

- Penonton buka **`viewer.html`**: semak baki game sendiri (taip nama), lihat sedang main & queue, W/L, harga. **Tak boleh ubah apa-apa.**
- Wi-Fi sama: `http://<IP PC>:8787/viewer.html`.
- **Untuk penonton di internet**: klik dua kali **`LINK_PENONTON.bat`** › tekan `Y` untuk muat turun Cloudflare (sekali sahaja) › salin link `https://xxxx.trycloudflare.com`, tambah `/viewer.html`, pin dalam bio / komen.
  Admin luar boleh guna `https://xxxx.trycloudflare.com/control.html` + PIN. Link bertukar setiap kali dibuka.

## 8. YouTube live viewers

1. Buat API key percuma: console.cloud.google.com › projek baru › **Enable "YouTube Data API v3"** › Credentials › **Create API key**.
2. Dalam app › YouTube: tampal API key dan **link live** YouTube (atau Channel ID) › **Simpan & mula**.
3. Biar app terbuka masa live; bilangan penonton dikemas kini setiap 30 saat.

Bilangan penonton TikTok tak boleh diambil (TikTok tiada API untuk ni).

## 9. Tukar banner

Hanya ada satu layout. Gameplay 1080×720 (skrin tablet 3:2): kalau capture awak 16:9, pilih **Scale to outer bounds** + **Crop to Bounding Box** supaya penuh tanpa jalur hitam.

| Pilihan | URL |
|---|---|
| Biasa | `http://127.0.0.1:8787/overlay.html` |
| Tanpa handcam | `…/overlay.html?hand=0` |
| Banner lain | `…/overlay.html?banner=slash` (atau `pro-crimson`, `scene-mascot&accent=crimson`) |

## 10. Ikon rank asli (joki)

Letak PNG asli latar telus dalam `assets\ranks\`: `epic.png`, `legend.png`, `mythic.png`, `honor.png`, `glory.png`, `immortal.png`. Banner animasikan sendiri (3D, glow, kilauan).

---

## Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| Overlay kosong dalam OBS | Tetingkap hitam masih buka? Properties Browser › **Refresh cache of current page**. |
| Phone tak boleh buka link | Phone & PC mesti Wi-Fi sama. Benarkan Firewall (Private). Guna IP yang ditunjuk tetingkap hitam. |
| App tulis **PERLU PIN** | Masukkan PIN dari tetingkap hitam (`data\admin_pin.txt`). |
| Timer tak mula sendiri | Overlay › Properties › Page permissions › Read access to OBS status information. Atau tekan **Mula** dalam app. |
| PC lag | Tambah `&bgfx=0` pada URL overlay. |
| Ubah harga / teks | `assets\config.js` (Notepad) › save › Refresh overlay & app. |
| Data VIP | Disimpan dalam `data\state.txt`. Salin fail ni untuk backup. |

## Cara B: tanpa server

Browser source › tanda **Local file** › `obs-overlay.html`. Tukar W/L: klik kanan source › **Interact**, tekan `W` / `L` (Shift = tolak). Queue, baki VIP, app & halaman penonton hanya jalan dengan START_OVERLAY.bat.
