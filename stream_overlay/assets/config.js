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
      { qty: "IMMORTAL", price: "RM6", games: 1, note: "/ GAME" }
    ],
    maxPlaying: 4 // berapa orang main sekali (max 4, sebab party 5)
  },

  // Order automatik dari Sociabuzz (webhook). Pembeli tulis ID ML dalam mesej,
  // contoh: "ID 123456789 (1234) 3 game". Bilangan game dikira dari mesej atau jumlah bayaran.
  sociabuzz: {
    autoQueue: true,
    toMYR: { MYR: 1, RM: 1, IDR: 0.00028, SGD: 3.3, USD: 4.4 },   // anggaran tukaran ke RM
    packs: [{ rm: 10, games: 3 }, { rm: 4, games: 1 }],            // pakej besar dulu
    immortalPerGame: 6                                             // kalau mesej sebut "immortal"
  },

  // Servis lain (keluar bila queue disorok)
  services: [
    { label: "Komen album", price: "RM5" },
    { label: "Main akaun", price: "RM40" }
  ],

  // Banner bawah (gaya "power"). art: diamond | rank | mabar | album | link
  banner: {
    secondsPerMessage: 4.8,
    messages: [
      { kicker: "TOPUP MLBB", main: "TOPUP DIAMOND MURAH", tags: ["LINK DI BIO"], art: "diamond", hook: "MURAH!" },
      { kicker: "SERVIS JOKI", main: "JOKI RANK MURAH", tags: ["& TERPERCAYA"], art: "rank", hook: "MURAH!" },
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
      { bold: "TOPUP DIAMOND", light: "MURAH · LINK DI BIO", icon: "diamond" },
      { bold: "JOKI RANK", light: "MURAH & TERPERCAYA", icon: "rank" },
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
      { name: "HONOR", img: "assets/ranks/honor.png", glow: "#7fb2ff" },
      { name: "GLORY", img: "assets/ranks/glory.png", glow: "#ff96d4" },
      { name: "IMMORTAL", img: "assets/ranks/immortal.png", glow: "#ff5874" }
    ]
  },

  // Nilai permulaan (boleh ubah live dalam control.html)
  defaults: { wins: 0, losses: 0 }
};
