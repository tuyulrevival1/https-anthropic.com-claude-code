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
    if (kind === "win") {
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
      if (f < (kind === "win" ? 180 : 110)) requestAnimationFrame(step); else c.remove();
    })();
  }

  // ---------- optional synth sound (no files) ----------
  function sound(kind) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, out = actx.createGain(); out.gain.value = .35; out.connect(actx.destination);
      if (kind === "win") {
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
    if (!stage || Date.now() - busy < 900) return; busy = Date.now();
    const W = L.w || 1080, H = L.h || 1920;
    const game = (L.slots || []).find(x => x.id === "game") || { x: 0, y: 0, w: W, h: H };
    const cx = game.x + game.w / 2, cy = game.y + game.h / 2, big = Math.round(Math.min(game.w * .19, 190));
    const layer = document.createElement("div"); layer.className = "fx-layer fx-" + kind;
    const streak = Math.abs(s.streak || 0);
    if (kind === "win") {
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
    const card = stage.querySelector(".ov-score");
    if (card) { card.classList.remove("fx-hit-win", "fx-hit-lose"); void card.offsetWidth; card.classList.add("fx-hit-" + kind); setTimeout(() => card.classList.remove("fx-hit-" + kind), 1200); }
    if (s.fxSound) sound(kind);
    setTimeout(() => layer.remove(), kind === "win" ? 3200 : 2600);
  }

  window.SynoFX = { win: (st, L, s) => play("win", st, L, s), lose: (st, L, s) => play("lose", st, L, s) };
})();
