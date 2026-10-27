/* 3D-shaded streamer mascot (no sticker border).
   Poses: game (tablet + tapping), win (fist up "GG", happy eyes), wink (thumbs-up).
   ChouOverlay.mascot3d.svg()                 -> SVG string (viewBox 0 0 200 200)
   ChouOverlay.mascot3d.anim(svg, t, opts)    -> animate; opts.pose fixes a pose,
                                                 otherwise the 24 s carousel is used. */
(function () {
  "use strict";
  const O = window.ChouOverlay;
  const { seg, eOut, eBack, frac, TAU, uid } = O.util;

  // carousel (period 24 s): mostly gaming, with short hook poses
  const SCHED = [[0, "game"], [6, "win"], [9.6, "game"], [14.4, "wink"], [18, "game"]];
  const FLIP = .3; // half-duration of the pose flip
  function poseAt(t) {
    const L = 24, tl = ((t % L) + L) % L;
    let i = 0; for (let k = 0; k < SCHED.length; k++) if (tl >= SCHED[k][0]) i = k;
    // distance to the nearest boundary (signed: <0 before it, >0 after it)
    let best = 99, bIdx = 0;
    for (let k = 0; k <= SCHED.length; k++) {
      const bt = k === SCHED.length ? L : SCHED[k][0], d = tl - bt;
      if (Math.abs(d) < Math.abs(best)) { best = d; bIdx = k % SCHED.length; }
    }
    return { pose: SCHED[i][1], d: best, at: bIdx, local: tl - SCHED[i][0] };
  }

  function svg() {
    const u = uid("m3");
    const SKIN = `url(#${u}sk)`;
    const palm = (cls, x, y, r) => `<g class="${cls}" transform="translate(${x} ${y}) rotate(${r})"><rect x="-12" y="-6" width="24" height="20" rx="9" fill="${SKIN}"/>
<rect x="-11" y="-21" width="5.6" height="18" rx="2.8" fill="${SKIN}"/><rect x="-4.6" y="-24" width="5.6" height="21" rx="2.8" fill="${SKIN}"/><rect x="1.8" y="-22.5" width="5.6" height="19.5" rx="2.8" fill="${SKIN}"/><rect x="8" y="-17" width="5.2" height="15" rx="2.6" fill="${SKIN}"/>
<rect x="-19" y="-1" width="10" height="5.6" rx="2.8" fill="${SKIN}" transform="rotate(-30 -14 2)"/><path d="M-6 6 q6 3 12 0" stroke="#c98a63" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
    const hand = (cls, x, y, extra = "") => `<g class="${cls}" transform="translate(${x} ${y})">${extra}<circle r="11.5" fill="${SKIN}"/><path d="M-4 -7 q5 2 8 0 M-5 -1 q6 2 10 0 M-4 5 q5 2 8 0" stroke="#c98a63" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`;
    return `<svg viewBox="0 0 200 200" class="m3d" aria-hidden="true"><defs>
<radialGradient id="${u}sk" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ffe3c9"/><stop offset=".55" stop-color="#f4c39b"/><stop offset="1" stop-color="#d6936a"/></radialGradient>
<radialGradient id="${u}fc" cx=".4" cy=".34" r=".72"><stop offset="0" stop-color="#ffe6cf"/><stop offset=".6" stop-color="#f6c7a0"/><stop offset="1" stop-color="#dc9d74"/></radialGradient>
<linearGradient id="${u}hr" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#3c3049"/><stop offset=".5" stop-color="#1c1524"/><stop offset="1" stop-color="#0c0810"/></linearGradient>
<linearGradient id="${u}jk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3043"/><stop offset=".45" stop-color="#1b1522"/><stop offset="1" stop-color="#0a070d"/></linearGradient>
<linearGradient id="${u}te" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfc8d6"/></linearGradient>
<linearGradient id="${u}hp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4352"/><stop offset="1" stop-color="#0d0b11"/></linearGradient>
<radialGradient id="${u}cup" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#4b4453"/><stop offset="1" stop-color="#0b090e"/></radialGradient>
<linearGradient id="${u}tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4352"/><stop offset=".55" stop-color="#211c27"/><stop offset="1" stop-color="#121016"/></linearGradient>
<linearGradient id="${u}te2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2530"/><stop offset=".5" stop-color="#8a8294"/><stop offset="1" stop-color="#2a2530"/></linearGradient>
<radialGradient id="${u}rim" cx="1" cy=".45" r=".7"><stop offset="0" stop-color="#ff2346" stop-opacity=".95"/><stop offset=".55" stop-color="#ff2346" stop-opacity=".25"/><stop offset="1" stop-color="#ff2346" stop-opacity="0"/></radialGradient>
<radialGradient id="${u}rimL" cx="0" cy=".5" r=".6"><stop offset="0" stop-color="#ffb08a" stop-opacity=".35"/><stop offset="1" stop-color="#ffb08a" stop-opacity="0"/></radialGradient>
<radialGradient id="${u}bl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff6f86" stop-opacity=".6"/><stop offset="1" stop-color="#ff6f86" stop-opacity="0"/></radialGradient>
<radialGradient id="${u}eye" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#5a3036"/><stop offset=".6" stop-color="#22121a"/><stop offset="1" stop-color="#0a0508"/></radialGradient>
<radialGradient id="${u}scr" cx=".5" cy="1" r=".9"><stop class="m-glow" offset="0" stop-color="#ff2346" stop-opacity=".7"/><stop offset="1" stop-color="#ff2346" stop-opacity="0"/></radialGradient>
<linearGradient id="${u}sc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c0c1c"/><stop offset=".6" stop-color="#150818"/><stop offset="1" stop-color="#0a0410"/></linearGradient>
<radialGradient id="${u}sg" cx=".5" cy=".5" r=".5"><stop class="m-sglow" offset="0" stop-color="#ff2346" stop-opacity=".55"/><stop offset="1" stop-color="#ff2346" stop-opacity="0"/></radialGradient>
<clipPath id="${u}scl"><path d="M58 139.5 H142 L148 180.5 H52 Z"/></clipPath>
<filter id="${u}gb" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="3"/></filter>
<linearGradient id="${u}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#ffc83d"/><stop offset="1" stop-color="#c47a00"/></linearGradient>
<clipPath id="${u}fcl"><path d="M44 84 C44 52 68 34 100 34 C132 34 156 52 156 84 C156 116 133 138 100 138 C67 138 44 116 44 84Z"/></clipPath>
<clipPath id="${u}jcl"><path d="M26 204 C26 164 50 140 82 134 H118 C150 140 174 164 174 204 Z"/></clipPath>
<filter id="${u}sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="4.5" flood-color="#000" flood-opacity=".6"/></filter>
</defs>
<g class="m-all"><g filter="url(#${u}sh)">
 <g class="m-body">
  <path d="M26 204 C26 164 50 140 82 134 H118 C150 140 174 164 174 204 Z" fill="url(#${u}jk)"/>
  <g clip-path="url(#${u}jcl)"><ellipse cx="178" cy="170" rx="34" ry="60" fill="url(#${u}rim)"/><ellipse cx="22" cy="170" rx="26" ry="50" fill="url(#${u}rimL)"/></g>
  <path d="M88 126 H112 V140 C106 145 94 145 88 140Z" fill="#c98a63"/>
  <path d="M84 134 H116 L108 172 H92 Z" fill="url(#${u}te)"/>
  <path d="M82 134 L94 176" stroke="#ff2346" stroke-width="5.5" stroke-linecap="round"/><path d="M118 134 L106 176" stroke="#ff2346" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M84 135 L95 172" stroke="#ff8a9b" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
 </g>
 <g class="m-head">
  <path d="M40 92 C30 44 62 14 102 14 C142 14 172 44 160 94 C152 66 132 50 100 50 C70 50 50 66 40 92Z" fill="url(#${u}hr)"/>
  <path d="M42 70 C40 80 41 92 44 100 L50 96 C48 88 48 80 50 72Z" fill="#3a3244"/><path d="M158 70 C160 80 159 92 156 100 L150 96 C152 88 152 80 150 72Z" fill="#3a3244"/>
  <path d="M44 84 C44 52 68 34 100 34 C132 34 156 52 156 84 C156 116 133 138 100 138 C67 138 44 116 44 84Z" fill="url(#${u}fc)"/>
  <g clip-path="url(#${u}fcl)">
   <ellipse cx="162" cy="92" rx="30" ry="62" fill="url(#${u}rim)"/>
   <ellipse class="m-scr" cx="100" cy="150" rx="62" ry="40" fill="url(#${u}scr)" opacity="0"/>
   <path d="M60 122 C76 140 124 140 140 122 C130 136 116 142 100 142 C84 142 70 136 60 122Z" fill="#c98a63" opacity=".35"/>
  </g>
  <ellipse cx="72" cy="108" rx="13" ry="8" fill="url(#${u}bl)"/><ellipse cx="128" cy="108" rx="13" ry="8" fill="url(#${u}bl)"/>
  <g class="e-open">
   <g class="m-eyeL"><ellipse cx="78" cy="94" rx="9.5" ry="11.5" fill="url(#${u}eye)"/><circle cx="81.5" cy="89" r="3.8" fill="#fff"/><circle cx="75.5" cy="99" r="1.7" fill="#fff" opacity=".85"/></g>
   <g class="m-eyeR"><ellipse cx="122" cy="94" rx="9.5" ry="11.5" fill="url(#${u}eye)"/><circle cx="125.5" cy="89" r="3.8" fill="#fff"/><circle cx="119.5" cy="99" r="1.7" fill="#fff" opacity=".85"/></g>
  </g>
  <g class="e-happy" opacity="0" stroke="#22121a" stroke-width="5" fill="none" stroke-linecap="round"><path d="M69 96 Q78 84 87 96"/><path d="M113 96 Q122 84 131 96"/></g>
  <g class="e-wink" opacity="0"><path d="M69 96 Q78 102 87 94" stroke="#22121a" stroke-width="5" fill="none" stroke-linecap="round"/>
   <ellipse cx="122" cy="94" rx="9.5" ry="11.5" fill="url(#${u}eye)"/><circle cx="125.5" cy="89" r="3.8" fill="#fff"/><path d="M140 80 l2 -6 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2z" fill="#ffd34d"/></g>
  <path class="m-brL" d="M67 78 Q77 72 88 78" stroke="#1c1524" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path class="m-brR" d="M112 78 Q123 72 133 78" stroke="#1c1524" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M99 104 q-2 5 1 6" stroke="#c98a63" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path class="mo-focus" d="M93 119 Q100 123 107 119" stroke="#8a3340" stroke-width="3.2" fill="none" stroke-linecap="round"/>
  <g class="mo-open" opacity="0"><path d="M88 115 Q100 116 112 115 Q110 131 100 131 Q90 131 88 115Z" fill="#5a1422"/><path d="M93 125 Q100 121 107 125 Q104 130 100 130 Q96 130 93 125Z" fill="#ff6f86"/><path d="M89 115.5 Q100 117 111 115.5 L110 118 Q100 119 90 118Z" fill="#fff"/></g>
  <g class="mo-grin" opacity="0"><path d="M90 116 Q100 126 112 114" stroke="#8a3340" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>
  <path d="M42 78 C38 40 68 18 104 18 C140 18 164 42 160 74 C152 62 142 56 130 54 C132 64 126 74 116 80 C116 68 108 60 96 58 C90 68 78 74 64 76 C56 76 48 77 42 78Z" fill="url(#${u}hr)"/>
  <path d="M70 32 C88 22 116 22 134 32" stroke="#fff" stroke-opacity=".28" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M100 58 C108 62 114 70 116 80" stroke="#5c4a6d" stroke-width="2" fill="none" opacity=".6"/>
  <path d="M38 90 C30 6 170 6 162 90" fill="none" stroke="url(#${u}hp)" stroke-width="11" stroke-linecap="round"/>
  <path d="M46 52 C66 22 134 22 154 52" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="26" y="70" width="27" height="44" rx="13" fill="url(#${u}cup)"/><rect x="31" y="78" width="9" height="28" rx="4.5" fill="#ff2346"/><rect x="29" y="74" width="8" height="10" rx="4" fill="#fff" opacity=".18"/>
  <rect x="147" y="70" width="27" height="44" rx="13" fill="url(#${u}cup)"/><rect x="160" y="78" width="9" height="28" rx="4.5" fill="#ff2346"/>
 </g>
 <g class="m-tab">
  <path class="m-edgeglow" d="M50 138 H150" stroke="#ff4d66" stroke-width="7" stroke-linecap="round" opacity=".55" filter="url(#${u}gb)"/>
  <path d="M53 139 H147 L153 184 H47 Z" fill="url(#${u}tb)"/>
  <path d="M47 184 H153 L152 188.5 H48 Z" fill="url(#${u}te2)"/>
  <path d="M53 139 H147 L147.6 142 H52.4Z" fill="#ff6b80" opacity=".8"/>
  <path d="M56 143.5 H144" stroke="#fff" stroke-opacity=".28" stroke-width="1.2"/>
  <path d="M53 139 L80 139 L64 184 L47 184Z" fill="#fff" opacity=".07"/>
  <rect x="84" y="149" width="21" height="19" rx="5.5" fill="#0d0b11" stroke="#5a5363" stroke-width="1.2"/>
  <circle cx="90" cy="155" r="3.4" fill="#1f1b26" stroke="#8a8294" stroke-width="1"/><circle cx="90" cy="155" r="1.3" fill="#52d8ff" opacity=".6"/>
  <circle cx="99" cy="162" r="3.4" fill="#1f1b26" stroke="#8a8294" stroke-width="1"/><circle cx="99" cy="162" r="1.3" fill="#52d8ff" opacity=".6"/>
  <circle cx="99" cy="154" r="1.4" fill="#ffd34d" opacity=".8"/>
  <path d="M126 139 L115 184" stroke="#ff2346" stroke-width="5"/><path d="M131 139 L120 184" stroke="#ff2346" stroke-width="1.5" opacity=".6"/>
  <text x="95" y="180" text-anchor="middle" style="font-family:var(--f-disp,Impact);font-size:8px;letter-spacing:2px" fill="#fff" fill-opacity=".18">SYNO</text>
 </g>
 <g class="m-tablow" opacity="0" transform="translate(40 186) rotate(-16)">
  <rect x="-30" y="-19" width="60" height="38" rx="5" fill="url(#${u}tb)"/>
  <rect x="-30" y="-19" width="60" height="4" rx="2" fill="#ff6b80" opacity=".6"/>
  <rect x="-24" y="-12" width="14" height="13" rx="4" fill="#0d0b11" stroke="#5a5363" stroke-width="1"/><circle cx="-20" cy="-8" r="2.4" fill="#1f1b26" stroke="#8a8294" stroke-width=".8"/><circle cx="-14" cy="-3" r="2.4" fill="#1f1b26" stroke="#8a8294" stroke-width=".8"/>
  <path d="M14 -19 L6 19" stroke="#ff2346" stroke-width="4"/>
  <path d="M-30 -19 H-14 L-26 19 H-30Z" fill="#fff" opacity=".07"/>
 </g>
 <g class="arm-game">
  <path d="M46 154 C36 166 38 176 48 174" stroke="url(#${u}jk)" stroke-width="22" fill="none" stroke-linecap="round"/>
  <path d="M154 154 C164 166 162 176 152 174" stroke="url(#${u}jk)" stroke-width="22" fill="none" stroke-linecap="round"/>
  ${hand("hl", 50, 166)}${hand("hr", 150, 166)}
  <g class="th-l"><path d="M54 152 C56 142 62 136 70 136 C76 136 78 141 75 145 C72 149 64 150 58 156Z" fill="${SKIN}"/><ellipse cx="71" cy="139.5" rx="3.6" ry="2.4" fill="#ffe1cc" opacity=".95"/></g>
  <g class="th-r"><path d="M146 152 C144 142 138 136 130 136 C124 136 122 141 125 145 C128 149 136 150 142 156Z" fill="${SKIN}"/><ellipse cx="129" cy="139.5" rx="3.6" ry="2.4" fill="#ffe1cc" opacity=".95"/></g>
  <g class="m-tapL" opacity="0" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M64 130 l-4 -6 M72 128 v-7 M80 130 l4 -6"/></g>
  <g class="m-tapR" opacity="0" stroke="#ffd34d" stroke-width="2.2" stroke-linecap="round"><path d="M120 130 l-4 -6 M128 128 v-7 M136 130 l4 -6"/></g>
 </g>
 <g class="arm-cheer" opacity="0">
  <path d="M50 154 C36 134 30 108 34 84" stroke="url(#${u}jk)" stroke-width="22" fill="none" stroke-linecap="round"/>
  <path d="M150 154 C164 134 170 108 166 84" stroke="url(#${u}jk)" stroke-width="22" fill="none" stroke-linecap="round"/>
  ${palm("pl", 34, 70, -14)}${palm("pr", 166, 70, 14)}
 </g>
 <g class="arm-win" opacity="0">
  <path d="M48 156 C40 168 46 178 58 180" stroke="url(#${u}jk)" stroke-width="22" fill="none" stroke-linecap="round"/>
  <path d="M152 152 C176 136 186 104 180 76" stroke="url(#${u}jk)" stroke-width="22" fill="none" stroke-linecap="round"/>
  <g transform="translate(180 60)"><rect x="-13" y="-14" width="26" height="26" rx="10" fill="${SKIN}"/><path d="M-9 -6 h18 M-9 0 h18 M-9 6 h18" stroke="#c98a63" stroke-width="2" stroke-linecap="round"/><rect x="-14" y="-4" width="8" height="14" rx="4" fill="${SKIN}"/></g>
  ${hand("hw", 64, 180)}
 </g>
 <g class="arm-wink" opacity="0">
  <path d="M48 156 C40 168 46 178 58 180" stroke="url(#${u}jk)" stroke-width="22" fill="none" stroke-linecap="round"/>
  <path d="M154 162 C172 156 180 144 176 132" stroke="url(#${u}jk)" stroke-width="22" fill="none" stroke-linecap="round"/>
  <g transform="translate(174 122)"><rect x="-12" y="-6" width="24" height="22" rx="9" fill="${SKIN}"/><rect x="-6" y="-24" width="10" height="22" rx="5" fill="${SKIN}"/><path d="M-8 2 h15 M-8 8 h15" stroke="#c98a63" stroke-width="2" stroke-linecap="round"/></g>
  ${hand("hk", 64, 180)}
 </g>
</g>
 <g class="m-gg" opacity="0"><text x="182" y="30" text-anchor="middle" style="font-family:var(--f-disp,Impact);font-size:26px;letter-spacing:1px;paint-order:stroke" stroke="#5a0010" stroke-width="6" stroke-linejoin="round" fill="url(#${u}gold)">GG</text></g>
 <g class="m-spk"><path d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2Z" fill="#ffd34d"/></g>
 <g class="m-spk"><path d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2Z" fill="#fff"/></g>
 <circle class="m-burst" cx="100" cy="104" r="40" fill="none" stroke="#ffd34d" stroke-width="3" opacity="0"/>
</g></svg>`;
  }

  const SCR = [[255, 35, 70], [255, 200, 61], [255, 255, 255], [255, 35, 70]];
  function anim(s, t, opts = {}) {
    if (!s) return;
    const q = c => s.querySelector(c);
    let pose, d = 99;
    if (opts.pose) pose = opts.pose; else { const P = poseAt(t); pose = P.pose; d = P.d; }
    // flip transition around the boundary
    let sx = 1, sy = 1, hop = 0;
    if (Math.abs(d) < FLIP) {
      const k = Math.abs(d) / FLIP;
      if (d < 0) { sx = Math.max(.04, eOut(k)); sy = 1 + (1 - k) * .1; }
      else { sx = Math.max(.04, .04 + .96 * eBack(k)); sy = 1 + (1 - k) * .1; hop = Math.sin(k * Math.PI) * 10; }
    }
    const br = 1 + .014 * Math.sin(t * TAU / 3);
    const winHop = pose === "win" ? Math.abs(Math.sin(t * TAU / 1.2)) * 6 : pose === "cheer" ? Math.abs(Math.sin(t * TAU / .8)) * 4 : 0;
    q(".m-all").setAttribute("transform", `translate(100 200) translate(0 ${(-hop - winHop).toFixed(2)}) scale(${(sx * br).toFixed(4)} ${(sy * (2 - br)).toFixed(4)}) translate(-100 -200)`);
    const nod = Math.sin(t * TAU / 1.5);
    const tilt = pose === "game" ? nod * 2.4 : pose === "win" ? -4 + nod * 2 : pose === "cheer" ? nod * 3 : 6 + nod * 1.5;
    q(".m-head").setAttribute("transform", `rotate(${tilt.toFixed(2)} 100 132) translate(0 ${(pose === "game" ? Math.abs(nod) * 1.4 : 0).toFixed(2)})`);
    // pose parts
    const show = (c, on) => q(c).setAttribute("opacity", on ? "1" : "0");
    const cheer = pose === "cheer";
    show(".arm-game", pose === "game"); show(".arm-win", pose === "win"); show(".arm-wink", pose === "wink"); show(".arm-cheer", cheer);
    show(".e-open", pose === "game"); show(".e-happy", pose === "win" || cheer); show(".e-wink", pose === "wink");
    show(".mo-focus", pose === "game"); show(".mo-open", pose === "win" || cheer); show(".mo-grin", pose === "wink");
    if (cheer) {
      const w = Math.sin(t * TAU / .8);
      q(".pl").setAttribute("transform", `translate(34 ${(70 + Math.abs(w) * -3).toFixed(2)}) rotate(${(-14 + w * 10).toFixed(2)})`);
      q(".pr").setAttribute("transform", `translate(166 ${(70 + Math.abs(w) * -3).toFixed(2)}) rotate(${(14 - w * 10).toFixed(2)})`);
    }
    show(".m-gg", pose === "win" && !!opts.gg);
    // brows
    q(".m-brL").setAttribute("d", pose === "game" ? "M67 80 Q77 76 88 82" : "M67 76 Q77 69 88 75");
    q(".m-brR").setAttribute("d", pose === "game" ? "M112 82 Q123 76 133 80" : "M112 75 Q123 69 133 76");
    // tablet placement per pose
    const tab = q(".m-tab"), low = q(".m-tablow");
    const game = pose === "game";
    tab.setAttribute("opacity", game ? "1" : "0"); low.setAttribute("opacity", game || pose === "cheer" ? "0" : "1");
    const sway = Math.sin(t * TAU * 4) * .5, bob = Math.abs(nod) * 1.2;
    tab.setAttribute("transform", `translate(${sway.toFixed(2)} ${bob.toFixed(2)})`);
    q(".arm-game").setAttribute("transform", `translate(${sway.toFixed(2)} ${bob.toFixed(2)})`);
    if (game) {
      // thumbs press the screen over the top edge, alternating every 0.25 s
      const tp = frac(t / .5), pl = tp < .2 ? Math.sin(tp / .2 * Math.PI) : 0, pr = tp >= .5 && tp < .7 ? Math.sin((tp - .5) / .2 * Math.PI) : 0;
      q(".th-l").setAttribute("transform", `translate(0 ${(pl * 3).toFixed(2)})`);
      q(".th-r").setAttribute("transform", `translate(0 ${(pr * 3).toFixed(2)})`);
      q(".m-tapL").setAttribute("opacity", (pl * .9).toFixed(3));
      q(".m-tapR").setAttribute("opacity", (pr * .9).toFixed(3));
      q(".m-edgeglow").setAttribute("opacity", (.4 + .3 * Math.max(pl, pr) + .15 * Math.sin(t * TAU / 1.5)).toFixed(3));
    }
    // blink (open eyes only)
    const bp = frac(t / 3), bl = bp > .9 && bp < .955 ? .1 : 1;
    q(".e-open").setAttribute("transform", `translate(0 94) scale(1 ${bl}) translate(0 -94)`);
    // screen light on the face
    const scr = q(".m-scr");
    if (pose === "game") {
      const cp = frac(t / 4) * 3, ci = Math.floor(cp), cf = cp - ci, a = SCR[ci], b = SCR[ci + 1];
      const col = a.map((v, i) => Math.round(v + (b[i] - v) * cf));
      q(".m-glow").setAttribute("stop-color", `rgb(${col})`);
      scr.setAttribute("opacity", (.55 + .35 * Math.abs(Math.sin(t * TAU / 1.5))).toFixed(3));
    } else scr.setAttribute("opacity", "0");
    // sparkles + burst at pose change
    s.querySelectorAll(".m-spk").forEach((g, i) => {
      const p = frac(t / 2 + i * .5), sc = Math.sin(p * Math.PI) * (pose === "game" ? .6 : 1.1);
      const pos = pose === "win" ? [[150, 34], [30, 46]][i] : pose === "wink" ? [[176, 92], [28, 60]][i] : [[168, 128], [30, 120]][i];
      g.setAttribute("transform", `translate(${pos[0]} ${pos[1]}) rotate(${(p * 120).toFixed(1)}) scale(${sc.toFixed(3)})`);
    });
    const burst = q(".m-burst");
    if (d >= 0 && d < .4) { const k = d / .4; burst.setAttribute("r", (46 + eOut(k) * 50).toFixed(1)); burst.setAttribute("opacity", ((1 - k) * .8).toFixed(3)); burst.setAttribute("stroke-width", (4 - k * 3).toFixed(2)); }
    else burst.setAttribute("opacity", "0");
    const gg = q(".m-gg");
    if (pose === "win") { const g = 1 + .08 * Math.sin(t * TAU / 1.2); gg.setAttribute("transform", `translate(182 24) scale(${g.toFixed(3)}) rotate(-8) translate(-182 -24)`); }
  }

  O.mascot3d = { svg, anim, poseAt };
})();
