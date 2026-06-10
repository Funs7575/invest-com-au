/* eslint-disable */
/**
 * In-session AI journey harness (v4 — full-signal best-first crawl).
 *
 * Drives a real browser against the live site as a persona. Captures:
 *   - UX observations (headings, CTAs, forms, buttons)
 *   - Tap-target size violations (< 44 px on mobile)
 *   - SEO/meta signals (canonical, og:title, description, JSON-LD presence)
 *   - Performance (navigation timing: TTFB, DOMContentLoaded, load)
 *   - A11y quick-scan (images without alt, buttons without accessible name)
 *   - Broken images (naturalWidth === 0 after load)
 *   - Cookie banner detection
 *   - Console errors + failed API responses
 *
 * Goal-directed best-first crawl with retry-on-transient + backtracking.
 * Claude (in-session, on Max plan) reads the JSON + screenshots and judges
 * like a real user. No Anthropic API key. No separate bill.
 *
 * Env vars:
 *   JOURNEY_BASE       Target origin (default: Netlify preview)
 *   JOURNEY_START      Start path (default: /)
 *   JOURNEY_NAME       Persona name used in output filenames
 *   JOURNEY_GOAL       Plain-text goal for the report
 *   JOURNEY_KEYWORDS   Comma-separated terms that score links higher
 *   JOURNEY_STEPS      Max pages to visit (default: 15)
 *   JOURNEY_VIEWPORT   mobile | tablet | desktop (default: desktop)
 *   JOURNEY_OUT        Output directory (default: /tmp/journey)
 *   JOURNEY_ALLOW_WRITES  Set to "1" to allow non-payment API writes
 *                         (use against a sandbox deploy, not production)
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE        = process.env.JOURNEY_BASE     || "https://lambent-sawine-17c3dd.netlify.app";
const START       = process.env.JOURNEY_START    || "/";
const NAME        = process.env.JOURNEY_NAME     || "persona";
const GOAL        = process.env.JOURNEY_GOAL     || "";
const KEYWORDS    = (process.env.JOURNEY_KEYWORDS || "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const MAX_STEPS   = parseInt(process.env.JOURNEY_STEPS || "15", 10);
const ALLOW_WRITES = process.env.JOURNEY_ALLOW_WRITES === "1";
const OUT         = process.env.JOURNEY_OUT      || "/tmp/journey";
fs.mkdirSync(OUT, { recursive: true });

// ── Viewports ────────────────────────────────────────────────────────────────
const VIEWPORTS = {
  mobile:  { width: 390,  height: 844,  isMobile: true,  hasTouch: true,
             ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  tablet:  { width: 820,  height: 1180, isMobile: true,  hasTouch: true,
             ua: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  desktop: { width: 1366, height: 900,  isMobile: false, hasTouch: false,
             ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
};
const VP = VIEWPORTS[(process.env.JOURNEY_VIEWPORT || "desktop").toLowerCase()] || VIEWPORTS.desktop;
const IS_MOBILE = VP.isMobile;

// ── Side-effect firewall ─────────────────────────────────────────────────────
function shouldMock(url, method) {
  let path; try { path = new URL(url, BASE).pathname; } catch { return false; }
  const m = method.toUpperCase();
  const WRITE = m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
  // Always mock — regardless of allow-writes mode.
  if (/^\/go\//.test(path)) return "affiliate";
  if (/^\/api\/(affiliate\/click|track-click|ab-track|drip-click|attribution\/touch|form-event|track-event)\b/.test(path)) return "affiliate";
  if (/^\/api\/stripe\//.test(path) || /billing/i.test(path) || /checkout/i.test(path)) return "payment";
  if (/^\/api\/(account\/holdings\/sharesight|org-auth\/stripe-connect|webhooks\/)/.test(path)) return "external";
  if (/^\/api\/account\/(delete|documents)\b/.test(path)) return "destructive";
  // Conditionally allow writes when JOURNEY_ALLOW_WRITES=1 (sandbox target).
  if (WRITE && /^\/api\//.test(path)) return ALLOW_WRITES ? false : "write";
  return false;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const SKIP_LINK  = /(\/go\/|logout|sign[-\s]?out|signout|\/auth\/|delete|unsubscribe|mailto:|tel:|\.pdf$|^#|^javascript:)/i;
const PROXY_NOISE = /SSL certificate|ERR_CERT|net::ERR|Failed to load resource.*(net::|status of 4)|chrome-error/i;
const CTA = ["compare","get started","get matched","find","match","open account","book","view","see all",
             "browse","start","calculate","quiz","next","continue","apply","join","explore","learn more",
             "choose","review","connect","contact","enquire","send"];

function sameOrigin(href) {
  if (!href) return false;
  if (href.startsWith("/")) return !href.startsWith("//");
  return href.startsWith(BASE);
}
function normPath(href) {
  try { return new URL(href, BASE).pathname.replace(/\/$/, "") || "/"; } catch { return null; }
}
function scoreLink(l) {
  const t = (l.text || "").toLowerCase();
  const h = (l.href || "").toLowerCase();
  let s = 0;
  for (const k of KEYWORDS) { if (t.includes(k)) s += 3; if (h.includes(k)) s += 2; }
  for (const c of CTA) { if (t.includes(c)) { s += 1; break; } }
  return s;
}

// ── Full-signal page observer (runs in browser context) ───────────────────────
const observeFn = (isMobile) => {
  const txt = (el) => (el && el.textContent || "").replace(/\s+/g, " ").trim();
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };

  // ── Core UX ────────────────────────────────────────────────────────────────
  const headings = [...document.querySelectorAll("h1,h2")].filter(vis).map((h) => h.tagName + ": " + txt(h)).slice(0, 30);
  const links = [...document.querySelectorAll("a[href]")].filter(vis)
    .map((a) => ({ text: txt(a).slice(0, 80), href: a.getAttribute("href") })).filter((l) => l.text && l.href);
  const buttons = [...document.querySelectorAll("button,[role=button],input[type=submit]")].filter(vis)
    .map((b) => txt(b) || b.getAttribute("aria-label") || "").filter(Boolean).slice(0, 30);
  const fields = [...document.querySelectorAll("input,select,textarea")].filter(vis)
    .map((f) => ({ type: f.getAttribute("type") || f.tagName.toLowerCase(), name: f.getAttribute("name") || f.id || "", placeholder: f.getAttribute("placeholder") || "" })).slice(0, 30);
  const conversionCtas = links.filter((l) => /^\/go\//.test(l.href)).map((l) => ({ text: l.text, href: l.href })).slice(0, 20);
  const h1 = txt(document.querySelector("h1"));
  const bodyText = txt(document.body);
  const notFound   = /404|page not found/i.test(document.title) || /404|page not found|doesn.?t exist|no longer available/i.test(h1);
  const emptyish   = bodyText.length < 350;
  const mentionsFees = /\bfees?\b|\bbrokerage\b|\$\s?\d|per trade|monthly fee|management fee/i.test(bodyText);
  const mentionsRisk = /\brisk\b|capital at risk|may lose|not (financial|personal) advice|general (advice|information)/i.test(bodyText);

  // ── Tap-target size check (mobile only) ───────────────────────────────────
  const TAP_MIN = 44;
  const tapViolations = isMobile
    ? [...document.querySelectorAll("a,button,[role=button],[role=link]")].filter(vis).reduce((acc, el) => {
        const r = el.getBoundingClientRect();
        if (r.width < TAP_MIN || r.height < TAP_MIN) {
          const label = (txt(el) || el.getAttribute("aria-label") || el.tagName).slice(0, 60);
          acc.push({ label, w: Math.round(r.width), h: Math.round(r.height) });
        }
        return acc;
      }, []).slice(0, 20)
    : [];

  // ── SEO / meta ─────────────────────────────────────────────────────────────
  const canonical    = (document.querySelector('link[rel=canonical]') || {}).href || null;
  const ogTitle      = (document.querySelector('meta[property="og:title"]') || {}).content || null;
  const metaDesc     = (document.querySelector('meta[name=description]') || {}).content || null;
  const hasJsonLd    = document.querySelectorAll('script[type="application/ld+json"]').length;
  const robotsMeta   = (document.querySelector('meta[name=robots]') || {}).content || null;

  // ── Performance timing ────────────────────────────────────────────────────
  let perf = null;
  try {
    const t = performance.timing;
    perf = {
      ttfb:  t.responseStart - t.navigationStart,
      domCL: t.domContentLoadedEventEnd - t.navigationStart,
      load:  t.loadEventEnd - t.navigationStart,
    };
  } catch {}

  // ── A11y quick-scan ────────────────────────────────────────────────────────
  const imgsNoAlt = [...document.querySelectorAll("img")].filter(vis)
    .filter((img) => !img.getAttribute("alt") && !img.getAttribute("aria-label") && !img.getAttribute("role"))
    .map((img) => (img.getAttribute("src") || "").split("/").pop().slice(0, 60)).slice(0, 10);
  const btnsNoName = [...document.querySelectorAll("button,[role=button]")].filter(vis)
    .filter((b) => !txt(b) && !b.getAttribute("aria-label") && !b.getAttribute("title"))
    .length;
  const inputsNoLabel = [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea")].filter(vis)
    .filter((el) => {
      const id = el.id;
      return !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !(id && document.querySelector(`label[for="${id}"]`));
    }).length;

  // ── Broken images ─────────────────────────────────────────────────────────
  const brokenImgs = [...document.querySelectorAll("img")].filter(vis)
    .filter((img) => img.complete && img.naturalWidth === 0)
    .map((img) => (img.getAttribute("src") || "").slice(0, 80)).slice(0, 10);

  // ── Cookie banner ─────────────────────────────────────────────────────────
  const hasCookieBanner = !!document.querySelector('[id*=cookie],[class*=cookie],[id*=consent],[class*=consent],[id*=gdpr],[class*=gdpr]');

  return {
    url: location.href, title: document.title, h1, headings, links, buttons, fields,
    conversionCtas, notFound, emptyish, mentionsFees, mentionsRisk,
    bodyLen: bodyText.length, bodyTextSample: bodyText.slice(0, 2000),
    tapViolations, canonical, ogTitle, metaDesc, hasJsonLd, robotsMeta, perf,
    imgsNoAlt, btnsNoName, inputsNoLabel, brokenImgs, hasCookieBanner,
  };
};

// ── Navigation with retry ─────────────────────────────────────────────────────
async function gotoWithRetry(page, url) {
  let last = { status: 0, error: "" };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const status = resp ? resp.status() : 0;
      if (status === 403 || status === 429 || status >= 500) {
        last = { status, error: "http " + status };
        await page.waitForTimeout(1500 * attempt);
        continue;
      }
      return { status, ok: true, attempts: attempt };
    } catch (e) {
      last = { status: 0, error: (e.message || "").split("\n")[0].slice(0, 140) };
      await page.waitForTimeout(1500 * attempt);
    }
  }
  return { status: last.status, ok: false, error: last.error, attempts: 3 };
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport:   { width: VP.width, height: VP.height },
    userAgent:  VP.ua,
    isMobile:   VP.isMobile,
    hasTouch:   VP.isMobile,
  });

  // Pre-dismiss cookie/onboarding overlays so they don't block taps.
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("user_onboarding_seen", "true");
      localStorage.setItem("cookie-consent", "declined");
      localStorage.setItem("inv_cookie_consent", "declined");
      localStorage.setItem("cookie_consent", "declined");
    } catch {}
    try { sessionStorage.setItem("inv_newsletter_exit_intent_shown", "1"); } catch {}
  });

  const mocked = [];
  await ctx.route("**/*", (route) => {
    const req = route.request();
    const cat = shouldMock(req.url(), req.method());
    if (cat) {
      let p = "?"; try { p = new URL(req.url(), BASE).pathname; } catch {}
      mocked.push({ category: cat, method: req.method(), path: p });
      if (cat === "affiliate" && req.method() === "GET") {
        return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Mocked affiliate redirect</title><p>Outbound affiliate click intercepted.</p>" });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mocked: true }) });
    }
    return route.continue();
  });

  const page = await ctx.newPage();
  const consoleErrors = [], proxyNoise = [], failedResponses = [], externalFailures = [];
  const baseOrigin = new URL(BASE).origin;
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text().slice(0, 200);
    (PROXY_NOISE.test(t) ? proxyNoise : consoleErrors).push(t);
  });
  page.on("response", (r) => {
    if (r.status() < 400) return;
    try {
      const u = new URL(r.url(), BASE);
      const line = r.status() + " " + u.pathname;
      (u.origin === baseOrigin ? failedResponses : externalFailures).push(line);
    } catch {}
  });
  page.on("pageerror", (e) => {
    const t = "pageerror: " + (e.message || "").slice(0, 200);
    (PROXY_NOISE.test(t) ? proxyNoise : consoleErrors).push(t);
  });

  // ── Goal-directed best-first crawl ────────────────────────────────────────
  const visited  = new Set();
  const steps    = [];
  const frontier = [{ href: START, score: 999, fromText: null, fromUrl: null, depth: 0 }];

  while (frontier.length && steps.length < MAX_STEPS) {
    frontier.sort((a, b) => b.score - a.score);
    const item = frontier.shift();
    const np = normPath(item.href);
    if (!np || visited.has(np)) continue;
    visited.add(np);

    const i = steps.length;
    const action = item.depth === 0 ? "start" : `clicked "${item.fromText}" (from ${normPath(item.fromUrl)})`;
    const eS = consoleErrors.length, fS = failedResponses.length, pS = proxyNoise.length, xS = externalFailures.length, mS = mocked.length;
    const url = item.href.startsWith("http") ? item.href : BASE + item.href;

    const nav = await gotoWithRetry(page, url);
    // Brief settle — enough for JS hydration without being slow.
    await page.waitForTimeout(1400);

    let obs;
    try { obs = await page.evaluate(observeFn, IS_MOBILE); }
    catch (e) { obs = { url: page.url(), links: [], evalError: (e.message || "").slice(0, 160) }; }

    const shot = `${OUT}/${NAME}-step-${i}.png`;
    try { await page.screenshot({ path: shot, fullPage: true }); }
    catch { try { await page.screenshot({ path: shot }); } catch {} }

    const realDeadEnd = !nav.ok || obs.notFound;
    let enqueued = 0;
    if (nav.ok && obs.links) {
      for (const l of obs.links) {
        if (!sameOrigin(l.href) || SKIP_LINK.test(l.href) || SKIP_LINK.test(l.text)) continue;
        const lnp = normPath(l.href);
        if (!lnp || visited.has(lnp)) continue;
        frontier.push({ href: l.href, score: scoreLink(l) - item.depth * 0.5, fromText: l.text, fromUrl: obs.url, depth: item.depth + 1 });
        enqueued++;
      }
    }

    steps.push({
      step: i, action, depth: item.depth,
      navStatus: nav.status, navOk: nav.ok, navAttempts: nav.attempts, navError: nav.error || null,
      url: obs.url, title: obs.title, h1: obs.h1,
      notFound: obs.notFound, emptyish: obs.emptyish, realDeadEnd, bodyLen: obs.bodyLen,
      mentionsFees: obs.mentionsFees, mentionsRisk: obs.mentionsRisk,
      headings: obs.headings, links: (obs.links || []).slice(0, 50),
      buttons: obs.buttons, fields: obs.fields, conversionCtas: obs.conversionCtas,
      // Full-signal extras
      tapViolations: obs.tapViolations || [],
      seo: { canonical: obs.canonical, ogTitle: obs.ogTitle, metaDesc: obs.metaDesc, hasJsonLd: obs.hasJsonLd, robotsMeta: obs.robotsMeta },
      perf: obs.perf,
      a11y: { imgsNoAlt: obs.imgsNoAlt || [], btnsNoName: obs.btnsNoName || 0, inputsNoLabel: obs.inputsNoLabel || 0 },
      brokenImgs: obs.brokenImgs || [],
      hasCookieBanner: obs.hasCookieBanner || false,
      bodyTextSample: obs.bodyTextSample,
      consoleErrors:     consoleErrors.slice(eS),
      failedResponses:   failedResponses.slice(fS),
      externalFailures:  externalFailures.slice(xS),
      proxyNoise:        proxyNoise.slice(pS),
      mocked:            mocked.slice(mS),
      screenshot:        shot,
    });

    // ── Console output ───────────────────────────────────────────────────────
    console.log(`\n── step ${i} (depth ${item.depth}) · ${action}`);
    console.log(`   ${obs.url}`);
    console.log(`   title: ${obs.title}  status:${nav.status}${nav.attempts > 1 ? " (after " + nav.attempts + " tries)" : ""}${obs.notFound ? "  [!! NOT FOUND]" : ""}${realDeadEnd ? "  [DEAD-END]" : ""}`);
    console.log(`   links:${(obs.links || []).length} buttons:${(obs.buttons || []).length} fields:${(obs.fields || []).length}  fees:${obs.mentionsFees ? "Y" : "·"} risk:${obs.mentionsRisk ? "Y" : "·"}  +${enqueued} queued`);
    if (obs.perf) console.log(`   perf: TTFB ${obs.perf.ttfb}ms  DCL ${obs.perf.domCL}ms  load ${obs.perf.load}ms`);
    if ((obs.tapViolations || []).length) console.log(`   !! tap targets < 44px: ${obs.tapViolations.length} — e.g. "${(obs.tapViolations[0] || {}).label}" ${(obs.tapViolations[0] || {}).w}×${(obs.tapViolations[0] || {}).h}px`);
    if ((obs.brokenImgs || []).length) console.log(`   !! broken images: ${obs.brokenImgs.length}`);
    if ((obs.imgsNoAlt || []).length) console.log(`   !! images without alt: ${obs.imgsNoAlt.length}`);
    if (obs.btnsNoName) console.log(`   !! buttons without accessible name: ${obs.btnsNoName}`);
    if (obs.conversionCtas && obs.conversionCtas.length) console.log(`   conversion CTAs: ${obs.conversionCtas.length} (e.g. "${obs.conversionCtas[0].text}" → ${obs.conversionCtas[0].href})`);
    const sc = consoleErrors.slice(eS), sf = failedResponses.slice(fS), sm = mocked.slice(mS);
    if (sc.length) console.log(`   !! console errors: ${sc.length} — ${sc[0]}`);
    if (sf.length) console.log(`   !! internal failed responses: ${[...new Set(sf)].join(", ")}`);
    if (proxyNoise.slice(pS).length) console.log(`   (sandbox proxy noise ignored: ${proxyNoise.slice(pS).length})`);
    if (sm.length) console.log(`   firewall mocked ${sm.length}: ${[...new Set(sm.map((x) => x.category + " " + x.path))].join(" | ")}`);
  }

  await browser.close();

  const dedupe = (a) => [...new Set(a)];
  const allTapViolations = steps.flatMap((s) => s.tapViolations || []);
  const allBrokenImgs    = dedupe(steps.flatMap((s) => s.brokenImgs || []));
  const summary = {
    persona: NAME, goal: GOAL, base: BASE, start: START, viewport: process.env.JOURNEY_VIEWPORT || "desktop",
    stepsVisited: steps.length,
    pagesVisited: steps.map((s) => normPath(s.url)),
    totalMocked: mocked.length,
    mockedByCategory: mocked.reduce((a, m) => ((a[m.category] = (a[m.category] || 0) + 1), a), {}),
    realConsoleErrors:    dedupe(consoleErrors),
    realInternalFailures: dedupe(failedResponses),
    sandboxProxyNoise:    proxyNoise.length,
    externalFailures:     dedupe(externalFailures).length,
    pagesWithFees:        steps.filter((s) => s.mentionsFees).length,
    pagesWithRisk:        steps.filter((s) => s.mentionsRisk).length,
    conversionCtasSeen:   dedupe(steps.flatMap((s) => (s.conversionCtas || []).map((c) => c.href))),
    realDeadEnds:         steps.filter((s) => s.realDeadEnd).map((s) => ({ url: normPath(s.url), status: s.navStatus, from: s.action })),
    // Full-signal extras
    tapViolationCount:  allTapViolations.length,
    tapViolationSample: allTapViolations.slice(0, 5),
    brokenImages:       allBrokenImgs,
    a11y: {
      totalImgsNoAlt:      steps.reduce((n, s) => n + (s.a11y?.imgsNoAlt?.length || 0), 0),
      totalBtnsNoName:     steps.reduce((n, s) => n + (s.a11y?.btnsNoName || 0), 0),
      totalInputsNoLabel:  steps.reduce((n, s) => n + (s.a11y?.inputsNoLabel || 0), 0),
    },
    perfSummary: steps.filter((s) => s.perf).map((s) => ({ url: normPath(s.url), ...s.perf })),
    pagesWithoutCanonical: steps.filter((s) => !s.seo?.canonical).map((s) => normPath(s.url)),
    pagesWithoutMetaDesc:  steps.filter((s) => !s.seo?.metaDesc).map((s) => normPath(s.url)),
    pagesWithoutJsonLd:    steps.filter((s) => !s.seo?.hasJsonLd).map((s) => normPath(s.url)),
  };

  fs.writeFileSync(`${OUT}/${NAME}.json`, JSON.stringify({ summary, steps }, null, 2));
  console.log(`\n=== JOURNEY COMPLETE: ${NAME} — ${steps.length} pages ===`);
  console.log(JSON.stringify(summary, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
