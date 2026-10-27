# Cara pasang overlay + App Kawalan SYNO

Perlu: **Windows 10/11** dan **OBS Studio** (versi 30 ke atas). Tak perlu install Python.

---

## 1. Muat turun fail

1. Di PC, log masuk GitHub dan buka:
   `https://github.com/tuyulrevival1/https-anthropic.com-claude-code/archive/refs/heads/claude/streaming-layout-chou-kof-vie6x8.zip`
2. Klik kanan ZIP › **Extract All…**.
3. Pindahkan folder **`stream_overlay`** ke tempat tetap, contoh `C:\SYNO\stream_overlay`.

Kalau ada versi lama, salin folder `data\` dari folder lama ke folder baru supaya baki VIP dan PIN kekal.

**Kemas kini lepas ni (tak perlu muat turun ZIP lagi):** tutup tetingkap hitam overlay › klik dua kali **`KEMASKINI.bat`** › tunggu SIAP › buka semula `START_OVERLAY.bat` › OBS: Refresh cache. Folder `data\` (baki, PIN, link) dan `seed_doc.js` kekal. App tunjuk chip **VERSI BARU** bila ada kemas kini.

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

Cara letak tepat: klik kanan source › Transform › **Edit Transform** (Ctrl+E):
Position = x, y · Bounding Box Type = **Scale to outer bounds** · Bounding Box Size = w × h · tanda **Crop to Bounding Box**.

Susunan skrin (atas ke bawah): facecam › bar LIVE › gameplay › banner › queue Mabar (kiri, bawahnya kosong), handcam + DEVICE + W/L (kanan).

**Bar LIVE** di bawah facecam:
- **● LIVE 01:23:45** = berapa lama live sudah berjalan (timer stream). Sebelum live tunjuk 00:00:00 (pudar).
- **♪ Artis - Lagu** = lagu yang sedang dimainkan Spotify di PC (IndoFinity pun guna Spotify). Bergerak dari kanan ke kiri tanpa henti.
- **🕒 9:41 PM** = jam sekarang (format 12 jam)
- **▶ 1,284** = penonton YouTube (kalau diset)

## 5. Overlay (Browser source)

1. **+** › **Browser** › nama `Overlay`.
2. Local file: **jangan tanda**. URL: `http://127.0.0.1:8787/overlay.html`
3. Width `1080`, Height `1920`, FPS `30`.
4. **Page permissions**: **Read access to OBS status information** (atau lebih tinggi). Timer live mula sendiri bila tekan **Start Streaming**.
5. OK › klik kanan Overlay › Order › **Move to Top**.

Banner minimal: `http://127.0.0.1:8787/overlay.html?banner=minimal` · tanpa handcam: `?hand=0` · PC lag: `?bgfx=0`.

### Landscape 1920x1080 (YouTube / TikTok landscape)

Data sama dengan portrait (queue, W/L, timer, lagu, OPEN/CLOSED). **KEMASKINI.bat** kemaskini dua-dua.

1. OBS (scene / profile lain) › Settings › Video › Base & Output `1920x1080`.
2. Browser source › Width `1920`, Height `1080`, URL: **`http://127.0.0.1:8787/landscape.html`** (overlay kiri + banner minimal). Layout lain kalau perlu:

| Layout | URL | Gameplay (X, Y, W, H) | Kamera (X, Y, W, H) |
|---|---|---|---|
| Overlay kiri (utama) | `http://127.0.0.1:8787/landscape.html` | 384, 0, 1536, 1024 | Facecam 12, 12, 360, 252 · Handcam 12, 809, 360, 203 |
| Overlay kanan | `http://127.0.0.1:8787/overlay.html?layout=kanan` | 0, 0, 1536, 1024 | Facecam 1548, 12, 360, 252 · Handcam 1548, 809, 360, 203 |
| Hitam kiri & kanan | `http://127.0.0.1:8787/overlay.html?layout=tengah` | 288, 14, 1344, 896 | 1644, 14, 264, 198 |

3. Letak source gameplay & kamera di **bawah** overlay, ikut kotak dalam jadual (klik kanan › Transform › Edit Transform).
- Kolum kiri: facecam (atas), Mabar VIP, WIN / LOSE, banner, handcam (bawah). Kedudukan kamera tetap. Matikan apa-apa (App › Live › Tunjuk di overlay › Landscape, atau Stream Deck) dan kad Mabar VIP membesar isi ruang tu, tiada ruang kosong.
- Bar LIVE landscape: LIVE, timer, jam, penonton YouTube. Tiada lagu (live YouTube tak pasang lagu).
4. Landscape guna **banner minimal** (portrait kekal banner power). Tukar: `?banner=power`. PC lag: `?bgfx=0`. Kamera / WIN-LOSE / dll boleh on-off dari App › Live › Tunjuk di overlay › Landscape.

## 6. App Kawalan SYNO

| Bahagian | Fungsi |
|---|---|
| **Live** | Timer stream: Mula / Jeda / Reset. On/off queue, banner & lagu. Lagu ikut Spotify sendiri, atau taip tajuk › **Set** (**Auto** untuk ikut Spotify semula). |
| **Win / Lose** | Tambah / tolak W/L manual, reset. |
| **Game habis** | Menang / Kalah: tambah W/L **dan** tolak 1 game dari baki semua yang sedang main. Baki habis keluar, queue naik sendiri. |
| **Sedang main / Queue** | Nama, **ID ML**, **tarikh order**, ★ = VVIP. **★ MVP** pada pemain yang sedang main = +1 terus dalam Senarai MVP (VVIP dapat free 1 game). Naik ↑, ke bawah ⤓, main sekarang ▶, **Tak muncul** (keluar queue, baki kekal; hilang kali ke-2 tolak 1 game, kali ke-3 tolak 2 game), keluarkan ✕. **Role**: tekan **EXP / JUNGLE / MID / GOLD / ROAM** (tekan lagi = buang); keluar di overlay dan halaman penonton. **Tarik ⠿**: nama dari Queue ke atas pemain Sedang main = ganti (pemain lama keluar, baki kekal dalam Hutang Mabar); tarik dalam Queue = susun. |
| **Hutang Mabar** | Semua orang + baki. **Tarikh order ikut masa sekarang** bila tambah (kecuali diubah sendiri); Tambah game pada orang sedia ada = tarikh order dikemas kini. Isi **Nama**, **ID ML**, **Bilangan game**, **Tarikh order**, tanda **VVIP** kalau fast track › **Tambah**. Setiap orang: edit ID, waktu order, tambah / set baki (pilih **Biasa** atau **VVIP**), tanda VVIP, reset kiraan hilang. |
| **Senarai MVP** | **Remark** setiap pemain (contoh skin yang dituntut). Tambah nama, **+ / −** MVP Win (VVIP dapat free 1 game sendiri). Cukup 5 / 15: **Claim ✓** (hijau) atau **Simpan** (belum claim). Tekan nombor lama untuk tukar claim. Peraturan MVP boleh diedit. |
| **Slot Mainkan Akaun** | Jadual Hari / Nama / Tarikh. Tarikh guna **kalendar**; pilih tarikh = Hari diisi sendiri. |
| **Peraturan** | Edit peraturan (baris `#` = tajuk) › **Simpan**. Penonton nampak terus. |
| **Order masuk** | Semua order: SOCIABUZZ (automatik), MANUAL, TEST. |
| **YouTube** | Penonton live YouTube pada bar LIVE (perlu API key, bahagian 9). |
| **Lagu** | Spotify dijeda sendiri bila IndoFinity main lagu request (bahagian 12). **Jeda / Sambung Spotify**. |
| **Link** | Link kekal penonton & admin, Sociabuzz Webhook URL, link pantas. |

**Undo / Redo**: butang **↶ / ↷** di tajuk setiap kad (Live, Win/Lose, Game habis, Queue, Hutang Mabar, MVP, Slot Akaun, Peraturan). Setiap kad undo perubahannya sendiri sahaja (contoh undo MVP tak sentuh baki). Tuding pada butang untuk lihat apa yang akan diundo. Papan kekunci: **Ctrl+Z** / **Ctrl+Y**. Sejarah disimpan selagi App tu terbuka.

**Mabar VIP OPEN / CLOSED**: tab Live › butang **OPEN** atau **CLOSED**. Label kecil OPEN / CLOSED keluar di atas tajuk MABAR VIP (queue tetap keluar). **Senarai queue** tutup = kad harga, label di sebelah tajuk. Halaman penonton tunjuk "MABAR VIP CLOSED". Stream Deck: `deck\MABAR_OPEN.bat` / `deck\MABAR_CLOSED.bat`.

**Tunjuk di overlay** (tab Live): on / off **Kamera**, **WIN / LOSE**, **Mabar VIP**, **Banner**, **Bar LIVE**, berasingan untuk **Portrait** dan **Landscape**. Kamera off = lubang kamera ditutup latar.

**Efek menang / kalah** (tab Live): bila WIN naik, **VICTORY** emas dengan confetti dan sinar cahaya; bila LOSE naik, **DEFEAT** menghentak, overlay bergegar, kilat merah dan retakan. Suis **Efek menang / kalah** dan **Bunyi efek** (asal hidup; bunyi keluar melalui browser source: tanda "Control audio via OBS" kalau nak kawal volume). Butang **Uji MENANG / Uji KALAH / Uji MVP** tunjuk efek tanpa ubah markah.

**Efek MVP**: bila MVP pemain naik (butang MVP pada pemain, atau + dalam Senarai MVP), skrin tunjuk mahkota, **MVP** emas, nama pemain (dengan logo role) dan **MVP KE-N**, syiling emas jatuh dan bunyi fanfare. Cukup 5 / 15: lencana **CLAIM SKIN!**. VVIP: **FREE 1 GAME**.

**Tab** di atas App: Live · Hutang Mabar · MVP · Slot Akaun · Peraturan · Lagu · Order · Tetapan · Semua (link terus: `control.html#mvp`).
**Susun layout**: tekan **⠿ Susun layout** › tarik **tab di atas** untuk tukar urutan tab, tarik **⠿ Tarik** untuk pindah kad, tarik bucu kanan bawah untuk ubah saiz, atau tekan 1 / 2 / 3 untuk lebar › **✓ Siap**. Disimpan dalam peranti tu (PC dan phone boleh lain). **Reset** = susunan asal.

Nak app dalam OBS juga: **Docks › Custom Browser Docks** › URL `http://127.0.0.1:8787/control.html`.

### Sistem Mabar (ikut dokumen MABAR VIP SYNO)

- **VVIP / Fast Track**: masuk terus ke depan queue. Game ditolak dari baki VVIP dulu.
- **Rotation**: lepas 3 game, 2 orang keluar beri ruang kalau ada orang menunggu. Queue kosong = boleh habiskan baki. Nak masuk semula: tekan **Q** pada nama dalam Hutang Mabar.
- **Data lama**: letak fail `seed_doc.js` (dihantar berasingan, tak ada dalam ZIP sebab ada ID pemain) dalam `assets\`. Kali pertama App dibuka di PC, semua Hutang Mabar (32 orang) dan senarai MVP (82 orang) dari dokumen dimasukkan sendiri. Nama sama digabung jadi satu baki. Atau: App › Peraturan › **Import data doc lama** › pilih fail `seed_doc.js`. Ubah dalam `assets\config.js` › `mabar` (rotateEvery, rotateCount, autoRequeue).

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
- Penonton nampak tab **Waiting list** (sedang main + QUE 1, 2, 3…), **Hutang mabar** (ID, Nickname, Waktu order, Baki game), **MVP**, **Slot akaun** dan **Peraturan**, serta semak baki ikut nama / ID. Mereka **tak boleh ubah apa-apa**.
- Link terus ke satu tab: tambah `#hutang`, `#mvp`, `#akaun` atau `#rules` di hujung link, contoh `…/viewer.html#mvp`.

Guna servis lain (ngrok / Cloudflare)? Tulis link awak dalam `data\public_url.txt`.

## 8. Order automatik dari Sociabuzz

Perlu link kekal (bahagian 7) dulu.

1. Sociabuzz › **TRIBE** › **Edit & Settings** › **Integrations** › **Webhook**
   (untuk produk: **Edit Shop** › **Integrations** › **Webhook**).
2. Hidupkan **Activate Webhook Integration**.
3. **Webhook URL**: salin dari App › Link › **Sociabuzz Webhook URL** (contoh `https://synostore.xxxx.ts.net/api/order-hook/abc123…`).
4. **Webhook Token**: tampal bahagian kunci (selepas `/order-hook/`). **Webhook HTTP Test Response**: `OK`.
5. Tekan **Test Notification** › App › **Order masuk** keluar **TEST** dan overlay tunjuk alert "TERIMA KASIH … TEST ✓" = berjaya.

### Test langkah demi langkah (kalau tak jadi)

Tengok kotak **Status webhook** dalam App › Order masuk. Ia tunjuk setiap kali sesuatu sampai ke webhook (dikemas kini tiap 4 saat).

1. **Test sistem di PC**: tekan **Simulasi order**. Dalam 3 saat "Test SYNO +3 game" masuk queue dan alert keluar di overlay.
   Tak jadi? Pastikan overlay atau App terbuka dan tetingkap hitam masih jalan. Tutup tetingkap hitam dan buka semula `START_OVERLAY.bat` (server baru perlu dibuka semula sekali).
2. **Test link dari internet**: di phone, **matikan Wi-Fi** (guna data), buka Webhook URL dalam Chrome.
   - Keluar `OK` dan Status webhook tulis **internet · dibuka dalam browser ✓** = link kekal OK.
   - Tak boleh buka = link kekal belum hidup: klik `PASANG_LINK_KEKAL.bat` semula (langkah [4] Funnel mesti **Enable**).
3. **Test dari Sociabuzz**: tekan **Test Notification**.
   - Status **internet · OK ✓** = Sociabuzz sampai. Order masuk keluar **TEST**.
   - Status **KUNCI SALAH** = URL dalam Sociabuzz tak lengkap. Salin semula dengan butang ⧉ (jangan taip sendiri).
   - **Tiada apa-apa muncul** = Sociabuzz tak hantar: semak **Activate Webhook Integration** hidup, tekan **Save** dulu, kemudian Test Notification.
4. Semua OK? Padam VIP **Test SYNO** dalam VIP & baki.

Tetingkap hitam juga tulis setiap webhook yang sampai (hijau = order, merah = kunci salah).

Bila orang bayar:
- Nama pembeli + **ID ML dari mesej** masuk ke VIP, baki ditambah, terus masuk queue, dan overlay tunjuk "TERIMA KASIH … +N GAME".
- Minta pembeli tulis dalam mesej: **`ID 123456789 (1234)`** dan (pilihan) **`3 game`** atau **`immortal`**.
- **Ikut jumlah bayaran** (Rupiah ditukar ke RM dan dibundarkan):

| Bayar | Masuk ke |
|---|---|
| RM4 / RM10 / RM20 / RM30 | Mabar VIP: 1 / 3 / 6 / 9 game, terus masuk queue |
| RM6 / RM15 + mesej "immortal" | Immortal: 1 / 3 game |
| RM8 / RM20 + mesej "vvip" | VVIP fast track: 1 / 3 game |
| **RM5** (atau mesej "album") | Tab **Komen Album** (tekan *Tanda siap* bila dah komen) |
| **RM40** (atau mesej "akaun") | Slot kosong pertama dalam **Slot Mainkan Akaun** |

  **Pakej TRIBE** (sociabuzz.com/synoplays/tribe): kalau data order ada nama pakej, nama tu dipakai dulu (KOMEN ALBUM, 1 GAME, PACKAGE 3/6/9 GAME, RANK IMMORTAL 1/3 GAME, FAST TRACK (VVIP), JOKI MINIGAME LAYLA). Ini bezakan pakej yang sama harga (Joki minigame dan Package 3 game, dua-dua MYR10). Senarai dalam `config.js` › `sociabuzz.items`.
  Mesej "3 game" dalam order menang atas kiraan jumlah. Ubah harga dalam `assets\config.js` › `sociabuzz` (packs, services).
- **Test Alert / Custom Test Alert di halaman Overlay › Alert Sociabuzz tak hantar ke webhook** (cuma uji paparan alert Sociabuzz), jadi tak sampai ke App. Untuk uji aliran penuh guna **App › Order › Custom test**: isi nama, ID, pilih pakej TRIBE atau jumlah (RM4 / 5 / 6 / 8 / 10 / 15 / 20 / 30) › **Hantar custom test**. Ia ikut jalan yang sama dengan pembayaran sebenar: masuk Mabar VIP / Komen Album, queue dan alert di live (ditanda **TEST ALERT**). Padam nama test lepas cuba.
- **Pemberitahuan Ujian** di halaman Integrations › Webhook cuma keluar sebagai **TEST** (tak tambah game).
- Setiap order dalam tab Order ada **Data asal** (apa Sociabuzz hantar), untuk semak kalau ada yang pelik, dan **✕** untuk buang baris tu (baki tak berubah; ↶ untuk batal). **Buang baris TEST** buang semua test sekali gus.
- Order masa PC off tak dihantar semula oleh Sociabuzz: semak dashboard Sociabuzz dan tambah manual.
- Semua order mentah disimpan dalam `data\orders_log.txt`.

### Pindah order ke tempat lain

Order masuk sendiri ikut jumlah: **RM4 / 10 / 20 / 30** = 1 / 3 / 6 / 9 game (baki + queue), **RM5** = Komen Album, **RM40** = Mainkan Akaun. Donate biasa (contoh RM3) atau salah tempat:

1. App › **Order** › tekan **Pilih ke mana** / **Pindah ke** pada order tu.
2. Tukar **Game** kalau perlu.
3. Pilih: **+ Baki mabar** (baki sahaja), **+ Queue live** (baki + masuk queue), **★ VVIP**, **Komen Album**, **Mainkan Akaun** atau **Abaikan**.

Pindah = tempat lama ditarik balik dulu (contoh game ditolak semula dari baki), jadi tak dikira dua kali.

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

## 11. Butang Stream Deck (Menang / Kalah terus ke sistem)

Perlu: `START_OVERLAY.bat` jalan dan overlay (OBS) atau App terbuka.

**Plugin SYNO Mabar (disyorkan): tekan / tahan / tahan lama**
1. Klik dua kali **`PASANG_STREAMDECK.bat`** (Stream Deck tutup sekejap dan buka semula).
   (Atau klik dua kali `streamdeck\SYNO_Mabar.streamDeckPlugin`.)
2. Dalam Stream Deck, kategori **SYNO Mabar** di sebelah kanan › seret **Win (tekan / tahan)** dan **Lose (tekan / tahan)** ke butang.
   - **On / Off (kamera, Mabar)**: seret ke butang › pilih **Facecam**, **Handcam** atau **Mabar VIP OPEN / CLOSED**. Tekan = tukar. Butang tunjuk **ON** (hijau) / **OFF** (merah) dan ikut sama dengan suis dalam App. Handcam = portrait & landscape sekali.
   - Tanpa plugin: `deck\FACECAM_ONOFF.bat`, `deck\HANDCAM_ONOFF.bat`, `deck\MABAR_OPEN.bat`, `deck\MABAR_CLOSED.bat` (System › Open).
3. Guna:
   - **Tekan sekejap** = Menang / Kalah (W/L +1, tolak baki, rotation). Boleh tukar jadi "W +1 sahaja" dalam tetapan butang.
   - **Tahan 0.6 saat** = W / L tolak 1 (butang tulis -1).
   - **Tahan 2 saat** = reset butang tu sahaja: tahan WIN = Win jadi 0, tahan LOSE = Lose jadi 0 (butang tulis RESET).
   - Butang tunjuk **nombor besar** W / L sekarang (contoh 10 menang = 10). Biar ruang Title Stream Deck kosong.
   - Ruang **Alamat overlay** dalam tetapan butang: biar kosong.

**Cara lain: Website (tekan sahaja)**

1. Stream Deck app › seret **Website** (bahagian System) ke satu butang.
2. URL: `http://127.0.0.1:8787/api/do/end-win`
3. Tanda **GET request in background** (supaya browser tak terbuka).
4. Tukar ikon / tajuk: MENANG. Ulang untuk butang lain.

| Butang | URL hujung | Apa jadi |
|---|---|---|
| Menang | `/api/do/end-win` | W +1, semua yang main tolak 1 game, rotation |
| Kalah | `/api/do/end-lose` | L +1, tolak baki, rotation |
| Game habis | `/api/do/end` | Tolak baki tanpa W/L |
| Win +1 / Lose +1 | `/api/do/win`, `/api/do/lose` | W/L sahaja (tak tolak baki) |
| Win −1 / Lose −1 | `/api/do/win-1`, `/api/do/lose-1` | Betulkan tersalah tekan |
| Timer | `/api/do/timer-start`, `timer-pause`, `timer-reset` | Timer live |
| Queue / Banner | `/api/do/queue-on`, `queue-off`, `banner-on`, `banner-off` | Tunjuk / sorok |

Semua link ada dalam App › Link › **Butang Stream Deck** (butang ⧉ untuk salin).

**Cara 2: fail .bat** (kalau tiada pilihan GET background): Stream Deck › **System › Open** › pilih fail dalam folder `deck\` (MENANG.bat, KALAH.bat, …).

Setiap tekan keluar dalam tetingkap hitam ("Stream Deck: end-win") dan App tunjuk notifikasi.

---

## 12. Lagu request IndoFinity: tajuk + nama peminta di bar LIVE, Spotify dijeda sendiri

Server di PC dengar bunyi app **IndoFinity** dan baca teks dalam tetingkapnya (tajuk lagu + @peminta).

- IndoFinity main lagu request: Spotify dijeda (lebih kurang 2 saat). Bar LIVE sebelah timer tunjuk **tajuk lagu · req @nama**.
- Lagu pause / habis: Spotify sambung terus, lagu tu dibuang sendiri dari senarai.

1. Jalankan **KEMASKINI.bat**, tutup dan buka semula **START_OVERLAY.bat**.
2. Buka app IndoFinity di PC yang sama. Biarkan tetingkap Song Request terbuka (boleh di belakang, jangan minimize).
3. App › tab **Lagu**: keluar **▶ Lagu request sedang main: tajuk · req @nama**.

Tajuk / nama tak keluar? App › Lagu › buka **Teks dibaca dari IndoFinity** dan hantar screenshot.

## 13. Efek kill automatik (kill anda sahaja) + suara announcer

Server di PC baca skrin game guna pengecaman teks Windows (OCR). Bila **anda** dapat kill, overlay terus tunjuk efek penuh skrin dengan bunyi dan **suara announcer garang** ("SAVAGE!"). Kill bertukar serta-merta: FIRST BLOOD, 1 saat kemudian DOUBLE KILL, efek terus bertukar ke DOUBLE KILL. Kill orang lain: tiada efek.

Setiap kill ada efek sendiri:

| Kill | Efek |
|---|---|
| **SOLO KILL** (kill biasa anda) | satu tetakan pedang, tulisan terbelah dua, bunyi "shing" |
| **FIRST BLOOD** | darah menitis dari atas, tulisan menghentak, bunyi degupan jantung |
| **DOUBLE KILL** | dua tetakan bersilang, tulisan ×2 bergema |
| **TRIPLE KILL** | tiga kesan cakaran, tulisan ×3 bergema |
| **MANIAC** | kilat ungu, tulisan glitch, bunyi elektrik |
| **SAVAGE** | skrin terbakar, tulisan menyala, ngauman |
| **SHUT DOWN** | skrin "TV padam", ais merayap, tulisan beku menggigil |
| **KILLING SPREE** | garisan laju (manga), tulisan meluru dari kamera |
| **MONSTER KILL** | cakaran raksasa, tulisan jatuh menghentak, tanah retak |
| **MEGA KILL** | letupan putih, 3 gelombang kejutan |
| **UNSTOPPABLE** | garisan laju mendatar, tulisan merempuh dari kanan |
| **GODLIKE** | cahaya syurga dari atas, bulu pelepah jatuh, koir |
| **LEGENDARY** | sinar emas berpusing, huruf muncul satu-satu, fanfare |
| **RAMPAGE** | skrin merah berdegup, tulisan menggeletar, gendang perang |
| **WIPED OUT** | skrin gelap, kaca pecah, huruf runtuh, gong |

**Cara App tahu kill tu anda punya (paling tepat):** banner kill berwarna **biru** (pasukan kita) **dan muka hero anda (Chou)** ada di sebelah pembunuh. Pilihan lain: banner biru + **nama anda**. Rakan sepasukan yang bunuh: nama anda tiada. Musuh bunuh anda: banner merah. Kill biasa anda tanpa tulisan streak = **SOLO KILL**. FIRST BLOOD hanya sekali setiap game. Pilihan: kotak **KDA** (nombor K anda naik) tangkap kill yang namanya tak terbaca, tanpa kira dua kali.

1. Jalankan **KEMASKINI.bat**, tutup dan buka semula **START_OVERLAY.bat**. Kali ini sahaja, **tutup dan buka semula OBS** (atau Properties › **Refresh** setiap Browser source). Lepas ni overlay muat semula sendiri bila ada versi baru.
2. MLBB guna bahasa **English** (Settings › Language).
3. App › tab **Live** › **Auto efek kill**:
   - **1 · Ambil skrin game dari**: pilih **OBS (paling stabil)**.
     - OBS › **Tools › WebSocket Server Settings** › tanda **Enable WebSocket server** › tekan **Show Connect Info** › salin **Password**.
     - Dalam App: taip password tu, tekan **↻ Sambung OBS**, pilih **source game** (contoh source capture tablet / phone).
     - Atau pilih **Tetingkap di PC** dan pilih tetingkap mirror / OBS Windowed Projector (jangan minimize).
   - **2 · Kill siapa**: **Kill saya: banner biru + logo hero saya (Chou)**. Suis **Kill biasa = SOLO KILL** hidup.
     - **Ambil logo Chou (sekali sahaja):** hidupkan **Auto detect kill** dan main sampai anda dapat kill. Gambar banner kill (8 terakhir) muncul dalam kad. Tekan gambar yang ada muka Chou di sebelah **pembunuh**, kemudian:
       - **✎ Lukis kotak BANNER** › seret di sekeliling tulisan DOUBLE KILL / SAVAGE pada gambar tu (kuning),
       - **✎ Pilih logo hero** › lukis kotak kecil tepat di atas muka Chou (ungu).
     - Server cari Chou **hanya di sekitar kotak ungu** (tempat pembunuh dalam banner MLBB). Chou yang mati muncul di tempat lain, jadi tak dikira. Tukar skin = ambil logo semula.
     - **Jenis kill:** tulisan banner kalau terbaca (FIRST BLOOD, KILLING SPREE, LEGENDARY…). Kalau tak terbaca, ikut kill berturut anda macam MLBB: kill ke-2 dalam 10 saat = DOUBLE, ke-3 = TRIPLE, ke-4 = MANIAC, ke-5 = SAVAGE (terus keluar, tak tunggu). SOLO KILL hanya untuk kill pertama.
     - **Ketepatan** 0.80 (asal). Masa live, kotak **hijau** tunjuk tempat Chou dikesan dan skornya. Kill anda biasanya 0.85+. Turunkan sikit kalau kill anda terlepas, naikkan kalau efek keluar sendiri.
     - **KDA sebagai sandaran** (pilihan): hidupkan dan lukis kotak KDA kalau nak tangkap kill yang logonya terlepas.
   - **3 · Kotak bacaan**: tekan **👁 Tunjuk skrin** (gambar game keluar):
     - kotak boleh disembunyi / ditunjuk dengan suis **Tunjuk kotak: Banner · Chou · KDA**.
   - tanda **Auto detect kill** dan **Suara announcer**.
4. Kotak **Status** tunjuk:
   - **Chou: skor 0.88 / perlu 0.80 ✓ · Banner: biru** bila banner kill anda keluar,
   - **KDA dibaca: 3/1/4 → kill anda = 3** (kalau kotak KDA dilukis),
   - **Banner dibaca:** teks dari kotak banner,
   - **Terakhir:** efek terakhir yang keluar.

Suara announcer dibuat sekali guna suara lelaki Windows (Guy / Mark / David, mana yang ada; disimpan dalam `data\voice`), kemudian overlay jadikan ia garang: nada lebih dalam, 12% lebih perlahan, lapisan suara satu oktaf lebih rendah yang kasar di bawahnya, perkataan akhir dihentak ("Double… KILL!"), gema stadium dan sorakan penonton. Nak suara lebih baik: Windows Settings › Time & Language › **Speech** › **Add voices** › English (United States), kemudian padam folder `data\voice` dan buka semula START_OVERLAY.bat. Bunyi keluar melalui browser source overlay (tanda **Control audio via OBS** kalau nak kawal volume).

Butang dalam kad tu = uji setiap efek. Stream Deck: fail `deck\SOLO_KILL.bat`, atau `http://localhost:8787/api/do/kill-solo` (ganti `solo` dengan `first`, `double`, `triple`, `maniac`, `savage`, `shutdown`, `spree`, `monster`, `mega`, `unstoppable`, `godlike`, `legendary`, `rampage`, `wiped`).

| Status | Maksud |
|---|---|
| OBS minta password / putuskan sambungan | Password WebSocket salah: salin semula dari **Show Connect Info**. |
| OBS tak dapat dihubungi | WebSocket belum di-Enable dalam OBS, atau port bukan 4455. |
| Skrin **GELAP** | Tetingkap tak dapat ditangkap: guna sumber **OBS**. |
| Tiada bahasa OCR | Windows Settings › Time & Language › Language › tambah **English (United States)**. |
| KDA dibaca salah / "?" | Lukis kotak KDA lebih ketat (nombor sahaja, tanpa ikon lain). |
| Efek tak keluar | Hantar screenshot kad **Auto efek kill** (dengan **Tunjuk skrin** hidup) masa anda dapat kill. |

## Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| Overlay kosong dalam OBS | Tetingkap hitam masih buka? Properties Browser › **Refresh cache of current page**. |
| App tulis **PERLU PIN** | Masukkan PIN dari tetingkap hitam (`data\admin_pin.txt`). |
| Link kekal tak keluar | Klik `PASANG_LINK_KEKAL.bat` sekali lagi dan ikut langkah [1]–[4]. |
| Order Sociabuzz tak masuk | Ikut **bahagian 8 › Test langkah demi langkah**. App › Order masuk › Status webhook tunjuk punca. |
| Timer tak mula sendiri | Overlay › Properties › Page permissions › Read access to OBS status information. Atau tekan **Mula** dalam app. |
| PC lag | Tambah `?bgfx=0` pada URL overlay. |
| Stream Deck tak kira | Overlay / App terbuka? Tetingkap hitam tulis "Stream Deck: …"? URL mesti `http://127.0.0.1:8787/api/do/...` |
| Ubah harga / teks | `assets\config.js` (Notepad) › save › Refresh overlay & app. |
| Backup data | Salin folder `data\` (baki VIP, queue, order, PIN). |
