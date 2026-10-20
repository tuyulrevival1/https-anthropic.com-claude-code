#!/usr/bin/env python3
"""Beat-synced TikTok montage maker for MLBB gameplay (Chou edit style).

Two commands:
  scan   - find loud moments (kills, "SAVAGE", teamfights) in a long livestream
  render - cut clips on the beat of a song, add zoom punches, flashes,
           RGB split, shake, hook text, and export a vertical video (<60s)

Usage:
  python3 edit.py scan   input/live.mp4
  python3 edit.py render config.json
"""
import argparse
import json
import math
import os
import random
import shutil
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS = 30
LAYOUTS = {
    # name: (output size, gameplay area size inside it)
    "ipad": ((1080, 1440), (1080, 1440)),    # 3:4, full frame gameplay
    "tiktok": ((1080, 1920), (1080, 1350)),  # 9:16, 4:5 gameplay on blurred bg
}
FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf",
    "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


# ---------------------------------------------------------------- helpers

def parse_time(v):
    """'1:02:03.5' / '2:03' / 123.0 -> seconds."""
    if isinstance(v, (int, float)):
        return float(v)
    sec = 0.0
    for part in str(v).split(":"):
        sec = sec * 60 + float(part)
    return sec


def fmt_time(s):
    h, rem = divmod(int(s), 3600)
    m, sec = divmod(rem, 60)
    return f"{h}:{m:02d}:{sec:02d}"


def run(cmd):
    subprocess.run(cmd, check=True)


def probe_size(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "csv=p=0", path,
    ]).decode().strip().split("\n")[0]
    w, h = out.split(",")[:2]
    return int(w), int(h)


def has_audio(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "a",
        "-show_entries", "stream=index", "-of", "csv=p=0", path,
    ]).decode().strip()
    return bool(out)


def find_font(custom=None):
    for f in ([custom] if custom else []) + FONT_CANDIDATES:
        if f and os.path.exists(f):
            return f
    return None


# ------------------------------------------------------------------ scan

def cmd_scan(args):
    """Rank loud moments in a long video by short-term audio energy."""
    sr = 8000
    print("Reading audio (this takes a while for long streams)...")
    raw = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", args.video, "-vn", "-ac", "1",
        "-ar", str(sr), "-f", "s16le", "-",
    ])
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    win = sr // 2  # 0.5s windows
    n = len(a) // win
    rms = np.sqrt((a[: n * win].reshape(n, win) ** 2).mean(axis=1) + 1e-9)
    # Compare each window to its local background (30s median) so a loud
    # streamer voice all game long doesn't win over real spikes.
    bg = np.array([np.median(rms[max(0, i - 30):i + 30]) for i in range(n)])
    score = rms / (bg + 1e-6)
    gap = int(args.gap * 2)
    picks = []
    for i in np.argsort(score)[::-1]:
        if all(abs(i - p) > gap for p in picks):
            picks.append(i)
        if len(picks) >= args.top:
            break
    picks.sort()
    os.makedirs(args.out, exist_ok=True)
    thumbs = []
    print(f"\nTop {len(picks)} moments (check these in the video):")
    for rank, i in enumerate(picks, 1):
        t = i * 0.5
        print(f"  {rank:2d}. {fmt_time(t)}   (score {score[i]:.1f})")
        jpg = os.path.join(args.out, f"moment_{rank:02d}.jpg")
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-ss", str(max(0, t - 1)), "-i",
            args.video, "-frames:v", "1", "-vf", "scale=480:-2", jpg,
        ])
        if os.path.exists(jpg):
            img = cv2.imread(jpg)
            cv2.putText(img, f"{rank}. {fmt_time(t)}", (10, 34),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 5)
            cv2.putText(img, f"{rank}. {fmt_time(t)}", (10, 34),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2)
            thumbs.append(img)
    if thumbs:
        h = max(t.shape[0] for t in thumbs)
        thumbs = [cv2.copyMakeBorder(t, 0, h - t.shape[0], 0, 0,
                                     cv2.BORDER_CONSTANT) for t in thumbs]
        while len(thumbs) % 3:
            thumbs.append(np.zeros_like(thumbs[0]))
        rows = [np.hstack(thumbs[i:i + 3]) for i in range(0, len(thumbs), 3)]
        sheet = os.path.join(args.out, "contact_sheet.jpg")
        cv2.imwrite(sheet, np.vstack(rows))
        print(f"\nThumbnails: {sheet}")


# ----------------------------------------------------------------- beats

def get_beats(cfg, total):
    """Return (beat_times, is_strong) relative to edit start."""
    song = cfg.get("song")
    if song:
        import librosa
        y, sr = librosa.load(song, sr=22050, mono=True,
                             offset=parse_time(cfg.get("song_start", 0)),
                             duration=total + 10)
        env = librosa.onset.onset_strength(y=y, sr=sr)
        tempo, frames = librosa.beat.beat_track(onset_envelope=env, sr=sr)
        times = librosa.frames_to_time(frames, sr=sr)
        strength = env[frames] if len(frames) else np.array([])
        tempo = float(np.atleast_1d(tempo)[0])
        print(f"Song tempo ~{tempo:.0f} BPM, {len(times)} beats found")
    else:
        bpm = float(cfg.get("bpm", 130))
        step = 60.0 / bpm
        times = np.arange(0, total + 10, step)
        strength = np.array([2.0 if i % 4 == 0 else 1.0
                             for i in range(len(times))])
        print(f"No song given: using a {bpm:.0f} BPM grid")
    if len(times) < 2:
        sys.exit("Could not find beats in the song.")
    strong = strength >= np.percentile(strength, 75)
    return np.asarray(times, dtype=float), strong


def plan_segments(cfg, beats):
    """Map each clip to [t0, t1) on the edit timeline, snapped to beats."""
    max_dur = float(cfg.get("max_duration", 58))
    interval = float(np.median(np.diff(beats)))
    ext = list(beats)
    while ext[-1] < max_dur + 30:
        ext.append(ext[-1] + interval)
    segs, t0, idx = [], 0.0, 0
    # Skip a beat sitting right at 0 so the first cut is not a 1-frame clip.
    while idx < len(ext) and ext[idx] < 0.1:
        idx += 1
    for clip in cfg["clips"]:
        idx += max(1, int(clip.get("beats", 4)))
        t1 = ext[idx - 1] if idx - 1 < len(ext) else ext[-1]
        if t1 > max_dur:
            t1 = max_dur
        if t1 - t0 < 0.2:
            break
        segs.append((t0, t1, clip))
        t0 = t1
        if t0 >= max_dur:
            break
    return segs


# ------------------------------------------------------------------ text

def render_text(text, font_path, size, max_w, fill=(255, 255, 255),
                stroke=(0, 0, 0)):
    """Return an RGBA numpy image of bold outlined text, word-wrapped."""
    font = (ImageFont.truetype(font_path, size) if font_path
            else ImageFont.load_default())
    sw = max(3, size // 11)
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if probe.textlength(trial, font=font) + 2 * sw > max_w and cur:
            lines.append(cur)
            cur = word
        else:
            cur = trial
    lines.append(cur)
    line_h = int(size * 1.15)
    w = int(max(probe.textlength(l, font=font) for l in lines)) + 4 * sw
    h = line_h * len(lines) + 4 * sw
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        lw = probe.textlength(line, font=font)
        d.text(((w - lw) / 2, 2 * sw + i * line_h), line, font=font,
               fill=fill + (255,), stroke_width=sw, stroke_fill=stroke + (255,))
    arr = np.array(img)
    return arr[:, :, [2, 1, 0, 3]]  # RGBA -> BGRA


def overlay(frame, bgra, cx, cy, scale=1.0, alpha=1.0):
    if alpha <= 0.01:
        return
    if abs(scale - 1.0) > 0.01:
        bgra = cv2.resize(bgra, None, fx=scale, fy=scale,
                          interpolation=cv2.INTER_LINEAR)
    h, w = bgra.shape[:2]
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    fx0, fy0 = max(0, x0), max(0, y0)
    fx1, fy1 = min(frame.shape[1], x0 + w), min(frame.shape[0], y0 + h)
    if fx1 <= fx0 or fy1 <= fy0:
        return
    sub = bgra[fy0 - y0:fy1 - y0, fx0 - x0:fx1 - x0]
    a = (sub[:, :, 3:4].astype(np.float32) / 255.0) * alpha
    roi = frame[fy0:fy1, fx0:fx1].astype(np.float32)
    frame[fy0:fy1, fx0:fx1] = (sub[:, :, :3] * a + roi * (1 - a)).astype(
        np.uint8)


# --------------------------------------------------------------- effects

def pulse(t, events, length):
    """Decaying 1->0 envelope after the most recent event time <= t."""
    best = 0.0
    for b, amp in events:
        dt = t - b
        if 0 <= dt < length:
            best = max(best, amp * (1 - dt / length) ** 2)
    return best


def grade(frame, cfg):
    sat = float(cfg.get("saturation", 1.25))
    con = float(cfg.get("contrast", 1.08))
    gray = cv2.cvtColor(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY),
                        cv2.COLOR_GRAY2BGR)
    frame = cv2.addWeighted(frame, sat, gray, 1 - sat, 0)
    return cv2.convertScaleAbs(frame, alpha=con, beta=-128 * (con - 1))


def rgb_split(frame, px):
    if px < 1:
        return frame
    b, g, r = cv2.split(frame)
    m1 = np.float32([[1, 0, px], [0, 1, 0]])
    m2 = np.float32([[1, 0, -px], [0, 1, 0]])
    h, w = frame.shape[:2]
    r = cv2.warpAffine(r, m1, (w, h), borderMode=cv2.BORDER_REPLICATE)
    b = cv2.warpAffine(b, m2, (w, h), borderMode=cv2.BORDER_REPLICATE)
    return cv2.merge([b, g, r])


# ---------------------------------------------------------------- render

def read_frames(src, start, span, speed, n, smooth):
    vf = f"setpts=(PTS-STARTPTS)/{speed}"
    vf += f",framerate=fps={FPS}" if (speed < 0.95 and smooth) else f",fps={FPS}"
    proc = subprocess.Popen([
        "ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-t", f"{span + 0.5:.3f}",
        "-i", src, "-an", "-vf", vf, "-frames:v", str(n),
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-",
    ], stdout=subprocess.PIPE)
    return proc


def cmd_render(args):
    with open(args.config) as f:
        cfg = json.load(f)
    base = os.path.dirname(os.path.abspath(args.config))

    def path(p):
        return p if os.path.isabs(p) else os.path.join(base, p)

    src = path(cfg["source"])
    if cfg.get("song"):
        cfg["song"] = path(cfg["song"])
    out = path(cfg.get("output", "output/chou_edit.mp4"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    layout = cfg.get("layout", "ipad")
    (W, H), (GW, GH) = LAYOUTS[layout]
    sw, sh = probe_size(src)
    font = find_font(cfg.get("font"))
    random.seed(7)

    max_dur = float(cfg.get("max_duration", 58))
    beats, strong = get_beats(cfg, max_dur)
    segs = plan_segments(cfg, beats)
    total = segs[-1][1]
    print(f"Edit length: {total:.1f}s, {len(segs)} clips, layout {layout} "
          f"{W}x{H}")

    # Effect events on the edit timeline.
    cuts = [s[0] for s in segs]
    beat_ev = [(b, 1.0 if st else 0.55) for b, st in zip(beats, strong)
               if b < total]
    strong_ev = [(b, 1.0) for b, st in zip(beats, strong) if st and b < total]
    flash_ev = [(c, 1.0) for c in cuts]
    zoom_amt = float(cfg.get("beat_zoom", 0.10))
    shake_px = float(cfg.get("shake", 22))
    split_px = float(cfg.get("rgb_split", 14))
    flash_amt = float(cfg.get("flash", 0.7))

    # Text layers.
    hook = cfg.get("hook") or {}
    hook_img = (render_text(hook["text"], font, int(hook.get("size", 104)),
                            W * 0.9, fill=(255, 255, 255))
                if hook.get("text") else None)
    sub_img = (render_text(hook["subtext"], font, int(hook.get("size", 104) * 0.5),
                           W * 0.9, fill=(80, 230, 255))
               if hook.get("subtext") else None)
    hook_dur = float(hook.get("duration", 2.5))
    end_text = cfg.get("end_text")
    end_img = render_text(end_text, font, 80, W * 0.9) if end_text else None
    clip_imgs = [render_text(c["text"], font, int(c.get("text_size", 120)),
                             W * 0.9, fill=(255, 220, 40))
                 if c.get("text") else None for _, _, c in segs]

    tmp = out + ".video.mp4"
    enc = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264",
        "-preset", cfg.get("preset", "medium"), "-crf", str(cfg.get("crf", 18)),
        "-pix_fmt", "yuv420p", tmp,
    ], stdin=subprocess.PIPE)

    frame_idx = 0
    for si, (t0, t1, clip) in enumerate(segs):
        speed = float(clip.get("speed", 1.0))
        n = int(round(t1 * FPS)) - frame_idx
        span = (t1 - t0) * speed
        start = parse_time(clip["start"])
        print(f"  clip {si + 1}: src {fmt_time(start)} x{speed} -> "
              f"{t0:5.2f}-{t1:5.2f}s ({n} frames)")
        proc = read_frames(src, start, span, speed, n,
                           cfg.get("smooth_slowmo", True))
        fsize = sw * sh * 3
        # Gameplay crop in source pixels (centre on "focus", zoom in).
        z = float(clip.get("zoom", 1.0))
        fx, fy = clip.get("focus", [0.5, 0.5])
        ch = sh / z
        cw = ch * GW / GH
        if cw > sw:
            cw = sw
            ch = cw * GH / GW
        cx = min(max(fx * sw, cw / 2), sw - cw / 2)
        cy = min(max(fy * sh, ch / 2), sh - ch / 2)
        last = None
        for i in range(n):
            buf = proc.stdout.read(fsize)
            if len(buf) == fsize:
                last = np.frombuffer(buf, np.uint8).reshape(sh, sw, 3)
            if last is None:
                last = np.zeros((sh, sw, 3), np.uint8)
            src_f = last
            t = (frame_idx + i) / FPS
            lt = t - t0

            # Zoom punch + shake on beats.
            p = pulse(t, beat_ev, 0.22)
            s = 1.0 + zoom_amt * p
            sp = pulse(t, strong_ev, 0.18)
            dx = shake_px * sp * math.sin(t * 90)
            dy = shake_px * sp * math.cos(t * 77)
            k = GW / (cw / s)
            M = np.float32([[k, 0, GW / 2 - k * cx + dx],
                            [0, k, GH / 2 - k * cy + dy]])
            game = cv2.warpAffine(src_f, M, (GW, GH), flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_REPLICATE)
            game = grade(game, cfg)
            game = rgb_split(game, split_px * sp)

            if (GW, GH) == (W, H):
                frame = game
            else:
                # Blurred, darkened full frame as background.
                kb = max(H / sh, W / sw)
                Mb = np.float32([[kb / 8, 0, (W - kb * sw) / 16],
                                 [0, kb / 8, (H - kb * sh) / 16]])
                bg = cv2.warpAffine(src_f, Mb, (W // 8, H // 8))
                bg = cv2.GaussianBlur(bg, (0, 0), 6)
                frame = cv2.resize(bg, (W, H)) // 2
                y0 = (H - GH) // 2
                frame[y0:y0 + GH] = game

            # White flash on every cut (skip very first frame of the edit).
            fl = pulse(t, flash_ev, 0.15) * flash_amt if t > 0.05 else 0
            if fl > 0.01:
                frame = cv2.addWeighted(frame, 1 - fl,
                                        np.full_like(frame, 255), fl, 0)

            # Clip caption ("SAVAGE", "1 VS 3"...): pop in, pulse on beats.
            ci = clip_imgs[si]
            if ci is not None:
                pop = 1.0 + 0.6 * max(0, 1 - lt / 0.12)
                overlay(frame, ci, W / 2, H * 0.72, scale=pop * (1 + 0.08 * p))

            # Hook text at the top for the first seconds.
            if hook_img is not None and t < hook_dur:
                a = min(1.0, (hook_dur - t) / 0.2)
                pop = 1.0 + 0.5 * max(0, 1 - t / 0.15)
                block = hook_img.shape[0] + (sub_img.shape[0] if sub_img
                                             is not None else 0)
                hy = (H * 0.14 if (GW, GH) == (W, H)
                      else max(10, ((H - GH) / 2 - block) / 2))
                overlay(frame, hook_img, W / 2, hy + hook_img.shape[0] / 2,
                        scale=pop * (1 + 0.05 * p), alpha=a)
                if sub_img is not None:
                    overlay(frame, sub_img, W / 2,
                            hy + hook_img.shape[0] + sub_img.shape[0] * 0.7,
                            alpha=a)

            if end_img is not None and t > total - 2.0:
                overlay(frame, end_img, W / 2, H * 0.5,
                        alpha=min(1.0, (t - (total - 2.0)) / 0.2))

            enc.stdin.write(np.ascontiguousarray(frame).tobytes())
        proc.stdout.close()
        proc.wait()
        frame_idx += n
    enc.stdin.close()
    enc.wait()

    # ------------------------------------------------------------ audio
    inputs = ["-i", tmp]
    filters, mix = [], []
    k = 1
    if cfg.get("song"):
        inputs += ["-ss", str(parse_time(cfg.get("song_start", 0))),
                   "-t", f"{total:.3f}", "-i", cfg["song"]]
        mv = float(cfg.get("music_volume", 1.0))
        filters.append(f"[{k}:a]volume={mv},afade=t=out:st={max(0, total - 1):.3f}"
                       f":d=1[music]")
        mix.append("[music]")
        k += 1
    gv = float(cfg.get("game_audio_volume", 0.15))
    if gv > 0 and has_audio(src):
        parts = []
        for t0, t1, clip in segs:
            speed = float(clip.get("speed", 1.0))
            inputs += ["-ss", str(parse_time(clip["start"])),
                       "-t", f"{(t1 - t0) * speed:.3f}", "-i", src]
            tempo, chain = speed, []
            while tempo < 0.5:
                chain.append("atempo=0.5")
                tempo /= 0.5
            while tempo > 2.0:
                chain.append("atempo=2.0")
                tempo /= 2.0
            chain.append(f"atempo={tempo:.4f}")
            filters.append(f"[{k}:a]aresample=44100,{','.join(chain)},"
                           f"apad,atrim=0:{t1 - t0:.3f}[g{k}]")
            parts.append(f"[g{k}]")
            k += 1
        filters.append(f"{''.join(parts)}concat=n={len(parts)}:v=0:a=1,"
                       f"volume={gv}[game]")
        mix.append("[game]")
    cmd = ["ffmpeg", "-v", "error", "-y"] + inputs
    if mix:
        if len(mix) > 1:
            filters.append(f"{''.join(mix)}amix=inputs={len(mix)}:"
                           f"duration=first:normalize=0[aout]")
        else:
            filters[-1] = filters[-1].rsplit("[", 1)[0] + "[aout]"
        cmd += ["-filter_complex", ";".join(filters), "-map", "0:v",
                "-map", "[aout]", "-c:a", "aac", "-b:a", "192k"]
    else:
        cmd += ["-map", "0:v"]
    cmd += ["-c:v", "copy", "-t", f"{total:.3f}", "-movflags", "+faststart",
            out]
    run(cmd)
    os.remove(tmp)
    print(f"\nDone: {out}  ({total:.1f}s, {W}x{H})")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawTextHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("scan", help="find highlight timestamps in a long video")
    s.add_argument("video")
    s.add_argument("--top", type=int, default=15)
    s.add_argument("--gap", type=float, default=25,
                   help="min seconds between picks")
    s.add_argument("--out", default="scan")
    r = sub.add_parser("render", help="render the edit from a config file")
    r.add_argument("config")
    args = ap.parse_args()
    if shutil.which("ffmpeg") is None:
        sys.exit("ffmpeg is required")
    {"scan": cmd_scan, "render": cmd_render}[args.cmd](args)


if __name__ == "__main__":
    main()
