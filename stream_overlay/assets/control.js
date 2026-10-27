/* Panel kawalan: queue Mabar VIP, W/L, MMR, on/off queue & banner. */
(function () {
  "use strict";
  const { Store, Q, CFG } = window.ChouOverlay;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function mountControl(root) {
    Store.init();
    const pkgs = CFG.mabar.prices.map(p => ({ n: parseInt(p.qty, 10) || 1, label: `${p.qty} · ${p.price}` }));
    root.classList.add("cp");
    root.innerHTML = `
<section class="cp-box cp-add">
  <h3>Tambah pemain</h3>
  <form id="cp-form" class="cp-row" autocomplete="off">
    <input id="cp-name" maxlength="18" placeholder="Nama / ID ML" aria-label="Nama pemain">
    <select id="cp-pkg" aria-label="Pakej">${pkgs.map(p => `<option value="${p.n}">${esc(p.label)}</option>`).join("")}</select>
    <button class="cp-btn primary" type="submit">Tambah</button>
  </form>
</section>
<section class="cp-box">
  <h3>Game habis</h3>
  <div class="cp-row">
    <button class="cp-btn win" data-act="W">Menang</button>
    <button class="cp-btn lose" data-act="L">Kalah</button>
    <button class="cp-btn" data-act="X">Habis (tak kira)</button>
  </div>
  <p class="cp-note">Setiap tekan: semua yang sedang main tolak 1 game. Yang habis pakej keluar, queue naik sendiri.</p>
</section>
<section class="cp-box">
  <h3>Sedang main <span id="cp-pc"></span></h3>
  <ol id="cp-play" class="cp-list"></ol>
  <h3>Queue <span id="cp-qc"></span></h3>
  <ol id="cp-queue" class="cp-list"></ol>
</section>
<section class="cp-box">
  <h3>Stats</h3>
  <div class="cp-stats">
    <label>Win <span class="cp-step"><button data-st="wins" data-d="-1">−</button><b id="cp-wins"></b><button data-st="wins" data-d="1">+</button></span></label>
    <label>Lose <span class="cp-step"><button data-st="losses" data-d="-1">−</button><b id="cp-losses"></b><button data-st="losses" data-d="1">+</button></span></label>
    <label for="cp-mmr">MMR <input id="cp-mmr" type="number" inputmode="numeric"></label>
    <label for="cp-glob">Global # <input id="cp-glob" type="number" inputmode="numeric"></label>
  </div>
  <div class="cp-row">
    <label class="cp-tog"><input id="cp-showq" type="checkbox"> Tunjuk queue</label>
    <label class="cp-tog"><input id="cp-showb" type="checkbox"> Tunjuk banner</label>
    <label class="cp-tog"><input id="cp-showw" type="checkbox"> Tunjuk Welcome</label>
  </div>
  <div class="cp-row">
    <button class="cp-btn" id="cp-resetwl" type="button">Reset W/L</button>
    <button class="cp-btn danger" id="cp-clear" type="button">Kosongkan queue</button>
  </div>
</section>`;

    const $ = id => root.querySelector("#" + id);
    $("cp-form").addEventListener("submit", e => {
      e.preventDefault();
      Q.add($("cp-name").value, $("cp-pkg").value);
      $("cp-name").value = ""; $("cp-name").focus();
    });
    root.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => Q.endGame(b.dataset.act)));
    root.querySelectorAll("[data-st]").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.st, d = +b.dataset.d;
      Store.set(s => { s[k] = Math.max(0, s[k] + d); });
    }));
    $("cp-mmr").addEventListener("change", e => Q.patch({ mmr: Math.max(0, parseInt(e.target.value, 10) || 0) }));
    $("cp-glob").addEventListener("change", e => Q.patch({ globalRank: Math.max(1, parseInt(e.target.value, 10) || 1) }));
    $("cp-showq").addEventListener("change", e => Q.patch({ showQueue: e.target.checked }));
    $("cp-showb").addEventListener("change", e => Q.patch({ showBanner: e.target.checked }));
    $("cp-showw").addEventListener("change", e => Q.patch({ showWelcome: e.target.checked }));
    $("cp-resetwl").addEventListener("click", () => Q.patch({ wins: 0, losses: 0, streak: 0 }));
    let armed = null;
    $("cp-clear").addEventListener("click", e => {
      const b = e.currentTarget;
      if (armed) { clearTimeout(armed); armed = null; b.textContent = "Kosongkan queue"; Q.clear(); return; }
      b.textContent = "Tekan sekali lagi"; armed = setTimeout(() => { armed = null; b.textContent = "Kosongkan queue"; }, 2500);
    });

    root.addEventListener("click", e => {
      const b = e.target.closest("[data-p]"); if (!b) return;
      const id = b.dataset.p, a = b.dataset.a;
      if (a === "rm") Q.remove(id); else if (a === "up") Q.up(id); else if (a === "plus") Q.addGame(id, 1); else if (a === "minus") Q.addGame(id, -1);
    });

    function render(s) {
      const max = CFG.mabar.maxPlaying;
      $("cp-pc").textContent = `${s.playing.length}/${max}`;
      $("cp-qc").textContent = s.queue.length;
      $("cp-play").innerHTML = s.playing.length ? s.playing.map(p => `<li><span class="nm">${esc(p.name)}</span><span class="gl">${p.left}/${p.games} game</span>
<button data-p="${p.id}" data-a="minus" aria-label="Kurang 1 game">−</button><button data-p="${p.id}" data-a="plus" aria-label="Tambah 1 game">+</button><button data-p="${p.id}" data-a="rm" aria-label="Buang">✕</button></li>`).join("")
        : `<li class="empty">Belum ada. Tambah nama di atas.</li>`;
      $("cp-queue").innerHTML = s.queue.length ? s.queue.map((p, i) => `<li><span class="no">${i + 1}</span><span class="nm">${esc(p.name)}</span><span class="gl">${p.games} game</span>
<button data-p="${p.id}" data-a="up" aria-label="Naik">↑</button><button data-p="${p.id}" data-a="rm" aria-label="Buang">✕</button></li>`).join("")
        : `<li class="empty">Queue kosong.</li>`;
      $("cp-wins").textContent = s.wins; $("cp-losses").textContent = s.losses;
      if (document.activeElement !== $("cp-mmr")) $("cp-mmr").value = s.mmr;
      if (document.activeElement !== $("cp-glob")) $("cp-glob").value = s.globalRank;
      $("cp-showq").checked = !!s.showQueue; $("cp-showb").checked = !!s.showBanner; $("cp-showw").checked = !!s.showWelcome;
    }
    render(Store.state); Store.on(render);
  }
  window.ChouOverlay.mountControl = mountControl;
})();
