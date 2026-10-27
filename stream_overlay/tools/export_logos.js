/* Export logo PNG (latar telus) ke folder logos/.
   Guna: node tools/export_logos.js   (perlu playwright seperti render_banner.js) */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "logos"); fs.mkdirSync(out, { recursive: true });
const jobs = [
  { kind: "emblem", w: 1024, h: 1024, file: "logo_emblem.png" },
  { kind: "emblem", accent: "crimson", w: 1024, h: 1024, file: "logo_emblem_crimson.png" },
  { kind: "grunge", w: 1600, h: 632, file: "logo_wordmark.png" },
  { kind: "mascot", w: 1024, h: 1024, file: "logo_mascot.png" },
  { kind: "avatar", w: 1024, h: 1024, file: "profile_picture.png" }
];
(async () => {
  const b = await chromium.launch();
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: j.w, height: j.h } });
    await p.goto(`file://${path.join(root, "logo.html")}?kind=${j.kind}&accent=${j.accent || "violet"}`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.evaluate(() => { window.__pose(); });
    await p.waitForTimeout(100);
    await p.screenshot({ path: path.join(out, j.file), omitBackground: true });
    await p.close(); console.log(j.file);
  }
  await b.close();
})();
