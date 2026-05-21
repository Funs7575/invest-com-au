import { chromium } from "playwright";
const BASE = "http://localhost:3100";
const shots = [
  { name: "compare-super", url: "/compare/super", vw: 1280, vh: 1400 },
  { name: "compare-etfs", url: "/compare/etfs", vw: 1280, vh: 1400 },
  { name: "compare-insurance", url: "/compare/insurance", vw: 1280, vh: 1400 },
];
const b = await chromium.launch();
const errs = [];
for (const s of shots) {
  const ctx = await b.newContext({ viewport: { width: s.vw, height: s.vh } });
  const p = await ctx.newPage();
  p.on("pageerror", e => errs.push(`[${s.name}] ${e.message}`));
  const r = await p.goto(BASE + s.url, { waitUntil: "networkidle", timeout: 90000 }).catch(()=>null);
  await p.waitForTimeout(1200);
  const probe = await p.evaluate(() => {
    const live = [...document.querySelectorAll('[aria-live="polite"]')].map(e=>e.textContent?.trim()).filter(Boolean);
    return { tables: document.querySelectorAll("table").length, ariaLive: live.slice(0,4) };
  }).catch(e=>({err:e.message}));
  await p.screenshot({ path: `/tmp/qa/${s.name}.png` });
  console.log(`${s.name} HTTP ${r?r.status():"ERR"} ${JSON.stringify(probe)}`);
  await ctx.close();
}
await b.close();
console.log("ERRS:", errs.length?errs.join(" | "):"none");
