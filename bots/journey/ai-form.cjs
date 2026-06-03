/* eslint-disable */
/**
 * Interactive form-journey driver (AI journey, phase 2).
 *
 * The link-crawler (`ai-journey.cjs`) follows links; it cannot *drive* a
 * multi-step form. This driver completes a guided flow like the get-matched
 * quiz: at each step it answers the visible question (selecting an option /
 * filling an input), advances, and judges whether it reached a clear result —
 * all behind the side-effect firewall (leads / payments / affiliate / account
 * writes mocked, so no junk lead is created). Claude reads the captured steps +
 * screenshots and judges the result. In-session on the Max plan, no API key.
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE = process.env.FORM_BASE || "https://lambent-sawine-17c3dd.netlify.app";
const START = process.env.FORM_START || "/get-matched";
const NAME = process.env.FORM_NAME || "form";
const GOAL = process.env.FORM_GOAL || "";
const KEYWORDS = (process.env.FORM_KEYWORDS || "long-term,growth,shares,etf,balanced")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const MAX_STEPS = parseInt(process.env.FORM_STEPS || "14", 10);
const OUT = process.env.FORM_OUT || "/tmp/journey";
fs.mkdirSync(OUT, { recursive: true });

// Firewall — faithful to bots/safety/money-paths.ts (protected target).
function shouldMock(url, method) {
  let path; try { path = new URL(url, BASE).pathname; } catch { return false; }
  const m = method.toUpperCase();
  const WRITE = m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
  if (/^\/go\//.test(path)) return "affiliate";
  if (/^\/api\/(affiliate\/click|track-click|ab-track|drip-click|attribution\/touch|form-event|track-event)\b/.test(path)) return "affiliate";
  if (/^\/api\/stripe\//.test(path) || /billing/i.test(path) || /checkout/i.test(path)) return "payment";
  if (/^\/api\/(account\/holdings\/sharesight|org-auth\/stripe-connect|webhooks\/)/.test(path)) return "external";
  if (/^\/api\/account\/(delete|documents)\b/.test(path)) return "destructive";
  // Allow the feature-under-test's OWN functional endpoints — you can't drive a
  // quiz whose start/answer/resolve calls you mock. These create only anonymous
  // session/compute rows (no payment, no affiliate, no PII-lead); the final
  // account "save" needs auth and 401s for our anon bot anyway.
  if (/^\/api\/(get-matched|calculator|score|hub-quiz)\b/.test(path)) return false;
  if (WRITE && /^\/api\//.test(path)) return "write";
  return false;
}

// Buttons that ADVANCE the flow (vs. answer it).
const ADVANCE = /\b(next|continue|see (my )?results?|get (matched|started|my)|show (my )?|reveal|view (my )?plan|finish|submit|done|let'?s go|start|build (my )?plan|find)\b/i;
// Things we must never click mid-quiz.
const AVOID = /\b(back|previous|skip|cancel|close|log ?in|sign ?in|sign ?up|logout|home)\b/i;

const observeFn = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
  const txt = (el) => (el && el.textContent || "").replace(/\s+/g, " ").trim();
  const headings = [...document.querySelectorAll("h1,h2,h3,legend,[role=heading],[class*=question],[class*=step-title]")].filter(vis).map((h) => txt(h)).filter(Boolean).slice(0, 8);
  const radios = [...document.querySelectorAll("input[type=radio],input[type=checkbox]")].filter(vis).length;
  const choiceButtons = [...document.querySelectorAll("button,[role=button],[role=radio],[role=option],label")].filter(vis)
    .map((el) => txt(el) || el.getAttribute("aria-label") || "").filter(Boolean)
    .filter((t) => !ADVANCE.test(t) && !AVOID.test(t)).slice(0, 14);
  const advanceButtons = [...document.querySelectorAll("button,[role=button],a[role=button]")].filter(vis)
    .map((el) => txt(el) || el.getAttribute("aria-label") || "").filter((t) => ADVANCE.test(t)).slice(0, 6);
  const textInputs = [...document.querySelectorAll("input,select,textarea")].filter(vis)
    .filter((el) => !["radio", "checkbox", "hidden", "submit", "button"].includes((el.getAttribute("type") || el.tagName.toLowerCase())))
    .map((el) => ({ type: el.getAttribute("type") || el.tagName.toLowerCase(), name: el.getAttribute("name") || el.id || "", ph: el.getAttribute("placeholder") || "" })).slice(0, 10);
  const body = txt(document.body);
  const isResult = /your (result|plan|match|score|recommendation)|recommended for you|based on your answers|action plan|personalised plan|here'?s what|your matches/i.test(body);
  // Interactive controls that live in the MAIN content (not the global nav /
  // header / footer) — so we don't mistake the site chrome for a form.
  const navAncestor = (el) => el.closest("header,nav,footer,[role=navigation],[role=banner],[role=contentinfo]") !== null;
  const contentControls = [...document.querySelectorAll("button,[role=button],[role=radio],[role=option],input[type=radio],input[type=checkbox],input[type=text],input[type=email],input[type=number],select,textarea")].filter(vis).filter((el) => !navAncestor(el)).length;
  // A degraded / fallback / error state means there is no quiz to drive here.
  const errorState = /ran into a problem|failed to start|not sure where to start|no accounts matched|browse comparisons instead|something went wrong|please try again/i.test(body);
  return { url: location.href, title: document.title, headings, radios, choiceButtons, advanceButtons, textInputs, bodyLen: body.length, isResult, contentControls, errorState, bodySample: body.slice(0, 600) };
};

async function fillTextInputs(page, kw) {
  const inputs = page.locator("input:visible, textarea:visible, select:visible");
  const n = await inputs.count().catch(() => 0);
  let filled = 0;
  for (let i = 0; i < n; i++) {
    const el = inputs.nth(i);
    const type = (await el.getAttribute("type").catch(() => "")) || (await el.evaluate((e) => e.tagName.toLowerCase()).catch(() => ""));
    if (["radio", "checkbox", "hidden", "submit", "button"].includes(type)) continue;
    try {
      if (type === "select" || type === "select-one") { await el.selectOption({ index: 1 }).catch(() => {}); filled++; continue; }
      const val = type === "email" ? "qa-bot@example.com" : type === "number" ? "50000" : type === "tel" ? "0400000000" : "Test";
      const cur = await el.inputValue().catch(() => "");
      if (!cur) { await el.fill(val).catch(() => {}); filled++; }
    } catch {}
  }
  return filled;
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("user_onboarding_seen", "true"); localStorage.setItem("cookie-consent", "declined"); localStorage.setItem("inv_cookie_consent", "declined"); } catch {} });
  const mocked = [];
  await ctx.route("**/*", (route) => {
    const req = route.request();
    const cat = shouldMock(req.url(), req.method());
    if (cat) {
      let p = "?"; try { p = new URL(req.url(), BASE).pathname; } catch {}
      mocked.push({ category: cat, method: req.method(), path: p });
      if (cat === "affiliate" && req.method() === "GET") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Mocked</title>" });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mocked: true }) });
    }
    return route.continue();
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error" && !/SSL certificate|ERR_CERT|net::ERR/i.test(m.text())) consoleErrors.push(m.text().slice(0, 160)); });

  await page.goto(BASE + START, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1800);

  const steps = [];
  let prevSig = "";
  let stagnant = 0;

  for (let i = 0; i < MAX_STEPS; i++) {
    let obs; try { obs = await page.evaluate(observeFn); } catch { obs = { url: page.url(), headings: [], choiceButtons: [], advanceButtons: [], textInputs: [], radios: 0 }; }
    const shot = `${OUT}/${NAME}-step-${i}.png`;
    try { await page.screenshot({ path: shot, fullPage: true }); } catch {}

    const sig = (obs.headings || []).join("|") + "::" + obs.url;
    if (sig === prevSig) stagnant++; else stagnant = 0;
    prevSig = sig;

    // No drivable form here (error/fallback/degraded, or only site-chrome
    // controls)? Record it and stop — don't spin clicking the global nav.
    if (!obs.isResult && (obs.errorState || (obs.contentControls || 0) === 0)) {
      steps.push({ step: i, url: obs.url, headings: obs.headings, errorState: obs.errorState, contentControls: obs.contentControls, isResult: false, note: "no drivable interactive form (error/fallback/nav-only) — stopped", bodySample: obs.bodySample, screenshot: shot });
      console.log(`\n── step ${i}  ${obs.url}`);
      console.log(`   Q: ${(obs.headings || [])[0] || "(no heading)"}`);
      console.log(`   ⏹ no drivable form here (errorState=${obs.errorState}, contentControls=${obs.contentControls}) — stopping cleanly`);
      break;
    }

    // ── Decide + act ──────────────────────────────────────────────────────
    const actions = [];
    // 1) fill any text inputs (email/number/etc.)
    const filled = await fillTextInputs(page, KEYWORDS);
    if (filled) actions.push(`filled ${filled} input(s)`);

    // 2) answer: prefer a goal-aligned choice, else the first choice (radio/option/label/button).
    let answered = false;
    const radioCount = await page.locator("input[type=radio]:visible").count().catch(() => 0);
    if (radioCount > 0) {
      // check the first not-yet-checked radio (one question group per step is the common case)
      const r = page.locator("input[type=radio]:visible").first();
      await r.check({ force: true, timeout: 3000 }).catch(() => {});
      answered = true; actions.push("checked a radio option");
    } else {
      // option-style: clickable elements that are NOT advance/avoid buttons
      const opts = page.locator("button:visible, [role=radio]:visible, [role=option]:visible, label:visible");
      const oc = await opts.count().catch(() => 0);
      let pick = -1, fallback = -1;
      for (let k = 0; k < Math.min(oc, 30); k++) {
        const t = ((await opts.nth(k).innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
        if (!t || ADVANCE.test(t) || AVOID.test(t)) continue;
        if (fallback < 0) fallback = k;
        if (KEYWORDS.some((kw) => t.toLowerCase().includes(kw))) { pick = k; break; }
      }
      const idx = pick >= 0 ? pick : fallback;
      if (idx >= 0) { const t = ((await opts.nth(idx).innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim(); await opts.nth(idx).click({ timeout: 3000 }).catch(() => {}); answered = true; actions.push(`picked option "${t.slice(0, 40)}"`); }
    }

    await page.waitForTimeout(600);

    // 3) advance
    let advanced = false;
    const adv = page.getByRole("button", { name: ADVANCE }).filter({ hasNotText: AVOID });
    if (await adv.count().catch(() => 0) > 0) {
      await adv.first().click({ timeout: 3000 }).catch(() => {});
      advanced = true; actions.push("clicked advance");
    }
    await page.waitForTimeout(1500);

    steps.push({ step: i, url: obs.url, headings: obs.headings, radios: obs.radios, choiceButtons: obs.choiceButtons, advanceButtons: obs.advanceButtons, textInputs: obs.textInputs, isResult: obs.isResult, bodyLen: obs.bodyLen, bodySample: obs.bodySample, actions, screenshot: shot });

    console.log(`\n── step ${i}  ${obs.url}`);
    console.log(`   Q: ${(obs.headings || [])[0] || "(no heading)"}`);
    console.log(`   choices:${(obs.choiceButtons || []).length} radios:${obs.radios} inputs:${(obs.textInputs || []).length} advance:${(obs.advanceButtons || []).length}  result?${obs.isResult ? "YES" : "no"}`);
    console.log(`   did: ${actions.join(" · ") || "(nothing)"}`);

    if (obs.isResult) { console.log("   ✅ reached a result screen"); break; }
    if (stagnant >= 2 && !answered && !advanced) { console.log("   ⏹ stuck (no progress) — stopping"); break; }
  }

  await browser.close();
  const summary = { name: NAME, goal: GOAL, base: BASE, start: START, steps: steps.length, reachedResult: steps.some((s) => s.isResult), consoleErrors: [...new Set(consoleErrors)], mockedTotal: mocked.length, mockedByCategory: mocked.reduce((a, m) => ((a[m.category] = (a[m.category] || 0) + 1), a), {}) };
  fs.writeFileSync(`${OUT}/${NAME}.json`, JSON.stringify({ summary, steps }, null, 2));
  console.log(`\n=== FORM JOURNEY COMPLETE: ${NAME} — ${steps.length} steps, reachedResult=${summary.reachedResult} ===`);
  console.log(JSON.stringify(summary, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
