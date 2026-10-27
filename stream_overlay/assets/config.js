/*
  TETAPAN OVERLAY — ubah teks & harga di sini sahaja.
  Lepas save, refresh browser source dalam OBS / TikTok Live Studio.
*/
window.OVERLAY_CONFIG = {
  storeName: "SYNOSTORE",
  status: "SOLO PUSH MMR",
  server: "SERVER INDO",
  device: "REDMAGIC ASTRA",

  // Harga Mabar VIP (keluar dalam kad queue & banner)
  mabar: {
    title: "MABAR VIP",
    prices: [
      { qty: "1 GAME", price: "RM4" },
      { qty: "3 GAME", price: "RM10" }
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
    secondsPerMessage: 6,
    // Letak PNG Chou KOF (latar telus) di assets/chou.png.
    // scale = besarkan, x/y = anjak (px). Kalau fail tiada, logo bulan sabit keluar.
    character: { src: "assets/chou.png", scale: 1.15, x: 0, y: 8 },
    messages: [
      { kicker: "SERVIS TOPUP", main: "TOPUP DIAMOND MURAH", tags: ["LINK DI BIO"], art: "diamond" },
      { kicker: "EPIC SAMPAI IMMORTAL", main: "JOKI RANK MURAH", tags: ["& TERPERCAYA"], art: "rank" },
      { kicker: "MAIN DENGAN SAYA", main: "MABAR VIP", tags: ["RM4 / GAME", "3 GAME RM10"], art: "mabar" },
      { kicker: "SEMUA DI {store}", main: "TEKAN LINK DI BIO", tags: ["{store}"], art: "link" }
    ]
  },

  // Nilai permulaan (boleh ubah live dalam control.html)
  defaults: { wins: 4, losses: 2, mmr: 8708, globalRank: 16 }
};
