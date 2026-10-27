/*
  TETAPAN OVERLAY — ubah teks & harga di sini sahaja.
  Lepas save, refresh browser source dalam OBS / TikTok Live Studio.
*/
window.OVERLAY_CONFIG = {
  storeName: "SYNOSTORE",
  status: "SOLO PUSH MMR",
  server: "SERVER INDO",
  device: "REDMAGIC ASTRA 2",
  theme: "red",                 // red | violet

  // Harga Mabar VIP (keluar dalam kad queue & banner)
  mabar: {
    title: "MABAR VIP",
    prices: [
      { qty: "1 GAME", price: "RM4", games: 1 },
      { qty: "3 GAME", price: "RM10", games: 3 },
      { qty: "IMMORTAL", price: "RM6", games: 1, note: "/ GAME" }
    ],
    joinHint: 'Komen "VIP" + ID untuk masuk queue',
    maxPlaying: 4 // berapa orang main sekali (max 4, sebab party 5)
  },

  // Servis lain (keluar bila queue disorok)
  services: [
    { label: "Komen album", price: "RM5" },
    { label: "Main akaun", price: "RM40" }
  ],

  // Banner bawah. art: diamond | rank | mabar | link
  banner: {
    secondsPerMessage: 4.8,
    // Letak PNG Chou KOF (latar telus) di assets/chou.png.
    // scale = besarkan, x/y = anjak (px). Kalau fail tiada, logo bulan sabit keluar.
    character: { src: "assets/chou.png", scale: 1.15, x: 0, y: 8 },
    messages: [
      { kicker: "TOPUP MLBB", main: "TOPUP DIAMOND MURAH", tags: ["LINK DI BIO"], art: "diamond", hook: "MURAH!" },
      { kicker: "SERVIS JOKI", main: "JOKI RANK MURAH", tags: ["& TERPERCAYA"], art: "rank", hook: "MURAH!" },
      { kicker: "JOM MABAR", main: "MABAR VIP", tags: ["RM4 / GAME", "3 GAME RM10", "IMMORTAL RM6"], art: "mabar", hook: "RM4" },
      { kicker: "SERVIS LAIN", main: "KOMEN ALBUM RM5", tags: ["MAINKAN AKAUN RM40"], art: "album", hook: "RM5" },
      { kicker: "SEMUA DI {store}", main: "TEKAN LINK DI BIO", tags: ["{store}"], art: "link", hook: "TAP!" }
    ]
  },

  // Jenama / logo (banner gaya "scene" & logo)
  brand: {
    name: "SYNO",                 // teks logo grunge
    monogram: "S",
    tagline: "SYNO STORE",        // teks babak jenama
    sub: "TOPUP · JOKI · MABAR VIP",
    badge: ["INFO LANJUT", "DI BIO"]
  },

  // Banner gaya "scene" (minimal, macam rujukan SOLOZ)
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
  defaults: { wins: 4, losses: 2, mmr: 8708, globalRank: 16 }
};
