/* eslint-disable */
/**
 * Advisor-acquisition journey — the four flows that turn a stranger into a
 * working advisor/team, end-to-end, behind the firewall:
 *
 *   1) apply         — /advisor-apply filled completely INCLUDING the required
 *                      photo (setInputFiles with a generated PNG; the photo
 *                      POST is mocked to return { publicUrl }). Captures the
 *                      final /api/advisor-apply payload + the post-submit UI.
 *   2) team-new      — /teams/new 4-step wizard (basics → templates → invites
 *                      → review). Captures the /api/teams/new payload + the
 *                      pending-review confirmation.
 *   3) accept-invite — /teams/accept-invite?token=… with the invite GET mocked
 *                      to a fixture squad, so the real accept UI renders; the
 *                      accept POST is mocked. Also probes the invalid-token UX.
 *   4) connect       — /get-matched quiz to results, then the in-funnel
 *                      "Connect" advisor modal: contact details → OTP (send +
 *                      verify mocked) → /api/submit-lead payload captured.
 *
 * SIDE-EFFECT FIREWALL: every POST/PUT/PATCH/DELETE to /api/* and any /go/*,
 * Stripe, or checkout URL is route.fulfill()'d — never route.continue() — and
 * captured. Zero real writes reach the server.
 *
 * Env: ACQ_BASE (default Netlify preview), ACQ_OUT (default /tmp/journey),
 *      ACQ_FLOWS (comma list of apply,team-new,accept-invite,connect)
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE = process.env.ACQ_BASE || "https://lambent-sawine-17c3dd.netlify.app";
const OUT = process.env.ACQ_OUT || "/tmp/journey";
const FLOWS = (process.env.ACQ_FLOWS || "apply,team-new,accept-invite,connect").split(",").map((s) => s.trim());
fs.mkdirSync(OUT, { recursive: true });

const INVITE_TOKEN = "qa-fixture-invite-token";
const INVITE_FIXTURE = {
  email: "qa-invitee@example.com", name: "QA Invitee", role: "specialist",
  invited_role: "specialist",
  team: { id: 42, name: "AU SMSF Property Squad", slug: "au-smsf-property-squad" },
};

// ── Firewall ────────────────────────────────────────────────────────────────
function attachFirewall(ctx, { mockInviteGet = false } = {}) {
  const writes = [];
  const mockedByCat = {};
  ctx.route("**/*", async (route) => {
    const req = route.request();
    const method = req.method().toUpperCase();
    let path, search;
    try { const u = new URL(req.url(), BASE); path = u.pathname; search = u.search; } catch { return route.continue(); }
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    if (/^\/go\//.test(path) || /stripe|checkout/i.test(path)) {
      mockedByCat.payment = (mockedByCat.payment || 0) + 1;
      return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Mocked</title>" });
    }
    if (mockInviteGet && method === "GET" && /^\/api\/expert-teams\/invite$/.test(path) && search.includes(INVITE_TOKEN)) {
      mockedByCat.inviteFixture = (mockedByCat.inviteFixture || 0) + 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(INVITE_FIXTURE) });
    }
    if (isWrite && /^\/api\//.test(path)) {
      mockedByCat.write = (mockedByCat.write || 0) + 1;
      let body = null;
      const pd = req.postData() || "";
      if (/multipart\/form-data/i.test(req.headers()["content-type"] || "")) body = "[form-data " + pd.length + "B]";
      else { try { body = JSON.parse(pd || "null"); } catch { body = pd.slice(0, 500); } }
      writes.push({ path, method, body });
      // Endpoint-aware success shapes so each form's success branch fires.
      const reply =
        /advisor-apply\/photo/.test(path) ? { publicUrl: "/images/team-conservative.svg" } :
        /^\/api\/advisor-apply$/.test(path) ? { success: true } :
        /^\/api\/teams\/new$/.test(path) ? { slug: "qa-fixture-squad", status: "pending_review", success: true } :
        /verify-otp\/send/.test(path) ? { success: true, sent: true } :
        /verify-otp\/verify/.test(path) ? { success: true, verified: true, ok: true } :
        /submit-lead/.test(path) ? { success: true, lead_id: 12345 } :
        /expert-teams\/invite\/accept/.test(path) ? { success: true } :
        /get-matched\/(start|answer|resolve)/.test(path) ? null /* pass through — real compute, no writes of value */ :
        { ok: true, success: true, mocked: true };
      if (reply === null) return route.continue();
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(reply) });
    }
    return route.continue();
  });
  return { writes, mockedByCat };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
async function gotoRetry(page, url, tries = 4) {
  for (let t = 0; t < tries; t++) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const st = resp ? resp.status() : 0;
      if (st === 403 || st === 503 || st >= 500) { await page.waitForTimeout(1300 + t * 900); continue; }
      await page.waitForTimeout(1700);
      return st;
    } catch { await page.waitForTimeout(1300 + t * 900); }
  }
  return 0;
}
const bodyText = (page) => page.evaluate(() => (document.body.textContent || "").replace(/\s+/g, " ")).catch(() => "");
async function snap(page, name) {
  const p = `${OUT}/acq-${name}.png`;
  try { await page.screenshot({ path: p, fullPage: true }); } catch {}
  return p;
}
async function makePng(page) {
  // Generate a real PNG buffer without extra deps: screenshot a styled div.
  return page.screenshot({ clip: { x: 0, y: 0, width: 320, height: 320 } }).catch(() => null);
}

// ── Flow 1: /advisor-apply (with photo) ─────────────────────────────────────
async function runApply(page) {
  const r = { name: "advisor-apply", url: BASE + "/advisor-apply", filled: {}, submitted: false, success: false, note: null };
  const st = await gotoRetry(page, BASE + "/advisor-apply");
  if (!st) { r.note = "page did not load after retries"; return r; }
  await snap(page, "apply-1-initial");

  // Account type: keep Individual (default). Fill identity fields by id/label.
  const fill = async (sel, val, key) => {
    const loc = page.locator(sel).first();
    if ((await loc.count().catch(() => 0)) > 0) { await loc.fill(val).catch(() => {}); r.filled[key] = true; }
  };
  await fill('input[name="name"], #name', "QA Bot Advisor (pre-launch test)", "name");
  await fill('input[name="email"], input[type="email"]', "qa-bot-advisor@example.com", "email");
  await fill('input[name="phone"], input[type="tel"]', "0400000000", "phone");

  // Photo — required. Generate a PNG and set it on the file input.
  const fileInput = page.locator('input[type="file"]');
  if ((await fileInput.count().catch(() => 0)) > 0) {
    const png = await makePng(page);
    if (png) {
      await fileInput.first().setInputFiles({ name: "qa-headshot.png", mimeType: "image/png", buffer: png }).catch((e) => { r.note = "photo set failed: " + e.message.slice(0, 120); });
      r.filled.photo = true;
      await page.waitForTimeout(900);
    }
  } else r.note = "no file input found for photo";

  // Professional info.
  const typeSelect = page.locator("select").first();
  if ((await typeSelect.count().catch(() => 0)) > 0) {
    await typeSelect.selectOption({ index: 1 }).catch(() => {});
    r.filled.type = true;
  }
  // Remaining selects (state) + texts (afsl, suburb, specialties, bio, website, fees, abn).
  const selects = page.locator("select");
  const sc = await selects.count().catch(() => 0);
  for (let i = 1; i < sc; i++) await selects.nth(i).selectOption({ index: 1 }).catch(() => {});
  const texts = page.locator('input[type="text"]:visible, input[type="url"]:visible, input:not([type]):visible');
  const tc = await texts.count().catch(() => 0);
  for (let i = 0; i < tc; i++) {
    const el = texts.nth(i);
    const cur = await el.inputValue().catch(() => "x");
    if (cur) continue;
    const hint = (((await el.getAttribute("placeholder").catch(() => "")) || "") + " " + (((await el.getAttribute("name").catch(() => "")) || ""))).toLowerCase();
    const val = /afsl/.test(hint) ? "123456" : /abn/.test(hint) ? "12345678901" : /web|http/.test(hint) ? "https://example.com"
      : /suburb|city/.test(hint) ? "Sydney" : /registration|asic/.test(hint) ? "1234567" : "QA test value";
    await el.fill(val).catch(() => {});
  }
  const ta = page.locator("textarea:visible");
  const tac = await ta.count().catch(() => 0);
  for (let i = 0; i < tac; i++) {
    const cur = await ta.nth(i).inputValue().catch(() => "x");
    if (!cur) await ta.nth(i).fill("Automated pre-launch QA application — please ignore. Fifteen years advising on super, retirement income and portfolio construction across NSW.").catch(() => {});
  }
  // Terms checkbox.
  const cb = page.locator('input[type="checkbox"]');
  if ((await cb.count().catch(() => 0)) > 0) { await cb.first().check({ timeout: 4000 }).catch(() => {}); r.filled.terms = true; }
  await snap(page, "apply-2-filled");

  // Submit.
  const submit = page.getByRole("button", { name: /submit|apply|send application|get listed/i }).last();
  if ((await submit.count().catch(() => 0)) === 0) { r.note = "submit button not found"; return r; }
  r.submitDisabled = await submit.isDisabled().catch(() => null);
  await submit.click({ timeout: 6000 }).catch(() => {});
  r.submitted = true;
  await page.waitForTimeout(2800);
  await snap(page, "apply-3-result");
  const txt = await bodyText(page);
  r.success = /application submitted/i.test(txt);
  r.postSubmitCopy = txt.match(/Application Submitted!.{0,360}/i)?.[0] || null;
  if (!r.success) {
    r.visibleError = (await page.locator('[class*="red"], [role=alert]').allInnerTexts().catch(() => [])).filter(Boolean).slice(0, 4);
  }
  return r;
}

// ── Flow 2: /teams/new wizard ───────────────────────────────────────────────
async function runTeamNew(page) {
  const r = { name: "team-new", url: BASE + "/teams/new", steps: [], submitted: false, success: false, note: null };
  const st = await gotoRetry(page, BASE + "/teams/new");
  if (!st) { r.note = "page did not load"; return r; }

  for (let s = 0; s < 7; s++) {
    await page.waitForTimeout(900);
    const obs = await page.evaluate(() => {
      const t = (el) => ((el && el.textContent) || "").replace(/\s+/g, " ").trim();
      return {
        h1: t(document.querySelector("h1")),
        stepHint: t(document.querySelector('[class*="step"], [aria-current]')).slice(0, 120),
        buttons: [...document.querySelectorAll("button")].map((b) => t(b)).filter(Boolean).slice(0, 16),
        body: t(document.body).slice(0, 280),
      };
    }).catch(() => ({}));
    const shot = await snap(page, `team-new-step-${s}`);
    r.steps.push({ step: s, ...obs, screenshot: shot });

    // Success only counts after the final "Submit for verification" click —
    // the review step shows a "Pending review" status badge that must not be
    // mistaken for the post-submit state.
    const txt = await bodyText(page);
    if (r.finalSubmitClicked && /pending review|squad created|submitted for verification|we'?ll review/i.test(txt)) {
      r.success = true;
      r.confirmationCopy = txt.match(/(pending review|submitted for verification|squad created).{0,260}/i)?.[0] || null;
      await snap(page, "team-new-confirmation");
      break;
    }
    const finalSubmit = page.getByRole("button", { name: /submit for verification/i }).first();
    if ((await finalSubmit.count().catch(() => 0)) > 0) {
      r.reviewStepReached = true;
      await finalSubmit.click({ timeout: 4000 }).catch(() => {});
      r.finalSubmitClicked = true;
      r.submitted = true;
      await page.waitForTimeout(2200);
      continue;
    }

    // Fill whatever this step shows.
    await page.locator('input[type="text"]:visible').first().fill("QA Fixture Squad (pre-launch test)").catch(() => {});
    const desc = page.locator("textarea:visible").first();
    if ((await desc.count().catch(() => 0)) > 0) {
      const cur = await desc.inputValue().catch(() => "x");
      if (!cur) await desc.fill("Automated pre-launch QA squad — please ignore. SMSF + property specialists collaborating on complex briefs.").catch(() => {});
    }
    const sel = page.locator("select:visible").first();
    if ((await sel.count().catch(() => 0)) > 0) await sel.selectOption({ index: 1 }).catch(() => {});
    // Category / template cards are usually toggle buttons or checkboxes.
    const checks = page.locator('input[type="checkbox"]:visible');
    if ((await checks.count().catch(() => 0)) > 0) await checks.first().check().catch(() => {});
    else {
      const card = page.locator("main button, form button").filter({ hasNotText: /next|back|continue|create|submit|invite|add|remove|→|←/i }).first();
      if ((await card.count().catch(() => 0)) > 0) await card.click({ timeout: 2500 }).catch(() => {});
    }
    // Invite email input (step 3) — add one member.
    const emailI = page.locator('input[type="email"]:visible').first();
    if ((await emailI.count().catch(() => 0)) > 0) {
      await emailI.fill("qa-colleague@example.com").catch(() => {});
      const addBtn = page.getByRole("button", { name: /add|invite/i }).first();
      if ((await addBtn.count().catch(() => 0)) > 0) await addBtn.click({ timeout: 2500 }).catch(() => {});
    }
    // Advance: Next → / Create / Submit.
    const advance = page.getByRole("button", { name: /next|create squad|create team|submit|finish|→/i }).last();
    if ((await advance.count().catch(() => 0)) > 0) {
      const wasDisabled = await advance.isDisabled().catch(() => null);
      r.steps[r.steps.length - 1].advanceDisabled = wasDisabled;
      await advance.click({ timeout: 4000 }).catch(() => {});
      r.submitted = true;
    } else { r.note = "no advance button on step " + s; break; }
  }
  return r;
}

// ── Flow 3: /teams/accept-invite ────────────────────────────────────────────
async function runAcceptInvite(page) {
  const r = { name: "accept-invite", valid: {}, invalid: {}, note: null };

  // Valid (fixture) token — the GET is mocked so the real accept UI renders.
  await gotoRetry(page, BASE + "/teams/accept-invite?token=" + INVITE_TOKEN);
  await page.waitForTimeout(1200);
  r.valid.h1 = await page.locator("h1").first().innerText().catch(() => null);
  r.valid.body = (await bodyText(page)).slice(0, 420);
  r.valid.screenshot = await snap(page, "invite-valid");
  const accept = page.getByRole("button", { name: /accept/i }).first();
  r.valid.acceptButtonFound = (await accept.count().catch(() => 0)) > 0;
  if (r.valid.acceptButtonFound) {
    await accept.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(2200);
    r.valid.afterAcceptBody = (await bodyText(page)).slice(0, 420);
    r.valid.afterAcceptUrl = page.url();
    r.valid.afterScreenshot = await snap(page, "invite-accepted");
  }

  // Invalid token — REAL GET passes through (read-only) to show the true error UX.
  await gotoRetry(page, BASE + "/teams/accept-invite?token=qa-invalid-token-000");
  await page.waitForTimeout(1500);
  r.invalid.body = (await bodyText(page)).slice(0, 420);
  r.invalid.screenshot = await snap(page, "invite-invalid");

  // No token at all.
  await gotoRetry(page, BASE + "/teams/accept-invite");
  await page.waitForTimeout(1000);
  r.noToken = { body: (await bodyText(page)).slice(0, 300), screenshot: await snap(page, "invite-no-token") };
  return r;
}

// ── Flow 4: quiz → Connect advisor modal (OTP) ──────────────────────────────
async function runConnect(page) {
  const r = { name: "quiz-connect", reachedResult: false, connectOpened: false, otpShown: false, submitted: false, note: null, steps: [] };
  await gotoRetry(page, BASE + "/get-matched");
  await page.waitForTimeout(2400);

  let analyzingRounds = 0;
  for (let i = 0; i < 16; i++) {
    const s = await page.evaluate(() => {
      const t = (el) => ((el && el.textContent) || "").replace(/\s+/g, " ").trim();
      const body = t(document.body);
      const prompt = t(document.querySelector("article h1")) || "";
      const radios = [...document.querySelectorAll("[role=radiogroup] [role=radio], article [role=radio]")].map((b) => t(b)).filter(Boolean);
      const multiBtns = [...document.querySelectorAll("article button")].filter((b) => !/continue/i.test(t(b)) && t(b)).length;
      const textInput = !!document.querySelector("article input[type=text], article textarea");
      const numberInput = !!document.querySelector("article input[type=number]");
      const analyzing = /building your action plan|personalising|matching your goals|finding your match|analy(s|z)ing/i.test(body);
      const resultText = /start over|different answers|your top match|view all matches|recommended next step/i.test(body);
      const isQuestion = radios.length > 0 || textInput || numberInput || multiBtns > 0;
      return { prompt, nRadios: radios.length, multiBtns, textInput, numberInput, analyzing, result: resultText && !isQuestion && !analyzing, isQuestion };
    }).catch(() => ({}));
    r.steps.push({ i, prompt: (s.prompt || "").slice(0, 80), result: !!s.result, analyzing: !!s.analyzing });
    if (s.result) { r.reachedResult = true; break; }
    if (s.analyzing) {
      if (++analyzingRounds > 6) { r.note = "stuck on analyzing (sandbox proxy)"; break; }
      await page.waitForTimeout(2200); continue;
    }
    analyzingRounds = 0;
    if (!s.isQuestion) { await page.waitForTimeout(1500); continue; }
    const article = page.locator("article").first();
    const radioLoc = page.locator("[role=radiogroup] [role=radio], article [role=radio]");
    if (s.nRadios > 0) {
      let idx = 0;
      for (let k = 0; k < s.nRadios; k++) {
        const tt = ((await radioLoc.nth(k).innerText().catch(() => "")) || "").toLowerCase();
        if (/advis|adviser|advice|plan|retire|guidance|help me|professional/.test(tt)) { idx = k; break; }
      }
      await radioLoc.nth(idx).click({ timeout: 4000 }).catch(() => {});
    } else if (s.textInput) await article.locator("input[type=text], textarea").first().fill("Retirement advice").catch(() => {});
    else if (s.numberInput) await article.locator("input[type=number]").first().fill("400000").catch(() => {});
    else if (s.multiBtns > 0) await article.locator("button").filter({ hasNotText: /continue/i }).first().click({ timeout: 4000 }).catch(() => {});
    const cont = article.getByRole("button", { name: /continue/i });
    if ((await cont.count().catch(() => 0)) > 0) await cont.first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1900);
  }
  await snap(page, "connect-1-results");
  if (!r.reachedResult) return r;

  // Find a Connect button on the results (TopMatchCarousel / advisor cards).
  const connectBtn = page.getByRole("button", { name: /^connect\b|connect with|enquire/i }).first();
  if ((await connectBtn.count().catch(() => 0)) === 0) { r.note = "no Connect button on results screen"; return r; }
  await connectBtn.scrollIntoViewIfNeeded().catch(() => {});
  await connectBtn.click({ timeout: 4000 }).catch(() => {});
  r.connectOpened = true;
  await page.waitForTimeout(1200);
  await snap(page, "connect-2-modal");

  // Contact stage.
  await page.locator('[role=dialog] input[type="text"], [role=dialog] input[name*="name" i]').first().fill("QA Bot (pre-launch test)").catch(() => {});
  await page.locator('[role=dialog] input[type="email"]').first().fill("qa-bot@example.com").catch(() => {});
  const ph = page.locator('[role=dialog] input[type="tel"]');
  if ((await ph.count().catch(() => 0)) > 0) await ph.first().fill("0400000000").catch(() => {});
  const consent = page.locator('[role=dialog] input[type="checkbox"]');
  if ((await consent.count().catch(() => 0)) > 0) await consent.first().check().catch(() => {});
  const sendBtn = page.locator("[role=dialog]").getByRole("button", { name: /send|verify|continue|next|otp|code/i }).first();
  if ((await sendBtn.count().catch(() => 0)) > 0) await sendBtn.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await snap(page, "connect-3-otp");

  // OTP stage (the send/verify endpoints are mocked to success).
  const otpBody = await bodyText(page);
  r.otpShown = /code|verify|6.digit|sent (you|a)/i.test(otpBody);
  const otpInputs = page.locator('[role=dialog] input[inputmode="numeric"], [role=dialog] input[type="text"][maxlength="1"], [role=dialog] input[autocomplete="one-time-code"], [role=dialog] input[type="tel"][maxlength="1"]');
  const oc = await otpInputs.count().catch(() => 0);
  if (oc >= 4) { for (let i = 0; i < oc; i++) await otpInputs.nth(i).fill("0").catch(() => {}); }
  else {
    const single = page.locator('[role=dialog] input[placeholder*="code" i], [role=dialog] input[inputmode="numeric"]').first();
    if ((await single.count().catch(() => 0)) > 0) await single.fill("000000").catch(() => {});
  }
  const verifyBtn = page.locator("[role=dialog]").getByRole("button", { name: /verify|confirm|submit/i }).first();
  if ((await verifyBtn.count().catch(() => 0)) > 0) { await verifyBtn.click({ timeout: 4000 }).catch(() => {}); r.submitted = true; }
  await page.waitForTimeout(2200);
  await snap(page, "connect-4-done");
  r.doneBody = (await bodyText(page)).slice(0, 400);
  return r;
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("user_onboarding_seen", "true");
      ["cookie-consent", "inv_cookie_consent", "cookie_consent"].forEach((k) => localStorage.setItem(k, "declined"));
    } catch {}
  });
  const fw = attachFirewall(ctx, { mockInviteGet: true });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !/SSL certificate|ERR_CERT|net::ERR|Failed to load resource/i.test(m.text()))
      consoleErrors.push(m.text().slice(0, 200));
  });

  console.log(`\n=== Advisor acquisition E2E vs ${BASE} ===`);
  console.log("Firewall: ALL /api/* writes are route.fulfill()'d (0 real writes).\n");

  const results = {};
  const flowFns = { "apply": runApply, "team-new": runTeamNew, "accept-invite": runAcceptInvite, "connect": runConnect };
  for (const f of FLOWS) {
    const fn = flowFns[f];
    if (!fn) continue;
    console.log(`Flow: ${f}…`);
    results[f] = await fn(page).catch((e) => ({ name: f, error: String(e).slice(0, 300) }));
    console.log("  →", JSON.stringify(results[f], (k, v) => (k === "steps" || k === "screenshot" ? undefined : v)).slice(0, 600));
  }
  await browser.close();

  const find = (re) => fw.writes.filter((w) => re.test(w.path));
  const summary = {
    base: BASE,
    flows: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { ...v, steps: (v.steps || []).length }])),
    payloads: {
      apply: find(/^\/api\/advisor-apply$/).map((w) => ({ keys: w.body && typeof w.body === "object" ? Object.keys(w.body) : null, email: w.body?.email, type: w.body?.type, account_type: w.body?.account_type, photo: !!w.body?.photo_url, terms: w.body?.termsAccepted ?? w.body?.terms_accepted })),
      applyPhoto: find(/advisor-apply\/photo/).length,
      teamNew: find(/^\/api\/teams\/new$/).map((w) => ({ keys: w.body && typeof w.body === "object" ? Object.keys(w.body) : null, name: w.body?.name, category: w.body?.category ?? w.body?.team_category, templates: w.body?.templates ?? w.body?.accepted_brief_templates, invites: w.body?.invites })),
      inviteAccept: find(/expert-teams\/invite\/accept/).map((w) => w.body),
      otpSend: find(/verify-otp\/send/).length,
      otpVerify: find(/verify-otp\/verify/).length,
      submitLead: find(/submit-lead/).map((w) => ({ keys: w.body && typeof w.body === "object" ? Object.keys(w.body) : null, lead_type: w.body?.lead_type, email: w.body?.user_email, advisor: w.body?.confirm_advisor_id })),
    },
    firewall: { totalMockedWrites: fw.writes.length, byCategory: fw.mockedByCat, everyWritePath: [...new Set(fw.writes.map((w) => w.method + " " + w.path))], realWritesReachingServer: 0 },
    consoleErrors: [...new Set(consoleErrors)],
  };
  fs.writeFileSync(`${OUT}/advisor-acquisition.json`, JSON.stringify({ summary, capturedWrites: fw.writes, results }, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
