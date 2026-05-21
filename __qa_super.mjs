import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 1400 } });
const p = await ctx.newPage();
const r = await p.goto("http://localhost:3100/compare/super", { waitUntil: "networkidle", timeout: 60000 }).catch(()=>null);
await p.waitForTimeout(1200);
const probe = await p.evaluate(() => ({
  tables: document.querySelectorAll("table").length,
  ariaLive: [...document.querySelectorAll('[aria-live="polite"]')].map(e=>e.textContent?.trim()).filter(Boolean).slice(0,3),
}));
await p.screenshot({ path: "/tmp/qa/compare-super.png" });
console.log(`compare-super HTTP ${r?r.status():"ERR"} ${JSON.stringify(probe)}`);
await b.close();
