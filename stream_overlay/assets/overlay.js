/* SYNO stream overlay engine.
   - mount(el, {layout, banner, demo})  -> full 1080x1920 portrait overlay
   - mountBanner(el, {style})           -> 1080x192 bottom banner only
   State (queue, W/L, MMR) is shared between overlay.html and control.html
   through localStorage + BroadcastChannel. */
(function () {
  "use strict";
  const CFG = window.OVERLAY_CONFIG;
  const W = 1080, H = 1920;

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

  /* ---------- shared state ----------
     Served by START_OVERLAY.bat (http): state lives on the PC server (/api/state) so OBS,
     the control app, admins on other devices and the viewer page all see the same data.
     Opened as a plain file: falls back to localStorage in this browser only. */
  const KEY = window.OVERLAY_STORE_KEY || "chouOverlay.v1"; // nama kunci lama dikekalkan supaya data VIP sedia ada tak hilang
  const PIN_KEY = "syno.adminPin";
  const keyOf = n => String(n || "").trim().toLowerCase();
  const defaults = () => ({
    wins: CFG.defaults.wins, losses: CFG.defaults.losses, streak: 0,
    showQueue: true, showBanner: true, playing: [], queue: [], members: {},
    live: { running: false, start: 0, acc: 0 }, yt: { viewers: null, at: 0 }, song: { on: true, manual: "" }, mvp: [], rev: 0, updated: 0
  });
  // upgrade older saves (queue entries with name/games) to members + balance
  function normalize(s) {
    s.members = s.members || {};
    s.orders = s.orders || [];
    s.live = Object.assign({ running: false, start: 0, acc: 0 }, s.live || {});
    s.yt = Object.assign({ viewers: null, at: 0 }, s.yt || {});
    s.song = Object.assign({ on: true, manual: "" }, s.song || {});
    Object.values(s.members).forEach(m => { m.bal = m.bal || 0; m.vbal = m.vbal || 0; });
    s.mvp = Array.isArray(s.mvp) ? s.mvp : [];
    if (!Array.isArray(s.akaun)) s.akaun = defaultAkaun();
    if (typeof s.rules !== "string") s.rules = CFG.rules || "";
    if (typeof s.mvpRules !== "string") s.mvpRules = CFG.mvpRules || "";
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
  const DAYS = ["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"];
  function defaultAkaun() { return [...DAYS, ...DAYS].map(d => ({ day: d, name: "", date: "" })).concat([1, 2, 3].map(() => ({ day: "", name: "", date: "" }))); }
  const tot = m => m ? (m.bal || 0) + (m.vbal || 0) : 0;
  const liveElapsed = (s, nowMs = Date.now()) => {
    const L = s.live || {}; return Math.max(0, (L.acc || 0) + (L.running ? nowMs - (L.start || nowMs) : 0));
  };
  const Store = {
    state: null, subs: [], bc: null, remote: false, pendingUntil: 0, canWrite: true,
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
        setInterval(pullOrders, 3000); setTimeout(pullOrders, 800);
        setInterval(pullCmds, 700);
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
        .then(r => {
          if (r.status === 401) { // rejected: drop the local change and reload the real state
            this.canWrite = false; this.pendingUntil = 0;
            fetch("api/state", { cache: "no-store" }).then(x => x.text()).then(t => this.onRemote(t, true)).catch(() => {});
          }
          window.dispatchEvent(new CustomEvent("ov-auth", { detail: r.status !== 401 }));
        })
        .catch(() => {});
    },
    apply(s) { if (!s || s.rev === this.state.rev) return; const prev = this.state; this.state = s; this.subs.forEach(f => f(s, prev)); },
    set(mut) {
      if (this.remote && !this.canWrite) { window.dispatchEvent(new CustomEvent("ov-auth", { detail: false })); return; }
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
  const leave = (s, k) => { s.playing = s.playing.filter(p => p.key !== k); s.queue = s.queue.filter(p => p.key !== k); };
  // VVIP (fast track) goes to the front of the queue, behind other VVIP; everyone else to the bottom
  const enqueue = (s, e) => {
    if (e.vip) { let i = 0; while (i < s.queue.length && s.queue[i].vip) i++; s.queue.splice(i, 0, e); } else s.queue.push(e);
  };
  const MAX = () => CFG.mabar.maxPlaying, ROT = () => CFG.mabar.rotateEvery || 0;
  const Q = {
    tot,
    fillSlots(s) {
      while (s.playing.length < MAX() && s.queue.length) {
        const e = s.queue.shift(), m = s.members[e.key];
        if (tot(m) > 0) { e.n = 0; s.playing.push(e); }
      }
    },
    // top up a VIP (creates the member) and put them in the queue.
    // extra: { mlid: "123456 (1234)", at: order time in ms, src: "sociabuzz", vip: true = VVIP games }
    add(name, games, join = true, extra = {}) {
      name = String(name || "").trim().slice(0, 24); const k = keyOf(name); if (!k) return null;
      games = Math.max(0, Math.min(999, parseInt(games, 10) || 0));
      const at = +extra.at || Date.now(), mlid = String(extra.mlid || "").trim().slice(0, 32);
      Store.set(s => Q._add(s, k, name, games, join, at, mlid, extra.src, { vip: !!extra.vip }));
      return k;
    },
    _add(s, k, name, games, join, at, mlid, src, info = {}) {
      const m = s.members[k] || (s.members[k] = { name, bal: 0, vbal: 0 });
      m.name = name; m.last = at; if (mlid) m.mlid = mlid;
      if (info.vip) { m.vbal = (m.vbal || 0) + games; m.vvip = true; } else m.bal = (m.bal || 0) + games;
      Q._log(s, Object.assign({ key: k, name, mlid: m.mlid || "", games, at, src: src || "manual" }, info));
      const e = s.queue.find(p => p.key === k);
      if (e) { e.at = e.at || at; if (info.vip && !e.vip) { s.queue = s.queue.filter(p => p !== e); e.vip = true; enqueue(s, e); } }
      else if (join && tot(m) > 0 && !s.playing.some(p => p.key === k)) enqueue(s, { id: uid("p"), key: k, at, vip: (m.vbal || 0) > 0 });
      Q.fillSlots(s);
    },
    _log(s, o) { (s.orders = s.orders || []).unshift(Object.assign({ rx: Date.now() }, o)); s.orders = s.orders.slice(0, 200); },
    setMl(k, v) { Store.set(s => { const m = s.members[k]; if (m) m.mlid = String(v || "").trim().slice(0, 32); }); },
    // edit any member field: name, last (order time ms), miss, vvip
    setMember(k, patch) { Store.set(s => { const m = s.members[k]; if (m) Object.assign(m, patch); }); },
    join(k) { Store.set(s => { const m = s.members[k]; if (m && tot(m) > 0 && !inLine(s, k)) enqueue(s, { id: uid("p"), key: k, at: Date.now(), vip: (m.vbal || 0) > 0 }); Q.fillSlots(s); }); },
    addBal(k, d, vip) { Store.set(s => { const m = s.members[k]; if (!m) return; const f = vip ? "vbal" : "bal"; m[f] = Math.max(0, (m[f] || 0) + d); if (vip && d > 0) m.vvip = true; if (!tot(m)) leave(s, k); Q.fillSlots(s); }); },
    setBal(k, v, vip) { Store.set(s => { const m = s.members[k]; if (!m) return; m[vip ? "vbal" : "bal"] = Math.max(0, parseInt(v, 10) || 0); if (!tot(m)) leave(s, k); Q.fillSlots(s); }); },
    delMember(k) { Store.set(s => { delete s.members[k]; leave(s, k); Q.fillSlots(s); }); },
    // game finished: everyone playing pays 1 game (VVIP games first if they came in as VVIP),
    // then the rotation rule: after N games a player makes room, but only if someone is waiting
    endGame(result) {
      let rotated = [];
      Store.set(s => {
        if (result === "W") { s.wins++; s.streak = s.streak > 0 ? s.streak + 1 : 1; }
        if (result === "L") { s.losses++; s.streak = s.streak < 0 ? s.streak - 1 : -1; }
        s.playing.forEach(p => {
          const m = s.members[p.key]; if (!m) return;
          if (p.vip && m.vbal > 0) m.vbal--; else if (m.bal > 0) m.bal--; else if (m.vbal > 0) m.vbal--;
          p.n = (p.n || 0) + 1;
        });
        s.playing = s.playing.filter(p => tot(s.members[p.key]) > 0);
        const waiting = s.queue.filter(p => tot(s.members[p.key]) > 0).length;
        if (ROT() && waiting) {
          const due = s.playing.filter(p => (p.n || 0) >= ROT()).sort((a, b) => (b.n || 0) - (a.n || 0)).slice(0, Math.min(waiting, CFG.mabar.rotateCount || 2));
          due.forEach(p => {
            s.playing = s.playing.filter(x => x !== p); rotated.push((s.members[p.key] || {}).name || p.key);
            if (CFG.mabar.autoRequeue) { p.n = 0; p.at = Date.now(); enqueue(s, p); }
          });
        }
        Q.fillSlots(s);
      });
      return rotated;
    },
    // didn't show up when called: out of the line (balance stays = hutang mabar), penalty on repeat
    noShow(id) {
      let res = null;
      Store.set(s => {
        const e = s.playing.find(p => p.id === id) || s.queue.find(p => p.id === id); if (!e) return;
        const m = s.members[e.key]; leave(s, e.key);
        if (m) {
          m.miss = (m.miss || 0) + 1;
          let pen = m.miss === 2 ? 1 : m.miss >= 3 ? 2 : 0, left = pen;
          const fromB = Math.min(m.bal || 0, left); m.bal -= fromB; left -= fromB; m.vbal = Math.max(0, (m.vbal || 0) - left);
          res = { name: m.name, miss: m.miss, pen };
        }
        Q.fillSlots(s);
      });
      return res;
    },
    /* ---------- MVP list ---------- */
    mvpAdd(name) {
      name = String(name || "").trim().slice(0, 24); if (!name) return;
      Store.set(s => { if (!s.mvp.some(x => keyOf(x.name) === keyOf(name))) s.mvp.push({ id: uid("v"), name, cur: 0, hist: [] }); });
    },
    // +1 / -1 MVP win. VVIP who gets MVP win: free 1 game (VVIP balance)
    mvpBump(id, d) {
      let free = null;
      Store.set(s => {
        const x = s.mvp.find(v => v.id === id); if (!x) return;
        x.cur = Math.max(0, (x.cur || 0) + d);
        const m = s.members[keyOf(x.name)];
        if (d > 0 && CFG.mabar.vvipMvpFree && m && m.vvip) { m.vbal = (m.vbal || 0) + 1; free = m.name; }
      });
      return free;
    },
    // MVP button on a player in the line: +1 in the MVP list (added to the list if new)
    mvpFor(name) {
      name = String(name || "").trim().slice(0, 24); if (!name) return null;
      let out = null;
      Store.set(s => {
        let x = s.mvp.find(v => keyOf(v.name) === keyOf(name));
        if (!x) { x = { id: uid("v"), name: name.toUpperCase(), cur: 0, hist: [] }; s.mvp.push(x); }
        x.cur = (x.cur || 0) + 1;
        const m = s.members[keyOf(name)];
        let free = false;
        if (CFG.mabar.vvipMvpFree && m && m.vvip) { m.vbal = (m.vbal || 0) + 1; free = true; }
        out = { name: x.name, cur: x.cur, free };
      });
      return out;
    },
    mvpSet(id, patch) { Store.set(s => { const x = s.mvp.find(v => v.id === id); if (x) Object.assign(x, patch); }); },
    // close a cycle (5 or 15 reached): the count goes into the history, counter restarts
    mvpClose(id, claimed) { Store.set(s => { const x = s.mvp.find(v => v.id === id); if (x && x.cur > 0) { x.hist.push({ n: x.cur, c: !!claimed }); x.cur = 0; } }); },
    mvpToggle(id, i) { Store.set(s => { const x = s.mvp.find(v => v.id === id); if (x && x.hist[i]) x.hist[i].c = !x.hist[i].c; }); },
    mvpDelHist(id, i) { Store.set(s => { const x = s.mvp.find(v => v.id === id); if (x) x.hist.splice(i, 1); }); },
    mvpDel(id) { Store.set(s => { s.mvp = s.mvp.filter(v => v.id !== id); }); },
    /* ---------- slot mainkan akaun ---------- */
    akaunSet(i, f, v) { Store.set(s => { if (s.akaun[i]) s.akaun[i][f] = String(v || "").slice(0, 40); }); },
    akaunAdd() { Store.set(s => { s.akaun.push({ day: "", name: "", date: "" }); }); },
    akaunDel(i) { Store.set(s => { s.akaun.splice(i, 1); }); },
    akaunReset() { Store.set(s => { s.akaun = defaultAkaun(); }); },
    /* ---------- import the old Google Doc list (once) ---------- */
    importDoc(seed) {
      const out = { members: 0, mvp: 0 };
      Store.set(s => {
        (seed.hutang || []).forEach(r => {
          const name = String(r.name).trim(); let k = keyOf(name); if (!k) return;
          const id = String(r.id || "").trim();
          if (s.members[k] && id && s.members[k].mlid && s.members[k].mlid !== id) k = `${k} #${id}`;
          const m = s.members[k] || (s.members[k] = { name, bal: 0, vbal: 0 });
          if (!m.src) out.members++;
          m.src = "doc"; m.bal = (m.bal || 0) + (r.bal || 0); m.vbal = (m.vbal || 0) + (r.vbal || 0);
          if (r.vvip || r.vbal) m.vvip = true;
          if (id && !m.mlid) m.mlid = id;
          const at = r.at || (r.date ? Date.parse(r.date + "T12:00:00") : 0);
          if (at && !m.last) m.last = at;
        });
        (seed.mvp || []).forEach(r => {
          if (s.mvp.some(x => keyOf(x.name) === keyOf(r.name))) return;
          s.mvp.push({ id: uid("v"), name: r.name, cur: r.cur || 0, hist: (r.hist || []).map(h => ({ n: h.n, c: !!h.c })) }); out.mvp++;
        });
        s.docImported = Date.now();
      });
      return out;
    },
    wl(k, d) { Store.set(s => { s[k] = Math.max(0, (s[k] || 0) + d); if (d > 0) s.streak = k === "wins" ? (s.streak > 0 ? s.streak + 1 : 1) : (s.streak < 0 ? s.streak - 1 : -1); }); },
    remove(id) { Store.set(s => { s.playing = s.playing.filter(p => p.id !== id); s.queue = s.queue.filter(p => p.id !== id); Q.fillSlots(s); }); },
    toBottom(id) { Store.set(s => { const i = s.queue.findIndex(p => p.id === id); if (i >= 0) { const [x] = s.queue.splice(i, 1); s.queue.push(x); } }); },
    up(id) { Store.set(s => { const i = s.queue.findIndex(p => p.id === id); if (i > 0) { const [x] = s.queue.splice(i, 1); s.queue.splice(i - 1, 0, x); } }); },
    playNow(id) { Store.set(s => { const i = s.queue.findIndex(p => p.id === id); if (i >= 0 && s.playing.length < CFG.mabar.maxPlaying) { const e = s.queue.splice(i, 1)[0]; e.n = 0; s.playing.push(e); } }); },
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
  /* ---------- quick actions: App buttons, ?do= links and Stream Deck (/api/do/<action>) ---------- */
  const ACTIONS = {
    "win": () => Q.wl("wins", 1), "lose": () => Q.wl("losses", 1),
    "win-1": () => Q.wl("wins", -1), "lose-1": () => Q.wl("losses", -1),
    "end-win": () => Q.endGame("W"), "end-lose": () => Q.endGame("L"), "end": () => Q.endGame("X"),
    "timer-start": () => Q.timer("start"), "timer-pause": () => Q.timer("pause"), "timer-reset": () => Q.timer("reset"),
    "queue-on": () => Q.patch({ showQueue: true }), "queue-off": () => Q.patch({ showQueue: false }),
    "banner-on": () => Q.patch({ showBanner: true }), "banner-off": () => Q.patch({ showBanner: false }),
    "wl-reset": () => Q.patch({ wins: 0, losses: 0, streak: 0 }),
    "win-reset": () => Q.patch({ wins: 0, streak: 0 }), "lose-reset": () => Q.patch({ losses: 0, streak: 0 })
  };
  // Stream Deck presses wait on the PC server; whichever open overlay / app asks first runs them once
  let cmdBusy = false;
  function pullCmds() {
    if (cmdBusy || !Store.remote || !Store.canWrite) return; cmdBusy = true;
    const pin = Store.pin();
    fetch("api/cmds", { cache: "no-store", headers: pin ? { "X-Pin": pin } : {} }).then(r => r.ok ? r.json() : []).then(list => {
      (Array.isArray(list) ? list : []).forEach(c => {
        const f = ACTIONS[c && c.a]; if (!f) return;
        const res = f(); window.dispatchEvent(new CustomEvent("ov-cmd", { detail: { a: c.a, res } }));
      });
    }).catch(() => {}).finally(() => { cmdBusy = false; });
  }

  /* ---------- automatic orders (Sociabuzz webhook -> server -> here) ---------- */
  const SB = Object.assign({ autoQueue: true, toMYR: { MYR: 1, RM: 1 }, packs: [{ rm: 10, games: 3 }, { rm: 4, games: 1 }], immortalPerGame: 6 }, CFG.sociabuzz || {});
  const pick = (o, keys) => { for (const k of keys) if (o[k] != null && String(o[k]).trim() !== "") return o[k]; return null; };
  const num = v => { if (typeof v === "number") return v; const t = String(v || "").replace(/[^\d.,]/g, ""); if (!t) return 0; const n = /[.,]\d{1,2}$/.test(t) ? parseFloat(t.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".")) : parseFloat(t.replace(/[.,]/g, "")); return isNaN(n) ? 0 : n; };
  function parseOrder(entry) {
    let text = "";
    try { text = new TextDecoder().decode(Uint8Array.from(atob(entry.b || ""), c => c.charCodeAt(0))); } catch (e) {}
    let b = {};
    try { b = JSON.parse(text); } catch (e) { try { b = Object.fromEntries(new URLSearchParams(text)); } catch (e2) {} }
    if (b && typeof b.data === "object" && b.data) b = Object.assign({}, b, b.data);
    const name = String(pick(b, ["supporter", "buyer_name", "supporter_name", "name", "nama"]) || "Anonim").trim().slice(0, 24);
    const msg = String(pick(b, ["message", "note", "notes", "buyer_note", "supporter_message", "pesan"]) || "");
    const skip = /^(id|transaction_id|order_id|amount|amount_settled|price|total|currency|currency_settled|created_at|paid_at|date|email|email_supporter|buyer_email|buyer_whatsapp|media_type|media_url|token)$/i;
    const extra = Object.entries(b).filter(([k, v]) => typeof v === "string" && !skip.test(k)).map(([, v]) => v).join(" ");
    // ML ID: "123456789 (1234)", "123456789 1234", "ID: 123456789 Server 1234"
    const ML = /(\d{6,12})(?!\d)\s*(?:[(\[:|\/-]|\b(?:server|zone|sv|srv)\b)?\s*[(\[:]?\s*(\d{3,5})(?!\d)/i;
    const idm = msg.match(ML) || extra.match(ML);
    const mlid = idm ? `${idm[1]} (${idm[2]})` : (((msg + " " + extra).match(/\b\d{6,12}\b/) || [""])[0]);
    const cur = String(pick(b, ["currency_settled", "currency"]) || "MYR").toUpperCase();
    const amount = num(pick(b, ["amount_settled", "amount", "price", "total"]));
    const rm = amount * (SB.toMYR[cur] != null ? SB.toMYR[cur] : 1);
    let games = parseInt(pick(b, ["quantity", "qty", "jumlah"]), 10) || 0;
    const gm = msg.match(/(\d{1,3})\s*(?:x\s*)?(?:game|games|g\b|gem|match|kali)/i);
    if (!games && gm) games = parseInt(gm[1], 10);
    const vip = /\b(vvip|fast\s*track)\b/i.test(msg);
    if (!games && rm > 0) {
      const packs = vip ? (SB.vvipPacks || [{ rm: 20, games: 3 }, { rm: 8, games: 1 }])
        : /immortal/i.test(msg) ? (SB.immortalPacks || [{ rm: SB.immortalPerGame, games: 1 }]) : SB.packs;
      // round to whole ringgit first: Rp 35,000 = RM9.80 counts as RM10 (3 game), not 2
      let rest = Math.round(rm); for (const p of packs) { const n = Math.floor(rest / p.rm + 1e-9); games += n * p.games; rest -= n * p.rm; }
    }
    const at = Date.parse(pick(b, ["created_at", "paid_at", "date"]) || "") || entry.t || Date.now();
    const id = String(pick(b, ["id", "transaction_id", "order_id"]) || `${name}|${amount}|${at}`);
    const test = /ini hanya test notifikasi/i.test(msg) || String(b.email_supporter || "") === "jessica@example.com";
    return { id, name, mlid, games, at, amount, cur, msg: msg.slice(0, 120), test, vip };
  }
  let ordersBusy = false;
  function pullOrders() {
    if (ordersBusy || !Store.remote || !Store.canWrite) return; ordersBusy = true;
    const pin = Store.pin();
    fetch("api/orders", { cache: "no-store", headers: pin ? { "X-Pin": pin } : {} }).then(r => r.ok ? r.json() : []).then(list => {
      if (!list || !list.length) return;
      const orders = list.map(parseOrder);
      Store.set(s => {
        s.seenOrders = s.seenOrders || [];
        for (const o of orders) {
          // Sociabuzz sends the same id on every Test Notification: never drop a test as a duplicate
          if (!o.test && s.seenOrders.includes(o.id)) continue;
          if (!o.test) s.seenOrders.unshift(o.id);
          const info = { amount: o.amount, cur: o.cur, note: o.msg, vip: !!o.vip };
          if (o.test) { Q._log(s, Object.assign({ key: "", name: o.name, mlid: o.mlid, games: 0, at: o.at, src: "test" }, info)); continue; }
          const k = keyOf(o.name);
          if (o.games > 0 && k) Q._add(s, k, o.name, o.games, SB.autoQueue, o.at, o.mlid, "sociabuzz", info);
          else Q._log(s, Object.assign({ key: k, name: o.name, mlid: o.mlid, games: 0, at: o.at, src: "sociabuzz", warn: "Jumlah tak cukup untuk 1 game" }, info));
        }
        s.seenOrders = s.seenOrders.slice(0, 300);
      });
    }).catch(() => {}).finally(() => { ordersBusy = false; });
  }

  /* ---------- song now playing (server reads Spotify on the PC) ---------- */
  const NP = { text: "", started: false, start() {
    if (this.started) return; this.started = true;
    const tick = () => { if (!Store.remote) return; fetch("api/nowplaying", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => { if (j && typeof j.t === "string") NP.text = j.t.trim().slice(0, 120); }).catch(() => {}); };
    setInterval(tick, 3000); setTimeout(tick, 900);
  } };
  const songText = st => !st.song || st.song.on === false ? "" : String(st.song.manual || NP.text || "").trim();

  const fmtTime = ms => { const x = Math.floor(ms / 1000), h = Math.floor(x / 3600), m = Math.floor(x / 60) % 60, sec = x % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`; };

  /* ---------- layout (1080x1920) ----------
     slots = holes where OBS sources show through. Put your camera / game sources at
     exactly these x, y, w, h (see PASANG_OBS.md). Gameplay is 1080x720 (tablet 3:2). */
  const LAYOUTS = {
    1: {
      name: "Utama",
      band: 522,
      bannerY: 1270,                 // banner terus di bawah gameplay
      energy: [550, 1270],
      slots: [
        { id: "face", x: 0, y: 0, w: 1080, h: 522, frame: false },
        { id: "game", x: 0, y: 550, w: 1080, h: 720, frame: false },
        { id: "hand", x: 548, y: 1474, w: 508, h: 286, cut: 16, optional: true }
      ],
      panels: [
        { type: "queue", variant: "compact", x: 24, y: 1474, w: 500, h: 290 },
        { type: "score", x: 548, y: 1798, w: 508, h: 108 }
      ],
      tags: [{ slot: "hand" }]
    }
  };
  const THEMES = {
    red: { a: "#ff2346", hi: "#ff7088", glow: "255,35,70", deep: "150,0,24", ember: "255,190,170", bg: ["#0d0507", "#1c070d", "#080305"] },
    violet: { a: "#7b2cff", hi: "#b98aff", glow: "123,44,255", deep: "255,35,80", ember: "205,170,255", bg: ["#0d0716", "#140a25", "#09050f"] }
  };
  const TH = THEMES[CFG.theme] || THEMES.violet;
  const SLOT_NAMES = { face: "FACECAM", game: "GAMEPLAY", hand: "HANDCAM" };
  // copy a layout, dropping the optional handcam when ?hand=0
  function resolveLayout(n, opts) {
    const L = JSON.parse(JSON.stringify(LAYOUTS[1]));
    if (opts.hand === false) { L.slots = L.slots.filter(s => !s.optional); L.tags = L.tags.filter(t => L.slots.some(s => s.id === t.slot)); }
    return L;
  }

  function slotPath(r, inset = 0) {
    const x = r.x + inset, y = r.y + inset, w = r.w - inset * 2, h = r.h - inset * 2, c = r.cut ? Math.max(0, r.cut - inset * .4) : 0;
    if (!c) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return `M${x + c} ${y}H${x + w}V${y + h - c}L${x + w - c} ${y + h}H${x}V${y + c}Z`;
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
  const chipsHTML = () => CFG.mabar.prices.filter(p => p.overlay !== false).map(p => `<span class="ov-chip"><span>${p.note ? `${esc(p.qty)} <b>${esc(p.price)}</b>${esc(p.note)}` : `<b>${esc(p.price)}</b> / ${esc(p.qty)}`}</span></span>`).join("");
  const svcHTML = () => CFG.services.map(v => `<div><span>${esc(v.label)}</span><b>${esc(v.price)}</b></div>`).join("");

  const mem = (s, p) => s.members[p.key] || { name: p.key, bal: 0 };
  function queueHTML(s, variant, prevIds) {
    const wide = variant === "wide", compact = variant === "compact";
    const max = CFG.mabar.maxPlaying, full = s.playing.length >= max;
    const isNew = id => (prevIds && !prevIds.has(id) ? " is-new" : "");
    let slots = "";
    for (let i = 0; i < max; i++) {
      const p = s.playing[i];
      if (p) { const m = mem(s, p); slots += `<li class="slot${isNew(p.id)}"><span class="ix">${i + 1}</span><span class="nm">${esc(m.name)}</span>${m.mlid ? `<span class="mid">${esc(m.mlid)}</span>` : ""}<span class="bal">${p.vip ? "<i class=\"vv\">★</i>" : ""}${tot(m)}<small>G</small></span></li>`; }
      else slots += `<li class="slot is-empty"><span class="ix">${i + 1}</span><span class="nm">SLOT KOSONG</span></li>`;
    }
    const lim = wide ? 6 : compact ? 2 : 3;
    let next = s.queue.slice(0, lim).map((p, i) =>
      `<li class="nx${isNew(p.id)}"><span class="no">${String(i + 1).padStart(2, "0")}</span><span class="nm">${esc(mem(s, p).name)}</span>${mem(s, p).mlid ? `<span class="mid">${esc(mem(s, p).mlid)}</span>` : ""}<span class="g">${p.vip ? "★" : ""}${tot(mem(s, p))}G</span></li>`).join("");
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

  /* ---------- W/L scoreboard ---------- */
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

  /* ---------- energy lines on the gameplay edges ---------- */
  function energyLayer(L) {
    const u = uid("en");
    const lines = L.energy.map((y, i) => `<g class="en" data-y="${y}" data-i="${i}">
<rect x="0" y="${y - 6}" width="${W}" height="12" fill="url(#${u}v)" opacity=".7" class="en-glow"/>
<path class="en-wave" fill="none" stroke="${TH.hi}" stroke-width="1.6" filter="url(#${u}b)"/>
<path class="en-wave2" fill="none" stroke="${CFG.theme === "red" ? "#ffb35c" : "#ff2350"}" stroke-width="1.2" opacity=".7"/>
<rect x="0" y="${y - 1}" width="${W}" height="2" fill="#f6efff" opacity=".9"/>
<path class="en-arc" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="bevel" filter="url(#${u}a)"/>
${[0, 1].map(j => { const g = (i + j) % 2 ? "L" : "R"; return `<g class="en-beam" data-j="${j}">
 <rect x="-300" y="${y - 3}" width="300" height="6" fill="url(#${u}s${g})" opacity=".55" filter="url(#${u}b)"/>
 <rect x="-300" y="${y - .9}" width="300" height="1.8" fill="url(#${u}s${g})"/>
 <rect x="${g === "R" ? -26 : -300}" y="${y - .6}" width="26" height="1.2" fill="#fff"/></g>`; }).join("")}</g>`).join("");
    const wrap = el("div", "ov-layer");
    wrap.innerHTML = `<svg class="ov-layer" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><defs>
<linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${TH.a}" stop-opacity="0"/><stop offset=".5" stop-color="${TH.a}" stop-opacity=".9"/><stop offset="1" stop-color="${TH.a}" stop-opacity="0"/></linearGradient>
<filter id="${u}b" x="-5%" y="-200%" width="110%" height="500%"><feGaussianBlur stdDeviation="2.2"/></filter>
<linearGradient id="${u}sR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${TH.a}" stop-opacity="0"/><stop offset=".7" stop-color="${TH.hi}" stop-opacity=".8"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
<linearGradient id="${u}sL" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${TH.a}" stop-opacity="0"/><stop offset=".7" stop-color="${TH.hi}" stop-opacity=".8"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
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
        // thin laser beams sliding along the line (two per line, opposite directions)
        g.querySelectorAll(".en-beam").forEach(bm => {
          const j = +bm.dataset.j, right = (i + j) % 2 === 0, f = frac(t / (j ? 4 : 3) + i * .37 + j * .5);
          const x = right ? f * (W + 330) : W + 300 - f * (W + 330) + 300;
          bm.setAttribute("transform", `translate(${x.toFixed(1)} 0)`);
        });
        g.querySelector(".en-glow").setAttribute("opacity", (.55 + .25 * Math.sin(t * TAU / 4 + i * Math.PI)).toFixed(3));
      });
    });
    return wrap;
  }

  /* ---------- full overlay ---------- */
  function mount(root, opts = {}) {
    Store.init();
    const L = resolveLayout(opts.layout, opts);
    const stage = el("div", `ov-stage ov-l1 theme-${CFG.theme || "violet"}`);

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
    // [● LIVE 01:23:45]  (live duration)   ·   [clock 2:04 PM]  (time now)   ·   [YouTube viewers]
    const band = el("div", "ov-band", `<span class="sweep"></span><span class="live"><span class="dot"></span><span>LIVE</span><b class="timer" hidden>00:00:00</b></span>
<span class="itm np" hidden><svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg><span class="npw"><b class="npt"></b></span></span>
<span class="itm clock"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg><b>--:--</b><small></small></span>
<span class="itm yt" hidden><svg viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="4" fill="#ff0000"/><path d="M10 9l5 3-5 3z" fill="#fff"/></svg><b></b></span>`);
    band.style.top = L.band + "px"; if (L.band != null) stage.appendChild(band);
    const clockB = band.querySelector(".clock b"), clockAp = band.querySelector(".clock small"), timerEl = band.querySelector(".timer"), timerTxt = timerEl;
    const ytEl = band.querySelector(".yt"), ytTxt = ytEl.querySelector("b");
    const npEl = band.querySelector(".np"), npW = band.querySelector(".npw"), npT = band.querySelector(".npt");
    let lastClock = "", lastTimer = "", lastYt = "", lastNp = null, npW_ = 0, npTick = 0;
    const NP_SPEED = 40; // px per second, right to left
    // song ticker driven here (not by CSS), so it keeps moving even when Windows / OBS asks for reduced motion
    tickers.push(t => {
      if (!lastNp || !npT.firstChild) return;
      if (!npW_ || ++npTick % 120 === 0) npW_ = npT.firstChild.offsetWidth || 0; // re-measure now and then (fonts load late)
      if (!npW_) return;
      const x = (t * NP_SPEED) % npW_;
      npT.style.transform = `translate3d(${(-x).toFixed(1)}px,0,0)`;
    });
    NP.start();

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
      api.banner = st === "none" ? null : mountBanner(stage, { style: st, accent: acc || opts.accent, y: L.bannerY, inStage: true });
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
        } else if (def.type === "score") {
          e.className = "ov-score"; e.innerHTML = scoreSVG(s);
          if (prev) e.querySelectorAll("[data-k]").forEach(g => { const k = g.dataset.k; if (prev[k] !== s[k]) { g.classList.remove("sb-pop"); void g.getBBox(); g.classList.add("sb-pop"); } });
        } else if (def.type === "music") {
          if (!e.firstChild) { e.className = "ov-music"; e.innerHTML = `<div class="mu-tab"><svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg>NOW PLAYING</div>${opts.demo ? `<div class="mu-demo">widget lagu · ${def.w}×${def.h}</div>` : ""}`; }
        }
      }
      if (api.banner) api.banner.el.style.display = s.showBanner ? "" : "none";
      // thank-you pop when a Sociabuzz order lands
      const o = (s.orders || [])[0], po = prev && (prev.orders || [])[0];
      const pop = o && ((o.src === "sociabuzz" && o.games > 0) || o.src === "sim" || o.src === "test");
      if (prev && pop && (!po || o.rx !== po.rx)) {
        const qc = panels.find(p => p.def.type === "queue");
        if (qc) {
          const al = el("div", "q-alert", `<b>TERIMA KASIH</b><span>${esc(o.name)}</span><i>${o.src === "test" ? "TEST ✓" : `+${o.games} GAME`}</i>`);
          qc.e.parentNode.appendChild(al);
          Object.assign(al.style, { left: qc.def.x + "px", top: (qc.def.y - 26) + "px", width: qc.def.w + "px" });
          setTimeout(() => al.remove(), 6000);
        }
      }
    }
    render(Store.state, null);
    Store.on(render);

    tickers.push(t => {
      stage.querySelectorAll(".ov-score svg").forEach(svg => {
        const sh = svg.querySelectorAll(".sb-sheen");
        sh.forEach((r, i) => r.setAttribute("x", (-140 + seg(frac(t / 8 + i * .12), .05, .3) * 760).toFixed(1)));
        const edge = svg.querySelectorAll(".sb-edge");
        edge.forEach((e, i) => e.setAttribute("stroke-opacity", (.55 + .45 * Math.sin(t * TAU / 4 + i * Math.PI)).toFixed(3)));
        const bolt = svg.querySelector(".sb-bolt");
        if (bolt) { const f = frac(t / 6); bolt.setAttribute("opacity", f < .06 ? (Math.floor(f * 100) % 2 ? ".35" : "1") : ".92"); }
      });
    });
    tickers.push(() => {
      if (L.band == null) return;
      const st = Store.state, nowMs = Date.now();
      if (manualT == null) {
        const d = new Date(), h = d.getHours(), c = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`, ap = h < 12 ? "AM" : "PM";
        if (c + ap !== lastClock) { clockB.textContent = c; clockAp.textContent = ap; lastClock = c + ap; }
      }
      // stream timer is always shown: 00:00:00 (dim) until the live starts
      const tt = fmtTime(liveElapsed(st, nowMs)) + (st.live.running ? "" : "·");
      if (tt !== lastTimer) { timerTxt.textContent = tt.replace("·", ""); timerEl.hidden = false; timerEl.classList.toggle("paused", !st.live.running); lastTimer = tt; }
      const fresh = st.yt && st.yt.viewers != null && nowMs - (st.yt.at || 0) < 180000;
      const yv = fresh ? Number(st.yt.viewers).toLocaleString("en-US") : "";
      if (yv !== lastYt) { ytTxt.textContent = yv; ytEl.hidden = !yv; lastYt = yv; }
      const np = songText(st);
      if (np !== lastNp) {
        // ticker: two copies scroll right to left without a break, short titles too
        lastNp = np; npEl.hidden = !np;
        npT.innerHTML = np ? `<span class="nps">${esc(np)}</span><span class="nps" aria-hidden="true">${esc(np)}</span>` : "";
        npW_ = 0; // re-measure the copy width on the next frame
      }
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

  /* ---------- banner: "power" (default) or "minimal" ---------- */
  function mountBanner(root, opts = {}) {
    Store.init();
    const style = opts.style || "power";
    if (/^(minimal|scene)/.test(style)) return window.ChouOverlay.mountSceneBanner(root, opts);
    return window.ChouOverlay.mountPowerBanner(root, opts);
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
  const util = { el, esc, clamp, seg, eOut, eBack, frac, rnd, TAU, fill, priceHL, uid, tickers, now };
  window.ChouOverlay = { mount, mountBanner, fitStage, setTime, Store, Q, LAYOUTS, CFG, util, keyOf, liveElapsed, fmtTime, parseOrder, NP, songText, ACTIONS };
})();
