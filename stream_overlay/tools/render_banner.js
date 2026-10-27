/* Render banner jadi video MP4 loop (1080x192, 30fps).
   Perlu: Node.js, playwright (npm i playwright && npx playwright install chromium), ffmpeg.
   Guna:  node tools/render_banner.js           -> power + minimal
          node tools/render_banner.js power     -> satu gaya
   Output: exports/banner_<gaya>.mp4  */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");

const root = path.resolve(__dirname, "..");
const styles = process.argv.slice(2).length ? process.argv.slice(2) : ["power", "minimal"];
const FPS = 30;

(async () => {
  const browser = await chromium.launch();
  for (const spec of styles) {
    const [style, accent] = spec.split(":");
    const tag = accent ? `${style}_${accent}` : style;
    const page = await browser.newPage({ viewport: { width: 1080, height: 192 } });
    await page.goto("file://" + path.join(root, "banner.html") + "?style=" + style + (accent ? "&accent=" + accent : ""));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const loop = await page.evaluate(() => {
      const C = ChouOverlay.CFG;
      if (/^(minimal|scene)/.test(new URLSearchParams(location.search).get("style") || "")) return C.scene.brandSeconds + C.scene.items.length * C.scene.itemSeconds;
      return C.banner.messages.length * C.banner.secondsPerMessage;
    });
    const dir = path.join(root, "exports", "frames", tag);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const total = Math.round(loop * FPS);
    for (let f = 0; f < total; f++) {
      await page.evaluate(t => ChouOverlay.setTime(t), f / FPS);
      await page.screenshot({ path: path.join(dir, String(f).padStart(5, "0") + ".png") });
      if (f % 90 === 0) process.stdout.write(`${tag}: ${f}/${total}\r`);
    }
    await page.close();
    const out = path.join(root, "exports", `banner_${tag}.mp4`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(dir, "%05d.png"),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", out]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`\n${out}`);
  }
  await browser.close();
})();
