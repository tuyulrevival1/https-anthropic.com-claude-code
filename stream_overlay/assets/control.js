/* SYNO Control: one app to run the stream.
   Live timer · Win/Lose · game finished · Mabar queue · VIP balance · show/hide · YouTube viewers · links.
   Works on the PC (no PIN) and on phone / admin devices on the same Wi-Fi or public link (PIN). */
(function () {
  "use strict";
  const O = window.ChouOverlay, { Store, Q, CFG } = O;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PIN_KEY = "syno.adminPin", YT_KEY = "syno.yt";
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  const ACTIONS = {
    "win": () => Q.wl("wins", 1), "lose": () => Q.wl("losses", 1),
    "win-1": () => Q.wl("wins", -1), "lose-1": () => Q.wl("losses", -1),
    "end-win": () => Q.endGame("W"), "end-lose": () => Q.endGame("L"), "end": () => Q.endGame("X"),
    "timer-start": () => Q.timer("start"), "timer-pause": () => Q.timer("pause"), "timer-reset": () => Q.timer("reset"),
    "queue-on": () => Q.patch({ showQueue: true }), "queue-off": () => Q.patch({ showQueue: false }),
    "banner-on": () => Q.patch({ showBanner: true }), "banner-off": () => Q.patch({ showBanner: false })
  };

  function mountControl(root, opts = {}) {
    Store.init();
    const embedded = !!opts.embedded;
    root.classList.add("app");
    const pkgs = CFG.mabar.prices.map(p => ({ n: p.games || parseInt(p.qty, 10) || 1, label: p.note ? `+${p.games || 1} ${p.qty} ${p.price}` : `+${p.games || parseInt(p.qty, 10) || 1} GAME ${p.price}` }));
    root.innerHTML = `
${embedded ? "" : `<header class="app-top">
  <div class="brand"><b>SYNO</b> CONTROL</div>
  <div class="chips"><span class="chip" id="ap-conn">MENYAMBUNG…</span><span class="chip" id="ap-auth" hidden></span></div>
</header>
<div class="pinbar" id="ap-pinbar" hidden>
  <label for="ap-pin">PIN admin</label><input id="ap-pin" inputmode="numeric" maxlength="12" autocomplete="off" placeholder="cth 1234">
  <button class="btn red" id="ap-pinok" type="button">Masuk</button>
  <span class="muted">PIN ada dalam tetingkap hitam overlay di PC.</span>
</div>`}
<div class="grid">
  <section class="card live">
    <h3>Live</h3>
    <div class="timer" id="ap-timer">00:00:00</div>
    <div class="row">
      <button class="btn red" type="button" data-t="start">▶ Mula</button>
      <button class="btn" type="button" data-t="pause">❚❚ Jeda</button>
      <button class="btn" type="button" data-t="reset" data-confirm="Tekan lagi untuk reset">↺ Reset</button>
    </div>
    <p class="muted">Timer mula sendiri bila OBS tekan Start Streaming (kalau dibenarkan dalam OBS).</p>
    <div class="row toggles">
      <label class="tog"><input id="ap-showq" type="checkbox"><span>Queue</span></label>
      <label class="tog"><input id="ap-showb" type="checkbox"><span>Banner</span></label>
    </div>
  </section>

  <section class="card wl">
    <h3>Win / Lose</h3>
    <div class="wlrow">
      <div class="wlbox w"><small>WIN</small><b id="ap-wins">0</b><div class="row"><button class="btn sq" data-wl="wins" data-d="-1" aria-label="Tolak win">−</button><button class="btn sq gold" data-wl="wins" data-d="1" aria-label="Tambah win">+</button></div></div>
      <div class="wlbox l"><small>LOSE</small><b id="ap-losses">0</b><div class="row"><button class="btn sq" data-wl="losses" data-d="-1" aria-label="Tolak lose">−</button><button class="btn sq red" data-wl="losses" data-d="1" aria-label="Tambah lose">+</button></div></div>
    </div>
    <div class="row"><span class="muted" id="ap-streak"></span><button class="btn ghost" type="button" id="ap-resetwl" data-confirm="Tekan lagi">Reset W/L</button></div>
  </section>

  <section class="card end">
    <h3>Game habis</h3>
    <div class="row big">
      <button class="btn win" type="button" data-end="W">Menang</button>
      <button class="btn lose" type="button" data-end="L">Kalah</button>
    </div>
    <button class="btn ghost wide" type="button" data-end="X">Habis (tak kira W/L)</button>
    <p class="muted">Setiap tekan: tambah W/L, semua yang sedang main tolak 1 game dari baki. Baki habis keluar, queue naik sendiri.</p>
  </section>

  <section class="card queue">
    <h3>Sedang main <span id="ap-pc"></span></h3>
    <ol class="list" id="ap-play"></ol>
    <h3>Queue <span id="ap-qc"></span></h3>
    <ol class="list" id="ap-queue"></ol>
    <button class="btn ghost" type="button" id="ap-clearq" data-confirm="Tekan lagi untuk kosongkan">Kosongkan queue</button>
  </section>

  <section class="card vip">
    <h3>VIP &amp; baki game</h3>
    <form id="ap-add" class="addform" autocomplete="off">
      <input id="ap-name" maxlength="18" placeholder="Nama / ID ML" aria-label="Nama VIP">
      <div class="row pk">${pkgs.map(p => `<button class="btn" type="submit" data-g="${p.n}">${esc(p.label)}</button>`).join("")}</div>
      <div class="row"><input id="ap-custom" type="number" min="1" max="99" placeholder="Game" aria-label="Bilangan game lain"><button class="btn" type="submit" data-g="custom">+ Tambah</button>
      <label class="tog small"><input id="ap-joinq" type="checkbox" checked><span>Terus masuk queue</span></label></div>
    </form>
    <input id="ap-search" class="search" placeholder="Cari nama…" aria-label="Cari VIP">
    <ol class="list members" id="ap-members"></ol>
  </section>

  <section class="card yt">
    <h3>YouTube live viewers</h3>
    <label class="fld">API key <input id="ap-ytkey" autocomplete="off" placeholder="AIza…"></label>
    <label class="fld">Link live / video ID <input id="ap-ytvid" autocomplete="off" placeholder="https://youtube.com/live/…"></label>
    <label class="fld">atau Channel ID <input id="ap-ytch" autocomplete="off" placeholder="UC…"></label>
    <div class="row"><button class="btn red" type="button" id="ap-ytsave">Simpan &amp; mula</button><span class="muted" id="ap-ytstat">Belum disambung</span></div>
    <p class="muted">Disimpan dalam peranti ni sahaja. Biar app ni terbuka masa live; ia semak setiap 30 saat.</p>
  </section>

  ${embedded ? "" : `<section class="card links">
    <h3>Link</h3>
    <div id="ap-links" class="links-list"></div>
    <details class="quick"><summary>Link pantas (bookmark / Stream Deck)</summary>
    <div id="ap-quick" class="links-list small"></div></details>
  </section>`}
</div>
<div class="toast" id="ap-toast" hidden></div>`;

    const $ = id => root.querySelector("#" + id);
    const toast = msg => { const t = $("ap-toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 1800); };
    // two-step buttons (no confirm() dialogs)
    const twoStep = (btn, fn) => btn.addEventListener("click", () => {
      if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = btn.dataset.label; fn(); return; }
      btn.dataset.label = btn.textContent; btn.dataset.armed = "1"; btn.textContent = btn.dataset.confirm || "Tekan lagi";
      setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = btn.dataset.label; } }, 2600);
    });

    root.querySelectorAll("[data-t]").forEach(b => {
      const act = () => { Q.timer(b.dataset.t); toast(b.dataset.t === "start" ? "Timer berjalan" : b.dataset.t === "pause" ? "Timer dijeda" : "Timer direset"); };
      if (b.dataset.confirm) twoStep(b, act); else b.addEventListener("click", act);
    });
    root.querySelectorAll("[data-wl]").forEach(b => b.addEventListener("click", () => Q.wl(b.dataset.wl, +b.dataset.d)));
    twoStep($("ap-resetwl"), () => { Q.patch({ wins: 0, losses: 0, streak: 0 }); toast("W/L direset"); });
    root.querySelectorAll("[data-end]").forEach(b => b.addEventListener("click", () => { Q.endGame(b.dataset.end); toast(b.dataset.end === "W" ? "Menang +1" : b.dataset.end === "L" ? "Kalah +1" : "Game habis"); }));
    twoStep($("ap-clearq"), () => { Q.clear(); toast("Queue dikosongkan"); });
    $("ap-showq").addEventListener("change", e => Q.patch({ showQueue: e.target.checked }));
    $("ap-showb").addEventListener("change", e => Q.patch({ showBanner: e.target.checked }));

    // add / top up VIP
    let submitter = null;
    $("ap-add").addEventListener("click", e => { const b = e.target.closest("button[data-g]"); if (b) submitter = b; });
    $("ap-add").addEventListener("submit", e => {
      e.preventDefault();
      const name = $("ap-name").value.trim(); if (!name) { $("ap-name").focus(); toast("Taip nama dulu"); return; }
      const sb = e.submitter || submitter; submitter = sb;
      const g = submitter && submitter.dataset.g === "custom" ? parseInt($("ap-custom").value, 10) || 0 : parseInt((submitter || {}).dataset ? submitter.dataset.g : 1, 10) || 1;
      if (g <= 0) { toast("Masukkan bilangan game"); return; }
      Q.add(name, g, $("ap-joinq").checked);
      toast(`${name}: +${g} game`);
      $("ap-name").value = ""; $("ap-custom").value = ""; $("ap-name").focus();
    });
    $("ap-search").addEventListener("input", () => render(Store.state));

    root.addEventListener("click", e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a, id = b.dataset.id, k = b.dataset.k;
      if (a === "rm") Q.remove(id); else if (a === "up") Q.up(id); else if (a === "now") Q.playNow(id);
      else if (a === "b+") Q.addBal(k, 1); else if (a === "b-") Q.addBal(k, -1); else if (a === "join") { Q.join(k); toast("Masuk queue"); }
      else if (a === "del") {
        if (b.dataset.armed) { Q.delMember(k); toast("VIP dipadam"); }
        else { b.dataset.armed = "1"; b.textContent = "Pasti?"; setTimeout(() => { delete b.dataset.armed; b.textContent = "✕"; }, 2500); }
      }
    });

    const timerEl = $("ap-timer");
    setInterval(() => { const st = Store.state; timerEl.textContent = O.fmtTime(O.liveElapsed(st)); timerEl.classList.toggle("on", st.live.running); }, 250);

    function render(s) {
      const max = CFG.mabar.maxPlaying, mem = p => s.members[p.key] || { name: p.key, bal: 0 };
      $("ap-wins").textContent = s.wins; $("ap-losses").textContent = s.losses;
      $("ap-streak").textContent = s.streak >= 2 ? `Win streak ${s.streak}` : s.streak <= -2 ? `Lose ${-s.streak} berturut` : "";
      $("ap-showq").checked = !!s.showQueue; $("ap-showb").checked = !!s.showBanner;
      $("ap-pc").textContent = `${s.playing.length}/${max}`; $("ap-qc").textContent = s.queue.length;
      $("ap-play").innerHTML = s.playing.length ? s.playing.map(p => `<li><span class="nm">${esc(mem(p).name)}</span><span class="bal">${mem(p).bal} game</span>
<button class="btn sq" data-a="b-" data-k="${esc(p.key)}" aria-label="Tolak baki">−</button><button class="btn sq" data-a="b+" data-k="${esc(p.key)}" aria-label="Tambah baki">+</button><button class="btn sq" data-a="rm" data-id="${p.id}" aria-label="Keluarkan">✕</button></li>`).join("")
        : `<li class="empty">Belum ada. Tambah VIP di bawah.</li>`;
      $("ap-queue").innerHTML = s.queue.length ? s.queue.map((p, i) => `<li><span class="no">${i + 1}</span><span class="nm">${esc(mem(p).name)}</span><span class="bal">${mem(p).bal} game</span>
<button class="btn sq" data-a="up" data-id="${p.id}" aria-label="Naik">↑</button>${s.playing.length < max ? `<button class="btn sq" data-a="now" data-id="${p.id}" aria-label="Main sekarang">▶</button>` : ""}<button class="btn sq" data-a="rm" data-id="${p.id}" aria-label="Buang dari queue">✕</button></li>`).join("")
        : `<li class="empty">Queue kosong.</li>`;
      const q = ($("ap-search").value || "").trim().toLowerCase();
      const inLine = k => s.playing.some(p => p.key === k) || s.queue.some(p => p.key === k);
      const list = Object.entries(s.members).filter(([k, m]) => !q || k.includes(q)).sort((a, b) => a[1].name.localeCompare(b[1].name));
      $("ap-members").innerHTML = list.length ? list.map(([k, m]) => `<li><span class="nm">${esc(m.name)}</span><span class="bal big">${m.bal}</span>
<button class="btn sq" data-a="b-" data-k="${esc(k)}" aria-label="Tolak baki">−</button><button class="btn sq" data-a="b+" data-k="${esc(k)}" aria-label="Tambah baki">+</button>
${inLine(k) ? `<span class="tag">${s.playing.some(p => p.key === k) ? "MAIN" : "QUEUE"}</span>` : `<button class="btn sq" data-a="join" data-k="${esc(k)}" aria-label="Masuk queue" ${m.bal > 0 ? "" : "disabled"}>Q</button>`}
<button class="btn sq ghost" data-a="del" data-k="${esc(k)}" aria-label="Padam VIP">✕</button></li>`).join("")
        : `<li class="empty">${q ? "Tiada nama sepadan." : "Belum ada VIP."}</li>`;
    }
    render(Store.state); Store.on(render);

    /* ---------- YouTube viewers ---------- */
    let yt = {}; try { yt = JSON.parse(lsGet(YT_KEY, "{}")) || {}; } catch (e) {}
    $("ap-ytkey").value = yt.key || ""; $("ap-ytvid").value = yt.video || ""; $("ap-ytch").value = yt.channel || "";
    const vidOf = v => { v = String(v || "").trim(); const m = v.match(/(?:v=|youtu\.be\/|\/live\/|\/shorts\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(v) ? v : ""); };
    let cachedVid = "", cachedAt = 0;
    async function ytTick() {
      if (!yt.key || (!yt.video && !yt.channel)) return;
      try {
        let vid = vidOf(yt.video);
        if (!vid && yt.channel) {
          if (!cachedVid || Date.now() - cachedAt > 300000) {
            const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&channelId=${encodeURIComponent(yt.channel)}&eventType=live&type=video&key=${encodeURIComponent(yt.key)}`).then(r => r.json());
            cachedVid = r.items && r.items[0] && r.items[0].id ? r.items[0].id.videoId : ""; cachedAt = Date.now();
          }
          vid = cachedVid;
        }
        if (!vid) { $("ap-ytstat").textContent = "Tiada live YouTube dijumpai"; return; }
        const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${vid}&key=${encodeURIComponent(yt.key)}`).then(r => r.json());
        if (r.error) { $("ap-ytstat").textContent = "Ralat: " + (r.error.message || "API key salah"); return; }
        const d = r.items && r.items[0] && r.items[0].liveStreamingDetails;
        const n = d && d.concurrentViewers != null ? parseInt(d.concurrentViewers, 10) : null;
        if (n == null) { $("ap-ytstat").textContent = "Video bukan sedang live"; return; }
        Q.patch({ yt: { viewers: n, at: Date.now() } });
        $("ap-ytstat").textContent = `${n.toLocaleString("en-US")} menonton · ${new Date().toLocaleTimeString()}`;
      } catch (e) { $("ap-ytstat").textContent = "Tak dapat sambung ke YouTube"; }
    }
    $("ap-ytsave").addEventListener("click", () => {
      yt = { key: $("ap-ytkey").value.trim(), video: $("ap-ytvid").value.trim(), channel: $("ap-ytch").value.trim() };
      lsSet(YT_KEY, JSON.stringify(yt)); cachedVid = ""; $("ap-ytstat").textContent = "Menyemak…"; ytTick();
    });
    setInterval(ytTick, 30000); ytTick();

    if (embedded) return;

    /* ---------- connection, PIN, links ---------- */
    const conn = $("ap-conn"), auth = $("ap-auth"), pinbar = $("ap-pinbar");
    const checkAuth = () => fetch("api/auth", { headers: { "X-Pin": lsGet(PIN_KEY, "") }, cache: "no-store" }).then(r => r.json()).then(a => {
      auth.hidden = false;
      auth.textContent = a.local ? "PC INI" : a.ok ? "ADMIN" : "PERLU PIN";
      auth.className = "chip " + (a.ok ? "ok" : "warn");
      Store.canWrite = !!a.ok;
      pinbar.hidden = !!a.ok;
      renderLinks(a);
      return a;
    }).catch(() => null);
    window.addEventListener("ov-remote", e => {
      conn.textContent = e.detail ? "SERVER ✓" : "TANPA SERVER";
      conn.className = "chip " + (e.detail ? "ok" : "warn");
      if (e.detail) checkAuth().then(runAction); else { renderLinks(null); runAction(); }
    });
    window.addEventListener("ov-auth", e => { if (!e.detail) { toast("PIN salah / perlu PIN"); pinbar.hidden = false; auth.textContent = "PERLU PIN"; auth.className = "chip warn"; } });
    if (!/^https?:$/.test(location.protocol)) { conn.textContent = "TANPA SERVER"; conn.className = "chip warn"; renderLinks(null); runAction(); }
    $("ap-pinok").addEventListener("click", () => { lsSet(PIN_KEY, $("ap-pin").value.trim()); checkAuth().then(a => toast(a && a.ok ? "PIN betul" : "PIN salah")); });

    function renderLinks(a) {
      const base = location.origin.startsWith("http") ? location.origin : "http://127.0.0.1:8787";
      const lan = a && a.ips && a.ips.length ? `http://${a.ips[0]}:${a.port}` : null;
      const rows = [
        ["Overlay OBS", `http://127.0.0.1:8787/overlay.html`],
        ["Halaman penonton", `${base}/viewer.html`],
        ["App ni dari phone / admin (Wi-Fi sama)", lan ? `${lan}/control.html` : "Buka START_OVERLAY.bat untuk link Wi-Fi"],
        ["Penonton dari phone (Wi-Fi sama)", lan ? `${lan}/viewer.html` : "-"]
      ];
      $("ap-links").innerHTML = rows.map(([t, u]) => `<div class="lk"><span>${esc(t)}</span><code>${esc(u)}</code>${/^http/.test(u) ? `<button class="btn sq" type="button" data-copy="${esc(u)}" aria-label="Salin">⧉</button>` : ""}</div>`).join("");
      $("ap-quick").innerHTML = Object.keys(ACTIONS).map(k => { const u = `${base}/control.html?do=${k}`; return `<div class="lk"><code>${esc(u)}</code><button class="btn sq" type="button" data-copy="${esc(u)}" aria-label="Salin">⧉</button></div>`; }).join("");
    }
    root.addEventListener("click", e => {
      const b = e.target.closest("[data-copy]"); if (!b) return;
      const t = b.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Disalin")).catch(() => {
        const c = b.previousElementSibling; if (c) { const r = document.createRange(); r.selectNodeContents(c); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
        toast("Tekan Ctrl+C untuk salin");
      });
    });

    // ?do=win etc. (link pantas)
    let ran = false;
    function runAction() {
      if (ran) return; ran = true;
      const act = new URLSearchParams(location.search).get("do");
      if (act && ACTIONS[act]) { ACTIONS[act](); toast("Siap: " + act); try { history.replaceState(null, "", location.pathname); } catch (e) {} }
    }
  }
  O.mountControl = mountControl;
})();
