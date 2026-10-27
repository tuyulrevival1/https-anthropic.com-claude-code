/* Chou KOF stream overlay engine.
   - mount(el, {layout, banner, demo})  -> full 1080x1920 portrait overlay
   - mountBanner(el, {style})           -> 1080x192 bottom banner only
   State (queue, W/L, MMR) is shared between overlay.html and control.html
   through localStorage + BroadcastChannel. */
(function () {
  "use strict";
  const CFG = window.OVERLAY_CONFIG;
  const W = 1080, H = 1920, BH = 192, BY = H - BH;

  /* ---------- time ---------- */
  let manualT = null;
  const now = () => (manualT != null ? manualT : performance.now() / 1000);
  const tickers = [];
  function loop() { const t = now(); for (const f of tickers) f(t); requestAnimationFrame(loop); }

  /* ---------- helpers ---------- */
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const eOut = t => 1 - Math.pow(1 - t, 3);
  const eBack = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const frac = x => x - Math.floor(x);
  const rnd = i => frac(Math.sin(i * 127.1 + 311.7) * 43758.5453);
  const TAU = Math.PI * 2;
  const fill = s => String(s).replace(/\{store\}/g, CFG.storeName);
  const brandName = () => (CFG.brand && CFG.brand.name) || CFG.storeName.replace(/STORE$/i, "");
  const priceHL = s => esc(s).replace(/(RM\s?\d+)/g, "<b>$1</b>");
  let uidN = 0; const uid = p => p + (++uidN) + Math.random().toString(36).slice(2, 5);
  const pos = (e, r) => Object.assign(e.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });

  /* ---------- shared state ----------
     Served by START_OVERLAY.bat (http): state lives on the PC server (/api/state) so OBS,
     the control app, admins on other devices and the viewer page all see the same data.
     Opened as a plain file: falls back to localStorage in this browser only. */
  const KEY = window.OVERLAY_STORE_KEY || "chouOverlay.v1";
  const PIN_KEY = "syno.adminPin";
  const keyOf = n => String(n || "").trim().toLowerCase();
  const defaults = () => ({
    wins: CFG.defaults.wins, losses: CFG.defaults.losses, streak: 0,
    showQueue: true, showBanner: true, playing: [], queue: [], members: {},
    live: { running: false, start: 0, acc: 0 }, yt: { viewers: null, at: 0 }, rev: 0, updated: 0
  });
  // upgrade older saves (queue entries with name/games) to members + balance
  function normalize(s) {
    s.members = s.members || {};
    s.live = Object.assign({ running: false, start: 0, acc: 0 }, s.live || {});
    s.yt = Object.assign({ viewers: null, at: 0 }, s.yt || {});
    const fix = e => {
      if (e.key) return e;
      const k = keyOf(e.name); if (!k) return null;
      if (!s.members[k]) s.members[k] = { name: e.name, bal: Math.max(1, e.left || e.games || 1) };
      return { id: e.id || uid("p"), key: k };
    };
    s.playing = (s.playing || []).map(fix).filter(Boolean);
    s.queue = (s.queue || []).map(fix).filter(Boolean);
    return s;
  }
  const liveElapsed = (s, nowMs = Date.now()) => {
    const L = s.live || {}; return Math.max(0, (L.acc || 0) + (L.running ? nowMs - (L.start || nowMs) : 0));
  };
  const Store = {
    state: null, subs: [], bc: null, remote: false, pendingUntil: 0,
    read() { try { const r = localStorage.getItem(KEY); if (r) return normalize(Object.assign(defaults(), JSON.parse(r))); } catch (e) {} return null; },
    init() {
      if (this.state) return;
      this.state = this.read() || normalize(defaults());
      try { this.bc = new BroadcastChannel(KEY); this.bc.onmessage = e => { if (!this.remote) this.apply(e.data); }; } catch (e) {}
      window.addEventListener("storage", e => { if (e.key === KEY && !this.remote) this.apply(this.read()); });
      setInterval(() => { if (!this.remote) this.apply(this.read()); }, 1500);
      if (/^https?:$/.test(location.protocol) && !window.OVERLAY_STORE_KEY) this.connect();
    },
    connect() {
      fetch("api/state", { cache: "no-store" }).then(r => r.ok ? r.text() : Promise.reject(r.status)).then(txt => {
        this.remote = true;
        if (txt && txt.trim()) this.onRemote(txt, true); else this.push(this.state);
        setInterval(() => this.pull(), 700);
        window.dispatchEvent(new CustomEvent("ov-remote", { detail: true }));
      }).catch(() => window.dispatchEvent(new CustomEvent("ov-remote", { detail: false })));
    },
    pull() { fetch("api/state", { cache: "no-store" }).then(r => r.ok ? r.text() : "").then(t => this.onRemote(t)).catch(() => {}); },
    onRemote(txt, force) {
      if (!txt || !txt.trim()) return;
      let s; try { s = normalize(Object.assign(defaults(), JSON.parse(decodeURIComponent(txt)))); } catch (e) { return; }
      if (!force && Date.now() < this.pendingUntil && (s.updated || 0) < (this.state.updated || 0)) return; // our write not landed yet
      this.apply(s);
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    },
    pin() { try { return localStorage.getItem(PIN_KEY) || ""; } catch (e) { return ""; } },
    push(s) {
      const pin = this.pin();
      fetch("api/state", { method: "POST", headers: pin ? { "X-Pin": pin } : {}, body: encodeURIComponent(JSON.stringify(s)) })
        .then(r => window.dispatchEvent(new CustomEvent("ov-auth", { detail: r.status !== 401 })))
        .catch(() => {});
    },
    apply(s) { if (!s || s.rev === this.state.rev) return; const prev = this.state; this.state = s; this.subs.forEach(f => f(s, prev)); },
    set(mut) {
      const s = JSON.parse(JSON.stringify(this.state)); mut(s);
      s.rev = Date.now() + Math.random(); s.updated = Date.now();
      const prev = this.state; this.state = s;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
      if (this.remote) { this.pendingUntil = Date.now() + 2500; this.push(s); }
      else { try { this.bc && this.bc.postMessage(s); } catch (e) {} }
      this.subs.forEach(f => f(s, prev));
    },
    on(f) { this.subs.push(f); }
  };

  /* ---------- queue, VIP balance, W/L, timer ---------- */
  const inLine = (s, k) => s.playing.some(p => p.key === k) || s.queue.some(p => p.key === k);
  const Q = {
    fillSlots(s) {
      const max = CFG.mabar.maxPlaying;
      while (s.playing.length < max && s.queue.length) {
        const e = s.queue.shift(), m = s.members[e.key];
        if (m && m.bal > 0) s.playing.push(e);
      }
    },
    // top up a VIP (creates the member) and put them in the queue
    add(name, games, join = true) {
      name = String(name || "").trim().slice(0, 18); const k = keyOf(name); if (!k) return;
      games = Math.max(0, Math.min(99, parseInt(games, 10) || 0));
      Store.set(s => {
        const m = s.members[k] || (s.members[k] = { name, bal: 0 });
        m.name = name; m.bal += games;
        if (join && m.bal > 0 && !inLine(s, k)) s.queue.push({ id: uid("p"), key: k });
        Q.fillSlots(s);
      });
    },
    join(k) { Store.set(s => { const m = s.members[k]; if (m && m.bal > 0 && !inLine(s, k)) s.queue.push({ id: uid("p"), key: k }); Q.fillSlots(s); }); },
    addBal(k, d) { Store.set(s => { const m = s.members[k]; if (!m) return; m.bal = Math.max(0, m.bal + d); if (m.bal === 0) { s.playing = s.playing.filter(p => p.key !== k); s.queue = s.queue.filter(p => p.key !== k); } Q.fillSlots(s); }); },
    setBal(k, v) { Store.set(s => { const m = s.members[k]; if (!m) return; m.bal = Math.max(0, parseInt(v, 10) || 0); if (m.bal === 0) { s.playing = s.playing.filter(p => p.key !== k); s.queue = s.queue.filter(p => p.key !== k); } Q.fillSlots(s); }); },
    delMember(k) { Store.set(s => { delete s.members[k]; s.playing = s.playing.filter(p => p.key !== k); s.queue = s.queue.filter(p => p.key !== k); Q.fillSlots(s); }); },
    endGame(result) {
      Store.set(s => {
        if (result === "W") { s.wins++; s.streak = s.streak > 0 ? s.streak + 1 : 1; }
        if (result === "L") { s.losses++; s.streak = s.streak < 0 ? s.streak - 1 : -1; }
        s.playing.forEach(p => { const m = s.members[p.key]; if (m) m.bal = Math.max(0, m.bal - 1); });
        s.playing = s.playing.filter(p => (s.members[p.key] || {}).bal > 0);
        Q.fillSlots(s);
      });
    },
    wl(k, d) { Store.set(s => { s[k] = Math.max(0, (s[k] || 0) + d); if (d > 0) s.streak = k === "wins" ? (s.streak > 0 ? s.streak + 1 : 1) : (s.streak < 0 ? s.streak - 1 : -1); }); },
    remove(id) { Store.set(s => { s.playing = s.playing.filter(p => p.id !== id); s.queue = s.queue.filter(p => p.id !== id); Q.fillSlots(s); }); },
    up(id) { Store.set(s => { const i = s.queue.findIndex(p => p.id === id); if (i > 0) { const [x] = s.queue.splice(i, 1); s.queue.splice(i - 1, 0, x); } }); },
    playNow(id) { Store.set(s => { const i = s.queue.findIndex(p => p.id === id); if (i >= 0 && s.playing.length < CFG.mabar.maxPlaying) s.playing.push(s.queue.splice(i, 1)[0]); }); },
    clear() { Store.set(s => { s.playing = []; s.queue = []; }); },
    patch(obj) { Store.set(s => Object.assign(s, obj)); },
    timer(act) {
      Store.set(s => {
        const L = s.live, t = Date.now();
        if (act === "start" && !L.running) { L.running = true; L.start = t; }
        else if (act === "pause" && L.running) { L.acc = (L.acc || 0) + t - L.start; L.running = false; }
        else if (act === "reset") { L.running = false; L.acc = 0; L.start = 0; }
        else if (act === "restart") { L.running = true; L.acc = 0; L.start = t; }
      });
    }
  };
  const fmtTime = ms => { const x = Math.floor(ms / 1000), h = Math.floor(x / 3600), m = Math.floor(x / 60) % 60, sec = x % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`; };

  /* ---------- layouts (1080x1920) ----------
     slots = holes where OBS sources show through. Put your camera / game
     sources at exactly these x, y, w, h (see README). */
  const LAYOUTS = {
    1: {
      name: "Klasik",
      band: 560,
      slots: [
        { id: "face", x: 0, y: 0, w: 1080, h: 560 },
        { id: "game", x: 0, y: 588, w: 1080, h: 608 },
        { id: "hand", x: 540, y: 1216, w: 504, h: 284, cut: 22 }
      ],
      panels: [
        { type: "queue", x: 36, y: 1216, w: 484, h: 492 },
        { type: "stats", x: 540, y: 1540, w: 504, h: 168 }
      ],
      tags: [{ slot: "hand", corner: "bl" }]
    },
    2: {
      name: "Mabar",
      band: 470,
      slots: [
        { id: "face", x: 0, y: 0, w: 652, h: 470 },
        { id: "hand", x: 666, y: 14, w: 400, h: 225, cut: 18 },
        { id: "game", x: 0, y: 498, w: 1080, h: 608 }
      ],
      panels: [
        { type: "stats", variant: "mini", x: 666, y: 272, w: 400, h: 184 },
        { type: "queue", variant: "wide", x: 36, y: 1124, w: 1008, h: 584 }
      ],
      tags: [{ slot: "hand", corner: "bl" }]
    },
    3: {
      name: "Solo Push",
      band: 520,
      slots: [
        { id: "face", x: 0, y: 0, w: 1080, h: 520 },
        { id: "game", x: 0, y: 548, w: 1080, h: 760 },
        { id: "hand", x: 540, y: 1326, w: 504, h: 284, cut: 22 }
      ],
      panels: [
        { type: "stats", variant: "tall", x: 36, y: 1326, w: 484, h: 382 },
        { type: "strip", x: 540, y: 1644, w: 504, h: 64 }
      ],
      tags: [{ slot: "hand", corner: "bl" }]
    }
  };
  LAYOUTS[4] = {
    name: "Arena",
    band: 584,
    bannerY: 1220,                 // banner terus di bawah gameplay
    energy: [612, 1220],
    slots: [
      { id: "face", x: 0, y: 0, w: 1080, h: 584, frame: false },
      { id: "game", x: 0, y: 612, w: 1080, h: 608, frame: false },
      { id: "hand", x: 548, y: 1430, w: 508, h: 286, cut: 16, optional: true }
    ],
    panels: [
      { type: "queue", variant: "compact", x: 24, y: 1430, w: 500, h: 292 },
      { type: "music", x: 24, y: 1742, w: 500, h: 116 },
      { type: "score", x: 548, y: 1756, w: 508, h: 108 }
    ],
    tags: [{ slot: "hand" }]
  };
  const THEMES = {
    red: { a: "#ff2346", hi: "#ff7088", glow: "255,35,70", deep: "150,0,24", ember: "255,190,170", bg: ["#0d0507", "#1c070d", "#080305"] },
    violet: { a: "#7b2cff", hi: "#b98aff", glow: "123,44,255", deep: "255,35,80", ember: "205,170,255", bg: ["#0d0716", "#140a25", "#09050f"] }
  };
  const TH = THEMES[CFG.theme] || THEMES.violet;
  const SLOT_NAMES = { face: "FACECAM", game: "GAMEPLAY", hand: "HANDCAM" };
  // copy a layout, dropping the optional handcam when ?hand=0
  function resolveLayout(n, opts) {
    const L = JSON.parse(JSON.stringify(LAYOUTS[n] || LAYOUTS[1]));
    if (opts.hand === false) { L.slots = L.slots.filter(s => !s.optional); L.tags = L.tags.filter(t => L.slots.some(s => s.id === t.slot)); }
    return L;
  }

  function slotPath(r, inset = 0) {
    const x = r.x + inset, y = r.y + inset, w = r.w - inset * 2, h = r.h - inset * 2, c = r.cut ? Math.max(0, r.cut - inset * .4) : 0;
    if (!c) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return `M${x + c} ${y}H${x + w}V${y + h - c}L${x + w - c} ${y + h}H${x}V${y + c}Z`;
  }
  function crescent(id, cx, cy, R, fillAttr, extra = "") {
    return `<mask id="${id}"><rect x="${cx - R - 2}" y="${cy - R - 2}" width="${R * 2 + 4}" height="${R * 2 + 4}" fill="#fff"/>` +
      `<circle cx="${cx + R * .42}" cy="${cy - R * .2}" r="${R * .84}" fill="#000"/></mask>` +
      `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${fillAttr}" mask="url(#${id})" ${extra}/>`;
  }

  function bgSVG(L) {
    const m = uid("holes"), c1 = uid("cr"), g = uid("g");
    const holes = L.slots.map(s => `<path d="${slotPath(s)}" fill="#000"/>`).join("");
    return `<svg class="ov-layer" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<defs>
 <linearGradient id="${g}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${TH.bg[0]}"/><stop offset=".55" stop-color="${TH.bg[1]}"/><stop offset="1" stop-color="${TH.bg[2]}"/></linearGradient>
 <radialGradient id="${g}b" cx=".08" cy=".82" r=".55"><stop offset="0" stop-color="${TH.a}" stop-opacity=".3"/><stop offset="1" stop-color="${TH.a}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${g}c" cx=".98" cy=".7" r=".45"><stop offset="0" stop-color="#ff2350" stop-opacity=".2"/><stop offset="1" stop-color="#ff2350" stop-opacity="0"/></radialGradient>
 <linearGradient id="${g}d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b98aff" stop-opacity=".16"/><stop offset="1" stop-color="#ff2350" stop-opacity=".05"/></linearGradient>
 <pattern id="${g}h" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="1.6" height="18" fill="${TH.hi}" fill-opacity=".06"/></pattern>
 <filter id="${g}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .075 0"/></filter>
 <mask id="${m}"><rect width="${W}" height="${H}" fill="#fff"/>${holes}</mask>
</defs>
<g mask="url(#${m})">
 <rect width="${W}" height="${H}" fill="url(#${g}a)"/>
 <rect width="${W}" height="${H}" fill="url(#${g}b)"/>
 <rect width="${W}" height="${H}" fill="url(#${g}c)"/>
 <rect width="${W}" height="${H}" fill="url(#${g}h)"/>
 <rect width="${W}" height="${H}" filter="url(#${g}n)"/>
 ${L.chatSafe ? `<linearGradient id="${g}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050309" stop-opacity=".78"/><stop offset=".75" stop-color="#050309" stop-opacity=".45"/><stop offset="1" stop-color="#050309" stop-opacity="0"/></linearGradient>
 <rect x="${L.chatSafe.x}" y="${L.chatSafe.y}" width="${L.chatSafe.w}" height="${L.chatSafe.h}" fill="url(#${g}s)"/>` : ""}
</g>
</svg>`;
  }

  function frameSVG(L) {
    const f = uid("blur");
    let out = "";
    for (const s of L.slots) {
      if (s.frame === false) continue;
      const d = slotPath(s, 1.5);
      out += `<path class="ov-frame-base" d="${d}"/>`;
      out += `<path class="ov-laser glow v" d="${d}" pathLength="1000" style="filter:url(#${f})"/>`;
      out += `<path class="ov-laser glow r" d="${d}" pathLength="1000" style="filter:url(#${f})"/>`;
      out += `<path class="ov-laser v" d="${d}" pathLength="1000"/><path class="ov-laser r" d="${d}" pathLength="1000"/>`;
      out += `<path class="ov-laser core" d="${d}" pathLength="1000"/><path class="ov-laser core r" d="${d}" pathLength="1000"/>`;
      // HUD corner brackets
      const k = 28, i = 12, x0 = s.x + i, y0 = s.y + i, x1 = s.x + s.w - i, y1 = s.y + s.h - i;
      const cuts = s.cut ? [`M${x1 - k} ${y0}H${x1}V${y0 + k}`, `M${x0} ${y1 - k}V${y1}H${x0 + k}`]
        : [`M${x0} ${y0 + k}V${y0}H${x0 + k}`, `M${x1 - k} ${y0}H${x1}V${y0 + k}`, `M${x1} ${y1 - k}V${y1}H${x1 - k}`, `M${x0 + k} ${y1}H${x0}V${y1 - k}`];
      if (s.id === "hand") out += cuts.map(p => `<path class="ov-corner" d="${p}"/>`).join("");
    }
    return `<svg class="ov-layer" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<defs><filter id="${f}" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5"/></filter></defs>${out}</svg>`;
  }


  /* ---------- animated backdrop: purple/crimson smoke + embers, masked out of the camera holes ---------- */
  function bgFx(L) {
    const c = el("canvas", "ov-layer ov-bgfx"); c.width = 270; c.height = 480;
    const holes = L.slots.map(s => slotPath(s)).join("");
    const mask = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path fill-rule="evenodd" d="M0 0H${W}V${H}H0Z${holes}"/></svg>`);
    c.style.webkitMaskImage = c.style.maskImage = `url("${mask}")`;
    c.style.webkitMaskSize = c.style.maskSize = "100% 100%";
    const ctx = c.getContext("2d"); let last = -1;
    const LOOP = 24;
    tickers.push(t => {
      if (manualT == null && t - last < 1 / 30) return; last = t;
      ctx.clearRect(0, 0, 270, 480);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 18; i++) {
        const r1 = rnd(i + 2001), r2 = rnd(i + 2101), r3 = rnd(i + 2201);
        const x = frac(r1 + t * (1 + (i % 2)) / LOOP) * 360 - 45;
        const y = 300 + r2 * 180 + Math.sin(t / LOOP * TAU * (1 + (i % 3)) + i) * 26;
        const rad = 40 + r3 * 60, red = i % 3 === 0;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, red ? `rgba(${TH.deep},.08)` : `rgba(${TH.glow},.10)`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 40; i++) {
        const ph = frac(t * (2 + Math.floor(rnd(i + 2301) * 4)) / LOOP + rnd(i + 2401));
        const x = rnd(i + 2501) * 270 + Math.sin(ph * TAU * 2 + i) * 6;
        const y = 480 - ph * 300;
        if (L.chatSafe && x < (L.chatSafe.w / 4) && y > L.chatSafe.y / 4) continue;
        const a = Math.sin(ph * Math.PI) * .8;
        ctx.fillStyle = i % 4 ? `rgba(${TH.ember},${a})` : `rgba(255,110,140,${a})`;
        ctx.fillRect(x, y, 1.2, 1.2);
      }
      const sw = frac(t / 8), sx = sw * 600 - 200;
      const g = ctx.createLinearGradient(sx, 0, sx + 90, 60);
      g.addColorStop(0, "rgba(185,138,255,0)"); g.addColorStop(.5, "rgba(185,138,255,.05)"); g.addColorStop(1, "rgba(185,138,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 270, 480);
      ctx.globalCompositeOperation = "source-over";
    });
    return c;
  }

  /* ---------- panels ---------- */
  const chipsHTML = () => CFG.mabar.prices.map(p => `<span class="ov-chip"><span>${p.note ? `${esc(p.qty)} <b>${esc(p.price)}</b>${esc(p.note)}` : `<b>${esc(p.price)}</b> / ${esc(p.qty)}`}</span></span>`).join("");
  const hintHTML = () => esc(CFG.mabar.joinHint).replace(/&quot;(.*?)&quot;/, "<b>&quot;$1&quot;</b>");
  const svcHTML = () => CFG.services.map(v => `<div><span>${esc(v.label)}</span><b>${esc(v.price)}</b></div>`).join("");

  const mem = (s, p) => s.members[p.key] || { name: p.key, bal: 0 };
  function queueHTML(s, variant, prevIds) {
    const wide = variant === "wide", compact = variant === "compact";
    const max = CFG.mabar.maxPlaying, full = s.playing.length >= max;
    const isNew = id => (prevIds && !prevIds.has(id) ? " is-new" : "");
    let slots = "";
    for (let i = 0; i < max; i++) {
      const p = s.playing[i];
      if (p) { const m = mem(s, p); slots += `<li class="slot${isNew(p.id)}"><span class="ix">${i + 1}</span><span class="nm">${esc(m.name)}</span><span class="bal">${m.bal}<small>G</small></span></li>`; }
      else slots += `<li class="slot is-empty"><span class="ix">${i + 1}</span><span class="nm">SLOT KOSONG</span></li>`;
    }
    const lim = wide ? 6 : compact ? 4 : 3;
    let next = s.queue.slice(0, lim).map((p, i) =>
      `<li class="nx${isNew(p.id)}"><span class="no">${String(i + 1).padStart(2, "0")}</span><span class="nm">${esc(mem(s, p).name)}</span><span class="g">${mem(s, p).bal}G</span></li>`).join("");
    if (s.queue.length > lim) next += `<li class="nx more">+${s.queue.length - lim} LAGI</li>`;
    const nextBlock = s.queue.length ? `<ol>${next}</ol>` : `<p class="q-empty">${full ? "Queue kosong" : "Slot masih ada"}</p>`;
    return `<div class="q-head"><div><div class="q-open${full ? " full" : ""}">${full ? "PENUH · MASUK QUEUE" : "SLOT DIBUKA"}</div><h3 class="ov-h">${esc(CFG.mabar.title)}</h3></div><div class="q-prices">${chipsHTML()}</div></div>
<div class="q-cols"><section><h4 class="ov-lbl">Sedang main <i>${s.playing.length}/${max}</i></h4><ol class="slots">${slots}</ol></section>
<section><h4 class="ov-lbl">Queue <i>${s.queue.length}</i></h4>${nextBlock}</section></div>`;
  }

  function pricesHTML() {
    const pr = CFG.mabar.prices.map(p => `<div class="pr"><span>${esc(p.qty)}</span><b>${esc(p.price)}</b></div>`).join("");
    return `<div class="q-head"><div><div class="q-open">BUKA SEKARANG</div><h3 class="ov-h">${esc(CFG.mabar.title)}</h3></div></div>
<div class="pr-list">${pr}</div>
<h4 class="ov-lbl">Servis lain</h4><div class="svc">${svcHTML()}</div>`;
  }

  function statsHTML(s) {
    const tot = s.wins + s.losses, wr = tot ? Math.round(s.wins / tot * 100) : 0;
    const streak = s.streak >= 2 ? `<span class="streak on">WIN STREAK ${s.streak}</span>` : s.streak <= -2 ? `<span class="streak on lose">LOSE ${-s.streak} BERTURUT</span>` : "";
    return `<div class="wl"><div class="w"><small>WIN</small><b data-k="wins">${s.wins}</b></div><span class="slash">/</span><div class="l"><small>LOSE</small><b data-k="losses">${s.losses}</b></div></div>
<div class="rate"><div class="bar"><i style="width:${wr}%"></i></div><span>WR ${wr}%</span>${streak}</div>
<div class="svc">${svcHTML()}</div>`;
  }

  function stripHTML() {
    return `<h3 class="ov-h">${esc(CFG.mabar.title)}</h3><div class="chips">${chipsHTML()}</div>`;
  }


  /* ---------- Arena: W/L scoreboard ---------- */
  function scoreSVG(s) {
    const u = uid("sb"), tot = s.wins + s.losses, wr = tot ? Math.round(s.wins / tot * 100) : 0;
    const fs = v => String(v).length >= 3 ? 56 : 74;
    const num = (v, x, anchor, k, grad, dark) => `<g class="sb-n" data-k="${k}">
<text x="${x + 3}" y="91" text-anchor="${anchor}" style="font-family:var(--f-disp);font-size:${fs(v)}px" fill="${dark}">${v}</text>
<text x="${x}" y="88" text-anchor="${anchor}" style="font-family:var(--f-disp);font-size:${fs(v)}px;paint-order:stroke" stroke="#07050c" stroke-width="6" stroke-linejoin="round" fill="url(#${u}${grad})">${v}</text>
<clipPath id="${u}c${k}"><text x="${x}" y="88" text-anchor="${anchor}" style="font-family:var(--f-disp);font-size:${fs(v)}px">${v}</text></clipPath>
<rect class="sb-sheen" x="-140" y="10" width="34" height="100" fill="#fff" opacity=".6" transform="skewX(-20)" clip-path="url(#${u}c${k})"/></g>`;
    const streak = s.streak >= 2 ? `<g transform="translate(40 12)"><polygon points="0,-10 104,-10 98,10 -6,10" fill="#ffcf4a"/><text x="49" y="5" text-anchor="middle" style="font-family:var(--f-hud);font-weight:700;font-size:13px;letter-spacing:2px" fill="#07050c">WIN STREAK ${s.streak}</text></g>` : "";
    return `<svg viewBox="0 0 508 108" aria-hidden="true"><defs>
<linearGradient id="${u}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0b12"/><stop offset="1" stop-color="#0b0507"/></linearGradient>
<linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#ffe7a6"/><stop offset="1" stop-color="#ffb800"/></linearGradient>
<linearGradient id="${u}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#ffc0ca"/><stop offset="1" stop-color="#ff2346"/></linearGradient>
<linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ff2346"/></linearGradient>
<filter id="${u}g" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3"/></filter></defs>
<polygon points="14,16 240,16 230,104 4,104" fill="url(#${u}p)"/>
<polygon class="sb-edge" points="14,16 240,16 230,104 4,104" fill="none" stroke="#ffcf4a" stroke-width="6" filter="url(#${u}g)"/>
<polygon points="14,16 240,16 230,104 4,104" fill="none" stroke="#ffcf4a" stroke-width="2"/>
<polygon points="268,16 494,16 504,104 278,104" fill="url(#${u}p)"/>
<polygon class="sb-edge" points="268,16 494,16 504,104 278,104" fill="none" stroke="#ff2346" stroke-width="6" filter="url(#${u}g)"/>
<polygon points="268,16 494,16 504,104 278,104" fill="none" stroke="#ff2346" stroke-width="2"/>
<text x="26" y="74" style="font-family:var(--f-shout);font-style:italic;font-weight:900;font-size:30px" fill="#ffcf4a">WIN</text>
<text x="490" y="74" text-anchor="end" style="font-family:var(--f-shout);font-style:italic;font-weight:900;font-size:30px" fill="#ff2346">LOSE</text>
${num(s.wins, 214, "end", "wins", "w", "#6b4a00")}
${num(s.losses, 294, "start", "losses", "l", "#6a0012")}
<polygon class="sb-bolt" points="262,10 244,58 256,58 246,108 272,52 260,52 272,10" fill="url(#${u}b)" stroke="#07050c" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="254" cy="60" r="19" fill="#07050c" stroke="#f3eee8" stroke-width="2.5"/>
<text x="253" y="67" text-anchor="middle" style="font-family:var(--f-shout);font-style:italic;font-weight:900;font-size:17px" fill="#f3eee8">VS</text>
${streak}
<text x="494" y="10" text-anchor="end" style="font-family:var(--f-hud);font-weight:700;font-size:12px;letter-spacing:3px" fill="rgba(243,238,232,.65)">WR ${wr}%</text>
</svg>`;
  }

  function welcomeSVG() {
    const u = uid("wc");
    return `<svg viewBox="0 0 500 214" aria-hidden="true"><defs>
<linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#e2d0ff"/><stop offset="1" stop-color="#8a45ff"/></linearGradient>
<clipPath id="${u}c"><text x="6" y="200" style="font-family:var(--f-disp);font-size:150px;letter-spacing:2px">STREAM</text></clipPath></defs>
<g class="wl-float">
<text x="13" y="70" style="font-family:var(--f-shout);font-style:italic;font-weight:900;font-size:46px;paint-order:stroke" stroke="#ff2350" stroke-width="10" stroke-linejoin="round" fill="#ff2350">WELCOME TO MY</text>
<text x="10" y="66" style="font-family:var(--f-shout);font-style:italic;font-weight:900;font-size:46px;paint-order:stroke" stroke="#07050c" stroke-width="8" stroke-linejoin="round" fill="#f3eee8">WELCOME TO MY</text>
<text x="16" y="210" style="font-family:var(--f-disp);font-size:150px;letter-spacing:2px" fill="#07050c">STREAM</text>
<text x="11" y="205" style="font-family:var(--f-disp);font-size:150px;letter-spacing:2px" fill="#ff2350">STREAM</text>
<text x="6" y="200" style="font-family:var(--f-disp);font-size:150px;letter-spacing:2px;paint-order:stroke" stroke="#07050c" stroke-width="9" stroke-linejoin="round" fill="url(#${u}g)">STREAM</text>
<rect class="sb-sheen" x="-140" y="60" width="50" height="150" fill="#fff" opacity=".5" transform="skewX(-20)" clip-path="url(#${u}c)"/>
</g></svg>`;
  }

  /* ---------- Arena: energy lines on the gameplay edges ---------- */
  function energyLayer(L) {
    const u = uid("en");
    const lines = L.energy.map((y, i) => `<g class="en" data-y="${y}" data-i="${i}">
<rect x="0" y="${y - 9}" width="${W}" height="18" fill="url(#${u}v)" opacity=".75" class="en-glow"/>
<path class="en-wave" fill="none" stroke="${TH.hi}" stroke-width="3" filter="url(#${u}b)"/>
<path class="en-wave2" fill="none" stroke="${CFG.theme === "red" ? "#ffb35c" : "#ff2350"}" stroke-width="2" opacity=".8"/>
<rect x="0" y="${y - 1.5}" width="${W}" height="3" fill="#f6efff"/>
<path class="en-arc" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="bevel" filter="url(#${u}a)"/>
<circle class="en-spark" r="6" cy="${y}" fill="#fff" filter="url(#${u}a)"/></g>`).join("");
    const wrap = el("div", "ov-layer");
    wrap.innerHTML = `<svg class="ov-layer" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><defs>
<linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${TH.a}" stop-opacity="0"/><stop offset=".5" stop-color="${TH.a}" stop-opacity=".9"/><stop offset="1" stop-color="${TH.a}" stop-opacity="0"/></linearGradient>
<filter id="${u}b" x="-5%" y="-200%" width="110%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="${u}a" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${lines}</svg>`;
    const groups = [...wrap.querySelectorAll(".en")];
    let last = -1;
    tickers.push(t => {
      if (manualT == null && t - last < 1 / 30) return; last = t;
      groups.forEach(g => {
        const y = +g.dataset.y, i = +g.dataset.i, dir = i === 0 ? -1 : 1;
        let d1 = "", d2 = "";
        for (let x = 0; x <= W; x += 24) {
          const a = Math.sin(x * .017 + t * TAU / 6 + i) * 3.2 + Math.sin(x * .043 - t * TAU / 4) * 2;
          const b = Math.sin(x * .023 - t * TAU / 8 + i * 2) * 3 + Math.sin(x * .061 + t * TAU / 3) * 1.4;
          d1 += (x ? "L" : "M") + x + " " + (y + a).toFixed(1);
          d2 += (x ? "L" : "M") + x + " " + (y + b).toFixed(1);
        }
        g.querySelector(".en-wave").setAttribute("d", d1);
        g.querySelector(".en-wave2").setAttribute("d", d2);
        // short lightning arc every 3 s, pointing away from the gameplay
        const k = Math.floor(t / 3), lt = t - k * 3, arc = g.querySelector(".en-arc");
        if (lt < .32) {
          let x0 = 80 + rnd(k * 7 + i * 31) * 920, yy = y, d = `M${x0.toFixed(1)} ${y}`;
          for (let j = 1; j <= 6; j++) { x0 += (rnd(k * 13 + j + i * 5) - .5) * 34; yy += dir * (6 + rnd(k * 17 + j) * 8); d += `L${x0.toFixed(1)} ${yy.toFixed(1)}`; }
          arc.setAttribute("d", d); arc.setAttribute("opacity", (1 - lt / .32).toFixed(3));
        } else arc.setAttribute("opacity", "0");
        const sp = g.querySelector(".en-spark"), f = frac(t / 6 + i * .5);
        sp.setAttribute("cx", (i ? W + 60 - f * (W + 120) : f * (W + 120) - 60).toFixed(1));
        g.querySelector(".en-glow").setAttribute("opacity", (.55 + .25 * Math.sin(t * TAU / 4 + i * Math.PI)).toFixed(3));
      });
    });
    return wrap;
  }

  /* ---------- full overlay ---------- */
  function mount(root, opts = {}) {
    Store.init();
    const L = resolveLayout(opts.layout, opts);
    const stage = el("div", `ov-stage ov-l${opts.layout || 1} theme-${CFG.theme || "violet"}`);

    if (opts.demo) for (const s of L.slots) {
      const d = el("div", "ov-demo"); pos(d, s);
      const img = new Image(); img.alt = "";
      img.onerror = () => { img.remove(); d.classList.add("is-empty"); d.innerHTML = `<span>${SLOT_NAMES[s.id]}</span>`; };
      img.src = (opts.demoBase || "assets/demo/") + s.id + ".jpg";
      d.appendChild(img); stage.appendChild(d);
    }
    stage.insertAdjacentHTML("beforeend", bgSVG(L));
    if (opts.bgfx !== false) stage.appendChild(bgFx(L));
    stage.insertAdjacentHTML("beforeend", frameSVG(L));

    // band between facecam and gameplay
    // band under the facecam: LIVE · stream timer · clock · YouTube viewers
    const band = el("div", "ov-band", `<span class="sweep"></span><span class="live"><span class="dot"></span><span>LIVE</span></span>
<span class="itm timer" hidden><svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 13V9M9 2h6M19 6l-1.5 1.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><b>00:00:00</b></span>
<span class="itm clock">--:--</span>
<span class="itm yt" hidden><svg viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="4" fill="#ff0000"/><path d="M10 9l5 3-5 3z" fill="#fff"/></svg><b></b></span>`);
    band.style.top = L.band + "px"; if (L.band != null) stage.appendChild(band);
    const clock = band.querySelector(".clock"), timerEl = band.querySelector(".timer"), timerTxt = timerEl.querySelector("b");
    const ytEl = band.querySelector(".yt"), ytTxt = ytEl.querySelector("b");
    let lastClock = "", lastTimer = "", lastYt = "";

    // caption under the handcam border
    for (const t of L.tags) {
      const s = L.slots.find(x => x.id === t.slot);
      const cap = el("div", "ov-caption", `<i></i><span>DEVICE: <b>${esc(CFG.device)}</b></span><i></i>`);
      Object.assign(cap.style, { left: s.x + "px", top: (s.y + s.h + 6) + "px", width: s.w + "px" });
      stage.appendChild(cap);
    }

    const panels = L.panels.map(p => {
      const e = el("div", "ov-card"); pos(e, p); stage.appendChild(e);
      return { def: p, e };
    });

    const api = { stage, layout: L, banner: null };
    api.setBanner = (st, acc) => {
      if (api.banner) api.banner.destroy();
      api.banner = st === "none" ? null : mountBanner(stage, { style: st, accent: acc || opts.accent, y: L.bannerY != null ? L.bannerY : BY, inStage: true });
      if (api.banner) api.banner.el.style.display = Store.state.showBanner ? "" : "none";
    };
    api.setBanner(opts.banner || "pro");
    if (L.energy) { const en = energyLayer(L); en.style.zIndex = 4; stage.appendChild(en); }

    function render(s, prev) {
      const prevIds = prev ? new Set(prev.playing.concat(prev.queue).map(p => p.id)) : null;
      for (const { def, e } of panels) {
        const v = def.variant ? " " + def.variant : "";
        if (def.type === "queue") {
          e.className = "ov-card " + (s.showQueue ? "ov-queue" : "ov-prices") + v;
          e.innerHTML = s.showQueue ? queueHTML(s, def.variant, prevIds) : pricesHTML();
        } else if (def.type === "stats") {
          e.className = "ov-card ov-stats" + (def.variant ? " " + def.variant : "");
          e.innerHTML = statsHTML(s);
          if (prev) e.querySelectorAll("b[data-k]").forEach(b => { const k = b.dataset.k; if (prev[k] !== s[k]) b.classList.add("pop"); });
        } else if (def.type === "strip") {
          e.className = "ov-card ov-strip"; e.innerHTML = stripHTML();
        } else if (def.type === "score") {
          e.className = "ov-score"; e.innerHTML = scoreSVG(s);
          if (prev) e.querySelectorAll("[data-k]").forEach(g => { const k = g.dataset.k; if (prev[k] !== s[k]) { g.classList.remove("sb-pop"); void g.getBBox(); g.classList.add("sb-pop"); } });
        } else if (def.type === "welcome") {
          if (!e.firstChild) { e.className = "ov-welcome"; e.innerHTML = welcomeSVG(); }
          e.style.display = s.showWelcome ? "" : "none";
        } else if (def.type === "music") {
          if (!e.firstChild) { e.className = "ov-music"; e.innerHTML = `<div class="mu-tab"><svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg>NOW PLAYING</div>${opts.demo ? `<div class="mu-demo">widget lagu · ${def.w}×${def.h}</div>` : ""}`; }
        }
      }
      if (api.banner) api.banner.el.style.display = s.showBanner ? "" : "none";
    }
    render(Store.state, null);
    Store.on(render);

    tickers.push(t => {
      stage.querySelectorAll(".ov-score svg, .ov-welcome svg").forEach(svg => {
        const sh = svg.querySelectorAll(".sb-sheen");
        sh.forEach((r, i) => r.setAttribute("x", (-140 + seg(frac(t / 8 + i * .12), .05, .3) * 760).toFixed(1)));
        const edge = svg.querySelectorAll(".sb-edge");
        edge.forEach((e, i) => e.setAttribute("stroke-opacity", (.55 + .45 * Math.sin(t * TAU / 4 + i * Math.PI)).toFixed(3)));
        const bolt = svg.querySelector(".sb-bolt");
        if (bolt) { const f = frac(t / 6); bolt.setAttribute("opacity", f < .06 ? (Math.floor(f * 100) % 2 ? ".35" : "1") : ".92"); }
        const fl = svg.querySelector(".wl-float");
        if (fl) fl.setAttribute("transform", `translate(0 ${(Math.sin(t * TAU / 4) * 3).toFixed(2)})`);
      });
    });
    tickers.push(() => {
      if (L.band == null) return;
      const st = Store.state, nowMs = Date.now();
      if (manualT == null) {
        const d = new Date(), c = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
        if (c !== lastClock) { clock.textContent = c; lastClock = c; }
      }
      const el_ = liveElapsed(st, nowMs), tt = el_ > 0 || st.live.running ? fmtTime(el_) : "";
      if (tt !== lastTimer) { timerTxt.textContent = tt; timerEl.hidden = !tt; timerEl.classList.toggle("paused", !st.live.running); lastTimer = tt; }
      const fresh = st.yt && st.yt.viewers != null && nowMs - (st.yt.at || 0) < 180000;
      const yv = fresh ? Number(st.yt.viewers).toLocaleString("en-US") : "";
      if (yv !== lastYt) { ytTxt.textContent = yv; ytEl.hidden = !yv; lastYt = yv; }
    });

    // automation: start the stream timer when OBS starts streaming (browser source needs
    // "Page permissions: Read access to OBS status information" or higher)
    if (!api.autoHooked && window.obsstudio) {
      api.autoHooked = true;
      window.addEventListener("obsStreamingStarted", () => { if (!Store.state.live.running) Q.timer("restart"); });
      window.addEventListener("obsStreamingStopped", () => Q.timer("pause"));
      try { window.obsstudio.getStatus(st => { if (st && st.streaming && !Store.state.live.running && !liveElapsed(Store.state)) Q.timer("start"); }); } catch (e) {}
    }

    root.appendChild(stage);
    return api;
  }

  /* ---------- banner art ---------- */
  const GEM = `<polygon points="10,40 30,16 40,40" fill="#9eeaff"/><polygon points="30,16 70,16 60,40 40,40" fill="#dcf9ff"/>
<polygon points="70,16 90,40 60,40" fill="#63cfff"/><polygon points="10,40 40,40 50,96" fill="#2fa6f2"/>
<polygon points="40,40 60,40 50,96" fill="#5ac7ff"/><polygon points="60,40 90,40 50,96" fill="#1470d2"/>
<polygon points="10,40 30,16 70,16 90,40 50,96" fill="none" stroke="#effcff" stroke-width="2.6" stroke-linejoin="round"/>`;
  const SPARK = `<path d="M0 -12 L2.6 -2.6 L12 0 L2.6 2.6 L0 12 L-2.6 2.6 L-12 0 L-2.6 -2.6Z" fill="#fff"/>`;

  function artSVG(kind) {
    const u = uid("a");
    if (kind === "diamond") return `<svg viewBox="0 0 268 192" data-kind="diamond">
<defs><radialGradient id="${u}g"><stop offset="0" stop-color="#52d8ff" stop-opacity=".75"/><stop offset="1" stop-color="#52d8ff" stop-opacity="0"/></radialGradient>
<clipPath id="${u}c"><polygon points="10,40 30,16 70,16 90,40 50,96"/></clipPath></defs>
<ellipse class="glow" cx="134" cy="98" rx="110" ry="80" fill="url(#${u}g)"/>
<g class="mini m0">${GEM}</g><g class="mini m1">${GEM}</g><g class="mini m2">${GEM}</g>
<g class="gem">${GEM}<g clip-path="url(#${u}c)"><rect class="shine" x="-30" y="0" width="16" height="110" fill="#fff" opacity=".8" transform="skewX(-20)"/></g></g>
<g class="spk s0">${SPARK}</g><g class="spk s1">${SPARK}</g><g class="spk s2">${SPARK}</g><g class="spk s3">${SPARK}</g></svg>`;
    if (kind === "rank") return `<svg viewBox="0 0 268 192" data-kind="rank">
<defs><linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3a62"/><stop offset="1" stop-color="#6d0022"/></linearGradient>
<linearGradient id="${u}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b98aff" stop-opacity=".2"/><stop offset="1" stop-color="#b98aff"/></linearGradient>
<radialGradient id="${u}g"><stop offset="0" stop-color="#ff2350" stop-opacity=".55"/><stop offset="1" stop-color="#ff2350" stop-opacity="0"/></radialGradient></defs>
<ellipse class="glow" cx="134" cy="100" rx="120" ry="84" fill="url(#${u}g)"/>
<g class="chev"><path d="M108 40 L134 22 L160 40" fill="none" stroke="#f3eee8" stroke-width="7" stroke-linejoin="miter"/></g>
<g class="chev c2"><path d="M108 40 L134 22 L160 40" fill="none" stroke="#f3eee8" stroke-width="7"/></g>
<g class="wings"><polygon points="86,64 28,46 52,72 20,80 56,96 32,110 86,114" fill="url(#${u}w)"/>
<polygon points="182,64 240,46 216,72 248,80 212,96 236,110 182,114" fill="url(#${u}w)"/></g>
<path d="M134 40 L180 56 V102 C180 134 160 154 134 168 C108 154 88 134 88 102 V56 Z" fill="url(#${u}s)" stroke="#f3eee8" stroke-width="5" stroke-linejoin="round"/>
<path d="M134 54 L168 66 V102 C168 126 154 142 134 153 C114 142 100 126 100 102 V66 Z" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2"/>
<polygon class="star" points="134,76 141,94 160,95 145,107 150,126 134,115 118,126 123,107 108,95 127,94" fill="#f3eee8"/></svg>`;
    if (kind === "mabar") {
      const hex = Array.from({ length: 6 }, (_, i) => { const a = TAU * i / 6 - Math.PI / 2; return `${134 + 60 * Math.cos(a)},${110 + 60 * Math.sin(a)}`; }).join(" ");
      return `<svg viewBox="0 0 268 192" data-kind="mabar">
<defs><linearGradient id="${u}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b5bff"/><stop offset="1" stop-color="#3a0f7a"/></linearGradient>
<radialGradient id="${u}g"><stop offset="0" stop-color="#7b2cff" stop-opacity=".7"/><stop offset="1" stop-color="#7b2cff" stop-opacity="0"/></radialGradient></defs>
<ellipse class="glow" cx="134" cy="104" rx="120" ry="84" fill="url(#${u}g)"/>
<g class="ring"><polygon points="${hex}" fill="none" stroke="#ff2350" stroke-width="3" stroke-dasharray="14 10"/></g>
<polygon points="${hex}" fill="url(#${u}h)" stroke="#f3eee8" stroke-width="5" stroke-linejoin="round" transform="translate(134 110) scale(.86) translate(-134 -110)"/>
<text x="137" y="131" text-anchor="middle" style="font-family:var(--f-disp);font-size:54px" fill="#ff2350">VIP</text>
<text x="134" y="128" text-anchor="middle" style="font-family:var(--f-disp);font-size:54px" fill="#f3eee8">VIP</text>
<g class="crown"><polygon points="104,52 110,24 123,40 134,16 145,40 158,24 164,52" fill="#ffcf4a" stroke="#07050c" stroke-width="3" stroke-linejoin="round"/>
<circle cx="134" cy="40" r="4.5" fill="#ff2350"/></g></svg>`;
    }
    if (kind === "link") return `<svg viewBox="0 0 268 192" data-kind="link">
<circle class="pulse p0" cx="134" cy="96" r="54" fill="none" stroke="#b98aff" stroke-width="3"/>
<circle class="pulse p1" cx="134" cy="96" r="54" fill="none" stroke="#ff2350" stroke-width="3"/>
<circle cx="134" cy="96" r="54" fill="#07050c" fill-opacity=".7" stroke="#f3eee8" stroke-width="5"/>
<g transform="rotate(-45 134 96)" fill="none" stroke="#f3eee8" stroke-width="8">
<rect x="98" y="84" width="42" height="24" rx="12"/><rect x="128" y="84" width="42" height="24" rx="12" stroke="#ff2350"/></g>
<g class="tap"><path d="M178 132 l26 10 -11 4 9 13 -6 4 -9 -13 -7 9z" fill="#f3eee8" stroke="#07050c" stroke-width="2.5" stroke-linejoin="round"/></g></svg>`;
    if (kind === "album") return `<svg viewBox="0 0 268 192" data-kind="album">
<defs><linearGradient id="${u}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b2cff"/><stop offset="1" stop-color="#ff2350"/></linearGradient>
<radialGradient id="${u}g"><stop offset="0" stop-color="#b98aff" stop-opacity=".55"/><stop offset="1" stop-color="#b98aff" stop-opacity="0"/></radialGradient></defs>
<ellipse class="glow" cx="134" cy="100" rx="118" ry="82" fill="url(#${u}g)"/>
<g class="ph1"><rect x="-44" y="-36" width="88" height="72" rx="6" fill="#f3eee8" stroke="#07050c" stroke-width="3"/><rect x="-36" y="-28" width="72" height="46" fill="url(#${u}p)"/>
<path d="M-36 18 L-12 -6 L4 8 L14 0 L36 18Z" fill="#07050c" opacity=".55"/><circle cx="20" cy="-14" r="6" fill="#ffcf4a"/></g>
<g class="ph2"><rect x="-44" y="-36" width="88" height="72" rx="6" fill="#f3eee8" stroke="#07050c" stroke-width="3"/><rect x="-36" y="-28" width="72" height="46" fill="#241038"/>
<path d="M-36 18 L-16 -2 L-2 10 L12 -8 L36 18Z" fill="#b98aff"/><circle cx="-18" cy="-14" r="5" fill="#f3eee8"/></g>
<g class="bub"><path d="M0 -26 C22 -26 36 -14 36 0 C36 14 22 26 0 26 C-6 26 -12 25 -17 23 L-32 30 L-26 17 C-33 12 -36 6 -36 0 C-36 -14 -22 -26 0 -26Z" fill="#ff2350" stroke="#f3eee8" stroke-width="4"/>
<circle class="d0" cx="-14" cy="0" r="4.5" fill="#fff"/><circle class="d1" cx="0" cy="0" r="4.5" fill="#fff"/><circle class="d2" cx="14" cy="0" r="4.5" fill="#fff"/></g></svg>`;
    return "";
  }

  function animArt(svg, kind, t, LOOP) {
    if (!svg) return;
    const q = c => svg.querySelector(c);
    const qa = c => svg.querySelectorAll(c);
    const pulse = .75 + .25 * Math.sin(t * TAU / 2);
    const glow = q(".glow"); if (glow) glow.setAttribute("opacity", pulse.toFixed(3));
    if (kind === "diamond") {
      const bob = Math.sin(t * TAU / 3) * 6, sx = .78 + .22 * Math.cos(t * TAU / 3);
      q(".gem").setAttribute("transform", `translate(134 ${100 + bob}) scale(${(1.45 * sx).toFixed(3)} 1.45) translate(-50 -56)`);
      const sh = frac(t / 3); q(".shine").setAttribute("x", (-30 + seg(sh, .1, .4) * 150).toFixed(1));
      [[46, 54, 0], [214, 46, .33], [222, 150, .66]].forEach(([x, y, o], i) => {
        const ph = frac(t / 6 + o), yy = y + Math.sin((t / 6 + o) * TAU) * 8;
        q(".m" + i).setAttribute("transform", `translate(${x} ${yy.toFixed(1)}) rotate(${(Math.sin(ph * TAU) * 14).toFixed(1)}) scale(.36) translate(-50 -56)`);
      });
      [[64, 120, 0], [196, 38, .25], [238, 104, .5], [92, 30, .75]].forEach(([x, y, o], i) => {
        const p = frac(t / 2 + o), sc = Math.max(0, Math.sin(p * Math.PI)) * 1.1;
        q(".s" + i).setAttribute("transform", `translate(${x} ${y}) rotate(${(p * 90).toFixed(1)}) scale(${sc.toFixed(3)})`);
      });
    } else if (kind === "rank") {
      qa(".chev").forEach((c, i) => { const p = frac(t / 1.5 + i * .5); c.setAttribute("transform", `translate(0 ${(-p * 26 + 6).toFixed(1)})`); c.setAttribute("opacity", (Math.sin(p * Math.PI)).toFixed(3)); });
      q(".wings").setAttribute("transform", `translate(134 90) scale(${(1 + .04 * Math.sin(t * TAU / 2)).toFixed(3)} 1) translate(-134 -90)`);
      q(".star").setAttribute("transform", `translate(134 101) rotate(${(Math.sin(t * TAU / 4) * 10).toFixed(1)}) translate(-134 -101)`);
    } else if (kind === "mabar") {
      q(".ring").setAttribute("transform", `translate(134 110) rotate(${(t / LOOP * 360 * 2).toFixed(2)}) scale(1.12) translate(-134 -110)`);
      const b = Math.abs(Math.sin(t * TAU / 1.5)) * 7; q(".crown").setAttribute("transform", `translate(0 ${(-b).toFixed(1)}) rotate(${(Math.sin(t * TAU / 3) * 4).toFixed(1)} 134 40)`);
    } else if (kind === "link") {
      qa(".pulse").forEach((c, i) => { const p = frac(t / 2 + i * .5); c.setAttribute("r", (54 + p * 40).toFixed(1)); c.setAttribute("opacity", (1 - p).toFixed(3)); });
      const tp = frac(t / 1.5), press = tp < .2 ? Math.sin(tp / .2 * Math.PI) : 0;
      q(".tap").setAttribute("transform", `translate(${(-press * 6).toFixed(1)} ${(-press * 4).toFixed(1)})`);
    } else if (kind === "album") {
      const sw = Math.sin(t * TAU / 3);
      q(".ph2").setAttribute("transform", `translate(${(150 + sw * 4).toFixed(1)} 104) rotate(${(10 + sw * 4).toFixed(1)})`);
      q(".ph1").setAttribute("transform", `translate(${(112 - sw * 4).toFixed(1)} 96) rotate(${(-12 - sw * 4).toFixed(1)})`);
      const bp = frac(t / 1.5), bb = Math.abs(Math.sin(bp * Math.PI)) * 6;
      q(".bub").setAttribute("transform", `translate(196 ${(50 - bb).toFixed(1)})`);
      [0, 1, 2].forEach(i => q(".d" + i).setAttribute("opacity", (.35 + .65 * Math.max(0, Math.sin((t * 2 - i * .25) * Math.PI))).toFixed(3)));
    }
  }

  function emblemSVG() {
    const u = uid("em");
    return `<svg viewBox="0 0 262 192" aria-hidden="true"><defs>
<linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3eee8"/><stop offset=".55" stop-color="#b98aff"/><stop offset="1" stop-color="#7b2cff"/></linearGradient></defs>
${crescent(u + "m", 118, 86, 70, `url(#${u}g)`, 'class="moon"')}
<text x="112" y="150" text-anchor="middle" style="font-family:var(--f-disp);font-size:76px;letter-spacing:1px" fill="#07050c" transform="translate(4 4)">${esc(brandName())}</text>
<text x="112" y="150" text-anchor="middle" style="font-family:var(--f-disp);font-size:76px;letter-spacing:1px" fill="#f3eee8">${esc(brandName())}</text>
<text x="112" y="176" text-anchor="middle" style="font-family:var(--f-hud);font-weight:700;font-size:15px;letter-spacing:6px" fill="#b98aff">STORE · LINK DI BIO</text></svg>`;
  }

  /* ---------- banner fx (canvas, stateless => loops perfectly) ---------- */
  function drawFx(ctx, style, t, LOOP) {
    ctx.clearRect(0, 0, 1080, 192);
    const cyc = (n, o) => frac(t * n / LOOP + o);
    ctx.globalCompositeOperation = "lighter";
    // purple flame aura behind the character (all styles)
    const flames = style === "flame" ? 80 : 30;
    for (let i = 0; i < flames; i++) {
      const r1 = rnd(i + 1), r2 = rnd(i + 51), r3 = rnd(i + 101), r4 = rnd(i + 151);
      const aura = i < 30;
      const ph = cyc(8 + Math.floor(r1 * 10), r2);
      const x = aura ? 24 + r3 * 220 : r3 * 1080;
      const xx = x + Math.sin((t / LOOP) * TAU * (2 + Math.floor(r4 * 3)) + i) * 12;
      const y = 214 - ph * (aura ? 150 + r4 * 60 : 70 + r4 * 60);
      const rad = (1 - ph) * (aura ? 16 + r4 * 24 : 10 + r4 * 18);
      const a = (1 - ph) * seg(ph, 0, .12) * (aura ? .5 : .32);
      const red = i % 6 === 0;
      const g = ctx.createRadialGradient(xx, y, 0, xx, y, rad);
      g.addColorStop(0, red ? `rgba(255,90,120,${a})` : `rgba(205,160,255,${a})`);
      g.addColorStop(.45, red ? `rgba(255,35,80,${a * .6})` : `rgba(123,44,255,${a * .65})`);
      g.addColorStop(1, "rgba(60,0,140,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(xx, y, rad, 0, TAU); ctx.fill();
    }
    // embers
    for (let i = 0; i < 36; i++) {
      const r1 = rnd(i + 401), r2 = rnd(i + 451), r3 = rnd(i + 501);
      const ph = cyc(4 + Math.floor(r1 * 6), r2);
      const x = (r3 * (style === "flame" ? 1080 : 260)) + Math.sin(ph * TAU * 2 + i) * 10;
      const y = 200 - ph * 220;
      const a = Math.sin(ph * Math.PI) * .9;
      ctx.fillStyle = i % 4 === 0 ? `rgba(255,120,150,${a})` : `rgba(220,190,255,${a})`;
      ctx.fillRect(x, y, 2.4, 2.4);
    }
    ctx.globalCompositeOperation = "source-over";
    if (style === "slash") {
      for (let i = 0; i < 34; i++) {
        const r1 = rnd(i + 601), r2 = rnd(i + 651), r3 = rnd(i + 701), r4 = rnd(i + 751);
        const y = 8 + r1 * 176, len = 80 + r2 * 280, th = 1 + r3 * 4;
        const x = 1500 - cyc(3 + Math.floor(r4 * 5), r1) * 1900;
        ctx.fillStyle = i % 3 === 0 ? "rgba(243,238,232,.22)" : "rgba(7,5,12,.28)";
        ctx.fillRect(x, y, len, th);
      }
    }
    if (style === "moon") {
      for (let i = 0; i < 46; i++) {
        const x = 270 + rnd(i + 801) * 800, y = 8 + rnd(i + 851) * 176;
        const a = .12 + .7 * Math.pow(Math.max(0, Math.sin(cyc(3 + Math.floor(rnd(i + 901) * 6), rnd(i + 951)) * TAU)), 6);
        ctx.fillStyle = `rgba(214,240,255,${a})`;
        const s = rnd(i + 999) > .85 ? 2.6 : 1.6; ctx.fillRect(x, y, s, s);
      }
      const sx = frac(t / 12) * 1700 - 400;
      const g = ctx.createLinearGradient(sx, 0, sx + 300, 0);
      g.addColorStop(0, "rgba(82,216,255,0)"); g.addColorStop(.5, "rgba(82,216,255,.07)"); g.addColorStop(1, "rgba(82,216,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 192);
    }
  }

  /* ---------- banner ---------- */
  function mountBanner(root, opts = {}) {
    Store.init();
    let style = opts.style || "pro";
    if (/^pro/.test(style) && window.ChouOverlay.mountProBanner) return window.ChouOverlay.mountProBanner(root, opts);
    if (/^scene/.test(style) && window.ChouOverlay.mountSceneBanner) return window.ChouOverlay.mountSceneBanner(root, opts);
    if (/^power/.test(style) && window.ChouOverlay.mountPowerBanner) return window.ChouOverlay.mountPowerBanner(root, opts);
    const B = CFG.banner, msgs = B.messages, N = msgs.length, D = B.secondsPerMessage, LOOP = N * D;
    const ch = B.character || {};
    const bn = el("div", "bn bn--" + style);
    bn.style.top = (opts.y || 0) + "px";
    bn.innerHTML = `<div class="bn-bg"></div><canvas class="bn-fx" width="1080" height="192"></canvas>
<div class="bn-char"></div><div class="bn-sep"></div>
${msgs.map(m => `<div class="bn-msg"><div class="bn-kicker">${esc(fill(m.kicker))}</div><div class="bn-main">${esc(fill(m.main))}</div>
<div class="bn-tags">${(m.tags || []).map(x => `<span class="bn-tag"><span>${priceHL(fill(x))}</span></span>`).join("")}</div></div>`).join("")}
${msgs.map(m => `<div class="bn-art">${m.art === "rank" && window.ChouOverlay && window.ChouOverlay.ranks3d ? window.ChouOverlay.ranks.html() : artSVG(m.art)}</div>`).join("")}
<div class="bn-blade"></div><div class="bn-flash"></div>
<div class="bn-edge"><i></i></div><div class="bn-edge bottom"></div>
<div class="bn-ticks">${msgs.map(() => "<i><b></b></i>").join("")}</div>`;
    root.appendChild(bn);

    // character: your PNG, or the crescent emblem if the file is missing
    const charBox = bn.querySelector(".bn-char");
    let charImg = null;
    const useEmblem = () => { charBox.innerHTML = emblemSVG(); charImg = null; };
    if (ch.src) {
      charImg = new Image(); charImg.alt = "";
      charImg.onerror = useEmblem;
      charImg.src = (opts.assetBase || "") + ch.src;
      charBox.appendChild(charImg);
    } else useEmblem();

    const ctx = bn.querySelector(".bn-fx").getContext("2d");
    const msgEls = [...bn.querySelectorAll(".bn-msg")];
    const artEls = [...bn.querySelectorAll(".bn-art")];
    const parts = msgEls.map(m => ({ k: m.querySelector(".bn-kicker"), main: m.querySelector(".bn-main"), tags: [...m.querySelectorAll(".bn-tag")] }));
    const blade = bn.querySelector(".bn-blade"), flash = bn.querySelector(".bn-flash");
    const edgeI = bn.querySelector(".bn-edge i"), ticks = [...bn.querySelectorAll(".bn-ticks b")];

    const fit = () => parts.forEach(p => {
      let fs = 62; p.main.style.fontSize = fs + "px";
      while (p.main.offsetWidth > 500 && fs > 30) { fs -= 2; p.main.style.fontSize = fs + "px"; }
    });
    fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

    function frame(t) {
      if (bn.style.display === "none") return;
      const tl = ((t % LOOP) + LOOP) % LOOP, idx = Math.floor(tl / D), u = tl - idx * D;
      drawFx(ctx, style, t, LOOP);
      for (let i = 0; i < N; i++) {
        const m = msgEls[i], a = artEls[i];
        if (i !== idx) { if (m.style.opacity !== "0") { m.style.opacity = "0"; a.style.opacity = "0"; } continue; }
        const out = eOut(seg(u, D - .45, D - .05));
        m.style.opacity = (1 - out).toFixed(3);
        m.style.transform = `translateY(${(-out * 26).toFixed(1)}px)`;
        const P = parts[i];
        const k = eOut(seg(u, .18, .5));
        P.k.style.opacity = k.toFixed(3); P.k.style.transform = `translateX(${((1 - k) * -50).toFixed(1)}px)`;
        const mm = eOut(seg(u, .1, .46));
        P.main.style.clipPath = `inset(-20px ${((1 - mm) * 100).toFixed(2)}% -20px -20px)`;
        P.main.style.transform = `translateX(${((1 - mm) * -40).toFixed(1)}px)`;
        P.tags.forEach((tg, j) => {
          const p = seg(u, .38 + j * .09, .72 + j * .09);
          tg.style.opacity = Math.min(1, p * 3).toFixed(3);
          tg.style.transform = `skewX(-12deg) scale(${(.5 + .5 * eBack(p)).toFixed(3)})`;
        });
        const ap = seg(u, .2, .8), ae = eBack(ap);
        a.style.opacity = Math.min(1, ap * 3, 1 - out).toFixed(3);
        a.style.transform = `scale(${((.35 + .65 * ae) * (1 - .3 * out)).toFixed(3)}) rotate(${((1 - eOut(ap)) * -18).toFixed(1)}deg)`;
        if (msgs[i].art === "rank" && window.ChouOverlay.ranks3d) window.ChouOverlay.ranks.anim(a.firstElementChild, u, t);
        else animArt(a.firstElementChild, msgs[i].art, t, LOOP);
      }
      const b = seg(u, 0, .5);
      blade.style.transform = `translateX(${(-300 + eOut(b) * 1500).toFixed(1)}px) skewX(-18deg)`;
      blade.style.opacity = b >= 1 ? "0" : "1";
      flash.style.opacity = (u > .1 ? (1 - seg(u, .1, .42)) * .35 : 0).toFixed(3);
      edgeI.style.transform = `translateX(${(frac(t / 4) * 1400 - 240).toFixed(1)}px)`;
      ticks.forEach((tk, i) => { tk.style.width = (i < idx ? 100 : i === idx ? u / D * 100 : 0).toFixed(1) + "%"; });
      if (charImg) {
        const sc = ch.scale || 1;
        charImg.style.transform = `translate(calc(-50% + ${ch.x || 0}px), ${((ch.y || 0) + Math.sin(t * TAU / 6) * 3).toFixed(2)}px) scale(${sc})`;
      } else {
        const moon = charBox.querySelector(".moon");
        if (moon) moon.setAttribute("opacity", (.8 + .2 * Math.sin(t * TAU / 3)).toFixed(3));
      }
    }
    tickers.push(frame);
    frame(now());
    const setStyle = st => { style = st; bn.className = "bn bn--" + st; };
    const destroy = () => { const i = tickers.indexOf(frame); if (i >= 0) tickers.splice(i, 1); bn.remove(); };
    return { el: bn, frame, LOOP, setStyle, destroy };
  }

  /* ---------- fit a 1080-wide stage to its box ---------- */
  function fitStage(stage, box, w = W, h = H) {
    const r = () => {
      const s = Math.min(box.clientWidth / w, (box.clientHeight || 1e9) / h);
      stage.style.transform = `scale(${s})`;
    };
    r(); window.addEventListener("resize", r);
    return r;
  }

  function setTime(t) {
    manualT = t;
    document.getAnimations().forEach(a => { a.pause(); a.currentTime = t * 1000; });
    for (const f of tickers) f(t);
  }

  requestAnimationFrame(loop);
  const util = { el, esc, clamp, seg, eOut, eBack, frac, rnd, TAU, fill, priceHL, uid, tickers, now, drawFx, artSVG, animArt, crescent };
  window.ChouOverlay = { mount, mountBanner, fitStage, setTime, Store, Q, LAYOUTS, CFG, util, keyOf, liveElapsed, fmtTime };
})();
