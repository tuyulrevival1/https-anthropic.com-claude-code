# Chou Montage Edit – gaya TikTok (beat sync)

Skrip ni potong gameplay MLBB ikut **beat lagu** (gaya edit montagem / phonk),
dan tambah efek yang biasa ada dalam edit FYP:

- potong klip tepat atas beat
- zoom punch setiap beat, shake + RGB split pada beat kuat (drop)
- flash putih setiap kali tukar klip
- slow-mo (frame blend) untuk momen kill
- teks **hook** di atas untuk 2–3 saat pertama, caption pop ("SAVAGE", "1 VS 3")
- warna lebih pekat (saturation + contrast)
- output menegak: `ipad` 1080x1440 (3:4) atau `tiktok` 1080x1920 (9:16, latar blur)
- panjang maksimum 58 saat (bawah 1 minit)

## 1. Pasang

```bash
sudo apt install ffmpeg          # atau brew install ffmpeg (Mac)
pip install -r requirements.txt
```

## 2. Ambil video livestream

```bash
mkdir -p input
yt-dlp -f "bv*[height<=1080]+ba/b" -o input/live.mp4 \
  "https://www.youtube.com/watch?v=6SdzK7E24_s"
```

Live panjang? Ambil bahagian tertentu sahaja (contoh minit 10 hingga 40):

```bash
yt-dlp --download-sections "*00:10:00-00:40:00" -o input/live.mp4 "URL"
```

## 3. Cari momen best (pilihan)

```bash
python3 edit.py scan input/live.mp4
```

Ia senaraikan 15 masa paling "bising" (bunyi announcer SAVAGE/MANIAC, teamfight)
dan buat gambar kecil di `scan/contact_sheet.jpg`. Tengok, pilih yang betul-betul best.

## 4. Letak lagu

Simpan lagu sebagai `input/lagu.mp3`. Lagu yang sesuai untuk gaya edit Chou ni
(tempo laju, bass kuat, drop jelas):

| Lagu | Kenapa sesuai |
|---|---|
| Passo Bem Solto – ATLXS | trend besar, drop kuat, sesuai untuk slow-mo → laju |
| Montagem Tomada – MXZI, DJ Samir, DJ Javi26 | montagem klasik, banyak beat untuk potong |
| Montagem Xonada – MXZI, DJ Samir, DJ Javi26 | sama gaya, lebih "aggressive" |
| Automotivo Bibi Fogosa – Bibi Babydoll | funk laju, sesuai combo Chou |
| Sleepwalker – akiaura | phonk, bagus untuk 1v3 / outplay |

Tak ada fail lagu? Buang baris `"song"` dalam config dan letak `"bpm": 130`.
Video akan dipotong ikut beat 130 BPM, kemudian pilih lagu dalam aplikasi TikTok
(kebanyakan lagu montagem sekitar 125–135 BPM).

> **Tip hak cipta:** Paling selamat, upload ke TikTok, kemudian tekan **Sounds**
> dan pilih lagu yang sama dari library TikTok, perlahankan "Original sound".
> Video takkan di-mute dan lagu dikira untuk trend (bantu FYP).

## 5. Isi config

Salin `config.example.json` ke `config.json`, tukar masa `start` ikut live awak.

| Medan | Maksud |
|---|---|
| `start` | masa mula klip dalam video live (`jam:minit:saat`) |
| `beats` | berapa beat klip ni main (4 = pendek & laju, 16 = panjang) |
| `speed` | `0.5` = slow-mo, `1` = biasa, `1.5` = laju |
| `text` | caption pop kuning (kosongkan kalau tak nak) |
| `zoom`, `focus` | zoom masuk (1.3) dan titik tengah `[x, y]` (0–1) |
| `song_start` | mula lagu dari saat berapa (terus ke bahagian drop) |
| `layout` | `ipad` (3:4) atau `tiktok` (9:16) |

## 6. Render

```bash
python3 edit.py render config.json
```

Hasil: `output/chou_edit.mp4`

## Formula hook untuk FYP

1. **Klip pertama = momen paling best** (savage/1v5) dalam slow-mo, 4 beat sahaja.
   Penonton nampak "hasil" dulu, baru cerita.
2. **Teks hook** yang buat orang tertanya: `CHOU 1 VS 5??`, `MAIN CHOU MACAM NI…`,
   `ENEMY TAK SEMPAT LARI`, `TOP GLOBAL PUN TERKEJUT`.
3. Subtext `tunggu sampai habis...` supaya orang tengok sampai akhir (watch time).
4. Potongan laju (4–8 beat) di tengah, simpan **savage penuh** untuk drop terakhir.
5. Panjang 20–40 saat paling bagus untuk watch time; maksimum 58 saat.
6. Caption post: `Chou ni lain macam 😤 #mlbb #chou #mobilelegends #fyp #montagem`
