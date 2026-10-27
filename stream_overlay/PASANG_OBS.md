# Cara pasang overlay dalam OBS (langkah demi langkah)

Tak perlu install Python atau apa-apa program lain. Cuma perlu **OBS Studio** (versi 30 ke atas) dan Windows 10/11.

---

## 1. Muat turun fail overlay

1. Buka link ni di PC (log masuk GitHub dulu):
   `https://github.com/tuyulrevival1/https-anthropic.com-claude-code/archive/refs/heads/claude/streaming-layout-chou-kof-vie6x8.zip`
2. Fail ZIP akan dimuat turun. Klik kanan ZIP › **Extract All…** › Extract.
3. Pindahkan folder **`stream_overlay`** ke tempat tetap, contoh `C:\SYNO\stream_overlay`.
   Jangan letak dalam folder Downloads yang selalu dipadam.

## 2. Hidupkan overlay (setiap kali nak live)

1. Buka folder `stream_overlay`, klik dua kali **`START_OVERLAY.bat`**.
2. Kalau keluar amaran biru Windows: klik **More info** › **Run anyway**.
3. Tetingkap hitam keluar dengan tulisan hijau **OVERLAY JALAN: http://127.0.0.1:8787/**, dan browser buka halaman preview.
4. **Jangan tutup tetingkap hitam tu** selagi live. Minimize sahaja.

> Kalau tetingkap tu tertutup terus: klik kanan `START_OVERLAY.bat` › **Run as administrator**.
> Kalau tetap tak jalan, guna **Cara B** di bawah (tanpa server).

## 3. Set OBS ke portrait 1080×1920

1. OBS › **Settings** › **Video**
   - Base (Canvas) Resolution: **1080x1920** (taip sendiri)
   - Output (Scaled) Resolution: **1080x1920**
   - Common FPS Values: **30** (atau 60 kalau PC kuat)
2. Klik **Apply** › **OK**.

## 4. Buat scene Arena

Dalam kotak **Scenes**, klik **+** › nama `LIVE ARENA`.

Tambah source ikut urutan ni (yang ditambah dulu duduk paling bawah):

| # | Source | Cara tambah | Kedudukan (x, y) | Saiz (w × h) |
|---|---|---|---|---|
| 1 | Facecam | **+** › Video Capture Device › pilih kamera muka | 0, 0 | 1080 × 612 |
| 2 | Gameplay | capture card / scrcpy / Window Capture yang awak guna sekarang | 0, 612 | 1080 × 608 |
| 3 | Handcam | **+** › Video Capture Device › kamera tangan | 716, 398 | 340 × 191 |
| 4 | **Overlay** | **+** › **Browser** (lihat langkah 5) | 0, 0 | 1080 × 1920 |
| 5 | Lagu (widget muzik) | source lagu awak sekarang | 36, 1598 | 470 × 110 |

**Cara letak kedudukan & saiz tepat** (untuk source 1, 2, 3, 5):
1. Klik kanan source › **Transform** › **Edit Transform…** (atau tekan Ctrl+E).
2. **Position**: taip x dan y dari jadual.
3. **Bounding Box Type**: pilih **Scale to outer bounds**.
4. **Bounding Box Size**: taip w dan h dari jadual.
5. Tanda **Crop to Bounding Box** (kalau ada), supaya lebihan dipotong kemas.
6. Tutup.

## 5. Tambah overlay (Browser source)

1. **+** › **Browser** › nama `Overlay` › OK.
2. Dalam tetingkap properties:
   - **Local file**: JANGAN tanda
   - **URL**: `http://127.0.0.1:8787/overlay.html?layout=4&banner=pro`
   - **Width**: `1080`  **Height**: `1920`
   - **FPS**: `30`
   - Tanda **Shutdown source when not visible**: TIDAK
3. Klik **OK**.
4. Klik kanan `Overlay` › **Order** › **Move to Top**, supaya overlay duduk atas kamera.
   Pastikan widget lagu duduk paling atas sekali (atas overlay).

## 6. Panel kawalan (queue, Win/Lose, Welcome)

1. OBS menu atas › **Docks** › **Custom Browser Docks…**
2. Dock Name: `Panel`  URL: `http://127.0.0.1:8787/control.html` › **Apply** › **Close**.
3. Panel muncul dalam OBS. Seret dan letak di tepi.

Dalam panel:
- **Menang / Kalah**: tambah W/L dan tolak 1 game untuk pemain Mabar VIP.
- **Tambah pemain**: masukkan nama + pakej (1 game RM4 / 3 game RM10).
- **Tunjuk queue / banner / Welcome**: on/off terus dalam stream.
- **MMR & Global**: taip nombor baru, tekan Enter.

## 7. Tukar layout & banner

Tukar **URL** dalam source `Overlay` (klik dua kali source):

| Layout | URL |
|---|---|
| Arena (baru, W/L besar) | `http://127.0.0.1:8787/overlay.html?layout=4&banner=pro` |
| Arena tanpa handcam | `http://127.0.0.1:8787/overlay.html?layout=4&hand=0&banner=pro` |
| Klasik | `http://127.0.0.1:8787/overlay.html?layout=1&banner=pro` |
| Mabar (queue besar) | `http://127.0.0.1:8787/overlay.html?layout=2&banner=pro` |
| Solo Push | `http://127.0.0.1:8787/overlay.html?layout=3&banner=pro` |

Gaya banner (ganti hujung `banner=`): `pro`, `pro-crimson`, `scene-grunge`, `scene-emblem`, `scene-mascot`.
Warna banner minimal: tambah `&accent=lime` (atau `crimson`, `ice`, `gold`, `violet`).

Tip: buat satu scene untuk setiap layout (copy scene, tukar URL), lepas tu tinggal klik scene masa live.

## 8. Live ke TikTok

- **Ada stream key TikTok** (LIVE Center): OBS › Settings › **Stream** › Service: **Custom…** › tampal **Server URL** dan **Stream Key** dari TikTok › OK › **Start Streaming**.
- **Tiada stream key / guna TikTok LIVE Studio**: kalau Studio tiada pilihan Browser/Link source, guna video banner MP4 dalam folder `exports/` (letak di bawah sekali, y = 1728).

---

## Cara B: tanpa server (kalau START_OVERLAY.bat tak jalan)

1. **+** › **Browser** › tanda **Local file** › **Browse** › pilih `stream_overlay\obs-arena.html`
   (atau `obs-klasik.html`, `obs-mabar.html`, `obs-solo.html`).
2. Width `1080`, Height `1920`, OK.
3. Untuk tukar Win/Lose tanpa panel: klik kanan source `Overlay` › **Interact**, lepas tu tekan:
   - `W` = +1 win, `L` = +1 lose, `Shift+W` / `Shift+L` = tolak 1
   - `Q` = on/off queue, `B` = on/off banner, `H` = on/off Welcome
4. Panel queue (control.html) tak sync dalam cara ni. Untuk queue Mabar VIP, guna cara utama (server).

## Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| Overlay kosong / putih dalam OBS | Pastikan tetingkap hitam overlay masih buka. Dalam properties Browser, klik **Refresh cache of current page**. |
| Panel tekan tapi overlay tak berubah | Panel dan overlay mesti guna alamat sama `http://127.0.0.1:8787/`. Jangan campur dengan `localhost` atau fail. |
| Kamera tak muat kotak | Semak Edit Transform: Bounding Box Type = Scale to outer bounds, saiz ikut jadual. |
| PC lag | Tambah `&bgfx=0` hujung URL overlay (matikan asap latar). Set FPS browser source ke 30. |
| Ubah teks / harga | Buka `assets\config.js` dengan Notepad, ubah, save, kemudian Refresh browser source. |
| Ikon rank asli | Letak `epic.png`, `legend.png`, `mythic.png`, `glory.png`, `immortal.png` dalam `assets\ranks\`. |
