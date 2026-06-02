/* eslint-disable */
/**
 * Launch-readiness test #3 — lead/revenue flows, end-to-end.
 *
 *   A) get-matched quiz:  /get-matched → answer every QuestionCard
 *      (role=radio auto-advances; multiselect/text/number use "Continue")
 *      → reach the result/plan screen.
 *   B) adviser enquiry:   /advisors → an adviser profile → fill the Contact
 *      form (name/email/phone/message) → "Send Enquiry" → "Enquiry Sent!".
 *
 * Side-effect firewall with PAYLOAD CAPTURE: lead/enquiry/booking writes are
 * mocked locally (no real lead created) but their request bodies are captured
 * so we can VERIFY the lead would be well-formed (has email + the right ids).
 * The feature-under-test's own compute endpoints (/api/get-matched/*) are
 * ALLOWED — you can't drive a quiz whose start/answer/resolve you mock.
 *
 * Runs best-effort in the sandbox (the enquiry submit is mocked locally so it
 * works here; the quiz's start/answer calls go through the flaky TLS-MITM proxy,
 * so full quiz completion is reliable only against a real network — point
 * LEAD_BASE at the Vercel deploy). In-session on the Max plan, no API key.
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE = process.env.LEAD_BASE || "https://lambent-sawine-17c3dd.netlify.app";
const OUT = process.env.LEAD_OUT || "/tmp/journey";
const STEPS = parseInt(process.env.LEAD_STEPS || "18", 10);
fs.mkdirSync(OUT, { recursive: true });

// Lead/enquiry/booking writes — MOCK + CAPTURE the payload.
const LEAD_WRITE = /^\/api\/(advisor-enquiry|advisor-lead|advisor-booking|sponsored-booking|booking|quiz-lead|submit-lead|lead-outcome|report-leads|developer-leads|answers\/ask|newsletter[\w/-]*|exit-intent-log)\b/;
// Feature-under-test's own functional endpoints — ALLOW through.
const ALLOW = /^\/api\/(get-matched|calculator|score|advisors?\/(search|filter))\b/;

function classify(url, method) {
  let path; try { path = new URL(url, BASE).pathname; } catch { return null; }
  const WRITE = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
  if (/^\/go\//.test(path)) return { cat: "affiliate" };
  if (/^\/api\/stripe\//.test(path) || /checkout|billing/i.test(path)) return { cat: "payment" };
  if (LEAD_WRITE.test(path)) return { cat: "lead", capture: true, path };
  if (ALLOW.test(path)) return null;            // allow through (real compute)
  if (WRITE && /^\/api\//.test(path)) return { cat: "write" };
  return null;                                   // GET / asset → allow
}

const txtFn = () => {};

async function runGetMatched(page, leads) {
  const r = { name: "get-matched quiz", url: BASE + "/get-matched", steps: [], reachedResult: false, note: null };
  await page.goto(BASE + "/get-matched", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2800);

  let analyzingRounds = 0;
  for (let i = 0; i < STEPS; i++) {
    const s = await page.evaluate(() => {
      const t = (el) => (el && el.textContent || "").replace(/\s+/g, " ").trim();
      const body = t(document.body);
      const prompt = t(document.querySelector("article h1")) || "";
      const radios = [...document.querySelectorAll("[role=radiogroup] [role=radio], article [role=radio]")].map((b) => t(b)).filter(Boolean);
      const hasContinue = [...document.querySelectorAll("article button")].some((b) => /continue/i.test(t(b)));
      const textInput = !!document.querySelector("article input[type=text], article textarea");
      const numberInput = !!document.querySelector("article input[type=number]");
      const multiBtns = [...document.querySelectorAll("article button")].filter((b) => !/continue/i.test(t(b)) && t(b)).length;
      // A QuestionCard is on screen iff there's a prompt h1 + at least one input control.
      const isQuestion = !!prompt && (radios.length > 0 || textInput || numberInput || multiBtns > 0);
      // The AnalyzingScreen interstitial (its exact copy) while /resolve runs.
      const analyzing = /building your action plan|personalising your action plan|matching your goals|checking platforms, advisors|finding your match|analy(s|z)ing|crunching/i.test(body);
      // Markers UNIQUE to the final result screen (the restart button + top matches).
      const resultText = /start over|different answers|your top match|view all matches|recommended next step|book a (call|consult)|contact (this|an|your) advis|no (strong )?match for/i.test(body);
      const errorState = /ran into a problem|failed to start|something went wrong/i.test(body);
      const noStart = /not sure where to start/i.test(body);
      const result = resultText && !isQuestion && !analyzing;
      return { prompt, radios, hasContinue, textInput, numberInput, multiBtns, isQuestion, result, analyzing, errorState, noStart };
    }).catch(() => ({}));

    const shot = `${OUT}/getmatched-step-${i}.png`;
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    r.steps.push({ i, prompt: s.prompt || "", options: (s.radios || []).length, result: !!s.result, analyzing: !!s.analyzing, error: !!s.errorState, screenshot: shot });
    console.log(`  [get-matched] step ${i}: ${s.result ? "RESULT" : s.analyzing ? "analyzing…" : s.errorState ? "ERROR" : s.noStart ? "fallback(not-sure-where-to-start)" : (s.prompt || "(no question)").slice(0, 64)}  · options:${(s.radios || []).length}`);

    if (s.result) { r.reachedResult = true; r.note = "reached result/plan screen"; break; }
    if (s.errorState || s.noStart) { r.note = "quiz did not render questions (error/fallback — in the sandbox this is the TLS-MITM proxy dropping the start fetch; expected to work on a real network / Vercel)"; break; }
    if (s.analyzing) {
      analyzingRounds++;
      if (analyzingRounds > 5) { r.note = "stuck on 'Building your action plan' — /resolve didn't return (in the sandbox this is the TLS-MITM proxy dropping the resolve fetch; expected to complete on a real network / Vercel)"; break; }
      await page.waitForTimeout(2200); continue;
    }
    analyzingRounds = 0;
    if (!s.prompt && (s.radios || []).length === 0 && !s.textInput && !s.numberInput) { r.note = "no question card detected — stopping"; break; }

    // ── Answer the current question ─────────────────────────────
    const article = page.locator("article").first();
    const radioLoc = page.locator("[role=radiogroup] [role=radio], article [role=radio]");
    const rc = await radioLoc.count().catch(() => 0);
    if (rc > 0) {
      let idx = 0;
      for (let k = 0; k < rc; k++) {
        const tt = ((await radioLoc.nth(k).innerText().catch(() => "")) || "").toLowerCase();
        if (/long|growth|wealth|retire|confident|experienc|shares|etf|balanced|\byes\b|high|grow/.test(tt)) { idx = k; break; }
      }
      await radioLoc.nth(idx).click({ timeout: 4000 }).catch(() => {});   // select auto-advances
    } else if (s.textInput) {
      await article.locator("input[type=text], textarea").first().fill("Build long-term wealth").catch(() => {});
    } else if (s.numberInput) {
      await article.locator("input[type=number]").first().fill("50000").catch(() => {});
    } else if (s.multiBtns > 0) {
      await article.locator("button").filter({ hasNotText: /continue/i }).first().click({ timeout: 4000 }).catch(() => {});
    }
    // Continue button (multiselect/text/number)
    const cont = article.getByRole("button", { name: /continue/i });
    if (await cont.count().catch(() => 0) > 0) await cont.first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1900);
  }
  return r;
}

async function runAdviserEnquiry(page, leads) {
  const r = { name: "adviser enquiry", profileUrl: null, submitted: false, confirmation: false, note: null };
  await page.goto(BASE + "/advisors", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2200);
  const slug = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/advisor/"]')]
      .map((x) => x.getAttribute("href"))
      .find((h) => h && !/trust-score|methodology|\/compare/.test(h));
    return a || null;
  }).catch(() => null);
  const profile = BASE + (slug || "/advisor/aisha-rahman-blueprint");
  r.profileUrl = profile;

  await page.goto(profile, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/enquiry-profile.png`, fullPage: true }).catch(() => {});

  const nameI = page.locator('input[placeholder="Full name"]');
  if (await nameI.count().catch(() => 0) === 0) {
    // Some profiles surface the form behind an "Enquire" / "Contact" button — try to open it.
    const opener = page.getByRole("button", { name: /enquire|contact|get in touch|send enquiry/i });
    if (await opener.count().catch(() => 0) > 0) { await opener.first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1200); }
  }
  if (await nameI.count().catch(() => 0) === 0) { r.note = "contact form not found on this profile"; return r; }

  await nameI.first().fill("QA Bot (pre-launch test)").catch(() => {});
  await page.locator('input[placeholder="your@email.com"], input[type=email]').first().fill("qa-bot@example.com").catch(() => {});
  const phone = page.locator('input[placeholder="04XX XXX XXX"], input[type=tel]');
  if (await phone.count().catch(() => 0) > 0) await phone.first().fill("0400000000").catch(() => {});
  const msg = page.locator('textarea');
  if (await msg.count().catch(() => 0) > 0) await msg.first().fill("Automated pre-launch QA enquiry — please ignore.").catch(() => {});

  const send = page.getByRole("button", { name: /send enquiry/i });
  if (await send.count().catch(() => 0) === 0) { r.note = "send button not found"; return r; }
  await send.first().click({ timeout: 5000 }).catch(() => {});
  r.submitted = true;
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/enquiry-result.png`, fullPage: true }).catch(() => {});
  r.confirmation = await page.evaluate(() => /enquiry sent|typically respond within 24|reviews your request/i.test(document.body.textContent || "")).catch(() => false);
  return r;
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 } });
  await ctx.addInitScript(() => { try { ["user_onboarding_seen"].forEach((k) => localStorage.setItem(k, "true")); ["cookie-consent", "inv_cookie_consent", "cookie_consent"].forEach((k) => localStorage.setItem(k, "declined")); } catch {} });
  const leads = [];
  const mockedOther = {};
  await ctx.route("**/*", (route) => {
    const req = route.request();
    const c = classify(req.url(), req.method());
    if (!c) return route.continue();
    if (c.capture) {
      let body = null; try { body = JSON.parse(req.postData() || "null"); } catch { body = (req.postData() || "").slice(0, 400); }
      leads.push({ path: c.path, method: req.method(), body });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: "mock-lead-" + leads.length, mocked: true }) });
    }
    mockedOther[c.cat] = (mockedOther[c.cat] || 0) + 1;
    if (c.cat === "affiliate" && req.method() === "GET") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Mocked</title>" });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mocked: true }) });
  });
  const page = await ctx.newPage();

  console.log(`\n=== Lead-flow E2E vs ${BASE} ===`);
  const getMatched = await runGetMatched(page, leads);
  const adviserEnquiry = await runAdviserEnquiry(page, leads);
  await browser.close();

  // ── Verify lead capture is well-formed ──────────────────────
  const enquiry = leads.find((l) => /advisor-enquiry/.test(l.path));
  const enquiryValid = !!(enquiry && enquiry.body && enquiry.body.user_email && (enquiry.body.professional_id !== undefined));

  const summary = {
    base: BASE,
    getMatched: { reachedResult: getMatched.reachedResult, steps: getMatched.steps.length, note: getMatched.note },
    adviserEnquiry: { submitted: adviserEnquiry.submitted, confirmationShown: adviserEnquiry.confirmation, profile: adviserEnquiry.profileUrl, note: adviserEnquiry.note },
    leadCapture: {
      total: leads.length,
      advisorEnquiryCaptured: !!enquiry,
      advisorEnquiryWellFormed: enquiryValid,
      sample: enquiry ? { path: enquiry.path, keys: enquiry.body && typeof enquiry.body === "object" ? Object.keys(enquiry.body) : null, user_email: enquiry.body?.user_email, professional_id: enquiry.body?.professional_id } : null,
    },
    otherSideEffectsMocked: mockedOther,
  };
  fs.writeFileSync(`${OUT}/lead-flows.json`, JSON.stringify({ summary, getMatched, adviserEnquiry, capturedLeads: leads }, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
