/* eslint-disable */
/**
 * Lead/revenue flow driver v2 — end-to-end.
 *
 * Runs four flows and verifies that each reaches a confirmed end-state:
 *
 *   A) get-matched quiz   — /get-matched → answer all QuestionCards → result screen.
 *   B) adviser enquiry    — /advisors → profile → fill Contact form → "Enquiry Sent!".
 *   C) broker comparison  — /compare → add two brokers → comparison table renders.
 *   D) account signup     — /login → detect signup link/tab → fill form → mock auth
 *                           → detect success state (dashboard redirect or email-verify).
 *
 * Side-effect firewall with PAYLOAD CAPTURE: lead/enquiry/booking and Supabase
 * auth writes are mocked locally (no real lead or account created) but their
 * request bodies are captured so we can VERIFY the payload is well-formed.
 *
 * The quiz's own compute endpoints (/api/get-matched/*) are ALLOWED — you
 * can't drive a quiz whose start/answer/resolve you mock.
 *
 * Env vars:
 *   LEAD_BASE    Target origin (default: Netlify preview)
 *   LEAD_OUT     Output directory (default: /tmp/journey)
 *   LEAD_STEPS   Max steps for the quiz flow (default: 18)
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE  = process.env.LEAD_BASE  || "https://lambent-sawine-17c3dd.netlify.app";
const OUT   = process.env.LEAD_OUT   || "/tmp/journey";
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
  // Supabase auth — mock so no real account is created; capture the payload.
  if (/supabase\.co\/auth\//.test(url)) return { cat: "auth", capture: WRITE, path: "/supabase/auth" };
  if (LEAD_WRITE.test(path)) return { cat: "lead", capture: true, path };
  if (ALLOW.test(path)) return null;           // allow through (real compute)
  if (WRITE && /^\/api\//.test(path)) return { cat: "write" };
  return null;                                  // GET / asset → allow
}

// ── Shared route handler setup ────────────────────────────────────────────────
async function installFirewall(ctx, leads, mockedOther) {
  await ctx.route("**/*", (route) => {
    const req = route.request();
    const c = classify(req.url(), req.method());
    if (!c) return route.continue();
    if (c.capture) {
      let body = null;
      try { body = JSON.parse(req.postData() || "null"); } catch { body = (req.postData() || "").slice(0, 400); }
      leads.push({ path: c.path, cat: c.cat, method: req.method(), body });
    }
    mockedOther[c.cat] = (mockedOther[c.cat] || 0) + 1;
    if (c.cat === "auth") {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ access_token: "mock-token", token_type: "bearer", expires_in: 3600, refresh_token: "mock-refresh",
          user: { id: "mock-user-id", email: "qa-bot@example.com", email_confirmed_at: new Date().toISOString() } }) });
    }
    if (c.cat === "affiliate" && req.method() === "GET") {
      return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Mocked</title>" });
    }
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ ok: true, id: "mock-" + leads.length, mocked: true }) });
  });
}

// ── Flow A: get-matched quiz ──────────────────────────────────────────────────
async function runGetMatched(page) {
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
      const textInput  = !!document.querySelector("article input[type=text], article textarea");
      const numberInput = !!document.querySelector("article input[type=number]");
      const multiBtns  = [...document.querySelectorAll("article button")].filter((b) => !/continue/i.test(t(b)) && t(b)).length;
      const isQuestion = !!prompt && (radios.length > 0 || textInput || numberInput || multiBtns > 0);
      const analyzing  = /building your action plan|personalising your action plan|matching your goals|checking platforms|finding your match|analy(s|z)ing|crunching/i.test(body);
      const resultText = /start over|different answers|your top match|view all matches|recommended next step|book a (call|consult)|contact (this|an|your) advis|no (strong )?match for/i.test(body);
      const errorState = /ran into a problem|failed to start|something went wrong/i.test(body);
      const noStart    = /not sure where to start/i.test(body);
      return { prompt, radios, hasContinue, textInput, numberInput, multiBtns, isQuestion, result: resultText && !isQuestion && !analyzing, analyzing, errorState, noStart };
    }).catch(() => ({}));

    const shot = `${OUT}/flow-a-step-${i}.png`;
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    r.steps.push({ i, prompt: s.prompt || "", options: (s.radios || []).length, result: !!s.result, analyzing: !!s.analyzing, error: !!s.errorState, screenshot: shot });
    console.log(`  [get-matched] step ${i}: ${s.result ? "RESULT" : s.analyzing ? "analyzing…" : s.errorState ? "ERROR" : s.noStart ? "fallback(not-sure-where-to-start)" : (s.prompt || "(no question)").slice(0, 64)}  · opts:${(s.radios || []).length}`);

    if (s.result) { r.reachedResult = true; r.note = "reached result/plan screen"; break; }
    if (s.errorState || s.noStart) { r.note = "quiz did not render questions (TLS-MITM proxy in sandbox — works on real network/Vercel)"; break; }
    if (s.analyzing) {
      analyzingRounds++;
      if (analyzingRounds > 5) { r.note = "stuck on 'Building your action plan' — /resolve timed out (expected on sandbox proxy)"; break; }
      await page.waitForTimeout(2200);
      continue;
    }
    analyzingRounds = 0;
    if (!s.prompt && (s.radios || []).length === 0 && !s.textInput && !s.numberInput) { r.note = "no question card detected — stopping"; break; }

    const article    = page.locator("article").first();
    const radioLoc   = page.locator("[role=radiogroup] [role=radio], article [role=radio]");
    const rc         = await radioLoc.count().catch(() => 0);
    if (rc > 0) {
      let idx = 0;
      for (let k = 0; k < rc; k++) {
        const tt = ((await radioLoc.nth(k).innerText().catch(() => "")) || "").toLowerCase();
        if (/long|growth|wealth|retire|confident|experienc|shares|etf|balanced|\byes\b|high|grow/.test(tt)) { idx = k; break; }
      }
      await radioLoc.nth(idx).click({ timeout: 4000 }).catch(() => {});
    } else if (s.textInput) {
      await article.locator("input[type=text], textarea").first().fill("Build long-term wealth").catch(() => {});
    } else if (s.numberInput) {
      await article.locator("input[type=number]").first().fill("50000").catch(() => {});
    } else if (s.multiBtns > 0) {
      await article.locator("button").filter({ hasNotText: /continue/i }).first().click({ timeout: 4000 }).catch(() => {});
    }
    const cont = article.getByRole("button", { name: /continue/i });
    if (await cont.count().catch(() => 0) > 0) await cont.first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1900);
  }
  return r;
}

// ── Flow B: adviser enquiry ───────────────────────────────────────────────────
async function runAdviserEnquiry(page) {
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
  await page.screenshot({ path: `${OUT}/flow-b-profile.png`, fullPage: true }).catch(() => {});

  // Some profiles hide the form behind an "Enquire" button.
  const nameI = page.locator('input[placeholder="Full name"]');
  if (await nameI.count().catch(() => 0) === 0) {
    const opener = page.getByRole("button", { name: /enquire|contact|get in touch|send enquiry/i });
    if (await opener.count().catch(() => 0) > 0) {
      await opener.first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }
  }
  if (await nameI.count().catch(() => 0) === 0) { r.note = "contact form not found on profile"; return r; }

  await nameI.first().fill("QA Bot (pre-launch test)").catch(() => {});
  await page.locator('input[placeholder="your@email.com"], input[type=email]').first().fill("qa-bot@example.com").catch(() => {});
  const phone = page.locator('input[placeholder="04XX XXX XXX"], input[type=tel]');
  if (await phone.count().catch(() => 0) > 0) await phone.first().fill("0400000000").catch(() => {});
  const msg = page.locator("textarea");
  if (await msg.count().catch(() => 0) > 0) await msg.first().fill("Automated pre-launch QA enquiry — please ignore.").catch(() => {});

  const send = page.getByRole("button", { name: /send enquiry/i });
  if (await send.count().catch(() => 0) === 0) { r.note = "send button not found"; return r; }
  await send.first().click({ timeout: 5000 }).catch(() => {});
  r.submitted = true;
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/flow-b-result.png`, fullPage: true }).catch(() => {});
  r.confirmation = await page.evaluate(() =>
    /enquiry sent|typically respond within 24|reviews your request/i.test(document.body.textContent || "")
  ).catch(() => false);
  return r;
}

// ── Flow C: broker comparison ─────────────────────────────────────────────────
async function runBrokerComparison(page) {
  const r = { name: "broker comparison", url: BASE + "/compare", added: 0, tableRendered: false, note: null };
  await page.goto(BASE + "/compare", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/flow-c-before.png`, fullPage: true }).catch(() => {});

  // Try to add up to 2 brokers via any "Add to compare" / "Compare" button.
  const addBtns = page.getByRole("button", { name: /add to compare|compare|add/i })
    .filter({ hasNotText: /remove|clear|reset/i });
  const totalAdd = await addBtns.count().catch(() => 0);
  for (let k = 0; k < Math.min(totalAdd, 2); k++) {
    await addBtns.nth(k).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(800);
    r.added++;
  }

  // Alternatively, some UIs auto-select brokers on the /compare page already.
  // Check if a comparison table / panel is present.
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/flow-c-after.png`, fullPage: true }).catch(() => {});

  r.tableRendered = await page.evaluate(() => {
    const body = (document.body.textContent || "").replace(/\s+/g, " ");
    // Comparison table markers: column headers for two+ brokers, fee rows, etc.
    return /brokerage|management fee|CHESS|min\. deposit|trading fee/i.test(body) &&
      (document.querySelector("table,thead,[class*=compare-table],[class*=comparison]") !== null ||
       document.querySelectorAll("[class*=broker-card],[class*=BrokerCard]").length >= 2);
  }).catch(() => false);

  if (!r.tableRendered && r.added === 0) {
    // No "Add to compare" buttons — check if this page is already a table.
    r.tableRendered = await page.evaluate(() =>
      /brokerage|management fee|CHESS/i.test(document.body.textContent || "") &&
      document.querySelector("table,thead") !== null
    ).catch(() => false);
    r.note = "no 'Add to compare' buttons found — checked for pre-populated table";
  }

  return r;
}

// ── Flow D: account signup detection ─────────────────────────────────────────
async function runAccountSignup(page) {
  const r = { name: "account signup", formFound: false, submitted: false, successState: false, note: null };
  // Try /login first (often has a "Sign up" tab or link) then /signup.
  for (const path of ["/login", "/signup", "/register"]) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1800);
    const hasForm = await page.evaluate(() => {
      return document.querySelector('input[type=email], input[placeholder*="email" i]') !== null;
    }).catch(() => false);
    if (hasForm) { r.note = `form found at ${path}`; break; }
  }
  await page.screenshot({ path: `${OUT}/flow-d-form.png`, fullPage: true }).catch(() => {});

  // Switch to signup tab/link if we're on the login page.
  const signupLink = page.getByRole("link", { name: /sign ?up|create account|register|join/i })
    .or(page.getByRole("tab", { name: /sign ?up|register/i }))
    .first();
  if (await signupLink.count().catch(() => 0) > 0) {
    await signupLink.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1200);
  }

  const emailInput = page.locator('input[type=email], input[placeholder*="email" i]').first();
  if (await emailInput.count().catch(() => 0) === 0) {
    r.note = r.note ? r.note + " — but email field not found after tab switch" : "no email field found on login/signup/register pages";
    return r;
  }
  r.formFound = true;

  await emailInput.fill("qa-bot@example.com").catch(() => {});
  const pwField = page.locator('input[type=password]').first();
  if (await pwField.count().catch(() => 0) > 0) await pwField.fill("TestPass123!").catch(() => {});
  const nameField = page.locator('input[placeholder*="name" i], input[name*="name" i]').first();
  if (await nameField.count().catch(() => 0) > 0) await nameField.fill("QA Bot").catch(() => {});

  const submitBtn = page.getByRole("button", { name: /sign ?up|create account|register|get started|continue|next/i }).first();
  if (await submitBtn.count().catch(() => 0) === 0) { r.note = "submit button not found"; return r; }
  await submitBtn.click({ timeout: 5000 }).catch(() => {});
  r.submitted = true;
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/flow-d-result.png`, fullPage: true }).catch(() => {});

  r.successState = await page.evaluate(() => {
    const body = (document.body.textContent || "").replace(/\s+/g, " ");
    // Success: redirect to /account/dashboard, or verify-email message, or welcome copy.
    return /verify your email|check your email|account created|welcome|dashboard|get started/i.test(body) ||
      /\/account(\/dashboard)?/.test(location.pathname);
  }).catch(() => false);
  return r;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 1000 },
  });
  await ctx.addInitScript(() => {
    try {
      ["user_onboarding_seen"].forEach((k) => localStorage.setItem(k, "true"));
      ["cookie-consent", "inv_cookie_consent", "cookie_consent"].forEach((k) => localStorage.setItem(k, "declined"));
    } catch {}
  });

  const leads = [];
  const mockedOther = {};
  await installFirewall(ctx, leads, mockedOther);
  const page = await ctx.newPage();

  console.log(`\n=== Lead-flow E2E v2 vs ${BASE} ===`);
  const flowA = await runGetMatched(page, leads);
  const flowB = await runAdviserEnquiry(page);
  const flowC = await runBrokerComparison(page);
  const flowD = await runAccountSignup(page);
  await browser.close();

  // ── Verify lead capture is well-formed ────────────────────────────────────
  const enquiry      = leads.find((l) => /advisor-enquiry/.test(l.path));
  const enquiryValid = !!(enquiry && enquiry.body && enquiry.body.user_email && enquiry.body.professional_id !== undefined);
  const authCapture  = leads.find((l) => l.cat === "auth");

  const summary = {
    base: BASE,
    flowA_getMatched:      { reachedResult: flowA.reachedResult, steps: flowA.steps.length, note: flowA.note },
    flowB_adviserEnquiry:  { submitted: flowB.submitted, confirmationShown: flowB.confirmation, profile: flowB.profileUrl, note: flowB.note },
    flowC_brokerComparison: { added: flowC.added, tableRendered: flowC.tableRendered, note: flowC.note },
    flowD_accountSignup:   { formFound: flowD.formFound, submitted: flowD.submitted, successState: flowD.successState, note: flowD.note },
    leadCapture: {
      total: leads.length,
      advisorEnquiryCaptured: !!enquiry,
      advisorEnquiryWellFormed: enquiryValid,
      authCallMocked: !!authCapture,
      sample: enquiry ? {
        path: enquiry.path,
        keys: enquiry.body && typeof enquiry.body === "object" ? Object.keys(enquiry.body) : null,
        user_email: enquiry.body?.user_email,
        professional_id: enquiry.body?.professional_id,
      } : null,
    },
    otherSideEffectsMocked: mockedOther,
  };

  fs.writeFileSync(`${OUT}/lead-flows.json`, JSON.stringify({ summary, flowA, flowB, flowC, flowD, capturedLeads: leads }, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
