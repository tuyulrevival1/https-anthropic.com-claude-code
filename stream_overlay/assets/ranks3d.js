/* 3D rank sequence for the joki message.
   Uses the real MLBB rank icons you drop into assets/ranks/ (transparent PNG):
     epic.png  legend.png  mythic.png  honor.png  glory.png  immortal.png
   Each icon is stacked into a thick 3D coin (darkened back layers), flips in on the
   Y axis, swings slowly, floats over a soft floor shadow, with a tier-coloured glow
   and a specular sweep. Missing files fall back to the drawn badges. */
(function () {
  "use strict";
  const O = window.ChouOverlay, CFG = O.CFG;
  const { seg, eOut, eBack, frac, TAU, uid } = O.util;

  /* drawn stand-in badges, used only while the original PNG is missing */
  const TIERS = [
    { n: "EPIC", a: "#45f0bf", b: "#0a6b56", w: 0, icon: "chev" },
    { n: "LEGEND", a: "#ffd76a", b: "#b45f00", w: 1, icon: "star" },
    { n: "MYTHIC", a: "#c995ff", b: "#4a149c", w: 2, icon: "gem" },
    { n: "HONOR", a: "#8fc2ff", b: "#1b3f8f", w: 2, icon: "star" },
    { n: "GLORY", a: "#ff96d4", b: "#8f155e", w: 2, icon: "crown" },
    { n: "IMMORTAL", a: "#ff5874", b: "#5e0016", w: 3, icon: "flame" }
  ];
  function badge(T, u, i) {
    const g = `${u}t${i}`;
    const wingsL = T.w === 0 ? "" : T.w === 1 ? "M86 74 L52 62 L66 82 L46 92 L86 104Z"
      : T.w === 2 ? "M86 68 L36 48 L56 72 L28 82 L58 96 L38 108 L86 112Z"
      : "M86 64 L24 36 L48 64 L16 74 L50 90 L24 104 L58 112 L42 124 L88 118Z";
    const ic = {
      chev: `<path d="M114 98 L134 84 L154 98 M114 114 L134 100 L154 114" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>`,
      star: `<polygon points="134,78 140.5,94 158,95 144.5,106 149,123 134,113.5 119,123 123.5,106 110,95 127.5,94" fill="#fff"/>`,
      gem: `<polygon points="134,78 154,100 134,124 114,100" fill="#fff"/><polygon points="134,78 154,100 134,100" fill="#ead6ff"/><polygon points="114,100 134,100 134,124" fill="#d2b2ff"/>`,
      crown: `<polygon points="114,116 110,88 124,100 134,82 144,100 158,88 154,116" fill="#ffcf4a" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`,
      flame: `<path d="M134 74 C146 88 160 96 154 112 C150 124 140 128 134 128 C126 128 116 122 114 110 C112 98 122 94 124 84 C130 92 128 100 134 102 C136 94 132 84 134 74Z" fill="#ffcf4a" stroke="#fff" stroke-width="3"/><path d="M134 104 C140 110 142 116 138 121 C134 124 128 121 129 115 C130 110 134 109 134 104Z" fill="#ff2350"/>`
    }[T.icon];
    return `<g class="tier" data-i="${i}" opacity="0">
<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.a}"/><stop offset="1" stop-color="${T.b}"/></linearGradient></defs>
${wingsL ? `<path d="${wingsL}" fill="${T.a}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="${wingsL}" transform="translate(268 0) scale(-1 1)" fill="${T.a}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>` : ""}
<path d="M134 46 L176 60 V102 C176 132 158 150 134 162 C110 150 92 132 92 102 V60 Z" fill="url(#${g})" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
<path d="M134 58 L165 68 V102 C165 124 152 138 134 148 C116 138 103 124 103 102 V68 Z" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
${ic}
<text x="134" y="186" text-anchor="middle" style="font-family:var(--f-disp);font-size:25px;letter-spacing:1px;paint-order:stroke" stroke="#07050c" stroke-width="7" stroke-linejoin="round" fill="${i === 4 ? "#ffcf4a" : "#f3eee8"}">${T.n}</text></g>`;
  }
  const rankBadgeSVG = i => `<svg viewBox="34 4 200 200" style="width:100%;height:100%;overflow:visible">${badge(TIERS[i], uid("rb"), i).replace('opacity="0"', 'opacity="1"').replace(/<text[^>]*>[^<]*<\/text>/, "")}</svg>`;

  const DEF = [
    { name: "EPIC", img: "assets/ranks/epic.png", glow: "#45f0bf" },
    { name: "LEGEND", img: "assets/ranks/legend.png", glow: "#ffcf4a" },
    { name: "MYTHIC", img: "assets/ranks/mythic.png", glow: "#c995ff" },
    { name: "HONOR", img: "assets/ranks/honor.png", glow: "#7fb2ff" },
    { name: "GLORY", img: "assets/ranks/glory.png", glow: "#ff96d4" },
    { name: "IMMORTAL", img: "assets/ranks/immortal.png", glow: "#ff5874" }
  ];
  const tiers = () => (CFG.ranks && CFG.ranks.tiers) || DEF;
  const DEPTH = 6; // back layers that give the coin its thickness
  const startOf = i => .3 + i * .45;          // fast pace: a new rank every 0.45 s
  const FB = { EPIC: 0, LEGEND: 1, MYTHIC: 2, HONOR: 3, GLORY: 4, IMMORTAL: 5 }; // stand-in badge per tier

  function html() {
    const T = tiers();
    return `<div class="rk3d">
<div class="rk-rays"></div><div class="rk-ring"></div><div class="rk-ring r2"></div>
${T.map((t, i) => `<div class="rk-tier" data-i="${i}" style="--g:${t.glow}">
 <div class="rk-glow"></div><div class="rk-shadow"></div>
 <div class="rk-card">${Array.from({ length: DEPTH + 1 }, (_, k) =>
      `<div class="rk-l${k === DEPTH ? " front" : ""}" style="transform:translateZ(${(k - DEPTH) * 1.6}px)"><img alt="" src="${(O.assetBase || "") + t.img}" data-i="${i}"></div>`).join("")}
  <div class="rk-shine"></div></div>
</div>`).join("")}
<i class="rk-spk"></i><i class="rk-spk"></i><i class="rk-spk"></i>
</div>`;
  }

  // swap missing PNGs for the drawn badge (same 3D rig)
  function hydrate(root) {
    if (root.dataset.ready) return; root.dataset.ready = "1";
    root.querySelectorAll(".rk-tier").forEach(tier => {
      const i = +tier.dataset.i, imgs = [...tier.querySelectorAll("img")];
      const fallback = () => {
        if (tier.dataset.fb) return; tier.dataset.fb = "1";
        const nm = (tiers()[i] || {}).name, svg = rankBadgeSVG(FB[nm] != null ? FB[nm] : Math.min(i, TIERS.length - 1));
        tier.querySelectorAll(".rk-l").forEach(l => { l.innerHTML = svg; });
      };
      imgs[0].addEventListener("error", fallback);
      if (imgs[0].complete && !imgs[0].naturalWidth) fallback();
      // shine only over the icon: mask it with the icon itself
      const shine = tier.querySelector(".rk-shine"), src = imgs[0].getAttribute("src");
      const lit = () => { shine.style.webkitMaskImage = shine.style.maskImage = `url("${src}")`; shine.style.opacity = "1"; };
      imgs[0].addEventListener("load", lit); if (imgs[0].complete && imgs[0].naturalWidth) lit();
    });
  }

  function anim(root, u, t) {
    if (!root || !root.classList || !root.classList.contains("rk3d")) return;
    hydrate(root);
    const tiersEl = root.querySelectorAll(".rk-tier"), last = tiersEl.length - 1;
    let cur = 0; for (let i = 0; i <= last; i++) if (u >= startOf(i)) cur = i;
    const curT = tiers()[cur] || {};
    root.style.setProperty("--rg", curT.glow || "#ff5874");
    tiersEl.forEach((el, i) => {
      if (i !== cur) { if (el.style.display !== "none") el.style.display = "none"; return; }
      el.style.display = "block";
      const st = startOf(i), p = seg(u, st, st + .36);
      const flip = (1 - eOut(p)) * -110;                       // flips in on Y
      const swing = Math.sin((t + i) * TAU / 3.2) * (i === last ? 16 : 10) * eOut(p);
      const tilt = Math.sin((t + i) * TAU / 4.1) * 5;
      const fl = Math.sin(t * TAU / 2.2) * 4;
      const sc = (.55 + .45 * eBack(p)) * (i === last ? 1 + .03 * Math.sin(t * TAU / 1.2) : 1);
      el.querySelector(".rk-card").style.transform =
        `translate(-50%, calc(-50% + ${fl.toFixed(2)}px)) rotateX(${tilt.toFixed(2)}deg) rotateY(${(flip + swing).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      const sh = el.querySelector(".rk-shadow");
      sh.style.transform = `translateX(-50%) scale(${(1 - fl / 40).toFixed(3)}, 1)`;
      sh.style.opacity = (.75 * eOut(p) - fl / 30).toFixed(3);
      const g = el.querySelector(".rk-glow");
      const burst = 1 - seg(u, st + .1, st + .7);
      g.style.opacity = (.55 + .2 * Math.sin(t * TAU / 1.5) + burst * .45).toFixed(3);
      g.style.transform = `translate(-50%, -50%) scale(${(1 + burst * .5).toFixed(3)})`;
      const sp = frac((u - st) / 1.6);
      el.querySelector(".rk-shine").style.backgroundPosition = `${(160 - seg(sp, .15, .5) * 220).toFixed(1)}% 0`;
    });
    const rays = root.querySelector(".rk-rays");
    rays.style.opacity = ((cur === last ? .62 : .32) + .14 * Math.sin(t * TAU / 2)).toFixed(3);
    root.querySelectorAll(".rk-ring").forEach((r, i) => {
      const p = frac((u - startOf(cur)) / 1.2 + i * .5), on = u >= startOf(0);
      r.style.transform = `translate(-50%, -50%) scale(${(.55 + p * .75).toFixed(3)})`;
      r.style.opacity = on ? ((1 - p) * .9).toFixed(3) : "0";
    });
    rays.style.transform = `translate(-50%, -50%) rotate(${(t * 20).toFixed(1)}deg)`;
    root.querySelectorAll(".rk-spk").forEach((s, i) => {
      const p = frac(t / 1.3 + i / 3), sc = cur === last ? Math.sin(p * Math.PI) : 0;
      const pos = [[18, 22], [80, 18], [84, 76]][i];
      s.style.left = pos[0] + "%"; s.style.top = pos[1] + "%";
      s.style.transform = `translate(-50%, -50%) rotate(${(p * 90).toFixed(1)}deg) scale(${sc.toFixed(3)})`;
    });
  }

  O.ranks = { html, anim, svg: html };
  O.ranks3d = true;
})();
