/* eslint-disable */
/**
 * Broad site audit — launch-readiness sweep across a known route list.
 *
 * Per route: HTTP status, console errors (proxy noise filtered), <h1> presence,
 * a primary-CTA heuristic, visible internal-link count, and an empty/error
 * heuristic. Also collects internal links site-wide and re-probes a deduped
 * sample with RETRIES (verify-before-reporting) so only consistently-broken
 * links are flagged. Behind the side-effect firewall (payments / affiliate /
 * leads / writes mocked — 0 real postbacks). Read-only navigations otherwise.
 *
 * AUDIT_BASE (default Netlify) · AUDIT_OUT (default /tmp/journey).
 */
const { chromium, request } = require("@playwright/test");
const fs = require("fs");

const BASE = process.env.AUDIT_BASE || "https://lambent-sawine-17c3dd.netlify.app";
const OUT = process.env.AUDIT_OUT || "/tmp/journey";
fs.mkdirSync(OUT, { recursive: true });
const ORIGIN = new URL(BASE).origin;

// Representative routes across every family (+ gated entry points to confirm
// they redirect, not 404/500). Tagged with expected access for triage.
const ROUTES = [
  // anon content / pillars
  ["/", "anon"], ["/compare", "anon"], ["/share-trading", "anon"], ["/crypto", "anon"],
  ["/super", "anon"], ["/savings", "anon"], ["/cfd", "anon"], ["/etfs", "anon"],
  ["/term-deposits", "anon"], ["/robo-advisors", "anon"], ["/property-platforms", "anon"],
  // best / category
  ["/best", "anon"], ["/best/beginners", "anon"], ["/best/us-shares", "anon"],
  ["/best/low-fees", "anon"], ["/best/smsf", "anon"], ["/best/crypto", "anon"],
  // compare variants
  ["/compare/super", "anon"], ["/compare/etfs", "anon"], ["/compare/non-residents", "anon"],
  // advisors
  ["/advisors", "anon"], ["/advisors/financial-planners", "anon"], ["/advisors/smsf-accountants", "anon"],
  ["/advisors/tax-agents", "anon"], ["/find-advisor", "anon"], ["/find-advisor/life-event", "anon"],
  // funnels / quizzes
  ["/quiz", "anon"], ["/get-matched", "anon"], ["/start", "anon"], ["/smsf/quiz", "anon"],
  ["/halal-investing/quiz", "anon"], ["/first-home-buyer/quiz", "anon"], ["/grants/eligibility-quiz", "anon"],
  // calculators
  ["/calculators", "anon"], ["/savings-calculator", "anon"], ["/smsf-calculator", "anon"],
  ["/fire-calculator", "anon"], ["/mortgage-calculator", "anon"], ["/franking-credits-calculator", "anon"],
  // foreign investment / hubs / content
  ["/foreign-investment", "anon"], ["/wholesale", "anon"], ["/family-office", "anon"],
  ["/smsf", "anon"], ["/grants", "anon"], ["/learn", "anon"], ["/articles", "anon"],
  ["/reviews", "anon"], ["/community", "anon"], ["/questions", "anon"], ["/deals", "anon"],
  ["/how-we-earn", "anon"], ["/methodology", "anon"], ["/about", "anon"],
  // gated entry points — expect a redirect to /auth/login (NOT 404/500)
  ["/account", "gated"], ["/account/dashboard", "gated"], ["/advisor-portal", "gated"],
  ["/firm-portal", "gated"], ["/org-portal", "gated"], ["/admin", "gated"],
  ["/community/new", "gated"], ["/marketplace", "maybe-anon"], ["/pros", "maybe-anon"], ["/teams", "maybe-anon"],
  // auth pages themselves
  ["/auth/login", "anon"], ["/auth/signup", "anon"],
];

function classify(url, method) {
  let p; try { p = new URL(url, BASE).pathname; } catch { return null; }
  const WRITE = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
  if (/^\/go\//.test(p)) return "affiliate";
  if (/^\/api\/stripe\//.test(p) || /checkout|billing/i.test(p)) return "payment";
  if (/^\/api\/(advisor-enquiry|advisor-lead|submit-lead|quiz-lead|booking|advisor-booking|answers\/ask|user-review|advisor-review|questions|newsletter[\w/-]*|exit-intent-log|track-event|community\/)/.test(p)) return "lead/write";
  if (WRITE && /^\/api\//.test(p)) return "write";
  return null;
}

const CTA_RE = /compare|get matched|open account|find (an )?advis|start|view|see |enquire|book|sign ?up|get started|browse|calculate|check|take the|visit/i;
const EMPTY_ERR_RE = /something went wrong|ran into a problem|page not found|404|this page could|application error|client-side exception|failed to load/i;

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("user_onboarding_seen", "true"); ["cookie-consent", "inv_cookie_consent", "cookie_consent"].forEach((k) => localStorage.setItem(k, "declined")); } catch {} });
  await ctx.route("**/*", (route) => {
    const c = classify(route.request().url(), route.request().method());
    if (!c) return route.continue();
    if (c === "affiliate" && route.request().method() === "GET") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Mocked</title>" });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mocked: true }) });
  });
  const page = await ctx.newPage();
  const allLinks = new Set();
  const results = [];

  for (const [route, expect] of ROUTES) {
    let status = 0, consoleErrors = [], rec;
    const onErr = (m) => { if (m.type() === "error" && !/SSL certificate|ERR_CERT|net::ERR|speed-insights/i.test(m.text())) consoleErrors.push(m.text().slice(0, 140)); };
    page.on("console", onErr);
    try {
      let resp = null;
      for (let t = 0; t < 2 && !resp; t++) { resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null); }
      status = resp ? resp.status() : 0;
      await page.waitForTimeout(1400);
      rec = await page.evaluate((CTA_SRC) => {
        const CTA = new RegExp(CTA_SRC, "i");
        const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none"; };
        const t = (el) => (el && el.textContent || "").replace(/\s+/g, " ").trim();
        const h1 = t(document.querySelector("h1"));
        const links = [...document.querySelectorAll('a[href^="/"], a[href^="' + location.origin + '"]')].map((a) => a.getAttribute("href")).filter(Boolean);
        const cta = [...document.querySelectorAll("a,button")].filter(vis).some((el) => CTA.test(t(el)));
        return { h1, finalPath: location.pathname, linkCount: links.length, links: links.slice(0, 120), cta, bodyLen: t(document.body).length, bodySample: t(document.body).slice(0, 200) };
      }, CTA_RE.source).catch(() => ({ h1: "", finalPath: route, linkCount: 0, links: [], cta: false, bodyLen: 0, bodySample: "" }));
    } catch (e) { rec = { h1: "", finalPath: route, linkCount: 0, links: [], cta: false, bodyLen: 0, bodySample: "ERR " + (e.message || "").slice(0, 80) }; }
    page.off("console", onErr);
    (rec.links || []).forEach((l) => { try { allLinks.add(new URL(l, BASE).pathname); } catch {} });

    const redirectedToLogin = /\/auth\/login/.test(rec.finalPath);
    const emptyOrError = status >= 400 || (rec.bodyLen < 400 && !redirectedToLogin) || EMPTY_ERR_RE.test(rec.bodySample);
    const gatedOk = expect === "gated" ? redirectedToLogin : null;
    const flag = [];
    if (status >= 400) flag.push("HTTP-" + status);
    if (emptyOrError) flag.push("empty/error");
    if (expect === "gated" && !redirectedToLogin && status < 400) flag.push("gated-not-redirected");
    if (expect === "anon" && !rec.h1 && status < 400 && !emptyOrError) flag.push("no-h1");
    if (expect === "anon" && !rec.cta && status < 400) flag.push("no-cta");
    if (consoleErrors.length) flag.push("console-errors");

    results.push({ route, expect, status, finalPath: rec.finalPath, h1: (rec.h1 || "").slice(0, 70), cta: rec.cta, linkCount: rec.linkCount, bodyLen: rec.bodyLen, redirectedToLogin, consoleErrors: [...new Set(consoleErrors)], flags: flag });
    console.log(`${flag.length ? "⚠️ " : "✓ "}${route}  [${status}]  h1:${rec.h1 ? "y" : "n"} cta:${rec.cta ? "y" : "n"} links:${rec.linkCount}${flag.length ? "  FLAGS: " + flag.join(",") : ""}`);
  }

  // ── Broken-link check: probe links not already audited, with retries ──
  const audited = new Set(ROUTES.map((r) => r[0]));
  const toProbe = [...allLinks].filter((p) => !audited.has(p) && !/^\/go\//.test(p)).slice(0, 80);
  const rc = await request.newContext({ ignoreHTTPSErrors: true, timeout: 20000 });
  const broken = [];
  for (const p of toProbe) {
    let statuses = [];
    for (let t = 0; t < 4; t++) {
      const r = await rc.get(BASE + p, { failOnStatusCode: false }).catch(() => null);
      statuses.push(r ? r.status() : 0);
      if (r && r.status() < 400) break;            // a single good response clears it
    }
    const good = statuses.some((s) => s >= 200 && s < 400);
    if (!good) broken.push({ path: p, statuses });   // consistently bad across retries
  }
  await rc.dispose();
  await browser.close();

  const flagged = results.filter((r) => r.flags.length);
  const summary = {
    base: BASE, routesAudited: results.length, flaggedCount: flagged.length,
    flagged: flagged.map((r) => ({ route: r.route, status: r.status, flags: r.flags, consoleErrors: r.consoleErrors })),
    linksDiscovered: allLinks.size, linksProbed: toProbe.length, brokenLinks: broken,
  };
  fs.writeFileSync(`${OUT}/site-audit.json`, JSON.stringify({ summary, results }, null, 2));
  console.log("\n=== SITE AUDIT SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
