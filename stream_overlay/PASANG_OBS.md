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

## 7. Link kekal (admin & penonton di luar Wi-Fi)

Guna **Tailscale Funnel** (percuma). Link tak berubah, jadi letak di **Linktree / link di bio** sekali sahaja.
**Hanya PC stream perlu Tailscale.** Admin dan penonton cuma buka link dalam browser phone, tak perlu install apa-apa.

### A. Sediakan di PC stream (sekali sahaja, ±5 minit)

1. Klik dua kali **`PASANG_LINK_KEKAL.bat`** (dalam folder `stream_overlay`). Amaran biru: **More info › Run anyway**.
2. **[1] Semak Tailscale**: kalau belum ada, ia pasang sendiri. Windows tanya "Allow changes?" › **Yes**.
   (Kalau tak dapat pasang sendiri, halaman `tailscale.com/download/windows` terbuka: muat turun, pasang, kemudian klik semula `PASANG_LINK_KEKAL.bat`.)
3. **[2] Log masuk**: browser terbuka › log masuk dengan **Google** atau **Microsoft** › tekan **Connect**.
4. **[3] Nama link**: taip nama pendek, contoh `synostore` › Enter. (Enter terus = guna nama PC.)
5. **[4] Hidupkan Funnel**: kali pertama keluar mesej *"Funnel is not enabled"* dengan satu link. Buka link tu › tekan **Enable** / **Approve**. Skrip sambung sendiri.
6. Keluar **SIAP! LINK KEKAL AWAK**:
   - Penonton: `https://synostore.xxxx.ts.net/viewer.html` (dah disalin, terus **Paste** dalam Linktree)
   - Admin: `https://synostore.xxxx.ts.net/control.html`

Funnel kekal hidup walaupun PC restart. Tak perlu ulang.

### B. Setiap kali live

1. Klik **`START_OVERLAY.bat`** seperti biasa. Tetingkap hitam tunjuk **LINK KEKAL** dan **PIN admin**.
2. Link hanya hidup bila **PC on** dan **START_OVERLAY.bat sedang jalan**.

### C. Admin (rumah lain / data phone)

1. Buka link admin `https://synostore.xxxx.ts.net/control.html` dalam Chrome / Safari.
2. Masukkan **PIN admin** (6 nombor, dari tetingkap hitam atau `data\admin_pin.txt`) › **Masuk**. Chip atas tukar jadi **ADMIN**.
3. Admin boleh: tambah VIP & baki, susun queue, Menang/Kalah, timer, on/off queue & banner.
4. Pilihan: Chrome › ⋮ › **Add to Home screen** (iPhone: Share › **Add to Home Screen**) supaya buka macam app.

PIN salah 10 kali = akses admin luar dikunci 10 minit. Tukar PIN: ubah `data\admin_pin.txt`, kemudian buka semula START_OVERLAY.bat.

### D. Penonton

- Letak `https://synostore.xxxx.ts.net/viewer.html` di **Linktree / bio**.
- Penonton taip nama atau ID ML untuk semak **baki game**, lihat **sedang main**, **queue**, W/L dan harga. Mereka **tak boleh ubah apa-apa**.

Guna servis lain (ngrok / Cloudflare)? Tulis link awak dalam `data\public_url.txt`.

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

**Cara A: dari gambar sendiri (paling tepat).**
1. Simpan gambar yang ada semua logo rank (latar putih, Warrior hingga Mythical Immortal) dalam PC.
2. App › Link › **Potong logo rank**, atau buka `http://127.0.0.1:8787/rank_tool.html`.
3. Pilih / seret gambar tu. Alat ni cari setiap logo, buang latar putih dan namakan Epic, Legend, Mythic, Mythical Honor, Mythical Glory, Mythical Immortal.
4. Semak nama bawah setiap logo (betulkan kalau salah) › **Simpan ke overlay** › Refresh overlay dalam OBS.

**Cara B: muat turun dari wiki.** Klik **`AMBIL_LOGO_RANK.bat`**. Calon lain dalam `assets\ranks\pilihan\`.

Boleh juga letak PNG sendiri: `epic.png`, `legend.png`, `mythic.png`, `honor.png`, `glory.png`, `immortal.png` dalam `assets\ranks\`.

---

## Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| Overlay kosong dalam OBS | Tetingkap hitam masih buka? Properties Browser › **Refresh cache of current page**. |
| App tulis **PERLU PIN** | Masukkan PIN dari tetingkap hitam (`data\admin_pin.txt`). |
| Link kekal tak keluar | Klik `PASANG_LINK_KEKAL.bat` sekali lagi dan ikut langkah [1]–[4]. |
| Order Sociabuzz tak masuk | Link kekal hidup? Webhook URL betul? Lihat `data\orders_log.txt`. Overlay atau app mesti terbuka. |
| Timer tak mula sendiri | Overlay › Properties › Page permissions › Read access to OBS status information. Atau tekan **Mula** dalam app. |
| PC lag | Tambah `?bgfx=0` pada URL overlay. |
| Ubah harga / teks | `assets\config.js` (Notepad) › save › Refresh overlay & app. |
| Backup data | Salin folder `data\` (baki VIP, queue, order, PIN). |
