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
  const priceHL = s => esc(s).replace(/(RM\s?\d+)/g, "<b>$1</b>");
  let uidN = 0; const uid = p => p + (++uidN) + Math.random().toString(36).slice(2, 5);
  const pos = (e, r) => Object.assign(e.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });

  /* ---------- shared state ---------- */
  const KEY = window.OVERLAY_STORE_KEY || "chouOverlay.v1";
  const defaults = () => ({
    wins: CFG.defaults.wins, losses: CFG.defaults.losses, mmr: CFG.defaults.mmr, globalRank: CFG.defaults.globalRank,
    streak: 0, showQueue: true, showBanner: true, playing: [], queue: [], rev: 0
  });
  const Store = {
    state: null, subs: [], bc: null,
    read() { try { const r = localStorage.getItem(KEY); if (r) return Object.assign(defaults(), JSON.parse(r)); } catch (e) {} return null; },
    init() {
      if (this.state) return;
      this.state = this.read() || defaults();
      try { this.bc = new BroadcastChannel(KEY); this.bc.onmessage = e => this.apply(e.data); } catch (e) {}
      window.addEventListener("storage", e => { if (e.key === KEY) this.apply(this.read()); });
      setInterval(() => this.apply(this.read()), 1500);
    },
    apply(s) { if (!s || s.rev === this.state.rev) return; const prev = this.state; this.state = s; this.subs.forEach(f => f(s, prev)); },
    set(mut) {
      const s = JSON.parse(JSON.stringify(this.state)); mut(s);
      s.rev = Date.now() + Math.random();
      const prev = this.state; this.state = s;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
      try { this.bc && this.bc.postMessage(s); } catch (e) {}
      this.subs.forEach(f => f(s, prev));
    },
    on(f) { this.subs.push(f); }
  };

  /* ---------- queue actions ---------- */
  const Q = {
    fillSlots(s) { const max = CFG.mabar.maxPlaying; while (s.playing.length < max && s.queue.length) s.playing.push(s.queue.shift()); },
    add(name, games) {
      name = String(name || "").trim().slice(0, 18); if (!name) return;
      games = Math.max(1, Math.min(9, parseInt(games, 10) || 1));
      Store.set(s => { s.queue.push({ id: uid("p"), name, games, left: games }); Q.fillSlots(s); });
    },
    endGame(result) {
      Store.set(s => {
        if (result === "W") { s.wins++; s.streak = s.streak > 0 ? s.streak + 1 : 1; }
        if (result === "L") { s.losses++; s.streak = s.streak < 0 ? s.streak - 1 : -1; }
        s.playing.forEach(p => p.left--);
        s.playing = s.playing.filter(p => p.left > 0);
        Q.fillSlots(s);
      });
    },
    remove(id) { Store.set(s => { s.playing = s.playing.filter(p => p.id !== id); s.queue = s.queue.filter(p => p.id !== id); Q.fillSlots(s); }); },
    up(id) { Store.set(s => { const i = s.queue.findIndex(p => p.id === id); if (i > 0) { const [x] = s.queue.splice(i, 1); s.queue.splice(i - 1, 0, x); } }); },
    addGame(id, d) { Store.set(s => { const p = s.playing.concat(s.queue).find(p => p.id === id); if (p) { p.left = Math.max(1, p.left + d); p.games = Math.max(p.games, p.left); } }); },
    clear() { Store.set(s => { s.playing = []; s.queue = []; }); },
    patch(obj) { Store.set(s => Object.assign(s, obj)); }
  };

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
        { type: "stats", x: 540, y: 1518, w: 504, h: 190 }
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
        { type: "stats", variant: "mini", x: 666, y: 254, w: 400, h: 202 },
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
        { type: "strip", x: 540, y: 1624, w: 504, h: 84 }
      ],
      tags: [{ slot: "hand", corner: "bl" }]
    }
  };
  const SLOT_NAMES = { face: "FACECAM", game: "GAMEPLAY", hand: "HANDCAM" };

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
 <linearGradient id="${g}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0716"/><stop offset=".55" stop-color="#140a25"/><stop offset="1" stop-color="#09050f"/></linearGradient>
 <radialGradient id="${g}b" cx=".08" cy=".82" r=".55"><stop offset="0" stop-color="#7b2cff" stop-opacity=".38"/><stop offset="1" stop-color="#7b2cff" stop-opacity="0"/></radialGradient>
 <radialGradient id="${g}c" cx=".98" cy=".7" r=".45"><stop offset="0" stop-color="#ff2350" stop-opacity=".2"/><stop offset="1" stop-color="#ff2350" stop-opacity="0"/></radialGradient>
 <linearGradient id="${g}d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b98aff" stop-opacity=".16"/><stop offset="1" stop-color="#ff2350" stop-opacity=".05"/></linearGradient>
 <pattern id="${g}h" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="1.6" height="18" fill="#b98aff" fill-opacity=".07"/></pattern>
 <filter id="${g}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .075 0"/></filter>
 <mask id="${m}"><rect width="${W}" height="${H}" fill="#fff"/>${holes}</mask>
</defs>
<g mask="url(#${m})">
 <rect width="${W}" height="${H}" fill="url(#${g}a)"/>
 <rect width="${W}" height="${H}" fill="url(#${g}b)"/>
 <rect width="${W}" height="${H}" fill="url(#${g}c)"/>
 <rect width="${W}" height="${H}" fill="url(#${g}h)"/>
 ${crescent(c1, 120, 1600, 330, `url(#${g}d)`)}
 <text x="1100" y="1716" text-anchor="end" style="font-family:var(--f-disp);font-size:430px;letter-spacing:-6px" fill="none" stroke="#b98aff" stroke-opacity=".09" stroke-width="2">CHOU</text>
 <rect width="${W}" height="${H}" filter="url(#${g}n)"/>
</g>
</svg>`;
  }

  function frameSVG(L) {
    const f = uid("blur");
    let out = "";
    for (const s of L.slots) {
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
      if (s.id !== "face") out += cuts.map(p => `<path class="ov-corner" d="${p}"/>`).join("");
    }
    return `<svg class="ov-layer" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<defs><filter id="${f}" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5"/></filter></defs>${out}</svg>`;
  }

  /* ---------- panels ---------- */
  const chipsHTML = () => CFG.mabar.prices.map(p => `<span class="ov-chip"><span><b>${esc(p.price)}</b> / ${esc(p.qty)}</span></span>`).join("");
  const hintHTML = () => esc(CFG.mabar.joinHint).replace(/&quot;(.*?)&quot;/, "<b>&quot;$1&quot;</b>");
  const svcHTML = () => CFG.services.map(v => `<div><span>${esc(v.label)}</span><b>${esc(v.price)}</b></div>`).join("");

  function queueHTML(s, wide, prevIds) {
    const max = CFG.mabar.maxPlaying, full = s.playing.length >= max;
    const isNew = id => (prevIds && !prevIds.has(id) ? " is-new" : "");
    let slots = "";
    for (let i = 0; i < max; i++) {
      const p = s.playing[i];
      if (p) {
        let pips = ""; for (let k = 0; k < p.games; k++) pips += `<i class="${k < p.left ? "on" : ""}"></i>`;
        slots += `<li class="slot${isNew(p.id)}"><span class="ix">${i + 1}</span><span class="nm">${esc(p.name)}</span><span class="pips">${pips}</span></li>`;
      } else slots += `<li class="slot is-empty"><span class="ix">${i + 1}</span><span class="nm">SLOT KOSONG</span></li>`;
    }
    const lim = wide ? 6 : 3;
    let next = s.queue.slice(0, lim).map((p, i) =>
      `<li class="nx${isNew(p.id)}"><span class="no">${String(i + 1).padStart(2, "0")}</span><span class="nm">${esc(p.name)}</span><span class="g">${p.games}G</span></li>`).join("");
    if (wide && s.queue.length > lim) next += `<li class="nx more">+${s.queue.length - lim} LAGI DALAM QUEUE</li>`;
    const nextBlock = s.queue.length ? `<ol>${next}</ol>` : `<p class="q-empty">${full ? "Queue kosong. Jadi yang pertama!" : "Slot masih ada. Terus masuk main!"}</p>`;
    return `<div class="ghost" style="right:-8px;top:${wide ? 30 : 70}px;font-size:${wide ? 170 : 150}px;writing-mode:vertical-rl">八稚女</div>
<div class="q-head"><div><div class="q-open${full ? " full" : ""}">${full ? "PENUH · MASUK QUEUE" : "SLOT DIBUKA"}</div><h3 class="ov-h">${esc(CFG.mabar.title)}</h3></div><div class="q-prices">${chipsHTML()}</div></div>
<div class="q-cols"><section><h4 class="ov-lbl">Sedang main <i>${s.playing.length}/${max}</i></h4><ol>${slots}</ol></section>
<section><h4 class="ov-lbl">Queue <i>${s.queue.length}</i></h4>${nextBlock}</section></div>
<div class="q-foot">${hintHTML()}</div>`;
  }

  function pricesHTML() {
    const pr = CFG.mabar.prices.map(p => `<div class="pr"><span>${esc(p.qty)}</span><b>${esc(p.price)}</b></div>`).join("");
    return `<div class="ghost" style="right:-8px;top:70px;font-size:150px;writing-mode:vertical-rl">八稚女</div>
<div class="q-head"><div><div class="q-open">BUKA SEKARANG</div><h3 class="ov-h">${esc(CFG.mabar.title)}</h3></div></div>
<div class="pr-list">${pr}</div>
<h4 class="ov-lbl">Servis lain</h4><div class="svc">${svcHTML()}</div>
<div class="q-foot">TOPUP DIAMOND &amp; JOKI RANK · <b>LINK DI BIO</b></div>`;
  }

  function statsHTML(s) {
    const tot = s.wins + s.losses, wr = tot ? Math.round(s.wins / tot * 100) : 0;
    const streak = s.streak >= 2 ? `<span class="streak on">WIN STREAK ${s.streak}</span>` : s.streak <= -2 ? `<span class="streak on lose">LOSE ${-s.streak} BERTURUT</span>` : "";
    return `<div class="tagline"><span class="ov-lbl">${esc(CFG.server)}</span><h3 class="ov-h">${esc(CFG.status)}</h3></div>
<div class="wl"><div class="w"><small>WIN</small><b data-k="wins">${s.wins}</b></div><span class="slash">/</span><div class="l"><small>LOSE</small><b data-k="losses">${s.losses}</b></div></div>
<div class="side"><div class="kv"><small>MMR</small><b data-k="mmr">${s.mmr}</b></div><div class="kv"><small>GLOBAL</small><b data-k="globalRank">#${s.globalRank}</b></div></div>
<div class="rate"><div class="bar"><i style="width:${wr}%"></i></div><span>WR ${wr}%</span>${streak}</div>
<div class="svc">${svcHTML()}</div>
<div class="dev">DEVICE · ${esc(CFG.device)}</div>`;
  }

  function stripHTML() {
    return `<h3 class="ov-h">${esc(CFG.mabar.title)}</h3><div class="chips">${chipsHTML()}</div>`;
  }

  /* ---------- full overlay ---------- */
  function mount(root, opts = {}) {
    Store.init();
    const L = LAYOUTS[opts.layout] || LAYOUTS[1];
    const stage = el("div", "ov-stage ov-l" + (opts.layout || 1));

    if (opts.demo) for (const s of L.slots) {
      const d = el("div", "ov-demo"); pos(d, s);
      const img = new Image(); img.alt = "";
      img.onerror = () => { img.remove(); d.classList.add("is-empty"); d.innerHTML = `<span>${SLOT_NAMES[s.id]}</span>`; };
      img.src = (opts.demoBase || "assets/demo/") + s.id + ".jpg";
      d.appendChild(img); stage.appendChild(d);
    }
    stage.insertAdjacentHTML("beforeend", bgSVG(L));
    stage.insertAdjacentHTML("beforeend", frameSVG(L));

    // band between facecam and gameplay
    const band = el("div", "ov-band", `<span class="sweep"></span><span class="live"><span class="dot"></span><span>LIVE</span></span>
<span>${esc(CFG.status)}</span><span class="sep"></span><span>${esc(CFG.server)}</span><span class="sep"></span><span class="clock">--:--</span>`);
    band.style.top = L.band + "px"; stage.appendChild(band);
    const clock = band.querySelector(".clock"); let lastClock = "";

    for (const t of L.tags) {
      const s = L.slots.find(x => x.id === t.slot);
      const tag = el("div", "ov-tag", `${SLOT_NAMES[s.id]} <em>${esc(CFG.device)}</em>`);
      tag.style.left = (s.x + (s.cut || 0) + 6) + "px"; tag.style.top = (s.y + s.h - 40) + "px";
      stage.appendChild(tag);
    }

    const panels = L.panels.map(p => {
      const e = el("div", "ov-card"); pos(e, p); stage.appendChild(e);
      return { def: p, e };
    });

    const api = { stage, layout: L, banner: null };
    api.setBanner = st => {
      if (api.banner) api.banner.destroy();
      api.banner = st === "none" ? null : mountBanner(stage, { style: st, y: BY, inStage: true });
      if (api.banner) api.banner.el.style.display = Store.state.showBanner ? "" : "none";
    };
    api.setBanner(opts.banner || "pro");

    function render(s, prev) {
      const prevIds = prev ? new Set(prev.playing.concat(prev.queue).map(p => p.id)) : null;
      for (const { def, e } of panels) {
        const wide = def.variant === "wide";
        if (def.type === "queue") {
          e.className = "ov-card " + (s.showQueue ? "ov-queue" : "ov-prices") + (wide ? " wide" : "");
          e.innerHTML = s.showQueue ? queueHTML(s, wide, prevIds) : pricesHTML();
        } else if (def.type === "stats") {
          e.className = "ov-card ov-stats" + (def.variant ? " " + def.variant : "");
          e.innerHTML = statsHTML(s);
          if (prev) e.querySelectorAll("b[data-k]").forEach(b => { const k = b.dataset.k; if (prev[k] !== s[k]) b.classList.add("pop"); });
        } else if (def.type === "strip") {
          e.className = "ov-card ov-strip"; e.innerHTML = stripHTML();
        }
      }
      if (api.banner) api.banner.el.style.display = s.showBanner ? "" : "none";
    }
    render(Store.state, null);
    Store.on(render);

    tickers.push(() => {
      if (manualT != null) return;
      const d = new Date(), c = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      if (c !== lastClock) { clock.textContent = c; lastClock = c; }
    });

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
    }
  }

  function emblemSVG() {
    const u = uid("em");
    return `<svg viewBox="0 0 262 192" aria-hidden="true"><defs>
<linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3eee8"/><stop offset=".55" stop-color="#b98aff"/><stop offset="1" stop-color="#7b2cff"/></linearGradient></defs>
${crescent(u + "m", 118, 86, 70, `url(#${u}g)`, 'class="moon"')}
<text x="206" y="30" style="font-family:var(--f-brush);font-size:30px;writing-mode:vertical-rl;letter-spacing:4px" fill="#ff2350">八稚女</text>
<text x="112" y="150" text-anchor="middle" style="font-family:var(--f-disp);font-size:76px;letter-spacing:1px" fill="#07050c" transform="translate(4 4)">CHOU</text>
<text x="112" y="150" text-anchor="middle" style="font-family:var(--f-disp);font-size:76px;letter-spacing:1px" fill="#f3eee8">CHOU</text>
<text x="112" y="176" text-anchor="middle" style="font-family:var(--f-hud);font-weight:700;font-size:15px;letter-spacing:6px" fill="#b98aff">KOF · MAIN HERO</text></svg>`;
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
    const B = CFG.banner, msgs = B.messages, N = msgs.length, D = B.secondsPerMessage, LOOP = N * D;
    const ch = B.character || {};
    const bn = el("div", "bn bn--" + style);
    bn.style.top = (opts.y || 0) + "px";
    bn.innerHTML = `<div class="bn-bg"></div><canvas class="bn-fx" width="1080" height="192"></canvas>
<div class="bn-char"></div><div class="bn-sep"></div>
${msgs.map(m => `<div class="bn-msg"><div class="bn-kicker">${esc(fill(m.kicker))}</div><div class="bn-main">${esc(fill(m.main))}</div>
<div class="bn-tags">${(m.tags || []).map(x => `<span class="bn-tag"><span>${priceHL(fill(x))}</span></span>`).join("")}</div></div>`).join("")}
${msgs.map(m => `<div class="bn-art">${artSVG(m.art)}</div>`).join("")}
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
        animArt(a.firstElementChild, msgs[i].art, t, LOOP);
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
  window.ChouOverlay = { mount, mountBanner, fitStage, setTime, Store, Q, LAYOUTS, CFG, util };
})();
