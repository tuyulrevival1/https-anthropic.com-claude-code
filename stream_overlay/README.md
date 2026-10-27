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

**Banner** (`&banner=...`): `flame` (Yagami Flame), `slash` (Crimson Slash), `moon` (Moonlight), `none`.

Contoh: `overlay.html?layout=2&banner=slash`

## Pasang dalam OBS / TikTok Live Studio

1. Klik dua kali `START_OVERLAY.bat` (perlu Python). Biar tetingkap hitam tu terbuka masa live.
2. Tambah **Browser source**: URL `http://localhost:8787/overlay.html?layout=1&banner=flame`, lebar 1080, tinggi 1920.
3. Letak source overlay **paling atas**. Kamera & game letak di bawah, ikut kotak ni:

| Layout | Facecam (x, y, w, h) | Game | Handcam |
|---|---|---|---|
| 1 Klasik | 0, 0, 1080, 560 | 0, 588, 1080, 608 | 540, 1216, 504, 284 |
| 2 Mabar | 0, 0, 652, 470 | 0, 498, 1080, 608 | 666, 14, 400, 225 |
| 3 Solo Push | 0, 0, 1080, 520 | 0, 548, 1080, 760 | 540, 1326, 504, 284 |

   Layout 3: besarkan game ke 1351×760 dan crop tepi kiri/kanan.
   Tip OBS: klik kanan source › Transform › Edit Transform, taip nilai x/y/w/h terus.
4. Panel queue: OBS › **Docks › Custom Browser Docks**, URL `http://localhost:8787/control.html`.
   Panel dan overlay mesti guna alamat `localhost:8787` yang sama supaya data sync.

Buat satu scene untuk setiap layout (contoh "Mabar", "Solo Push") dan tukar scene ikut sesi.

## Queue Mabar VIP

- **Tambah**: taip nama/ID, pilih pakej (1 game RM4 / 3 game RM10), tekan Tambah. Kalau slot kosong, terus masuk "Sedang main".
- **Menang / Kalah**: tambah W/L + semua yang sedang main tolak 1 game. Yang habis pakej keluar, queue naik sendiri.
- **Tunjuk queue** off: kad queue bertukar jadi senarai harga (Mabar + Komen album + Main akaun). Guna bila skrin dah sesak.
- Maksimum orang main sekali: `mabar.maxPlaying` dalam config (default 4).

## Watak Chou KOF dalam banner

Letak PNG Chou KOF (latar telus) sebagai `assets/chou.png`. Watak keluar di kiri banner dengan rim merah, aura ungu dan gerakan kecil.
Laraskan dalam `config.js` → `banner.character` (`scale`, `x`, `y`). Kalau tiada fail, logo bulan sabit + "CHOU" dipakai.

Lepas tambah watak, render semula video banner:

```bash
npm i playwright && npx playwright install chromium
node tools/render_banner.js          # semua gaya -> exports/banner_*.mp4
```

## Ubah teks

Semua dalam `assets/config.js`: nama kedai, harga mabar, servis lain, mesej banner, device, nilai W/L/MMR permulaan.
`{store}` dalam mesej akan ditukar jadi nama kedai.

## Nota TikTok

Pada sesetengah telefon, TikTok potong sikit tepi kiri/kanan video dan letak kotak komen di bahagian bawah.
Sebab tu teks penting dalam panel dijauhkan dari tepi.
