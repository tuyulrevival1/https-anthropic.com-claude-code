/* "power" banner (1080x192, red theme).
   Left: 3D mascot carousel + animated SYNOSTORE wordmark (watermark).
   Centre: crimson slash plate with metallic kinetic headline, kicker, price chips
   and a bouncy glossy hook chip. Right: chrome/red 3D medallion that flips between
   premium icons (diamond, 3D rank, VIP crest, album, link). Loops every 24 s. */
(function () {
  "use strict";
  const O = window.ChouOverlay, CFG = O.CFG;
  const { el, esc, seg, eOut, eBack, frac, rnd, TAU, fill, uid, tickers, now } = O.util;
  const ease2 = x => x * x * (3 - 2 * x);
  const priceGold = s => esc(s).replace(/(RM\s?\d+)/g, "<b>$1</b>");

  const CSS = `
.bn-power { --pw-red: #ff1f3d; --pw-deep: #8a0019; --pw-ink: #0a0205; --pw-bone: #f6efe9; --pw-gold: #ffcf4a; font-family: var(--f-clean); }
.bn-power .pw-bg { inset: 0; background:
  radial-gradient(38% 140% at 9% 60%, rgba(255,31,61,.42), transparent 70%),
  radial-gradient(30% 140% at 90% 50%, rgba(255,31,61,.30), transparent 70%),
  linear-gradient(180deg, #16040a 0%, #0a0205 100%); }
.bn-power .pw-fx { left: 0; top: 0; width: 1080px; height: 192px; }
.bn-power .pw-plate { left: 282px; top: -2px; width: 600px; height: 196px; transform: skewX(-14deg); overflow: hidden;
  background: linear-gradient(180deg, #ff3653 0%, #e5102f 46%, #a3001f 100%);
  box-shadow: 0 0 0 1px rgba(0,0,0,.6), 0 0 30px rgba(255,31,61,.45); }
.bn-power .pw-plate i { position: absolute; inset: 0; }
.bn-power .pw-ht { background: radial-gradient(circle at 1px 1px, rgba(40,0,8,.32) 1.3px, transparent 1.7px) 0 0 / 8px 8px;
  -webkit-mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,.15) 45%, rgba(0,0,0,.15) 70%, #000 100%); mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,.15) 45%, rgba(0,0,0,.15) 70%, #000 100%); }
.bn-power .pw-top { background: linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0) 22%), linear-gradient(0deg, rgba(0,0,0,.35), rgba(0,0,0,0) 30%); }
.bn-power .pw-glint { width: 90px !important; left: 0; right: auto !important; background: linear-gradient(90deg, transparent, rgba(255,255,255,.28) 50%, transparent); }
.bn-power .pw-sep { top: -4px; width: 7px; height: 200px; background: linear-gradient(180deg, #fff, #f6efe9 60%, rgba(246,239,233,.4)); transform: skewX(-14deg); box-shadow: 0 0 12px rgba(255,255,255,.4); }
.bn-power .pw-sep.l { left: 270px; } .bn-power .pw-sep.r { left: 884px; }
.bn-power .pw-sep.l2 { left: 258px; width: 3px; opacity: .55; } .bn-power .pw-sep.r2 { left: 898px; width: 3px; opacity: .55; }
.bn-power .pw-panel { left: 0; top: 0; width: 300px; height: 192px; overflow: hidden; clip-path: polygon(0 0, 274px 0, 226px 100%, 0 100%); }
.bn-power .pw-rays { position: absolute; left: -150px; top: -170px; width: 520px; height: 520px; border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, rgba(255,198,92,.30) 0deg 9deg, rgba(255,31,61,.05) 9deg 30deg);
  -webkit-mask-image: radial-gradient(circle, #000 0%, rgba(0,0,0,.85) 22%, transparent 62%); mask-image: radial-gradient(circle, #000 0%, rgba(0,0,0,.85) 22%, transparent 62%); }
.bn-power .pw-pglow { position: absolute; inset: 0; background:
  radial-gradient(46% 70% at 40% 46%, rgba(255,64,92,.75) 0%, rgba(200,0,30,.35) 45%, rgba(40,0,8,0) 75%),
  linear-gradient(90deg, rgba(10,2,5,0) 60%, rgba(10,2,5,.55) 100%); }
.bn-power .pw-pring { position: absolute; left: 110px; top: 92px; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; border: 3px solid #ffd34d; box-shadow: 0 0 14px #ffd34d; opacity: 0; }
.bn-power .pw-mascot { left: -6px; top: -4px; width: 210px; height: 210px; }
.bn-power .pw-mascot .pw-ml { position: absolute; inset: 0; transform-origin: 50% 92%; }
.bn-power .pw-mascot .pw-ml svg { filter: drop-shadow(0 0 8px rgba(255,31,61,.45)); }
.bn-power .pw-mascot svg, .bn-power .pw-word svg, .bn-power .pw-art svg { width: 100%; height: 100%; overflow: visible; display: block; }
.bn-power .pw-word { left: 150px; top: 82px; width: 148px; height: 107px; transform-origin: 50% 60%; }
.bn-power .pw-msg { left: 320px; top: 0; width: 500px; height: 192px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; visibility: hidden; }
.bn-power .pw-kick { display: inline-flex; align-items: center; gap: 9px; background: var(--pw-ink); color: var(--pw-bone); padding: 6px 14px 5px; transform: skewX(-12deg);
  font: 700 15px/1 var(--f-hud); letter-spacing: .32em; text-transform: uppercase; box-shadow: 0 3px 8px rgba(0,0,0,.35); }
.bn-power .pw-kick > * { transform: skewX(12deg); }
.bn-power .pw-kick i { width: 8px; height: 8px; background: var(--pw-gold); transform: rotate(45deg); box-shadow: 0 0 8px var(--pw-gold); }
.bn-power .pw-main { white-space: nowrap; font: 400 64px/1.02 var(--f-disp); letter-spacing: .012em; text-transform: uppercase; transform: skewX(-8deg);
  filter: drop-shadow(0 2px 0 #7a0016) drop-shadow(0 2px 0 #55000f) drop-shadow(0 2px 0 #3a0009) drop-shadow(0 9px 10px rgba(0,0,0,.45)); }
.bn-power .pw-main .ch { display: inline-block; color: transparent; -webkit-background-clip: text; background-clip: text;
  background-image: linear-gradient(100deg, rgba(255,214,120,0) 42%, rgba(255,226,150,.95) 50%, rgba(255,214,120,0) 58%), linear-gradient(180deg, #ffffff 0%, #fff4f5 44%, #ffd0d7 54%, #ffffff 100%);
  background-size: 500% 100%, 100% 100%; background-repeat: no-repeat; transform-origin: 50% 85%; }
.bn-power .pw-main .sp { display: inline-block; width: .24em; }
.bn-power .pw-tags { display: flex; gap: 8px; }
.bn-power .pw-tag { display: inline-flex; align-items: center; padding: 6px 13px 5px; transform: skewX(-12deg); white-space: nowrap;
  background: linear-gradient(180deg, #2a060d 0%, #0b0205 100%); border: 1.5px solid rgba(255,255,255,.32);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 4px 10px rgba(0,0,0,.4); color: var(--pw-bone); font: 800 17px/1 var(--f-clean); letter-spacing: .04em; }
.bn-power .pw-tag > span { display: inline-block; transform: skewX(12deg); }
.bn-power .pw-tag b { font-weight: 900; color: var(--pw-gold); text-shadow: 0 0 10px rgba(255,207,74,.45); }
.bn-power .pw-hook { left: 748px; top: 10px; visibility: hidden; transform-origin: 50% 100%; }
.bn-power .pw-hook span { position: relative; display: inline-block; padding: 5px 15px 3px; border-radius: 11px; font: 400 31px/1 var(--f-disp); letter-spacing: .02em; color: #4a0010;
  background: linear-gradient(180deg, #fff6cf 0%, #ffd84f 44%, #ffb300 56%, #e58c00 100%); text-shadow: 0 1px 0 rgba(255,255,255,.65);
  box-shadow: 0 0 0 3px #1a0206, 0 0 0 5px rgba(255,207,74,.55), 0 8px 14px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.85); }
.bn-power .pw-hook span::after { content: ""; position: absolute; left: 6px; right: 6px; top: 3px; height: 40%; border-radius: 8px; background: linear-gradient(180deg, rgba(255,255,255,.6), rgba(255,255,255,0)); }
.bn-power .pw-med { left: 888px; top: 12px; width: 168px; height: 168px; perspective: 600px; }
.bn-power .pw-glow { position: absolute; inset: -10px; border-radius: 50%; background: radial-gradient(circle, rgba(255,31,61,.55) 0%, rgba(255,31,61,0) 70%); }
.bn-power .pw-ring { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from 0deg, #ffe1e6, #ff2346, #5a0010, #ff6b80, #ffffff, #8a0019, #ff2346, #ffd2d9, #ffe1e6);
  -webkit-mask-image: radial-gradient(farthest-side, transparent calc(100% - 12px), #000 calc(100% - 11px)); mask-image: radial-gradient(farthest-side, transparent calc(100% - 12px), #000 calc(100% - 11px));
  box-shadow: 0 0 0 1px rgba(0,0,0,.5); }
.bn-power .pw-ring2 { position: absolute; inset: 14px; border-radius: 50%; border: 2px dashed rgba(255,207,74,.55); }
.bn-power .pw-medin { position: absolute; inset: 12px; border-radius: 50%; transform-style: preserve-3d; }
.bn-power .pw-glass { position: absolute; inset: 0; border-radius: 50%; overflow: hidden;
  background: radial-gradient(circle at 50% 32%, #55081a 0%, #22030b 58%, #0b0104 100%); box-shadow: inset 0 0 0 2px rgba(0,0,0,.6), inset 0 -10px 22px rgba(255,31,61,.35); }
.bn-power .pw-glass::after { content: ""; position: absolute; left: 14%; right: 14%; top: 5%; height: 38%; border-radius: 50%; background: linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0)); }
.bn-power .pw-art { position: absolute; inset: 6px; display: none; }
.bn-power .pw-art .rk3d { inset: -4px; }
.bn-power .pw-flare { position: absolute; inset: -30px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(255,214,120,.6) 18%, rgba(255,31,61,0) 60%); opacity: 0; mix-blend-mode: screen; }
.bn-power .pw-blade { top: -20px; left: 0; width: 70px; height: 232px; background: linear-gradient(90deg, rgba(255,255,255,0), #fff 40%, #ffe4e8 60%, rgba(255,255,255,0)); opacity: 0; mix-blend-mode: screen; }
.bn-power .pw-flash { left: 260px; width: 640px; top: 0; height: 192px; background: #fff; opacity: 0; mix-blend-mode: overlay; }
.bn-power .pw-edge { left: 0; right: 0; height: 3px; overflow: hidden; background: linear-gradient(90deg, #5a0010, #ff1f3d 30%, #ff1f3d 70%, #5a0010); }
.bn-power .pw-edge.top { top: 0; } .bn-power .pw-edge.bot { bottom: 0; height: 2px; opacity: .7; }
.bn-power .pw-edge i { position: absolute; top: -2px; width: 240px; height: 7px; background: linear-gradient(90deg, transparent, #fff, transparent); box-shadow: 0 0 12px #fff; }
.bn-power .pw-dots { left: 548px; bottom: 9px; display: flex; gap: 7px; }
.bn-power .pw-dots i { width: 8px; height: 8px; transform: rotate(45deg); background: rgba(10,2,5,.45); }
.bn-power .pw-dots i.on { background: var(--pw-gold); box-shadow: 0 0 8px var(--pw-gold); }
`;
  function injectCSS() {
    if (document.getElementById("pw-css")) return;
    const st = document.createElement("style"); st.id = "pw-css"; st.textContent = CSS; document.head.appendChild(st);
  }

  /* ---------- wordmark: SYNO / STORE ---------- */
  function wordSVG() {
    const u = uid("pw");
    const n = String(CFG.storeName || "").toUpperCase(), i = n.lastIndexOf("STORE");
    const l1 = esc(i > 0 ? n.slice(0, i) : n), l2 = i > 0 ? "STORE" : "";
    const T = (x, y, extra) => `<text x="${x}" y="${y}" text-anchor="middle" style="font-family:var(--f-disp);font-size:60px;letter-spacing:1px" ${extra}>${l1}</text>`;
    return `<svg viewBox="0 0 150 108" aria-hidden="true"><defs>
<linearGradient id="${u}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".46" stop-color="#ffeef1"/><stop offset=".56" stop-color="#ffb7c3"/><stop offset="1" stop-color="#ff3a55"/></linearGradient>
<filter id="${u}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
<clipPath id="${u}c">${T(75, 60, "")}</clipPath></defs>
<g class="w-all">
<ellipse class="w-glow" cx="75" cy="48" rx="62" ry="34" fill="#ff1f3d" filter="url(#${u}b)" opacity=".55"/>
${[5, 4, 3, 2, 1].map(k => T(75 + k * .9, 60 + k, `fill="${k > 3 ? "#2a0006" : "#6a0012"}"`)).join("")}
${T(75, 60, `class="w-r" fill="#ff1f3d" opacity="0"`)}${T(75, 60, `class="w-c" fill="#5ff0ff" opacity="0"`)}
${T(75, 60, `class="w-f" fill="url(#${u}m)" stroke="#2a0006" stroke-width="1.2" style="paint-order:stroke;font-family:var(--f-disp);font-size:60px;letter-spacing:1px"`)}
<rect class="w-sh" x="-60" y="0" width="22" height="80" fill="#fff" opacity=".75" transform="skewX(-20)" clip-path="url(#${u}c)"/>
${l2 ? `<g transform="translate(75 82) skewX(-12)"><rect x="-56" y="-12" width="112" height="24" fill="#0a0205" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/><rect x="-56" y="-12" width="6" height="24" fill="#ff1f3d"/>
<text x="4" y="7" text-anchor="middle" style="font-family:var(--f-hud);font-weight:700;font-size:17px;letter-spacing:7px" fill="#f6efe9">${l2}</text></g>` : ""}
</g></svg>`;
  }
  function animWord(svg, t) {
    const q = c => svg.querySelector(c);
    const sp = frac(t / 12), slam = sp < .05 ? 1 - eBack(sp / .05) : 0;
    const pulse = 1 + .02 * Math.sin(t * TAU / 3);
    q(".w-all").setAttribute("transform", `translate(75 60) scale(${(pulse + slam * .35).toFixed(3)}) translate(-75 -60)`);
    q(".w-glow").setAttribute("opacity", (.45 + .25 * Math.sin(t * TAU / 3) + Math.abs(slam) * .4).toFixed(3));
    q(".w-sh").setAttribute("x", (-60 + seg(frac(t / 3), .1, .45) * 230).toFixed(1));
    const gp = frac(t / 6), gl = gp > .62 && gp < .66;
    q(".w-r").setAttribute("opacity", gl ? ".9" : "0"); q(".w-r").setAttribute("transform", gl ? "translate(-4 0)" : "");
    q(".w-c").setAttribute("opacity", gl ? ".7" : "0"); q(".w-c").setAttribute("transform", gl ? "translate(4 1)" : "");
    q(".w-f").setAttribute("transform", gl ? "translate(1.5 0)" : "");
  }

  /* ---------- premium medallion icons (viewBox 0 0 200 200) ---------- */
  function iconSVG(kind) {
    const u = uid("pi");
    const spk = c => `<g class="spk"><path d="M0 -12 L2.6 -2.6 L12 0 L2.6 2.6 L0 12 L-2.6 2.6 L-12 0 L-2.6 -2.6Z" fill="${c}"/></g>`;
    if (kind === "diamond") {
      const f = (pts, a, b) => `<polygon points="${pts}" fill="url(#${u}${a})" stroke="rgba(255,255,255,.55)" stroke-width="1"/>` + (b ? "" : "");
      return `<svg viewBox="0 0 200 200" data-k="diamond"><defs>
${[["a", "#e9fdff", "#9eeaff"], ["b", "#ffffff", "#c9f5ff"], ["c", "#c6f3ff", "#66d2ff"], ["d", "#8fe2ff", "#2fa4f0"],
   ["e", "#5cc8ff", "#1569cf"], ["f", "#9ae6ff", "#2a8fe6"], ["g", "#46b6ff", "#0d4fae"], ["h", "#2a86e0", "#082f7a"]]
  .map(([id, s1, s2]) => `<linearGradient id="${u}${id}" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient>`).join("")}
<radialGradient id="${u}r"><stop offset="0" stop-color="#9eeaff" stop-opacity=".7"/><stop offset="1" stop-color="#9eeaff" stop-opacity="0"/></radialGradient>
<clipPath id="${u}k"><polygon points="40,86 72,58 128,58 160,86 100,166"/></clipPath></defs>
<g class="rays" opacity=".35">${Array.from({ length: 10 }, (_, i) => { const a = i / 10 * TAU; return `<polygon points="100,100 ${100 + 120 * Math.cos(a - .06)},${100 + 120 * Math.sin(a - .06)} ${100 + 120 * Math.cos(a + .06)},${100 + 120 * Math.sin(a + .06)}" fill="#c9f5ff"/>`; }).join("")}</g>
<circle cx="100" cy="104" r="70" fill="url(#${u}r)"/>
<g class="gem">
${f("40,86 72,58 70,86", "a")}${f("72,58 100,58 100,86 70,86", "b")}${f("100,58 128,58 130,86 100,86", "c")}${f("128,58 160,86 130,86", "d")}
${f("40,86 70,86 100,166", "f")}${f("70,86 100,86 100,166", "e")}${f("100,86 130,86 100,166", "g")}${f("130,86 160,86 100,166", "h")}
<polygon points="40,86 72,58 128,58 160,86 100,166" fill="none" stroke="#f2feff" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M44 86 H156" stroke="#fff" stroke-width="1.4" opacity=".8"/>
<g clip-path="url(#${u}k)"><rect class="shine" x="-40" y="40" width="22" height="140" fill="#fff" opacity=".85" transform="skewX(-22)"/></g>
</g>${spk("#fff")}${spk("#bff3ff")}${spk("#fff")}${spk("#ffe9a6")}</svg>`;
    }
    if (kind === "mabar") {
      return `<svg viewBox="0 0 200 200" data-k="mabar"><defs>
<linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".42" stop-color="#ffd24a"/><stop offset=".55" stop-color="#d48a00"/><stop offset="1" stop-color="#ffcc3d"/></linearGradient>
<linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4b66"/><stop offset="1" stop-color="#6a0012"/></linearGradient>
<clipPath id="${u}k"><path d="M100 60 L150 76 V112 C150 142 128 160 100 172 C72 160 50 142 50 112 V76 Z"/></clipPath></defs>
<path d="M100 54 L156 72 V112 C156 146 132 166 100 178 C68 166 44 146 44 112 V72 Z" fill="url(#${u}g)" stroke="#3a0008" stroke-width="2"/>
<path d="M100 60 L150 76 V112 C150 142 128 160 100 172 C72 160 50 142 50 112 V76 Z" fill="url(#${u}r)"/>
<text x="102" y="134" text-anchor="middle" style="font-family:var(--f-disp);font-size:44px;letter-spacing:1px" fill="#3a0008">VIP</text>
<text x="100" y="131" text-anchor="middle" style="font-family:var(--f-disp);font-size:44px;letter-spacing:1px" fill="url(#${u}g)">VIP</text>
<g clip-path="url(#${u}k)"><rect class="shine" x="-40" y="40" width="24" height="150" fill="#fff" opacity=".35" transform="skewX(-22)"/></g>
<g class="crown"><path d="M64 58 L58 22 L80 40 L100 14 L120 40 L142 22 L136 58 Z" fill="url(#${u}g)" stroke="#3a0008" stroke-width="2.2" stroke-linejoin="round"/>
<circle cx="100" cy="40" r="5" fill="#ff1f3d" stroke="#fff" stroke-width="1"/><circle cx="76" cy="48" r="3.4" fill="#ff1f3d"/><circle cx="124" cy="48" r="3.4" fill="#ff1f3d"/></g>
${spk("#fff")}${spk("#ffe9a6")}${spk("#fff")}${spk("#ffe9a6")}</svg>`;
    }
    if (kind === "album") {
      return `<svg viewBox="0 0 200 200" data-k="album"><defs>
<linearGradient id="${u}p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a73"/><stop offset="1" stop-color="#5a0010"/></linearGradient>
<linearGradient id="${u}q" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd24a"/><stop offset="1" stop-color="#b3001f"/></linearGradient>
<linearGradient id="${u}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9d2d6"/></linearGradient>
<linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a73"/><stop offset="1" stop-color="#b3001f"/></linearGradient></defs>
<g class="ph2"><rect x="-40" y="-32" width="80" height="66" rx="6" fill="url(#${u}f)"/><rect x="-33" y="-25" width="66" height="44" rx="2" fill="url(#${u}q)"/><path d="M-33 19 L-10 -4 L4 9 L14 0 L33 19Z" fill="#3a0008" opacity=".6"/></g>
<g class="ph1"><rect x="-40" y="-32" width="80" height="66" rx="6" fill="url(#${u}f)"/><rect x="-33" y="-25" width="66" height="44" rx="2" fill="url(#${u}p)"/><path d="M-33 19 L-12 -2 L2 10 L16 -6 L33 19Z" fill="#ffd2d9" opacity=".8"/><circle cx="18" cy="-13" r="6" fill="#ffd24a"/></g>
<g class="bub"><path d="M0 -24 C21 -24 34 -13 34 0 C34 13 21 24 0 24 C-6 24 -11 23 -15 21 L-30 28 L-24 15 C-31 11 -34 6 -34 0 C-34 -13 -21 -24 0 -24Z" fill="url(#${u}b)" stroke="#fff" stroke-width="3"/>
<path d="M-24 -10 C-18 -18 -6 -21 6 -20" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>
<circle class="d0" cx="-12" cy="2" r="4.2" fill="#fff"/><circle class="d1" cx="0" cy="2" r="4.2" fill="#fff"/><circle class="d2" cx="12" cy="2" r="4.2" fill="#fff"/></g>
${spk("#fff")}${spk("#ffe9a6")}</svg>`;
    }
    // link
    return `<svg viewBox="0 0 200 200" data-k="link"><defs>
<linearGradient id="${u}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#c9c3cc"/><stop offset=".55" stop-color="#6b6470"/><stop offset="1" stop-color="#f2edf0"/></linearGradient>
<linearGradient id="${u}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a9b"/><stop offset=".5" stop-color="#ff1f3d"/><stop offset="1" stop-color="#7a0016"/></linearGradient></defs>
<circle class="pl p0" cx="100" cy="100" r="54" fill="none" stroke="#ff1f3d" stroke-width="3"/><circle class="pl p1" cx="100" cy="100" r="54" fill="none" stroke="#ffcf4a" stroke-width="3"/>
<g class="chain" transform="rotate(-45 100 100)" fill="none" stroke-width="13" stroke-linecap="round">
<rect x="52" y="84" width="58" height="32" rx="16" stroke="url(#${u}c)"/><rect x="90" y="84" width="58" height="32" rx="16" stroke="url(#${u}r)"/>
<rect x="56" y="88" width="50" height="6" rx="3" fill="#fff" stroke="none" opacity=".35"/></g>
<g class="tap"><path d="M136 132 l30 12 -12 5 10 15 -7 5 -10 -15 -8 10z" fill="#fff" stroke="#0a0205" stroke-width="3" stroke-linejoin="round"/></g>
${spk("#fff")}${spk("#ffe9a6")}</svg>`;
  }
  function animIcon(svg, kind, t, u) {
    if (!svg) return;
    if (kind === "rank") { O.ranks.anim(svg, u, t); return; }
    const q = c => svg.querySelector(c);
    const spks = svg.querySelectorAll(".spk");
    const SP = [[44, 50], [160, 44], [164, 150], [40, 150]];
    spks.forEach((g, i) => { const p = frac(t / 1.5 + i / spks.length), sc = Math.sin(p * Math.PI) * .9;
      g.setAttribute("transform", `translate(${SP[i][0]} ${SP[i][1]}) rotate(${(p * 90).toFixed(1)}) scale(${sc.toFixed(3)})`); });
    if (kind === "diamond") {
      q(".rays").setAttribute("transform", `rotate(${(t * 15).toFixed(1)} 100 100)`);
      const bob = Math.sin(t * TAU / 3) * 4, sx = .9 + .1 * Math.cos(t * TAU / 3);
      q(".gem").setAttribute("transform", `translate(100 ${(108 + bob).toFixed(2)}) scale(${sx.toFixed(3)} 1) translate(-100 -108)`);
      q(".shine").setAttribute("x", (-40 + seg(frac(t / 2), .1, .45) * 220).toFixed(1));
    } else if (kind === "mabar") {
      q(".crown").setAttribute("transform", `translate(0 ${(-Math.abs(Math.sin(t * TAU / 1.5)) * 5).toFixed(2)})`);
      q(".shine").setAttribute("x", (-40 + seg(frac(t / 3), .1, .45) * 230).toFixed(1));
    } else if (kind === "album") {
      const sw = Math.sin(t * TAU / 3);
      q(".ph2").setAttribute("transform", `translate(${(118 + sw * 3).toFixed(1)} 110) rotate(${(12 + sw * 3).toFixed(1)})`);
      q(".ph1").setAttribute("transform", `translate(${(84 - sw * 3).toFixed(1)} 104) rotate(${(-10 - sw * 3).toFixed(1)})`);
      q(".bub").setAttribute("transform", `translate(140 ${(56 - Math.abs(Math.sin(t * TAU / 1.5)) * 6).toFixed(1)})`);
      [0, 1, 2].forEach(i => q(".d" + i).setAttribute("opacity", (.35 + .65 * Math.max(0, Math.sin((t * 2 - i * .25) * Math.PI))).toFixed(3)));
    } else if (kind === "link") {
      svg.querySelectorAll(".pl").forEach((c, i) => { const p = frac(t / 2 + i * .5); c.setAttribute("r", (54 + p * 34).toFixed(1)); c.setAttribute("opacity", (1 - p).toFixed(3)); });
      q(".chain").setAttribute("transform", `rotate(${(-45 + Math.sin(t * TAU / 3) * 6).toFixed(1)} 100 100)`);
      const tp = frac(t / 1.5), pr = tp < .2 ? Math.sin(tp / .2 * Math.PI) : 0;
      q(".tap").setAttribute("transform", `translate(${(-pr * 7).toFixed(1)} ${(-pr * 5).toFixed(1)})`);
    }
  }

  /* ---------- banner ---------- */
  function mountPowerBanner(root, opts = {}) {
    O.Store.init(); injectCSS();
    const B = CFG.banner, msgs = B.messages, N = msgs.length, D = B.secondsPerMessage, LOOP = N * D;
    const bn = el("div", "bn bn-power");
    bn.style.top = (opts.y || 0) + "px";
    const letters = s => [...s].map(c => c === " " ? `<span class="sp"> </span>` : `<span class="ch">${esc(c)}</span>`).join("");
    bn.innerHTML = `<div class="pw-bg"></div><canvas class="pw-fx" width="540" height="96"></canvas>
<div class="pw-plate"><i class="pw-ht"></i><i class="pw-top"></i><i class="pw-glint"></i></div>
<div class="pw-sep l2"></div><div class="pw-sep l"></div><div class="pw-sep r"></div><div class="pw-sep r2"></div>
${msgs.map(m => `<div class="pw-msg"><div class="pw-kick"><i></i><span>${esc(fill(m.kicker || ""))}</span></div>
<div class="pw-main">${letters(fill(m.main))}</div>
<div class="pw-tags">${(m.tags || []).map(x => `<span class="pw-tag"><span>${priceGold(fill(x))}</span></span>`).join("")}</div></div>`).join("")}
${msgs.map(m => `<div class="pw-hook"><span>${esc(fill(m.hook || ""))}</span></div>`).join("")}
<div class="pw-med"><div class="pw-glow"></div><div class="pw-ring"></div>
 <div class="pw-medin"><div class="pw-glass"></div>${msgs.map(m => `<div class="pw-art">${m.art === "rank" ? O.ranks.html() : iconSVG(m.art)}</div>`).join("")}</div>
 <div class="pw-ring2"></div><div class="pw-flare"></div></div>
<div class="pw-panel"><div class="pw-rays"></div><div class="pw-pglow"></div><div class="pw-pring"></div></div>
<div class="pw-mascot"><div class="pw-ml a">${O.mascot3d.svg()}</div><div class="pw-ml b">${O.mascot3d.svg()}</div></div>
<div class="pw-word">${wordSVG()}</div>
<div class="pw-blade"></div><div class="pw-flash"></div>
<div class="pw-edge top"><i></i></div><div class="pw-edge bot"></div>
<div class="pw-dots">${msgs.map(() => "<i></i>").join("")}</div>`;
    root.appendChild(bn);

    const q = c => bn.querySelector(c);
    const ctx = q(".pw-fx").getContext("2d");
    const word = q(".pw-word svg");
    const ML = [...bn.querySelectorAll(".pw-ml")], MS = ML.map(l => l.querySelector("svg"));
    const rays = q(".pw-rays"), pring = q(".pw-pring");
    // smooth pose carousel (24 s): tablet tapping with short hype poses, cross-faded
    const PSCHED = [[0, "game"], [4.8, "win"], [7.2, "game"], [12, "wink"], [14.4, "game"], [19.2, "win"], [21.6, "game"]];
    const XF = .24;
    function poseState(tl) {
      let i = 0; for (let k = 0; k < PSCHED.length; k++) if (tl >= PSCHED[k][0]) i = k;
      let best = 1e9, bi = 0;
      for (let k = 0; k <= PSCHED.length; k++) { const b = k === PSCHED.length ? 24 : PSCHED[k][0], d = tl - b; if (Math.abs(d) < Math.abs(best)) { best = d; bi = k % PSCHED.length; } }
      return { cur: PSCHED[i][1], d: best, prev: PSCHED[(bi + PSCHED.length - 1) % PSCHED.length][1], next: PSCHED[bi][1] };
    }
    const M = [...bn.querySelectorAll(".pw-msg")].map((m, i) => ({
      m, k: m.querySelector(".pw-kick"), main: m.querySelector(".pw-main"), ch: [...m.querySelectorAll(".pw-main .ch")],
      tagRow: m.querySelector(".pw-tags"), tags: [...m.querySelectorAll(".pw-tag")], hook: bn.querySelectorAll(".pw-hook")[i],
      art: bn.querySelectorAll(".pw-art")[i], kind: msgs[i].art, hasKick: !!msgs[i].kicker, hasHook: !!msgs[i].hook
    }));
    const medin = q(".pw-medin"), ring = q(".pw-ring"), flare = q(".pw-flare"), glow = q(".pw-glow");
    const blade = q(".pw-blade"), flash = q(".pw-flash"), glint = q(".pw-glint"), edgeI = q(".pw-edge i"), dots = [...bn.querySelectorAll(".pw-dots i")];

    const fit = () => M.forEach(x => {
      let fs = 66; x.main.style.fontSize = fs + "px";
      while (x.main.scrollWidth > 470 && fs > 34) { fs -= 2; x.main.style.fontSize = fs + "px"; }
      let ts = 17; x.tags.forEach(tg => tg.style.fontSize = ts + "px");
      while (x.tagRow.scrollWidth > 480 && ts > 11) { ts -= 1; x.tags.forEach(tg => tg.style.fontSize = ts + "px"); }
    });
    fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

    function fx(t) {
      ctx.clearRect(0, 0, 540, 96);
      const cyc = (n, o) => frac(t * n / LOOP + o);
      // speed lines over the plate
      for (let i = 0; i < 22; i++) {
        const r1 = rnd(i + 3001), r2 = rnd(i + 3101), r3 = rnd(i + 3201);
        const y = 4 + r1 * 88, len = 30 + r2 * 110, x = 470 - cyc(3 + Math.floor(r3 * 5), r1) * 420;
        ctx.fillStyle = i % 3 ? "rgba(60,0,10,.28)" : "rgba(255,255,255,.16)";
        ctx.fillRect(x, y, len, i % 3 ? 1.2 : .8);
      }
      ctx.globalCompositeOperation = "lighter";
      // embers
      for (let i = 0; i < 46; i++) {
        const r1 = rnd(i + 3301), r2 = rnd(i + 3401), r3 = rnd(i + 3501);
        const ph = cyc(4 + Math.floor(r1 * 6), r2);
        const side = i % 3 === 0 ? 440 + r3 * 100 : r3 * 150;
        const x = side + Math.sin(ph * TAU * 2 + i) * 4, y = 100 - ph * 110, a = Math.sin(ph * Math.PI) * .9;
        ctx.fillStyle = i % 4 === 0 ? `rgba(255,214,120,${a})` : `rgba(255,70,95,${a})`;
        ctx.fillRect(x, y, 1.3, 1.3);
      }
      // pulse behind mascot
      const pg = ctx.createRadialGradient(52, 52, 0, 52, 52, 60);
      pg.addColorStop(0, `rgba(255,31,61,${(.18 + .1 * Math.sin(t * TAU / 3)).toFixed(3)})`); pg.addColorStop(1, "rgba(255,31,61,0)");
      ctx.fillStyle = pg; ctx.fillRect(0, 0, 130, 96);
      ctx.globalCompositeOperation = "source-over";
    }

    function frame(t) {
      if (bn.style.display === "none") return;
      const tl = ((t % LOOP) + LOOP) % LOOP, idx = Math.floor(tl / D), u = tl - idx * D;
      fx(t);
      {
        const P = poseState(((t % 24) + 24) % 24);
        if (Math.abs(P.d) < XF) {
          const k = (P.d + XF) / (2 * XF), ko = seg(k, 0, .5), ki = seg(k, .38, 1);
          O.mascot3d.anim(MS[0], t, { pose: P.prev }); O.mascot3d.anim(MS[1], t, { pose: P.next });
          ML[0].style.opacity = (1 - ease2(ko)).toFixed(3); ML[0].style.transform = `scale(${(1 - .08 * ease2(ko)).toFixed(3)}, ${(1 + .04 * ease2(ko)).toFixed(3)})`;
          ML[1].style.opacity = Math.min(1, ki * 2).toFixed(3); ML[1].style.transform = `translateY(${((1 - eOut(ki)) * 10).toFixed(1)}px) scale(${(.86 + .14 * eBack(ki)).toFixed(3)}, ${(.94 + .06 * eBack(ki)).toFixed(3)})`;
          ML[1].style.display = "";
        } else {
          O.mascot3d.anim(MS[0], t, { pose: P.cur });
          ML[0].style.opacity = "1"; ML[0].style.transform = "";
          ML[1].style.display = "none";
        }
        const bk = P.d >= .05 && P.d < .6 ? (P.d - .05) / .55 : -1;
        pring.style.opacity = bk >= 0 ? ((1 - bk) * .9).toFixed(3) : "0";
        if (bk >= 0) { const r = 150 + eOut(bk) * 160; pring.style.width = pring.style.height = r + "px"; pring.style.margin = `${-r / 2}px 0 0 ${-r / 2}px`; }
        rays.style.transform = `rotate(${(t * 15).toFixed(2)}deg) scale(${(1 + (bk >= 0 ? (1 - bk) * .12 : 0)).toFixed(3)})`;
      }
      animWord(word, t);
      M.forEach((x, i) => {
        if (i !== idx) {
          if (x.m.style.visibility !== "hidden") { x.m.style.visibility = "hidden"; x.hook.style.visibility = "hidden"; x.art.style.display = "none"; }
          return;
        }
        x.m.style.visibility = "visible"; x.art.style.display = "block";
        // kicker
        const kp = eOut(seg(u, .1, .4)), ko = ease2(seg(u, D - .45, D - .2));
        x.k.style.opacity = x.hasKick ? Math.min(kp, 1 - ko).toFixed(3) : "0";
        x.k.style.transform = `skewX(-12deg) translateX(${((1 - kp) * -40 - ko * 30).toFixed(1)}px)`;
        // headline letters: slam in, shine wave, zip out
        const n = x.ch.length;
        x.ch.forEach((c, j) => {
          const s0 = .14 + j * .028, p = seg(u, s0, s0 + .34), b = eBack(p);
          const e0 = D - .48 + j * .012, o = eOut(seg(u, e0, e0 + .24));
          const sc = 1.9 - .9 * b;
          const y = (1 - eOut(p)) * -16;
          c.style.transform = `translate(${(-o * 60).toFixed(1)}px, ${y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
          c.style.opacity = Math.min(1, p * 3, 1 - o).toFixed(3);
          const local = frac((u - .9) / 2.4) * (n + 12) - 4 - j;       // shine travels across the word
          c.style.backgroundPosition = `${((2.5 - local) / 4 * 100).toFixed(1)}% 0, 0 0`;
        });
        // tags
        x.tags.forEach((tg, j) => {
          const p = seg(u, .55 + j * .08, .85 + j * .08), o = seg(u, D - .4, D - .15);
          tg.style.opacity = Math.min(p * 3, 1 - o).toFixed(3);
          tg.style.transform = `skewX(-12deg) translateY(${(o * 14).toFixed(1)}px) scale(${(.5 + .5 * eBack(p)).toFixed(3)})`;
        });
        // hook chip: pop, then bounce with squash & stretch
        if (x.hasHook) {
          const hp = seg(u, .7, 1.05), ho = seg(u, D - .4, D - .12);
          x.hook.style.visibility = hp > 0 && ho < 1 ? "visible" : "hidden";
          const ph = frac(t / 1.2), air = 4 * ph * (1 - ph), sq = Math.max(0, 1 - air * 4);
          const sx = (1 + .1 * sq) * (.2 + .8 * eBack(hp)) * (1 - ho), sy = (1 - .1 * sq) * (.2 + .8 * eBack(hp)) * (1 - ho);
          x.hook.style.transform = `translateY(${(-air * 7).toFixed(2)}px) rotate(${(-8 + (1 - eOut(hp)) * -25).toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
        }
        // medallion art
        animIcon(x.art.firstElementChild, x.kind, t, u);
      });
      // medallion flip between messages + flare
      const fin = seg(u, 0, .42), fout = seg(u, D - .3, D);
      const ry = fout > 0 ? ease2(fout) * 90 : (1 - eBack(fin)) * -90;
      medin.style.transform = `rotateY(${ry.toFixed(2)}deg)`;
      ring.style.transform = `rotate(${(t * 45 + (1 - eOut(fin)) * 180).toFixed(1)}deg)`;
      const fl = u < .5 ? Math.sin(seg(u, .05, .5) * Math.PI) : 0;
      flare.style.opacity = fl.toFixed(3);
      glow.style.opacity = (.7 + .3 * Math.sin(t * TAU / 2) + fl * .4).toFixed(3);
      // plate accents
      const bp = seg(u, 0, .38);
      blade.style.opacity = bp > 0 && bp < 1 ? "1" : "0";
      blade.style.transform = `translateX(${(240 + ease2(bp) * 700).toFixed(1)}px) skewX(-14deg)`;
      flash.style.opacity = (u > .06 ? (1 - seg(u, .06, .34)) * .45 : 0).toFixed(3);
      glint.style.transform = `translateX(${(-120 + ease2(seg(frac(t / 3), .25, .7)) * 780).toFixed(1)}px)`;
      edgeI.style.transform = `translateX(${(frac(t / 4) * 1400 - 260).toFixed(1)}px)`;
      dots.forEach((d, i) => d.classList.toggle("on", i === idx));
    }
    tickers.push(frame);
    frame(now());
    const destroy = () => { const i = tickers.indexOf(frame); if (i >= 0) tickers.splice(i, 1); bn.remove(); };
    return { el: bn, frame, LOOP, setStyle() {}, destroy };
  }

  O.mountPowerBanner = mountPowerBanner;
  O.powerIcons = { svg: iconSVG, anim: animIcon };
  O.powerWord = { svg: wordSVG, anim: animWord };
})();
