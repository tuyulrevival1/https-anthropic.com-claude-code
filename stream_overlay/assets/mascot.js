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
    const hand = (cls, x, y, extra = "") => `<g class="${cls}" transform="translate(${x} ${y})">${extra}<circle r="11.5" fill="${SKIN}"/><path d="M-4 -7 q5 2 8 0 M-5 -1 q6 2 10 0 M-4 5 q5 2 8 0" stroke="#c98a63" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`;
    return `<svg viewBox="0 0 200 200" class="m3d" aria-hidden="true"><defs>
<radialGradient id="${u}sk" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ffe3c9"/><stop offset=".55" stop-color="#f4c39b"/><stop offset="1" stop-color="#d6936a"/></radialGradient>
<radialGradient id="${u}fc" cx=".4" cy=".34" r=".72"><stop offset="0" stop-color="#ffe6cf"/><stop offset=".6" stop-color="#f6c7a0"/><stop offset="1" stop-color="#dc9d74"/></radialGradient>
<linearGradient id="${u}hr" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#3c3049"/><stop offset=".5" stop-color="#1c1524"/><stop offset="1" stop-color="#0c0810"/></linearGradient>
<linearGradient id="${u}jk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4a72"/><stop offset=".45" stop-color="#1b2540"/><stop offset="1" stop-color="#0b1020"/></linearGradient>
<linearGradient id="${u}tee" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26252b"/><stop offset="1" stop-color="#0b0b0e"/></linearGradient>
<linearGradient id="${u}rib" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26324f"/><stop offset="1" stop-color="#0f1528"/></linearGradient>
<linearGradient id="${u}fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17121c" stop-opacity=".97"/><stop offset=".6" stop-color="#2a2430" stop-opacity=".8"/><stop offset="1" stop-color="#3a3340" stop-opacity=".45"/></linearGradient>
<clipPath id="${u}elc"><path d="M66 94 Q77 83 90 92 Q79 100 66 94Z"/></clipPath>
<clipPath id="${u}erc"><path d="M110 92 Q123 83 134 94 Q121 100 110 92Z"/></clipPath>
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
<linearGradient id="${u}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#ffc83d"/><stop offset="1" stop-color="#c47a00"/></linearGradient>
<clipPath id="${u}fcl"><path d="M52 80 C52 52 72 36 100 36 C128 36 148 52 148 80 C148 104 139 122 124 133 C116 139 108 142 100 142 C92 142 84 139 76 133 C61 122 52 104 52 80Z"/></clipPath>
<clipPath id="${u}jcl"><path d="M24 204 C24 164 48 140 80 134 H120 C152 140 176 164 176 204 Z"/></clipPath>
<filter id="${u}sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="4.5" flood-color="#000" flood-opacity=".6"/></filter>
</defs>
<g class="m-all"><g filter="url(#${u}sh)">
 <g class="m-body">
  <path d="M24 204 C24 164 48 140 80 134 H120 C152 140 176 164 176 204 Z" fill="url(#${u}jk)"/>
  <g clip-path="url(#${u}jcl)">
   <path d="M44 170 C52 154 64 146 78 142" stroke="#fff" stroke-opacity=".16" stroke-width="5" fill="none" stroke-linecap="round"/>
   <path d="M140 150 C150 158 158 170 160 186" stroke="#fff" stroke-opacity=".1" stroke-width="4" fill="none" stroke-linecap="round"/>
   <ellipse cx="180" cy="170" rx="34" ry="60" fill="url(#${u}rim)"/><ellipse cx="20" cy="170" rx="26" ry="50" fill="url(#${u}rimL)"/>
  </g>
  <path d="M89 124 H111 V140 C105 145 95 145 89 140Z" fill="#c98a63"/>
  <path d="M84 136 H116 L112 204 H88 Z" fill="url(#${u}tee)"/>
  <path d="M88 136 L100 150 L112 136" fill="none" stroke="#2a2a30" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M86 138 L89 204" stroke="#b08a4a" stroke-width="2.2"/><path d="M114 138 L111 204" stroke="#b08a4a" stroke-width="2.2"/>
  <path d="M86 138 L89 204" stroke="#f2d79a" stroke-width=".8" stroke-dasharray="1.5 2"/><path d="M114 138 L111 204" stroke="#f2d79a" stroke-width=".8" stroke-dasharray="1.5 2"/>
  <path d="M74 136 C80 130 90 128 100 128 C110 128 120 130 126 136 L122 142 C116 137 108 135 100 135 C92 135 84 137 78 142Z" fill="url(#${u}rib)"/>
  <path d="M80 136 l1.5 4 M86 133.5 l1 4.5 M92 132.2 l.6 4.6 M100 131.8 v4.6 M108 132.2 l-.6 4.6 M114 133.5 l-1 4.5 M120 136 l-1.5 4" stroke="#000" stroke-opacity=".35" stroke-width="1.1"/>
  <g class="m-headset">
   <path d="M70 150 C76 162 124 162 130 150" fill="none" stroke="#141118" stroke-width="5" stroke-linecap="round"/>
   <ellipse cx="68" cy="146" rx="11" ry="13" fill="url(#${u}cup)" transform="rotate(-20 68 146)"/><ellipse cx="66" cy="146" rx="4.5" ry="8" fill="#ff2346" transform="rotate(-20 66 146)"/>
   <ellipse cx="132" cy="146" rx="11" ry="13" fill="url(#${u}cup)" transform="rotate(20 132 146)"/><ellipse cx="134" cy="146" rx="4.5" ry="8" fill="#ff2346" transform="rotate(20 134 146)"/>
   <ellipse cx="64" cy="140" rx="3" ry="4" fill="#fff" opacity=".22"/>
  </g>
 </g>
 <g class="m-head">
  <g class="m-earL"><ellipse cx="49" cy="94" rx="9" ry="13" fill="url(#${u}sk)" transform="rotate(-12 49 94)"/><path d="M47 87 C43 92 44 100 49 103" stroke="#c98a63" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
  <g class="m-earR"><ellipse cx="151" cy="94" rx="9" ry="13" fill="url(#${u}sk)" transform="rotate(12 151 94)"/><path d="M153 87 C157 92 156 100 151 103" stroke="#c98a63" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
  <path d="M52 80 C52 52 72 36 100 36 C128 36 148 52 148 80 C148 104 139 122 124 133 C116 139 108 142 100 142 C92 142 84 139 76 133 C61 122 52 104 52 80Z" fill="url(#${u}fc)"/>
  <g clip-path="url(#${u}fcl)">
   <ellipse cx="160" cy="92" rx="30" ry="62" fill="url(#${u}rim)"/>
   <ellipse class="m-scr" cx="100" cy="150" rx="62" ry="40" fill="url(#${u}scr)" opacity="0"/>
   <path d="M64 118 C78 138 122 138 136 118 C128 134 114 142 100 142 C86 142 72 134 64 118Z" fill="#c98a63" opacity=".3"/>
  </g>
  <g clip-path="url(#${u}fcl)">
   <path d="M48 88 C46 60 56 40 76 32 L88 52 C74 57 65 67 62 88Z" fill="url(#${u}fade)"/>
   <path d="M152 88 C154 60 144 40 124 32 L112 52 C126 57 135 67 138 88Z" fill="url(#${u}fade)"/>
  </g>
  <circle cx="75" cy="64" r="1.7" fill="#6b3d2c"/>
  <ellipse cx="70" cy="106" rx="11" ry="6.5" fill="url(#${u}bl)" opacity=".7"/><ellipse cx="130" cy="106" rx="11" ry="6.5" fill="url(#${u}bl)" opacity=".7"/>
  <g class="e-open">
   <g class="m-eyeL"><path d="M66 94 Q77 83 90 92 Q79 100 66 94Z" fill="#fff"/><g clip-path="url(#${u}elc)"><circle cx="79" cy="94" r="6.4" fill="url(#${u}eye)"/><circle cx="81.4" cy="91.6" r="2.3" fill="#fff"/></g><path d="M64 93.5 Q77 81 91 91.5" stroke="#1c1418" stroke-width="3.6" fill="none" stroke-linecap="round"/></g>
   <g class="m-eyeR"><path d="M110 92 Q123 83 134 94 Q121 100 110 92Z" fill="#fff"/><g clip-path="url(#${u}erc)"><circle cx="121" cy="94" r="6.4" fill="url(#${u}eye)"/><circle cx="123.4" cy="91.6" r="2.3" fill="#fff"/></g><path d="M109 91.5 Q123 81 136 93.5" stroke="#1c1418" stroke-width="3.6" fill="none" stroke-linecap="round"/></g>
  </g>
  <g class="e-happy" opacity="0" stroke="#1c1418" stroke-width="4.2" fill="none" stroke-linecap="round"><path d="M67 95 Q78 85 89 95"/><path d="M111 95 Q122 85 133 95"/></g>
  <g class="e-wink" opacity="0"><path d="M67 94 Q78 99 89 92" stroke="#1c1418" stroke-width="4.2" fill="none" stroke-linecap="round"/>
   <path d="M110 92 Q123 83 134 94 Q121 100 110 92Z" fill="#fff"/><circle cx="121" cy="93.5" r="5.6" fill="url(#${u}eye)"/><circle cx="123.2" cy="91.4" r="2" fill="#fff"/><path d="M109 91.5 Q123 81 136 93.5" stroke="#1c1418" stroke-width="3.6" fill="none" stroke-linecap="round"/>
   <path d="M142 78 l2 -6 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2z" fill="#ffd34d"/></g>
  <path class="m-brL" d="M65 80 L89 78" stroke="#1c1418" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <path class="m-brR" d="M111 78 L135 80" stroke="#1c1418" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <path d="M100 98 q-1 8 -4 10 q3 1.5 7 0" stroke="#c98a63" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M93 113.5 Q100 111.5 107 113.5" stroke="#2a1d1c" stroke-opacity=".14" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path class="mo-focus" d="M94 120 Q100 122.5 106 119.5" stroke="#8a3340" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <g class="mo-open" opacity="0"><path d="M88 116 Q100 117 112 116 Q110 131 100 131 Q90 131 88 116Z" fill="#5a1422"/><path d="M93 126 Q100 122 107 126 Q104 130 100 130 Q96 130 93 126Z" fill="#ff6f86"/><path d="M89 116.5 Q100 118 111 116.5 L110 119 Q100 120 90 119Z" fill="#fff"/></g>
  <g class="mo-grin" opacity="0"><path d="M90 117 Q100 126 112 115" stroke="#8a3340" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>
  <path class="m-goatee" d="M92 127 Q100 140 108 127 Q106 135 100 136.5 Q94 135 92 127Z" fill="#1c1418" opacity=".88"/>
  <path d="M96 125.5 Q100 127 104 125.5" stroke="#1c1418" stroke-opacity=".5" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M60 58 C56 34 74 16 96 14 C104 6 120 6 130 12 C144 18 152 34 146 56 C142 48 136 44 128 43 C124 50 112 54 100 54 C88 54 76 56 66 60 C63 61 61 60 60 58Z" fill="url(#${u}hr)"/>
  <path d="M84 20 C83 12 88 6 96 5 C93 9 92 13 94 18Z M102 13 C104 6 111 2 119 3 C114 6 112 10 112 14Z M121 15 C126 9 134 8 140 11 C135 12 131 15 130 20Z M70 30 C68 22 72 16 79 13 C77 18 77 22 79 27Z" fill="url(#${u}hr)"/>
  <path d="M98 9 C100 3 105 0 110 -1 M114 7 C118 2 124 0 129 0 M88 12 C87 7 89 3 92 1" stroke="#1c1524" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M68 44 C78 28 98 22 120 24" stroke="#fff" stroke-opacity=".3" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  <path d="M92 30 C104 24 118 24 130 30" stroke="#6b5f78" stroke-opacity=".55" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M104 54 C110 50 116 46 120 40" stroke="#3c3049" stroke-width="2" fill="none"/>
 </g>
 <g class="m-tab">
  <path d="M53 135 H147 L154 185 H46 Z" fill="url(#${u}tb)"/>
  <path d="M46 185 H154 L153 189 H47 Z" fill="url(#${u}te2)"/>
  <path d="M55 136.4 H145" stroke="#fff" stroke-opacity=".4" stroke-width="1.2"/>
  <path d="M58 139.5 H142 L148 180.5 H52 Z" fill="url(#${u}sc)"/>
  <g clip-path="url(#${u}scl)">
   <ellipse cx="100" cy="166" rx="40" ry="16" fill="url(#${u}sg)"/>
   <path d="M52 172 Q100 160 148 174" stroke="#ff6f86" stroke-opacity=".35" stroke-width="1.4" fill="none"/>
   <rect x="64" y="144" width="22" height="3" rx="1.5" fill="#2a1a24"/><rect class="m-hp1" x="64" y="144" width="17" height="3" rx="1.5" fill="#6dffb0"/>
   <rect x="114" y="144" width="22" height="3" rx="1.5" fill="#2a1a24"/><rect class="m-hp2" x="114" y="144" width="12" height="3" rx="1.5" fill="#ff2346"/>
   <g class="m-hero"><circle cx="96" cy="160" r="4" fill="#ffd34d"/><circle cx="96" cy="160" r="7" fill="#ffd34d" opacity=".25"/></g>
   <circle class="m-foe" cx="110" cy="156" r="3.4" fill="#ff2346"/>
   <circle cx="72" cy="168" r="9" fill="#ffffff" fill-opacity=".08" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>
   <circle class="m-knob" cx="72" cy="168" r="4.2" fill="#fff" fill-opacity=".75"/>
   <circle class="m-sk1" cx="130" cy="170" r="6.5" fill="#ff2346" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>
   <circle class="m-sk2" cx="140" cy="160" r="4" fill="#ffc83d" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>
   <circle class="m-sk3" cx="121" cy="159" r="4" fill="#52d8ff" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>
   <circle class="m-rip" cx="130" cy="170" r="6" fill="none" stroke="#fff" stroke-width="2" opacity="0"/>
   <circle class="m-rip2" cx="130" cy="170" r="6" fill="none" stroke="#ffd34d" stroke-width="1.4" opacity="0"/>
   <rect class="m-flash" x="40" y="130" width="120" height="60" fill="#fff" opacity="0"/>
   <path d="M58 139.5 L84 139.5 L64 180.5 L52 180.5Z" fill="#fff" opacity=".07"/>
  </g>
 </g>
 <g class="m-tablow" opacity="0" transform="translate(40 186) rotate(-16)">
  <rect x="-30" y="-19" width="60" height="38" rx="5" fill="url(#${u}tb)"/>
  <rect x="-26.5" y="-15.5" width="53" height="31" rx="3" fill="url(#${u}sc)"/>
  <ellipse cx="0" cy="4" rx="20" ry="8" fill="url(#${u}sg)"/>
  <circle cx="-15" cy="6" r="4.5" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/><circle cx="16" cy="6" r="3.6" fill="#ff2346"/>
  <path d="M-26.5 -15.5 H-12 L-22 15.5 H-26.5Z" fill="#fff" opacity=".08"/>
 </g>
 <g class="arm-game">
  <path d="M46 154 C36 166 38 176 48 174" stroke="url(#${u}jk)" stroke-width="22" fill="none" stroke-linecap="round"/>
  <path d="M154 154 C164 166 162 176 152 174" stroke="url(#${u}jk)" stroke-width="22" fill="none" stroke-linecap="round"/>
  ${hand("hl", 50, 168)}${hand("hr", 150, 168)}
  <g class="th-l"><path d="M54 160 C62 158 70 160 74 165 C76 169 72 172 67 171 C62 170 57 167 54 165Z" fill="${SKIN}"/><ellipse cx="70.5" cy="166.5" rx="3.4" ry="2.6" fill="#ffe1cc" opacity=".9"/></g>
  <g class="th-r"><path d="M146 160 C138 158 130 161 126 166 C124 170 128 173 133 172 C138 171 143 168 146 165Z" fill="${SKIN}"/><ellipse cx="129.5" cy="167.5" rx="3.4" ry="2.6" fill="#ffe1cc" opacity=".9"/></g>
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
    const winHop = pose === "win" ? Math.abs(Math.sin(t * TAU / 1.2)) * 6 : 0;
    q(".m-all").setAttribute("transform", `translate(100 200) translate(0 ${(-hop - winHop).toFixed(2)}) scale(${(sx * br).toFixed(4)} ${(sy * (2 - br)).toFixed(4)}) translate(-100 -200)`);
    const nod = Math.sin(t * TAU / 1.5);
    const tilt = pose === "game" ? nod * 2.4 : pose === "win" ? -4 + nod * 2 : 6 + nod * 1.5;
    q(".m-head").setAttribute("transform", `rotate(${tilt.toFixed(2)} 100 134) translate(0 ${(pose === "game" ? Math.abs(nod) * 1.4 : 0).toFixed(2)})`);
    // pose parts
    const show = (c, on) => q(c).setAttribute("opacity", on ? "1" : "0");
    show(".arm-game", pose === "game"); show(".arm-win", pose === "win"); show(".arm-wink", pose === "wink");
    show(".e-open", pose === "game"); show(".e-happy", pose === "win"); show(".e-wink", pose === "wink");
    show(".mo-focus", pose === "game"); show(".mo-open", pose === "win"); show(".mo-grin", pose === "wink");
    show(".m-gg", pose === "win" && !!opts.gg);
    // brows
    q(".m-brL").setAttribute("d", pose === "game" ? "M65 79 L89 80" : "M65 76 Q77 71 89 75");
    q(".m-brR").setAttribute("d", pose === "game" ? "M111 80 L135 79" : "M111 75 Q123 71 135 76");
    // tablet placement per pose
    const tab = q(".m-tab"), low = q(".m-tablow");
    const game = pose === "game";
    tab.setAttribute("opacity", game ? "1" : "0"); low.setAttribute("opacity", game ? "0" : "1");
    const sway = Math.sin(t * TAU * 4) * .5, bob = Math.abs(nod) * 1.2;
    tab.setAttribute("transform", `translate(${sway.toFixed(2)} ${bob.toFixed(2)})`);
    q(".arm-game").setAttribute("transform", `translate(${sway.toFixed(2)} ${bob.toFixed(2)})`);
    if (game) {
      // left thumb steers the joystick in small circles
      const ja = t * TAU / 1.5, jx = Math.cos(ja) * 3, jy = Math.sin(ja) * 2.4;
      q(".th-l").setAttribute("transform", `translate(${jx.toFixed(2)} ${jy.toFixed(2)})`);
      q(".m-knob").setAttribute("transform", `translate(${jx.toFixed(2)} ${jy.toFixed(2)})`);
      // right thumb taps the skill button every 0.5 s (ripple + flash)
      const tp = frac(t / .5), press = tp < .18 ? Math.sin(tp / .18 * Math.PI) : 0;
      q(".th-r").setAttribute("transform", `translate(${(press * 1.2).toFixed(2)} ${(press * 2.6).toFixed(2)})`);
      const rp = seg(tp, .08, .6);
      const r1 = q(".m-rip"), r2 = q(".m-rip2");
      r1.setAttribute("r", (6 + eOut(rp) * 11).toFixed(2)); r1.setAttribute("opacity", (rp > 0 && rp < 1 ? (1 - rp) * .95 : 0).toFixed(3));
      const rp2 = seg(tp, .14, .7);
      r2.setAttribute("r", (5 + eOut(rp2) * 16).toFixed(2)); r2.setAttribute("opacity", (rp2 > 0 && rp2 < 1 ? (1 - rp2) * .8 : 0).toFixed(3));
      q(".m-sk1").setAttribute("fill", press > .3 ? "#ffffff" : "#ff2346");
      q(".m-flash").setAttribute("opacity", (press * .12).toFixed(3));
      // little fight on the screen
      const hx = Math.sin(t * TAU / 3) * 6;
      q(".m-hero").setAttribute("transform", `translate(${hx.toFixed(2)} 0)`);
      q(".m-foe").setAttribute("opacity", tp < .3 ? "1" : ".55");
      q(".m-hp2").setAttribute("width", (12 - frac(t / 6) * 10).toFixed(2));
      ["m-sk2", "m-sk3"].forEach((c, i) => q("." + c).setAttribute("opacity", (frac(t / 1.5 + i * .5) < .15 ? 1 : .7).toFixed(2)));
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
    q(".m-sglow").setAttribute("stop-opacity", (.35 + .3 * Math.abs(Math.sin(t * TAU / 1.5))).toFixed(3));
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
