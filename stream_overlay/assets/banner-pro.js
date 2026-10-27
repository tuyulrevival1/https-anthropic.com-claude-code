/* Premium bottom banner: animated sticker mascot (left), kinetic text plate (centre),
   round badge with animated art (right). Styles: "pro" (Yagami purple), "pro-crimson". */
(function () {
  "use strict";
  const O = window.ChouOverlay, CFG = O.CFG;
  const { el, esc, seg, eOut, eBack, frac, TAU, fill, priceHL, uid, tickers, now, drawFx, artSVG, animArt } = O.util;
  const ease2 = t => t * t * (3 - 2 * t);

  /* ---------- mascot: the streamer as a die-cut sticker, gaming on a tablet ---------- */
  function mascotSVG() {
    const u = uid("ms");
    const skin = "#f2c7a2", skinSh = "#dfa982", hair = "#1c1424", jacket = "#1d1528";
    return `<svg viewBox="-14 -14 228 228" class="pp-mascot-svg" aria-hidden="true">
<defs>
 <filter id="${u}k" x="-15%" y="-15%" width="130%" height="130%">
  <feMorphology in="SourceAlpha" operator="dilate" radius="6" result="w"/>
  <feFlood flood-color="#ffffff"/><feComposite in2="w" operator="in" result="white"/>
  <feMorphology in="SourceAlpha" operator="dilate" radius="8" result="d"/>
  <feFlood flood-color="#07050c"/><feComposite in2="d" operator="in" result="dark"/>
  <feOffset in="dark" dx="3" dy="5" result="sh"/>
  <feMerge><feMergeNode in="sh"/><feMergeNode in="dark"/><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge>
 </filter>
 <radialGradient id="${u}g" cx=".5" cy="1" r=".9"><stop class="glowstop" offset="0" stop-color="#7b2cff" stop-opacity=".75"/><stop offset="1" stop-color="#7b2cff" stop-opacity="0"/></radialGradient>
 <clipPath id="${u}f"><path d="M60 86 C60 60 78 46 100 46 C122 46 140 60 140 86 C140 112 124 130 100 130 C76 130 60 112 60 86Z"/></clipPath>
</defs>
<g class="all">
 <g filter="url(#${u}k)">
  <g class="body">
   <path d="M38 204 C40 168 56 146 82 140 H118 C144 146 160 168 162 204 Z" fill="${jacket}"/>
   <path d="M140 150 C152 162 158 180 160 204 H147 C147 182 145 164 136 151Z" fill="#120d19"/>
   <path d="M90 122 H110 V142 C104 147 96 147 90 142Z" fill="${skinSh}"/>
   <path d="M84 140 H116 L108 178 H92 Z" fill="#f4f1f7"/>
   <path d="M82 140 L96 180" stroke="#ff2350" stroke-width="5" stroke-linecap="round"/>
   <path d="M118 140 L104 180" stroke="#ff2350" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g class="head">
   <path d="M55 94 C48 52 72 26 102 26 C134 26 156 52 147 96 C140 70 124 56 100 56 C78 56 62 70 55 94Z" fill="${hair}"/>
   <path d="M60 86 C60 60 78 46 100 46 C122 46 140 60 140 86 C140 112 124 130 100 130 C76 130 60 112 60 86Z" fill="${skin}"/>
   <path d="M128 104 C122 120 112 127 100 130 C118 129 134 116 139 94 Z" fill="${skinSh}"/>
   <g clip-path="url(#${u}f)"><ellipse class="glowface" cx="100" cy="132" rx="46" ry="30" fill="url(#${u}g)"/></g>
   <ellipse cx="76" cy="110" rx="6.5" ry="3.6" fill="#ff7a8a" opacity=".45"/>
   <ellipse cx="124" cy="110" rx="6.5" ry="3.6" fill="#ff7a8a" opacity=".45"/>
   <g class="eyes">
    <ellipse cx="85" cy="100" rx="6.4" ry="8" fill="#20152b"/><ellipse cx="115" cy="100" rx="6.4" ry="8" fill="#20152b"/>
    <circle cx="87.2" cy="96.6" r="2.3" fill="#fff"/><circle cx="117.2" cy="96.6" r="2.3" fill="#fff"/>
    <circle class="eyeglow" cx="83.4" cy="104" r="1.5" fill="#b98aff"/><circle class="eyeglow" cx="113.4" cy="104" r="1.5" fill="#b98aff"/>
   </g>
   <path d="M76 85 L93 89.5" stroke="${hair}" stroke-width="5" stroke-linecap="round"/>
   <path d="M107 89.5 L124 85" stroke="${hair}" stroke-width="5" stroke-linecap="round"/>
   <path d="M100 104 l-2.4 6 h4.6" stroke="#cf9670" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
   <path class="mouth" d="M94 116 Q100 120 106 116" stroke="#8a3b3b" stroke-width="3" fill="none" stroke-linecap="round"/>
   <ellipse class="mouth-o" cx="100" cy="118" rx="4" ry="0" fill="#5a1f2a"/>
   <path d="M61 79 C61 56 80 39 104 39 C127 39 143 54 143 75 C135 65 125 61 115 61 C117 71 113 81 106 87 C104 77 97 69 88 67 C84 75 77 79 69 81 C68 75 65 73 61 79Z" fill="${hair}"/>
   <path d="M83 47 C95 42.5 112 43.5 124 50" stroke="#6a4c95" stroke-width="3.4" fill="none" stroke-linecap="round"/>
   <path d="M57 92 C53 10 147 10 143 92" fill="none" stroke="#0f0c15" stroke-width="9" stroke-linecap="round"/>
   <rect x="44" y="77" width="23" height="37" rx="10" fill="#15111c"/><rect x="48.5" y="83" width="7" height="25" rx="3.5" fill="#ff2350"/>
   <rect x="133" y="77" width="23" height="37" rx="10" fill="#15111c"/><rect x="144.5" y="83" width="7" height="25" rx="3.5" fill="#ff2350"/>
  </g>
  <g class="arms">
   <path d="M52 158 C40 170 44 180 60 172" stroke="${jacket}" stroke-width="21" fill="none" stroke-linecap="round"/>
   <path d="M148 158 C160 170 156 180 140 172" stroke="${jacket}" stroke-width="21" fill="none" stroke-linecap="round"/>
  </g>
  <g class="tab">
   <rect x="53" y="141" width="94" height="41" rx="8" fill="#16121f" stroke="#2d2440" stroke-width="2"/>
   <path d="M124 141 L111 182" stroke="#ff2350" stroke-width="4"/>
   <circle cx="65" cy="150" r="3" fill="#2d2440"/><circle cx="73" cy="150" r="2.2" fill="#2d2440"/>
   <path class="tablogo" d="M100 154 a8 8 0 1 0 6 13 a6 6 0 1 1 -6 -13Z" fill="#b98aff"/>
   <g class="hl"><circle cx="56" cy="161" r="10.5" fill="${skin}"/><path d="M61 153 h6 M61 160 h7 M61 167 h6" stroke="${skinSh}" stroke-width="3.4" stroke-linecap="round"/></g>
   <g class="hr"><circle cx="144" cy="161" r="10.5" fill="${skin}"/><path d="M139 153 h-6 M139 160 h-7 M139 167 h-6" stroke="${skinSh}" stroke-width="3.4" stroke-linecap="round"/></g>
  </g>
 </g>
 <g class="tapfx" stroke="#f3eee8" stroke-width="3.5" stroke-linecap="round" fill="none">
  <path class="tl" d="M36 146 l-9 -5 M34 158 l-11 0 M36 170 l-9 5"/>
  <path class="tr" d="M164 146 l9 -5 M166 158 l11 0 M164 170 l9 5"/>
 </g>
 <g class="pop"><path d="M150 18 L170 12 L166 32 L182 38 L162 44 L160 62 L148 46 L132 50 L140 34 L130 22Z" fill="#ffcf4a" stroke="#07050c" stroke-width="3" stroke-linejoin="round"/>
  <text x="155" y="43" text-anchor="middle" style="font-family:var(--f-disp);font-size:22px" fill="#07050c">!</text></g>
 <g class="spk"><path d="M0 -10 L2.2 -2.2 L10 0 L2.2 2.2 L0 10 L-2.2 2.2 L-10 0 L-2.2 -2.2Z" fill="#fff"/></g>
 <g class="spk"><path d="M0 -10 L2.2 -2.2 L10 0 L2.2 2.2 L0 10 L-2.2 2.2 L-10 0 L-2.2 -2.2Z" fill="#ffcf4a"/></g>
</g></svg>`;
  }

  const GLOW_COLS = [[123, 44, 255], [82, 216, 255], [255, 35, 80], [123, 44, 255]];
  function animMascot(svg, t) {
    const q = c => svg.querySelector(c);
    const hop = (() => { const p = frac(t / 12); return p < .06 ? Math.sin(p / .06 * Math.PI) : 0; })();
    const br = 1 + .015 * Math.sin(t * TAU / 3);
    q(".all").setAttribute("transform", `translate(100 204) translate(0 ${(-hop * 10).toFixed(2)}) scale(${(br + hop * .04).toFixed(4)} ${(br - hop * .02).toFixed(4)}) translate(-100 -204)`);
    const nod = Math.sin(t * TAU / 1.5);
    q(".head").setAttribute("transform", `rotate(${(nod * 2.6).toFixed(2)} 100 132) translate(0 ${(Math.abs(nod) * 1.4).toFixed(2)})`);
    const sh = Math.sin(t * TAU * 8) * .7;
    q(".tab").setAttribute("transform", `translate(${sh.toFixed(2)} ${(Math.abs(nod) * 1.2).toFixed(2)})`);
    const tapL = frac(t / .25) < .5, tapR = !tapL;
    q(".hl").setAttribute("transform", `translate(${tapL ? 1.6 : 0} ${tapL ? -1.4 : 0})`);
    q(".hr").setAttribute("transform", `translate(${tapR ? -1.6 : 0} ${tapR ? -1.4 : 0})`);
    // fast tap marks
    const fp = frac(t / .5);
    q(".tl").setAttribute("opacity", fp < .25 ? "1" : "0");
    q(".tr").setAttribute("opacity", fp >= .5 && fp < .75 ? "1" : "0");
    // blink every 3s
    const bp = frac(t / 3), blink = bp > .9 && bp < .96 ? .12 : 1;
    q(".eyes").setAttribute("transform", `translate(0 100) scale(1 ${blink}) translate(0 -100)`);
    // screen light on the face cycles with the "game"
    const cp = frac(t / 4) * 3, ci = Math.floor(cp), cf = ease2(cp - ci);
    const a = GLOW_COLS[ci], b = GLOW_COLS[ci + 1];
    const col = a.map((v, i) => Math.round(v + (b[i] - v) * cf));
    const flick = .6 + .4 * Math.abs(Math.sin(t * TAU * 1.5));
    const stop = q(".glowstop"); stop.setAttribute("stop-color", `rgb(${col})`); stop.setAttribute("stop-opacity", (.55 + .3 * flick).toFixed(3));
    svg.querySelectorAll(".eyeglow").forEach(e => e.setAttribute("fill", `rgb(${col})`));
    q(".tablogo").setAttribute("opacity", (.5 + .5 * flick).toFixed(3));
    // "!" sticker pops every 6s with open mouth
    const pp = frac((t - 4) / 6), pop = pp < .14 ? eBack(seg(pp, 0, .06)) * (1 - seg(pp, .1, .14)) : 0;
    q(".pop").setAttribute("transform", `translate(156 38) scale(${pop.toFixed(3)}) rotate(${(-12 + pop * 12).toFixed(1)}) translate(-156 -38)`);
    q(".mouth").setAttribute("opacity", pop > .05 ? "0" : "1");
    q(".mouth-o").setAttribute("ry", (pop > .05 ? 4.5 : 0).toFixed(1));
    svg.querySelectorAll(".spk").forEach((s, i) => {
      const p = frac(t / 2 + i * .5), sc = Math.sin(p * Math.PI);
      const x = i ? 36 : 166, y = i ? 30 : 96;
      s.setAttribute("transform", `translate(${x} ${y}) rotate(${(p * 120).toFixed(1)}) scale(${(sc * .9).toFixed(3)})`);
    });
  }

  /* ---------- store wordmark under the mascot ---------- */
  function wordmarkSVG() {
    const name = (CFG.logo && CFG.logo.line1) ? CFG.logo : (() => {
      const n = CFG.storeName.toUpperCase(), i = n.lastIndexOf("STORE");
      return i > 0 ? { line1: n.slice(0, i), line2: "STORE" } : { line1: n, line2: "" };
    })();
    const big = `font-family:var(--f-disp);font-size:46px;letter-spacing:1px`;
    return `<svg viewBox="0 0 230 66" aria-hidden="true"><g transform="rotate(-6 115 33)">
<text x="96" y="46" text-anchor="middle" style="${big};paint-order:stroke" stroke="#fff" stroke-width="16" stroke-linejoin="round" fill="#fff">${esc(name.line1)}</text>
<text x="99" y="49" text-anchor="middle" style="${big};paint-order:stroke" stroke="#07050c" stroke-width="9" stroke-linejoin="round" fill="#07050c">${esc(name.line1)}</text>
<text class="wm" x="96" y="46" text-anchor="middle" style="${big};paint-order:stroke" stroke="#07050c" stroke-width="8" stroke-linejoin="round" fill="#f3eee8">${esc(name.line1)}</text>
${name.line2 ? `<g transform="translate(150 22) skewX(-12)"><rect x="-4" y="-4" width="80" height="32" fill="#fff"/><rect x="0" y="0" width="72" height="24" fill="#ff2350"/>
<text x="36" y="20" text-anchor="middle" style="font-family:var(--f-disp);font-size:21px;letter-spacing:2px" fill="#fff">${esc(name.line2)}</text></g>` : ""}
</g></svg>`;
  }

  /* ---------- rank badges for joki ---------- */
  const TIERS = [
    { n: "EPIC", a: "#45f0bf", b: "#0a6b56", w: 0, icon: "chev" },
    { n: "LEGEND", a: "#ffd76a", b: "#b45f00", w: 1, icon: "star" },
    { n: "MYTHIC", a: "#c995ff", b: "#4a149c", w: 2, icon: "gem" },
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
  function rankArtSVG() {
    const u = uid("rk");
    return `<svg viewBox="0 0 268 192" data-kind="ranks" aria-hidden="true">
<circle class="burst" cx="134" cy="104" r="40" fill="none" stroke="#fff" stroke-width="6"/>
${TIERS.map((T, i) => badge(T, u, i)).join("")}
<g class="rspk"><path d="M0 -12 L2.6 -2.6 L12 0 L2.6 2.6 L0 12 L-2.6 2.6 L-12 0 L-2.6 -2.6Z" fill="#ffcf4a"/></g>
<g class="rspk"><path d="M0 -12 L2.6 -2.6 L12 0 L2.6 2.6 L0 12 L-2.6 2.6 L-12 0 L-2.6 -2.6Z" fill="#fff"/></g>
<g class="rspk"><path d="M0 -12 L2.6 -2.6 L12 0 L2.6 2.6 L0 12 L-2.6 2.6 L-12 0 L-2.6 -2.6Z" fill="#fff"/></g></svg>`;
  }
  const T_START = [.3, .85, 1.4, 1.95, 2.5];
  function animRanks(svg, u, t) {
    let cur = 0; for (let i = 0; i < T_START.length; i++) if (u >= T_START[i]) cur = i;
    svg.querySelectorAll(".tier").forEach((g, i) => {
      if (i !== cur) { g.setAttribute("opacity", "0"); return; }
      const p = seg(u, T_START[i], T_START[i] + .24), sx = .1 + .9 * eBack(p);
      const idle = i === 4 ? 1 + .03 * Math.sin(t * TAU / 1.2) : 1;
      g.setAttribute("opacity", "1");
      g.setAttribute("transform", `translate(134 100) scale(${(sx * idle * .86).toFixed(3)} ${((.7 + .3 * eBack(p)) * idle * .86).toFixed(3)}) translate(-134 -100)`);
    });
    const bp = seg(u, T_START[cur], T_START[cur] + (cur === 4 ? .6 : .35));
    const burst = svg.querySelector(".burst");
    burst.setAttribute("r", (40 + eOut(bp) * (cur === 4 ? 80 : 55)).toFixed(1));
    burst.setAttribute("opacity", (bp > 0 && bp < 1 ? 1 - bp : 0).toFixed(3));
    burst.setAttribute("stroke", cur === 4 ? "#ffcf4a" : "#fff");
    svg.querySelectorAll(".rspk").forEach((s, i) => {
      const on = cur === 4, p = frac(t / 1.2 + i / 3), sc = on ? Math.sin(p * Math.PI) : 0;
      const pos = [[64, 44], [206, 52], [200, 150]][i];
      s.setAttribute("transform", `translate(${pos[0]} ${pos[1]}) rotate(${(p * 90).toFixed(1)}) scale(${sc.toFixed(3)})`);
    });
  }

  /* ---------- extra shine for the diamond ---------- */
  function diamondPlus(svg) {
    if (svg.querySelector(".rays")) return;
    const rays = Array.from({ length: 12 }, (_, i) => `<polygon points="134,100 ${134 + 150 * Math.cos(i / 12 * TAU - .07)},${100 + 150 * Math.sin(i / 12 * TAU - .07)} ${134 + 150 * Math.cos(i / 12 * TAU + .07)},${100 + 150 * Math.sin(i / 12 * TAU + .07)}" fill="#bff3ff"/>`).join("");
    svg.insertAdjacentHTML("afterbegin", `<g class="rays" opacity=".18">${rays}</g>`);
    const flare = `<g class="flare"><path d="M0 -26 L3 -3 L26 0 L3 3 L0 26 L-3 3 L-26 0 L-3 -3Z" fill="#fff"/><circle r="5" fill="#fff"/></g>`;
    svg.insertAdjacentHTML("beforeend", flare);
    const drops = Array.from({ length: 5 }, (_, i) => `<g class="drop d${i}"><polygon points="0,-7 6,0 0,9 -6,0" fill="#9eeaff" stroke="#fff" stroke-width="1.5"/></g>`).join("");
    svg.insertAdjacentHTML("beforeend", drops);
  }
  function animDiamondPlus(svg, t) {
    const r = svg.querySelector(".rays"); if (!r) return;
    r.setAttribute("transform", `rotate(${(t * 15).toFixed(2)} 134 100)`);
    const fp = frac(t / 2), fs = fp < .25 ? Math.sin(fp / .25 * Math.PI) : 0;
    svg.querySelector(".flare").setAttribute("transform", `translate(112 66) rotate(${(fp * 90).toFixed(1)}) scale(${(fs * 1.1).toFixed(3)})`);
    svg.querySelectorAll(".drop").forEach((d, i) => {
      const p = frac(t / 1.5 + i / 5), x = 60 + ((i * 37) % 150);
      d.setAttribute("transform", `translate(${x} ${(-10 + p * 210).toFixed(1)}) rotate(${(p * 180).toFixed(1)})`);
      d.setAttribute("opacity", (Math.sin(p * Math.PI) * .9).toFixed(3));
    });
  }

  /* ---------- banner ---------- */
  function mountProBanner(root, opts = {}) {
    O.Store.init();
    let style = opts.style || "pro";
    const B = CFG.banner, msgs = B.messages, N = msgs.length, D = B.secondsPerMessage, LOOP = N * D;
    const bn = el("div", "bn bn-pro bn--" + style);
    bn.style.top = (opts.y || 0) + "px";
    const cid = uid("cv");
    const letters = s => [...s].map(c => c === " " ? `<span class="sp"> </span>` : `<span class="ch">${esc(c)}</span>`).join("");
    bn.innerHTML = `<div class="bn-bg"></div><canvas class="bn-fx" width="1080" height="192"></canvas>
<svg class="pp-chev" viewBox="0 0 300 192" preserveAspectRatio="none" aria-hidden="true">
 <defs><linearGradient id="${cid}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--pp-c1)"/><stop offset="1" style="stop-color:var(--pp-c2)"/></linearGradient>
 <pattern id="${cid}p" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="#000" fill-opacity=".28"/></pattern></defs>
 <polygon points="0,0 246,0 292,96 246,192 0,192" fill="url(#${cid}g)"/>
 <polygon points="0,0 246,0 292,96 246,192 0,192" fill="url(#${cid}p)"/>
 <polygon class="pp-streak" points="0,0 60,0 20,192 -40,192" fill="#fff" opacity=".12"/>
 <polyline points="232,8 270,96 232,184" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round" opacity=".9"/>
</svg>
<div class="pp-plate"><i class="pp-plate-in"></i><i class="pp-glint"></i></div>
<div class="pp-ring"><svg viewBox="0 0 160 160" aria-hidden="true">
 <circle cx="80" cy="80" r="72" class="ring-fill"/>
 <circle cx="80" cy="80" r="72" fill="none" stroke="#f3eee8" stroke-width="5"/>
 <circle class="ring-a" cx="80" cy="80" r="64" fill="none" stroke-width="5" stroke-dasharray="70 32" pathLength="400"/>
 <circle class="ring-b" cx="80" cy="80" r="77" fill="none" stroke-width="3" stroke-dasharray="20 180" pathLength="400"/></svg></div>
${msgs.map(m => `<div class="pp-msg"><div class="pp-kick"><span>${esc(fill(m.kicker))}</span></div>
<div class="pp-main">${letters(fill(m.main))}</div>
<div class="pp-tags">${(m.tags || []).map(x => `<span class="pp-tag"><span>${priceHL(fill(x))}</span></span>`).join("")}</div></div>`).join("")}
${msgs.map(m => `<div class="pp-art">${m.art === "rank" ? O.ranks.html() : artSVG(m.art)}</div>`).join("")}
<div class="pp-mascot">${mascotSVG()}</div>
<div class="pp-word">${wordmarkSVG()}</div>
<div class="bn-blade"></div><div class="bn-flash"></div>
<div class="bn-edge"><i></i></div><div class="bn-edge bottom"></div>
<div class="pp-dots">${msgs.map(() => "<i></i>").join("")}</div>`;
    root.appendChild(bn);

    const ctx = bn.querySelector(".bn-fx").getContext("2d");
    const mascot = bn.querySelector(".pp-mascot-svg");
    const msgEls = [...bn.querySelectorAll(".pp-msg")].map(m => ({
      m, k: m.querySelector(".pp-kick"), main: m.querySelector(".pp-main"),
      ch: [...m.querySelectorAll(".pp-main .ch")], tags: [...m.querySelectorAll(".pp-tag")]
    }));
    const arts = [...bn.querySelectorAll(".pp-art")];
    arts.forEach((a, i) => { if (msgs[i].art === "diamond") diamondPlus(a.firstElementChild); });
    const blade = bn.querySelector(".bn-blade"), flash = bn.querySelector(".bn-flash"), glint = bn.querySelector(".pp-glint");
    const edgeI = bn.querySelector(".bn-edge i"), dots = [...bn.querySelectorAll(".pp-dots i")];
    const ringA = bn.querySelector(".ring-a"), ringB = bn.querySelector(".ring-b"), plate = bn.querySelector(".pp-plate");
    const word = bn.querySelector(".pp-word"), streak = bn.querySelector(".pp-streak");

    const fit = () => msgEls.forEach(p => {
      let fs = 60; p.main.style.fontSize = fs + "px";
      while (p.main.offsetWidth > 520 && fs > 30) { fs -= 2; p.main.style.fontSize = fs + "px"; }
    });
    fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

    function frame(t) {
      if (bn.style.display === "none") return;
      const tl = ((t % LOOP) + LOOP) % LOOP, idx = Math.floor(tl / D), u = tl - idx * D;
      drawFx(ctx, style === "pro-crimson" ? "slash" : "flame", t, LOOP);
      animMascot(mascot, t);
      word.style.transform = `rotate(${(Math.sin(t * TAU / 3) * 1.2).toFixed(2)}deg) translateY(${(Math.sin(t * TAU / 1.5) * 1.5).toFixed(2)}px)`;
      for (let i = 0; i < N; i++) {
        const P = msgEls[i], a = arts[i];
        if (i !== idx) { if (P.m.style.visibility !== "hidden") { P.m.style.visibility = "hidden"; a.style.visibility = "hidden"; } continue; }
        P.m.style.visibility = "visible"; a.style.visibility = "visible";
        // kicker chip slides in
        const kp = eOut(seg(u, .05, .35)), kx = seg(u, D - .45, D - .2);
        P.k.style.transform = `translateX(${((1 - kp) * -60 + kx * -40).toFixed(1)}px)`;
        P.k.style.opacity = Math.min(kp, 1 - kx).toFixed(3);
        // letters: drop in, ripple while holding, fly out
        const n = P.ch.length;
        const wave = frac((u - 1) / 2.4) * (n + 10) - 3;
        P.ch.forEach((c, j) => {
          const s0 = .12 + j * .028, p = seg(u, s0, s0 + .36);
          const e0 = D - .5 + j * .014, x = eOut(seg(u, e0, e0 + .26));
          const ripple = u > 1 ? Math.max(0, 1 - Math.abs(wave - j) / 1.6) : 0;
          const bob = Math.sin(t * TAU / 1.6 - j * .4) * 1.6;
          const ep = eOut(p), bk = eBack(p);
          const y = (1 - ep) * 26 + bob - ripple * 7 + x * 6;
          const xx = (1 - ep) * 34 - x * 46;
          const sc = (.55 + .45 * bk) + ripple * .1;
          const rot = (1 - ep) * 10 - x * 8;
          c.style.transform = `translate(${xx.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
          c.style.opacity = Math.min(1, p * 2.5, 1 - x).toFixed(3);
        });
        P.tags.forEach((tg, j) => {
          const p = seg(u, .55 + j * .1, .85 + j * .1), x = seg(u, D - .4, D - .15);
          tg.style.opacity = Math.min(p * 3, 1 - x).toFixed(3);
          tg.style.transform = `skewX(-12deg) translateY(${(x * 20).toFixed(1)}px) scale(${(.4 + .6 * eBack(p)).toFixed(3)})`;
        });
        // art
        const ap = seg(u, .12, .6), ax = eOut(seg(u, D - .4, D - .1));
        a.style.opacity = Math.min(ap * 3, 1 - ax).toFixed(3);
        a.style.transform = `scale(${((.3 + .7 * eBack(ap)) * (1 - .4 * ax)).toFixed(3)}) rotate(${((1 - eOut(ap)) * -25 + ax * 20).toFixed(1)}deg)`;
        const svg = a.firstElementChild;
        if (msgs[i].art === "rank") O.ranks.anim(svg, u, t);
        else { animArt(svg, msgs[i].art, t, LOOP); if (msgs[i].art === "diamond") animDiamondPlus(svg, t); }
      }
      // switch accents
      const b = seg(u, 0, .42);
      blade.style.transform = `translateX(${(140 + eOut(b) * 900).toFixed(1)}px) skewX(-18deg)`;
      blade.style.opacity = b > 0 && b < 1 ? "1" : "0";
      flash.style.opacity = (u > .08 ? (1 - seg(u, .08, .4)) * .3 : 0).toFixed(3);
      const sq = u < .3 ? Math.sin(seg(u, 0, .3) * Math.PI) : 0;
      plate.style.transform = `skewX(-12deg) scale(${(1 + sq * .025).toFixed(4)}, ${(1 - sq * .03).toFixed(4)})`;
      const gp = frac(t / 3);
      glint.style.transform = `translateX(${(-160 + ease2(seg(gp, .2, .55)) * 820).toFixed(1)}px) skewX(-20deg)`;
      ringA.setAttribute("stroke-dashoffset", (-t * 40).toFixed(1));
      ringB.setAttribute("stroke-dashoffset", (t * 100).toFixed(1));
      edgeI.style.transform = `translateX(${(frac(t / 4) * 1400 - 240).toFixed(1)}px)`;
      streak.setAttribute("transform", `translate(${(-80 + ease2(seg(frac(t / 4), .3, .7)) * 420).toFixed(1)} 0)`);
      dots.forEach((d, i) => d.classList.toggle("on", i === idx));
    }
    tickers.push(frame);
    frame(now());
    const setStyle = st => { style = st; bn.className = "bn bn-pro bn--" + st; };
    const destroy = () => { const i = tickers.indexOf(frame); if (i >= 0) tickers.splice(i, 1); bn.remove(); };
    return { el: bn, frame, LOOP, setStyle, destroy };
  }

  O.mountProBanner = mountProBanner;
  O.mascot = { svg: mascotSVG, anim: animMascot };
  O.ranks = O.ranks || { html: rankArtSVG, svg: rankArtSVG, anim: animRanks };
  O.rankBadgeSVG = i => `<svg viewBox="34 4 200 200" style="width:100%;height:100%;overflow:visible">${badge(TIERS[i], uid("rb"), i).replace('opacity="0"', 'opacity="1"').replace(/<text[^>]*>[^<]*<\/text>/, "")}</svg>`;
  O.diamondPlus = { add: diamondPlus, anim: animDiamondPlus };
})();
