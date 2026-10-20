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

## 🎯 Gaya edit @ryonsann (config.ryo.json)

Hasil analisa 11 video terbaru @ryonsann (Ryo, yamadaツ, 294K follower, view 100K–585K):

| Apa | Gaya Ryo | Dalam config |
|---|---|---|
| Saiz | **4:3 (960x720)**, macam skrin iPad, kadang 1:1 | `"layout": "ipad43"` (1440x1080) |
| Hook | **Satu ayat meme di tengah skrin** (tulisan putih, outline nipis), kekal sampai lagu drop. Contoh: *"How it feels playing midlaner as a boy"*, *"Why do ppl still playing sun roam even after the nerf?"* | `"caption"` |
| Awal video | **Satu gameplay panjang tanpa potong** (8–11 saat) masa lagu build-up | klip `"until_drop": true` |
| Bila lagu drop | **Potong laju ikut beat** (1–2 beat setiap klip), peralihan **whip/swipe blur** | `"transition": "whip"`, `"beats": 2` |
| Flex | Match history Victory/MVP, **"Legend Title – Global No. 1"**, profil | klip `"image"` (screenshot) |
| Effect | Tak banyak: tiada shake, tiada RGB, tiada flash putih | `"shake": 0`, `"flash": 0` |
| Panjang | 15–35 saat | `"max_duration": 45` |

### Lagu yang Ryo selalu pakai (dikenal pasti dari audio video dia)

| Lagu | Tempo | Video Ryo |
|---|---|---|
| **Toca Toca (Radio Edit)** – Fly Project | ~123 BPM | 572K view ⭐ paling sesuai untuk Chou |
| **Hot N Cold** – Katy Perry | ~129 BPM | potong 9/9 tepat atas beat |
| **Jane! (Hoodtrap)** – Qura & pipenpodol | ~96 BPM | banyak potongan laju |
| **love nwantiti (ah ah ah)** – CKay | ~129 BPM | dipakai 2 kali |
| **Luo Lei (Douyin Remix)** – DJ XS | ~117 BPM | 532K view |
| **I'm God** – Clams Casino & Imogen Heap | ~108 BPM | gaya chill/flex |
| **Skyfall (Slowed + Reverb)** – LustEcho | ~96 BPM | klip pendek 8 saat |

Lagu montagem pun kena dengan gaya ni (Passo Bem Solto, Montagem Tomada, Sleepwalker).
`"song_start": "auto"` cari sendiri bahagian **drop** dalam lagu dan susun supaya drop
jatuh tepat masa gameplay panjang habis (`"drop_at": 9` saat). Lagu apa pun boleh.

### Hook untuk FYP (pilih satu, letak dalam `caption.text`)

- `Bila enemy ingat Chou dah tak meta...`
- `Kenapa orang masih main Chou lepas kena nerf?`
- `How it feels playing Chou at Global rank`
- `POV: enemy 5 orang, Chou sorang`
- `Bagaimana user Chou melihat enemy dengan sisa hp 1%`
- `Chou main macam ni baru layak Global 1?`

Hook yang bertanya / relate (bukan "SAVAGE!!") buat orang komen dan tengok sampai habis.

### Cara guna

```bash
pip install -r requirements.txt deno
# 1. letak lagu di input/lagu.mp3 (cadangan: Toca Toca)
# 2. tukar "start" dalam config.ryo.json:
#      klip pertama  = teamfight paling best (main 9 saat tanpa potong)
#      klip 2 beat   = kill / combo pendek
#      klip terakhir = savage / momen penutup
# 3. (pilihan) screenshot flex: input/flex_history.jpg, flex_title.jpg, flex_profile.jpg
#    (match history, gelaran Global, profil) - kalau tiada, klip tu dilangkau sendiri
python3 edit.py fetch  config.ryo.json
python3 edit.py render config.ryo.json   # hasil: output/chou_ryo.mp4
```

Output: **1080p 60fps** (`"fps": 60`), `fetch` ambil stream 1080p60 dari live.
Nak menegak? Tukar `"layout"` kepada `"ipad"` (3:4) atau `"tiktok"` (9:16).

## ⚡ Cara cepat: edit live "PUSH GLOBAL 1 CHOU DUNIA" gaya Top Global

Config siap pakai: `config.global.json` (layout TikTok 9:16, badge emas
**TOP 1 GLOBAL · CHOU** yang berkilau setiap beat, hook `TOP 1 GLOBAL CHOU DUNIA`).
Tak perlu download live 10 jam: `fetch` cuma ambil bahagian klip yang dipakai.

```bash
pip install -r requirements.txt deno   # deno diperlukan yt-dlp untuk YouTube
# 1. tukar masa "start" dalam config.global.json ikut momen best (lihat langkah 3)
# 2. letak lagu di input/lagu.mp3 (atau buang "song" dan tambah "bpm": 130)
python3 edit.py fetch  config.global.json
python3 edit.py render config.global.json   # hasil: output/chou_global.mp4
```

> Masa `start` dalam `config.global.json` masih **contoh**. Cari momen sebenar
> dengan download audio sahaja (~220MB) lalu scan:
> `yt-dlp -f ba -o input/audio.m4a "https://www.youtube.com/watch?v=6SdzK7E24_s"`
> kemudian `python3 edit.py scan input/audio.m4a`.
> YouTube minta "Sign in / not a bot"? Export cookies ke `cookies.txt` lalu
> `python3 edit.py fetch config.global.json --cookies cookies.txt`.

Badge boleh ditukar dalam config: `"badge": {"title": "TOP 1 GLOBAL", "text": "CHOU"}`
(buang baris `badge` kalau tak nak).

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
| `layout` | `ipad43` (4:3, 1440x1080), `ipad` (3:4, 1080x1440), `square` (1:1) atau `tiktok` (9:16, 1080x1920) |
| `fps` | `60` = 60fps (preset Ryo & Global dah set 60), default 30 |
| `crf` | kualiti video, lebih kecil = lebih tajam (17 = sangat tajam) |
| `url` | link live YouTube (untuk `fetch`, ganti `source`) |
| `song_start` | `"auto"` = cari drop lagu sendiri (guna dengan `drop_at`) |
| `drop_at` | saat ke berapa dalam video lagu patut drop (default 9) |
| `until_drop` | klip main terus tanpa potong sampai drop |
| `image` | klip gambar/screenshot (gantikan `start`), zoom perlahan |
| `transition` | `whip` (swipe blur), `zoom`, `flash` atau `none`; boleh set per klip |
| `fx_from_drop` | `true` = zoom beat hanya selepas drop |
| `caption` | ayat hook tengah skrin `{"text", "to": "drop", "y": 0.42}` |
| `badge` | badge emas rank, contoh `{"title": "TOP 1 GLOBAL", "text": "CHOU"}` |

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
