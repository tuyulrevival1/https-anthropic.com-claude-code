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
    const appOpen = Date.now(); // order tab badge counts orders that came in after the app opened
    const embedded = !!opts.embedded;
    root.classList.add("app");
    const pkgs = CFG.mabar.prices.map(p => ({ n: p.games || parseInt(p.qty, 10) || 1, label: `${p.qty} · ${p.price}` }));
    root.innerHTML = `
${embedded ? "" : `<header class="app-top">
  <div class="brand"><b>SYNO</b> CONTROL</div>
  <div class="chips"><span class="chip" id="ap-conn">MENYAMBUNG…</span><span class="chip" id="ap-auth" hidden></span><span class="chip ok" id="ap-hookchip" hidden></span><span class="chip warn" id="ap-upd" hidden title="Tutup overlay, klik KEMASKINI.bat dalam folder stream_overlay">VERSI BARU · KLIK KEMASKINI.BAT</span>
  <button class="btn small ghost" type="button" id="ap-lay">⠿ Susun layout</button><button class="btn small ghost" type="button" id="ap-layreset" hidden>Reset</button></div>
  <nav class="app-tabs" id="ap-tabs" role="tablist" aria-label="Bahagian"></nav>
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
    <div class="row oc" role="group" aria-label="Mabar VIP">
      <b class="oc-l">Mabar VIP</b>
      <button class="btn ocbtn oc-open" type="button" id="ap-open" aria-pressed="true">OPEN</button>
      <button class="btn ocbtn oc-closed" type="button" id="ap-close" aria-pressed="false">CLOSED</button>
      <label class="tog"><input id="ap-showq" type="checkbox"><span>Senarai queue</span></label>
    </div>
    <div class="row toggles">
      <label class="tog"><input id="ap-showb" type="checkbox"><span>Banner</span></label>
      <label class="tog"><input id="ap-shows" type="checkbox"><span>Lagu</span></label>
    </div>
    <div class="row toggles fxrow">
      <label class="tog"><input id="ap-fx" type="checkbox"><span>Efek menang / kalah</span></label>
      <label class="tog"><input id="ap-fxs" type="checkbox"><span>Bunyi efek</span></label>
      <button class="btn small gold" type="button" id="ap-fxwin">Uji MENANG</button>
      <button class="btn small red" type="button" id="ap-fxlose">Uji KALAH</button>
      <button class="btn small" type="button" id="ap-fxmvp">Uji MVP</button>
    </div>
    <div class="ovparts">
      <b class="ctest-h">Tunjuk di overlay</b>
      ${[["p", "Portrait", [["cam", "Handcam"]]], ["l", "Landscape", [["cam", "Facecam"], ["hand", "Handcam"]]]].map(([o, t, cams]) => `<div class="ovp-col"><span class="ovp-t">${t}</span>${cams.concat([["score", "WIN / LOSE"], ["mabar", "Mabar VIP"], ["banner", "Banner"], ["band", "Bar LIVE"]]).map(([k, n]) => `<label class="tog"><input type="checkbox" class="ovp" data-o="${o}" data-k="${k}" checked><span>${n}</span></label>`).join("")}${o === "l" ? `<p class="muted ovp-obs" id="ap-ovpobs"></p>` : ""}</div>`).join("")}
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
    <p class="muted">Setiap tekan: tambah W/L, semua yang sedang main tolak 1 game (VVIP tolak baki VVIP dulu). Baki habis keluar. <b>Rotation:</b> lepas ${CFG.mabar.rotateEvery || 3} game, pemain keluar beri ruang kalau ada orang menunggu (queue tak ramai = boleh habiskan baki).</p>
  </section>

  <section class="card killfx">
    <h3>Auto efek kill <span id="ap-kst"></span></h3>
    <p class="muted">Server di PC baca skrin game. Bila <b>anda</b> dapat kill, efek penuh skrin + suara keluar terus (FIRST BLOOD → DOUBLE KILL terus bertukar). Kill orang lain: tiada efek. MLBB mesti bahasa <b>English</b>.</p>
    <div class="row toggles"><label class="tog"><input id="ap-kon" type="checkbox"><span>Auto detect kill</span></label>
      <label class="tog"><input id="ap-kvoice" type="checkbox"><span>Suara announcer</span></label></div>
    <b class="kstep">1 · Ambil skrin game dari</b>
    <div class="kseg" id="ap-ksrc"><button type="button" data-v="obs">OBS (paling stabil)</button><button type="button" data-v="win">Tetingkap di PC</button></div>
    <div class="ksrc" data-src="obs">
      <label class="fld">Source game dalam OBS<div class="row kwin"><select id="ap-kobs"><option value="">— pilih source —</option></select><button class="btn small ghost" type="button" id="ap-kobsr">↻ Sambung OBS</button></div></label>
      <div class="row kobsrow"><label class="fld kport">Port<input id="ap-kport" type="number" min="1" max="65535" inputmode="numeric"></label>
        <label class="fld kpass">Password WebSocket<input id="ap-kpass" type="password" autocomplete="off" placeholder="taip untuk tukar"></label></div>
      <p class="muted">OBS › <b>Tools › WebSocket Server Settings</b> › tanda <b>Enable WebSocket server</b>. Password: tekan <b>Show Connect Info</b>.</p>
    </div>
    <div class="ksrc" data-src="win">
      <label class="fld">Tetingkap game di PC (mirror / OBS Windowed Projector)<div class="row kwin"><select id="ap-kwin"><option value="">— pilih tetingkap —</option></select><button class="btn small ghost" type="button" id="ap-kwinr">↻ Muat semula</button></div></label>
      <p class="muted">Jangan minimize tetingkap tu.</p>
    </div>
    <b class="kstep">2 · Kill siapa</b>
    <div class="row toggles"><label class="fld kteam"><select id="ap-kteam"><option value="hero">Kill saya: banner biru + logo hero saya (Chou)</option><option value="me">Kill saya: banner biru + nama saya</option><option value="kda">Kill saya: ikut KDA sahaja</option><option value="ally">Pasukan kita (biru)</option><option value="all">Semua kill</option></select></label>
      <label class="tog ksolo"><input id="ap-ksolo" type="checkbox"><span>Kill biasa = SOLO KILL</span></label>
      <label class="tog kkdaon"><input id="ap-kkdaon" type="checkbox"><span>KDA sebagai sandaran</span></label></div>
    <div class="khero">
      <div class="row khrow"><span class="khimg" id="ap-khimg"></span><span id="ap-khtxt" class="muted">Belum ada logo hero.</span><button class="btn small ghost" type="button" id="ap-khclr" hidden>Padam logo</button></div>
      <p class="muted">Cara ambil logo (sekali sahaja): main sampai <b>anda</b> dapat kill. Gambar banner kill disimpan di bawah. Tekan gambar yang ada <b>muka Chou</b>, kemudian tekan <b>✎ Pilih logo hero</b> dan lukis kotak kecil tepat di atas muka Chou dalam banner.</p>
      <div class="kbans" id="ap-kbans"><span class="muted">Belum ada gambar banner. Hidupkan Auto detect kill dan main sekejap.</span></div>
      <div class="row khrow2"><button class="btn small ghost" type="button" data-draw="hero" disabled>✎ Pilih logo hero</button>
        <label class="fld khmin">Ketepatan (0.7 longgar · 0.9 ketat)<input id="ap-khmin" type="number" step="0.02" min="0.3" max="0.95" inputmode="decimal"></label></div>
    </div>
    <div class="row kme"><label class="fld kign">Nama dalam game (IGN) anda, tepat macam dalam MLBB<input id="ap-kign" type="text" maxlength="24" placeholder="contoh: SYNO.Aqil" autocomplete="off"></label></div>
    <b class="kstep">3 · Kotak bacaan</b>
    <div class="kshot" id="ap-kshot"><img id="ap-kimg" alt=""><i class="kbox ban" id="ap-kbban"><em>BANNER</em></i><i class="kbox kda" id="ap-kbkda"><em>KDA</em></i><i class="kbox hero" id="ap-kbhero"><em>CHOU</em></i><i class="kbox live" id="ap-kblive"><em></em></i><span class="kmsg" id="ap-kmsg">Tekan “Tunjuk skrin”.</span></div>
    <div class="row kvis"><span class="muted">Tunjuk kotak:</span><label class="tog sm"><input type="checkbox" data-vis="ban" checked><span>Banner</span></label><label class="tog sm khv"><input type="checkbox" data-vis="hero" checked><span>Chou</span></label><label class="tog sm kkv"><input type="checkbox" data-vis="kda" checked><span>KDA</span></label></div>
    <div class="row kdraw"><button class="btn small" type="button" id="ap-kprev">👁 Tunjuk skrin</button><button class="btn small ghost" type="button" data-draw="ban">✎ Lukis kotak BANNER</button><button class="btn small ghost" type="button" data-draw="kda">✎ Lukis kotak KDA</button></div>
    <p class="muted" id="ap-khint"><b>BANNER</b> (kuning) = tempat tulisan DOUBLE KILL / SAVAGE keluar. <b>CHOU</b> (ungu) = logo yang anda pilih; hijau = tempat Chou dikesan sekarang. Lukis kotak atas gambar banner di atas supaya tepat.</p>
    <label class="fld">Kotak banner (pilihan cepat)<select id="ap-kreg">
      <option value="0.2,0.08,0.6,0.32">Atas tengah (banner kill MLBB, asal)</option>
      <option value="0.15,0.15,0.7,0.45">Atas tengah lebih besar</option>
      <option value="0.1,0.25,0.8,0.5">Tengah</option>
      <option value="0,0,1,1">Seluruh skrin</option></select></label>
    <div class="kdbg" id="ap-kdbg"><b>Status</b><span>—</span></div>
    <div class="row ktest">${["solo:SOLO KILL", "first:FIRST BLOOD", "double:DOUBLE", "triple:TRIPLE", "maniac:MANIAC", "savage:SAVAGE", "shutdown:SHUT DOWN", "spree:SPREE", "monster:MONSTER", "mega:MEGA", "unstoppable:UNSTOPPABLE", "godlike:GODLIKE", "legendary:LEGENDARY", "rampage:RAMPAGE", "wiped:WIPED OUT"].map(x => `<button class="btn small" type="button" data-a="ktest" data-k="${x.split(":")[0]}">${x.split(":")[1]}</button>`).join("")}</div>
  </section>

  <section class="card queue">
    <div class="qcols"><div class="qcol">
    <h3>Sedang main <span id="ap-pc"></span></h3>
    <ol class="list" id="ap-play"></ol></div><div class="qcol">
    <h3>Queue <span id="ap-qc"></span></h3>
    <ol class="list" id="ap-queue"></ol></div></div>
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

  <section class="card album">
    <h3>Komen Album <span id="ap-alc"></span></h3>
    <form id="ap-aladd" class="addform" autocomplete="off">
      <div class="two"><label class="fld">Nama<input id="ap-alname" maxlength="24" placeholder="cth Aqil.MY"></label>
      <label class="fld">ID ML<input id="ap-almlid" maxlength="32" placeholder="cth 123456789 (1234)"></label></div>
      <label class="fld">Nota (pilihan)<input id="ap-alnote" maxlength="120" placeholder="cth album hero Chou"></label>
      <div class="row"><button class="btn red" type="submit">Tambah</button><button class="btn ghost" type="button" id="ap-alclear" data-confirm="Tekan lagi: buang yang dah siap">Buang yang dah siap</button></div>
    </form>
    <p class="muted">Order Sociabuzz <b>RM${((CFG.sociabuzz && CFG.sociabuzz.services) || []).filter(x => x.type === "album").map(x => x.rm).join(" / ") || 5}</b> (atau mesej sebut "album") masuk sendiri ke sini. Tekan <b>Siap</b> bila dah komen.</p>
    <ol class="list allist" id="ap-album"></ol>
  </section>

  <section class="card songs">
    <h3>Song Request <span id="ap-sgc"></span></h3>
    <div class="row toggles">
    </div>
    <div class="row"><button class="btn" type="button" id="ap-sppause">❚❚ Jeda Spotify</button><button class="btn gold" type="button" id="ap-spplay">▶ Sambung Spotify</button><span class="muted" id="ap-spst"></span></div>
    <ol class="list sglist" id="ap-songs"></ol>
    <div class="sgdet">
      <b class="ctest-h">Lagu request IndoFinity</b>
      <div class="row"><label class="tog"><input id="ap-sgdetect" type="checkbox"><span>Jeda Spotify bila IndoFinity main lagu</span></label>
</div>
      <p class="muted">Bila IndoFinity main lagu request: Spotify dijeda. Bila lagu tu pause / habis: Spotify sambung terus.</p>
      <div id="ap-sgmedia" class="sgmedia"><p class="muted">Buka App ni di PC (START_OVERLAY.bat versi baru).</p></div>
    </div>
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
    <p class="muted">Order Sociabuzz masuk sendiri ikut jumlah: RM4 / 10 / 20 / 30 = 1 / 3 / 6 / 9 game (baki + queue), RM5 = Komen Album, RM40 = Mainkan Akaun. Salah tempat atau donate biasa? Tekan <b>Pindah ke</b> pada order tu. Pembeli tulis ID ML dalam mesej, contoh <b>ID 123456789 (1234)</b>.</p>
    <div class="hookst" id="ap-hookst"><b>Status webhook</b><span id="ap-hooklast">Masuk dengan PIN / buka START_OVERLAY.bat</span></div>
    <ol class="list hooklog" id="ap-hooklog"></ol>
    <form id="ap-ctest" class="addform ctest" autocomplete="off">
      <b class="ctest-h">Custom test (macam pembayaran sebenar)</b>
      <div class="two"><label class="fld">Nama<input id="ap-ctname" maxlength="24" value="Test SYNO"></label>
      <label class="fld">ID ML<input id="ap-ctid" maxlength="32" value="123456789 (1234)"></label></div>
      <div class="two"><label class="fld">Pakej TRIBE<select id="ap-ctpkg" class="gsel">
        <option value="">(ikut jumlah)</option>${((CFG.sociabuzz && CFG.sociabuzz.tribe) || ["1 GAME", "PACKAGE 3 GAME", "PACKAGE 6 GAME", "PACKAGE 9 GAME", "RANK IMMORTAL 1 GAME", "RANK IMMORTAL 3 GAME", "FAST TRACK (VVIP) RM8 1 GAME", "KOMEN ALBUM", "JOKI MINIGAME LAYLA 250K+ SCORE"]).map(x => `<option>${esc(x)}</option>`).join("")}</select></label>
      <label class="fld">Jumlah (RM)<input id="ap-ctamt" type="number" min="1" max="999" inputmode="numeric" value="10"></label></div>
      <div class="row pk">${[4, 5, 6, 8, 10, 15, 20, 30].map(n => `<button class="btn" type="button" data-ctamt="${n}">RM${n}</button>`).join("")}</div>
      <div class="row"><button class="btn gold" type="submit">Hantar custom test</button><span class="muted">Dihantar melalui webhook yang sama dengan Sociabuzz: masuk Mabar VIP / Komen Album, queue dan alert di live. Ditanda TEST ALERT.</span></div>
    </form>
    <div class="row"><button class="btn gold" type="button" id="ap-simorder" hidden>Simulasi order</button><button class="btn" type="button" id="ap-testalert">Test alert sahaja</button><button class="btn ghost" type="button" id="ap-cleartest" data-confirm="Tekan lagi: buang semua baris TEST">Buang baris TEST</button></div>
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
    const toast = (msg, ms) => { const t = $("ap-toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, ms || 1800); };

    /* ---------- layout: drag cards to reorder, drag the corner to resize (saved on this device) ---------- */
    const LAY_KEY = "syno.layout.v1";
    let layApplyTabs = () => {};
    let LAY = {}; try { LAY = JSON.parse(lsGet(LAY_KEY, "{}")) || {}; } catch (e) { LAY = {}; }
    const LAY_DEF = { queue: 3, vip: 3, mvp: 3 }; // default widths (columns) before anything is saved
    LAY.span = LAY.span || Object.assign({}, LAY_DEF); LAY.h = LAY.h || {};
    const layGrid = root.querySelector(".grid");
    const layCards = () => [...layGrid.children].filter(c => c.classList.contains("card"));
    const layCols = () => (getComputedStyle(layGrid).gridTemplateColumns.split(" ").filter(Boolean).length) || 1;
    const laySave = () => lsSet(LAY_KEY, JSON.stringify(LAY));
    layCards().forEach(c => {
      c.dataset.card = [...c.classList].find(x => x !== "card") || "";
      c.insertAdjacentHTML("afterbegin", `<div class="lay-bar"><span class="lay-grip" title="Tarik untuk pindah">⠿ Tarik</span><span class="lay-w" role="group" aria-label="Lebar">${[1, 2, 3].map(n => `<button type="button" data-lw="${n}" aria-label="Lebar ${n} lajur">${n}</button>`).join("")}</span><button type="button" class="lay-h" title="Tinggi ikut isi">Auto tinggi</button></div>`);
      c.insertAdjacentHTML("beforeend", `<span class="lay-rs" title="Tarik untuk ubah saiz" aria-hidden="true"></span>`);
    });
    function layApply() {
      const byId = Object.fromEntries(layCards().map(c => [c.dataset.card, c]));
      const order = (LAY.order || []).filter(id => byId[id]);
      layCards().forEach(c => { if (!order.includes(c.dataset.card)) order.push(c.dataset.card); });
      order.forEach(id => layGrid.appendChild(byId[id]));
      const n = layCols();
      layCards().forEach(c => {
        const id = c.dataset.card, sp = Math.min(n, LAY.span[id] || 1), h = LAY.h[id];
        c.style.gridColumn = sp > 1 ? `span ${sp}` : "";
        c.style.height = h && n > 1 ? h + "px" : "";
        c.classList.toggle("fixed-h", !!(h && n > 1));
        c.querySelectorAll("[data-lw]").forEach(b => b.classList.toggle("on", +b.dataset.lw === sp));
        c.querySelectorAll("[data-lw]").forEach(b => { b.hidden = +b.dataset.lw > n; });
      });
    }
    /* ---------- undo / redo per card ---------- */
    const HIST_FIELDS = {
      live: ["live", "song", "showQueue", "showBanner", "mabarClosed", "hide"], wl: ["wins", "losses", "streak"],
      end: ["wins", "losses", "streak", "playing", "queue", "members"], queue: ["playing", "queue", "members"],
      vip: ["members", "playing", "queue"], mvp: ["mvp", "mvpRules"], akaun: ["akaun"], album: ["album"], songs: ["songs", "songCfg"], rules: ["rules"], orders: ["orders"]
    };
    layCards().forEach(c => {
      const f = HIST_FIELDS[c.dataset.card], h = c.querySelector("h3"); if (!f || !h) return;
      h.insertAdjacentHTML("beforeend", `<span class="hist"><button type="button" class="hb" data-hist="undo" data-card="${c.dataset.card}" aria-label="Undo" disabled>↶</button><button type="button" class="hb" data-hist="redo" data-card="${c.dataset.card}" aria-label="Redo" disabled>↷</button></span>`);
    });
    const histLabel = e => e ? (e.label || e.keys.join(", ")) : "";
    function histPaint() {
      root.querySelectorAll("[data-hist]").forEach(b => {
        const e = Store.peek(b.dataset.hist, HIST_FIELDS[b.dataset.card]);
        b.disabled = !e; b.title = e ? `${b.dataset.hist === "undo" ? "Undo" : "Redo"}: ${histLabel(e)}` : (b.dataset.hist === "undo" ? "Tiada untuk undo" : "Tiada untuk redo");
      });
    }
    function histDo(kind, fields) {
      const e = kind === "undo" ? Store.undo(fields) : Store.redo(fields);
      toast(e ? `${kind === "undo" ? "Undo" : "Redo"}: ${histLabel(e)}` : (kind === "undo" ? "Tiada untuk undo" : "Tiada untuk redo"), 2500);
    }
    root.addEventListener("click", e => { const b = e.target.closest("[data-hist]"); if (b) { e.stopPropagation(); histDo(b.dataset.hist, HIST_FIELDS[b.dataset.card]); } }, true);
    window.addEventListener("ov-hist", histPaint);
    // name each change after the button / field that made it (shown in the undo tooltip)
    const nameIt = el => {
      const card = el.closest(".card"), h = card && card.querySelector("h3"), sec = h ? (h.firstChild && h.firstChild.textContent || "").trim() : "";
      const who = el.closest("li") && el.closest("li").querySelector(".nm");
      const what = (el.getAttribute("aria-label") || el.textContent || el.placeholder || "").trim().replace(/\s+/g, " ").slice(0, 40);
      Store.nextLabel = [sec, who ? who.textContent.trim().split(" ")[0] : "", what].filter(Boolean).join(" · ");
      setTimeout(() => { Store.nextLabel = ""; }, 0);
    };
    root.addEventListener("click", e => { const b = e.target.closest("button"); if (b && !b.closest("[data-hist]")) nameIt(b); }, true);
    root.addEventListener("change", e => { if (e.target.matches("input, select, textarea")) nameIt(e.target); }, true);
    root.addEventListener("submit", e => nameIt(e.target.querySelector("[type=submit]") || e.target), true);
    // Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z): last change anywhere, when not typing
    document.addEventListener("keydown", e => {
      if (!(e.ctrlKey || e.metaKey) || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); histDo("undo"); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); histDo("redo"); }
    });
    histPaint();
    layApply();
    window.addEventListener("resize", () => { clearTimeout(layApply._t); layApply._t = setTimeout(layApply, 120); });
    const layBtn = root.querySelector("#ap-lay"), layReset = root.querySelector("#ap-layreset");
    if (layBtn) layBtn.addEventListener("click", () => {
      const on = !root.classList.contains("editing");
      root.classList.toggle("editing", on); layBtn.textContent = on ? "✓ Siap" : "⠿ Susun layout"; layBtn.classList.toggle("gold", on); layReset.hidden = !on;
      if (on) toast("Tarik kad atau tab untuk susun", 3000); else toast("Layout disimpan");
    });
    if (layReset) layReset.addEventListener("click", () => {
      LAY = { span: Object.assign({}, LAY_DEF), h: {} }; laySave();
      const def = ["live", "wl", "end", "killfx", "queue", "vip", "mvp", "akaun", "rules", "orders", "yt", "links"];
      LAY.order = def; layApply(); delete LAY.order; laySave(); layApplyTabs(); toast("Layout asal");
    });
    layGrid.addEventListener("click", e => {
      const w = e.target.closest("[data-lw]"), hb = e.target.closest(".lay-h");
      if (!w && !hb) return;
      const c = e.target.closest(".card"), id = c.dataset.card;
      if (w) LAY.span[id] = +w.dataset.lw; else delete LAY.h[id];
      laySave(); layApply();
    });
    // pointer drag (mouse + touch): grip = move, corner = resize
    let drag = null;
    layGrid.addEventListener("pointerdown", e => {
      if (!root.classList.contains("editing")) return;
      const grip = e.target.closest(".lay-grip"), rs = e.target.closest(".lay-rs"); if (!grip && !rs) return;
      const c = e.target.closest(".card"), r = c.getBoundingClientRect(), n = layCols(), gap = parseFloat(getComputedStyle(layGrid).columnGap) || 12;
      drag = { c, mode: grip ? "move" : "size", x: e.clientX, y: e.clientY, w: r.width, h: r.height, n, gap, colW: (layGrid.clientWidth - gap * (n - 1)) / n };
      c.classList.add(grip ? "dragging" : "sizing"); e.target.setPointerCapture(e.pointerId); e.preventDefault();
    });
    layGrid.addEventListener("pointermove", e => {
      if (!drag) return;
      const d = drag;
      if (d.mode === "move") {
        const under = document.elementFromPoint(e.clientX, e.clientY), t = under && under.closest(".grid > .card");
        if (!t || t === d.c) return;
        const r = t.getBoundingClientRect(), before = d.n > 1 ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
        layGrid.insertBefore(d.c, before ? t : t.nextSibling);
      } else {
        const sp = Math.max(1, Math.min(d.n, Math.round((d.w + e.clientX - d.x + d.gap) / (d.colW + d.gap))));
        const h = Math.max(140, Math.round(d.h + e.clientY - d.y));
        d.c.style.gridColumn = sp > 1 ? `span ${sp}` : ""; d.sp = sp;
        if (d.n > 1) { d.c.style.height = h + "px"; d.c.classList.add("fixed-h"); d.hh = h; }
      }
    });
    const layEnd = () => {
      if (!drag) return;
      const d = drag; drag = null; d.c.classList.remove("dragging", "sizing");
      if (d.mode === "move") LAY.order = layCards().map(c => c.dataset.card);
      else { const id = d.c.dataset.card; if (d.sp) LAY.span[id] = d.sp; if (d.hh) LAY.h[id] = d.hh; }
      laySave(); layApply();
    };
    layGrid.addEventListener("pointerup", layEnd); layGrid.addEventListener("pointercancel", layEnd);

    /* ---------- tabs: pick which part of the app to see (remembered, or #mvp in the link) ---------- */
    const TABS = [
      { id: "live", label: "Live", cards: ["live", "wl", "end", "killfx", "queue"] },
      { id: "hutang", label: "Hutang Mabar", cards: ["vip"] },
      { id: "mvp", label: "MVP", cards: ["mvp"] },
      { id: "album", label: "Komen Album", cards: ["album"] },
      { id: "lagu", label: "Lagu", cards: ["songs"] },
      { id: "akaun", label: "Slot Akaun", cards: ["akaun"] },
      { id: "rules", label: "Peraturan", cards: ["rules"] },
      { id: "order", label: "Order", cards: ["orders"] },
      { id: "tetapan", label: "Tetapan", cards: ["yt", "links"] },
      { id: "semua", label: "Semua" }
    ];
    const tabNav = root.querySelector("#ap-tabs");
    function showTab(id) {
      if (!tabNav) return;
      const t = TABS.find(x => x.id === id) || TABS[0];
      layCards().forEach(c => { c.hidden = !!t.cards && !t.cards.includes(c.dataset.card); });
      layGrid.classList.toggle("solo", !!t.cards && t.cards.length === 1);
      tabNav.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t.id ? "true" : "false"));
      lsSet("syno.app.tab", t.id);
    }
    if (tabNav) {
      const tabOrder = () => { const ids = (LAY.tabs || []).filter(id => TABS.some(t => t.id === id)); TABS.forEach(t => { if (!ids.includes(t.id)) ids.push(t.id); }); return ids; };
      tabNav.innerHTML = tabOrder().map(id => { const t = TABS.find(x => x.id === id); return `<button type="button" role="tab" data-tab="${t.id}"><span>${t.label}</span><i data-tabc="${t.id}"></i></button>`; }).join("");
      layApplyTabs = () => { const byId = {}; tabNav.querySelectorAll("[data-tab]").forEach(b => { byId[b.dataset.tab] = b; }); tabOrder().forEach(id => byId[id] && tabNav.appendChild(byId[id])); };
      // Susun layout: drag a tab to a new place (mouse or finger)
      let tdrag = null, tmoved = false;
      tabNav.addEventListener("pointerdown", e => {
        if (!root.classList.contains("editing")) return;
        const b = e.target.closest("[data-tab]"); if (!b) return;
        tdrag = b; tmoved = false; b.classList.add("dragging"); b.setPointerCapture(e.pointerId); e.preventDefault();
      });
      tabNav.addEventListener("pointermove", e => {
        if (!tdrag) return;
        const t = document.elementFromPoint(e.clientX, e.clientY), over = t && t.closest("#ap-tabs [data-tab]");
        if (!over || over === tdrag) return;
        const r = over.getBoundingClientRect();
        tabNav.insertBefore(tdrag, e.clientX < r.left + r.width / 2 ? over : over.nextSibling); tmoved = true;
      });
      const tend = () => {
        if (!tdrag) return;
        tdrag.classList.remove("dragging"); tdrag = null;
        if (tmoved) { LAY.tabs = [...tabNav.querySelectorAll("[data-tab]")].map(b => b.dataset.tab); laySave(); toast("Susunan tab disimpan"); }
      };
      tabNav.addEventListener("pointerup", tend); tabNav.addEventListener("pointercancel", tend);
      tabNav.addEventListener("click", e => {
        const b = e.target.closest("[data-tab]"); if (!b) return;
        if (tmoved) { tmoved = false; return; }
        showTab(b.dataset.tab);
        try { history.replaceState(null, "", location.pathname + location.search + "#" + b.dataset.tab); } catch (err) {}
        window.scrollTo({ top: 0 });
      });
      window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));
      showTab(location.hash.slice(1) || lsGet("syno.app.tab", "live"));
    }
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
    $("ap-fx").addEventListener("change", e => Q.patch({ fx: e.target.checked }));
    /* ---------- auto kill effects (PC server reads the game screen with Windows OCR) ---------- */
    const kHdr = () => ({ "X-Pin": lsGet(PIN_KEY, "") });
    const KNAME = { solo: "SOLO KILL", first: "FIRST BLOOD", double: "DOUBLE KILL", triple: "TRIPLE KILL", maniac: "MANIAC", savage: "SAVAGE", shutdown: "SHUT DOWN", spree: "KILLING SPREE", monster: "MONSTER KILL", mega: "MEGA KILL", unstoppable: "UNSTOPPABLE", godlike: "GODLIKE", legendary: "LEGENDARY", rampage: "RAMPAGE", wiped: "WIPED OUT" };
    const kCard = root.querySelector(".card.killfx");
    let kCfg = null, kPrev = false, kDraw = null, kImgUrl = "", kHeroVer = null, kBan = null, kBansKey = "";
    // hero logo: current picture + banner gallery
    function kHeroImg() {
      fetch("api/killhero?t=" + Date.now(), { headers: kHdr(), cache: "no-store" }).then(r => r.ok ? r.blob() : null).then(b => {
        const box = $("ap-khimg"); box.innerHTML = b ? `<img alt="logo hero" src="${URL.createObjectURL(b)}">` : "";
        $("ap-khtxt").textContent = b ? "Logo hero saya ✓" : "Belum ada logo hero."; $("ap-khclr").hidden = !b;
      }).catch(() => {});
    }
    function kBans() {
      if (!kCfg || kCfg.team !== "hero" || kCard.offsetParent === null) return;
      fetch("api/killbanners", { headers: kHdr(), cache: "no-store" }).then(r => r.ok ? r.json() : null).then(list => {
        if (!list) return; const key = list.map(x => x.t).join(","); if (key === kBansKey) return; kBansKey = key;
        const box = $("ap-kbans");
        if (!list.length) { box.innerHTML = `<span class="muted">Belum ada gambar banner. Hidupkan Auto detect kill dan main sekejap.</span>`; return; }
        box.innerHTML = list.slice().reverse().map(x => `<button type="button" class="kban" data-ban="${x.i}"><img alt=""><em>${esc(KNAME[x.k] || x.k)} · ${new Date(x.t).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</em></button>`).join("");
        box.querySelectorAll(".kban").forEach(b => fetch("api/killshot?ban=" + b.dataset.ban, { headers: kHdr(), cache: "no-store" }).then(r => r.ok ? r.blob() : null).then(bl => { if (bl) b.querySelector("img").src = URL.createObjectURL(bl); }));
      }).catch(() => {});
    }
    setInterval(kBans, 3000);
    const kSave = patch => {
      const body = Object.entries(patch).map(([k2, v]) => k2 + "=" + encodeURIComponent(v)).join("&");
      return fetch("api/killcfg", { method: "POST", headers: kHdr(), body }).then(r => r.ok ? r.json() : null).then(j => { if (j) { kCfg = j; kShow(); } else toast("Perlu START_OVERLAY.bat versi baru / PIN"); }).catch(() => toast("Server tak dapat dihubungi"));
    };
    const pct = v => (Math.max(0, Math.min(1, +v || 0)) * 100).toFixed(2) + "%";
    function kBoxes() {
      if (!kCfg) return;
      const put = (el, x, y, w, h) => { el.hidden = !(w > 0 && h > 0); Object.assign(el.style, { left: pct(x), top: pct(y), width: pct(w), height: pct(h) }); };
      put($("ap-kbban"), kCfg.x, kCfg.y, kCfg.w, kCfg.h);
      put($("ap-kbkda"), kCfg.kx, kCfg.ky, kCfg.kw, kCfg.kh);
      put($("ap-kbhero"), kCfg.heroX, kCfg.heroY, kCfg.heroW, kCfg.heroH);
      if (!kUsesKda()) $("ap-kbkda").hidden = true;
      if (kCfg.team !== "hero" || !kCfg.heroSet) $("ap-kbhero").hidden = true;
      kCard.querySelectorAll("[data-vis]").forEach(c => { if (!c.checked) $({ ban: "ap-kbban", hero: "ap-kbhero", kda: "ap-kbkda" }[c.dataset.vis]).hidden = true; });
      if (kCfg.team !== "hero" || !(kCard.querySelector('[data-vis="hero"]') || {}).checked) $("ap-kblive").hidden = true;
    }
    const kUsesKda = () => !!kCfg && (kCfg.team === "kda" || ((kCfg.team === "me" || kCfg.team === "hero") && kCfg.kdaOn));
    function kShow() {
      if (!kCfg) return;
      const src = kCfg.src || "win";
      $("ap-kon").checked = !!kCfg.on; $("ap-kteam").value = kCfg.team || "hero";
      kCard.querySelector(".khero").hidden = kCfg.team !== "hero";
      if (root.activeElement !== $("ap-khmin")) $("ap-khmin").value = (+kCfg.heroMin || .8).toFixed(2);
      if (kCfg.heroVer !== kHeroVer) { kHeroVer = kCfg.heroVer; kHeroImg(); } $("ap-ksolo").checked = kCfg.solo !== false;
      kCard.querySelectorAll("#ap-ksrc button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === src)));
      kCard.querySelectorAll(".ksrc").forEach(d => { d.hidden = d.dataset.src !== src; });
      if (root.activeElement !== $("ap-kign")) $("ap-kign").value = kCfg.ign || "";
      if (root.activeElement !== $("ap-kport")) $("ap-kport").value = kCfg.obsPort || 4455;
      $("ap-kpass").placeholder = kCfg.obsPassSet ? "•••••• (tersimpan) taip untuk tukar" : "tiada (taip kalau OBS ada password)";
      kCard.querySelector(".kme").hidden = kCfg.team !== "me";
      const ownM = kCfg.team === "kda" || kCfg.team === "me" || kCfg.team === "hero";
      kCard.querySelector(".ksolo").hidden = !ownM;
      kCard.querySelector('[data-draw="kda"]').hidden = !kUsesKda();
      kCard.querySelector(".kkdaon").hidden = !(kCfg.team === "me" || kCfg.team === "hero"); $("ap-kkdaon").checked = !!kCfg.kdaOn;
      kCard.querySelector(".kkv").hidden = !kUsesKda(); kCard.querySelector(".khv").hidden = kCfg.team !== "hero";
      const reg = [kCfg.x, kCfg.y, kCfg.w, kCfg.h].map(v => +(+v).toFixed(3)).join(","), sel = $("ap-kreg");
      [...sel.options].forEach(o => { if (o.dataset.custom) o.remove(); });
      if (![...sel.options].some(o => o.value === reg)) sel.insertAdjacentHTML("beforeend", `<option data-custom="1" value="${esc(reg)}">Kotak sendiri (dilukis)</option>`);
      sel.value = reg;
      const fill = (id, val, none) => { const el = $(id); if (val && ![...el.options].some(o => o.value === val)) el.insertAdjacentHTML("beforeend", `<option value="${esc(val)}">${esc(val)}</option>`); el.value = val || ""; };
      fill("ap-kwin", kCfg.win); fill("ap-kobs", kCfg.obsSrc);
      kBoxes();
    }
    function kWins() {
      fetch("api/windows", { headers: kHdr(), cache: "no-store" }).then(r => r.ok ? r.json() : []).then(list => {
        const ws = $("ap-kwin"), cur = (kCfg && kCfg.win) || ws.value;
        ws.innerHTML = `<option value="">— pilih tetingkap —</option>` + list.filter(t => !/^(Program Manager|Settings|Windows Input Experience)$/i.test(t)).map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
        if (cur && !list.includes(cur)) ws.insertAdjacentHTML("beforeend", `<option value="${esc(cur)}">${esc(cur)} (tak dibuka)</option>`);
        ws.value = cur || "";
      }).catch(() => {});
    }
    function kObs() {
      const btn = $("ap-kobsr"); btn.disabled = true; btn.textContent = "Menyambung…";
      fetch("api/obssources", { headers: kHdr(), cache: "no-store" }).then(r => r.ok ? r.json() : { ok: false, err: "Perlu START_OVERLAY.bat versi baru" }).then(j => {
        if (!j.ok) { toast(j.err || "OBS tak dapat dihubungi", 4000); return; }
        const el = $("ap-kobs"), cur = (kCfg && kCfg.obsSrc) || el.value;
        el.innerHTML = `<option value="">— pilih source —</option>` + j.list.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
        if (cur && !j.list.includes(cur)) el.insertAdjacentHTML("beforeend", `<option value="${esc(cur)}">${esc(cur)} (tiada)</option>`);
        el.value = cur || ""; toast("OBS bersambung ✓ " + j.list.length + " source");
      }).catch(() => toast("Server tak dapat dihubungi")).finally(() => { btn.disabled = false; btn.textContent = "↻ Sambung OBS"; });
    }
    fetch("api/killcfg", { headers: kHdr(), cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => { if (j) { kCfg = j; kShow(); kWins(); if (j.src === "obs") kObs(); } else $("ap-kst").textContent = "perlu server baru"; }).catch(() => {});
    $("ap-kon").addEventListener("change", e => kSave({ on: e.target.checked ? 1 : 0 }));
    $("ap-kvoice").addEventListener("change", e => Q.patch({ fxVoice: e.target.checked }));
    $("ap-kteam").addEventListener("change", e => kSave({ team: e.target.value }));
    $("ap-ksolo").addEventListener("change", e => kSave({ solo: e.target.checked ? 1 : 0 }));
    $("ap-kkdaon").addEventListener("change", e => kSave({ kdaOn: e.target.checked ? 1 : 0 }));
    kCard.querySelectorAll("[data-vis]").forEach(c => c.addEventListener("change", kBoxes));
    $("ap-kign").addEventListener("change", e => kSave({ ign: e.target.value.trim() }));
    $("ap-kwin").addEventListener("change", e => kSave({ win: e.target.value }));
    $("ap-kobs").addEventListener("change", e => kSave({ obsSrc: e.target.value }));
    $("ap-kport").addEventListener("change", e => kSave({ obsPort: e.target.value }));
    $("ap-kpass").addEventListener("change", e => { kSave({ obsPass: e.target.value }).then(() => { e.target.value = ""; kObs(); }); });
    $("ap-kwinr").addEventListener("click", kWins);
    $("ap-kobsr").addEventListener("click", kObs);
    $("ap-ksrc").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (b) kSave({ src: b.dataset.v }).then(() => { if (b.dataset.v === "obs") kObs(); else kWins(); }); });
    $("ap-kreg").addEventListener("change", e => { const [x, y, w, h] = e.target.value.split(","); kSave({ x, y, w, h }); });
    // screen preview + draw the read boxes with a finger / mouse
    const kshot = $("ap-kshot");
    function kPull() {
      if (!kPrev || kBan != null || kCard.offsetParent === null) return;
      fetch("api/killshot", { headers: kHdr(), cache: "no-store" }).then(r => r.ok ? r.blob() : null).then(b => {
        if (!b) { $("ap-kmsg").textContent = "Belum ada gambar: pilih tetingkap / source OBS dulu."; $("ap-kmsg").hidden = false; return; }
        const u = URL.createObjectURL(b), img = $("ap-kimg"); img.onload = () => { if (kImgUrl) URL.revokeObjectURL(kImgUrl); kImgUrl = u; }; img.src = u;
        $("ap-kmsg").hidden = true; kshot.classList.add("on");
      }).catch(() => {});
    }
    setInterval(kPull, 1200);
    $("ap-kbans").addEventListener("click", e => {
      const b = e.target.closest(".kban"); if (!b) return;
      kBan = +b.dataset.ban; kPrev = false; $("ap-kprev").textContent = "👁 Tunjuk skrin";
      $("ap-kbans").querySelectorAll(".kban").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const img = $("ap-kimg"); img.src = b.querySelector("img").src; kshot.classList.add("on"); $("ap-kmsg").hidden = true;
      kCard.querySelector('[data-draw="hero"]').disabled = false;
      kshot.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    $("ap-khclr").addEventListener("click", () => { if (!confirm("Padam logo hero?")) return; fetch("api/killhero", { method: "POST", headers: kHdr(), body: "clear=1" }).then(() => fetch("api/killcfg", { headers: kHdr(), cache: "no-store" })).then(r => r.json()).then(j => { kCfg = j; kShow(); }).catch(() => {}); });
    $("ap-khmin").addEventListener("change", e => kSave({ heroMin: e.target.value }));
    $("ap-kprev").addEventListener("click", () => { kBan = null; kCard.querySelectorAll(".kban").forEach(x => x.setAttribute("aria-pressed", "false")); kCard.querySelector('[data-draw="hero"]').disabled = true; kPrev = !kPrev; $("ap-kprev").textContent = kPrev ? "⏸ Berhenti tunjuk" : "👁 Tunjuk skrin"; $("ap-kmsg").textContent = kPrev ? "Memuat…" : "Tekan “Tunjuk skrin”."; if (kPrev) kPull(); });
    kCard.querySelectorAll("[data-draw]").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.draw === "kda" && !kPrev) $("ap-kprev").click();
      else if (b.dataset.draw === "ban" && !kPrev && kBan == null) $("ap-kprev").click();
      kDraw = kDraw === b.dataset.draw ? null : b.dataset.draw;
      kCard.querySelectorAll("[data-draw]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.draw === kDraw)));
      kshot.classList.toggle("drawing", !!kDraw);
      if (kDraw) kshot.scrollIntoView({ block: "center" });
      $("ap-khint").innerHTML = kDraw ? (kDraw === "hero" ? `Seret kotak kecil tepat di atas <b>muka Chou</b> dalam banner.` : `Seret di atas gambar untuk lukis kotak <b>${kDraw === "kda" ? "KDA" : "BANNER"}</b>.`) : `<b>BANNER</b> (kuning) = tempat tulisan DOUBLE KILL / SAVAGE keluar. <b>CHOU</b> (ungu) = logo yang anda pilih; hijau = tempat Chou dikesan sekarang. Lukis kotak atas gambar banner di atas supaya tepat.`;
    }));
    let kStart = null;
    const kPt = e => { const r = kshot.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))]; };
    kshot.addEventListener("pointerdown", e => { if (!kDraw) return; e.preventDefault(); kshot.setPointerCapture(e.pointerId); kStart = kPt(e); });
    kshot.addEventListener("pointermove", e => {
      if (!kDraw || !kStart) return; const [x, y] = kPt(e), el = $({ kda: "ap-kbkda", hero: "ap-kbhero", ban: "ap-kbban" }[kDraw]);
      el.hidden = false; Object.assign(el.style, { left: pct(Math.min(x, kStart[0])), top: pct(Math.min(y, kStart[1])), width: pct(Math.abs(x - kStart[0])), height: pct(Math.abs(y - kStart[1])) });
    });
    kshot.addEventListener("pointerup", e => {
      if (!kDraw || !kStart) return; const [x, y] = kPt(e), r = [Math.min(x, kStart[0]), Math.min(y, kStart[1]), Math.abs(x - kStart[0]), Math.abs(y - kStart[1])].map(v => v.toFixed(4)); kStart = null;
      if (+r[2] < .01 || +r[3] < .008) { kBoxes(); return; }
      const which = kDraw; kCard.querySelector(`[data-draw="${which}"]`).click();
      if (which === "hero") {
        if (kBan == null) { toast("Pilih gambar banner dulu"); return; }
        fetch("api/killhero", { method: "POST", headers: kHdr(), body: `i=${kBan}&x=${r[0]}&y=${r[1]}&w=${r[2]}&h=${r[3]}` }).then(x => x.json()).then(j => {
          if (!j.ok) { toast(j.err || "Tak dapat simpan logo", 4000); return; }
          toast("Logo hero disimpan ✓"); return fetch("api/killcfg", { headers: kHdr(), cache: "no-store" }).then(x => x.json()).then(c => { kCfg = c; kShow(); });
        }).catch(() => toast("Server tak dapat dihubungi"));
        return;
      }
      kSave(which === "kda" ? { kx: r[0], ky: r[1], kw: r[2], kh: r[3] } : { x: r[0], y: r[1], w: r[2], h: r[3] }).then(() => toast("Kotak " + (which === "kda" ? "KDA" : "BANNER") + " disimpan"));
    });
    setInterval(() => {
      if (kCard.offsetParent === null || !kCfg) return;
      fetch("api/killlog", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => {
        if (!j) return;
        const box = $("ap-kdbg"), inf = String(j.info || "").split(",");
        const ago = j.hitAt ? Math.round((Date.now() - j.hitAt) / 1000) : null, src = kCfg.src || "win", need = src === "obs" ? kCfg.obsSrc : kCfg.win;
        const ignN = String(kCfg.ign || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const HOW = { obs: "OBS", pw: "tetingkap", skrin: "salinan skrin" };
        const st = !kCfg.cap ? "Tangkap skrin tak dapat dimuat di PC ni." : j.err && !j.ocr ? j.err : !j.on && !j.preview ? "Dimatikan." : !need ? (src === "obs" ? "Pilih source game dalam OBS dulu." : "Pilih tetingkap game dulu.")
          : kCfg.team === "me" && ignN.length < 2 ? "Isi nama dalam game (IGN) anda dulu." : kCfg.team === "kda" && !(kCfg.kw > 0) ? "Lukis kotak KDA dulu (langkah 3)."
          : inf.length < 5 ? (j.err || "Menunggu…") : `Membaca ${inf[0]}×${inf[1]} dari ${HOW[inf[5]] || inf[5] || "?"}${+inf[4] > 4000 ? " · skrin GELAP" : ""}`;
        const mex = typeof j.mex === "number" ? j.mex : -1;
        const meTxt = kCfg.team === "me" && ignN.length >= 2 && j.on ? `<span>Nama anda: ${mex < 0 ? "tak nampak" : `<b class="kok">nampak ✓</b>`} · Banner: ${j.ally ? `<b class="kok">biru (pasukan kita)</b>` : "bukan biru"}</span>` : "";
        const heroTxt = kCfg.team === "hero" && j.on ? (!j.hero ? `<span class="warn">Ambil logo hero dulu (langkah di atas).</span>` : `<span>Chou: ${j.hs >= 0 ? `skor <b class="${j.hs >= kCfg.heroMin ? "kok" : ""}">${(+j.hs).toFixed(2)}</b> / perlu ${(+kCfg.heroMin).toFixed(2)}${j.hs >= kCfg.heroMin ? " ✓" : ""}` : "—"} · Banner: ${j.ally ? `<b class="kok">biru</b>` : "bukan biru"}</span>`) : "";
        const kdaTxt = (kCfg.team === "kda" || kCfg.team === "me" || kCfg.team === "hero") && kCfg.kw > 0 && j.on ? `<span>KDA dibaca: <code>${esc(j.kda || "—")}</code> → kill anda = <b class="kok">${j.k >= 0 ? j.k : "?"}</b></span>` : "";
        const html = `<b>Status</b><span>${esc(st)}</span>${heroTxt}${kdaTxt}${meTxt}${j.hit ? `<span class="khit">Terakhir: <b>${esc(KNAME[j.hit] || j.hit)}</b>${ago != null ? ` · ${ago}s lepas` : ""}</span>` : ""}${j.text ? `<span>Banner dibaca:</span><code>${esc(j.text)}</code>` : ""}${j.err && j.ocr ? `<span class="warn">${esc(j.err)}</span>` : ""}`;
        if (box._h !== html) { box.innerHTML = html; box._h = html; }
        const lv = $("ap-kblive");
        if (kCfg.team === "hero" && kCfg.heroSet && j.on && j.hs >= 0 && kBan == null && (kCard.querySelector('[data-vis="hero"]') || {}).checked) {
          const w = +kCfg.heroW || .05, h = +kCfg.heroH || .08; lv.hidden = false; lv.classList.toggle("ok", j.hs >= kCfg.heroMin);
          Object.assign(lv.style, { left: pct(j.hx - w / 2), top: pct(j.hy - h / 2), width: pct(w), height: pct(h) }); lv.querySelector("em").textContent = (+j.hs).toFixed(2);
        } else lv.hidden = true;
        $("ap-kst").textContent = j.on && need ? "● aktif" : "";
      }).catch(() => {});
    }, 1000);
    $("ap-fxs").addEventListener("change", e => Q.patch({ fxSound: e.target.checked }));
    // test the effect on the overlay without changing W/L
    $("ap-fxwin").addEventListener("click", () => { Store.set(s => { s.fxTest = { k: "win", at: Date.now() }; }, { noHist: true }); toast("Efek MENANG dihantar ke overlay"); });
    $("ap-fxmvp").addEventListener("click", () => { Store.set(s => { s.fxTest = { k: "mvp", at: Date.now(), name: "AQIL.MY", cur: 5 }; }, { noHist: true }); toast("Efek MVP dihantar ke overlay"); });
    $("ap-fxlose").addEventListener("click", () => { Store.set(s => { s.fxTest = { k: "lose", at: Date.now() }; }, { noHist: true }); toast("Efek KALAH dihantar ke overlay"); });
    root.querySelectorAll(".ovp").forEach(i => i.addEventListener("change", () => Q.hideSet(i.dataset.o, i.dataset.k, !i.checked)));
    $("ap-open").addEventListener("click", () => { Q.patch({ mabarClosed: false }); toast("Mabar VIP OPEN"); });
    $("ap-close").addEventListener("click", () => { Q.patch({ mabarClosed: true }); toast("Mabar VIP CLOSED"); });
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
    // order time follows the clock until it is changed by hand
    let dateTouched = false;
    const resetDate = () => { dateTouched = false; $("ap-date").value = toLocalInput(new Date()); };
    resetDate();
    $("ap-date").addEventListener("input", () => { dateTouched = true; });
    setInterval(() => { if (!dateTouched && document.activeElement !== $("ap-date")) $("ap-date").value = toLocalInput(new Date()); }, 20000);
    root.querySelectorAll("[data-fill]").forEach(b => b.addEventListener("click", () => { $("ap-games").value = b.dataset.fill; $("ap-games").focus(); }));
    $("ap-add").addEventListener("submit", e => {
      e.preventDefault();
      const name = $("ap-name").value.trim(); if (!name) { $("ap-name").focus(); toast("Taip nama dulu"); return; }
      const g = parseInt($("ap-games").value, 10) || 0;
      if (g <= 0) { $("ap-games").focus(); toast("Masukkan bilangan game"); return; }
      const at = dateTouched && $("ap-date").value ? new Date($("ap-date").value).getTime() : Date.now();
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
      else if (t.classList.contains("mvnote")) { Q.mvpSet(t.dataset.id, { note: t.value.trim().slice(0, 80) }); toast("Remark disimpan"); }
      else if (t.classList.contains("mvcin")) { Q.mvpSet(t.dataset.id, { cur: Math.max(0, parseInt(t.value, 10) || 0) }); toast("MVP disimpan"); }
    });
    root.addEventListener("keydown", e => {
      const t = e.target; if (e.key !== "Enter") return;
      if (t.classList.contains("gin")) { e.preventDefault(); t.closest("li").querySelector('[data-a="addn"]').click(); }
      if (t.classList.contains("idin") || t.classList.contains("akin") || t.classList.contains("mvcin") || t.classList.contains("mvnote")) { e.preventDefault(); t.blur(); }
    });

    // order "Pindah ke": remember which row is open and its game count across re-renders
    let ordOpen = null; const ordN = {};
    root.addEventListener("toggle", e => { const d = e.target; if (d.classList && d.classList.contains("omv")) { if (d.open) ordOpen = +d.dataset.rx; else if (ordOpen === +d.dataset.rx) ordOpen = null; } }, true);
    root.addEventListener("click", e => { const sm = e.target.closest("details.omv > summary"); if (sm) { const d = sm.parentElement; ordOpen = d.open ? null : +d.dataset.rx; } }, true);
    root.addEventListener("input", e => { if (e.target.classList.contains("og")) ordN[e.target.dataset.rx] = e.target.value; });
    const MVL = { mabar: "Baki mabar", queue: "Queue live", vvip: "VVIP fast track", album: "Komen Album", akaun: "Mainkan Akaun", none: "Abaikan" };

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
      else if (a === "mvpp") {
        const m = Store.state.members[k], r = m && Q.mvpFor(m.name);
        if (r) toast(`${r.name}: MVP ${r.cur}${r.cur === 5 || r.cur === 15 ? ` · cukup ${r.cur}, boleh claim!` : ""}${r.free ? " · VVIP free 1 game" : ""}`, 3500);
      }
      else if (a === "import") doImport();
      else if (a === "sgdone") Q.songDone(id);
      else if (a === "sgdel") Q.songDel(id);
      else if (a === "role") Q.setRole(k, b.dataset.r);
      else if (a === "ktest") { Store.set(s => { s.fxTest = { k: "kill", type: k, at: Date.now() }; }, { noHist: true }); toast("Efek dihantar ke overlay"); }
      else if (a === "ordmv") {
        const rx = +b.dataset.rx, inp = root.querySelector(`.og[data-rx="${b.dataset.rx}"]`);
        const n = inp ? inp.value : 1;
        ordOpen = null; delete ordN[b.dataset.rx];               // before the move: the store re-renders the list right away
        const r = Q.orderMove(rx, b.dataset.t, n);
        if (r) { toast(`${r.name} → ${MVL[r.to]}${r.games ? ` · +${r.games} game` : ""}`, 3000); }
      }
      else if (a === "orddel") {
        if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Pasti?"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "✕"; } }, 2500); return; }
        const rx = +b.dataset.rx;
        Store.set(s => { const i = (s.orders || []).findIndex(o => o.rx === rx); if (i >= 0) s.orders.splice(i, 1); });
        toast("Order dibuang dari senarai (baki tak berubah)", 3000);
      }
      else if (a === "altog") Q.albumToggle(id);
      else if (a === "aldel") {
        if (b.dataset.armed) Q.albumDel(id);
        else { b.dataset.armed = "1"; b.textContent = "Pasti?"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "✕"; } }, 2500); }
      }
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
    let pending = {}, qDrag = null;
    function render(s, force) {
      const max = CFG.mabar.maxPlaying, rot = CFG.mabar.rotateEvery || 0, T = O.Q.tot;
      const mem = p => s.members[p.key] || { name: p.key, bal: 0, vbal: 0 };
      const mvpOf = p => { const x = (s.mvp || []).find(v => O.keyOf(v.name) === p.key || O.keyOf(v.name) === O.keyOf(mem(p).name)); return x ? ` · MVP ${x.cur || 0}` : ""; };
      const roleRow = p => `<div class="roles" role="group" aria-label="Role ${esc(mem(p).name)}">${O.ROLES.map(r => `<button type="button" class="rlb rl-${r.toLowerCase()}${mem(p).role === r ? " on" : ""}" data-a="role" data-k="${esc(p.key)}" data-r="${r}" aria-pressed="${mem(p).role === r}" title="${window.SYNO_ROLES ? SYNO_ROLES.LABEL[r] : r}" aria-label="${window.SYNO_ROLES ? SYNO_ROLES.LABEL[r] : r}">${window.SYNO_ROLES ? SYNO_ROLES.svg(r) : r}</button>`).join("")}</div>`;
      const roleBadge = m => O.roleTag(m);
      const balTxt = m => (m.vbal ? `${m.bal || 0} + ${m.vbal} VVIP` : `${m.bal || 0}`) + " game";
      const who = (p, extra = "") => `<span class="who"><span class="nm">${p.vip ? `<i class="vv">★</i> ` : ""}${roleBadge(mem(p))}${esc(mem(p).name)}</span><span class="sub">${mem(p).mlid ? `ID ${esc(mem(p).mlid)}` : "tiada ID"}${mem(p).last ? ` · order ${fmtDate(mem(p).last)}` : ""}${extra}</span></span>`;
      $("ap-wins").textContent = s.wins; $("ap-losses").textContent = s.losses;
      const tabc = (id, v) => { const e = root.querySelector(`[data-tabc="${id}"]`); if (e) e.textContent = v; };
      tabc("live", `${s.playing.length}/${max}${s.queue.length ? ` · Q${s.queue.length}` : ""}`);
      tabc("hutang", Object.values(s.members).filter(m => T(m) > 0).length || "");
      tabc("mvp", (s.mvp || []).length || "");
      const alWait = (s.album || []).filter(a => !a.done).length;
      tabc("album", alWait || "");
      const newOrd = (s.orders || []).filter(o => o.rx > appOpen && o.src !== "manual").length;
      tabc("order", newOrd ? `${newOrd} baru` : "");
      $("ap-streak").textContent = s.streak >= 2 ? `Win streak ${s.streak}` : s.streak <= -2 ? `Lose streak ${-s.streak}` : "";
      root.querySelectorAll(".ovp").forEach(i => { i.checked = !(((s.hide || {})[i.dataset.o] || {})[i.dataset.k]); });
      // where the cameras sit in the landscape column right now (they move up when one is off)
      const lk = O.layoutOf && O.layoutOf("kiri"), sk = lk && O.stackLayout(lk, (s.hide || {}).l || {}, s.showBanner);
      if (sk && $("ap-ovpobs")) { const f = (n, r) => r ? `${n} ${r.x}, ${r.y} · ${r.w}×${r.h}` : ""; $("ap-ovpobs").textContent = ["OBS landscape: Game 384, 0 · 1536×1024", f("Facecam", sk.slots.face), f("Handcam", sk.slots.hand)].filter(Boolean).join(" · "); }
      $("ap-showq").checked = !!s.showQueue; $("ap-fx").checked = s.fx !== false; $("ap-fxs").checked = s.fxSound !== false; $("ap-kvoice").checked = s.fxVoice !== false; $("ap-open").setAttribute("aria-pressed", String(!s.mabarClosed)); $("ap-close").setAttribute("aria-pressed", String(!!s.mabarClosed)); $("ap-showb").checked = !!s.showBanner; $("ap-shows").checked = !s.song || s.song.on !== false;
      if (document.activeElement !== $("ap-song")) $("ap-song").value = (s.song && s.song.manual) || "";
      $("ap-pc").textContent = `${s.playing.length}/${max}`; $("ap-qc").textContent = s.queue.length;
      if (qDrag) { pending.queue = true; } else {
      $("ap-play").innerHTML = s.playing.length ? s.playing.map(p => `<li class="qrow" data-qid="${p.id}" data-zone="play"><div class="qtop"><span class="qgrip" data-qid="${p.id}" title="Tarik">⠿</span>${who(p, (p.n ? ` · dah ${p.n} game` : "") + (rot && (p.n || 0) >= rot ? " · boleh rotate" : "") + mvpOf(p))}<span class="bal">${balTxt(mem(p))}</span></div>
<div class="qctl"><button class="btn sq" data-a="b-" data-k="${esc(p.key)}" aria-label="Tolak baki">−</button><button class="btn sq" data-a="b+" data-k="${esc(p.key)}" aria-label="Tambah baki">+</button><button class="btn small gold" data-a="mvpp" data-k="${esc(p.key)}" title="Pemain ni MVP: +1 dalam senarai MVP">★ MVP</button><button class="btn small ghost" data-a="noshow" data-id="${p.id}">Tak muncul</button><button class="btn sq" data-a="rm" data-id="${p.id}" aria-label="Keluarkan">✕</button></div>${roleRow(p)}</li>`).join("")
        : `<li class="empty">Belum ada. Tambah dalam Hutang Mabar di bawah.</li>`;
      $("ap-queue").innerHTML = s.queue.length ? s.queue.map((p, i) => `<li class="qrow" data-qid="${p.id}" data-zone="queue"><div class="qtop"><span class="qgrip" data-qid="${p.id}" title="Tarik ke Sedang main untuk ganti, atau ke atas / bawah untuk susun">⠿</span><span class="no">${i + 1}</span>${who(p)}<span class="bal">${balTxt(mem(p))}</span></div>
<div class="qctl"><button class="btn sq" data-a="up" data-id="${p.id}" aria-label="Naik">↑</button><button class="btn sq" data-a="bottom" data-id="${p.id}" aria-label="Ke bawah queue">⤓</button>${s.playing.length < max ? `<button class="btn sq" data-a="now" data-id="${p.id}" aria-label="Main sekarang">▶</button>` : ""}<button class="btn small ghost" data-a="noshow" data-id="${p.id}">Tak muncul</button><button class="btn sq" data-a="rm" data-id="${p.id}" aria-label="Buang dari queue">✕</button></div>${roleRow(p)}</li>`).join("")
        : `<li class="empty">Queue kosong.</li>`;
      }
      const ords = (s.orders || []).slice(0, 40);
      $("ap-oc").textContent = ords.length ? `${ords.length}` : "";
      const SVL = { album: "KOMEN ALBUM", akaun: "MAIN AKAUN", joki: "JOKI MINIGAME" };
      const srcTag = o => o.trial ? `<span class="tag test">TEST ALERT${o.svc ? " · " + (SVL[o.svc] || o.svc) : ""}</span>` : o.svc && o.src !== "test" ? `<span class="tag sb">${SVL[o.svc] || o.svc}</span>` : o.src === "sociabuzz" ? `<span class="tag sb">SOCIABUZZ</span>` : o.src === "test" ? `<span class="tag test">TEST</span>` : o.src === "sim" ? `<span class="tag test">ALERT</span>` : `<span class="tag man">MANUAL</span>`;
      // move an order: Baki mabar / Queue live / VVIP / Komen Album / Mainkan Akaun / Abaikan
      const mvBtn = (o, t, txt) => `<button class="btn small${o.moved === t ? " red" : " ghost"}" type="button" data-a="ordmv" data-rx="${o.rx}" data-t="${t}">${txt}</button>`;
      const ordBox = o => o.src === "test" ? "" : `<details class="omv${!o.games && !o.svc ? " need" : ""}" data-rx="${o.rx}"${ordOpen === o.rx ? " open" : ""}><summary>${!o.games && !o.svc ? "Pilih ke mana" : "Pindah ke"}</summary><div class="omv-b">
<label class="fld omv-n">Game<input type="number" class="og" data-rx="${o.rx}" min="1" max="99" inputmode="numeric" value="${esc(ordN[o.rx] || Q.orderGames(o))}"></label>
${mvBtn(o, "mabar", "+ Baki mabar")}${mvBtn(o, "queue", "+ Queue live")}${mvBtn(o, "vvip", "★ VVIP")}${mvBtn(o, "album", "Komen Album")}${mvBtn(o, "akaun", "Mainkan Akaun")}${mvBtn(o, "none", "Abaikan")}</div></details>`;
      $("ap-orders").innerHTML = ords.length ? ords.map(o => `<li class="${o.warn ? "warn" : ""}">${srcTag(o)}<span class="who"><span class="nm">${esc(o.name)}</span><span class="sub">${o.mlid ? `ID ${esc(o.mlid)} · ` : "tiada ID · "}${fmtDate(o.at)}${o.amount ? ` · ${esc(o.cur || "")} ${o.amount}` : ""}${o.warn ? ` · ${esc(o.warn)}` : ""}</span></span><span class="bal">${o.games ? `+${o.games} game${o.vip ? " VVIP" : ""}` : o.svc && o.src !== "test" ? "✓" : "—"}</span>${ordBox(o)}<button class="btn sq ghost" type="button" data-a="orddel" data-rx="${o.rx}" aria-label="Buang order ${esc(o.name)}">✕</button>${o.raw ? `<details class="raw"><summary>Data asal</summary><code>${esc(o.raw)}</code></details>` : ""}</li>`).join("")
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
        box.innerHTML = rows.length ? `<li class="mhead" aria-hidden="true"><span>Nickname</span><span></span><span>Baki</span><span>ID ML</span><span>Waktu order</span><span>Tambah / set baki</span></li>` + rows.map(([k, m]) => `<li class="mrow${T(m) ? "" : " zero"}">
<span class="who mc-name"><span class="nm">${roleBadge(m)}${esc(m.name)} <button class="vvbtn${m.vvip ? " on" : ""}" type="button" data-a="vvip" data-k="${esc(k)}" title="${m.vvip ? "VVIP (tekan untuk buang)" : "Tanda sebagai VVIP"}" aria-label="VVIP ${esc(m.name)}">${m.vvip ? "★ VVIP" : "☆"}</button></span><span class="sub">${m.last ? `order ${fmtDate(m.last)}` : "tiada tarikh"}${m.miss ? ` · hilang ${m.miss}x` : ""}</span></span>
<span class="mc-st">${inLine(k) ? `<span class="tag">${s.playing.some(p => p.key === k) ? "MAIN" : "QUEUE"}</span>` : `<button class="btn sq" data-a="join" data-k="${esc(k)}" aria-label="Masuk queue" title="Masuk queue" ${T(m) > 0 ? "" : "disabled"}>Q</button>`}</span>
<span class="mbal"><span class="bal big">${T(m)}</span><small class="muted">${m.vbal ? `${m.bal || 0}+${m.vbal}V` : "game"}</small></span>
<input class="idin mc-id" data-k="${esc(k)}" value="${esc(m.mlid || "")}" placeholder="ID ML" aria-label="ID ML ${esc(m.name)}">
<input class="dtin mc-dt" type="datetime-local" data-k="${esc(k)}" value="${toInput(m.last)}" aria-label="Waktu order ${esc(m.name)}">
<div class="mgrid mc-act"><input class="gin" type="number" inputmode="numeric" placeholder="0" aria-label="Bilangan game untuk ${esc(m.name)}">
<select class="gsel" aria-label="Jenis baki"><option value="">Biasa</option><option value="v">VVIP</option></select>
<button class="btn" data-a="addn" data-k="${esc(k)}">Tambah</button><button class="btn ghost" data-a="setn" data-k="${esc(k)}">Set</button>
<button class="btn sq ghost" data-a="del" data-k="${esc(k)}" aria-label="Padam ${esc(m.name)}">✕</button></div>
${m.miss ? `<div class="mctl mc-miss"><span class="muted">Hilang ${m.miss} kali</span><button class="btn small ghost" data-a="miss0" data-k="${esc(k)}">Reset hilang</button></div>` : ""}</li>`).join("")
          : (q ? `<li class="empty">Tiada nama sepadan.</li>` : `<li class="empty imp"><span>Belum ada rekod.${s.docImported ? "" : " Data lama dari dokumen belum masuk."}</span>${s.docImported ? "" : `<button class="btn gold" type="button" data-a="import">Import data doc lama</button><small class="muted">Pilih fail <b>seed_doc.js</b> (dari phone atau PC).</small>`}</li>`);
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
<input class="mvnote" data-id="${x.id}" value="${esc(x.note || "")}" maxlength="80" placeholder="Remark (cth skin yang dituntut)" aria-label="Remark ${esc(x.name)}">
<span class="hist">${(x.hist || []).map((h, i) => `<button class="hc${h.c ? " ok" : ""}" type="button" data-a="mvh" data-id="${x.id}" data-i="${i}" title="Tekan: tukar claim / belum">${h.n}</button>`).join("")}</span></span>
<button class="btn sq" data-a="mv-" data-id="${x.id}" aria-label="MVP tolak 1">−</button><input class="mvcin" type="number" inputmode="numeric" data-id="${x.id}" value="${x.cur || 0}" aria-label="MVP ${esc(x.name)}"><button class="btn sq gold" data-a="mv+" data-id="${x.id}" aria-label="MVP tambah 1">+</button></div>
<div class="mctl mvctl">${(x.cur || 0) >= 5 ? `<button class="btn small gold" data-a="mvclaim" data-id="${x.id}">Claim ${x.cur} ✓</button><button class="btn small ghost" data-a="mvkeep" data-id="${x.id}">Simpan ${x.cur}</button>` : `<span class="muted">${5 - (x.cur || 0)} lagi untuk x5</span>`}
${(x.hist || []).length ? `<button class="btn small ghost" data-a="mvhdel" data-id="${x.id}" data-i="${x.hist.length - 1}">Buang nombor akhir</button>` : ""}<button class="btn sq ghost" data-a="mvdel" data-id="${x.id}" aria-label="Padam">✕</button></div></li>`).join("")
          : `<li class="empty">${q ? "Tiada nama sepadan." : "Belum ada."}</li>`;
      }
      // song requests
      const sg = (s.songs || []).filter(x => !x.done), sgWait = sg.length;
      tabc("lagu", sgWait || "");
      $("ap-sgc").textContent = sg.length ? `${sgWait} menunggu` : "";
      const cfg = s.songCfg || {};
      $("ap-sgdetect").checked = cfg.detect !== false;
      $("ap-songs").innerHTML = sg.length ? sg.map(x => `<li class="sgrow${x.done ? " done" : ""}"><span class="who"><span class="nm">♪ ${esc(x.title)}</span><span class="sub">${x.user ? `@${esc(x.user)} · ` : x.src === "app" ? "dari app · " : ""}${fmtDate(x.at)}</span></span>
<button class="btn sq ghost" type="button" data-a="sgdel" data-id="${x.id}" aria-label="Buang ${esc(x.title)}">✕</button></li>`).join("")
        : `<li class="empty">Tiada lagu request sedang main.</li>`;
      const sl = s.songLast, slBox = $("ap-sglast");
      if (sl && slBox) slBox.innerHTML = `<b>Data terakhir dari IndoFinity · ${fmtDate(sl.at)}</b><span>${sl.kind === "play" && sl.title ? `Dibaca: <b>@${esc(sl.user)}</b> minta <b>${esc(sl.title)}</b> ✓` : sl.kind !== "play" ? `Dibaca: !${esc(sl.kind)} oleh @${esc(sl.user)} ✓` : `<em>Tajuk lagu tak jumpa</em>. Tambah <b>?user={username}&comment={comment}</b> pada hujung link, atau hantar gambar data ni.`}</span><code>${esc(sl.raw || "(kosong)")}</code>`;
      // komen album
      const al = s.album || [];
      $("ap-alc").textContent = al.length ? `${alWait} menunggu · ${al.length - alWait} siap` : "";
      $("ap-album").innerHTML = al.length ? al.map(a => `<li class="alrow${a.done ? " done" : ""}"><span class="who"><span class="nm">${esc(a.name)}${a.src === "sociabuzz" ? ` <span class="tag sb">SOCIABUZZ</span>` : ""}</span><span class="sub">${a.mlid ? `ID ${esc(a.mlid)} · ` : ""}${fmtDate(a.at)}${a.note ? ` · ${esc(a.note)}` : ""}</span></span>
<button class="btn small ${a.done ? "ghost" : "gold"}" type="button" data-a="altog" data-id="${a.id}">${a.done ? "✓ Siap" : "Tanda siap"}</button><button class="btn sq ghost" type="button" data-a="aldel" data-id="${a.id}" aria-label="Buang ${esc(a.name)}">✕</button></li>`).join("")
        : `<li class="empty">Belum ada order komen album.</li>`;
      // slot mainkan akaun
      const akBox = $("ap-akaun");
      if (!force && busyIn(akBox)) pending.akaun = true;
      else {
        pending.akaun = false;
        akBox.innerHTML = (s.akaun || []).map((r, i) => `<li class="akrow"><input class="akin" data-i="${i}" data-f="day" value="${esc(r.day)}" placeholder="Hari" aria-label="Hari"><input class="akin" data-i="${i}" data-f="name" value="${esc(r.name)}" placeholder="Nama" aria-label="Nama"><input class="akin akdate" type="date" data-i="${i}" data-f="date" value="${/^\d{4}-\d{2}-\d{2}$/.test(r.date || "") ? esc(r.date) : ""}" aria-label="Tarikh"><button class="btn sq ghost" data-a="akdel" data-i="${i}" aria-label="Buang baris">✕</button></li>`).join("");
      }
    }
    /* ---------- drag a player: queue -> playing slot = replace (the replaced player keeps the balance), queue -> queue = reorder ---------- */
    const qcard = root.querySelector("section.queue");
    if (qcard) {
      let ghost = null, over = null;
      qcard.addEventListener("pointerdown", e => {
        const g = e.target.closest(".qgrip"); if (!g || root.classList.contains("editing")) return;
        const row = g.closest("li.qrow"); qDrag = { id: row.dataset.qid, zone: row.dataset.zone, row };
        ghost = row.cloneNode(true); ghost.classList.add("qghost"); ghost.style.width = row.offsetWidth + "px"; document.body.appendChild(ghost);
        ghost.style.left = (e.clientX - 20) + "px"; ghost.style.top = (e.clientY - 20) + "px";
        row.classList.add("qdragging"); g.setPointerCapture(e.pointerId); e.preventDefault();
      });
      qcard.addEventListener("pointermove", e => {
        if (!qDrag) return;
        ghost.style.left = (e.clientX - 20) + "px"; ghost.style.top = (e.clientY - 20) + "px";
        ghost.hidden = true; const el = document.elementFromPoint(e.clientX, e.clientY); ghost.hidden = false;
        const t = el && el.closest("li.qrow"), list = el && el.closest("#ap-queue");
        if (over) over.classList.remove("qover", "qover-up", "qover-down");
        over = t && t !== qDrag.row ? t : (list && !t ? list : null);
        if (over && over.classList.contains("qrow")) {
          if (over.dataset.zone === "play" && qDrag.zone === "queue") over.classList.add("qover");
          else if (over.dataset.zone === "queue" && qDrag.zone === "queue") { const r = over.getBoundingClientRect(); over.classList.add(e.clientY < r.top + r.height / 2 ? "qover-up" : "qover-down"); }
          else over = null;
        }
      });
      const qEnd = e => {
        if (!qDrag) return;
        const d = qDrag; qDrag = null;
        if (ghost) { ghost.remove(); ghost = null; }
        d.row.classList.remove("qdragging");
        const t = over; if (over) over.classList.remove("qover", "qover-up", "qover-down"); over = null;
        if (t && t.classList.contains("qrow")) {
          if (t.dataset.zone === "play" && d.zone === "queue") {
            Store.nextLabel = "Queue · ganti pemain";
            const r = Q.replaceIn(d.id, t.dataset.qid);
            if (r) toast(`${r.inName} masuk main, ganti ${r.outName} (baki ${r.outName} kekal dalam Hutang Mabar)`, 4000);
          } else if (t.dataset.zone === "queue" && d.zone === "queue") {
            const ids = Store.state.queue.map(p => p.id), from = ids.indexOf(d.id); let to = ids.indexOf(t.dataset.qid);
            const r = t.getBoundingClientRect(); if (e && e.clientY >= r.top + r.height / 2) to += 1; if (from < to) to -= 1;
            Store.nextLabel = "Queue · susun"; Q.moveQueue(d.id, to);
          }
        }
        if (pending.queue) { pending.queue = false; render(Store.state, true); }
      };
      qcard.addEventListener("pointerup", qEnd); qcard.addEventListener("pointercancel", () => qEnd(null));
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
    $("ap-sgdetect").addEventListener("change", e => Q.songCfg({ detect: e.target.checked }));
    // IndoFinity only: is it playing (sound level), is Spotify paused for it
    setInterval(() => {
      const box = $("ap-sgmedia"), j = O.MEDIA && O.MEDIA.last; if (!box || !j || Date.now() - O.MEDIA.at > 8000) return;
      const st = Store.state || {}, cfg = st.songCfg || {}, want = String(cfg.player || "indofinity").toLowerCase();
      const au = (j.audio || []).filter(x => x.name.toLowerCase().includes(want)).sort((a, b) => b.peak - a.peak)[0];
      const pk = au ? au.peak : 0, now = st.songNow;
      const head = cfg.detect === false ? "Dimatikan." : now ? `<b class="on">▶ Lagu request sedang main${now.title ? `: ${esc(now.title)}` : ""}${now.user ? ` · req @${esc(now.user)}` : ""}</b>${st.spotAuto ? " · Spotify dijeda" : ""}`
        : au ? "IndoFinity senyap · Spotify main biasa" : `<b class="warn">IndoFinity tak dikesan.</b> Buka app IndoFinity di PC ni.`;
      const ifx = (j.ifx || []).slice(0, 400).map(String);
      // semakan: baris yang ada "@" (dengan 3 teks sebelumnya) + maklumat lagu dari Windows
      const ats = []; ifx.forEach((t, i) => { if (/@[\w.]{2,}/.test(t)) ats.push(ifx.slice(Math.max(0, i - 3), i + 1).join("  ›  ")); });
      const smI = (j.smtc || []).filter(x => /indofinity/i.test(x.app)).map(x => `${x.app}: ${[x.artist, x.title].filter(Boolean).join(" - ") || "tiada tajuk"} (${x.playing ? "main" : "berhenti"})`);
      const found = O.ifxFind ? O.ifxFind(ifx, (j.smtc || []).find(x => /indofinity/i.test(x.app) && x.playing)) : null;
      const dbgTxt = !ifx.length ? (j.uia === false ? "Windows tak benarkan baca teks app (UI Automation)." : "Teks tetingkap IndoFinity KOSONG. Main lagu request dan biar tetingkap IndoFinity terbuka (jangan minimize).")
        : `Jumpa: ${found && found.user ? `${found.title} · @${found.user}` : found ? `${found.title} · TIADA nama peminta` : "TIADA nama peminta"}\nBaris ada @ (${ats.length}):\n${ats.join("\n") || "(tiada)"}\nWindows media: ${smI.join(" | ") || "(tiada)"}\nJumlah teks: ${ifx.length}\n\nSemua teks:\n${ifx.join("  |  ")}`;
      const dbg = `<details class="quick sgifx"${box.querySelector(".sgifx[open]") ? " open" : ""}><summary>Semakan nama peminta (screenshot ni kalau nama tak keluar)</summary><code>${esc(dbgTxt)}</code></details>`;
      const html = `<p class="sgst"><span class="nm">🔊 IndoFinity</span> <i class="vu"><i style="width:${Math.min(100, Math.round(pk * 160))}%"></i></i> ${head}</p>${!j.audioOk && !j.winrt ? `<p class="muted">Windows tak benarkan server baca bunyi app. Buka semula START_OVERLAY.bat.</p>` : ""}${dbg}`;
      if (box._h !== html) { box.innerHTML = html; box._h = html; }
    }, 1000);
    const spMsg = r => r === "ok" ? "" : r === "tiada-spotify" ? " (Spotify tak dibuka?)" : r ? ` (${r})` : " (perlu START_OVERLAY.bat)";
    $("ap-sppause").addEventListener("click", () => Q.spotify("pause").then(r => toast("Spotify dijeda" + spMsg(r))));
    $("ap-spplay").addEventListener("click", () => Q.spotify("play").then(r => toast("Spotify disambung" + spMsg(r))));
    setInterval(() => {
      const at = (Store.state || {}).songResumeAt, el = $("ap-spst"); if (!el) return;
      if (at && at > Date.now()) { const left = Math.ceil((at - Date.now()) / 1000); el.textContent = `Spotify disambung sendiri dalam ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; }
      else el.textContent = "";
    }, 1000);
    $("ap-aladd").addEventListener("submit", e => {
      e.preventDefault();
      const n = $("ap-alname").value.trim(); if (!n) { $("ap-alname").focus(); toast("Taip nama dulu"); return; }
      Q.albumAdd(n, $("ap-almlid").value.trim(), $("ap-alnote").value.trim());
      $("ap-alname").value = ""; $("ap-almlid").value = ""; $("ap-alnote").value = ""; toast(`${n}: komen album ditambah`);
    });
    twoStep($("ap-alclear"), () => { Q.albumClearDone(); toast("Yang dah siap dibuang"); });
    twoStep($("ap-cleartest"), () => { Store.set(s => { s.orders = (s.orders || []).filter(o => o.src !== "test" && o.src !== "sim"); }); toast("Baris TEST dibuang"); });
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
      if (a && (!b || a.rx !== b.rx) && a.src !== "manual" && a.src !== "sim") toast(a.src === "test" ? "Test Sociabuzz diterima ✓ (lihat tab Order)" : a.warn ? `Order Sociabuzz: ${a.name} · ${a.warn}` : a.svc === "album" ? `Komen album: ${a.name}` : a.svc === "akaun" ? `Mainkan akaun: ${a.name}` : a.svc === "joki" ? `Joki minigame: ${a.name}` : `Order Sociabuzz: ${a.name} +${a.games} game`, 5000);
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
      renderLinks(a); hookTick(); checkUpdate(); songLinks(a);
      return a;
    }).catch(() => null);

    function songLinks(a) {
      const box = $("ap-sglinks"); if (!box || !a || !a.hookUrl) return;
      const key = (String(a.hookUrl).match(/order-hook\/([^/?#]+)/) || [])[1]; if (!key) return;
      const rows = [];
      if (a.publicUrl) rows.push(["Link kekal (disyorkan)", `${a.publicUrl}/api/song-hook/${key}`]);
      rows.push([a.publicUrl ? "Cuba ini kalau link kekal tak jalan" : "IndoFinity di PC ni (pasang link kekal untuk lebih stabil)", `http://127.0.0.1:${a.port || 8787}/api/song-hook/${key}`]);
      box.innerHTML = rows.map(([t, u]) => `<div class="lk"><span>${esc(t)}</span><code>${esc(u)}</code><button class="btn sq" type="button" data-copy="${esc(u)}" aria-label="Salin">⧉</button></div>`).join("");
    }
    /* ---------- new version on GitHub? (PC only; KEMASKINI.bat installs it) ---------- */
    let updChecked = 0;
    function checkUpdate() {
      if (!lastAuth || !lastAuth.local || Date.now() - updChecked < 30 * 60000) return; updChecked = Date.now();
      fetch("api/versi", { cache: "no-store" }).then(r => r.ok ? r.text() : "").then(v => fetch("https://api.github.com/repos/tuyulrevival1/https-anthropic.com-claude-code/commits/claude/streaming-layout-chou-kof-vie6x8")
        .then(r => r.ok ? r.json() : null).then(c => { if (c && c.sha && c.sha !== String(v || "").trim()) $("ap-upd").hidden = false; }))
        .catch(() => {});
    }
    setInterval(checkUpdate, 31 * 60000);

    /* ---------- webhook test & status ---------- */
    let lastAuth = null, lastHit = 0;
    const hookPath = () => { const m = String(lastAuth && lastAuth.hookUrl || "").match(/\/api\/order-hook\/[^/?#]+/); return m ? m[0].slice(1) : ""; };
    const tm = ms => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
    const RES = { song: ["SONG REQUEST ✓", "ok"], ok: ["OK ✓", "ok"], key: ["KUNCI SALAH: URL tak lengkap / salah salin", "bad"], get: ["dibuka dalam browser (GET) ✓", "ok"], empty: ["SAMPAI TAPI KOSONG", "bad"] };
    function hookTick() {
      if (!lastAuth || !lastAuth.ok) return;
      fetch("api/hooklog", { headers: { "X-Pin": lsGet(PIN_KEY, "") }, cache: "no-store" }).then(r => r.ok ? r.json() : null).then(list => {
        if (Array.isArray(list) && !lastHit) lastHit = list.length ? list[0].t : 1;
        if (!Array.isArray(list)) { $("ap-hooklast").textContent = "Server lama: tutup tetingkap hitam & buka semula START_OVERLAY.bat"; return; }
        const pub = lastAuth.publicUrl;
        if (!list.length) {
          $("ap-hooklast").textContent = pub ? "Belum ada apa-apa sampai sejak server dibuka." : "Link kekal belum aktif: Sociabuzz tak boleh sampai. Klik PASANG_LINK_KEKAL.bat.";
          $("ap-hookst").className = "hookst warn"; $("ap-hooklog").innerHTML = ""; return;
        }
        const r0 = RES[list[0].r] || [list[0].r, ""];
        if (lastHit && list[0].t > lastHit) {
          const ok = r0[1] === "ok", chip = $("ap-hookchip");
          if (chip) { chip.textContent = `WEBHOOK ${ok ? "✓" : "✗"} ${tm(list[0].t)}`; chip.className = "chip " + (ok ? "ok" : "warn"); chip.hidden = false; clearTimeout(chip._h); chip._h = setTimeout(() => { chip.hidden = true; }, 120000); }
          toast(`Webhook masuk (${list[0].via}): ${r0[0]}`, 5000);
        }
        lastHit = Math.max(lastHit || 0, list[0].t);
        $("ap-hooklast").textContent = `Terakhir ${tm(list[0].t)} · ${list[0].via} · ${r0[0]}`;
        $("ap-hookst").className = "hookst " + (r0[1] === "ok" ? "ok" : "warn");
        $("ap-hooklog").innerHTML = list.slice(0, 8).map(h => { const r = RES[h.r] || [h.r, ""]; return `<li class="${r[1]}"><span class="who"><span class="nm">${esc(tm(h.t))} · ${esc(h.via)}</span><span class="sub">${esc(r[0])} · ${h.n} bait${h.ua ? " · " + esc(h.ua) : ""}</span></span></li>`; }).join("");
      }).catch(() => {});
    }
    setInterval(hookTick, 4000);
    // custom test: same path as a Sociabuzz payment (webhook), marked as a test by its example.com email
    const PKG_RM = { "1 GAME": 4, "PACKAGE 3 GAME": 10, "PACKAGE 6 GAME": 20, "PACKAGE 9 GAME": 30, "RANK IMMORTAL 1 GAME": 6, "RANK IMMORTAL 3 GAME": 15, "FAST TRACK (VVIP) RM8 1 GAME": 8, "KOMEN ALBUM": 5, "JOKI MINIGAME LAYLA 250K+ SCORE": 10 };
    root.querySelectorAll("[data-ctamt]").forEach(b => b.addEventListener("click", () => { $("ap-ctamt").value = b.dataset.ctamt; $("ap-ctpkg").value = ""; }));
    $("ap-ctpkg").addEventListener("change", e => { if (PKG_RM[e.target.value]) $("ap-ctamt").value = PKG_RM[e.target.value]; });
    $("ap-ctest").addEventListener("submit", e => {
      e.preventDefault();
      const p = hookPath(); if (!p) { toast("Perlu server & PIN dulu"); return; }
      const amt = Math.max(1, parseFloat($("ap-ctamt").value) || 0), name = $("ap-ctname").value.trim() || "Test SYNO", pkg = $("ap-ctpkg").value;
      const body = { id: "CT-" + Date.now(), amount: amt, currency: "MYR", supporter: name, email_supporter: "test@example.com", message: "ID " + $("ap-ctid").value.trim(), created_at: new Date().toISOString() };
      if (pkg) body.package = pkg;
      fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(r => { toast(r.ok ? `Custom test RM${amt}${pkg ? " · " + pkg : ""} dihantar, tunggu 3 saat…` : "Server tolak (" + r.status + ")", 3500); setTimeout(hookTick, 600); })
        .catch(() => toast("Server tak jawab"));
    });
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
        ["Overlay OBS portrait 1080x1920", `http://127.0.0.1:8787/overlay.html`],
        ["Overlay OBS landscape 1920x1080", `http://127.0.0.1:8787/landscape.html`],
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
