/*
  TETAPAN OVERLAY — ubah teks & harga di sini sahaja.
  Lepas save, refresh browser source dalam OBS / TikTok Live Studio.
*/
window.OVERLAY_CONFIG = {
  storeName: "SYNOSTORE",
  device: "REDMAGIC ASTRA 2",
  theme: "red",

  // Harga Mabar VIP (keluar dalam kad queue & banner)
  mabar: {
    title: "MABAR VIP",
    prices: [
      { qty: "1 GAME", price: "RM4", games: 1 },
      { qty: "3 GAME", price: "RM10", games: 3 },
      { qty: "5 GAME", price: "RM20", games: 5, overlay: false },   // overlay: false = tak keluar dalam chip harga overlay (ruang kecil)
      { qty: "9 GAME", price: "RM30", games: 9, overlay: false },
      { qty: "IMMORTAL", price: "RM6", games: 1, note: "/ GAME" }
    ],
    maxPlaying: 4,      // berapa orang main sekali (max 4, sebab party 5)
    rotateEvery: 3,     // Sistem Rotation: lepas 3 game keluar beri ruang (hanya bila ada orang menunggu)
    rotateCount: 2,     // berapa orang rotate setiap kali
    autoRequeue: false, // true = lepas rotate terus masuk semula ke bawah queue
    vvipMvpFree: true   // VVIP dapat MVP Win: free 1 game (ditambah bila tekan +1 MVP)
  },

  // Order automatik dari Sociabuzz (webhook). Pembeli tulis ID ML dalam mesej,
  // contoh: "ID 123456789 (1234) 3 game". Bilangan game dikira dari mesej atau jumlah bayaran.
  sociabuzz: {
    autoQueue: true,
    alertTestAsOrder: true,   // Test Alert / Custom Test Alert di halaman Alert Sociabuzz dikira macam order sebenar (ditanda TEST ALERT)
    toMYR: { MYR: 1, RM: 1, IDR: 0.00028, SGD: 3.3, USD: 4.4 },   // anggaran tukaran ke RM
    packs: [{ rm: 30, games: 9 }, { rm: 20, games: 5 }, { rm: 10, games: 3 }, { rm: 4, games: 1 }], // pakej besar dulu
    immortalPerGame: 6,                                            // kalau mesej sebut "immortal"
    immortalPacks: [{ rm: 15, games: 3 }, { rm: 6, games: 1 }],    // Immortal RM6 / 3 game RM15
    vvipPacks: [{ rm: 20, games: 3 }, { rm: 8, games: 1 }],        // mesej sebut "vvip" / "fast track": RM8 / 3 game RM20
    // Servis ikut jumlah TEPAT (selepas tukar ke RM). Mesej sebut "album" / "akaun" juga dikira.
    //  album -> tab Komen Album · akaun -> slot kosong pertama dalam Slot Mainkan Akaun
    services: [{ rm: 5, type: "album", label: "Komen album" }, { rm: 40, type: "akaun", label: "Mainkan akaun" }]
  },

  // Peraturan (nilai permulaan; edit terus dalam App > Peraturan). Baris "# ..." = tajuk.
  rules: `# Fast Track (VVIP)
RM8 (1 game) / RM20 (3 game)
Terus main tanpa tunggu queue
Untuk VVIP: MVP Win free 1 game
# Harga Mabar
Immortal RM6 per game | 3 game RM15
Bawah Immortal semua RM4 per game
Pakej: 3 game RM10 | 5 game RM20 | 9 game RM30
# Sistem Rotation
2 orang rotate setiap 3 game
Queue tak ramai boleh habiskan balance
# Peraturan Queue
Dah masuk, tunggu turn dipanggil
Tak muncul: keluar queue, masuk ke hutang mabar
Boleh re-queue dari bawah
Hilang 2 kali: tolak 1 game
Hilang 3 kali: tolak 2 game
# Re-Queue & Balance
Habis 3 game boleh re-queue jika ada balance
Masuk queue: bagitahu nama + baki game`,
  mvpRules: `MVP WIN x5: FREE SKIN SHOP BAWAH 1K DIAMOND
MVP WIN x15: CLAIM 1 SKIN EVENT YANG BOLEH GIFT`,

  // Servis lain (keluar bila queue disorok)
  services: [
    { label: "Komen album", price: "RM5" },
    { label: "Main akaun", price: "RM40" }
  ],

  // Banner bawah (gaya "power"). art: diamond | rank | mabar | album | link
  banner: {
    secondsPerMessage: 4.8,
    messages: [
      { kicker: "TOPUP MLBB", main: "TOPUP DIAMOND MURAH", tags: ["& TERPERCAYA"], art: "diamond", hook: "MURAH!" },
      { kicker: "SERVIS JOKI", main: "JOKI RANK MURAH", tags: ["& PANTAS"], art: "rank", hook: "PANTAS!" },
      { kicker: "JOM MABAR", main: "MABAR VIP", tags: ["RM4 / GAME", "3 GAME RM10", "IMMORTAL RM6"], art: "mabar", hook: "RM4" },
      { kicker: "SERVIS LAIN", main: "KOMEN ALBUM RM5", tags: ["MAINKAN AKAUN RM40"], art: "album", hook: "RM5" },
      { kicker: "SEMUA DI {store}", main: "TEKAN LINK DI BIO", tags: ["{store}"], art: "link", hook: "TAP!" }
    ]
  },

  // Jenama (banner gaya "minimal")
  brand: {
    tagline: "SYNO STORE",        // teks babak jenama
    sub: "TOPUP · JOKI · MABAR VIP",
    badge: ["INFO LANJUT", "DI BIO"]
  },

  // Banner gaya "minimal" (rentak macam rujukan SOLOZ)
  scene: {
    brandSeconds: 4,
    itemSeconds: 4,
    items: [
      { bold: "TOPUP DIAMOND", light: "MURAH & TERPERCAYA", icon: "diamond" },
      { bold: "JOKI RANK", light: "MURAH & PANTAS", icon: "rank" },
      { bold: "MABAR VIP", light: "RM4 / GAME · IMMORTAL RM6", icon: "mabar" },
      { bold: "KOMEN ALBUM", light: "RM5 · MAINKAN AKAUN RM40", icon: "album" },
      { bold: "synostore", light: "", pill: "Link in Bio", icon: "link" }
    ]
  },

  // Ikon rank untuk mesej joki. Letak PNG asli (latar telus) ikut nama fail ni.
  ranks: {
    tiers: [
      { name: "EPIC", img: "assets/ranks/epic.png", glow: "#45f0bf" },
      { name: "LEGEND", img: "assets/ranks/legend.png", glow: "#ffcf4a" },
      { name: "MYTHIC", img: "assets/ranks/mythic.png", glow: "#c995ff" },
      { name: "HONOR", img: "assets/ranks/honor.png", glow: "#4fd8ff" },
      { name: "GLORY", img: "assets/ranks/glory.png", glow: "#ffb02e" },
      { name: "IMMORTAL", img: "assets/ranks/immortal.png", glow: "#e7a8ff" }
    ]
  },

  // Nilai permulaan (boleh ubah live dalam control.html)
  defaults: { wins: 0, losses: 0 }
};
