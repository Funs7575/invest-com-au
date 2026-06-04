/* eslint-disable */
/**
 * Adversarial / edge-case BOUNDARY-NAVIGATION probe (defensive robustness QA).
 *
 * Deep-links gated routes while logged out, hits nonexistent slugs, junk
 * querystrings, weird trailing slashes, very long paths, unicode/encoded paths.
 * For each it records: HTTP status, final URL after redirects, whether it
 * landed on a login page, whether the 404 UI rendered, and any app console
 * errors (proxy TLS/chunk noise filtered). Built-in retries (RV_TRIES) so the
 * sandbox's transient 403/503/SSL noise is separated from real defects.
 *
 * Behind the same side-effect firewall as site-audit.cjs (payments / affiliate
 * /go/ / leads / writes mocked — 0 real postbacks). Read-only navigation.
 *
 * Env: ADV_BASE, ADV_TRIES (default 3), ADV_OUT (json), ADV_MOBILE=1 for 390px.
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE = process.env.ADV_BASE || "https://lambent-sawine-17c3dd.netlify.app";
const TRIES = parseInt(process.env.ADV_TRIES || "3", 10);
const OUT = process.env.ADV_OUT || "/tmp/journey/adversarial-nav.json";
const MOBILE = process.env.ADV_MOBILE === "1";

// ── Probe set ────────────────────────────────────────────────────────────
// kind: "gated"     → expect redirect to a login page (NOT 200-with-content, NOT 404/500)
//       "notfound"  → expect a clean 404 (status 404 OR 404 UI), NOT 500/blank
//       "robust"    → expect 200 OR clean 404; NEVER 500/crash (junk input tolerance)
const PROBES = [
  // ── Gated deep-links (logged out) — must redirect to login, not leak/404/500 ──
  ["/account", "gated"],
  ["/account/dashboard", "gated"],
  ["/account/net-worth", "gated"],
  ["/account/holdings", "gated"],
  ["/account/vault", "gated"],
  ["/account/notifications", "gated"],
  ["/account/profile", "gated"],
  ["/advisor-portal", "gated"],
  ["/advisor-portal/billing", "gated"],
  ["/advisor-portal/reviews", "gated"],
  ["/firm-portal", "gated"],
  ["/firm-portal/billing", "gated"],
  ["/org-portal", "gated"],
  ["/startup-portal", "gated"],
  ["/startup-portal/data-room", "gated"],
  ["/broker-portal", "gated"],
  ["/broker-portal/wallet", "gated"],
  ["/admin", "gated"],
  ["/admin/analytics", "gated"],
  ["/admin/brokers", "gated"],
  ["/dashboard", "gated"],
  ["/pro/dashboard", "gated"],
  ["/pro/research", "gated"],
  ["/business-portal", "gated"],
  ["/my-briefs", "gated"],
  ["/my-learning", "gated"],
  // legacy login URLs that should redirect into /auth/login (the 2026-06-02 fix)
  ["/account/login?redirect=/account/net-worth", "gated"],
  ["/login?redirect=/account", "gated"],
  // ── Nonexistent slugs — must 404, not 500 ──
  ["/broker/zzz", "notfound"],
  ["/brokers/zzz-nonexistent-broker", "notfound"],
  ["/best/zzz-no-such-category", "notfound"],
  ["/advisor/zzz-nobody", "notfound"],
  ["/compare/zzz-vs-zzz", "notfound"],
  ["/versus/zzz-vs-yyy", "notfound"],
  ["/etfs/ZZZZ", "notfound"],
  ["/etfs/vs/zzz-vs-yyy", "notfound"],
  ["/grants/zzz-no-state", "notfound"],
  ["/glossary/zzz-no-term", "notfound"],
  ["/article/zzz-no-article", "notfound"],
  ["/articles/zzz-no-category", "notfound"],
  ["/invest/zzz-no-asset", "notfound"],
  ["/find-advisor/zzz-no-location", "notfound"],
  ["/advisors/zzz-no-type", "notfound"],
  ["/tag/zzz-no-tag", "notfound"],
  ["/questions/zzz-no-question", "notfound"],
  ["/this-route-truly-does-not-exist-12345", "notfound"],
  ["/account/zzz-no-subpage", "notfound"],
  // token routes with junk tokens — must not 500
  ["/plans/not-a-real-token-abc123", "robust"],
  ["/outcome/junk-token-xyz", "robust"],
  ["/quote/junk-token-xyz", "robust"],
  ["/shared-profile/junk-token-xyz", "robust"],
  ["/p/junk-token-xyz", "robust"],
  ["/review/junk-token-xyz", "robust"],
  // dynamic catch-alls that take arbitrary first segment
  ["/zzz-suburb-does-not-exist", "robust"],
  ["/investing-for/zzz-occupation", "robust"],
  ["/investing/zzz-city", "robust"],
  ["/just/zzz-event", "robust"],
  ["/persona/zzz-type", "robust"],
  // ── Junk querystrings / weird input on real pages — must stay 200, not 500 ──
  ["/compare?sort=%00%00&filter=<script>alert(1)</script>", "robust"],
  ["/best/beginners?page=999999999999999", "robust"],
  ["/search?q=" + encodeURIComponent("'\"><script>alert(1)</script>"), "robust"],
  ["/search?q=" + encodeURIComponent("a".repeat(5000)), "robust"],
  ["/advisors?postcode=abcdefg&radius=-1", "robust"],
  ["/quiz?step=-5&foo=bar", "robust"],
  ["/etfs/screener?minFee=NaN&maxFee=undefined", "robust"],
  ["/afsl-lookup?q=" + encodeURIComponent("'; DROP TABLE brokers;--"), "robust"],
  // ── Weird trailing slashes / casing / encoding ──
  ["/compare/", "robust"],
  ["/quiz/", "robust"],
  ["/COMPARE", "robust"],
  ["/Best/Beginners", "robust"],
  ["/compare//super", "robust"],
  ["/compare/%20", "robust"],
  ["/broker/%2e%2e%2f%2e%2e%2fetc%2fpasswd", "robust"],
  ["/glossary/" + encodeURIComponent("café-ünïcode-日本語"), "robust"],
  ["/best/" + encodeURIComponent("🚀emoji-slug"), "robust"],
  // ── Very long path ──
  ["/best/" + "a".repeat(2000), "robust"],
  ["/" + "segment/".repeat(60) + "end", "robust"],
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

const NOISE_RE = /SSL certificate|ERR_CERT|net::ERR|speed-insights|Failed to load resource: net|chunk-load|Loading chunk|ChunkLoadError|Importing a module script failed|the server responded with a status of 403|status of 503/i;
const LOGIN_RE = /\/auth\/login|\/admin\/login|\/broker-portal\/login|\/account\/login|\/auth\/signup/i;
const NOTFOUND_UI_RE = /page not found|couldn'?t find the page|404|no longer exists|page you'?re looking for/i;
// Content that would indicate a gated page LEAKED real authed data:
const LEAK_RE = /my dashboard|net worth|your holdings|account settings|sign out|log ?out|manage your leads|billing history|portfolio value|your portfolio|welcome back/i;
const ERR_UI_RE = /something went wrong|unexpected error|application error|client-side exception|this has been logged/i;

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: MOBILE ? { width: 390, height: 844 } : { width: 1366, height: 1000 },
    userAgent: MOBILE ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" : undefined,
    isMobile: MOBILE,
  });
  await ctx.addInitScript(() => { try { localStorage.setItem("user_onboarding_seen", "true"); ["cookie-consent","inv_cookie_consent","cookie_consent"].forEach((k)=>localStorage.setItem(k,"declined")); } catch {} });
  await ctx.route("**/*", (route) => {
    const c = classify(route.request().url(), route.request().method());
    if (!c) return route.continue();
    if (c === "affiliate" && route.request().method() === "GET") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Mocked</title>" });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mocked: true }) });
  });
  const page = await ctx.newPage();
  const out = { base: BASE, tries: TRIES, mobile: MOBILE, probes: [] };

  for (const [probe, kind] of PROBES) {
    const obs = [];
    for (let t = 0; t < TRIES; t++) {
      let appErrors = [], noiseErrors = [];
      const onErr = (m) => { if (m.type() !== "error") return; const txt = m.text().slice(0, 200); (NOISE_RE.test(txt) ? noiseErrors : appErrors).push(txt); };
      const onPageErr = (e) => { const txt = (e.message || String(e)).slice(0, 200); (NOISE_RE.test(txt) ? noiseErrors : appErrors).push("PAGEERROR: " + txt); };
      page.on("console", onErr); page.on("pageerror", onPageErr);
      let status = 0, finalUrl = probe, bodyLen = 0, bodySample = "", title = "";
      try {
        const resp = await page.goto(BASE + probe, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
        status = resp ? resp.status() : 0;
        await page.waitForTimeout(1200);
        const rec = await page.evaluate(() => {
          const t = (el) => (el && el.textContent || "").replace(/\s+/g, " ").trim();
          return { finalUrl: location.href, title: document.title, bodyLen: t(document.body).length, bodySample: t(document.body).slice(0, 400) };
        }).catch(() => ({ finalUrl: probe, title: "", bodyLen: 0, bodySample: "" }));
        finalUrl = rec.finalUrl; bodyLen = rec.bodyLen; bodySample = rec.bodySample; title = rec.title;
      } catch (e) { bodySample = "NAVERR " + (e.message || "").slice(0, 80); }
      page.off("console", onErr); page.off("pageerror", onPageErr);
      let finalPath = finalUrl; try { finalPath = new URL(finalUrl, BASE).pathname + new URL(finalUrl, BASE).search; } catch {}
      obs.push({
        status, finalPath, bodyLen, title: title.slice(0, 80),
        onLogin: LOGIN_RE.test(finalUrl),
        is404UI: NOTFOUND_UI_RE.test(bodySample) || NOTFOUND_UI_RE.test(title),
        isErrUI: ERR_UI_RE.test(bodySample),
        leaked: LEAK_RE.test(bodySample),
        appErrors: [...new Set(appErrors)], noiseCount: noiseErrors.length,
        sample: bodySample.slice(0, 140),
      });
    }
    // Aggregate across tries
    const statuses = obs.map((o) => o.status);
    const allApp = [...new Set(obs.flatMap((o) => o.appErrors))];
    const consistent = (pred) => obs.length === TRIES && obs.every(pred);
    const any = (pred) => obs.some(pred);
    let verdict = "OK", detail = "";

    if (kind === "gated") {
      // PASS if every try redirected to a login. FAIL if it consistently
      // served 200-with-content (leak) or 404/500.
      if (consistent((o) => o.onLogin)) { verdict = "OK"; detail = "redirects to login"; }
      else if (any((o) => o.status >= 500)) { verdict = "P1-500"; detail = "5xx on gated route"; }
      else if (consistent((o) => o.status === 200 && !o.onLogin && o.leaked)) { verdict = "P1-LEAK"; detail = "gated content served to anon"; }
      else if (consistent((o) => o.status === 200 && !o.onLogin && !o.is404UI)) { verdict = "P2-NO-REDIRECT"; detail = "200, not a login, no 404 UI (possible leak/anon-view)"; }
      else if (consistent((o) => o.status === 404 || o.is404UI)) { verdict = "P2-404"; detail = "gated route 404s instead of redirecting to login"; }
      else if (any((o) => o.onLogin)) { verdict = "FLAKY-OK"; detail = "redirected to login on some tries"; }
      else { verdict = "P3-UNCLEAR"; detail = "no login redirect; mixed outcomes"; }
    } else if (kind === "notfound") {
      if (any((o) => o.status >= 500)) { verdict = "P1-500"; detail = "5xx on nonexistent slug"; }
      else if (consistent((o) => o.status === 404 || o.is404UI)) { verdict = "OK"; detail = "clean 404"; }
      else if (consistent((o) => o.isErrUI)) { verdict = "P2-ERRUI"; detail = "error boundary instead of 404"; }
      else if (consistent((o) => o.status === 200 && !o.is404UI && o.bodyLen > 600)) { verdict = "P3-200"; detail = "200 with content for a junk slug (soft-404?)"; }
      else if (any((o) => o.status === 404 || o.is404UI)) { verdict = "FLAKY-OK"; detail = "404 on some tries"; }
      else { verdict = "P3-UNCLEAR"; detail = "neither 404 nor clean"; }
    } else { // robust
      if (any((o) => o.status >= 500)) { verdict = "P1-500"; detail = "5xx on junk input"; }
      else if (consistent((o) => o.isErrUI)) { verdict = "P2-ERRUI"; detail = "error boundary on junk input"; }
      else if (consistent((o) => o.status === 200 || o.status === 404 || o.is404UI || o.onLogin)) { verdict = "OK"; detail = "handled gracefully"; }
      else if (any((o) => o.status === 200 || o.status === 404 || o.is404UI)) { verdict = "FLAKY-OK"; detail = "handled on some tries"; }
      else { verdict = "P3-UNCLEAR"; detail = "unexpected outcome"; }
    }
    // App console error that is consistent across ALL tries is its own signal
    if (verdict.startsWith("OK") && allApp.length && consistent((o) => o.appErrors.length > 0)) {
      verdict = "P3-CONSOLE"; detail = "consistent app console error: " + allApp[0].slice(0, 80);
    }

    out.probes.push({ probe, kind, verdict, detail, statuses, finalPaths: [...new Set(obs.map((o) => o.finalPath))], onLoginCount: obs.filter((o)=>o.onLogin).length, leakedCount: obs.filter((o)=>o.leaked).length, is404Count: obs.filter((o)=>o.is404UI).length, appErrors: allApp, anyNoise: any((o)=>o.noiseCount>0), sample: obs[0].sample });
    const tag = verdict.startsWith("P1") ? "🔴P1" : verdict.startsWith("P2") ? "🟠P2" : verdict.startsWith("P3") ? "🟡P3" : verdict.startsWith("FLAKY") ? "·flaky" : "✓";
    console.log(`${tag} [${kind}] ${probe.slice(0,70)}  statuses=${statuses.join(",")} final=${[...new Set(obs.map((o)=>o.finalPath.slice(0,50)))].join("|")}  ${verdict}${detail?` :: ${detail}`:""}`);
  }

  await browser.close();
  fs.mkdirSync(require("path").dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  const bad = out.probes.filter((p) => /^P[123]/.test(p.verdict));
  console.log(`\n=== ADVERSARIAL NAV DONE (mobile=${MOBILE}) — ${out.probes.length} probes, ${bad.length} flagged ===`);
  console.log(JSON.stringify(bad.map((p) => ({ probe: p.probe.slice(0,60), verdict: p.verdict, statuses: p.statuses, detail: p.detail })), null, 2));
  console.log("WROTE " + OUT);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
