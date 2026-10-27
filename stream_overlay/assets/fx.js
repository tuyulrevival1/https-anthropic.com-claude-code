/* SYNO win / lose effects on the overlay.
   WIN  = gold "VICTORY" with light rays, confetti from both bottom corners, WIN card glow.
   LOSE = "DEFEAT" slam with glitch, overlay shake, red edge flash, shockwave, cracks, debris, LOSE card shake.
   Called by overlay.js when wins / losses go up (or the App's test buttons). Optional synth sound. */
(function () {
  "use strict";
  const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a);
  let busy = 0, actx = null;

  // ---------- particles on a canvas the size of the stage ----------
  function particles(layer, W, H, kind) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; layer.appendChild(c);
    const g = c.getContext("2d"), P = [];
    if (kind === "mvp") {
      for (let i = 0; i < 120; i++) P.push({ coin: 1, x: rnd(0, W), y: rnd(-H * .6, -20), vx: rnd(-1.5, 1.5), vy: rnd(4, 11) * (H / 1920 + .4), s: rnd(10, 20), t: rnd(0, 6), d: rnd(0, 40) });
      for (let i = 0; i < 70; i++) { const a = rnd(0, TAU), sp = rnd(6, 22); P.push({ spark: 1, x: W / 2, y: H * .45, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: rnd(3, 7), life: rnd(30, 60), d: rnd(4, 14) }); }
      for (let i = 0; i < 50; i++) P.push({ star: 1, x: rnd(.08, .92) * W, y: rnd(.08, .8) * H, s: rnd(4, 10), d: rnd(10, 120), life: rnd(25, 50) });
    } else if (kind === "win") {
      const cols = ["#ffcf4a", "#fff3b0", "#ff2346", "#ffffff", "#6dffb0", "#ff9a1f"];
      for (const side of [0, 1]) for (let i = 0; i < 110; i++) {
        const a = side ? rnd(200, 250) : rnd(-70, -20), sp = rnd(16, 34) * (W / 1080);
        P.push({ x: side ? W + 10 : -10, y: H * rnd(.72, .86), vx: Math.cos(a * Math.PI / 180) * sp, vy: Math.sin(a * Math.PI / 180) * sp,
          w: rnd(9, 16), h: rnd(14, 26), r: rnd(0, TAU), vr: rnd(-.3, .3), c: cols[i % cols.length], t: rnd(0, 6), d: rnd(0, 8) });
      }
      for (let i = 0; i < 40; i++) P.push({ star: 1, x: rnd(.1, .9) * W, y: rnd(.1, .7) * H, s: rnd(4, 9), d: rnd(0, 50), life: rnd(20, 45) });
    } else {
      for (let i = 0; i < 90; i++) {
        const a = rnd(0, TAU), sp = rnd(8, 26) * (W / 1080);
        P.push({ x: W / 2, y: H * .5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, w: rnd(6, 16), h: rnd(4, 10), r: rnd(0, TAU), vr: rnd(-.4, .4),
          c: i % 3 ? "#2a0a10" : i % 2 ? "#ff2346" : "#5a5a66", t: 0, d: 0 });
      }
      for (let i = 0; i < 50; i++) P.push({ ember: 1, x: W / 2 + rnd(-120, 120), y: H * .5 + rnd(-60, 60), vx: rnd(-3, 3), vy: rnd(-7, -2), s: rnd(2, 4), life: rnd(40, 80), d: 0 });
    }
    let f = 0;
    (function step() {
      f++; g.clearRect(0, 0, W, H);
      for (const p of P) {
        if (p.d > f) continue;
        if (p.star) {
          const k = (f - p.d) / p.life; if (k > 1) continue;
          const a = Math.sin(k * Math.PI), s = p.s * (1 + a);
          g.save(); g.translate(p.x, p.y); g.rotate(k * 2); g.globalAlpha = a; g.fillStyle = "#fff6c8";
          g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? s * .35 : s * 2.2, aa = j * Math.PI / 4; g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } g.closePath(); g.fill(); g.restore();
          continue;
        }
        if (p.coin) {
          p.y += p.vy; p.x += p.vx; p.t += .18; const sx = Math.abs(Math.cos(p.t));
          const fade = Math.max(0, Math.min(1, (230 - f) / 30));
          g.save(); g.translate(p.x, p.y); g.scale(Math.max(.15, sx), 1); g.globalAlpha = fade;
          const gr = g.createRadialGradient(-p.s * .3, -p.s * .3, 1, 0, 0, p.s); gr.addColorStop(0, "#fff6c2"); gr.addColorStop(.5, "#ffcf4a"); gr.addColorStop(1, "#b07800");
          g.fillStyle = gr; g.beginPath(); g.arc(0, 0, p.s, 0, TAU); g.fill();
          g.strokeStyle = "#8a5a00"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, p.s * .62, 0, TAU); g.stroke(); g.restore();
          continue;
        }
        if (p.spark) {
          const k = (f - p.d) / p.life; if (k > 1) continue;
          p.x += p.vx; p.y += p.vy; p.vx *= .94; p.vy *= .94;
          g.globalAlpha = 1 - k; g.fillStyle = k < .4 ? "#ffffff" : "#ffcf4a"; g.beginPath(); g.arc(p.x, p.y, p.s * (1 - k * .6), 0, TAU); g.fill(); g.globalAlpha = 1;
          continue;
        }
        if (p.ember) {
          const k = (f - p.d) / p.life; if (k > 1) continue;
          p.x += p.vx; p.y += p.vy; p.vy += .05;
          g.globalAlpha = 1 - k; g.fillStyle = "#ff6a3d"; g.fillRect(p.x, p.y, p.s, p.s); g.globalAlpha = 1;
          continue;
        }
        p.vy += kind === "win" ? .55 : .7; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.t += .15;
        const fade = Math.max(0, Math.min(1, (kind === "win" ? 150 : 90) - f) / 30);
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = fade;
        g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.t)), p.w, p.h * Math.abs(Math.cos(p.t)) + 1);
        g.restore();
      }
      if (f < (kind === "mvp" ? 240 : kind === "win" ? 180 : 110)) requestAnimationFrame(step); else c.remove();
    })();
  }

  // ---------- optional synth sound (no files) ----------
  function sound(kind) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, out = actx.createGain(); out.gain.value = .35; out.connect(actx.destination);
      if (kind === "mvp") {
        // whoosh, brass fanfare (G C E G - big C chord), then bells
        const n = actx.createBuffer(1, actx.sampleRate * .45, actx.sampleRate), d = n.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length);
        const ns = actx.createBufferSource(), bp = actx.createBiquadFilter(), nv = actx.createGain(); bp.type = "bandpass"; bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(3000, t + .4); nv.gain.value = .5;
        ns.buffer = n; ns.connect(bp).connect(nv).connect(out); ns.start(t);
        const brass = (fq, at, len, vol) => {
          const o1 = actx.createOscillator(), o2 = actx.createOscillator(), lp = actx.createBiquadFilter(), v = actx.createGain();
          o1.type = "sawtooth"; o2.type = "sawtooth"; o1.frequency.value = fq; o2.frequency.value = fq * 1.006;
          lp.type = "lowpass"; lp.frequency.setValueAtTime(600, t + at); lp.frequency.linearRampToValueAtTime(2600, t + at + .08);
          v.gain.setValueAtTime(0, t + at); v.gain.linearRampToValueAtTime(vol, t + at + .04); v.gain.setValueAtTime(vol, t + at + len - .1); v.gain.exponentialRampToValueAtTime(.001, t + at + len + .4);
          o1.connect(lp); o2.connect(lp); lp.connect(v).connect(out); o1.start(t + at); o2.start(t + at); o1.stop(t + at + len + .5); o2.stop(t + at + len + .5);
        };
        brass(392, .30, .14, .22); brass(523.25, .46, .14, .22); brass(659.25, .62, .14, .22);
        [523.25, 659.25, 783.99, 1046.5].forEach(fq => brass(fq, .80, 1.1, .16));
        [2093, 2637, 3136, 4186].forEach((fq, i) => {
          const o = actx.createOscillator(), v = actx.createGain(); o.type = "sine"; o.frequency.value = fq;
          v.gain.setValueAtTime(0, t + .85 + i * .12); v.gain.linearRampToValueAtTime(.18, t + .86 + i * .12); v.gain.exponentialRampToValueAtTime(.001, t + 1.6 + i * .12);
          o.connect(v).connect(out); o.start(t + .85 + i * .12); o.stop(t + 1.7 + i * .12);
        });
      } else if (kind === "win") {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((fq, i) => {
          const o = actx.createOscillator(), v = actx.createGain(); o.type = "triangle"; o.frequency.value = fq;
          v.gain.setValueAtTime(0, t + i * .09); v.gain.linearRampToValueAtTime(.5, t + i * .09 + .02); v.gain.exponentialRampToValueAtTime(.001, t + i * .09 + .6);
          o.connect(v).connect(out); o.start(t + i * .09); o.stop(t + i * .09 + .7);
        });
      } else {
        const o = actx.createOscillator(), v = actx.createGain(); o.type = "sine";
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(32, t + .7);
        v.gain.setValueAtTime(.9, t); v.gain.exponentialRampToValueAtTime(.001, t + .9); o.connect(v).connect(out); o.start(t); o.stop(t + 1);
        const n = actx.createBuffer(1, actx.sampleRate * .5, actx.sampleRate), d = n.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
        const ns = actx.createBufferSource(), nv = actx.createGain(), lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
        ns.buffer = n; nv.gain.value = .6; ns.connect(lp).connect(nv).connect(out); ns.start(t);
      }
    } catch (e) {}
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // stage: .ov-stage, L: layout, s: state
  function play(kind, stage, L, s) {
    if (!stage || (kind !== "mvp" && Date.now() - busy < 900)) return; busy = Date.now();
    const W = L.w || 1080, H = L.h || 1920;
    const game = (L.slots || []).find(x => x.id === "game") || { x: 0, y: 0, w: W, h: H };
    const cx = game.x + game.w / 2, cy = game.y + game.h / 2, big = Math.round(Math.min(game.w * .19, 190));
    const layer = document.createElement("div"); layer.className = "fx-layer fx-" + kind;
    const streak = Math.abs(s.streak || 0);
    if (kind === "mvp") {
      const info = s._mvp || {}, n = +info.cur || 1, mile = n === 5 || n === 15;
      const crown = `<svg class="fx-crown" viewBox="0 0 120 80"><defs><linearGradient id="fxcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c2"/><stop offset=".5" stop-color="#ffcf4a"/><stop offset="1" stop-color="#c47f00"/></linearGradient></defs>
<path d="M8 70 L14 22 L38 46 L60 8 L82 46 L106 22 L112 70 Z" fill="url(#fxcg)" stroke="#6b3a00" stroke-width="4" stroke-linejoin="round"/><rect x="8" y="66" width="104" height="10" rx="3" fill="#ffcf4a" stroke="#6b3a00" stroke-width="3"/>
<circle cx="60" cy="8" r="7" fill="#ff2346" stroke="#6b3a00" stroke-width="3"/><circle cx="14" cy="22" r="6" fill="#b388ff" stroke="#6b3a00" stroke-width="3"/><circle cx="106" cy="22" r="6" fill="#b388ff" stroke="#6b3a00" stroke-width="3"/><circle cx="60" cy="50" r="7" fill="#4fc3f7" stroke="#6b3a00" stroke-width="3"/></svg>`;
      layer.innerHTML = `<div class="fx-dim"></div><div class="fx-spot l"></div><div class="fx-spot r"></div>
<div class="fx-rays mvp" style="left:${cx}px;top:${cy}px;width:${big * 7}px;height:${big * 7}px"></div>
<div class="fx-mvpbox" style="left:${cx}px;top:${cy}px">${crown}<b style="font-size:${Math.round(big * 1.35)}px">MVP</b>
<div class="fx-ribbon"><span>${info.role && window.SYNO_ROLES ? SYNO_ROLES.badge(info.role) : ""}${esc(info.name || "MVP")}</span></div>
<div class="fx-count">MVP KE-<i data-n="${n}">${Math.max(0, n - 1)}</i></div>
${mile ? `<div class="fx-mile">🎁 CUKUP ${n} MVP · CLAIM SKIN!</div>` : info.free ? `<div class="fx-mile vv">★ VVIP · FREE 1 GAME</div>` : ""}</div>`;
      // count up to the new number
      const ci = layer.querySelector(".fx-count i"); setTimeout(() => { if (ci) { ci.textContent = n; ci.classList.add("pop"); } }, 1350);
    } else if (kind === "win") {
      layer.innerHTML = `<div class="fx-rays" style="left:${cx}px;top:${cy}px;width:${big * 6}px;height:${big * 6}px"></div>
<div class="fx-title" style="left:${cx}px;top:${cy}px"><b style="font-size:${big}px">VICTORY</b><span>MENANG · ${esc(s.wins)} WIN${streak >= 2 && s.streak > 0 ? ` · 🔥 WIN STREAK ${streak}` : ""}</span></div>`;
    } else {
      const cracks = Array.from({ length: 9 }, (_, i) => {
        let a = i / 9 * TAU + rnd(-.2, .2), x = cx, y = cy, d = `M${cx} ${cy}`;
        for (let j = 0; j < 5; j++) { x += Math.cos(a) * rnd(60, 120); y += Math.sin(a) * rnd(60, 120); a += rnd(-.4, .4); d += `L${x.toFixed(0)} ${y.toFixed(0)}`; }
        return `<path d="${d}"/>`;
      }).join("");
      layer.innerHTML = `<div class="fx-flash"></div><div class="fx-vig"></div>
<svg class="fx-cracks" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${cracks}</svg>
<div class="fx-ring" style="left:${cx}px;top:${cy}px"></div>
<div class="fx-title" style="left:${cx}px;top:${cy}px"><b data-t="DEFEAT" style="font-size:${big}px">DEFEAT</b><span>KALAH · ${esc(s.losses)} LOSE${streak >= 2 && s.streak < 0 ? ` · LOSE STREAK ${streak}` : ""}</span></div>`;
      stage.classList.remove("fx-shake"); void stage.offsetWidth; stage.classList.add("fx-shake");
      setTimeout(() => stage.classList.remove("fx-shake"), 800);
    }
    stage.appendChild(layer);
    particles(layer, W, H, kind);
    const card = kind === "mvp" ? null : stage.querySelector(".ov-score");
    if (card) { card.classList.remove("fx-hit-win", "fx-hit-lose"); void card.offsetWidth; card.classList.add("fx-hit-" + kind); setTimeout(() => card.classList.remove("fx-hit-" + kind), 1200); }
    if (s.fxSound !== false) sound(kind);
    setTimeout(() => layer.remove(), kind === "mvp" ? 4400 : kind === "win" ? 3200 : 2600);
  }

  // ---------- MLBB kill announcements (auto from the PC screen reader, or Stream Deck / App) ----------
  // Every kill has its own look: intro = how the word lands, bg = backdrop pieces, icon, parts = particles, snd = sound.
  // lvl 1..4 = how hard it hits. dur = ms on screen.
  const KILL = {
    solo:        { t: "SOLO KILL",     sub: "1 VS 1",  a: "#dff4ff", b: "#0b3550", lvl: 2, intro: "cut",     bg: ["cut"],                     icon: "blade",  parts: "steel",   dur: 2600 },
    first:       { t: "FIRST BLOOD",                   a: "#ff2346", b: "#4a0010", lvl: 2, intro: "slam",    bg: ["blood"],                   icon: "drop",   parts: "blood",   dur: 2800 },
    double:      { t: "DOUBLE KILL",                   a: "#4fc3f7", b: "#08385a", lvl: 1, intro: "echo",    bg: ["flash", "slash2"],         icon: "x2",     parts: "spark",   dur: 2500, echo: 1 },
    triple:      { t: "TRIPLE KILL",                   a: "#b388ff", b: "#2e1260", lvl: 2, intro: "echo",    bg: ["flash", "claws"],          icon: "x3",     parts: "spark",   dur: 2600, echo: 2 },
    maniac:      { t: "MANIAC",                        a: "#d46bff", b: "#40085e", lvl: 3, intro: "glitch",  bg: ["dim", "bolts"],            icon: "bolt",   parts: "electric", dur: 2800 },
    savage:      { t: "SAVAGE",                        a: "#ff6a1f", b: "#701000", lvl: 4, intro: "burn",    bg: ["dim", "heat"],             icon: "horns",  parts: "fire",    dur: 3200 },
    shutdown:    { t: "SHUT DOWN",                     a: "#8ee9ff", b: "#06324a", lvl: 2, intro: "freeze",  bg: ["crt", "frost"],            icon: "power",  parts: "ice",     dur: 2800 },
    spree:       { t: "KILLING SPREE",                 a: "#ffcf4a", b: "#6b4300", lvl: 1, intro: "zoom",    bg: ["speed"],                   icon: "streak", parts: "spark",   dur: 2500 },
    monster:     { t: "MONSTER KILL",                  a: "#7dff4a", b: "#0f4a00", lvl: 2, intro: "stomp",   bg: ["dim", "claws", "cracks"],  icon: "eye",    parts: "debris",  dur: 2800, shakeAt: 380 },
    mega:        { t: "MEGA KILL",                     a: "#ffb02e", b: "#6b3a00", lvl: 3, intro: "blast",   bg: ["white", "rings"],          icon: "bomb",   parts: "debris",  dur: 2800 },
    unstoppable: { t: "UNSTOPPABLE",                   a: "#ff5a7a", b: "#5a0020", lvl: 3, intro: "rush",    bg: ["hspeed"],                  icon: "arrow",  parts: "streak",  dur: 2700 },
    godlike:     { t: "GODLIKE",                       a: "#ffe680", b: "#6b5200", lvl: 3, intro: "rise",    bg: ["heaven"],                  icon: "halo",   parts: "feather", dur: 3400, shake: 0 },
    legendary:   { t: "LEGENDARY",                     a: "#ffcf4a", b: "#4a1a7a", lvl: 4, intro: "letters", bg: ["dim", "sunburst"],         icon: "crown",  parts: "gold",    dur: 3600 },
    rampage:     { t: "RAMPAGE",                       a: "#ff3d3d", b: "#5a0000", lvl: 4, intro: "tremble", bg: ["redpulse"],                icon: "fist",   parts: "embers",  dur: 3200, shake: "r" },
    wiped:       { t: "WIPED OUT",     sub: "ACE",     a: "#ff2346", b: "#14000a", lvl: 4, intro: "shatter", bg: ["dark", "glass", "bolts"],  icon: "skull",  parts: "shards",  dur: 3600 }
  };

  // ---------- sounds (synth, no files) + announcer voice ----------
  function kAudio() { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); return actx; }
  function noiseBuf(sec, shape) {
    const A = kAudio(), n = A.createBuffer(1, Math.max(1, A.sampleRate * sec | 0), A.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (shape ? shape(i / d.length) : 1);
    return n;
  }
  const curves = {};
  function driveCurve(k) { if (curves[k]) return curves[k]; const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / n * 2 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return (curves[k] = c); }
  function env(g, t, a, peak, dur) { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
  const S = {
    noise(out, t, sec, type, f0, f1, vol, q, shape, pan) {
      const A = kAudio(), src = A.createBufferSource(), f = A.createBiquadFilter(), v = A.createGain();
      src.buffer = noiseBuf(sec, shape || (x => Math.sin(Math.PI * x))); f.type = type; f.Q.value = q || 1;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + sec); v.gain.value = vol;
      let node = src.connect(f).connect(v);
      if (pan != null && A.createStereoPanner) { const p = A.createStereoPanner(); p.pan.setValueAtTime(pan, t); p.pan.linearRampToValueAtTime(-pan, t + sec); node = node.connect(p); }
      node.connect(out); src.start(t);
    },
    tone(out, t, type, f0, f1, sec, vol, att) {
      const A = kAudio(), o = A.createOscillator(), v = A.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + sec);
      env(v, t, att || .01, vol, sec); o.connect(v).connect(out); o.start(t); o.stop(t + sec + .05);
    },
    swish(out, t, hi, lo, sec, vol, pan) { S.noise(out, t, sec || .3, "bandpass", hi || 5000, lo || 600, vol || .8, 2, null, pan); },
    boom(out, t, vol, len) { S.tone(out, t, "sine", 70, 24, len || 1.4, vol || 1); S.noise(out, t, (len || 1.4) * .8, "lowpass", 2600, 50, (vol || 1) * .9, 1, x => Math.pow(1 - x, 2.2)); },
    // metallic bell (FM)
    bell(out, t, f, dur, vol, ratio) {
      const A = kAudio(), c = A.createOscillator(), m = A.createOscillator(), mg = A.createGain(), v = A.createGain();
      c.frequency.value = f; m.frequency.value = f * (ratio || 3.5); mg.gain.setValueAtTime(f * 2.5, t); mg.gain.exponentialRampToValueAtTime(f * .05, t + dur);
      m.connect(mg).connect(c.frequency); env(v, t, .004, vol, dur); c.connect(v).connect(out); c.start(t); m.start(t); c.stop(t + dur + .05); m.stop(t + dur + .05);
    },
    pluck(out, t, f, dur, vol) {
      const A = kAudio(), o = A.createOscillator(), lp = A.createBiquadFilter(), v = A.createGain(); o.type = "sawtooth"; o.frequency.value = f;
      lp.type = "lowpass"; lp.Q.value = 6; lp.frequency.setValueAtTime(f * 8, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + dur);
      env(v, t, .005, vol, dur); o.connect(lp).connect(v).connect(out); o.start(t); o.stop(t + dur + .05);
    },
    brass(out, t, f, dur, vol) {
      const A = kAudio(), lp = A.createBiquadFilter(), v = A.createGain(); lp.type = "lowpass"; lp.Q.value = 2;
      lp.frequency.setValueAtTime(f * 1.5, t); lp.frequency.linearRampToValueAtTime(f * 7, t + .08); lp.frequency.exponentialRampToValueAtTime(f * 3, t + dur);
      [1, 1.007, .993].forEach(d => { const o = A.createOscillator(); o.type = "sawtooth"; o.frequency.value = f * d; o.connect(lp); o.start(t); o.stop(t + dur + .05); });
      v.gain.setValueAtTime(.0001, t); v.gain.linearRampToValueAtTime(vol, t + .05); v.gain.setValueAtTime(vol, t + dur * .7); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
      lp.connect(v).connect(out);
    },
    drum(out, t, f, vol) { S.tone(out, t, "sine", f, f * .45, .35, vol); S.noise(out, t, .07, "lowpass", 1800, 400, vol * .5, 1, x => 1 - x); },
    snare(out, t, vol) { S.noise(out, t, .22, "highpass", 1800, 1500, vol, 1, x => Math.pow(1 - x, 2)); S.tone(out, t, "triangle", 220, 160, .12, vol * .5); },
    // "aah" choir: sawtooth through vowel formants, with vibrato
    choir(out, t, f, dur, vol) {
      const A = kAudio(), o = A.createOscillator(), lfo = A.createOscillator(), lg = A.createGain(), v = A.createGain(); o.type = "sawtooth"; o.frequency.value = f;
      lfo.frequency.value = 5.2; lg.gain.value = f * .012; lfo.connect(lg).connect(o.frequency);
      [[800, 1], [1150, .6], [2900, .25]].forEach(([fq, g]) => { const b = A.createBiquadFilter(), bg = A.createGain(); b.type = "bandpass"; b.frequency.value = fq; b.Q.value = 8; bg.gain.value = g; o.connect(b).connect(bg).connect(v); });
      v.gain.setValueAtTime(.0001, t); v.gain.linearRampToValueAtTime(vol, t + .4); v.gain.setValueAtTime(vol, t + dur * .7); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
      v.connect(out); o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
    },
    // distorted low growl / roar
    growl(out, t, f0, f1, dur, vol, trem) {
      const A = kAudio(), o = A.createOscillator(), ws = A.createWaveShaper(), lp = A.createBiquadFilter(), v = A.createGain(), am = A.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); ws.curve = driveCurve(30); lp.type = "lowpass"; lp.frequency.value = 900;
      if (trem) { const l = A.createOscillator(), lg = A.createGain(); l.frequency.value = trem; lg.gain.value = .5; am.gain.value = .5; l.connect(lg).connect(am.gain); l.start(t); l.stop(t + dur + .05); }
      env(v, t, .08, vol, dur); o.connect(ws).connect(lp).connect(am).connect(v).connect(out); o.start(t); o.stop(t + dur + .05);
      S.noise(out, t, dur, "bandpass", 500, 200, vol * .6, 1.2, x => Math.min(1, x * 8) * (1 - x));
    },
    zap(out, t, vol) { S.tone(out, t, "square", rnd(1600, 2600), rnd(60, 120), .14, vol); },
    crackle(out, t, sec, vol) {
      const A = kAudio(), src = A.createBufferSource(), f = A.createBiquadFilter(), v = A.createGain();
      src.buffer = noiseBuf(sec, x => (Math.random() < .06 ? 1 : .04) * (1 - x)); f.type = "highpass"; f.frequency.value = 1800; v.gain.value = vol;
      src.connect(f).connect(v).connect(out); src.start(t);
    },
    glass(out, t, vol) { for (let i = 0; i < 16; i++) S.bell(out, t + Math.random() * .3, rnd(2800, 6500), rnd(.2, .6), vol * rnd(.3, 1), 1.41); S.noise(out, t, .3, "highpass", 5000, 3000, vol * 3, 1, x => 1 - x); },
    gong(out, t, vol) { [98, 147, 209, 286, 391, 523].forEach((fq, i) => S.tone(out, t, "sine", fq * 1.02, fq, 3.2 - i * .35, vol * (1 - i * .13), .006)); S.noise(out, t, .4, "bandpass", 600, 300, vol * .4, 2, x => 1 - x); }
  };
  // master bus: compressor so stacked layers stay loud but clean
  function bus(vol) {
    const A = kAudio(), g = A.createGain(), c = A.createDynamicsCompressor(); g.gain.value = vol;
    c.threshold.value = -16; c.knee.value = 8; c.ratio.value = 5; c.attack.value = .003; c.release.value = .2;
    g.connect(c).connect(A.destination); return g;
  }
  // each kill has its own sound identity
  const SND = {
    solo(o, t) { S.swish(o, t, 10000, 3000, .14, .9, .9); S.bell(o, t + .04, 2637, 1.8, .22, 2.76); S.bell(o, t + .05, 3951, 1.4, .12, 2.76); S.tone(o, t + .04, "sine", 5274, 5274, 1.2, .05, .002); },
    first(o, t) { S.drum(o, t, 70, .9); S.drum(o, t + .26, 62, .8); S.noise(o, t + .5, .4, "lowpass", 1200, 150, .9, 4, x => Math.pow(1 - x, 1.5)); [220, 233, 311].forEach(f => S.pluck(o, t + .55, f, 1.6, .16)); S.swish(o, t + .48, 6000, 700, .2, .6); },
    double(o, t) { S.swish(o, t, 7000, 1200, .15, .7, .8); S.bell(o, t + .05, 1319, .9, .3, 2); S.swish(o, t + .2, 7000, 1200, .15, .7, -.8); S.bell(o, t + .25, 1976, 1.3, .32, 2); S.drum(o, t + .25, 130, .6); },
    triple(o, t) { [523, 659, 784].forEach((f, i) => { S.swish(o, t + i * .13, 8000, 1500, .12, .6); S.pluck(o, t + i * .13 + .03, f, .5, .3); }); S.bell(o, t + .42, 2093, 1.4, .25, 2); S.snare(o, t + .42, .6); },
    maniac(o, t) { for (let i = 0; i < 7; i++) S.zap(o, t + i * .09 + rnd(0, .03), .14); S.crackle(o, t, 1.3, 1.4); S.growl(o, t + .1, 140, 70, 1, .25, 9); S.drum(o, t + .05, 110, .7); },
    savage(o, t) { S.boom(o, t, 1, 1.6); S.growl(o, t + .08, 95, 38, 1.7, .55); S.crackle(o, t + .2, 1.6, 1); S.brass(o, t + .1, 98, 1.3, .12); },
    shutdown(o, t) { S.tone(o, t, "sawtooth", 1300, 28, 1.1, .2); S.tone(o, t, "sine", 650, 20, 1.1, .3); S.noise(o, t + 1.05, .05, "highpass", 3000, 3000, .8, 1, x => 1 - x); S.glass(o, t + .2, .12); },
    spree(o, t) { S.noise(o, t, .55, "bandpass", 250, 6000, 1, 4, x => x * x); S.tone(o, t, "sawtooth", 200, 1200, .55, .08); S.snare(o, t + .55, .9); [523, 659, 784, 1047].forEach(f => S.pluck(o, t + .56, f, .8, .12)); },
    monster(o, t) { S.growl(o, t, 60, 42, 1.4, .6, 16); S.boom(o, t + .3, .9, .8); S.boom(o, t + .75, .8, .9); },
    mega(o, t) { S.boom(o, t, 1.2, 2.2); S.noise(o, t, 2, "lowpass", 5000, 40, .8, 1, x => Math.pow(1 - x, 1.4)); S.crackle(o, t + .15, 1.2, .9); S.tone(o, t, "sine", 40, 30, 2.2, .7, .02); },
    unstoppable(o, t) {
      const A = kAudio(), e = A.createOscillator(), l = A.createOscillator(), lg = A.createGain(), am = A.createGain(), lp = A.createBiquadFilter(), v = A.createGain(), p = A.createStereoPanner ? A.createStereoPanner() : A.createGain();
      e.type = "sawtooth"; e.frequency.setValueAtTime(55, t); e.frequency.exponentialRampToValueAtTime(190, t + .7); l.frequency.setValueAtTime(25, t); l.frequency.linearRampToValueAtTime(60, t + .7); lg.gain.value = .5; am.gain.value = .5;
      lp.type = "lowpass"; lp.frequency.value = 1400; env(v, t, .1, .5, 1); if (p.pan) { p.pan.setValueAtTime(.9, t); p.pan.linearRampToValueAtTime(-.9, t + .9); }
      l.connect(lg).connect(am.gain); e.connect(lp).connect(am).connect(v).connect(p).connect(o); e.start(t); l.start(t); e.stop(t + 1.05); l.stop(t + 1.05);
      S.swish(o, t + .6, 3000, 300, .45, 1, .9); S.boom(o, t + .65, .8, .9);
    },
    godlike(o, t) { [220, 277.2, 329.6, 440].forEach(f => S.choir(o, t + .05, f, 2.8, .1)); S.choir(o, t + .3, 659.3, 2.4, .05); [1760, 2217, 2637, 3520].forEach((f, i) => S.bell(o, t + .7 + i * .12, f, 1.6, .07, 3)); S.noise(o, t, 2.4, "bandpass", 3000, 8000, .12, 6); },
    legendary(o, t) { const n = [[392, 0, .16], [523.3, .17, .16], [659.3, .34, .16], [784, .51, 1.3]]; n.forEach(([f, d, l]) => { S.brass(o, t + d, f, l, .13); S.brass(o, t + d, f / 2, l, .09); });
      [0, .51].forEach(d => S.drum(o, t + d, 90, 1)); S.noise(o, t + .51, 2, "highpass", 6000, 4000, .35, 1, x => Math.pow(1 - x, 1.5)); S.bell(o, t + .55, 3136, 1.6, .06); },
    rampage(o, t) { [0, .24, .44, .6, .73, .84, .93, 1, 1.06].forEach((d, i) => S.drum(o, t + d, i % 2 ? 95 : 70, .9)); S.growl(o, t + 1.08, 110, 45, 1.3, .55, 0); S.noise(o, t + 1.08, .5, "bandpass", 900, 600, .8, 3, x => Math.min(1, x * 10) * (1 - x)); S.boom(o, t + 1.08, 1, 1.2); },
    wiped(o, t) { S.gong(o, t, .5); S.glass(o, t + .08, .14); S.tone(o, t, "sine", 90, 26, 2.4, .8); S.tone(o, t + 1.2, "sine", 1000, 1000, 1.6, .06, .01); }
  };
  // announcer voice: data\voice\<kill>.wav made by the PC server (Windows voice), made deep and heavy here.
  // Without the server (preview) the browser's own voice is used.
  const VOICE = {}; let impulse = null;
  function loadVoice(type) {
    if (!VOICE[type]) VOICE[type] = fetch("voice/" + type + ".wav").then(r => r.ok && /audio|wav|octet/.test(r.headers.get("content-type") || "") ? r.arrayBuffer() : null)
      .then(b => b ? new Promise(res => kAudio().decodeAudioData(b, res, () => res(null))) : null).catch(() => null);
    return VOICE[type];
  }
  function reverbIR(sec) { const A = kAudio(), n = A.sampleRate * sec | 0, b = A.createBuffer(2, n, A.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); } return b; }
  const VTXT = { solo: "Solo kill!", first: "First blood!", double: "Double kill!", triple: "Triple kill!", maniac: "Maniac!", savage: "Savage!", shutdown: "Shut down!", spree: "Killing spree!", monster: "Monster kill!", mega: "Mega kill!", unstoppable: "Unstoppable!", godlike: "God like!", legendary: "Legendary!", rampage: "Rampage!", wiped: "Wiped out!" };
  function browserVoice(type) {
    try {
      const sy = window.speechSynthesis; if (!sy) return;
      const u = new SpeechSynthesisUtterance(VTXT[type] || type), vs = sy.getVoices().filter(v => /^en/i.test(v.lang));
      u.voice = vs.find(v => /male|david|guy|daniel|george|mark/i.test(v.name) && !/female/i.test(v.name)) || vs[0] || null; u.pitch = 1.15; u.rate = 1.15; u.volume = 1;
      sy.cancel(); sy.speak(u);
    } catch (e) {}
  }
  // crowd roar that swells with the announcer (many voices = filtered noise bands that wobble, plus "wooo" shouts)
  function crowd(t, dur, vol) {
    const A = kAudio(), out = A.createGain(); out.connect(A.destination);
    out.gain.setValueAtTime(.0001, t); out.gain.linearRampToValueAtTime(vol, t + .45); out.gain.setValueAtTime(vol, t + dur * .45); out.gain.exponentialRampToValueAtTime(.0001, t + dur);
    for (let i = 0; i < 6; i++) {
      const src = A.createBufferSource(), bp = A.createBiquadFilter(), g = A.createGain(), lfo = A.createOscillator(), lg = A.createGain();
      src.buffer = noiseBuf(dur + .1); bp.type = "bandpass"; bp.frequency.value = rnd(450, 2600); bp.Q.value = 1.1;
      lfo.frequency.value = rnd(2.5, 8); lg.gain.value = .35; g.gain.value = .55; lfo.connect(lg).connect(g.gain);
      let n = src.connect(bp).connect(g); if (A.createStereoPanner) { const p = A.createStereoPanner(); p.pan.value = rnd(-.9, .9); n = n.connect(p); }
      n.connect(out); src.start(t); lfo.start(t); src.stop(t + dur + .1); lfo.stop(t + dur + .1);
    }
    for (let i = 0; i < 5; i++) {   // "woooo!"
      const o = A.createOscillator(), f1 = A.createBiquadFilter(), f2 = A.createBiquadFilter(), g = A.createGain(), d = rnd(.1, .5), f0 = rnd(230, 380);
      o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t + d); o.frequency.linearRampToValueAtTime(f0 * rnd(1.25, 1.5), t + d + .5); o.frequency.linearRampToValueAtTime(f0 * 1.1, t + d + 1.4);
      f1.type = "bandpass"; f1.frequency.value = 350; f1.Q.value = 5; f2.type = "bandpass"; f2.frequency.value = 900; f2.Q.value = 6;
      env(g, t + d, .2, .05, 1.5); o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(out); o.start(t + d); o.stop(t + d + 1.6);
    }
  }
  function speak(type, delay) {
    loadVoice(type).then(buf => {
      if (!buf) return browserVoice(type);
      const A = kAudio(), t = A.currentTime + (delay || 0);
      // bright, hyped arena announcer: normal speed (no slow-down), body + presence + air, hard compression
      const mix = A.createGain(); mix.gain.value = 1.1;
      const hp = A.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 85;
      const body = A.createBiquadFilter(); body.type = "peaking"; body.frequency.value = 230; body.Q.value = 1; body.gain.value = 3;
      const pres = A.createBiquadFilter(); pres.type = "peaking"; pres.frequency.value = 3200; pres.Q.value = .9; pres.gain.value = 7;
      const air = A.createBiquadFilter(); air.type = "highshelf"; air.frequency.value = 8500; air.gain.value = 4;
      const ws = A.createWaveShaper(); ws.curve = driveCurve(3.5); ws.oversample = "4x";
      const comp = A.createDynamicsCompressor(); comp.threshold.value = -24; comp.knee.value = 4; comp.ratio.value = 10; comp.attack.value = .002; comp.release.value = .12;
      const out = A.createGain(); out.gain.value = 1.35;
      // two copies a hair apart = wide, thick "stadium PA" voice
      [[1.02, 0, -.3], [1.008, .014, .3]].forEach(([rate, dl, pan]) => {
        const src = A.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
        let n = src; if (A.createStereoPanner) { const p = A.createStereoPanner(); p.pan.value = pan; n = src.connect(p); }
        n.connect(mix); src.start(t + dl);
      });
      mix.connect(hp).connect(ws).connect(body).connect(pres).connect(air).connect(comp).connect(out).connect(A.destination);
      // stadium echo ("KILL... kill... kill") + arena reverb
      const d = A.createDelay(1), fb = A.createGain(), el = A.createBiquadFilter(), dw = A.createGain();
      d.delayTime.value = .23; fb.gain.value = .38; el.type = "bandpass"; el.frequency.value = 1500; el.Q.value = .6; dw.gain.value = .42;
      out.connect(d); d.connect(el).connect(fb).connect(d); el.connect(dw).connect(A.destination);
      impulse = impulse || reverbIR(2.2);
      const conv = A.createConvolver(), wet = A.createGain(); conv.buffer = impulse; wet.gain.value = .3; out.connect(conv).connect(wet).connect(A.destination);
      crowd(t - .05, Math.max(2.4, buf.duration + 1.8), .16);
    });
  }
  function killSound(type, k, voice) {
    try {
      const A = kAudio(); if (A.state === "suspended") A.resume();
      const o = bus(voice ? .5 + k.lvl * .04 : .6 + k.lvl * .05); (SND[type] || SND.double)(o, A.currentTime + .02);
      if (voice) speak(type, .05);
    } catch (e) {}
  }
  // load all voices once so a kill speaks instantly
  if (/^https?:$/.test(location.protocol)) setTimeout(() => { if (window.ChouOverlay || document.querySelector(".ov-stage")) Object.keys(VTXT).forEach(loadVoice); }, 2500);

  // ---------- icons (120x120) ----------
  function kIcon(k) {
    const a = k.a, b = k.b, ink = `fill="#fff" stroke="${b}" stroke-width="4" stroke-linejoin="round"`;
    const star = n => { let d = ""; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? 26 : 56, an = i * Math.PI / n - Math.PI / 2; d += (i ? "L" : "M") + (60 + Math.cos(an) * r).toFixed(1) + " " + (60 + Math.sin(an) * r).toFixed(1); } return d + "Z"; };
    const I = {
      blade: `<g transform="rotate(40 60 60)"><path d="M60 2 L69 18 L65 82 L55 82 L51 18 Z" ${ink}/><path d="M60 10 V78" stroke="${a}" stroke-width="3"/><rect x="38" y="82" width="44" height="9" rx="4" fill="${a}" stroke="${b}" stroke-width="3"/><rect x="55" y="91" width="10" height="20" rx="3" ${ink}/><circle cx="60" cy="114" r="6" fill="${a}"/></g>`,
      drop: `<path d="M60 6 C60 6 22 52 22 76 A38 38 0 0 0 98 76 C98 52 60 6 60 6 Z" fill="${a}" stroke="#fff" stroke-width="5"/><ellipse cx="46" cy="76" rx="8" ry="14" fill="#fff" opacity=".75" transform="rotate(20 46 76)"/>`,
      x2: `<path d="M60 4 L108 32 V88 L60 116 L12 88 V32 Z" fill="${b}" stroke="${a}" stroke-width="6"/><text x="60" y="80" text-anchor="middle" style="font:56px var(--f-disp)" fill="#fff">×2</text>`,
      x3: `<path d="M60 4 L108 32 V88 L60 116 L12 88 V32 Z" fill="${b}" stroke="${a}" stroke-width="6"/><text x="60" y="80" text-anchor="middle" style="font:56px var(--f-disp)" fill="#fff">×3</text>`,
      bolt: `<path d="M70 4 L26 66 L54 66 L42 116 L94 46 L64 46 L80 4 Z" fill="#fff" stroke="${a}" stroke-width="5" stroke-linejoin="round"/>`,
      horns: `<path d="M30 66 C8 48 10 18 24 4 C26 28 40 44 54 54 Z" fill="${a}" stroke="#fff" stroke-width="3"/><path d="M90 66 C112 48 110 18 96 4 C94 28 80 44 66 54 Z" fill="${a}" stroke="#fff" stroke-width="3"/><path d="M34 58 Q60 46 86 58 L82 98 Q60 116 38 98 Z" fill="#1a0500" stroke="${a}" stroke-width="4"/><path d="M42 72 L56 80 L43 84 Z M78 72 L64 80 L77 84 Z" fill="#ffe08a"/>`,
      power: `<path d="M36 30 A38 38 0 1 0 84 30" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/><path d="M60 8 V58" stroke="#fff" stroke-width="13" stroke-linecap="round"/>`,
      streak: `<path d="M10 28 L40 60 L10 92 M42 28 L72 60 L42 92 M74 28 L104 60 L74 92" fill="none" stroke="#fff" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>`,
      eye: `<path d="M6 60 Q60 4 114 60 Q60 116 6 60 Z" fill="${a}" stroke="#fff" stroke-width="4"/><ellipse cx="60" cy="60" rx="10" ry="32" fill="#050a02"/><circle cx="66" cy="46" r="5" fill="#fff"/>`,
      bomb: `<path d="${star(12)}" fill="${a}" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><circle cx="60" cy="60" r="18" fill="#fff"/>`,
      arrow: `<path d="M24 42 H64 V20 L110 60 L64 100 V78 H24 Z" ${ink}/><path d="M2 48 H16 M0 60 H16 M2 72 H16" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
      halo: `<ellipse cx="60" cy="20" rx="26" ry="8" fill="none" stroke="${a}" stroke-width="6"/><g><path d="M56 52 C40 30 14 28 2 40 C14 44 20 50 22 58 C12 58 6 64 4 72 C18 70 28 74 32 84 C44 76 54 68 56 52 Z" ${ink}/></g><path d="M64 52 C80 30 106 28 118 40 C106 44 100 50 98 58 C108 58 114 64 116 72 C102 70 92 74 88 84 C76 76 66 68 64 52 Z" ${ink}/><circle cx="60" cy="62" r="10" fill="${a}"/>`,
      crown: `<path d="M14 92 L8 32 L36 58 L60 14 L84 58 L112 32 L106 92 Z" fill="${a}" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><rect x="14" y="92" width="92" height="14" rx="4" fill="#fff"/><circle cx="60" cy="72" r="8" fill="${b}"/><circle cx="34" cy="78" r="5" fill="${b}"/><circle cx="86" cy="78" r="5" fill="${b}"/>`,
      fist: `<rect x="26" y="30" width="70" height="54" rx="14" ${ink}/><path d="M44 32 V54 M61 32 V54 M78 32 V54" stroke="${b}" stroke-width="5"/><path d="M24 58 Q48 54 60 66 Q50 78 28 76 Z" fill="${a}" stroke="#fff" stroke-width="3"/><rect x="38" y="84" width="46" height="24" rx="4" ${ink}/><path d="M8 20 L20 30 M112 20 L100 30 M6 60 H18 M114 60 H102" stroke="${a}" stroke-width="5" stroke-linecap="round"/>`,
      skull: `<path d="M60 8 C28 8 12 32 14 56 C15 70 24 78 32 82 V102 H88 V82 C96 78 105 70 106 56 C108 32 92 8 60 8 Z" ${ink}/><ellipse cx="42" cy="56" rx="12" ry="14" fill="${a}"/><ellipse cx="78" cy="56" rx="12" ry="14" fill="${a}"/><path d="M60 70 L52 84 H68 Z" fill="${b}"/><path d="M48 102 V90 M60 102 V90 M72 102 V90" stroke="${b}" stroke-width="4"/>`
    };
    return `<svg viewBox="0 0 120 120">${I[k.icon] || I.blade}</svg>`;
  }

  // ---------- backdrop pieces ----------
  function kBack(name, k, G) {
    const { W, H, cx, cy, gx, gy, gw, gh } = G;
    const svg = inner => `<svg class="fk-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${inner}</svg>`;
    const bolt = () => { let x = cx + rnd(-gw * .45, gw * .45), y = gy, d = `M${x.toFixed(0)} ${y}`; while (y < cy + gh * .3) { x += rnd(-45, 45); y += rnd(30, 60); d += `L${x.toFixed(0)} ${y.toFixed(0)}`; } return `<path d="${d}"/>`; };
    switch (name) {
      case "flash": return `<div class="fx-kflash"></div>`;
      case "white": return `<div class="fk-white"></div><div class="fx-kflash"></div>`;
      case "dim": return `<div class="fk-dim"></div>`;
      case "dark": return `<div class="fk-dim fk-dark"></div>`;
      case "heat": return `<div class="fk-heat" style="left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px"></div>`;
      case "cut": { const y1 = cy + gh * .05, y2 = cy - gh * .05; return svg(`<path class="fk-cut" d="M${gx - 40} ${y1} L${gx + gw + 40} ${y2}"/><path class="fk-cutglow" d="M${gx - 40} ${y1} L${gx + gw + 40} ${y2}"/>`) + `<div class="fk-cutflash"></div>`; }
      case "slash2": return svg(`<path class="fk-sl" d="M${cx - gw * .5} ${cy + gh * .22} L${cx + gw * .5} ${cy - gh * .22}"/><path class="fk-sl two" d="M${cx - gw * .5} ${cy - gh * .2} L${cx + gw * .5} ${cy + gh * .2}"/>`);
      case "claws": return svg([0, 1, 2].map(i => { const o = (i - 1) * gw * .09, x0 = cx - gw * .3 + o, y0 = cy - gh * .3, x1 = cx + gw * .22 + o, y1 = cy + gh * .3;
        return `<g style="--cd:${i * 90}ms" class="fk-claw"><path d="M${x0} ${y0} Q${(x0 + x1) / 2 + 40} ${(y0 + y1) / 2 - 30} ${x1} ${y1}"/><path class="in" d="M${x0} ${y0} Q${(x0 + x1) / 2 + 40} ${(y0 + y1) / 2 - 30} ${x1} ${y1}"/></g>`; }).join(""));
      case "bolts": return svg(`<g class="fk-bolts">${Array.from({ length: 5 }, bolt).join("")}</g>`);
      case "speed": { let p = ""; const R = Math.max(W, H), r0 = Math.min(gw, gh) * .32; for (let i = 0; i < 64; i++) { const an = i / 64 * TAU + rnd(-.03, .03), w = rnd(.006, .018), r1 = r0 * rnd(1, 1.6);
          p += `<path d="M${cx + Math.cos(an - w) * R} ${cy + Math.sin(an - w) * R} L${cx + Math.cos(an) * r1} ${cy + Math.sin(an) * r1} L${cx + Math.cos(an + w) * R} ${cy + Math.sin(an + w) * R} Z"/>`; }
        return svg(`<g class="fk-speed">${p}</g>`); }
      case "hspeed": return `<div class="fk-hspeed">${Array.from({ length: 34 }, (_, i) => `<i style="top:${rnd(gy, gy + gh).toFixed(0)}px;width:${rnd(200, 700).toFixed(0)}px;height:${rnd(2, 7).toFixed(1)}px;animation-delay:${rnd(0, 900).toFixed(0)}ms;${i % 3 ? "" : "background:linear-gradient(90deg,transparent,var(--ka))"}"></i>`).join("")}</div>`;
      case "heaven": return `<div class="fk-heaven" style="left:${cx}px;top:${gy}px">${[-38, -24, -12, 0, 12, 24, 38].map((r, i) => `<i style="--r:${r}deg;width:${70 + (i % 3) * 50}px;animation-delay:${i * 60}ms"></i>`).join("")}</div><div class="fk-holy" style="left:${cx}px;top:${cy}px"></div>`;
      case "sunburst": return `<div class="fk-sun" style="left:${cx}px;top:${cy}px;width:${Math.max(gw, gh) * 1.6}px;height:${Math.max(gw, gh) * 1.6}px"></div>`;
      case "frost": { let p = ""; for (let i = 0; i < 8; i++) { const side = i % 4; let x = side === 0 ? gx : side === 1 ? gx + gw : rnd(gx, gx + gw), y = side === 2 ? gy : side === 3 ? gy + gh : rnd(gy, gy + gh), d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
          for (let j = 0; j < 6; j++) { x += (cx - x) * .14 + rnd(-30, 30); y += (cy - y) * .14 + rnd(-30, 30); d += `L${x.toFixed(0)} ${y.toFixed(0)}`; } p += `<path d="${d}"/>`; }
        return `<div class="fk-frost"></div>` + svg(`<g class="fk-ice">${p}</g>`); }
      case "crt": return `<div class="fk-crt" style="left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px"></div>`;
      case "blood": { let p = ""; for (let i = 0; i < 9; i++) { const x = gx + gw * (.05 + i * .11 + rnd(-.03, .03)), w = rnd(14, 34), h = rnd(gh * .12, gh * .42);
          p += `<path class="fk-drip" style="--dd:${rnd(0, 250).toFixed(0)}ms" d="M${x - w} ${gy} H${x + w} V${gy + h - w} A${w} ${w} 0 0 1 ${x - w} ${gy + h - w} Z"/>`; }
        for (let i = 0; i < 14; i++) { const an = rnd(0, TAU), r = rnd(gw * .12, gw * .3); p += `<circle class="fk-splat" style="--dd:${(150 + rnd(0, 120)).toFixed(0)}ms" cx="${(cx + Math.cos(an) * r).toFixed(0)}" cy="${(cy + Math.sin(an) * r * .6).toFixed(0)}" r="${rnd(4, 16).toFixed(1)}"/>`; }
        return svg(`<defs><linearGradient id="fkbl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a0008"/><stop offset="1" stop-color="#c3001f"/></linearGradient></defs><g fill="url(#fkbl)">${p}</g>`); }
      case "rings": return [0, 150, 320].map(d => `<div class="fx-ring k" style="left:${cx}px;top:${cy}px;animation-delay:${d}ms"></div>`).join("");
      case "cracks": { let p = ""; for (let i = 0; i < 7; i++) { let x = cx + rnd(-60, 60), y = gy + gh, d = `M${x.toFixed(0)} ${y}`; const dx = (i - 3) * rnd(12, 30);
          for (let j = 0; j < 7; j++) { x += dx + rnd(-25, 25); y -= rnd(30, 60); d += `L${x.toFixed(0)} ${y.toFixed(0)}`; } p += `<path d="${d}"/>`; }
        return svg(`<g class="fk-cracks">${p}</g>`); }
      case "redpulse": return `<div class="fk-redpulse"></div>`;
      case "glass": { let p = "", rings = ""; const N = 16, px = cx + rnd(-40, 40), py = cy + gh * .05;
        const pts = Array.from({ length: N }, (_, i) => { const an = i / N * TAU + rnd(-.1, .1); return an; });
        pts.forEach(an => { const R = Math.max(gw, gh); p += `<path d="M${px} ${py} L${(px + Math.cos(an) * R * .3).toFixed(0)} ${(py + Math.sin(an) * R * .3 + rnd(-20, 20)).toFixed(0)} L${(px + Math.cos(an) * R).toFixed(0)} ${(py + Math.sin(an) * R).toFixed(0)}"/>`; });
        [.08, .17, .3].forEach(f => { rings += `<path d="${pts.map((an, i) => (i ? "L" : "M") + (px + Math.cos(an) * gw * f * rnd(.85, 1.15)).toFixed(0) + " " + (py + Math.sin(an) * gw * f * rnd(.85, 1.15)).toFixed(0)).join("")}Z"/>`; });
        return svg(`<g class="fk-glass">${p}${rings}</g>`); }
    }
    return "";
  }

  // ---------- particles ----------
  function kParts(layer, k, G, frames) {
    const { W, H, cx, cy, gx, gy, gw, gh } = G;
    const c = document.createElement("canvas"); c.width = W; c.height = H; c.className = "fk-canvas"; layer.appendChild(c);
    const g = c.getContext("2d"), P = [], sc = gw / 1080 + .3;
    const add = o => P.push(Object.assign({ d: 0, life: 45, gr: 0, drag: .94, r: 0, vr: 0, s: 4, c: k.a, add: 1, kind: "dot" }, o));
    const burst = (n, sp, o) => { for (let i = 0; i < n; i++) { const an = rnd(0, TAU), v = rnd(sp * .3, sp) * sc; add(Object.assign({ x: cx, y: cy, vx: Math.cos(an) * v, vy: Math.sin(an) * v }, typeof o === "function" ? o(i) : o)); } };
    switch (k.parts) {
      case "steel": for (let i = 0; i < 70; i++) add({ kind: "line", x: rnd(gx, gx + gw), y: cy + rnd(-8, 8), vx: rnd(-30, 30), vy: rnd(-3, 3), drag: .9, s: rnd(1.5, 3), c: i % 2 ? "#fff" : k.a, d: rnd(0, 10), life: rnd(15, 35) }); break;
      case "blood": burst(110, 22, i => ({ kind: "drop", add: 0, gr: .7, drag: .97, s: rnd(3, 10), c: i % 4 ? "#b0001c" : "#ff2346", life: rnd(50, 90), d: 8 })); break;
      case "spark": burst(40 + k.lvl * 30, 20 + k.lvl * 5, i => ({ s: rnd(2, 5), life: rnd(25, 50), c: i % 3 ? k.a : "#fff" })); break;
      case "electric": for (let i = 0; i < 26; i++) add({ kind: "arc", x: cx + rnd(-gw * .4, gw * .4), y: cy + rnd(-gh * .15, gh * .15), vx: 0, vy: 0, s: rnd(30, 90), life: rnd(8, 20), d: rnd(0, 90), c: i % 2 ? "#f3d6ff" : k.a }); burst(60, 26, { s: rnd(2, 4), c: "#fff" }); break;
      case "fire": for (let i = 0; i < 200; i++) add({ kind: "fire", x: rnd(gx, gx + gw), y: gy + gh + rnd(0, 60), vx: rnd(-1, 1), vy: -rnd(6, 17) * sc, drag: 1, s: rnd(12, 30) * sc, life: rnd(40, 85), d: rnd(0, 40) });
        burst(90, 30, { s: rnd(2, 5), c: "#ffd27a" }); break;
      case "ice": burst(70, 24, i => ({ kind: "shard", add: 0, gr: .45, drag: .96, s: rnd(8, 22), vr: rnd(-.25, .25), r: rnd(0, TAU), c: i % 3 ? "rgba(200,245,255,.9)" : "rgba(255,255,255,.95)", life: rnd(50, 90), d: 6 })); break;
      case "debris": burst(70, 26, i => ({ kind: "rock", add: 0, gr: .8, drag: .98, s: rnd(5, 16), vr: rnd(-.3, .3), r: rnd(0, TAU), c: i % 3 ? "#3a3026" : "#6b5a44", life: rnd(50, 80), d: k.shakeAt ? 22 : 2 }));
        for (let i = 0; i < 26; i++) add({ kind: "puff", add: 0, x: cx + rnd(-gw * .35, gw * .35), y: cy + gh * .12, vx: rnd(-2, 2), vy: rnd(-2, 0), drag: .97, s: rnd(30, 70), life: rnd(50, 80), d: k.shakeAt ? 22 : 2, c: "rgba(140,120,100," }); break;
      case "streak": for (let i = 0; i < 80; i++) add({ kind: "line", x: gx + gw + rnd(0, gw), y: rnd(gy, gy + gh), vx: -rnd(40, 80) * sc, vy: 0, drag: 1, s: rnd(1.5, 4), life: 40, d: rnd(0, 50), c: i % 3 ? "#fff" : k.a }); break;
      case "feather": for (let i = 0; i < 46; i++) add({ kind: "feather", add: 0, x: rnd(gx, gx + gw), y: gy - rnd(0, gh * .5), vx: 0, vy: rnd(1.5, 3.5) * sc, drag: 1, s: rnd(10, 22), r: rnd(0, TAU), vr: rnd(-.04, .04), ph: rnd(0, TAU), life: 200, d: rnd(0, 60), c: i % 3 ? "#fffbea" : "#ffe680" });
        for (let i = 0; i < 40; i++) add({ kind: "star", x: rnd(gx, gx + gw), y: rnd(gy, gy + gh * .8), vx: 0, vy: 0, s: rnd(3, 8), life: rnd(25, 50), d: rnd(10, 150), c: "#fff6c8" }); break;
      case "gold": burst(120, 28, i => ({ kind: i % 4 ? "dot" : "star", gr: .25, drag: .95, s: rnd(2, 6), c: i % 2 ? "#ffcf4a" : "#fff3b0", life: rnd(50, 100), d: rnd(0, 30) }));
        for (let i = 0; i < 50; i++) add({ kind: "star", x: rnd(gx, gx + gw), y: rnd(gy, gy + gh), vx: 0, vy: 0, s: rnd(4, 10), life: rnd(25, 50), d: rnd(20, 180), c: "#ffe9a8" }); break;
      case "embers": for (let i = 0; i < 140; i++) add({ x: rnd(gx, gx + gw), y: gy + gh + rnd(0, 40), vx: rnd(-1.5, 1.5), vy: -rnd(3, 10) * sc, drag: 1, s: rnd(1.5, 4), life: rnd(60, 140), d: rnd(0, 120), c: i % 3 ? "#ff3d3d" : "#ffb070", wob: 1, ph: rnd(0, TAU) }); break;
      case "shards": burst(90, 18, i => ({ kind: "shard", add: 0, gr: .55, drag: .98, s: rnd(10, 34), vr: rnd(-.2, .2), r: rnd(0, TAU), c: i % 3 ? "rgba(255,255,255,.55)" : "rgba(255,80,110,.6)", life: rnd(70, 110), d: rnd(4, 20) })); break;
    }
    let f = 0;
    (function step() {
      f++; g.clearRect(0, 0, W, H);
      for (const p of P) {
        if (p.d > f) continue; const t = (f - p.d) / p.life; if (t > 1) continue;
        p.vx *= p.drag; p.vy = p.vy * p.drag + p.gr; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        if (p.wob) p.x += Math.sin(f * .08 + p.ph) * 1.2;
        g.globalCompositeOperation = p.add ? "lighter" : "source-over"; g.globalAlpha = Math.max(0, 1 - t);
        switch (p.kind) {
          case "line": g.strokeStyle = p.c; g.lineWidth = p.s; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); g.stroke(); break;
          case "drop": { const sp = Math.hypot(p.vx, p.vy), an = Math.atan2(p.vy, p.vx); g.save(); g.translate(p.x, p.y); g.rotate(an); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, p.s + sp * .5, p.s * .8, 0, 0, TAU); g.fill(); g.restore(); break; }
          case "arc": { if (f % 2) break; g.strokeStyle = p.c; g.lineWidth = 3; g.shadowColor = k.a; g.shadowBlur = 14; g.beginPath(); let x = p.x, y = p.y; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += rnd(-p.s / 3, p.s / 3); y += rnd(-p.s / 3, p.s / 3); g.lineTo(x, y); } g.stroke(); g.shadowBlur = 0; break; }
          case "fire": { p.s *= .985; const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s); gr.addColorStop(0, `rgba(255,230,140,${.9 * (1 - t)})`); gr.addColorStop(.4, `rgba(255,110,30,${.7 * (1 - t)})`); gr.addColorStop(1, "rgba(255,40,0,0)");
            g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.s, 0, TAU); g.fill(); break; }
          case "shard": g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -p.s); g.lineTo(p.s * .45, p.s * .6); g.lineTo(-p.s * .5, p.s * .3); g.closePath(); g.fill(); g.stroke(); g.restore(); break;
          case "rock": g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.beginPath(); g.moveTo(-p.s, -p.s * .4); g.lineTo(-p.s * .2, -p.s); g.lineTo(p.s, -p.s * .3); g.lineTo(p.s * .6, p.s * .8); g.lineTo(-p.s * .7, p.s * .6); g.closePath(); g.fill(); g.restore(); break;
          case "puff": { g.globalAlpha = 1; const s = p.s * (1 + t * 1.5), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, s); gr.addColorStop(0, p.c + (.45 * (1 - t)) + ")"); gr.addColorStop(1, p.c + "0)"); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, s, 0, TAU); g.fill(); break; }
          case "feather": p.x += Math.sin(f * .05 + p.ph) * 1.6; g.globalAlpha = Math.min(1, (1 - t) * 3); g.save(); g.translate(p.x, p.y); g.rotate(p.r + Math.sin(f * .05 + p.ph) * .5); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, p.s * .32, p.s, 0, 0, TAU); g.fill();
            g.strokeStyle = "rgba(200,170,80,.7)"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -p.s); g.lineTo(0, p.s * 1.2); g.stroke(); g.restore(); break;
          case "star": { const a = Math.sin(t * Math.PI), s = p.s * (1 + a); g.globalAlpha = a; g.save(); g.translate(p.x, p.y); g.rotate(t * 2); g.fillStyle = p.c; g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? s * .35 : s * 2.2, aa = j * Math.PI / 4; g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } g.closePath(); g.fill(); g.restore(); break; }
          default: g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s * (1 - t * .5), 0, TAU); g.fill();
        }
      }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      if (f < frames && layer.isConnected) requestAnimationFrame(step); else c.remove();
    })();
  }

  function killFx(stage, L, s, type) {
    const k = KILL[type]; if (!stage || !k) return;
    stage.querySelectorAll(".fx-kill").forEach(x => x.remove());          // a newer kill replaces the last one
    const W = L.w || 1080, H = L.h || 1920, game = (L.slots || []).find(x => x.id === "game") || { x: 0, y: 0, w: W, h: H };
    const G = { W, H, gx: game.x, gy: game.y, gw: game.w, gh: game.h, cx: game.x + game.w / 2, cy: game.y + game.h * .45 };
    const size = Math.round(Math.min(game.w * (k.t.length > 9 ? .11 : .15), 170)), dur = k.dur || 2600;
    const layer = document.createElement("div"); layer.className = `fx-layer fx-kill lvl${k.lvl} fk-${type}`;
    layer.style.setProperty("--ka", k.a); layer.style.setProperty("--kb", k.b); layer.style.setProperty("--kd", dur + "ms");
    const T = esc(k.t), letters = [...k.t].map((ch, i) => `<i style="--i:${i};--dx:${rnd(-160, 160).toFixed(0)}px;--dr:${rnd(-70, 70).toFixed(0)}deg">${ch === " " ? "&nbsp;" : esc(ch)}</i>`).join("");
    let word;
    if (k.intro === "cut") word = `<b class="w h1">${T}</b><b class="w h2">${T}</b>`;
    else if (k.intro === "echo") word = `<b class="w main">${T}</b>` + Array.from({ length: k.echo }, (_, i) => `<b class="w echo" style="--ex:${(i % 2 ? 1 : -1) * (30 + i * 12)}%;animation-delay:${i * 110}ms">${T}</b>`).join("");
    else if (k.intro === "letters" || k.intro === "shatter") word = `<b class="w lt">${letters}</b>`;
    else word = `<b class="w" data-t="${T}">${T}</b>`;
    layer.innerHTML = k.bg.map(n => kBack(n, k, G)).join("") +
      `<div class="fx-ktitle in-${k.intro}" style="left:${G.cx}px;top:${G.cy}px"><div class="fx-kicon">${kIcon(k)}</div><div class="fx-kword" style="font-size:${size}px">${word}</div>${k.sub ? `<div class="fx-ksub">${esc(k.sub)}</div>` : ""}</div>`;
    stage.appendChild(layer);
    kParts(layer, k, G, Math.round(dur / 16.7));
    const shake = k.shake === 0 ? "" : k.shake === "r" ? "fx-shake-r" : k.lvl >= 3 ? "fx-shake" : "fx-shake-s";
    if (shake) setTimeout(() => { stage.classList.remove("fx-shake", "fx-shake-s", "fx-shake-r"); void stage.offsetWidth; stage.classList.add(shake);
      setTimeout(() => stage.classList.remove(shake), shake === "fx-shake-r" ? 1800 : 800); }, k.shakeAt || 60);
    if (s.fxSound !== false) killSound(type, k, s.fxVoice !== false);
    setTimeout(() => layer.remove(), dur);
  }

  window.SynoFX = { win: (st, L, s) => play("win", st, L, s), lose: (st, L, s) => play("lose", st, L, s),
    mvp: (st, L, s, info) => play("mvp", st, L, Object.assign({}, s, { _mvp: info })),
    kill: (st, L, s, type) => killFx(st, L, s, type), KILL };
})();
