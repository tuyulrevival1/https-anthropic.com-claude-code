/* 3D rank sequence for the joki message.
   Uses the real MLBB rank icons you drop into assets/ranks/ (transparent PNG):
     epic.png  legend.png  mythic.png  glory.png  immortal.png
   Each icon is stacked into a thick 3D coin (darkened back layers), flips in on the
   Y axis, swings slowly, floats over a soft floor shadow, with a tier-coloured glow
   and a specular sweep. Missing files fall back to the drawn badges. */
(function () {
  "use strict";
  const O = window.ChouOverlay, CFG = O.CFG;
  const { seg, eOut, eBack, frac, TAU } = O.util;
  const DEF = [
    { name: "EPIC", img: "assets/ranks/epic.png", glow: "#45f0bf" },
    { name: "LEGEND", img: "assets/ranks/legend.png", glow: "#ffcf4a" },
    { name: "MYTHIC", img: "assets/ranks/mythic.png", glow: "#c995ff" },
    { name: "GLORY", img: "assets/ranks/glory.png", glow: "#ff96d4" },
    { name: "IMMORTAL", img: "assets/ranks/immortal.png", glow: "#ff5874" }
  ];
  const tiers = () => (CFG.ranks && CFG.ranks.tiers) || DEF;
  const DEPTH = 6; // back layers that give the coin its thickness
  const START = [.3, .9, 1.5, 2.1, 2.7];

  function html() {
    const T = tiers();
    return `<div class="rk3d">
<div class="rk-rays"></div>
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
        const svg = O.rankBadgeSVG ? O.rankBadgeSVG(i) : "";
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
    let cur = 0; for (let i = 0; i <= last; i++) if (u >= (START[i] ?? START[START.length - 1] + i)) cur = i;
    tiersEl.forEach((el, i) => {
      if (i !== cur) { if (el.style.visibility !== "hidden") el.style.visibility = "hidden"; return; }
      el.style.visibility = "visible";
      const st = START[i], p = seg(u, st, st + .42);
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
    rays.style.opacity = cur === last ? (.5 + .2 * Math.sin(t * TAU / 2)).toFixed(3) : "0";
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
