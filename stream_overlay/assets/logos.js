/* Brand logos (SVG strings + time-driven animation).
   emblem  – hex crest, Yagami crescent cradling an angular "S" monogram
   grunge  – distressed wordmark (brand name) over a brush swipe
   The sticker mascot lives in banner-pro.js (ChouOverlay.mascot). */
(function () {
  "use strict";
  const O = window.ChouOverlay, CFG = O.CFG;
  const { esc, seg, eOut, eBack, frac, TAU, uid } = O.util;

  const brand = () => {
    const b = CFG.brand || {};
    const n = (CFG.storeName || "").toUpperCase(), i = n.lastIndexOf("STORE");
    return {
      name: b.name || (i > 0 ? n.slice(0, i) : n),
      mono: b.monogram || (b.name || n).trim().charAt(0) || "S",
      tagline: b.tagline || CFG.storeName
    };
  };

  /* ---------- emblem ---------- */
  const hex = (r, cx = 100, cy = 100) => Array.from({ length: 6 }, (_, i) => {
    const a = TAU * i / 6 - Math.PI / 2; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

  function emblemSVG(accent = "#a66bff") {
    const u = uid("em");
    return `<svg viewBox="0 0 200 200" class="lg-emblem" aria-hidden="true"><defs>
<linearGradient id="${u}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#ff2350"/></linearGradient>
<linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${accent}"/></linearGradient>
<radialGradient id="${u}b" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#2a1446"/><stop offset="1" stop-color="#0c0714"/></radialGradient>
<mask id="${u}c"><rect width="200" height="200" fill="#fff"/><circle cx="124" cy="88" r="50" fill="#000"/></mask>
<clipPath id="${u}k"><polygon points="${hex(84)}"/></clipPath></defs>
<polygon class="e-fill" points="${hex(86)}" fill="url(#${u}b)"/>
<polygon class="e-ring" points="${hex(86)}" fill="none" stroke="url(#${u}r)" stroke-width="7" stroke-linejoin="round" pathLength="100" stroke-dasharray="100 100"/>
<polygon points="${hex(72)}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/>
<g class="e-moon"><circle cx="100" cy="106" r="60" fill="url(#${u}m)" mask="url(#${u}c)"/></g>
<clipPath id="${u}s"><rect class="e-sclip" x="40" y="40" width="0" height="130"/></clipPath>
<g class="e-s" clip-path="url(#${u}s)"><g transform="translate(16 0) skewX(-9)">
 <text x="106" y="150" text-anchor="middle" style="font-family:var(--f-disp);font-size:122px" fill="#ff2350">${esc(brand().mono)}</text>
 <text x="101" y="145" text-anchor="middle" style="font-family:var(--f-disp);font-size:122px;paint-order:stroke" stroke="#0c0714" stroke-width="6" stroke-linejoin="round" fill="#f3eee8">${esc(brand().mono)}</text>
</g></g>
<g clip-path="url(#${u}k)"><rect class="e-shine" x="-60" y="-20" width="34" height="240" fill="#fff" opacity=".22" transform="skewX(-20)"/></g>
<g class="e-spark"><path d="M0 -13 L3 -3 L13 0 L3 3 L0 13 L-3 3 L-13 0 L-3 -3Z" fill="#fff"/></g>
</svg>`;
  }
  /* p = seconds since the emblem appeared, t = global time */
  function animEmblem(svg, p, t) {
    const q = c => svg.querySelector(c);
    const ring = eOut(seg(p, 0, .6));
    q(".e-ring").setAttribute("stroke-dashoffset", (100 - ring * 100).toFixed(2));
    q(".e-ring").setAttribute("stroke-dasharray", ring >= .999 ? "none" : "100 100");
    const m = eBack(seg(p, .15, .6));
    q(".e-moon").setAttribute("transform", `translate(100 106) rotate(${((1 - m) * -120).toFixed(1)}) scale(${(.2 + .8 * m).toFixed(3)}) translate(-100 -106)`);
    q(".e-moon").setAttribute("opacity", Math.min(1, m * 2).toFixed(3));
    const s = eOut(seg(p, .35, .8));
    svg.querySelector(".e-sclip").setAttribute("width", (130 * s).toFixed(1));
    const sh = frac(t / 3);
    q(".e-shine").setAttribute("x", (-60 + seg(sh, .1, .45) * 280).toFixed(1));
    const sp = frac(t / 3 + .3), sc = sp < .2 ? Math.sin(sp / .2 * Math.PI) : 0;
    q(".e-spark").setAttribute("transform", `translate(150 48) rotate(${(sp * 180).toFixed(1)}) scale(${sc.toFixed(3)})`);
  }

  /* ---------- grunge wordmark ---------- */
  function grungeSVG(accent = "#a66bff") {
    const u = uid("gr"), b = brand();
    const name = esc(b.name);
    return `<svg viewBox="0 0 380 150" class="lg-grunge" aria-hidden="true"><defs>
<filter id="${u}d" x="-6%" y="-12%" width="112%" height="124%">
 <feTurbulence type="fractalNoise" baseFrequency=".03 .11" numOctaves="2" seed="4" result="n"/>
 <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/>
 <feTurbulence type="fractalNoise" baseFrequency=".22 .3" numOctaves="3" seed="11" result="sp"/>
 <feColorMatrix in="sp" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -30 0 0 0 23.6" result="hole"/>
 <feComposite in="d" in2="hole" operator="in"/>
</filter>
<filter id="${u}b" x="-5%" y="-20%" width="110%" height="140%">
 <feTurbulence type="fractalNoise" baseFrequency=".02 .3" numOctaves="3" seed="2" result="n"/>
 <feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<clipPath id="${u}w"><rect class="g-wipe" x="0" y="0" width="380" height="150"/></clipPath></defs>
<g clip-path="url(#${u}w)">
 <path d="M14 98 C70 72 180 64 366 52 L360 112 C220 118 110 124 22 132 Z" fill="#2a2433" filter="url(#${u}b)"/>
 <path d="M40 118 L352 92 L350 102 L44 128 Z" fill="${accent}" filter="url(#${u}b)"/>
 <g class="g-txt">
  <text class="g-rgb" x="190" y="112" text-anchor="middle" style="font-family:var(--f-disp);font-size:120px;letter-spacing:2px" fill="#ff2350" opacity="0">${name}</text>
  <text x="196" y="117" text-anchor="middle" style="font-family:var(--f-disp);font-size:120px;letter-spacing:2px" fill="#07050c" filter="url(#${u}d)">${name}</text>
  <text x="190" y="112" text-anchor="middle" style="font-family:var(--f-disp);font-size:120px;letter-spacing:2px" fill="#f3eee8" filter="url(#${u}d)">${name}</text>
  <path d="M108 34 l8 10 -5 8 9 9 -3 7 6 10 M236 30 l-6 9 5 7 -7 10 4 6 -3 12 M290 60 l7 6 -3 5 8 6" stroke="#0c0a10" stroke-width="2" fill="none" stroke-linejoin="bevel"/>
 </g>
</g></svg>`;
  }
  function animGrunge(svg, p, t) {
    const w = eOut(seg(p, 0, .55));
    svg.querySelector(".g-wipe").setAttribute("width", (380 * w).toFixed(1));
    const gp = frac(t / 3.2), glitch = gp > .9 && gp < .94;
    svg.querySelector(".g-txt").setAttribute("transform", glitch ? "translate(3 0)" : "translate(0 0)");
    const rgb = svg.querySelector(".g-rgb");
    rgb.setAttribute("opacity", glitch || p < .5 ? ".85" : "0");
    rgb.setAttribute("transform", `translate(${glitch ? -7 : (1 - w) * -14} 0)`);
  }

  O.logos = { brand, emblemSVG, animEmblem, grungeSVG, animGrunge, hex };
})();
