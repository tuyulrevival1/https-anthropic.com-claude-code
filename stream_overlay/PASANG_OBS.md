# Cara pasang overlay + App Kawalan SYNO

Perlu: **Windows 10/11** dan **OBS Studio** (versi 30 ke atas). Tak perlu install Python.

---

## 1. Muat turun fail

1. Di PC, log masuk GitHub dan buka:
   `https://github.com/tuyulrevival1/https-anthropic.com-claude-code/archive/refs/heads/claude/streaming-layout-chou-kof-vie6x8.zip`
2. Klik kanan ZIP › **Extract All…**.
3. Pindahkan folder **`stream_overlay`** ke tempat tetap, contoh `C:\SYNO\stream_overlay`.

Kalau ada versi lama, salin folder `data\` dari folder lama ke folder baru supaya baki VIP dan PIN kekal.

## 2. Hidupkan (setiap kali nak live)

1. Klik dua kali **`START_OVERLAY.bat`**. Amaran biru Windows: **More info › Run anyway**.
2. Windows Firewall tanya: pilih **Private networks** › **Allow**.
3. Tetingkap hitam tunjuk link, **link kekal** (kalau dah set, lihat bahagian 7) dan **PIN admin** (6 nombor).
4. **App Kawalan SYNO** terbuka sendiri. Tertutup? Klik `BUKA_APP.bat`.
5. **Jangan tutup tetingkap hitam** selagi live. Minimize sahaja.

## 3. OBS portrait

OBS › **Settings** › **Video**: Base dan Output **1080x1920**, FPS 30 (atau 60) › Apply.

## 4. Scene LIVE

Tambah source ikut urutan (yang dulu duduk paling bawah):

| # | Source | Position (x, y) | Saiz (w × h) |
|---|---|---|---|
| 1 | Facecam (Video Capture Device) | 0, 0 | 1080 × 522 |
| 2 | Gameplay (capture / scrcpy / Window Capture) | 0, 550 | 1080 × 720 |
| 3 | Handcam (Video Capture Device) | 548, 1474 | 508 × 286 |
| 4 | **Overlay** (Browser, langkah 5) | 0, 0 | 1080 × 1920 |
| 5 | Widget lagu (letak **atas** overlay) | 36, 1806 | 476 × 88 |

Cara letak tepat: klik kanan source › Transform › **Edit Transform** (Ctrl+E):
Position = x, y · Bounding Box Type = **Scale to outer bounds** · Bounding Box Size = w × h · tanda **Crop to Bounding Box**.

Susunan skrin (atas ke bawah): facecam › bar LIVE › gameplay › banner › queue Mabar + lagu (kiri), handcam + DEVICE + W/L (kanan).

**Bar LIVE** di bawah facecam:
- **● LIVE 01:23:45** = berapa lama live sudah berjalan (timer stream)
- **🕒 9:41 PM** = jam sekarang (format 12 jam)
- **▶ 1,284** = penonton YouTube (kalau diset)

## 5. Overlay (Browser source)

1. **+** › **Browser** › nama `Overlay`.
2. Local file: **jangan tanda**. URL: `http://127.0.0.1:8787/overlay.html`
3. Width `1080`, Height `1920`, FPS `30`.
4. **Page permissions**: **Read access to OBS status information** (atau lebih tinggi). Timer live mula sendiri bila tekan **Start Streaming**.
5. OK › klik kanan Overlay › Order › **Move to Top** (widget lagu kekal di atasnya).

Banner minimal: `http://127.0.0.1:8787/overlay.html?banner=minimal` · tanpa handcam: `?hand=0` · PC lag: `?bgfx=0`.

## 6. App Kawalan SYNO

| Bahagian | Fungsi |
|---|---|
| **Live** | Timer stream: Mula / Jeda / Reset. On/off queue & banner. |
| **Win / Lose** | Tambah / tolak W/L manual, reset. |
| **Game habis** | Menang / Kalah: tambah W/L **dan** tolak 1 game dari baki semua yang sedang main. Baki habis keluar, queue naik sendiri. |
| **Sedang main / Queue** | Nama, **ID ML**, **tarikh order**. Naikkan, main sekarang, keluarkan. |
| **VIP & baki** | Isi **Nama**, **ID ML**, **Bilangan game** (taip sendiri, contoh 7), **Tarikh order** › **Tambah VIP**. Butang "Isi cepat" hanya isikan nombor pakej. Setiap VIP ada kotak nombor: **Tambah** (tambah game; nombor negatif untuk tolak) atau **Set baki** (tukar baki terus). ID ML boleh diedit terus. Cari ikut nama atau ID. |
| **Order masuk** | Semua order: SOCIABUZZ (automatik), MANUAL, TEST. |
| **YouTube** | Penonton live YouTube pada bar LIVE (perlu API key, bahagian 9). |
| **Link** | Link kekal penonton & admin, Sociabuzz Webhook URL, link pantas. |

Nak app dalam OBS juga: **Docks › Custom Browser Docks** › URL `http://127.0.0.1:8787/control.html`.

## 7. Link kekal (penonton & admin dari mana-mana)

Guna **Tailscale Funnel** (percuma). Link tak berubah, jadi boleh letak di **Linktree / link di bio** sekali sahaja.

**Sekali sahaja:**
1. Muat turun & pasang Tailscale: `https://tailscale.com/download/windows` › log masuk (Google / Microsoft).
2. (Pilihan) Namakan PC supaya link cantik: `https://login.tailscale.com/admin/machines` › titik tiga di PC awak › **Edit machine name** › contoh `synostore`.
3. Buka **PowerShell** dan taip:
   ```
   tailscale funnel 8787
   ```
   Kali pertama ia beri satu link untuk **enable HTTPS / Funnel**. Buka link tu › **Enable**. Bila keluar `Available on the internet: https://synostore.xxxx.ts.net`, tekan **Ctrl+C**.

**Selepas tu:** `START_OVERLAY.bat` hidupkan link ni sendiri dan tunjuk dalam tetingkap hitam & app:

| Untuk | Link |
|---|---|
| Penonton (Linktree / bio) | `https://synostore.xxxx.ts.net/viewer.html` |
| Admin di tempat lain (perlu PIN) | `https://synostore.xxxx.ts.net/control.html` |

- Link hanya hidup bila PC on dan `START_OVERLAY.bat` sedang jalan.
- Admin buka link admin › masukkan **PIN** (dalam tetingkap hitam / `data\admin_pin.txt`). Tanpa PIN, orang lain hanya boleh tengok. PIN salah 10 kali = dikunci 10 minit.
- Guna servis lain (ngrok / Cloudflare)? Tulis link awak dalam `data\public_url.txt`.

## 8. Order automatik dari Sociabuzz

Perlu link kekal (bahagian 7) dulu.

1. Sociabuzz › **TRIBE** › **Edit & Settings** › **Integrations** › **Webhook**
   (untuk produk: **Edit Shop** › **Integrations** › **Webhook**).
2. Hidupkan **Activate Webhook Integration**.
3. **Webhook URL**: salin dari App › Link › **Sociabuzz Webhook URL** (contoh `https://synostore.xxxx.ts.net/api/order-hook/abc123…`).
4. **Webhook Token**: tampal bahagian kunci (selepas `/order-hook/`). **Webhook HTTP Test Response**: `OK`.
5. Tekan **Test Notification** › App › **Order masuk** keluar **TEST** = berjaya.

Bila orang bayar:
- Nama pembeli + **ID ML dari mesej** masuk ke VIP, baki ditambah, terus masuk queue, dan overlay tunjuk "TERIMA KASIH … +N GAME".
- Minta pembeli tulis dalam mesej: **`ID 123456789 (1234)`** dan (pilihan) **`3 game`** atau **`immortal`**.
- Bilangan game: dari mesej ("3 game"), atau dikira dari bayaran: RM10 = 3 game, RM4 = 1 game, "immortal" = RM6/game. Ubah dalam `assets\config.js` › `sociabuzz`.
- Order masa PC off tak dihantar semula oleh Sociabuzz: semak dashboard Sociabuzz dan tambah manual.
- Semua order mentah disimpan dalam `data\orders_log.txt`.

## 9. YouTube live viewers

1. console.cloud.google.com › projek baru › **Enable "YouTube Data API v3"** › Credentials › **Create API key**.
2. App › YouTube: tampal API key dan link live YouTube (atau Channel ID) › **Simpan & mula**.

Bilangan penonton TikTok tak boleh diambil (TikTok tiada API untuk ni).

## 10. Logo rank asli (joki)

Klik dua kali **`AMBIL_LOGO_RANK.bat`**. Ia cari dan muat turun ikon asli Epic, Legend, Mythic, Mythical Honor, Mythical Glory dan Mythical Immortal dari wiki Mobile Legends ke `assets\ranks\`. Banner terus animasikan (3D, glow, kilauan).
- Calon lain disimpan dalam `assets\ranks\pilihan\`. Salah gambar? Salin calon lain dan namakan semula (contoh `epic_2.png` › `epic.png`).
- Boleh juga letak PNG sendiri dengan nama `epic.png`, `legend.png`, `mythic.png`, `honor.png`, `glory.png`, `immortal.png`.

---

## Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| Overlay kosong dalam OBS | Tetingkap hitam masih buka? Properties Browser › **Refresh cache of current page**. |
| App tulis **PERLU PIN** | Masukkan PIN dari tetingkap hitam (`data\admin_pin.txt`). |
| Link kekal tak keluar | Tailscale dah log masuk? Jalankan `tailscale funnel 8787` sekali dan enable Funnel. |
| Order Sociabuzz tak masuk | Link kekal hidup? Webhook URL betul? Lihat `data\orders_log.txt`. Overlay atau app mesti terbuka. |
| Timer tak mula sendiri | Overlay › Properties › Page permissions › Read access to OBS status information. Atau tekan **Mula** dalam app. |
| PC lag | Tambah `?bgfx=0` pada URL overlay. |
| Ubah harga / teks | `assets\config.js` (Notepad) › save › Refresh overlay & app. |
| Backup data | Salin folder `data\` (baki VIP, queue, order, PIN). |
