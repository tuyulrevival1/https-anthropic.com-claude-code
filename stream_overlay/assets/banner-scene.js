/* "minimal" banner: a brand scene (accent wedges, kinetic text, mascot, tracking-in
   tagline, bio badge) then a services scene (big mascot + clean two-line text that
   blur-swaps, premium icon, Link in Bio pill with tap).  accent: crimson (default) | gold */
(function () {
  "use strict";
  const O = window.ChouOverlay, CFG = O.CFG;
  const { el, esc, seg, eOut, eBack, frac, TAU, rnd, tickers, now } = O.util;
  const ACCENTS = { crimson: "#ff2350", gold: "#ffcf4a" };
  const ease2 = t => t * t * (3 - 2 * t);
  const hl = s => esc(s).replace(/(RM\s?\d+)/g, "<em>$1</em>");

  const GRAIN = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .09 0"/></filter><rect width="240" height="240" filter="url(#n)"/></svg>`);

  const mascot = () => ({ html: O.mascot3d.svg(), anim: (svg, pose, t) => O.mascot3d.anim(svg, t, { pose }) });
  const POSE = { diamond: "game", rank: "win", mabar: "wink", album: "game", link: "wink" };

  function mountSceneBanner(root, opts = {}) {
    O.Store.init();
    const accName = opts.accent || (CFG.scene && CFG.scene.accent) || "crimson";
    const accent = ACCENTS[accName] || accName;
    const SC = CFG.scene, items = SC.items, NI = items.length, DB = SC.brandSeconds, DI = SC.itemSeconds;
    const LOOP = DB + NI * DI;
    const BR = CFG.brand || {}, B = { tagline: BR.tagline || CFG.storeName };
    const badge = BR.badge || ["INFO LANJUT", "DI BIO"];

    const bn = el("div", "bn bn-scene lg-mascot");
    bn.style.top = (opts.y || 0) + "px";
    bn.style.setProperty("--acc", accent);
    const kinRow = Array(6).fill(esc(B.tagline.replace(/\s+/g, ""))).join("");
    const brandLogo = mascot(), svcLogo = mascot();
    bn.innerHTML = `<div class="bn-bg"></div><canvas class="sc-smoke" width="270" height="48"></canvas>
<div class="sc-grain" style="background-image:url('${GRAIN}')"></div>
<div class="sc-strip a"><div class="sc-kin">${Array.from({ length: 5 }, (_, i) => `<div class="r${i % 2}">${kinRow}</div>`).join("")}</div></div>
<div class="sc-strip b"></div>
<div class="sc-brand"><div class="sc-blogo">${brandLogo.html}</div>
 <div class="sc-btxt"><div class="sc-track">${esc(B.tagline)}</div><div class="sc-sub">${esc(BR.sub || "")}</div></div></div>
<div class="sc-badge"><span>${esc(badge[0] || "")}</span><span>${esc(badge[1] || "")}</span></div>
<div class="sc-logo">${svcLogo.html}</div>
${items.map(it => `<div class="sc-item"><div class="sc-ico">${it.icon === "rank" ? O.ranks.html() : O.powerIcons.svg(it.icon)}</div>
<div class="sc-txt"><div class="sc-b">${esc(it.bold)}${it.pill ? `<span class="sc-pill">${esc(it.pill).replace(/(Bio)$/i, "<b>$1</b>")}<i class="sc-hand"><svg viewBox="0 0 24 28"><path d="M8 2.5c1.4 0 2.4 1 2.4 2.4v7.3l1-.3c1.2-.3 2.3.4 2.6 1.5l3.4-.3c1.6-.1 3 1.1 3 2.7v3.6c0 4-3 7.3-7 7.3h-2.3c-2.3 0-4.3-1.3-5.4-3.3L2.3 16c-.6-1.2 0-2.6 1.3-3 1-.3 2 .1 2.5 1l-.5-9.1C5.6 3.5 6.6 2.5 8 2.5z" fill="#fff" stroke="#07050c" stroke-width="1.6"/></svg></i></span>` : ""}</div>
${it.light ? `<div class="sc-l">${hl(it.light)}</div>` : ""}</div></div>`).join("")}
<div class="sc-wiper"><i class="w1"></i><i class="w2"></i></div>
<div class="sc-line top"></div><div class="sc-line bot"></div>`;
    root.appendChild(bn);

    const q = c => bn.querySelector(c);
    const ctx = q(".sc-smoke").getContext("2d");
    const stripA = q(".sc-strip.a"), stripB = q(".sc-strip.b"), kin = [...bn.querySelectorAll(".sc-kin > div")];
    const brandEl = q(".sc-brand"), track = q(".sc-track"), sub = q(".sc-sub"), badgeEl = q(".sc-badge");
    const blogoSvg = q(".sc-blogo svg"), logoEl = q(".sc-logo"), logoSvg = q(".sc-logo svg");
    const itemEls = [...bn.querySelectorAll(".sc-item")].map((e, i) => ({
      e, ico: e.querySelector(".sc-ico"), svg: e.querySelector(".sc-ico > *"), b: e.querySelector(".sc-b"), l: e.querySelector(".sc-l"),
      pill: e.querySelector(".sc-pill"), hand: e.querySelector(".sc-hand"), it: items[i]
    }));
    const w1 = q(".sc-wiper .w1"), w2 = q(".sc-wiper .w2");
    const [ar, ag, ab] = [1, 3, 5].map(i => parseInt(accent.slice(i, i + 2), 16) || 160);

    const fit = () => itemEls.forEach(x => {
      let fs = 38; x.b.style.fontSize = fs + "px";
      while (x.b.scrollWidth > 440 && fs > 22) { fs -= 2; x.b.style.fontSize = fs + "px"; }
    });
    fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

    function smoke(t) {
      ctx.clearRect(0, 0, 270, 48);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 16; i++) {
        const r1 = rnd(i + 1001), r2 = rnd(i + 1101), r3 = rnd(i + 1201);
        const k = 1 + Math.floor(r3 * 2);
        const x = frac(r1 + t * k / LOOP) * 350 - 40;
        const y = 24 + Math.sin(t / LOOP * TAU * (1 + (i % 3)) + i) * 14;
        const rad = 16 + r2 * 26;
        const tint = i % 4 === 0;
        const a = tint ? .09 : .06;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, tint ? `rgba(${ar},${ag},${ab},${a})` : `rgba(210,205,225,${a})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function frame(t) {
      if (bn.style.display === "none") return;
      const tl = ((t % LOOP) + LOOP) % LOOP;
      smoke(t);
      const inBrand = tl < DB;
      // accent wedges: full in brand scene, thin accents in services scene
      const open = inBrand ? eOut(seg(tl, .1, .6)) * (1 - eOut(seg(tl, DB - .45, DB - .1))) : 0;
      const thin = .16;
      const sa = thin + (1 - thin) * open;
      stripA.style.clipPath = `polygon(0 0, ${(100 * sa).toFixed(2)}% 0, ${(92 * sa).toFixed(2)}% ${(14 * sa + 4).toFixed(2)}%, 0 ${(40 * sa + 6).toFixed(2)}%)`;
      stripB.style.clipPath = `polygon(100% ${(100 - 40 * sa - 6).toFixed(2)}%, 100% 100%, ${(100 - 100 * sa).toFixed(2)}% 100%)`;
      kin.forEach((r, i) => r.style.transform = `translateX(${((i % 2 ? -1 : 1) * frac(t / 6) * 240 - 240).toFixed(1)}px)`);
      kin[0].parentElement.style.opacity = open.toFixed(3);

      // brand scene
      if (inBrand) {
        brandEl.style.visibility = "visible"; badgeEl.style.visibility = "visible";
        const inn = eOut(seg(tl, .2, 1.1)), out = ease2(seg(tl, DB - .7, DB - .2));
        track.style.letterSpacing = (1.6 - 1.28 * inn + out * 1.2).toFixed(3) + "em";
        track.style.opacity = Math.min(inn * 1.4, 1 - out).toFixed(3);
        const sp = eOut(seg(tl, .8, 1.3));
        sub.style.opacity = Math.min(sp, 1 - out).toFixed(3);
        sub.style.transform = `translateY(${((1 - sp) * 8).toFixed(1)}px)`;
        const lp = seg(tl, .05, .9);
        q(".sc-blogo").style.opacity = Math.min(lp * 4, 1 - out).toFixed(3);
        q(".sc-blogo").style.transform = `scale(${(1 - out * .3).toFixed(3)})`;
        brandLogo.anim(blogoSvg, "game", t);
        const bp = seg(tl, .6, 1.1), bo = eOut(seg(tl, DB - .55, DB - .2));
        badgeEl.style.transform = `translateX(${((1 - eBack(bp)) * 260 + bo * 260).toFixed(1)}px) rotate(${(-4 + Math.sin(t * TAU / 1.6) * 1.5).toFixed(2)}deg)`;
        badgeEl.style.opacity = bp > 0 ? "1" : "0";
      } else { brandEl.style.visibility = "hidden"; badgeEl.style.visibility = "hidden"; }

      // services scene
      const st = tl - DB;
      if (!inBrand) {
        logoEl.style.visibility = "visible";
        const le = eOut(seg(st, 0, .6)), lx = ease2(seg(st, NI * DI - .55, NI * DI - .15));
        logoEl.style.opacity = Math.min(le * 2, 1 - lx).toFixed(3);
        const ii = Math.min(NI - 1, Math.floor(st / DI)), iu = st - ii * DI;
        const pop = ii > 0 && iu < .45 ? Math.sin(seg(iu, 0, .45) * Math.PI) : 0; // bounce when the pose changes
        logoEl.style.transform = `translateY(${((1 - le) * 18 - lx * 18 - pop * 6).toFixed(1)}px) scale(${(.92 + .08 * le + pop * .05).toFixed(3)}, ${(.92 + .08 * le - pop * .03).toFixed(3)})`;
        svcLogo.anim(logoSvg, POSE[items[ii].icon] || "game", t);
      } else logoEl.style.visibility = "hidden";

      itemEls.forEach((x, i) => {
        const u = st - i * DI;
        if (inBrand || u < 0 || u >= DI) { if (x.e.style.visibility !== "hidden") x.e.style.visibility = "hidden"; return; }
        x.e.style.visibility = "visible";
        const a = eOut(seg(u, .25, .85)), o = ease2(seg(u, DI - .5, DI - .1));
        const blur = (1 - a) * 10 + o * 10;
        x.e.style.opacity = Math.min(a, 1 - o).toFixed(3);
        x.e.style.filter = blur > .05 ? `blur(${blur.toFixed(2)}px)` : "none";
        x.b.style.letterSpacing = ((1 - a) * .16 + o * .1).toFixed(3) + "em";
        x.e.style.transform = `translateY(${((1 - a) * 10 - o * 10).toFixed(1)}px)`;
        if (x.l) { const lp = eOut(seg(u, .55, 1.05)); x.l.style.opacity = Math.min(lp, 1 - o).toFixed(3); x.l.style.transform = `translateX(${((1 - lp) * -14).toFixed(1)}px)`; }
        const ip = seg(u, .3, .75);
        x.ico.style.transform = `scale(${(.3 + .7 * eBack(ip)).toFixed(3)}) rotate(${((1 - eOut(ip)) * -20).toFixed(1)}deg)`;
        O.powerIcons.anim(x.svg, x.it.icon, t, u);
        if (x.pill) {
          const pp = seg(u, .7, 1.15);
          x.pill.style.transform = `perspective(400px) rotateX(${((1 - eOut(pp)) * 90).toFixed(1)}deg)`;
          const tp = frac((u - 1.4) / 1.2), press = u > 1.4 && tp < .25 ? Math.sin(tp / .25 * Math.PI) : 0;
          x.hand.style.opacity = u > 1.2 ? "1" : "0";
          x.hand.style.transform = `translate(${(-press * 3).toFixed(1)}px, ${(-press * 4).toFixed(1)}px) scale(${(1 - press * .12).toFixed(3)})`;
          x.pill.classList.toggle("press", press > .5);
        }
      });

      // accent wipe at both scene changes
      const d0 = tl < 1 ? tl : tl - LOOP, d1 = tl - DB;
      const d = Math.abs(d0) < Math.abs(d1) ? d0 : d1;
      const wp = seg(d, -.35, .35);
      w1.style.transform = `translateX(${(-520 + ease2(wp) * 2160).toFixed(1)}px) skewX(-24deg)`;
      w2.style.transform = `translateX(${(-700 + ease2(seg(d, -.28, .42)) * 2160).toFixed(1)}px) skewX(-24deg)`;
      w1.style.opacity = wp > 0 && wp < 1 ? "1" : "0";
      w2.style.opacity = seg(d, -.28, .42) > 0 && seg(d, -.28, .42) < 1 ? "1" : "0";
    }
    tickers.push(frame);
    frame(now());
    const destroy = () => { const i = tickers.indexOf(frame); if (i >= 0) tickers.splice(i, 1); bn.remove(); };
    return { el: bn, frame, LOOP, setStyle() {}, destroy };
  }

  O.mountSceneBanner = mountSceneBanner;
  O.ACCENTS = ACCENTS;
})();
