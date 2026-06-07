const { chromium } = require("playwright");
(async () => {
  const BASE = "https://lambent-sawine-17c3dd.netlify.app";
  const shots = [
    ["ux-landing", "/invest"],
    ["ux-sector-funds", "/invest/funds/listings"],
    ["ux-detail-listedsec", "/invest/funds/listings/boss-energy-boe"],
    ["ux-detail-mining-bespoke", "/invest/mining/listings"],
  ];
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 1100 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  // read-only; block affiliate/go + payment just in case
  await page.route("**/*", (r) => {
    const u = r.request().url();
    if (/\/go\/|\/api\/(lead|enquir|checkout|stripe)/i.test(u)) return r.abort();
    return r.continue();
  });
  for (const [name, path] of shots) {
    for (let i = 0; i < 4; i++) {
      try {
        const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
        if ((res?.status() ?? 0) === 200) break;
      } catch (e) {}
      await page.waitForTimeout(2000);
    }
    await page.waitForLoadState("load", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `bots/reports/${name}.png`, fullPage: false });
    console.log("shot", name, path);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
