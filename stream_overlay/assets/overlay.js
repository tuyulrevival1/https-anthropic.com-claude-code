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
    showQueue: true, showBanner: true, mabarClosed: false, hide: { p: {}, l: {} }, playing: [], queue: [], members: {},
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
    s.album = Array.isArray(s.album) ? s.album : [];
    s.songs = Array.isArray(s.songs) ? s.songs : [];
    s.songCfg = Object.assign({ autopause: CFG.songs ? CFG.songs.autoPauseSpotify !== false : true, resumeMin: CFG.songs && CFG.songs.resumeAfterMin != null ? CFG.songs.resumeAfterMin : 4, show: true, detect: true, player: (CFG.songs && CFG.songs.player) || "indofinity" }, s.songCfg || {});
    if (!Array.isArray(s.akaun)) s.akaun = defaultAkaun();
    s.akaun.forEach(r => { const m = String(r.date || "").match(/^(\d{1,2})\/(\d{1,2})$/); if (m) r.date = `${new Date().getFullYear()}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; });
    if (typeof s.rules !== "string") s.rules = CFG.rules || "";
    s.rules = s.rules.replace(/5 game RM20/gi, "6 game RM20"); // harga lama yang dah tersimpan
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
        // fast change check (~7x a second): fetch the full state / Stream Deck commands only when something changed.
        // Older server without /api/rev: plain polling every 700 ms.
        let lastRev = null, revBusy = false, legacy = false, lastFull = 0;
        setInterval(() => {
          if (legacy || revBusy) return; revBusy = true;
          fetch("api/rev", { cache: "no-store" }).then(r => { if (r.status === 404) { legacy = true; return null; } return r.ok ? r.json() : null; }).then(j => {
            if (!j) return;
            if (j.s !== lastRev || Date.now() - lastFull > 5000) { lastRev = j.s; lastFull = Date.now(); this.pull(); }
            if (j.c > 0) pullCmds();
          }).catch(() => {}).finally(() => { revBusy = false; });
        }, 150);
        setInterval(() => { if (legacy) { this.pull(); pullCmds(); } }, 700);
        setInterval(pullOrders, 3000); setTimeout(pullOrders, 800);
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
    set(mut, opt) {
      if (this.remote && !this.canWrite) { window.dispatchEvent(new CustomEvent("ov-auth", { detail: false })); return; }
      const s = JSON.parse(JSON.stringify(this.state)); mut(s);
      if (!(opt && opt.noHist)) this._record(this.state, s);
      s.rev = Date.now() + Math.random(); s.updated = Date.now();
      const prev = this.state; this.state = s;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
      if (this.remote) { this.pendingUntil = Date.now() + 2500; this.push(s); }
      else { try { this.bc && this.bc.postMessage(s); } catch (e) {} }
      this.subs.forEach(f => f(s, prev));
    },
    on(f) { this.subs.push(f); },
    /* ---------- undo / redo (changes made on this device) ----------
       Each change remembers the top-level fields it touched; undo(fields) reverts the latest
       change touching any of those fields (one card's own history), redo puts it back. */
    hist: [], redoList: [], nextLabel: "",
    _record(prev, s) {
      const keys = Object.keys(s).filter(k => !HIST_SKIP.has(k) && JSON.stringify(prev[k]) !== JSON.stringify(s[k]));
      if (!keys.length) return;
      const pick = o => JSON.parse(JSON.stringify(keys.reduce((a, k) => (a[k] = o[k], a), {})));
      this.hist.push({ id: uid("h"), at: Date.now(), label: this.nextLabel || "", keys, before: pick(prev), after: pick(s) });
      if (this.hist.length > 80) this.hist.shift();
      this.redoList = this.redoList.filter(e => !e.keys.some(k => keys.includes(k)));
      this.nextLabel = "";
      window.dispatchEvent(new CustomEvent("ov-hist"));
    },
    _find(list, fields) { for (let i = list.length - 1; i >= 0; i--) if (!fields || list[i].keys.some(k => fields.includes(k))) return i; return -1; },
    peek(kind, fields) { const L = kind === "undo" ? this.hist : this.redoList, i = this._find(L, fields); return i < 0 ? null : L[i]; },
    undo(fields) { return this._step(this.hist, this.redoList, fields, "before"); },
    redo(fields) { return this._step(this.redoList, this.hist, fields, "after"); },
    _step(from, to, fields, side) {
      if (this.remote && !this.canWrite) return null;
      const i = this._find(from, fields); if (i < 0) return null;
      const e = from.splice(i, 1)[0];
      this.set(st => { e.keys.forEach(k => { st[k] = JSON.parse(JSON.stringify(e[side][k])); }); }, { noHist: true });
      to.push(e); window.dispatchEvent(new CustomEvent("ov-hist"));
      return e;
    }
  };
  const HIST_SKIP = new Set(["rev", "updated", "seenOrders", "orderSeq", "yt", "docImported", "songResumeAt", "songLast", "songNow", "spotAuto"]); // album / akaun changes stay undoable

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
    _log(s, o) { (s.orders = s.orders || []).unshift(Object.assign({ rx: Date.now() + Math.random() }, o)); s.orders = s.orders.slice(0, 200); },
    // suggested games for an order row in the App
    orderGames(o) { return o.games || packGames(rmOf(o)) || 1; },
    // move an order somewhere else: first take back what it gave before (games / album row / akaun slot),
    // then give it to the new place. to = mabar | queue | vvip | album | akaun | none
    orderMove(rx, to, games) {
      let res = null;
      Store.set(s => {
        const o = (s.orders || []).find(x => x.rx === rx); if (!o) return;
        if (o.games > 0 && o.key && s.members[o.key]) {
          const m = s.members[o.key]; let left = o.games;
          const f1 = o.vip ? "vbal" : "bal", f2 = o.vip ? "bal" : "vbal";
          const a = Math.min(m[f1] || 0, left); m[f1] = (m[f1] || 0) - a; left -= a;
          m[f2] = Math.max(0, (m[f2] || 0) - left);
          if (!tot(m)) leave(s, o.key);
        }
        if (o.svc === "album") {
          const al = s.album || [], i = al.findIndex(x => o.albumId ? x.id === o.albumId : x.name === o.name && x.at === o.at);
          if (i >= 0) al.splice(i, 1);
        }
        if (o.svc === "akaun") {
          const r = (s.akaun || []).slice().reverse().find(x => String(x.name || "") === String(o.name || "").slice(0, 40));
          if (r) r.name = "";
        }
        o.games = 0; o.svc = ""; o.vip = false; o.albumId = ""; o.warn = "";
        const name = o.name || "Anonim", k = keyOf(name), n = Math.max(1, parseInt(games, 10) || 1);
        if (to === "mabar" || to === "queue" || to === "vvip") {
          const m = s.members[k] || (s.members[k] = { name, bal: 0, vbal: 0 });
          if (o.mlid && !m.mlid) m.mlid = o.mlid;
          m.last = Date.now();
          if (to === "vvip") { m.vbal = (m.vbal || 0) + n; m.vvip = true; o.vip = true; } else m.bal = (m.bal || 0) + n;
          o.games = n; o.key = k;
          const e = s.queue.find(p => p.key === k);
          if (to === "vvip" && e && !e.vip) { s.queue = s.queue.filter(p => p !== e); e.vip = true; enqueue(s, e); }
          else if (to !== "mabar" && !e && !s.playing.some(p => p.key === k)) enqueue(s, { id: uid("p"), key: k, at: Date.now(), vip: to === "vvip" });
          Q.fillSlots(s);
        } else if (to === "album") { o.svc = "album"; o.albumId = Q._albumAdd(s, name, o.mlid, albumNote(o.note), o.at, o.src || "sociabuzz"); }
        else if (to === "akaun") { o.svc = "akaun"; Q._akaunBook(s, name, o.at); }
        o.moved = to; res = { name, to, games: o.games };
      });
      return res;
    },
    // show / hide a part of the overlay, separately for portrait (p) and landscape (l)
    hideSet(o, k, v) { Store.set(s => { s.hide = s.hide || {}; s.hide[o] = Object.assign({}, s.hide[o] || {}, { [k]: !!v }); }); },
    setMl(k, v) { Store.set(s => { const m = s.members[k]; if (m) m.mlid = String(v || "").trim().slice(0, 32); }); },
    // role in the party: EXP / JUNGLE / MID / GOLD / ROAM (tap again to clear)
    setRole(k, r) { Store.set(s => { const m = s.members[k]; if (m) m.role = m.role === r ? "" : r; }); },
    // edit any member field: name, last (order time ms), miss, vvip
    setMember(k, patch) { Store.set(s => { const m = s.members[k]; if (m) Object.assign(m, patch); }); },
    join(k) { Store.set(s => { const m = s.members[k]; if (m && tot(m) > 0 && !inLine(s, k)) enqueue(s, { id: uid("p"), key: k, at: Date.now(), vip: (m.vbal || 0) > 0 }); Q.fillSlots(s); }); },
    addBal(k, d, vip) { Store.set(s => { const m = s.members[k]; if (!m) return; const f = vip ? "vbal" : "bal"; m[f] = Math.max(0, (m[f] || 0) + d); if (vip && d > 0) m.vvip = true; if (d > 0) m.last = Date.now(); if (!tot(m)) leave(s, k); Q.fillSlots(s); }); },
    setBal(k, v, vip) { Store.set(s => { const m = s.members[k]; if (!m) return; const f = vip ? "vbal" : "bal", nv = Math.max(0, parseInt(v, 10) || 0); if (nv > (m[f] || 0)) m.last = Date.now(); m[f] = nv; if (!tot(m)) leave(s, k); Q.fillSlots(s); }); },
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
    /* ---------- song requests ---------- */
    _song(s, r) {
      s.songs = s.songs || [];
      const open = s.songs.filter(x => !x.done);
      const step = ((s.songCfg || {}).resumeMin || 0) * 60000;
      if (r.kind === "skip") { const cur = open[open.length - 1]; if (cur) { cur.done = true; cur.doneAt = Date.now(); } Q._songIdle(s); return; }
      if (r.kind === "revoke") {
        const mine = open.filter(x => keyOf(x.user) === keyOf(r.user) && (!r.title || x.title.toLowerCase().includes(r.title.toLowerCase())));
        const last = mine[0];
        if (last) { s.songs = s.songs.filter(x => x !== last); if (s.songResumeAt) s.songResumeAt = Math.max(Date.now() + 1000, s.songResumeAt - step); }
        Q._songIdle(s); return;
      }
      if (!r.title) return;
      s.songs.unshift({ id: uid("s"), user: r.user, title: r.title, at: r.at, done: false });
      s.songs = s.songs.slice(0, 60);
      const cfg = s.songCfg || {};
      if (cfg.autopause !== false) {
        songPause = true;
        if (cfg.resumeMin > 0) s.songResumeAt = Math.max(Date.now(), s.songResumeAt || 0) + cfg.resumeMin * 60000;
      }
    },
    // no request left waiting: let Spotify come back right away
    _songIdle(s) { if (s.songResumeAt && !(s.songs || []).some(x => !x.done)) s.songResumeAt = 1; },
    songDone(id) { Store.set(s => { const x = (s.songs || []).find(v => v.id === id); if (x) { x.done = !x.done; x.doneAt = x.done ? Date.now() : 0; } Q._songIdle(s); }); },
    songDel(id) { Store.set(s => { s.songs = (s.songs || []).filter(v => v.id !== id); Q._songIdle(s); }); },
    songClearDone() { Store.set(s => { s.songs = (s.songs || []).filter(v => !v.done); }); },
    songCfg(patch) { Store.set(s => { s.songCfg = Object.assign({}, s.songCfg || {}, patch); }); },
    spotify(act) { if (act === "play") Store.set(s => { s.songResumeAt = 0; }, { noHist: true }); return spotify(act); },
    /* ---------- komen album (RM5) ---------- */
    _albumAdd(s, name, mlid, note, at, src) {
      s.album = s.album || [];
      const id = uid("a");
      s.album.unshift({ id, name: String(name || "").trim().slice(0, 24) || "Anonim", mlid: String(mlid || "").slice(0, 32), note: String(note || "").slice(0, 120), at: at || Date.now(), done: false, src: src || "manual" });
      s.album = s.album.slice(0, 300);
      return id;
    },
    albumAdd(name, mlid, note) { Store.set(s => Q._albumAdd(s, name, mlid, note, Date.now(), "manual")); },
    albumToggle(id) { Store.set(s => { const a = (s.album || []).find(x => x.id === id); if (a) { a.done = !a.done; a.doneAt = a.done ? Date.now() : 0; } }); },
    albumDel(id) { Store.set(s => { s.album = (s.album || []).filter(x => x.id !== id); }); },
    albumClearDone() { Store.set(s => { s.album = (s.album || []).filter(x => !x.done); }); },
    // RM40 order: first empty name in the Slot Mainkan Akaun table (adds a row if full)
    _akaunBook(s, name, at) {
      const d = new Date(at || Date.now()), dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      let r = (s.akaun || []).find(x => !String(x.name || "").trim());
      if (!r) { r = { day: "", name: "", date: "" }; s.akaun.push(r); }
      r.name = String(name || "").slice(0, 40); if (!r.date) { r.date = dt; r.day = DAYS[(d.getDay() + 6) % 7]; }
    },
    /* ---------- slot mainkan akaun ---------- */
    // date comes from a calendar (YYYY-MM-DD); picking one also fills the day name
    akaunSet(i, f, v) { Store.set(s => { const r = s.akaun[i]; if (!r) return; r[f] = String(v || "").slice(0, 40); if (f === "date" && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) r.day = DAYS[(new Date(r.date + "T12:00:00").getDay() + 6) % 7]; }); },
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
    // drag & drop in the app: a queue player takes a playing slot; the one replaced leaves the line (balance kept)
    replaceIn(qId, pId) {
      let out = null;
      Store.set(s => {
        const qi = s.queue.findIndex(p => p.id === qId), pi = s.playing.findIndex(p => p.id === pId);
        if (qi < 0 || pi < 0) return;
        const inc = s.queue.splice(qi, 1)[0], old = s.playing[pi];
        inc.n = 0; s.playing[pi] = inc;
        out = { inName: (s.members[inc.key] || {}).name || inc.key, outName: (s.members[old.key] || {}).name || old.key };
      });
      return out;
    },
    moveQueue(id, to) { Store.set(s => { const i = s.queue.findIndex(p => p.id === id); if (i < 0) return; const [x] = s.queue.splice(i, 1); s.queue.splice(Math.max(0, Math.min(s.queue.length, to)), 0, x); }); },
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
    "facecam-on": () => Q.hideSet("l", "cam", false), "facecam-off": () => Q.hideSet("l", "cam", true),
    "facecam-toggle": () => Q.hideSet("l", "cam", !((Store.state.hide || {}).l || {}).cam),
    "handcam-on": () => camHand(false), "handcam-off": () => camHand(true), "handcam-toggle": () => camHand(!((Store.state.hide || {}).l || {}).hand),
    "mabar-open": () => Q.patch({ mabarClosed: false }), "mabar-close": () => Q.patch({ mabarClosed: true }), "mabar-toggle": () => Q.patch({ mabarClosed: !Store.state.mabarClosed }),
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
  const albumNote = msg => String(msg || "").replace(/\b(?:id\s*(?:ml)?\s*[:=]?\s*)?\d{6,12}\s*[(\[]?\s*\d{3,5}\s*[)\]]?/i, "").replace(/\s{2,}/g, " ").trim();
  // games an amount buys with the normal packs (RM4 = 1, RM10 = 3, RM20 = 6, RM30 = 9)
  const rmOf = o => (+o.amount || 0) * (SB.toMYR[String(o.cur || "MYR").toUpperCase()] != null ? SB.toMYR[String(o.cur || "MYR").toUpperCase()] : 1);
  const packGames = rm => { let rest = Math.round(rm), g = 0; for (const p of SB.packs || []) { const n = Math.floor(rest / p.rm + 1e-9); g += n * p.games; rest -= n * p.rm; } return g; };
  function parseOrder(entry) {
    let text = "";
    try { text = new TextDecoder().decode(Uint8Array.from(atob(entry.b || ""), c => c.charCodeAt(0))); } catch (e) {}
    let b = {};
    try { b = JSON.parse(text); } catch (e) { try { b = Object.fromEntries(new URLSearchParams(text)); } catch (e2) {} }
    if (!b || typeof b !== "object" || Array.isArray(b)) b = { message: text };
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
    // Webhook page "Pemberitahuan Ujian": only a TEST row. Alert page Test Alert / Custom Test Alert:
    // handled like a real order (games / komen album / alert on live), marked TEST ALERT (sociabuzz.alertTestAsOrder)
    const test = /ini hanya test notifikasi|test notifi/i.test(msg);
    const trial = !test && (/nama penyokong|penyokong anda|your supporter|supporter name|message from (your )?supporter/i.test(name + " " + msg)
      || /@example\.com$/i.test(String(pick(b, ["email_supporter", "email", "buyer_email"]) || "")));
    // 1) TRIBE package name in the order data (not the buyer's name / message): most exact
    let svc = "", item = null;
    const pkgText = Object.entries(b).filter(([k, v]) => (typeof v === "string" || typeof v === "number") && !skip.test(k)
      && !/^(supporter|supporter_name|buyer_name|name|nama|message|note|notes|buyer_note|supporter_message|pesan)$/i.test(k)).map(([, v]) => String(v)).join(" | ");
    for (const it of (SB.items || [])) { let re; try { re = new RegExp(it.match, "i"); } catch (e) { continue; } if (re.test(pkgText)) { item = it; break; } }
    if (item) { if (item.type) svc = item.type; else games = item.games || games; }
    else {
      // 2) service by a word in the message, or by exact amount (RM5 = komen album, RM40 = mainkan akaun)
      const SV = SB.services || [];
      const byWord = SV.find(x => new RegExp("\\b" + x.type + "\\b", "i").test(msg) || (x.label && new RegExp(x.label, "i").test(msg)));
      if (byWord) svc = byWord.type;
      else if (!/\b(mabar|game|vip|immortal)\b/i.test(msg)) { const ex = SV.find(x => x.rm === Math.round(rm)); if (ex) svc = ex.type; }
    }
    if (svc) games = 0;
    // same order sent twice (Sociabuzz retry) = same id AND same content; Custom Test Alerts reuse one id with new content
    const dk = [id, amount, cur, name, msg, pick(b, ["created_at", "paid_at", "date"]) || ""].join("|");
    const asTest = trial && SB.alertTestAsOrder === false;
    return { id, dk, name, mlid, games, at, amount, cur, msg: msg.slice(0, 120), test: test || asTest, trial: trial && !asTest, vip: vip || !!(item && item.vip), svc, item: item ? (item.label || item.match) : "", raw: text.slice(0, 500) };
  }
  /* ---------- song requests (IndoFinity webhook) ---------- */
  function parseSong(entry) {
    let text = ""; try { text = new TextDecoder().decode(Uint8Array.from(atob(entry.b || ""), c => c.charCodeAt(0))); } catch (e) {}
    const bag = {};
    // skip empty values and placeholders the sender did not fill in ("{comment}")
    const put = (k, v) => { if (v == null || typeof v === "object") return; v = String(v); if (/^\s*\{[\w.]+\}\s*$/.test(v)) return; const kk = String(k).toLowerCase(); if (bag[kk] == null || bag[kk] === "") bag[kk] = v; };
    const walk = (o, d) => { if (!o || typeof o !== "object" || d > 3) return; for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === "object") walk(v, d + 1);
      else if (typeof v === "string" && /^\s*[{[]/.test(v)) { try { const j = JSON.parse(v); if (j && typeof j === "object") { walk(j, d + 1); continue; } } catch (e) {} put(k, v); }
      else put(k, v); } };
    let b = null;
    // IndoFinity "Trigger Webhook" posts FormData = multipart/form-data
    const bnd = (String(entry.ct || "").match(/boundary=("?)([^";]+)\1/i) || [])[2] || ((text.match(/^--([^\r\n]+)\r?\n/) || [])[1]);
    if (bnd && text.includes("--" + bnd)) {
      b = {};
      for (const part of text.split("--" + bnd)) {
        const m = part.match(/name="([^"]*)"[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*\r?\n([\s\S]*?)\r?\n?$/);
        if (m && !/filename=/i.test(part.split(/\r?\n\r?\n/)[0])) b[m[1]] = m[2];
      }
    } else { try { b = JSON.parse(text); } catch (e) { try { b = Object.fromEntries(new URLSearchParams(text)); } catch (e2) {} } }
    walk(b, 0);                                                 // body first: real values win over the URL
    try { new URLSearchParams(entry.q || "").forEach((v, k) => put(k, v)); } catch (e) {}
    const get = keys => { for (const k of keys) if (bag[k] != null && String(bag[k]).trim() !== "") return String(bag[k]).trim(); return ""; };
    const user = get(["user", "username", "nickname", "uniqueid", "unique_id", "displayname", "name", "sender"]).replace(/^@/, "").slice(0, 24) || "penonton";
    const said = get(["comment", "message", "text", "msg", "content", "chat"]) || (b == null && !entry.q ? text : "");
    let title = get(["song", "title", "track", "query", "lagu"]), kind = "play";
    const m = said.match(/^\s*[!;.]?\s*(play|req|request|sr)\b\s*(.*)$/i);
    const rv = said.match(/^\s*[!;.]?\s*(revoke|remove|cancel)\b\s*(.*)$/i);
    if (/^\s*[!;.]?\s*skip\b/i.test(said) && !title) kind = "skip";
    else if (rv && !title) { kind = "revoke"; title = rv[2].trim(); }
    else if (!title && m) title = m[2].trim();
    else if (!title) title = said.trim();
    const raw = Object.entries(bag).map(([k, v]) => `${k}=${v}`).join(" · ").slice(0, 600) || text.slice(0, 300);
    return { user, title: title.slice(0, 90), kind, at: entry.t || Date.now(), raw };
  }
  // pause / play Spotify through the PC server (Windows media controls)
  const spotify = act => { const pin = Store.pin(); return fetch("api/spotify/" + act, { cache: "no-store", headers: pin ? { "X-Pin": pin } : {} }).then(r => r.ok ? r.text() : "").catch(() => ""); };

  /* ---------- lagu dari app lain (IndoFinity / YouTube Music) ----------
     The PC server reports Windows media sessions (app + title) and how loud each app is.
     While the player app plays a song: Spotify paused, title on the overlay; when it stops: Spotify back. */
  const MEDIA = { last: null, at: 0, loudAt: 0, loudSince: 0, busy: false };
  function mediaTick() {
    const st = Store.state; if (!st || !Store.remote || MEDIA.busy || document.hidden && !window.obsstudio) return;
    MEDIA.busy = true; const pin = Store.pin();
    fetch("api/media", { cache: "no-store", headers: pin ? { "X-Pin": pin } : {} }).then(r => r.ok ? r.json() : null).then(j => {
      MEDIA.last = j; MEDIA.at = Date.now();
      const cfg = st.songCfg || {}, now = Date.now();
      if (!j || !Store.canWrite || cfg.detect === false) return;
      const want = String(cfg.player || "").trim().toLowerCase(); if (!want) return;
      const hit = x => String(x || "").toLowerCase().includes(want);
      const sm = (j.smtc || []).find(x => hit(x.app) && x.playing);
      const loud = (j.audio || []).some(x => hit(x.name) && x.peak > 0.015);
      if (loud) { if (now - MEDIA.loudAt > 2500) MEDIA.loudSince = now; MEDIA.loudAt = now; }
      // a song = title reported by Windows, or sound from the player app for 2 s;
      // paused / finished = quiet for ~2 s -> Spotify comes back right away
      const active = !!sm || (MEDIA.loudAt > 0 && now - MEDIA.loudAt < 1900 && now - MEDIA.loudSince >= 2000);
      // title + requester as shown inside the IndoFinity window (read by the PC server), else Windows media title
      const ifx = ifxNow(j.ifx);
      const title = ifx ? ifx.title : songTitleOf(sm, (j.audio || []).find(x => hit(x.name)), want), user = ifx ? ifx.user : "";
      const s0 = Store.state, curT = s0.songNow ? s0.songNow.title || "" : "", curU = s0.songNow ? s0.songNow.user || "" : "";
      if (active && (!s0.songNow || ((title !== curT || user !== curU) && (title || /indofinity/i.test(curT))))) {
        Store.set(s => {
          s.songNow = { title, user, at: now };
          s.songs = (s.songs || []).filter(x => x.src !== "app");
          if (title) { s.songs = s.songs || []; s.songs.unshift({ id: uid("s"), user, title, at: now, done: false, src: "app" }); s.songs = s.songs.slice(0, 60); }
        }, { noHist: true });
      } else if (!active && s0.songNow) {
        Store.set(s => { s.songNow = null; s.songs = (s.songs || []).filter(x => x.src !== "app"); }, { noHist: true });
      }
      const spot = (j.smtc || []).find(x => /spotify/i.test(x.app));
      if (active && !Store.state.spotAuto && (!spot || spot.playing)) { Store.set(s => { s.spotAuto = true; }, { noHist: true }); spotify("pause"); }
      else if (!active && Store.state.spotAuto) { Store.set(s => { s.spotAuto = false; }, { noHist: true }); spotify("play"); }
    }).catch(() => {}).finally(() => { MEDIA.busy = false; });
  }
  setInterval(mediaTick, 1000);
  const tidyTitle = t => String(t || "").replace(/\s*[(\[](official|lirik|lyrics?|lyric video|audio|music video|mv|video klip|visualizer|hd|4k)[^)\]]*[)\]]/gi, "").replace(/[….]{1,3}$/, "").replace(/\s{2,}/g, " ").trim();
  // IndoFinity now-playing card: "<title>", "<channel>", "@<requester>" (first @name that follows a song title)
  function ifxNow(texts) {
    if (!Array.isArray(texts) || !texts.length) return null;
    const songish = t => t.length >= 6 && !/^@/.test(t) && !/^\d{1,2}[:.]\d{2}/.test(t) && !/indofinity|^https?:|^(update|subathon|settings?|pengaturan|song requests?|queue|antrian)\b/i.test(t);
    texts = texts.map(String).filter(t => !/^\[tetingkap\]/.test(t));
    for (let i = 0; i < texts.length; i++) {
      // "@name" on its own, or inside a longer line ("7clouds · @name", "Request by @name")
      const m = texts[i].match(/^@([\w.]{2,32})$/) || texts[i].match(/(?:^|[\s·•|(])@([\w.]{2,32})\b/); if (!m) continue;
      const own = texts[i].replace(/@[\w.]{2,32}.*$/, "").replace(/[\s·•|(-]+$/, "").trim();
      const prev = texts.slice(Math.max(0, i - 3), i).concat(own && own.length >= 6 && !/^(req|request|by|oleh|dari)\b/i.test(own) ? [own] : []);
      const t = prev.length >= 2 && songish(prev[prev.length - 2]) ? prev[prev.length - 2] : prev.length && songish(prev[prev.length - 1]) ? prev[prev.length - 1] : "";
      if (t) return { title: tidyTitle(t).slice(0, 90), user: m[1] };
    }
    return null;
  }
  // song title only: never the app's own name ("IndoFinity"), a web address or "YouTube"
  function songTitleOf(sm, au, want) {
    const clean = t => String(t || "").replace(/\s*[-|–—:•·]\s*(indofinity|youtube music|youtube|google chrome|microsoft edge)\b.*$/i, "").replace(/^(indofinity|youtube music|youtube)\s*[-|–—:•·]\s*/i, "").trim();
    const bad = t => !t || t.length < 2 || /indofinity|^https?:|\.(com|net|io|id)\b|^(youtube( music)?( player)?|music player|widget|player|song request|now playing)$|\bv?\d+\.\d+\.\d+\b/i.test(t) || (want && t.toLowerCase().includes(want));
    const tidy = t => t.replace(/\s*[(\[](official|lirik|lyrics?|lyric video|audio|music video|mv|video klip|visualizer|hd|4k)[^)\]]*[)\]]/gi, "").replace(/\s{2,}/g, " ").trim();
    let ti = tidy(clean(sm && sm.title)), ar = clean(sm && sm.artist).replace(/vevo$/i, "").trim();
    if (bad(ar) || ar.toLowerCase().endsWith(" - topic") && (ar = ar.slice(0, -8).trim()) && bad(ar)) ar = "";
    if (!bad(ti)) return (ar && !/\s[-–]\s/.test(ti) && !ti.toLowerCase().includes(ar.toLowerCase()) ? `${ar} - ${ti}` : ti).slice(0, 90);
    const wt = tidy(clean(au && au.win));
    return bad(wt) ? "" : wt.slice(0, 90);
  }

  // the same physical handcam: portrait "Handcam" and landscape "Handcam" switch together
  const camHand = off => Store.set(s => { s.hide = s.hide || {}; s.hide.p = Object.assign({}, s.hide.p, { cam: off }); s.hide.l = Object.assign({}, s.hide.l, { hand: off }); });
  let ordersBusy = false, songPause = false;
  // Orders stay in the server journal with a number; the shared state remembers the last number
  // handled (orderSeq), so a page that fails or a lost write never drops an order.
  setInterval(() => {
    const st = Store.state; if (!st || !Store.remote || !Store.canWrite) return;
    if (st.songResumeAt && Date.now() > st.songResumeAt && !st.spotAuto) { Store.set(s => { s.songResumeAt = 0; }, { noHist: true }); spotify("play"); }
  }, 5000);
  function pullOrders() {
    if (ordersBusy || !Store.remote || !Store.canWrite) return; ordersBusy = true;
    const pin = Store.pin(), after = +Store.state.orderSeq || 0;
    fetch("api/orders?after=" + after, { cache: "no-store", headers: pin ? { "X-Pin": pin } : {} }).then(r => r.ok ? r.json() : null).then(res => {
      if (!res) return;
      const legacy = Array.isArray(res);                       // older server: list, already removed on its side
      const list = (legacy ? res : res.items || []).filter(e => e && (e.n == null || e.n > after));
      const first = !legacy && Store.state.orderSeq == null;   // first run: skip journal entries older than a day
      if (!list.length) { if (first && res.last) Store.set(s => { s.orderSeq = res.last; }, { noHist: true }); return; }
      Store.set(s => {
        const from = +s.orderSeq || 0;
        s.seenOrders = s.seenOrders || [];
        for (const e of list) {
          if (e.n != null && e.n <= from) continue;             // another page already did it
          if (first && e.t && Date.now() - e.t > 864e5) continue;
          if (e.k === "song") { const r = parseSong(e); s.songLast = { at: Date.now(), raw: r.raw, user: r.user, title: r.title, kind: r.kind }; Q._song(s, r); continue; }
          let o;
          try { o = parseOrder(e); }
          catch (err) {
            let raw = ""; try { raw = atob(e.b || "").slice(0, 500); } catch (x) {}
            Q._log(s, { key: "", name: "Order tak dapat dibaca", mlid: "", games: 0, at: e.t || Date.now(), src: "sociabuzz", warn: "Semak Data asal", raw });
            continue;
          }
          // Sociabuzz sends the same id on every Test Notification: never drop a test as a duplicate
          const info = { amount: o.amount, cur: o.cur, note: o.msg, vip: !!o.vip, raw: o.raw, svc: o.svc, trial: !!o.trial };
          if (!o.test && !o.trial && s.seenOrders.includes(o.dk)) { Q._log(s, Object.assign({ key: "", name: o.name, mlid: o.mlid, games: 0, at: o.at, src: "sociabuzz", warn: "Order sama dengan sebelum ni, diabaikan" }, info)); continue; }
          if (!o.test && !o.trial) s.seenOrders.unshift(o.dk);
          if (o.test) { Q._log(s, Object.assign({ key: "", name: o.name, mlid: o.mlid, games: 0, at: o.at, src: "test" }, info)); continue; }
          if (o.svc === "album") { const albumId = Q._albumAdd(s, o.name, o.mlid, albumNote(o.msg), o.at, "sociabuzz"); Q._log(s, Object.assign({ key: "", name: o.name, mlid: o.mlid, games: 0, at: o.at, src: "sociabuzz", albumId }, info)); continue; }
          if (o.svc === "joki") { Q._log(s, Object.assign({ key: "", name: o.name, mlid: o.mlid, games: 0, at: o.at, src: "sociabuzz" }, info)); continue; }
          if (o.svc === "akaun") { Q._akaunBook(s, o.name, o.at); Q._log(s, Object.assign({ key: "", name: o.name, mlid: o.mlid, games: 0, at: o.at, src: "sociabuzz" }, info)); continue; }
          const k = keyOf(o.name);
          if (o.games > 0 && k) Q._add(s, k, o.name, o.games, SB.autoQueue, o.at, o.mlid, "sociabuzz", info);
          else Q._log(s, Object.assign({ key: k, name: o.name, mlid: o.mlid, games: 0, at: o.at, src: "sociabuzz", warn: "Jumlah tak cukup untuk 1 game" }, info));
        }
        s.seenOrders = s.seenOrders.slice(0, 300);
        const top = Math.max(from, res.last || 0, ...list.map(e => +e.n || 0));
        if (!legacy) s.orderSeq = top;
      }, { noHist: true });
      if (songPause) { songPause = false; spotify("pause"); }
    }).catch(() => {}).finally(() => { ordersBusy = false; });
  }

  /* ---------- song now playing (server reads Spotify on the PC) ---------- */
  const NP = { text: "", started: false, start() {
    if (this.started) return; this.started = true;
    const tick = () => { if (!Store.remote) return; fetch("api/nowplaying", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => { if (j && typeof j.t === "string") NP.text = j.t.trim().slice(0, 120); }).catch(() => {}); };
    setInterval(tick, 3000); setTimeout(tick, 900);
  } };
  // LIVE band: manual text, else the IndoFinity request (with who asked), else Spotify
  const reqText = n => n && n.title ? n.title + (n.user ? `  ·  req @${n.user}` : "") : "";
  const songText = st => !st.song || st.song.on === false ? "" : String(st.song.manual || reqText(st.songNow) || NP.text || "").trim();

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
        { id: "hand", x: 548, y: 1474, w: 508, h: 286, cut: 16, optional: true, toggle: "cam" }
      ],
      panels: [
        { type: "queue", variant: "compact", x: 24, y: 1474, w: 500, h: 290 },
        { type: "score", x: 548, y: 1798, w: 508, h: 108 }
      ],
      tags: [{ slot: "hand" }]
    },
    // ---- landscape 1920x1080: gameplay 3:2 + black column for the overlay (kiri / kanan), or both sides (tengah)
    kiri: landSide("kiri"),
    kanan: landSide("kanan"),
    tengah: {
      name: "Landscape tengah", w: 1920, h: 1080, banner: "minimal", noSong: true,
      band: 1048, bandX: 0, bandW: 1920,
      bannerY: 922, bannerX: 622, bannerScale: .625,
      slots: [
        { id: "game", x: 288, y: 14, w: 1344, h: 896, frame: false },
        { id: "face", x: 1644, y: 14, w: 264, h: 198, cut: 14, corners: true, optional: true }
      ],
      panels: [
        { type: "queue", variant: "compact tall narrow", x: 12, y: 14, w: 264, h: 720, max: 11 },
        { type: "score", x: 12, y: 750, w: 264, h: 56 },
        { type: "prices", variant: "compact tall narrow", x: 1644, y: 228, w: 264, h: 420 }
      ],
      tags: []
    }
  };
  // landscape with the overlay column on one side: game 1536x1024 (3:2) flush with the top, column 384 wide.
  // The column is a stack (facecam, Mabar VIP, W/L, banner, handcam): anything switched off in the App
  // lets the rest move up, so there is never an empty gap. LIVE bar under everything, drawn 2x.
  function landSide(side) {
    const colX = side === "kiri" ? 0 : 1536, gx = side === "kiri" ? 384 : 0, px = colX + 12;
    return {
      name: "Landscape " + side, w: 1920, h: 1080, banner: "minimal", noSong: true,   // YouTube live: no music
      band: 1024, bandX: 0, bandW: 1920, bandScale: 2,
      bannerY: 948, bannerX: px, bannerScale: 360 / 1080,
      slots: [
        { id: "game", x: gx, y: 0, w: 1536, h: 1024, frame: false },
        { id: "face", x: px, y: 12, w: 360, h: 252, cut: 16, corners: false, optional: true, toggle: "cam" },
        { id: "hand", x: px, y: 809, w: 360, h: 203, cut: 16, corners: false, optional: true, toggle: "hand" }
      ],
      panels: [
        { type: "queue", variant: "compact tall", x: px, y: 272, w: 360, h: 372, max: 3 },
        { type: "score", x: px, y: 652, w: 360, h: 77 }
      ],
      // facecam always at the top, handcam always at the bottom (fixed OBS positions); Mabar VIP grows into any free space
      stack: { x: px, w: 360, y0: 12, y1: 1012, gap: 8, items: [
        { slot: "face", h: 252 }, { panel: "queue", flex: true }, { panel: "score", h: 77 }, { banner: true, h: 64 }, { slot: "hand", h: 203 }
      ] },
      tags: []
    };
  }
  // positions of the stacked column for the current switches (also used by the App to show OBS positions)
  function stackLayout(L, hid, showBanner) {
    const S = L.stack; if (!S) return null;
    const has = it => it.slot ? L.slots.some(x => x.id === it.slot) && !hid[(L.slots.find(x => x.id === it.slot) || {}).toggle]
      : it.panel === "queue" ? !hid.mabar : it.panel === "score" ? !hid.score : it.banner ? showBanner !== false && !hid.banner : true;
    const items = S.items.filter(has);
    const fixed = items.reduce((a, it) => a + (it.flex ? 0 : it.h), 0) + S.gap * Math.max(0, items.length - 1);
    const flexH = Math.max(120, S.y1 - S.y0 - fixed);
    const out = { slots: {}, panels: {}, bannerY: null }; let y = S.y0;
    for (const it of items) {
      const h = it.flex ? flexH : it.h, r = { x: S.x, y, w: S.w, h };
      if (it.slot) out.slots[it.slot] = r; else if (it.panel) out.panels[it.panel] = r; else out.bannerY = y;
      y += h + S.gap;
    }
    return out;
  }
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
  function bgSVG(L) {
    const m = uid("holes"), c1 = uid("cr"), g = uid("g"), SW = L.w || W, SH = L.h || H;
    const holes = L.slots.map(s => `<path d="${slotPath(s)}" fill="#000"/>`).join("");
    return `<svg class="ov-layer" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}" aria-hidden="true">
<defs>
 <linearGradient id="${g}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${TH.bg[0]}"/><stop offset=".55" stop-color="${TH.bg[1]}"/><stop offset="1" stop-color="${TH.bg[2]}"/></linearGradient>
 <radialGradient id="${g}b" cx=".08" cy=".82" r=".55"><stop offset="0" stop-color="${TH.a}" stop-opacity=".3"/><stop offset="1" stop-color="${TH.a}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${g}c" cx=".98" cy=".7" r=".45"><stop offset="0" stop-color="#ff2350" stop-opacity=".2"/><stop offset="1" stop-color="#ff2350" stop-opacity="0"/></radialGradient>
 <linearGradient id="${g}d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b98aff" stop-opacity=".16"/><stop offset="1" stop-color="#ff2350" stop-opacity=".05"/></linearGradient>
 <pattern id="${g}h" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="1.6" height="18" fill="${TH.hi}" fill-opacity=".06"/></pattern>
 <filter id="${g}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .075 0"/></filter>
 <mask id="${m}"><rect width="${SW}" height="${SH}" fill="#fff"/>${holes}</mask>
</defs>
<g mask="url(#${m})">
 <rect width="${SW}" height="${SH}" fill="url(#${g}a)"/>
 <rect width="${SW}" height="${SH}" fill="url(#${g}b)"/>
 <rect width="${SW}" height="${SH}" fill="url(#${g}c)"/>
 <rect width="${SW}" height="${SH}" fill="url(#${g}h)"/>
 <rect width="${SW}" height="${SH}" filter="url(#${g}n)"/>
 ${L.chatSafe ? `<linearGradient id="${g}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050309" stop-opacity=".78"/><stop offset=".75" stop-color="#050309" stop-opacity=".45"/><stop offset="1" stop-color="#050309" stop-opacity="0"/></linearGradient>
 <rect x="${L.chatSafe.x}" y="${L.chatSafe.y}" width="${L.chatSafe.w}" height="${L.chatSafe.h}" fill="url(#${g}s)"/>` : ""}
</g>
</svg>`;
  }

  function frameSVG(L) {
    const f = uid("blur"), SW = L.w || W, SH = L.h || H;
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
      if ((s.id === "hand" || s.corners) && s.corners !== false) out += cuts.map(p => `<path class="ov-corner" d="${p}"/>`).join("");
    }
    return `<svg class="ov-layer" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}" aria-hidden="true">
<defs><filter id="${f}" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5"/></filter></defs>${out}</svg>`;
  }


  /* ---------- animated backdrop: purple/crimson smoke + embers, masked out of the camera holes ---------- */
  function bgFx(L) {
    const SW = L.w || W, SH = L.h || H, CW = Math.round(SW / 4), CH = Math.round(SH / 4);
    const c = el("canvas", "ov-layer ov-bgfx"); c.width = CW; c.height = CH;
    const holes = L.slots.map(s => slotPath(s)).join("");
    const mask = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" preserveAspectRatio="none"><path fill-rule="evenodd" d="M0 0H${SW}V${SH}H0Z${holes}"/></svg>`);
    c.style.webkitMaskImage = c.style.maskImage = `url("${mask}")`;
    c.style.webkitMaskSize = c.style.maskSize = "100% 100%";
    const ctx = c.getContext("2d"); let last = -1;
    const LOOP = 24;
    c._tick = t => {
      if (manualT == null && t - last < 1 / 30) return; last = t;
      ctx.clearRect(0, 0, CW, CH);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 18; i++) {
        const r1 = rnd(i + 2001), r2 = rnd(i + 2101), r3 = rnd(i + 2201);
        const x = frac(r1 + t * (1 + (i % 2)) / LOOP) * (CW * 1.33) - 45;
        const y = CH * .625 + r2 * CH * .375 + Math.sin(t / LOOP * TAU * (1 + (i % 3)) + i) * 26;
        const rad = 40 + r3 * 60, red = i % 3 === 0;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, red ? `rgba(${TH.deep},.08)` : `rgba(${TH.glow},.10)`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 40; i++) {
        const ph = frac(t * (2 + Math.floor(rnd(i + 2301) * 4)) / LOOP + rnd(i + 2401));
        const x = rnd(i + 2501) * CW + Math.sin(ph * TAU * 2 + i) * 6;
        const y = CH - ph * CH * .625;
        if (L.chatSafe && x < (L.chatSafe.w / 4) && y > L.chatSafe.y / 4) continue;
        const a = Math.sin(ph * Math.PI) * .8;
        ctx.fillStyle = i % 4 ? `rgba(${TH.ember},${a})` : `rgba(255,110,140,${a})`;
        ctx.fillRect(x, y, 1.2, 1.2);
      }
      const sw = frac(t / 8), sx = sw * 600 - 200;
      const g = ctx.createLinearGradient(sx, 0, sx + 90, 60);
      g.addColorStop(0, "rgba(185,138,255,0)"); g.addColorStop(.5, "rgba(185,138,255,.05)"); g.addColorStop(1, "rgba(185,138,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
      ctx.globalCompositeOperation = "source-over";
    };
    tickers.push(c._tick);
    return c;
  }

  /* ---------- panels ---------- */
  const chipsHTML = () => CFG.mabar.prices.filter(p => p.overlay !== false).map(p => `<span class="ov-chip"><span>${p.note ? `${esc(p.qty)} <b>${esc(p.price)}</b>${esc(p.note)}` : `<b>${esc(p.price)}</b> / ${esc(p.qty)}`}</span></span>`).join("");
  const svcHTML = () => CFG.services.map(v => `<div><span>${esc(v.label)}</span><b>${esc(v.price)}</b></div>`).join("");

  const mem = (s, p) => s.members[p.key] || { name: p.key, bal: 0 };
  const ROLES = ["EXP", "JUNGLE", "MID", "GOLD", "ROAM"];
  const roleTag = m => m && m.role && ROLES.includes(m.role) ? (window.SYNO_ROLES ? SYNO_ROLES.badge(m.role) : `<span class="rl rl-${m.role.toLowerCase()} rl-txt">${m.role === "JUNGLE" ? "JGL" : m.role}</span>`) : "";
  function queueHTML(s, variant, prevIds, def) {
    const v = String(variant || ""), wide = v === "wide", compact = /compact/.test(v), tall = /tall/.test(v), two = compact && !/narrow/.test(v);
    const max = CFG.mabar.maxPlaying, full = s.playing.length >= max;
    const isNew = id => (prevIds && !prevIds.has(id) ? " is-new" : "");
    let slots = "";
    for (let i = 0; i < max; i++) {
      const p = s.playing[i];
      if (p) { const m = mem(s, p); slots += `<li class="slot${isNew(p.id)}"><span class="ix">${i + 1}</span>${roleTag(m)}<span class="nm">${esc(m.name)}</span>${m.mlid ? `<span class="mid">${esc(m.mlid)}</span>` : ""}<span class="bal">${p.vip ? "<i class=\"vv\">★</i>" : ""}${tot(m)}<small>G</small></span></li>`; }
      else slots += `<li class="slot is-empty"><span class="ix">${i + 1}</span><span class="nm">SLOT KOSONG</span></li>`;
    }
    const lim = def && def.max || (wide ? 6 : compact ? 4 : 3); // compact: 2 columns x 2 rows; tall: one long list
    let next = s.queue.slice(0, lim).map((p, i) =>
      `<li class="nx${isNew(p.id)}"><span class="no">${String(i + 1).padStart(2, "0")}</span>${roleTag(mem(s, p))}<span class="nm">${esc(mem(s, p).name)}</span>${mem(s, p).mlid ? `<span class="mid">${esc(mem(s, p).mlid)}</span>` : ""}<span class="g">${p.vip ? "★" : ""}${tot(mem(s, p))}G</span></li>`).join("");
    const extra = s.queue.length - lim;
    if (extra > 0 && !compact) next += `<li class="nx more">+${extra} LAGI</li>`;
    // two columns (portrait 2 + 2, landscape column: rows that fit, left then right)
    const shown = Math.min(s.queue.length, lim), rows = def && def.rows ? Math.max(1, Math.min(def.rows, Math.ceil(shown / 2))) : 0;
    const rowsCss = two && tall && rows ? ` style="grid-template-rows:repeat(${rows},auto)"` : "";
    const nextBlock = s.queue.length ? `<ol${two ? ` class="q2"${rowsCss}` : ""}>${next}</ol>` : `<p class="q-empty">${full ? "Queue kosong" : "Slot masih ada"}</p>`;
    return `<div class="q-head">${titleHTML(s)}<div class="q-prices">${chipsHTML()}</div></div>
<div class="q-cols"><section><h4 class="ov-lbl">Sedang main <i>${s.playing.length}/${max}</i></h4><ol class="slots">${slots}</ol></section>
<section><h4 class="ov-lbl">Queue ${compact && extra > 0 ? `<em class="q-more">+${extra} lagi</em>` : ""}<i>${s.queue.length}</i></h4>${nextBlock}</section></div>`;
  }

  // title + OPEN / CLOSED badge (App switch / Stream Deck), same on the queue and the prices card
  const titleHTML = s => `<div class="q-tt"><h3 class="ov-h">${esc(CFG.mabar.title)}</h3><span class="oc-b ${s && s.mabarClosed ? "closed" : "open"}">${s && s.mabarClosed ? "CLOSED" : "OPEN"}</span></div>`;
  function pricesHTML(variant, s) {
    if (/compact/.test(String(variant || ""))) {
      const tiles = CFG.mabar.prices.map(p => `<div class="pt"><span>${esc(p.qty)}</span><b>${esc(p.price)}${p.note ? `<small>${esc(p.note)}</small>` : ""}</b></div>`).join("");
      const sv = CFG.services.map(v => `<span>${esc(v.label)} <b>${esc(v.price)}</b></span>`).join("");
      return `<div class="q-head">${titleHTML(s)}</div>
<div class="pt-grid">${tiles}</div>${sv ? `<div class="pt-svc">${sv}</div>` : ""}`;
    }
    const pr = CFG.mabar.prices.map(p => `<div class="pr"><span>${esc(p.qty)}</span><b>${esc(p.price)}</b></div>`).join("");
    return `<div class="q-head">${titleHTML(s)}</div>
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
    // streak badge: WIN STREAK over the win box (gold), LOSE STREAK over the lose box (red)
    const streak = s.streak >= 2 ? `<g transform="translate(40 12)"><polygon points="0,-10 104,-10 98,10 -6,10" fill="#ffcf4a"/><text x="49" y="5" text-anchor="middle" style="font-family:var(--f-hud);font-weight:700;font-size:13px;letter-spacing:2px" fill="#07050c">WIN STREAK ${s.streak}</text></g>`
      : s.streak <= -2 ? `<g transform="translate(294 12)"><polygon points="0,-10 112,-10 106,10 -6,10" fill="#ff2346"/><text x="53" y="5" text-anchor="middle" style="font-family:var(--f-hud);font-weight:700;font-size:13px;letter-spacing:2px" fill="#ffffff">LOSE STREAK ${-s.streak}</text></g>` : "";
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
    const land = (L.w || W) > (L.h || H);
    const stage = el("div", `ov-stage ov-l1 theme-${CFG.theme || "violet"}${land ? " land" : ""}`);
    if (L.w) { stage.style.width = L.w + "px"; stage.style.height = L.h + "px"; }

    if (opts.demo) for (const s of L.slots) {
      const d = el("div", "ov-demo"); pos(d, s);
      const img = new Image(); img.alt = "";
      img.onerror = () => { img.remove(); d.classList.add("is-empty"); d.innerHTML = `<span>${SLOT_NAMES[s.id]}</span>`; };
      img.src = (opts.demoBase || "assets/demo/") + s.id + ".jpg";
      d.dataset.slot = s.id; d.appendChild(img); stage.appendChild(d);
    }
    // background + camera frames; rebuilt when the camera is switched off / on in the App
    const layerMark = document.createComment("layers"); stage.appendChild(layerMark);
    let layerEls = [], layerKey = null;
    // camera holes that are switched on, at their current place (the landscape column moves them)
    function visibleSlots(hid, st) {
      const sk = stackLayout(L, hid, st.showBanner);
      return L.slots.filter(sl => !(sl.toggle && hid[sl.toggle])).map(sl => sk && sk.slots[sl.id] ? Object.assign({}, sl, sk.slots[sl.id]) : sl);
    }
    function buildLayers(slots) {
      const key = JSON.stringify(slots.map(x => [x.id, x.x, x.y, x.w, x.h]));
      if (key === layerKey) return; layerKey = key;
      layerEls.forEach(x => { if (x._tick) { const i = tickers.indexOf(x._tick); if (i >= 0) tickers.splice(i, 1); } x.remove(); });
      const Lc = Object.assign({}, L, { slots });
      const tmp = document.createElement("div");
      tmp.innerHTML = bgSVG(Lc); const bg = tmp.firstElementChild;
      tmp.innerHTML = frameSVG(Lc); const fr = tmp.firstElementChild;
      layerEls = [bg, opts.bgfx !== false ? bgFx(Lc) : null, fr].filter(Boolean);
      layerEls.forEach(x => stage.insertBefore(x, layerMark));
      stage.querySelectorAll(".ov-demo").forEach(d => { const sl = slots.find(x => x.id === d.dataset.slot); d.style.display = sl ? "" : "none"; if (sl) pos(d, sl); });
    }
    const orient = land ? "l" : "p", hideOf = st => ((st.hide || {})[orient]) || {};
    buildLayers(visibleSlots(hideOf(Store.state), Store.state));

    // band between facecam and gameplay
    // band under the facecam: LIVE · stream timer · clock · YouTube viewers
    // [● LIVE 01:23:45]  (live duration)   ·   [clock 2:04 PM]  (time now)   ·   [YouTube viewers]
    const band = el("div", "ov-band", `<span class="sweep"></span><span class="live"><span class="dot"></span><span>LIVE</span><b class="timer" hidden>00:00:00</b></span>
<span class="itm np" hidden><svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg><span class="npw"><b class="npt"></b></span></span>
<span class="itm clock"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg><b>--:--</b><small></small></span>
<span class="itm yt" hidden><svg viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="4" fill="#ff0000"/><path d="M10 9l5 3-5 3z" fill="#fff"/></svg><b></b></span>`);
    band.style.top = L.band + "px"; if (L.bandX != null) { band.style.left = L.bandX + "px"; band.style.width = (L.bandW / (L.bandScale || 1)) + "px"; }
    if (L.bandScale) Object.assign(band.style, { transformOrigin: "0 0", transform: `scale(${L.bandScale})` });
    if (L.band != null) stage.appendChild(band);
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
      cap.dataset.tog = s.toggle || ""; stage.appendChild(cap);
    }

    const panels = L.panels.map(p => {
      const e = el("div", "ov-card"); pos(e, p); stage.appendChild(e);
      return { def: p, e };
    });

    const api = { stage, layout: L, banner: null };
    api.setBanner = (st, acc) => {
      if (api.banner) api.banner.destroy();
      api.banner = st === "none" ? null : mountBanner(stage, { style: st, accent: acc || opts.accent, y: L.bannerY, inStage: true });
      if (api.banner && L.bannerScale) Object.assign(api.banner.el.style, { left: (L.bannerX || 0) + "px", transformOrigin: "0 0", transform: `scale(${L.bannerScale})` });
      const sk0 = api.banner && stackLayout(L, hideOf(Store.state), Store.state.showBanner);
      if (sk0 && sk0.bannerY != null) api.banner.el.style.top = sk0.bannerY + "px";
      if (api.banner) api.banner.el.style.display = Store.state.showBanner && !hideOf(Store.state).banner ? "" : "none";
    };
    api.setBanner(opts.banner || L.banner || "pro");
    if (L.energy) { const en = energyLayer(L); en.style.zIndex = 4; stage.appendChild(en); }

    function render(s, prev) {
      const prevIds = prev ? new Set(prev.playing.concat(prev.queue).map(p => p.id)) : null;
      const hid = hideOf(s);
      // landscape column: move panels / banner up when something above is switched off
      const sk = stackLayout(L, hid, s.showBanner);
      if (sk) {
        for (const { def, e } of panels) { const r = sk.panels[def.type]; if (r) { Object.assign(def, r); pos(e, def); if (def.type === "queue") { def.rows = Math.max(2, Math.min(8, Math.floor((r.h - 280) / 29))); def.max = def.rows * 2; } } }
        if (api.banner && sk.bannerY != null) api.banner.el.style.top = sk.bannerY + "px";
      }
      buildLayers(visibleSlots(hid, s));
      stage.querySelectorAll(".ov-caption").forEach(c => { c.style.display = c.dataset.tog && hid[c.dataset.tog] ? "none" : ""; });
      if (L.band != null) band.style.display = hid.band ? "none" : "";
      for (const { def, e } of panels) {
        const v = def.variant ? " " + def.variant : "";
        const off = def.type === "score" ? hid.score : (def.type === "queue" || def.type === "prices") ? hid.mabar : false;
        if (off) { e.style.display = "none"; continue; }
        if (def.type !== "prices") e.style.display = "";
        if (def.type === "queue") {
          e.className = "ov-card " + (s.showQueue ? "ov-queue" : "ov-prices") + v + (s.mabarClosed ? " is-closed" : "");
          e.innerHTML = s.showQueue ? queueHTML(s, def.variant, prevIds, def) : pricesHTML(def.variant, s);
        } else if (def.type === "prices") {
          // landscape: prices always visible (hidden while the queue card already shows them)
          e.className = "ov-card ov-prices" + v; e.style.display = s.showQueue ? "" : "none";
          const html = pricesHTML(def.variant, s); if (e._h !== html) { e.innerHTML = html; e._h = html; }
        } else if (def.type === "score") {
          e.className = "ov-score"; e.innerHTML = scoreSVG(s);
          if (prev) e.querySelectorAll("[data-k]").forEach(g => { const k = g.dataset.k; if (prev[k] !== s[k]) { g.classList.remove("sb-pop"); void g.getBBox(); g.classList.add("sb-pop"); } });
        } else if (def.type === "songs") {
          // song requests (IndoFinity): newest few still waiting; hidden when there are none
          const n = CFG.songs && CFG.songs.showOnOverlay != null ? CFG.songs.showOnOverlay : 3;
          const list = (s.songs || []).filter(x => !x.done).slice(0, n).reverse();
          // the song the player app is playing right now goes first
          const ni = list.findIndex(x => x.src === "app"); if (ni > 0) list.unshift(list.splice(ni, 1)[0]);
          const show = n > 0 && list.length && !(s.songCfg && s.songCfg.show === false);
          e.className = "ov-songs"; e.style.display = show ? "" : "none";
          const html = show ? `<div class="sr-h"><svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg>SONG REQUEST<i>${(s.songs || []).filter(x => !x.done).length}</i></div><ol>${list.map((x, i) => `<li${i === 0 ? ' class="now"' : ""}><span class="t">${esc(x.title)}</span>${x.user ? `<span class="u">@${esc(x.user)}</span>` : x.src === "app" ? `<span class="u">▶ SEDANG MAIN</span>` : ""}</li>`).join("")}</ol>` : "";
          if (e._h !== html) { e.innerHTML = html; e._h = html; }
        } else if (def.type === "music") {
          if (!e.firstChild) { e.className = "ov-music"; e.innerHTML = `<div class="mu-tab"><svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg>NOW PLAYING</div>${opts.demo ? `<div class="mu-demo">widget lagu · ${def.w}×${def.h}</div>` : ""}`; }
        }
      }
      if (api.banner) api.banner.el.style.display = s.showBanner && !hid.banner ? "" : "none";
      // thank-you pop when a Sociabuzz order lands
      const o = (s.orders || [])[0], po = prev && (prev.orders || [])[0];
      const pop = o && (o.src === "sociabuzz" || o.src === "sim" || o.src === "test");
      if (prev && pop && (!po || o.rx !== po.rx)) {
        const qc = panels.find(p => p.def.type === "queue");
        if (qc && !hid.mabar) {
          const al = el("div", "q-alert", `<b>TERIMA KASIH</b><span>${esc(o.name)}</span><i>${o.src === "test" ? "TEST ✓" : o.svc === "album" ? "KOMEN ALBUM" : o.svc === "akaun" ? "MAIN AKAUN" : o.svc === "joki" ? "JOKI" : o.games > 0 ? `+${o.games} GAME` : "SOCIABUZZ"}</i>`);
          qc.e.parentNode.appendChild(al);
          Object.assign(al.style, { left: qc.def.x + "px", top: Math.max(4, qc.def.y - 26) + "px", width: qc.def.w + "px" });
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
      const np = L.noSong ? "" : songText(st);
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
  window.ChouOverlay = { mount, mountBanner, fitStage, setTime, Store, Q, LAYOUTS, CFG, util, keyOf, liveElapsed, fmtTime, parseOrder, NP, MEDIA, ifxNow, songText, stackLayout, layoutOf: n => LAYOUTS[n], ACTIONS, ROLES: ["EXP", "JUNGLE", "MID", "GOLD", "ROAM"], roleTag };
})();
