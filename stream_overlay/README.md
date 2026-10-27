# Chou KOF Overlay – TikTok Live portrait (1080×1920)

Overlay live untuk MLBB dengan tema **Chou KOF (Iori)**: hitam, api ungu, merah crimson, bulan sabit.
Semua dalam HTML, jadi teks, harga dan queue boleh ubah tanpa edit video.

| Fail | Guna |
|---|---|
| `overlay.html` | Overlay penuh 1080×1920 (letak paling atas dalam scene) |
| `banner.html` | Banner bawah sahaja, 1080×192 |
| `control.html` | Panel kawalan queue Mabar VIP, W/L, MMR |
| `index.html` | Galeri preview semua variasi + cuba queue |
| `assets/config.js` | **Ubah teks & harga di sini** |
| `exports/banner_*.mp4` | Banner siap render (loop 24 saat) kalau tak nak guna browser source |

## Variasi

**Layout** (`overlay.html?layout=N`)

1. **Klasik** – facecam atas, game tengah, kad queue kiri bawah + handcam kanan + stats.
2. **Mabar** – facecam + handcam sebelah-menyebelah di atas, queue besar di bawah. Untuk sesi mabar VIP.
3. **Solo Push** – game lebih besar, stats W/L besar, tiada queue. Untuk bila skrin dah penuh.
4. **Arena** (baru) – gameplay diapit garis tenaga beranimasi, papan W/L besar di kanan, kiri bawah dibiar tenang supaya chat TikTok senang dibaca, ruang untuk widget lagu, "Welcome To My Stream" boleh on/off.

**Banner** (`&banner=...`):
- `scene-grunge`, `scene-emblem`, `scene-mascot` – **Minimal** (rentak macam SOLOZ): babak jenama → babak servis, teks kabur-pudar, butang Link in Bio diketuk.
  Tambah `&accent=violet | crimson | lime | ice | gold` untuk tukar warna aksen.
- `pro` – **Premium Ungu** (default): maskot sticker awak main tablet, teks bergerak huruf demi huruf, ikon kanan beranimasi.
- `pro-crimson` – Premium Merah: susunan sama, plat merah.
- `flame`, `slash`, `moon` – gaya lama yang lebih ringkas. `none` untuk tutup banner.

Ikon kanan ikut mesej: diamond berkilat (topup), ikon rank 3D (joki), lencana VIP (mabar), link (bio).

### Ikon rank asli (3D)

Letak ikon rank MLBB asli (PNG latar telus) dalam `assets/ranks/`: `epic.png`, `legend.png`, `mythic.png`, `glory.png`, `immortal.png`.
Banner akan putar setiap ikon secara 3D (ada ketebalan, bayang lantai, glow ikut warna rank, kilauan) dan berhenti di Immortal dengan sinar.
Selagi fail tiada, lencana lukisan dipakai. Nama fail & warna glow boleh ubah dalam `config.js` → `ranks.tiers`.
Lepas letak ikon, render semula video: `node tools/render_banner.js`.
Nama di bawah maskot diambil dari `storeName` (contoh SYNOSTORE → "SYNO" + "STORE").

Contoh: `overlay.html?layout=2&banner=pro-crimson` atau `overlay.html?layout=1&banner=scene-grunge&accent=lime`

**Latar beranimasi**: kawasan gelap overlay ada asap ungu-merah + bara api yang bergerak perlahan (tak tutup kamera). Tutup dengan `&bgfx=0` kalau PC berat.

## Logo

Folder `logos/` (PNG latar telus):

| Fail | Guna |
|---|---|
| `logo_emblem.png`, `logo_emblem_crimson.png` | Ikon kecil, watermark, sudut video |
| `logo_wordmark.png` | Thumbnail, banner, header |
| `logo_mascot.png` | Sticker, emote, intro |
| `profile_picture.png` | Gambar profil TikTok / WhatsApp |

Tukar nama/huruf logo dalam `config.js` → `brand`, kemudian `node tools/export_logos.js`.

## Pasang dalam OBS / TikTok Live Studio

**Tutorial penuh langkah demi langkah: [PASANG_OBS.md](PASANG_OBS.md)** (tak perlu install Python).

1. Klik dua kali `START_OVERLAY.bat` (guna PowerShell bawaan Windows, tiada install). Biar tetingkap hitam tu terbuka masa live.
2. Tambah **Browser source**: URL `http://127.0.0.1:8787/overlay.html?layout=1&banner=pro`, lebar 1080, tinggi 1920.
3. Letak source overlay **paling atas**. Kamera & game letak di bawah, ikut kotak ni:

| Layout | Facecam (x, y, w, h) | Game | Handcam |
|---|---|---|---|
| 4 Arena | 0, 0, 1080, 612 | 0, 612, 1080, 608 | 716, 398, 340, 191 (lagu: 36, 1598, 470, 110) |
| 1 Klasik | 0, 0, 1080, 560 | 0, 588, 1080, 608 | 540, 1216, 504, 284 |
| 2 Mabar | 0, 0, 652, 470 | 0, 498, 1080, 608 | 666, 14, 400, 225 |
| 3 Solo Push | 0, 0, 1080, 520 | 0, 548, 1080, 760 | 540, 1326, 504, 284 |

   Layout 3: besarkan game ke 1351×760 dan crop tepi kiri/kanan.
   Tip OBS: klik kanan source › Transform › Edit Transform, taip nilai x/y/w/h terus.
4. Panel queue: OBS › **Docks › Custom Browser Docks**, URL `http://127.0.0.1:8787/control.html`.
   Panel dan overlay mesti guna alamat `127.0.0.1:8787` yang sama supaya data sync.

Buat satu scene untuk setiap layout (contoh "Mabar", "Solo Push") dan tukar scene ikut sesi.

## Queue Mabar VIP

- **Tambah**: taip nama/ID, pilih pakej (1 game RM4 / 3 game RM10), tekan Tambah. Kalau slot kosong, terus masuk "Sedang main".
- **Menang / Kalah**: tambah W/L + semua yang sedang main tolak 1 game. Yang habis pakej keluar, queue naik sendiri.
- **Tunjuk queue** off: kad queue bertukar jadi senarai harga (Mabar + Komen album + Main akaun). Guna bila skrin dah sesak.
- Maksimum orang main sekali: `mabar.maxPlaying` dalam config (default 4).

## Watak Chou KOF dalam banner gaya lama

(Banner premium guna maskot kartun.) Untuk gaya `flame`/`slash`/`moon`, letak PNG Chou KOF (latar telus) sebagai `assets/chou.png`. Watak keluar di kiri banner dengan rim merah, aura ungu dan gerakan kecil.
Laraskan dalam `config.js` → `banner.character` (`scale`, `x`, `y`). Kalau tiada fail, logo bulan sabit + "CHOU" dipakai.

Lepas tambah watak, render semula video banner:

```bash
npm i playwright && npx playwright install chromium
node tools/render_banner.js          # semua gaya -> exports/banner_*.mp4
node tools/render_banner.js pro      # satu gaya sahaja
```

## Ubah teks

Semua dalam `assets/config.js`: nama kedai, harga mabar, servis lain, mesej banner, device, nilai W/L/MMR permulaan.
`{store}` dalam mesej akan ditukar jadi nama kedai.

## Naik taraf stream (ringkas)

1. **Belakang kamera**: LED strip ungu + merah di dinding belakang, neon/poster logo sedikit kabur, lampu depan serong 45°. Latar hitam jadi bergradien ikut tema.
2. **Video**: kanvas 1080×1920, 30/60 fps, bitrate tertinggi yang TikTok benarkan; kunci fokus, exposure & white balance facecam.
3. **Audio**: noise suppression + compressor; muzik latar jauh lebih perlahan dari suara.
4. **Hook**: tajuk live jelas ("SOLO PUSH GLOBAL · MABAR VIP RM4"), sebut nama penonton, ajak komen "VIP", guna LIVE Goal, tukar layout ikut sesi.
5. **Konsisten**: jadual tetap, post klip savage sebelum live, logo & warna sama di semua tempat.

## Nota TikTok

Pada sesetengah telefon, TikTok potong sikit tepi kiri/kanan video dan letak kotak komen di bahagian bawah.
Sebab tu teks penting dalam panel dijauhkan dari tepi.
