/* eslint-disable */
/**
 * Re-verification harness — hits each candidate route N times via real browser
 * navigation (the reliable path; the request-API context is the flaky one in
 * this TLS-MITM sandbox) and reports the DISTRIBUTION of outcomes so transient
 * proxy 403/503 noise is separated from consistent defects.
 *
 * Behind the same side-effect firewall as site-audit.cjs (payments / affiliate
 * /go/ / leads / writes mocked — 0 real postbacks). Read-only otherwise.
 *
 * Env: RV_BASE (target), RV_ROUTES (comma-separated; default suspect list),
 *      RV_TRIES (default 5), RV_OUT (json path).
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE = process.env.RV_BASE || "https://lambent-sawine-17c3dd.netlify.app";
const TRIES = parseInt(process.env.RV_TRIES || "5", 10);
const OUT = process.env.RV_OUT || "/tmp/reverify.json";
const ROUTES = (process.env.RV_ROUTES ||
  "/quiz,/get-matched,/start,/account,/account/dashboard,/admin,/org-portal,/advisor-portal,/about,/savings-calculator,/crypto,/share-trading,/briefs,/marketplace,/teams,/auth/login")
  .split(",").map((s) => s.trim()).filter(Boolean);

function classify(url, method) {
  let p; try { p = new URL(url, BASE).pathname; } catch { return null; }
  const WRITE = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
  if (/^\/go\//.test(p)) return "affiliate";
  if (/^\/api\/stripe\//.test(p) || /checkout|billing/i.test(p)) return "payment";
  if (/^\/api\/(advisor-enquiry|advisor-lead|submit-lead|quiz-lead|booking|advisor-booking|answers\/ask|user-review|advisor-review|questions|newsletter[\w/-]*|exit-intent-log|track-event|community\/)/.test(p)) return "lead/write";
  if (WRITE && /^\/api\//.test(p)) return "write";
  return null;
}

// Proxy-noise patterns: NOT real app errors.
const NOISE_RE = /SSL certificate|ERR_CERT|net::ERR|speed-insights|Failed to load resource: net|chunk-load|Loading chunk|ChunkLoadError|Importing a module script failed/i;

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("user_onboarding_seen", "true"); ["cookie-consent","inv_cookie_consent","cookie_consent"].forEach((k)=>localStorage.setItem(k,"declined")); } catch {} });
  await ctx.route("**/*", (route) => {
    const c = classify(route.request().url(), route.request().method());
    if (!c) return route.continue();
    if (c === "affiliate" && route.request().method() === "GET") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Mocked</title>" });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mocked: true }) });
  });
  const page = await ctx.newPage();
  const out = { base: BASE, tries: TRIES, routes: {} };

  for (const route of ROUTES) {
    const obs = [];
    for (let t = 0; t < TRIES; t++) {
      let appErrors = [];
      let noiseErrors = [];
      const onErr = (m) => {
        if (m.type() !== "error") return;
        const txt = m.text().slice(0, 200);
        if (NOISE_RE.test(txt)) noiseErrors.push(txt); else appErrors.push(txt);
      };
      const onPageErr = (e) => { const txt = (e.message||String(e)).slice(0,200); if (NOISE_RE.test(txt)) noiseErrors.push(txt); else appErrors.push("PAGEERROR: "+txt); };
      page.on("console", onErr);
      page.on("pageerror", onPageErr);
      let status = 0, finalPath = route, h1 = "", bodyLen = 0, sample = "";
      try {
        const resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
        status = resp ? resp.status() : 0;
        await page.waitForTimeout(1600);
        const rec = await page.evaluate(() => {
          const t = (el) => (el && el.textContent || "").replace(/\s+/g, " ").trim();
          return { finalPath: location.pathname + location.search, h1: t(document.querySelector("h1")), bodyLen: t(document.body).length, sample: t(document.body).slice(0, 160) };
        }).catch(() => ({ finalPath: route, h1: "", bodyLen: 0, sample: "" }));
        finalPath = rec.finalPath; h1 = rec.h1; bodyLen = rec.bodyLen; sample = rec.sample;
      } catch (e) { sample = "NAVERR " + (e.message || "").slice(0, 80); }
      page.off("console", onErr); page.off("pageerror", onPageErr);
      obs.push({ status, finalPath, h1: h1.slice(0, 60), bodyLen, appErrors: [...new Set(appErrors)], noiseCount: noiseErrors.length, sample: sample.slice(0,120) });
    }
    // Aggregate
    const statuses = obs.map((o) => o.status);
    const okCount = statuses.filter((s) => s >= 200 && s < 400).length;
    const finalPaths = [...new Set(obs.map((o) => o.finalPath))];
    const h1Present = obs.filter((o) => o.h1).length;
    const allAppErrors = [...new Set(obs.flatMap((o) => o.appErrors))];
    const consistentAppError = obs.every((o) => o.appErrors.length > 0) && obs.length === TRIES;
    out.routes[route] = {
      statuses, okCount, tries: TRIES,
      finalPaths, h1Present, h1Sample: (obs.find((o)=>o.h1)||{}).h1 || "",
      appErrors: allAppErrors, consistentAppError,
      anyNoise: obs.some((o) => o.noiseCount > 0),
      sample: obs[0].sample,
    };
    const verdict = okCount === TRIES ? "OK" : okCount === 0 ? "ALL-FAIL" : `FLAKY(${okCount}/${TRIES})`;
    console.log(`${route}  [${verdict}] statuses=${statuses.join(",")} h1=${h1Present}/${TRIES} appErr=${allAppErrors.length}${allAppErrors.length?` :: ${allAppErrors[0].slice(0,90)}`:""}  final=${finalPaths.join("|")}`);
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log("\nWROTE " + OUT);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
