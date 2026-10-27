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

  const ACTIONS = O.ACTIONS;

  function mountControl(root, opts = {}) {
    Store.init();
    const embedded = !!opts.embedded;
    root.classList.add("app");
    const pkgs = CFG.mabar.prices.map(p => ({ n: p.games || parseInt(p.qty, 10) || 1, label: `${p.qty} · ${p.price}` }));
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
      <label class="tog"><input id="ap-shows" type="checkbox"><span>Lagu</span></label>
    </div>
    <div class="songbox">
      <div class="np-now"><span>♪ Sedang main</span><b id="ap-npauto">—</b></div>
      <input id="ap-song" placeholder="Taip tajuk lagu sendiri (pilihan)" aria-label="Tajuk lagu manual">
      <div class="row"><button class="btn" type="button" id="ap-songset">Set lagu</button><button class="btn ghost" type="button" id="ap-songauto">Ikut Spotify</button></div>
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
    <p class="muted">Setiap tekan: tambah W/L, semua yang sedang main tolak 1 game (VVIP tolak baki VVIP dulu). Baki habis keluar. <b>Rotation:</b> lepas ${CFG.mabar.rotateEvery || 3} game, pemain keluar beri ruang kalau ada orang menunggu (queue tak ramai = boleh habiskan baki).</p>
  </section>

  <section class="card queue">
    <h3>Sedang main <span id="ap-pc"></span></h3>
    <ol class="list" id="ap-play"></ol>
    <h3>Queue <span id="ap-qc"></span></h3>
    <ol class="list" id="ap-queue"></ol>
    <p class="muted">★ = VVIP fast track (terus ke depan queue). <b>Tak muncul</b> = keluar queue, baki kekal dalam hutang mabar; hilang kali ke-2 tolak 1 game, kali ke-3 tolak 2 game.</p>
    <button class="btn ghost" type="button" id="ap-clearq" data-confirm="Tekan lagi untuk kosongkan">Kosongkan queue</button>
  </section>

  <section class="card vip">
    <h3>Hutang Mabar <span id="ap-mc"></span></h3>
    <form id="ap-add" class="addform" autocomplete="off">
      <div class="two"><label class="fld">Nama<input id="ap-name" maxlength="24" placeholder="cth Aqil.MY"></label>
      <label class="fld">ID ML<input id="ap-mlid" maxlength="32" placeholder="cth 123456789 (1234)"></label></div>
      <div class="two"><label class="fld">Bilangan game<input id="ap-games" type="number" min="1" max="999" value="1" inputmode="numeric"></label>
      <label class="fld">Tarikh order<input id="ap-date" type="datetime-local"></label></div>
      <div class="row pk"><span class="muted">Isi cepat:</span>${pkgs.map(p => `<button class="btn" type="button" data-fill="${p.n}">${esc(p.label)}</button>`).join("")}</div>
      <div class="row"><button class="btn red" type="submit">Tambah</button>
      <label class="tog small"><input id="ap-joinq" type="checkbox" checked><span>Terus masuk queue</span></label>
      <label class="tog small"><input id="ap-vip" type="checkbox"><span>VVIP (fast track)</span></label></div>
    </form>
    <input id="ap-search" class="search" placeholder="Cari nama atau ID…" aria-label="Cari VIP">
    <ol class="list members" id="ap-members"></ol>
  </section>

  <section class="card mvp">
    <h3>Senarai MVP <span id="ap-mvc"></span></h3>
    <textarea id="ap-mvprules" class="rules-in" rows="3" aria-label="Peraturan MVP"></textarea>
    <form id="ap-mvpadd" class="row" autocomplete="off"><input id="ap-mvpname" maxlength="24" placeholder="Nama pemain baru" aria-label="Nama MVP baru"><button class="btn red" type="submit">Tambah</button></form>
    <input id="ap-mvpsearch" class="search" placeholder="Cari nama…" aria-label="Cari MVP">
    <p class="muted"><b>+</b> = MVP Win (VVIP dapat free 1 game). Bila cukup 5 / 15: <b>Claim ✓</b> (ditanda hijau) atau <b>Simpan</b> (belum claim). Tekan nombor lama untuk tukar claim / belum.</p>
    <ol class="list mvplist" id="ap-mvp"></ol>
  </section>

  <section class="card akaun">
    <h3>Slot Mainkan Akaun <span>15-20 game</span></h3>
    <div class="ak-head"><span>Hari</span><span>Nama</span><span>Tarikh</span><span></span></div>
    <ol class="list aklist" id="ap-akaun"></ol>
    <div class="row"><button class="btn" type="button" id="ap-akadd">+ Baris</button><button class="btn ghost" type="button" id="ap-akreset" data-confirm="Tekan lagi: kosongkan semua">Reset jadual</button></div>
  </section>

  <section class="card rules">
    <h3>Peraturan</h3>
    <textarea id="ap-rules" class="rules-in" rows="14" aria-label="Peraturan Mabar"></textarea>
    <div class="row"><button class="btn red" type="button" id="ap-rulesave">Simpan peraturan</button><span class="muted">Baris mula dengan <b>#</b> = tajuk. Penonton nampak dalam halaman penonton.</span></div>
    <div class="row"><button class="btn ghost" type="button" id="ap-import" data-confirm="Tekan lagi untuk import">Import data doc lama</button><input type="file" id="ap-impfile" accept=".js,.json,text/javascript,application/json" hidden><span class="muted" id="ap-impst"></span></div>
  </section>

  <section class="card orders">
    <h3>Order masuk <span id="ap-oc"></span></h3>
    <ol class="list" id="ap-orders"></ol>
    <p class="muted">Order Sociabuzz masuk sendiri ke sini dan ke queue. Pembeli perlu tulis ID ML dalam mesej, contoh <b>ID 123456789 (1234) 3 game</b>.</p>
    <div class="hookst" id="ap-hookst"><b>Status webhook</b><span id="ap-hooklast">Masuk dengan PIN / buka START_OVERLAY.bat</span></div>
    <ol class="list hooklog" id="ap-hooklog"></ol>
    <div class="row"><button class="btn gold" type="button" id="ap-simorder">Simulasi order</button><button class="btn" type="button" id="ap-testalert">Test alert</button></div>
    <p class="muted"><b>Simulasi order</b> hantar order palsu (Test SYNO, ID 123456789 (1234), RM10 = 3 game) melalui webhook yang sama dengan Sociabuzz: masuk queue + alert di overlay. Padam VIP "Test SYNO" lepas test. <b>Test alert</b> cuma tunjuk alert di overlay.</p>
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
    <details class="quick"><summary>Butang Stream Deck</summary>
    <p class="muted">Stream Deck › <b>Website</b> › tampal link › tanda <b>GET request in background</b>. Atau guna fail dalam folder <b>deck</b> (System › Open). Overlay atau App mesti terbuka.</p>
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
    root.querySelectorAll("[data-end]").forEach(b => b.addEventListener("click", () => {
      const rot = Q.endGame(b.dataset.end) || [];
      toast((b.dataset.end === "W" ? "Menang +1" : b.dataset.end === "L" ? "Kalah +1" : "Game habis") + (rot.length ? ` · rotate: ${rot.join(", ")}` : ""));
    }));
    twoStep($("ap-clearq"), () => { Q.clear(); toast("Queue dikosongkan"); });
    $("ap-showq").addEventListener("change", e => Q.patch({ showQueue: e.target.checked }));
    $("ap-showb").addEventListener("change", e => Q.patch({ showBanner: e.target.checked }));
    const songPatch = o => Store.set(s => { s.song = Object.assign({ on: true, manual: "" }, s.song || {}, o); });
    $("ap-shows").addEventListener("change", e => songPatch({ on: e.target.checked }));
    $("ap-songset").addEventListener("click", () => { songPatch({ manual: $("ap-song").value.trim().slice(0, 120) }); toast("Lagu ditukar"); });
    $("ap-song").addEventListener("keydown", e => { if (e.key === "Enter") $("ap-songset").click(); });
    $("ap-songauto").addEventListener("click", () => { $("ap-song").value = ""; songPatch({ manual: "" }); toast("Lagu ikut Spotify"); });
    if (O.NP) { O.NP.start(); setInterval(() => {
      const st = Store.state.song || {}, a = O.NP.text;
      $("ap-npauto").textContent = st.on === false ? "Lagu disorok" : st.manual ? `${st.manual}  (manual)` : a ? a : (Store.remote ? "Tiada lagu dikesan: buka Spotify di PC & mainkan lagu" : "Perlu START_OVERLAY.bat");
    }, 1000); }

    // add / top up VIP
    const pad2 = n => String(n).padStart(2, "0");
    const toLocalInput = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    const resetDate = () => { $("ap-date").value = toLocalInput(new Date()); };
    resetDate();
    root.querySelectorAll("[data-fill]").forEach(b => b.addEventListener("click", () => { $("ap-games").value = b.dataset.fill; $("ap-games").focus(); }));
    $("ap-add").addEventListener("submit", e => {
      e.preventDefault();
      const name = $("ap-name").value.trim(); if (!name) { $("ap-name").focus(); toast("Taip nama dulu"); return; }
      const g = parseInt($("ap-games").value, 10) || 0;
      if (g <= 0) { $("ap-games").focus(); toast("Masukkan bilangan game"); return; }
      const at = $("ap-date").value ? new Date($("ap-date").value).getTime() : Date.now();
      const vip = $("ap-vip").checked;
      Q.add(name, g, $("ap-joinq").checked, { mlid: $("ap-mlid").value, at, vip });
      toast(`${name}: +${g} game${vip ? " VVIP" : ""}`);
      $("ap-name").value = ""; $("ap-mlid").value = ""; $("ap-games").value = "1"; $("ap-vip").checked = false; resetDate(); $("ap-name").focus();
    });
    $("ap-search").addEventListener("input", () => render(Store.state, true));
    root.addEventListener("change", e => {
      const t = e.target;
      if (t.classList.contains("idin")) { Q.setMl(t.dataset.k, t.value); toast("ID disimpan"); }
      else if (t.classList.contains("dtin")) { Q.setMember(t.dataset.k, { last: t.value ? new Date(t.value).getTime() : 0 }); toast("Tarikh disimpan"); }
      else if (t.classList.contains("akin")) { Q.akaunSet(+t.dataset.i, t.dataset.f, t.value.trim()); toast("Disimpan"); }
      else if (t.classList.contains("mvcin")) { Q.mvpSet(t.dataset.id, { cur: Math.max(0, parseInt(t.value, 10) || 0) }); toast("MVP disimpan"); }
    });
    root.addEventListener("keydown", e => {
      const t = e.target; if (e.key !== "Enter") return;
      if (t.classList.contains("gin")) { e.preventDefault(); t.closest("li").querySelector('[data-a="addn"]').click(); }
      if (t.classList.contains("idin") || t.classList.contains("akin") || t.classList.contains("mvcin")) { e.preventDefault(); t.blur(); }
    });

    root.addEventListener("click", e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a, id = b.dataset.id, k = b.dataset.k;
      if (a === "rm") Q.remove(id); else if (a === "up") Q.up(id); else if (a === "now") Q.playNow(id);
      else if (a === "b+") Q.addBal(k, 1); else if (a === "b-") Q.addBal(k, -1); else if (a === "join") { Q.join(k); toast("Masuk queue"); }
      else if (a === "bottom") { Q.toBottom(id); toast("Ke bawah queue"); }
      else if (a === "noshow") {
        if (!b.dataset.armed) { b.dataset.armed = "1"; b.dataset.label = b.textContent; b.textContent = "Pasti?"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = b.dataset.label; } }, 2500); return; }
        const r = Q.noShow(id); if (r) toast(`${r.name}: hilang ${r.miss}x${r.pen ? ` · tolak ${r.pen} game` : ""}`);
      }
      else if (a === "miss0") { Q.setMember(k, { miss: 0 }); toast("Kiraan hilang direset"); }
      else if (a === "vvip") { const m = Store.state.members[k]; Q.setMember(k, { vvip: !(m && m.vvip) }); }
      else if (a === "mv+") { const f = Q.mvpBump(id, 1); toast(f ? `MVP +1 · ${f} VVIP free 1 game` : "MVP +1"); }
      else if (a === "mv-") Q.mvpBump(id, -1);
      else if (a === "mvclaim") { Q.mvpClose(id, true); toast("Claim ✓ (hijau)"); }
      else if (a === "mvkeep") { Q.mvpClose(id, false); toast("Disimpan (belum claim)"); }
      else if (a === "mvh") Q.mvpToggle(id, +b.dataset.i);
      else if (a === "mvhdel") Q.mvpDelHist(id, +b.dataset.i);
      else if (a === "mvdel") {
        if (b.dataset.armed) Q.mvpDel(id);
        else { b.dataset.armed = "1"; b.textContent = "Pasti?"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "✕"; } }, 2500); }
      }
      else if (a === "akdel") Q.akaunDel(+b.dataset.i);
      else if (a === "addn" || a === "setn") {
        const inp = b.closest("li").querySelector(".gin"), n = parseInt(inp.value, 10);
        if (isNaN(n)) { inp.focus(); toast("Taip nombor dulu"); return; }
        const vip = (b.closest("li").querySelector(".gsel") || {}).value === "v", lbl = vip ? " VVIP" : "";
        if (a === "addn") { Q.addBal(k, n, vip); toast(`${n >= 0 ? "+" : ""}${n} game${lbl}`); } else { Q.setBal(k, n, vip); toast(`Baki${lbl} = ${Math.max(0, n)}`); }
        inp.value = "";
      }
      else if (a === "del") {
        if (b.dataset.armed) { Q.delMember(k); toast("VIP dipadam"); }
        else { b.dataset.armed = "1"; b.textContent = "Pasti?"; setTimeout(() => { delete b.dataset.armed; b.textContent = "✕"; }, 2500); }
      }
    });

    const timerEl = $("ap-timer");
    setInterval(() => { const st = Store.state; timerEl.textContent = O.fmtTime(O.liveElapsed(st)); timerEl.classList.toggle("on", st.live.running); }, 250);

    const fmtDate = ms => { if (!ms) return ""; const d = new Date(ms), h = d.getHours(); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${h % 12 || 12}:${pad2(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`; };
    const toInput = ms => ms ? toLocalInput(new Date(ms)) : "";
    const busyIn = box => box.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    let pending = {};
    function render(s, force) {
      const max = CFG.mabar.maxPlaying, rot = CFG.mabar.rotateEvery || 0, T = O.Q.tot;
      const mem = p => s.members[p.key] || { name: p.key, bal: 0, vbal: 0 };
      const balTxt = m => (m.vbal ? `${m.bal || 0} + ${m.vbal} VVIP` : `${m.bal || 0}`) + " game";
      const who = (p, extra = "") => `<span class="who"><span class="nm">${p.vip ? `<i class="vv">★</i> ` : ""}${esc(mem(p).name)}</span><span class="sub">${mem(p).mlid ? `ID ${esc(mem(p).mlid)}` : "tiada ID"}${mem(p).last ? ` · order ${fmtDate(mem(p).last)}` : ""}${extra}</span></span>`;
      $("ap-wins").textContent = s.wins; $("ap-losses").textContent = s.losses;
      $("ap-streak").textContent = s.streak >= 2 ? `Win streak ${s.streak}` : s.streak <= -2 ? `Lose ${-s.streak} berturut` : "";
      $("ap-showq").checked = !!s.showQueue; $("ap-showb").checked = !!s.showBanner; $("ap-shows").checked = !s.song || s.song.on !== false;
      if (document.activeElement !== $("ap-song")) $("ap-song").value = (s.song && s.song.manual) || "";
      $("ap-pc").textContent = `${s.playing.length}/${max}`; $("ap-qc").textContent = s.queue.length;
      $("ap-play").innerHTML = s.playing.length ? s.playing.map(p => `<li class="qrow"><div class="qtop">${who(p, (p.n ? ` · dah ${p.n} game` : "") + (rot && (p.n || 0) >= rot ? " · boleh rotate" : ""))}<span class="bal">${balTxt(mem(p))}</span></div>
<div class="qctl"><button class="btn sq" data-a="b-" data-k="${esc(p.key)}" aria-label="Tolak baki">−</button><button class="btn sq" data-a="b+" data-k="${esc(p.key)}" aria-label="Tambah baki">+</button><button class="btn small ghost" data-a="noshow" data-id="${p.id}">Tak muncul</button><button class="btn sq" data-a="rm" data-id="${p.id}" aria-label="Keluarkan">✕</button></div></li>`).join("")
        : `<li class="empty">Belum ada. Tambah dalam Hutang Mabar di bawah.</li>`;
      $("ap-queue").innerHTML = s.queue.length ? s.queue.map((p, i) => `<li class="qrow"><div class="qtop"><span class="no">${i + 1}</span>${who(p)}<span class="bal">${balTxt(mem(p))}</span></div>
<div class="qctl"><button class="btn sq" data-a="up" data-id="${p.id}" aria-label="Naik">↑</button><button class="btn sq" data-a="bottom" data-id="${p.id}" aria-label="Ke bawah queue">⤓</button>${s.playing.length < max ? `<button class="btn sq" data-a="now" data-id="${p.id}" aria-label="Main sekarang">▶</button>` : ""}<button class="btn small ghost" data-a="noshow" data-id="${p.id}">Tak muncul</button><button class="btn sq" data-a="rm" data-id="${p.id}" aria-label="Buang dari queue">✕</button></div></li>`).join("")
        : `<li class="empty">Queue kosong.</li>`;
      const ords = (s.orders || []).slice(0, 40);
      $("ap-oc").textContent = ords.length ? `${ords.length}` : "";
      const srcTag = o => o.src === "sociabuzz" ? `<span class="tag sb">SOCIABUZZ</span>` : o.src === "test" ? `<span class="tag test">TEST</span>` : o.src === "sim" ? `<span class="tag test">ALERT</span>` : `<span class="tag man">MANUAL</span>`;
      $("ap-orders").innerHTML = ords.length ? ords.map(o => `<li class="${o.warn ? "warn" : ""}">${srcTag(o)}<span class="who"><span class="nm">${esc(o.name)}</span><span class="sub">${o.mlid ? `ID ${esc(o.mlid)} · ` : "tiada ID · "}${fmtDate(o.at)}${o.amount ? ` · ${esc(o.cur || "")} ${o.amount}` : ""}${o.warn ? ` · ${esc(o.warn)}` : ""}</span></span><span class="bal">${o.games ? `+${o.games} game${o.vip ? " VVIP" : ""}` : "—"}</span></li>`).join("")
        : `<li class="empty">Belum ada order.</li>`;
      // text areas: never overwrite while being edited
      if (document.activeElement !== $("ap-rules") && !$("ap-rules").dataset.dirty) $("ap-rules").value = s.rules || "";
      if (document.activeElement !== $("ap-mvprules")) $("ap-mvprules").value = s.mvpRules || "";
      $("ap-impst").textContent = s.docImported ? `Dah diimport ${fmtDate(s.docImported)}` : "Belum diimport";
      // hutang mabar (members)
      const list = Object.entries(s.members);
      $("ap-mc").textContent = `${list.filter(([, m]) => T(m) > 0).length} orang · ${list.reduce((a, [, m]) => a + T(m), 0)} game`;
      const box = $("ap-members");
      if (!force && busyIn(box)) pending.members = true;
      else {
        pending.members = false;
        const q = ($("ap-search").value || "").trim().toLowerCase();
        const inLine = k => s.playing.some(p => p.key === k) || s.queue.some(p => p.key === k);
        const rows = list.filter(([k, m]) => !q || k.includes(q) || String(m.mlid || "").toLowerCase().includes(q)).sort((a, b) => (T(b[1]) > 0) - (T(a[1]) > 0) || (b[1].last || 0) - (a[1].last || 0) || a[1].name.localeCompare(b[1].name));
        box.innerHTML = rows.length ? rows.map(([k, m]) => `<li class="mrow${T(m) ? "" : " zero"}">
<div class="mtop"><span class="who"><span class="nm">${esc(m.name)} <button class="vvbtn${m.vvip ? " on" : ""}" type="button" data-a="vvip" data-k="${esc(k)}" title="${m.vvip ? "VVIP (tekan untuk buang)" : "Tanda sebagai VVIP"}" aria-label="VVIP ${esc(m.name)}">${m.vvip ? "★ VVIP" : "☆"}</button></span><span class="sub">${m.last ? `order ${fmtDate(m.last)}` : "tiada tarikh"}${m.miss ? ` · hilang ${m.miss}x` : ""}</span></span>
${inLine(k) ? `<span class="tag">${s.playing.some(p => p.key === k) ? "MAIN" : "QUEUE"}</span>` : `<button class="btn sq" data-a="join" data-k="${esc(k)}" aria-label="Masuk queue" title="Masuk queue" ${T(m) > 0 ? "" : "disabled"}>Q</button>`}
<span class="bal big">${T(m)}</span><small class="muted">${m.vbal ? `${m.bal || 0}+${m.vbal}V` : "game"}</small></div>
<div class="mctl"><input class="idin" data-k="${esc(k)}" value="${esc(m.mlid || "")}" placeholder="ID ML" aria-label="ID ML ${esc(m.name)}">
<input class="dtin" type="datetime-local" data-k="${esc(k)}" value="${toInput(m.last)}" aria-label="Waktu order ${esc(m.name)}"></div>
<div class="mgrid"><input class="gin" type="number" inputmode="numeric" placeholder="0" aria-label="Bilangan game untuk ${esc(m.name)}">
<select class="gsel" aria-label="Jenis baki"><option value="">Biasa</option><option value="v">VVIP</option></select>
<button class="btn" data-a="addn" data-k="${esc(k)}">Tambah</button><button class="btn ghost" data-a="setn" data-k="${esc(k)}">Set</button>
<button class="btn sq ghost" data-a="del" data-k="${esc(k)}" aria-label="Padam ${esc(m.name)}">✕</button></div>
${m.miss ? `<div class="mctl"><span class="muted">Hilang ${m.miss} kali</span><button class="btn small ghost" data-a="miss0" data-k="${esc(k)}">Reset hilang</button></div>` : ""}</li>`).join("")
          : `<li class="empty">${q ? "Tiada nama sepadan." : "Belum ada rekod."}</li>`;
      }
      // MVP
      const mvBox = $("ap-mvp");
      $("ap-mvc").textContent = `${(s.mvp || []).length} orang`;
      if (!force && busyIn(mvBox)) pending.mvp = true;
      else {
        pending.mvp = false;
        const q = ($("ap-mvpsearch").value || "").trim().toLowerCase();
        const mv = (s.mvp || []).filter(x => !q || x.name.toLowerCase().includes(q));
        mvBox.innerHTML = mv.length ? mv.map(x => `<li class="mvrow"><div class="mtop"><span class="who"><span class="nm">${esc(x.name)}</span>
<span class="hist">${(x.hist || []).map((h, i) => `<button class="hc${h.c ? " ok" : ""}" type="button" data-a="mvh" data-id="${x.id}" data-i="${i}" title="Tekan: tukar claim / belum">${h.n}</button>`).join("")}</span></span>
<button class="btn sq" data-a="mv-" data-id="${x.id}" aria-label="MVP tolak 1">−</button><input class="mvcin" type="number" inputmode="numeric" data-id="${x.id}" value="${x.cur || 0}" aria-label="MVP ${esc(x.name)}"><button class="btn sq gold" data-a="mv+" data-id="${x.id}" aria-label="MVP tambah 1">+</button></div>
<div class="mctl mvctl">${(x.cur || 0) >= 5 ? `<button class="btn small gold" data-a="mvclaim" data-id="${x.id}">Claim ${x.cur} ✓</button><button class="btn small ghost" data-a="mvkeep" data-id="${x.id}">Simpan ${x.cur}</button>` : `<span class="muted">${5 - (x.cur || 0)} lagi untuk x5</span>`}
${(x.hist || []).length ? `<button class="btn small ghost" data-a="mvhdel" data-id="${x.id}" data-i="${x.hist.length - 1}">Buang nombor akhir</button>` : ""}<button class="btn sq ghost" data-a="mvdel" data-id="${x.id}" aria-label="Padam">✕</button></div></li>`).join("")
          : `<li class="empty">${q ? "Tiada nama sepadan." : "Belum ada."}</li>`;
      }
      // slot mainkan akaun
      const akBox = $("ap-akaun");
      if (!force && busyIn(akBox)) pending.akaun = true;
      else {
        pending.akaun = false;
        akBox.innerHTML = (s.akaun || []).map((r, i) => `<li class="akrow"><input class="akin" data-i="${i}" data-f="day" value="${esc(r.day)}" placeholder="Hari" aria-label="Hari"><input class="akin" data-i="${i}" data-f="name" value="${esc(r.name)}" placeholder="Nama" aria-label="Nama"><input class="akin" data-i="${i}" data-f="date" value="${esc(r.date)}" placeholder="Tarikh" aria-label="Tarikh"><button class="btn sq ghost" data-a="akdel" data-i="${i}" aria-label="Buang baris">✕</button></li>`).join("");
      }
    }
    root.addEventListener("focusout", () => setTimeout(() => { if (Object.values(pending).some(Boolean) && !busyIn(root)) render(Store.state); }, 50));
    render(Store.state); Store.on(render);
    const ACT_LABEL = { "win": "Win +1", "lose": "Lose +1", "win-1": "Win −1", "lose-1": "Lose −1", "end-win": "Menang", "end-lose": "Kalah", "end": "Game habis",
      "timer-start": "Timer mula", "timer-pause": "Timer jeda", "timer-reset": "Timer reset", "queue-on": "Queue on", "queue-off": "Queue off", "banner-on": "Banner on", "banner-off": "Banner off" };
    window.addEventListener("ov-cmd", e => { const d = e.detail || {}, rot = Array.isArray(d.res) && d.res.length ? ` · rotate: ${d.res.join(", ")}` : ""; toast(`Stream Deck: ${ACT_LABEL[d.a] || d.a}${rot}`); });
    $("ap-mvpsearch").addEventListener("input", () => render(Store.state, true));
    $("ap-mvpadd").addEventListener("submit", e => { e.preventDefault(); const n = $("ap-mvpname").value.trim(); if (!n) return; Q.mvpAdd(n); $("ap-mvpname").value = ""; toast(`${n} ditambah`); });
    $("ap-mvprules").addEventListener("change", e => { Q.patch({ mvpRules: e.target.value.trim() }); toast("Peraturan MVP disimpan"); });
    $("ap-rules").addEventListener("input", e => { e.target.dataset.dirty = "1"; });
    $("ap-rulesave").addEventListener("click", () => { Q.patch({ rules: $("ap-rules").value.trim() }); delete $("ap-rules").dataset.dirty; toast("Peraturan disimpan"); });
    $("ap-akadd").addEventListener("click", () => Q.akaunAdd());
    twoStep($("ap-akreset"), () => { Q.akaunReset(); toast("Jadual dikosongkan"); });
    const runImport = seed => { const r = Q.importDoc(seed); toast(`Import: ${r.members} orang, ${r.mvp} MVP`); };
    const doImport = () => window.SYNO_SEED ? runImport(window.SYNO_SEED) : $("ap-impfile").click();
    // no assets/seed_doc.js on this device: pick the file (seed_doc.js or .json) instead
    $("ap-impfile").addEventListener("change", e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      f.text().then(t => {
        const j = t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1);
        const seed = JSON.parse(j); if (!seed || !Array.isArray(seed.hutang)) throw new Error("bad");
        runImport(seed);
      }).catch(() => toast("Fail tak sah")).finally(() => { e.target.value = ""; });
    });
    twoStep($("ap-import"), doImport);
    // first run on the PC: bring in the old Google Doc list automatically (once)
    let autoImp = false;
    const tryAutoImport = () => { if (autoImp || !window.SYNO_SEED || !Store.canWrite || Store.state.docImported) return; if (/^https?:$/.test(location.protocol) && !Store.remote) return; autoImp = true; doImport(); };
    window.addEventListener("ov-remote", () => setTimeout(tryAutoImport, 1500));
    if (!/^https?:$/.test(location.protocol)) setTimeout(tryAutoImport, 800);
    Store.on((s, prev) => {
      const a = (s.orders || [])[0], b = prev && (prev.orders || [])[0];
      if (a && (!b || a.rx !== b.rx) && a.src !== "manual" && a.src !== "sim") toast(a.src === "test" ? "Test Sociabuzz diterima ✓" : `Order Sociabuzz: ${a.name} +${a.games} game`);
    });

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
    let ran = false; // ?do= link pantas dijalankan sekali sahaja
    const checkAuth = () => fetch("api/auth", { headers: { "X-Pin": lsGet(PIN_KEY, "") }, cache: "no-store" }).then(r => r.json()).then(a => {
      auth.hidden = false;
      auth.textContent = a.local ? "PC INI" : a.ok ? "ADMIN" : "PERLU PIN";
      auth.className = "chip " + (a.ok ? "ok" : "warn");
      Store.canWrite = !!a.ok;
      pinbar.hidden = !!a.ok;
      lastAuth = a;
      renderLinks(a); hookTick();
      return a;
    }).catch(() => null);

    /* ---------- webhook test & status ---------- */
    let lastAuth = null;
    const hookPath = () => { const m = String(lastAuth && lastAuth.hookUrl || "").match(/\/api\/order-hook\/[^/?#]+/); return m ? m[0].slice(1) : ""; };
    const tm = ms => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
    const RES = { ok: ["OK ✓", "ok"], key: ["KUNCI SALAH: URL tak lengkap / salah salin", "bad"], get: ["dibuka dalam browser (GET) ✓", "ok"], empty: ["SAMPAI TAPI KOSONG", "bad"] };
    function hookTick() {
      if (!lastAuth || !lastAuth.ok) return;
      fetch("api/hooklog", { headers: { "X-Pin": lsGet(PIN_KEY, "") }, cache: "no-store" }).then(r => r.ok ? r.json() : null).then(list => {
        if (!Array.isArray(list)) { $("ap-hooklast").textContent = "Server lama: tutup tetingkap hitam & buka semula START_OVERLAY.bat"; return; }
        const pub = lastAuth.publicUrl;
        if (!list.length) {
          $("ap-hooklast").textContent = pub ? "Belum ada apa-apa sampai sejak server dibuka." : "Link kekal belum aktif: Sociabuzz tak boleh sampai. Klik PASANG_LINK_KEKAL.bat.";
          $("ap-hookst").className = "hookst warn"; $("ap-hooklog").innerHTML = ""; return;
        }
        const r0 = RES[list[0].r] || [list[0].r, ""];
        $("ap-hooklast").textContent = `Terakhir ${tm(list[0].t)} · ${list[0].via} · ${r0[0]}`;
        $("ap-hookst").className = "hookst " + (r0[1] === "ok" ? "ok" : "warn");
        $("ap-hooklog").innerHTML = list.slice(0, 8).map(h => { const r = RES[h.r] || [h.r, ""]; return `<li class="${r[1]}"><span class="who"><span class="nm">${esc(tm(h.t))} · ${esc(h.via)}</span><span class="sub">${esc(r[0])} · ${h.n} bait${h.ua ? " · " + esc(h.ua) : ""}</span></span></li>`; }).join("");
      }).catch(() => {});
    }
    setInterval(hookTick, 4000);
    $("ap-simorder").addEventListener("click", () => {
      const p = hookPath(); if (!p) { toast("Perlu server & PIN dulu"); return; }
      const body = { id: "SIM-" + Date.now(), amount: 10, currency: "MYR", supporter: "Test SYNO", email_supporter: "test@syno.local", message: "ID 123456789 (1234) 3 game", created_at: new Date().toISOString() };
      fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(r => { toast(r.ok ? "Order palsu dihantar, tunggu 3 saat…" : "Server tolak (" + r.status + ")"); setTimeout(hookTick, 600); })
        .catch(() => toast("Server tak jawab"));
    });
    $("ap-testalert").addEventListener("click", () => {
      if (!Store.canWrite) { toast("Perlu PIN dulu"); return; }
      Store.set(s => Q._log(s, { key: "", name: "Test Alert", mlid: "", games: 3, at: Date.now(), src: "sim" }));
      toast("Alert dihantar ke overlay");
    });
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
      const pub = a && a.publicUrl ? a.publicUrl : "";
      const rows = [
        ["LINK KEKAL penonton (letak di Linktree / bio)", pub ? `${pub}/viewer.html` : "Belum aktif: pasang Tailscale (lihat PASANG_OBS.md › Link kekal)"],
        ["LINK KEKAL admin (dari mana-mana, perlu PIN)", pub ? `${pub}/control.html` : "-"],
        ["Sociabuzz Webhook URL", a && a.hookUrl ? (a.hookUrl.startsWith("http") ? a.hookUrl : (pub ? pub + a.hookUrl : "Perlu link kekal dulu")) : "Masuk dengan PIN untuk lihat"],
        ["Overlay OBS", `http://127.0.0.1:8787/overlay.html`],
        ["Potong logo rank (masukkan gambar semua rank)", `${base}/rank_tool.html`],
        ["Halaman penonton", `${base}/viewer.html`],
        ["App ni dari phone / admin (Wi-Fi sama)", lan ? `${lan}/control.html` : "Buka START_OVERLAY.bat untuk link Wi-Fi"],
        ["Penonton dari phone (Wi-Fi sama)", lan ? `${lan}/viewer.html` : "-"]
      ];
      $("ap-links").innerHTML = rows.map(([t, u]) => `<div class="lk"><span>${esc(t)}</span><code>${esc(u)}</code>${/^http/.test(u) ? `<button class="btn sq" type="button" data-copy="${esc(u)}" aria-label="Salin">⧉</button>` : ""}</div>`).join("");
      const DECK = [["end-win", "Menang (W +1, tolak baki)"], ["end-lose", "Kalah (L +1, tolak baki)"], ["end", "Game habis (tak kira W/L)"], ["win", "Win +1 sahaja"], ["lose", "Lose +1 sahaja"], ["win-1", "Win −1"], ["lose-1", "Lose −1"],
        ["timer-start", "Timer mula"], ["timer-pause", "Timer jeda"], ["timer-reset", "Timer reset"], ["queue-on", "Queue on"], ["queue-off", "Queue off"], ["banner-on", "Banner on"], ["banner-off", "Banner off"]];
      $("ap-quick").innerHTML = DECK.map(([k, t]) => { const u = `http://127.0.0.1:${(a && a.port) || 8787}/api/do/${k}`; return `<div class="lk"><span>${esc(t)}</span><code>${esc(u)}</code><button class="btn sq" type="button" data-copy="${esc(u)}" aria-label="Salin">⧉</button></div>`; }).join("");
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
    function runAction() {
      if (ran) return; ran = true;
      const act = new URLSearchParams(location.search).get("do");
      if (act && ACTIONS[act]) { ACTIONS[act](); toast("Siap: " + act); try { history.replaceState(null, "", location.pathname); } catch (e) {} }
    }
  }
  O.mountControl = mountControl;
})();
