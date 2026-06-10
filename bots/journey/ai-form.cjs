/* eslint-disable */
/**
 * Interactive form-journey driver v2.
 *
 * Drives any multi-step form on the site to completion. At each step it
 * observes the visible controls, answers the current question, advances,
 * and judges whether it reached a clear result — all behind the side-effect
 * firewall. Lead/enquiry POSTs are mocked AND their bodies captured so the
 * payload can be verified without creating real records.
 *
 * Improvements over v1:
 *   - Mobile / tablet / desktop viewport (FORM_VIEWPORT)
 *   - Lead payload capture: intercepts + logs lead/enquiry POSTs
 *   - Supabase auth endpoint mock (for signup/login flows)
 *   - Modal + cookie-banner dismissal between every step
 *   - Stagnation detection on URL + heading hash (not heading alone)
 *   - Waits for network idle after advance clicks
 *   - Console errors captured throughout
 *
 * Env vars:
 *   FORM_BASE       Target origin (default: Netlify preview)
 *   FORM_START      Start path (default: /get-matched)
 *   FORM_NAME       Name used in output filenames
 *   FORM_GOAL       Plain-text goal for the report
 *   FORM_KEYWORDS   Comma-separated choice-alignment words
 *   FORM_STEPS      Max steps before giving up (default: 14)
 *   FORM_VIEWPORT   mobile | tablet | desktop (default: desktop)
 *   FORM_OUT        Output directory (default: /tmp/journey)
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE     = process.env.FORM_BASE     || "https://lambent-sawine-17c3dd.netlify.app";
const START    = process.env.FORM_START    || "/get-matched";
const NAME     = process.env.FORM_NAME     || "form";
const GOAL     = process.env.FORM_GOAL     || "";
const KEYWORDS = (process.env.FORM_KEYWORDS || "long-term,growth,shares,etf,balanced")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const MAX_STEPS = parseInt(process.env.FORM_STEPS || "14", 10);
const OUT      = process.env.FORM_OUT      || "/tmp/journey";
fs.mkdirSync(OUT, { recursive: true });

// ── Viewports ─────────────────────────────────────────────────────────────────
const VIEWPORTS = {
  mobile:  { width: 390,  height: 844,  isMobile: true,  hasTouch: true,
             ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  tablet:  { width: 820,  height: 1180, isMobile: true,  hasTouch: true,
             ua: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  desktop: { width: 1366, height: 900,  isMobile: false, hasTouch: false,
             ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
};
const VP = VIEWPORTS[(process.env.FORM_VIEWPORT || "desktop").toLowerCase()] || VIEWPORTS.desktop;

// ── Side-effect firewall + lead capture ───────────────────────────────────────
// Lead/enquiry/booking writes — mock AND capture the payload.
const LEAD_WRITE = /^\/api\/(advisor-enquiry|advisor-lead|advisor-booking|sponsored-booking|booking|quiz-lead|submit-lead|lead-outcome|report-leads|developer-leads|answers\/ask|newsletter[\w/-]*|exit-intent-log)\b/;
// Feature-under-test's own functional endpoints — allow through (real compute).
const ALLOW = /^\/api\/(get-matched|calculator|score|hub-quiz|advisors?\/(search|filter))\b/;

function classify(url, method) {
  let path; try { path = new URL(url, BASE).pathname; } catch { return null; }
  const WRITE = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
  if (/^\/go\//.test(path)) return { cat: "affiliate" };
  if (/^\/api\/(affiliate\/click|track-click|ab-track|drip-click|attribution\/touch|form-event|track-event)\b/.test(path)) return { cat: "affiliate" };
  if (/^\/api\/stripe\//.test(path) || /billing/i.test(path) || /checkout/i.test(path)) return { cat: "payment" };
  // Supabase auth — mock signup/login so no real account is created.
  if (/supabase\.co\/auth\//.test(url)) return { cat: "auth", capture: WRITE };
  if (LEAD_WRITE.test(path)) return { cat: "lead", capture: true, path };
  if (ALLOW.test(path)) return null;
  if (WRITE && /^\/api\//.test(path)) return { cat: "write" };
  return null;
}

// ── Advance / avoid heuristics ────────────────────────────────────────────────
const ADVANCE = /\b(next|continue|see (my )?results?|get (matched|started|my plan)|show (my )?|reveal|view (my )?plan|finish|submit|done|let'?s go|start|build (my )?plan|find (my )?match|send|confirm)\b/i;
const AVOID   = /\b(back|previous|skip|cancel|close|log ?in|sign ?in|sign ?up|logout|home|dismiss|no thanks|maybe later)\b/i;

// ── Observer (runs in browser context) ───────────────────────────────────────
const observeFn = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };
  const txt = (el) => (el && el.textContent || "").replace(/\s+/g, " ").trim();
  const navAnc = (el) => !!el.closest("header,nav,footer,[role=navigation],[role=banner],[role=contentinfo]");

  const headings = [...document.querySelectorAll("h1,h2,h3,legend,[role=heading],[class*=question],[class*=step-title]")]
    .filter(vis).map((h) => txt(h)).filter(Boolean).slice(0, 8);
  const radios = [...document.querySelectorAll("input[type=radio],input[type=checkbox]")].filter(vis).length;
  const choiceButtons = [...document.querySelectorAll("button,[role=button],[role=radio],[role=option],label")]
    .filter(vis).filter((el) => !navAnc(el))
    .map((el) => txt(el) || el.getAttribute("aria-label") || "").filter(Boolean)
    .filter((t) => !/\b(next|continue|see (my )?results?|get (matched|started)|show|reveal|view|finish|submit|done|let'?s go|start|build|find|send|confirm)\b/i.test(t))
    .filter((t) => !/\b(back|previous|skip|cancel|close|log ?in|sign ?in|sign ?up|logout|home|dismiss)\b/i.test(t))
    .slice(0, 14);
  const advanceButtons = [...document.querySelectorAll("button,[role=button],a[role=button]")]
    .filter(vis).filter((el) => !navAnc(el))
    .map((el) => txt(el) || el.getAttribute("aria-label") || "")
    .filter((t) => /\b(next|continue|see (my )?results?|get (matched|started)|show|reveal|view|finish|submit|done|let'?s go|start|build|find|send|confirm)\b/i.test(t))
    .slice(0, 6);
  const textInputs = [...document.querySelectorAll("input,select,textarea")].filter(vis)
    .filter((el) => !["radio", "checkbox", "hidden", "submit", "button"].includes((el.getAttribute("type") || el.tagName.toLowerCase())))
    .map((el) => ({ type: el.getAttribute("type") || el.tagName.toLowerCase(), name: el.getAttribute("name") || el.id || "", ph: el.getAttribute("placeholder") || "" }))
    .slice(0, 10);
  const body = txt(document.body);
  const isResult = /your (result|plan|match|score|recommendation)|recommended for you|based on your answers|action plan|personalised plan|here.?s what|your matches|matched you with|get started with/i.test(body);
  const contentControls = [...document.querySelectorAll("button,[role=button],[role=radio],[role=option],input[type=radio],input[type=checkbox],input[type=text],input[type=email],input[type=number],select,textarea")]
    .filter(vis).filter((el) => !navAnc(el)).length;
  const errorState = /ran into a problem|failed to start|not sure where to start|no accounts matched|browse comparisons instead|something went wrong|please try again/i.test(body);
  // Detect modal/overlay that might need dismissal.
  const hasModal = !!document.querySelector("[role=dialog],[aria-modal=true],[class*=modal],[class*=overlay],[class*=sheet]");
  // OTP / verification prompt.
  const hasOtp = /verify your email|check your email|confirmation code|enter the code|sent you a code/i.test(body);
  return { url: location.href, title: document.title, headings, radios, choiceButtons, advanceButtons, textInputs, bodyLen: body.length, isResult, contentControls, errorState, hasModal, hasOtp, bodySample: body.slice(0, 600) };
};

// ── Modal dismissal ───────────────────────────────────────────────────────────
async function dismissModals(page) {
  // Cookie / consent banner — decline or close.
  for (const sel of [
    'button:has-text("Accept")', 'button:has-text("Decline")',
    'button:has-text("Got it")', 'button:has-text("OK")',
    '[aria-label*="close" i]', '[aria-label*="dismiss" i]',
    'button:has-text("No thanks")', 'button:has-text("Maybe later")',
  ]) {
    const el = page.locator(sel).first();
    if (await el.count().catch(() => 0) > 0) {
      await el.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(400);
    }
  }
}

// ── Fill visible text / number / select inputs ─────────────────────────────
async function fillTextInputs(page, keywords) {
  const inputs = page.locator("input:visible, textarea:visible, select:visible");
  const n = await inputs.count().catch(() => 0);
  let filled = 0;
  for (let i = 0; i < n; i++) {
    const el = inputs.nth(i);
    const type = (await el.getAttribute("type").catch(() => "")) ||
      (await el.evaluate((e) => e.tagName.toLowerCase()).catch(() => ""));
    if (["radio", "checkbox", "hidden", "submit", "button"].includes(type)) continue;
    try {
      if (type === "select" || type === "select-one") {
        await el.selectOption({ index: 1 }).catch(() => {});
        filled++;
        continue;
      }
      const ph = (await el.getAttribute("placeholder").catch(() => "")) || "";
      const nm = (await el.getAttribute("name").catch(() => "")) || (await el.getAttribute("id").catch(() => "")) || "";
      const val =
        type === "email"  ? "qa-bot@example.com" :
        type === "number" ? "50000" :
        type === "tel"    ? "0400000000" :
        /password/i.test(nm) ? "TestPass123!" :
        /name|full/i.test(nm + ph) ? "QA Bot" :
        keywords.length > 0 ? "Build long-term wealth" : "Test";
      const cur = await el.inputValue().catch(() => "");
      if (!cur) { await el.fill(val).catch(() => {}); filled++; }
    } catch {}
  }
  return filled;
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: VP.width, height: VP.height },
    isMobile: VP.isMobile,
    hasTouch: VP.hasTouch,
    userAgent: VP.ua,
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("user_onboarding_seen", "true");
      ["cookie-consent", "inv_cookie_consent", "cookie_consent"].forEach((k) => localStorage.setItem(k, "declined"));
    } catch {}
  });

  const leads = [];
  const mocked = {};
  await ctx.route("**/*", (route) => {
    const req = route.request();
    const c = classify(req.url(), req.method());
    if (!c) return route.continue();
    mocked[c.cat] = (mocked[c.cat] || 0) + 1;
    if (c.capture) {
      let body = null;
      try { body = JSON.parse(req.postData() || "null"); } catch { body = (req.postData() || "").slice(0, 400); }
      leads.push({ cat: c.cat, path: c.path || req.url(), method: req.method(), body });
    }
    if (c.cat === "auth") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ access_token: "mock-token", token_type: "bearer", expires_in: 3600, refresh_token: "mock-refresh",
          user: { id: "mock-user-id", email: "qa-bot@example.com", email_confirmed_at: new Date().toISOString() } }),
      });
    }
    if (c.cat === "affiliate" && req.method() === "GET") {
      return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Mocked</title>" });
    }
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ ok: true, id: "mock-" + (leads.length || mocked[c.cat]), mocked: true }) });
  });

  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !/SSL certificate|ERR_CERT|net::ERR/i.test(m.text()))
      consoleErrors.push(m.text().slice(0, 160));
  });

  await page.goto(BASE + START, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1800);
  await dismissModals(page);

  const steps = [];
  let prevSig = "";
  let stagnant = 0;

  for (let i = 0; i < MAX_STEPS; i++) {
    let obs;
    try { obs = await page.evaluate(observeFn); }
    catch { obs = { url: page.url(), headings: [], choiceButtons: [], advanceButtons: [], textInputs: [], radios: 0, hasModal: false, hasOtp: false }; }

    const shot = `${OUT}/${NAME}-step-${i}.png`;
    try { await page.screenshot({ path: shot, fullPage: true }); } catch {}

    const sig = (obs.headings || []).join("|") + "::" + obs.url;
    if (sig === prevSig) stagnant++; else stagnant = 0;
    prevSig = sig;

    // OTP / email-verification wall — can't proceed without real credentials.
    if (obs.hasOtp) {
      steps.push({ step: i, url: obs.url, headings: obs.headings, isResult: false,
        note: "OTP / email-verification prompt — cannot proceed (mocked auth, no real email)", screenshot: shot });
      console.log(`\n── step ${i}  ${obs.url}`);
      console.log("   ⏹ OTP verification wall — stopping cleanly");
      break;
    }

    // No drivable form (error/fallback/nav-only).
    if (!obs.isResult && (obs.errorState || (obs.contentControls || 0) === 0)) {
      steps.push({ step: i, url: obs.url, headings: obs.headings, errorState: obs.errorState,
        contentControls: obs.contentControls, isResult: false,
        note: "no drivable interactive form (error/fallback/nav-only) — stopped", bodySample: obs.bodySample, screenshot: shot });
      console.log(`\n── step ${i}  ${obs.url}`);
      console.log(`   ⏹ no drivable form (errorState=${obs.errorState}, contentControls=${obs.contentControls}) — stopping`);
      break;
    }

    // ── Decide + act ─────────────────────────────────────────────────────────
    const actions = [];

    // 1) Dismiss any modal that appeared.
    if (obs.hasModal) { await dismissModals(page); actions.push("dismissed modal"); }

    // 2) Fill text / number / select inputs.
    const filled = await fillTextInputs(page, KEYWORDS);
    if (filled) actions.push(`filled ${filled} input(s)`);

    // 3) Answer: prefer goal-aligned choice, else first choice.
    let answered = false;
    const radioCount = await page.locator("input[type=radio]:visible").count().catch(() => 0);
    if (radioCount > 0) {
      const r = page.locator("input[type=radio]:visible").first();
      await r.check({ force: true, timeout: 3000 }).catch(() => {});
      answered = true;
      actions.push("checked first radio");
    } else {
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
      if (idx >= 0) {
        const t = ((await opts.nth(idx).innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
        await opts.nth(idx).click({ timeout: 3000 }).catch(() => {});
        answered = true;
        actions.push(`picked option "${t.slice(0, 40)}"`);
      }
    }

    await page.waitForTimeout(600);

    // 4) Advance.
    let advanced = false;
    const adv = page.getByRole("button", { name: ADVANCE }).filter({ hasNotText: AVOID });
    if (await adv.count().catch(() => 0) > 0) {
      await adv.first().click({ timeout: 3000 }).catch(() => {});
      advanced = true;
      actions.push("clicked advance");
    }

    // Wait for network settle (up to 2.5 s) then a short fixed pause.
    await page.waitForLoadState("networkidle", { timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(800);

    steps.push({
      step: i, url: obs.url, headings: obs.headings,
      radios: obs.radios, choiceButtons: obs.choiceButtons,
      advanceButtons: obs.advanceButtons, textInputs: obs.textInputs,
      isResult: obs.isResult, bodyLen: obs.bodyLen, bodySample: obs.bodySample,
      actions, screenshot: shot,
    });

    console.log(`\n── step ${i}  ${obs.url}`);
    console.log(`   Q: ${(obs.headings || [])[0] || "(no heading)"}`);
    console.log(`   choices:${(obs.choiceButtons || []).length} radios:${obs.radios} inputs:${(obs.textInputs || []).length} advance:${(obs.advanceButtons || []).length}  result?${obs.isResult ? "YES" : "no"}`);
    console.log(`   did: ${actions.join(" · ") || "(nothing)"}`);

    if (obs.isResult) { console.log("   ✅ reached a result screen"); break; }
    if (stagnant >= 2 && !answered && !advanced) { console.log("   ⏹ stuck (no progress) — stopping"); break; }
  }

  await browser.close();

  const summary = {
    name: NAME,
    goal: GOAL,
    base: BASE,
    start: START,
    viewport: process.env.FORM_VIEWPORT || "desktop",
    steps: steps.length,
    reachedResult: steps.some((s) => s.isResult),
    consoleErrors: [...new Set(consoleErrors)],
    leadsCapture: { total: leads.length, byCategory: leads.reduce((a, l) => ((a[l.cat] = (a[l.cat] || 0) + 1), a), {}), samples: leads.slice(0, 3) },
    mockedByCategory: mocked,
  };

  fs.writeFileSync(`${OUT}/${NAME}.json`, JSON.stringify({ summary, steps }, null, 2));
  console.log(`\n=== FORM JOURNEY v2 COMPLETE: ${NAME} — ${steps.length} steps, reachedResult=${summary.reachedResult} ===`);
  console.log(JSON.stringify(summary, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
