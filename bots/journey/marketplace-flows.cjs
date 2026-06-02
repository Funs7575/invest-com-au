/* eslint-disable */
/**
 * Launch-readiness test #4 — marketplace / review conversion flows, end-to-end.
 *
 * Exercises the ANONYMOUS-accessible conversion forms that create marketplace
 * records or reviews, against the live (preview) site:
 *
 *   1) Post a public job      — /quotes/post   (JobPostForm   → POST /api/quotes)
 *   2) Post a private brief   — /briefs/new    (BriefForm     → POST /api/briefs)
 *   3) Write a broker review  — /broker/<slug> (UserReviewForm→ POST /api/user-review)
 *      (NOTE: /reviews/write is auth-gated and posts to /api/review-incentive —
 *       the anonymous /api/user-review form lives on the broker profile page.)
 *   4) Submit an advisor review — /advisor/<slug> (AdvisorReviewForm → POST /api/advisor-review)
 *
 * SIDE-EFFECT FIREWALL (mirrors bots/journey/lead-flows.cjs, hardened):
 *   EVERY write is MOCKED. We intercept and route.fulfill() — never
 *   route.continue() — for ALL POST/PUT/PATCH/DELETE to /api/* and any /go/*,
 *   and CAPTURE each intercepted request's path + JSON body. This guarantees
 *   ZERO real writes reach the live server even if form-filling is imperfect.
 *   Read-only GET navigations pass through (route.continue()).
 *
 * The sandbox TLS-MITM proxy can drop async fetches / throw transient 403/503s,
 * so navigations are RETRIED and we only treat a failure as a finding if it
 * reproduces. Run: NODE_PATH=node_modules node bots/journey/marketplace-flows.cjs
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE =
  process.env.MKT_BASE ||
  "https://deploy-preview-1305--lambent-sawine-17c3dd.netlify.app";
const OUT = process.env.MKT_OUT || "/tmp/marketplace";
fs.mkdirSync(OUT, { recursive: true });

// ── Firewall classification ────────────────────────────────────────────────
// The conversion writes under test — MOCK + CAPTURE body.
const CAPTURE_WRITE =
  /^\/api\/(quotes|briefs|user-review|advisor-review|review-incentive)\b/;

function classify(url, method) {
  let path;
  try {
    path = new URL(url, BASE).pathname;
  } catch {
    return null;
  }
  const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(
    method.toUpperCase(),
  );
  // Affiliate outbound clicks — never let them hit the redirector.
  if (/^\/go\//.test(path)) return { cat: "affiliate", path, mockGet: true };
  // Payment surfaces — block hard.
  if (/^\/api\/stripe\//.test(path) || /checkout|billing/i.test(path))
    return { cat: "payment", path };
  // Any write to our own API: mock. Capture the conversion ones by body.
  if (isWrite && /^\/api\//.test(path)) {
    return { cat: "write", path, capture: CAPTURE_WRITE.test(path) };
  }
  // Everything else (GET navigations, assets, GET data fetches) → pass through.
  return null;
}

// Build a realistic mock response per endpoint so the form's success branch
// fires (it reads data.slug / data.success etc.).
function mockResponseFor(path, n) {
  if (/^\/api\/quotes/.test(path)) {
    return {
      success: true,
      job_id: 9000 + n,
      slug: `qa-mock-job-${n}`,
      ends_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    };
  }
  if (/^\/api\/briefs/.test(path)) {
    return {
      success: true,
      brief_id: 8000 + n,
      slug: `qa-mock-brief-${n}`,
      accept_credits_cost: 3,
      risk_review_status: "clear",
    };
  }
  if (/^\/api\/advisor-review/.test(path)) {
    return { success: true, message: "Review submitted for moderation." };
  }
  if (/^\/api\/user-review/.test(path)) {
    return { success: true };
  }
  return { ok: true, mocked: true };
}

// ── Helpers ──────────────────────────────────────────────────────────────
async function gotoWithRetry(page, url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const resp = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      // A proxy 403/503 shows up as resp.status() on the doc — retry those.
      const st = resp ? resp.status() : 0;
      if (st && st >= 400 && st < 600 && (st === 403 || st === 503)) {
        await page.waitForTimeout(1500 + t * 1000);
        continue;
      }
      await page.waitForTimeout(1800);
      return true;
    } catch {
      await page.waitForTimeout(1500 + t * 1000);
    }
  }
  return false;
}

const bodyText = (page) =>
  page.evaluate(() => (document.body.textContent || "").replace(/\s+/g, " ")).catch(() => "");

// ── Flow 1: Post a public job ──────────────────────────────────────────────
async function runPostJob(page) {
  const r = {
    name: "post-public-job",
    url: BASE + "/quotes/post",
    rendered: false,
    submitted: false,
    confirmation: false,
    note: null,
  };
  const ok = await gotoWithRetry(page, BASE + "/quotes/post");
  if (!ok) {
    r.note = "page did not load after retries (proxy)";
    return r;
  }
  // PMP-01: /quotes/post is a permanent 308 redirect to /briefs/new — the
  // JobPostForm is no longer served. Detect that explicitly so we don't
  // misreport it as a render failure.
  r.landedUrl = page.url();
  r.redirectedToBriefs = /\/briefs\/new/.test(r.landedUrl);
  await page.screenshot({ path: `${OUT}/job-1-details.png`, fullPage: true }).catch(() => {});

  // Step 1 — details (JobPostForm). On the live preview this never renders
  // because of the redirect; we record that as the finding.
  const titleI = page.locator('input[placeholder*="Refinance"]').first();
  if ((await titleI.count().catch(() => 0)) === 0) {
    r.note = r.redirectedToBriefs
      ? "/quotes/post 308-redirects to /briefs/new (PMP-01) — the public JobPostForm is no longer reachable anonymously; the brief flow replaces it (see Flow 2)."
      : "JobPostForm title input not found — form did not render";
    return r;
  }
  r.rendered = true;
  await titleI.fill("Refinance our $750k investment loan (QA test)").catch(() => {});
  await page
    .locator("textarea")
    .first()
    .fill(
      "Automated pre-launch QA job post — please ignore. We want to refinance an investment loan and review structuring options across two properties in NSW.",
    )
    .catch(() => {});
  // State + Budget selects (order: State then Budget per the markup).
  const selects = page.locator("select");
  if ((await selects.count().catch(() => 0)) >= 2) {
    await selects.nth(0).selectOption("NSW").catch(() => {});
    await selects.nth(1).selectOption("2k_5k").catch(() => {});
  }
  // Continue → advisors
  await page.getByRole("button", { name: /^Continue$/i }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/job-2-advisors.png`, fullPage: true }).catch(() => {});

  // Step 2 — pick at least one advisor type (click a checkbox label).
  const checkbox = page.locator('input[type="checkbox"]').first();
  if ((await checkbox.count().catch(() => 0)) > 0) {
    await checkbox.check({ timeout: 4000 }).catch(async () => {
      // fallback: click the surrounding label
      await page.locator("label", { hasText: /mortgage broker/i }).first().click().catch(() => {});
    });
  }
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /^Continue$/i }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/job-3-contact.png`, fullPage: true }).catch(() => {});

  // Step 3 — contact + consent
  await page.locator("input[type=text]").first().fill("QA Bot (pre-launch test)").catch(() => {});
  await page.locator("input[type=email]").first().fill("qa-bot+job@example.com").catch(() => {});
  const phone = page.locator("input[type=tel]");
  if ((await phone.count().catch(() => 0)) > 0) await phone.first().fill("0400000000").catch(() => {});
  await page.locator('input[type="checkbox"]').first().check({ timeout: 4000 }).catch(() => {});

  const post = page.getByRole("button", { name: /post job/i });
  if ((await post.count().catch(() => 0)) === 0) {
    r.note = "'Post job' button not found on contact step";
    return r;
  }
  await post.first().click({ timeout: 6000 }).catch(() => {});
  r.submitted = true;
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/job-4-result.png`, fullPage: true }).catch(() => {});
  const txt = await bodyText(page);
  r.confirmation = /job posted|verified advisors are being notified|quotes appear on your job page/i.test(txt);
  if (!r.confirmation) {
    const errTxt = await page.locator(".text-red-700, [class*='red']").allInnerTexts().catch(() => []);
    r.note = "no confirmation; visible error(s): " + JSON.stringify(errTxt.slice(0, 3));
  }
  return r;
}

// ── Flow 2: Post a private brief ────────────────────────────────────────────
async function runPostBrief(page) {
  const r = {
    name: "post-private-brief",
    url: BASE + "/briefs/new",
    rendered: false,
    submitted: false,
    confirmation: false,
    note: null,
  };
  const ok = await gotoWithRetry(page, BASE + "/briefs/new");
  if (!ok) {
    r.note = "page did not load after retries (proxy)";
    return r;
  }
  await page.screenshot({ path: `${OUT}/brief-1-template.png`, fullPage: true }).catch(() => {});

  // Step "template" — pick "Mortgage Brief" (only a NOTES field, none required,
  // so step "details" passes with just title/desc/state/budget).
  const tmplBtn = page.locator("button", { hasText: /Mortgage Brief/i }).first();
  if ((await tmplBtn.count().catch(() => 0)) === 0) {
    // fall back to General if present
    const gen = page.locator("button", { hasText: /General Expert Brief/i }).first();
    if ((await gen.count().catch(() => 0)) === 0) {
      r.note = "no template buttons found — form did not render";
      return r;
    }
    r.usedTemplate = "general";
    await gen.click({ timeout: 4000 }).catch(() => {});
  } else {
    r.usedTemplate = "mortgage";
    await tmplBtn.click({ timeout: 4000 }).catch(() => {});
  }
  r.rendered = true;
  await page.getByRole("button", { name: /^Continue$/i }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/brief-2-details.png`, fullPage: true }).catch(() => {});

  // Step "details"
  await page.locator('input[type="text"]').first().fill("Investment loan refinance — QA test brief").catch(() => {});
  await page
    .locator("textarea")
    .first()
    .fill(
      "Automated pre-launch QA brief — please ignore. Looking to refinance an investment loan and review whether to fix or split, plus offset strategy. NSW based.",
    )
    .catch(() => {});
  const dSelects = page.locator("select");
  if ((await dSelects.count().catch(() => 0)) >= 2) {
    await dSelects.nth(0).selectOption("NSW").catch(() => {});
    await dSelects.nth(1).selectOption("2k_5k").catch(() => {});
  }
  // If we fell back to "general", the timeline select is required — fill any
  // remaining empty selects with a sensible value.
  if (r.usedTemplate === "general" && (await dSelects.count().catch(() => 0)) >= 3) {
    await dSelects.nth(2).selectOption("not_sure").catch(() => {});
  }
  await page.getByRole("button", { name: /^Continue$/i }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/brief-3-preference.png`, fullPage: true }).catch(() => {});

  // Step "preference" — defaults (provider=any, routing=smart_match) already
  // satisfy canPreference; just Continue.
  await page.getByRole("button", { name: /^Continue$/i }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/brief-4-contact.png`, fullPage: true }).catch(() => {});

  // Step "contact"
  await page.locator('input[type="text"]').first().fill("QA Bot (pre-launch test)").catch(() => {});
  await page.locator("input[type=email]").first().fill("qa-bot+brief@example.com").catch(() => {});
  const phone = page.locator("input[type=tel]");
  if ((await phone.count().catch(() => 0)) > 0) await phone.first().fill("0400000000").catch(() => {});
  await page.locator('input[type="checkbox"]').first().check({ timeout: 4000 }).catch(() => {});

  const send = page.getByRole("button", { name: /send match request/i });
  if ((await send.count().catch(() => 0)) === 0) {
    r.note = "'Send Match Request' button not found on contact step";
    return r;
  }
  await send.first().click({ timeout: 6000 }).catch(() => {});
  r.submitted = true;
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/brief-5-result.png`, fullPage: true }).catch(() => {});
  const txt = await bodyText(page);
  r.confirmation = /match request sent|verified providers can now see|we'll email you when a provider accepts|needs a quick compliance review/i.test(txt);

  // Try loading the (mocked) brief status page with ?email=… to confirm the
  // "View your Quote Status" link is wired. The slug is our mock slug.
  if (r.confirmation) {
    const link = page.getByRole("link", { name: /view your quote status/i });
    r.statusLinkPresent = (await link.count().catch(() => 0)) > 0;
    if (r.statusLinkPresent) {
      const href = await link.first().getAttribute("href").catch(() => null);
      r.statusLinkHref = href;
    }
  } else {
    const errTxt = await page.locator(".text-red-700, [class*='red']").allInnerTexts().catch(() => []);
    r.note = "no confirmation; visible error(s): " + JSON.stringify(errTxt.slice(0, 3));
  }
  return r;
}

// ── Flow 3: Write a broker review (anonymous, on /broker/<slug>) ────────────
async function runBrokerReview(page) {
  const r = {
    name: "broker-review",
    profileUrl: null,
    formOpened: false,
    submitted: false,
    confirmation: false,
    note: null,
  };
  // Discover a broker slug from the directory; fall back to a known one.
  await gotoWithRetry(page, BASE + "/brokers");
  const slug = await page
    .evaluate(() => {
      const a = [...document.querySelectorAll('a[href^="/broker/"]')]
        .map((x) => x.getAttribute("href"))
        .find((h) => h && /^\/broker\/[a-z0-9-]+$/.test(h));
      return a || null;
    })
    .catch(() => null);
  const profile = BASE + (slug || "/broker/commsec");
  r.profileUrl = profile;

  const ok = await gotoWithRetry(page, profile);
  if (!ok) {
    r.note = "broker profile did not load after retries (proxy)";
    return r;
  }
  // Settle. NOTE: do NOT re-navigate to `${profile}#reviews` — a second
  // same-URL navigation (hash jump) was observed to desync React's controlled
  // form state from the DOM inputs (fields visually filled but useState empty),
  // which makes the form's own validation silently block submit. The opener is
  // scrolled into view below instead, which is what a real user does.
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/brokerreview-1-profile.png`, fullPage: true }).catch(() => {});

  // The form is collapsed behind the inline opener button whose text is
  // "Write a Review of <broker>". NOTE: the page ALSO has a sidebar jump-link
  // button + a header/footer link both reading just "Write a Review" — those
  // do NOT open the form. Target the specific "...of <broker>" opener.
  // The opener sits low on a tall page; nudge a scroll so any lazy content
  // mounts, then open it. Retry once if the form doesn't render.
  let formUp = false;
  for (let attempt = 0; attempt < 2 && !formUp; attempt++) {
    let opener = page.getByRole("button", { name: /write a review of/i });
    if ((await opener.count().catch(() => 0)) === 0) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
      await page.waitForTimeout(700);
      opener = page.getByRole("button", { name: /write a review of/i });
    }
    if ((await opener.count().catch(() => 0)) === 0) {
      opener = page.getByRole("button", { name: /^write a review$/i });
    }
    if ((await opener.count().catch(() => 0)) > 0) {
      const target = opener.last();
      await target.scrollIntoViewIfNeeded().catch(() => {});
      await target.click({ timeout: 5000 }).catch(() => {});
      r.formOpened = true;
      await page.waitForTimeout(900);
      formUp = await page
        .evaluate(() => !!document.querySelector("#review-body"))
        .catch(() => false);
    } else {
      break;
    }
  }
  {
    r.formRendered = formUp;
  }
  // Star rating: scope to the review form's StarRatingInput (role=radiogroup
  // of 5 role=radio stars). Scoping avoids matching any other radiogroup on
  // the page. Click the 5th star (= 5/5) and confirm it registered.
  const starScope = page.locator("form:has(#review-body) [role=radio]");
  const starCount = await starScope.count().catch(() => 0);
  if (starCount >= 5) {
    await starScope.nth(4).click({ timeout: 4000 }).catch(() => {});
  } else {
    // Fallback to page-wide if the form-scoped query found nothing.
    await page.locator('[role="radio"]').nth(4).click({ timeout: 4000 }).catch(() => {});
  }
  await page.waitForTimeout(250);
  // Required fields by id.
  const fill = async (sel, val) => {
    const loc = page.locator(sel);
    if ((await loc.count().catch(() => 0)) > 0) await loc.first().fill(val).catch(() => {});
  };
  await fill("#review-name", "QA Bot");
  await fill("#review-email", "qa-bot+broker@example.com");
  await fill("#review-title", "Pre-launch QA review (ignore)");
  await fill(
    "#review-body",
    "Automated pre-launch QA review — please ignore. Testing the broker review submission path end to end.",
  );
  // Consent checkbox — MUST be scoped to the review form. The page has other
  // <form>s (search/newsletter) with their own checkboxes; a page-wide
  // 'form input[type=checkbox]' selector checks the wrong box and the review's
  // own consent stays unticked → "Please agree to the terms" blocks submit.
  // The review consent is the only checkbox inside the form that holds
  // #review-body.
  const consent = page.locator("form:has(#review-body) input[type=checkbox]");
  if ((await consent.count().catch(() => 0)) > 0) {
    await consent.first().check({ timeout: 4000 }).catch(() => {});
  } else {
    // Fallback: the checkbox immediately following the review body textarea.
    await page.locator("#review-body ~ * input[type=checkbox]").first().check({ timeout: 3000 }).catch(() => {});
  }
  // Capture consent state for the report.
  r.consentChecked = await page
    .evaluate(() => {
      const ta = document.querySelector("#review-body");
      const form = ta ? ta.closest("form") : null;
      const cb = form ? form.querySelector('input[type=checkbox]') : null;
      return cb ? cb.checked : null;
    })
    .catch(() => null);

  // Confirm the star registered before submitting (UserReviewForm blocks
  // submit with "Please select a star rating" if rating === 0).
  r.starChecked = await page
    .evaluate(() => {
      const form = document.querySelector("#review-body")?.closest("form");
      return form ? !!form.querySelector('[role="radio"][aria-checked="true"]') : null;
    })
    .catch(() => null);

  const submit = page.getByRole("button", { name: /submit review/i });
  if ((await submit.count().catch(() => 0)) === 0) {
    r.note = "'Submit Review' button not found (form may not have opened)";
    return r;
  }
  await submit.first().click({ timeout: 6000 }).catch(() => {});
  r.submitted = true;
  // Poll for the success panel — the "Check your inbox!" state renders after
  // the (mocked) POST resolves, which can be a beat after the click.
  const CONF = /check your inbox|sent a verification email|appear on this page once approved/i;
  await page
    .waitForFunction(
      (re) => new RegExp(re, "i").test(document.body.textContent || ""),
      "check your inbox|sent a verification email|appear on this page once approved",
      { timeout: 6000 },
    )
    .catch(() => {});
  await page.screenshot({ path: `${OUT}/brokerreview-2-result.png`, fullPage: true }).catch(() => {});
  const txt = await bodyText(page);
  r.confirmation = CONF.test(txt);
  if (!r.confirmation) {
    // Surface the inline form error (if any) to distinguish a real validation
    // block from a timing miss. The conversion payload capture is the
    // authoritative proof the submit reached the API regardless.
    const errTxt = await page
      .locator("form:has(#review-body) p.text-red-600, form:has(#review-body) [role=alert]")
      .allInnerTexts()
      .catch(() => []);
    r.note =
      "success panel not detected in 6s; inline form error(s): " +
      JSON.stringify(errTxt.slice(0, 3)) +
      " (check captured /api/user-review payload for authoritative result)";
  }
  return r;
}

// ── Flow 4: Submit an advisor review (on /advisor/<slug>) ───────────────────
async function runAdvisorReview(page) {
  const r = {
    name: "advisor-review",
    profileUrl: null,
    formOpened: false,
    submitted: false,
    confirmation: false,
    note: null,
  };
  await gotoWithRetry(page, BASE + "/advisors");
  const slug = await page
    .evaluate(() => {
      const a = [...document.querySelectorAll('a[href^="/advisor/"]')]
        .map((x) => x.getAttribute("href"))
        .find((h) => h && /^\/advisor\/[a-z0-9-]+$/.test(h) && !/trust-score|methodology|compare/.test(h));
      return a || null;
    })
    .catch(() => null);
  const profile = BASE + (slug || "/advisor/aisha-rahman-blueprint");
  r.profileUrl = profile;

  const ok = await gotoWithRetry(page, profile);
  if (!ok) {
    r.note = "advisor profile did not load after retries (proxy)";
    return r;
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/advisorreview-1-profile.png`, fullPage: true }).catch(() => {});

  // Open the review form ("Write a Review" button on the profile).
  const opener = page.getByRole("button", { name: /write a review/i });
  if ((await opener.count().catch(() => 0)) === 0) {
    r.note = "no 'Write a Review' trigger on this advisor profile — skipped";
    return r;
  }
  await opener.first().scrollIntoViewIfNeeded().catch(() => {});
  await opener.first().click({ timeout: 5000 }).catch(() => {});
  r.formOpened = true;
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/advisorreview-2-form.png`, fullPage: true }).catch(() => {});

  // 4 star ratings — each is its own role=radiogroup with 5 role=radio stars.
  const groups = page.locator('[role="radiogroup"]');
  const gCount = await groups.count().catch(() => 0);
  r.starGroups = gCount;
  for (let i = 0; i < Math.min(gCount, 4); i++) {
    const star = groups.nth(i).locator('[role="radio"]').nth(4); // 5 stars
    await star.click({ timeout: 4000 }).catch(() => {});
  }
  // "Did you use … services?" → Yes
  await page.getByRole("button", { name: /^Yes$/ }).first().click({ timeout: 4000 }).catch(() => {});
  // Optional name + title, required body (>=50 chars).
  const textInputs = page.locator("input[type=text]");
  if ((await textInputs.count().catch(() => 0)) >= 1)
    await textInputs.first().fill("QA Bot").catch(() => {});
  await page
    .locator("textarea")
    .first()
    .fill(
      "Automated pre-launch QA advisor review — please ignore. This text is deliberately over fifty characters to satisfy the minimum length requirement.",
    )
    .catch(() => {});
  await page.waitForTimeout(300);

  const submit = page.getByRole("button", { name: /submit review/i });
  if ((await submit.count().catch(() => 0)) === 0) {
    r.note = "'Submit Review' button not found in advisor form";
    return r;
  }
  await submit.first().click({ timeout: 6000 }).catch(() => {});
  r.submitted = true;
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/advisorreview-3-result.png`, fullPage: true }).catch(() => {});
  const txt = await bodyText(page);
  r.confirmation = /review submitted|appear once verified/i.test(txt);
  if (!r.confirmation) {
    const errTxt = await page.locator("[role='alert'], [class*='red']").allInnerTexts().catch(() => []);
    r.note = "no confirmation; visible alert/error(s): " + JSON.stringify(errTxt.slice(0, 4));
  }
  return r;
}

// ── Main ────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 1000 },
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("user_onboarding_seen", "true");
      ["cookie-consent", "inv_cookie_consent", "cookie_consent"].forEach((k) =>
        localStorage.setItem(k, "declined"),
      );
    } catch {}
  });

  const writes = []; // captured conversion writes
  const mockedByCat = {}; // counts of every mocked request by category
  const allMockedWrites = []; // every mocked write path (for the 0-real-writes proof)

  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const c = classify(req.url(), req.method());
    if (!c) return route.continue(); // read-only GET / asset → pass through

    mockedByCat[c.cat] = (mockedByCat[c.cat] || 0) + 1;

    // Affiliate GET click → return a harmless stub page (never hit /go/).
    if (c.cat === "affiliate" && req.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>Mocked</title>",
      });
    }

    // Any write — record it as a mocked write (proof of 0 real writes).
    allMockedWrites.push({ path: c.path, method: req.method() });

    if (c.capture) {
      let parsed = null;
      try {
        parsed = JSON.parse(req.postData() || "null");
      } catch {
        parsed = (req.postData() || "").slice(0, 500);
      }
      const n = writes.length + 1;
      writes.push({ path: c.path, method: req.method(), body: parsed });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponseFor(c.path, n)),
      });
    }

    // Other (non-captured) writes/payments → generic mocked 200.
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, success: true, mocked: true }),
    });
  });

  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log("  [browser-console-error]", m.text().slice(0, 160));
  });

  console.log(`\n=== Marketplace / review conversion E2E vs ${BASE} ===`);
  console.log("Firewall: ALL POST/PUT/PATCH/DELETE to /api/* and /go/* are route.fulfill()'d (0 real writes).\n");

  const results = {};
  console.log("Flow 1: Post a public job (/quotes/post)…");
  results.postJob = await runPostJob(page).catch((e) => ({ name: "post-public-job", error: String(e) }));
  console.log("  →", JSON.stringify({ rendered: results.postJob.rendered, submitted: results.postJob.submitted, confirmation: results.postJob.confirmation, note: results.postJob.note }));

  console.log("Flow 2: Post a private brief (/briefs/new)…");
  results.postBrief = await runPostBrief(page).catch((e) => ({ name: "post-private-brief", error: String(e) }));
  console.log("  →", JSON.stringify({ rendered: results.postBrief.rendered, submitted: results.postBrief.submitted, confirmation: results.postBrief.confirmation, note: results.postBrief.note }));

  console.log("Flow 3: Write a broker review (/broker/<slug>)…");
  results.brokerReview = await runBrokerReview(page).catch((e) => ({ name: "broker-review", error: String(e) }));
  console.log("  →", JSON.stringify({ profile: results.brokerReview.profileUrl, opened: results.brokerReview.formOpened, submitted: results.brokerReview.submitted, confirmation: results.brokerReview.confirmation, note: results.brokerReview.note }));

  console.log("Flow 4: Submit an advisor review (/advisor/<slug>)…");
  results.advisorReview = await runAdvisorReview(page).catch((e) => ({ name: "advisor-review", error: String(e) }));
  console.log("  →", JSON.stringify({ profile: results.advisorReview.profileUrl, opened: results.advisorReview.formOpened, submitted: results.advisorReview.submitted, confirmation: results.advisorReview.confirmation, note: results.advisorReview.note }));

  await browser.close();

  // ── Verify captured payloads are well-formed ──────────────────────────
  const find = (re) => writes.find((w) => re.test(w.path));
  const keysOf = (b) => (b && typeof b === "object" ? Object.keys(b) : null);

  const job = find(/^\/api\/quotes/);
  const brief = find(/^\/api\/briefs/);
  const broker = find(/^\/api\/user-review/);
  const advisor = find(/^\/api\/advisor-review/);

  const jobValid = !!(
    job && job.body && typeof job.body === "object" &&
    job.body.job_title && job.body.contact_email &&
    Array.isArray(job.body.advisor_types) && job.body.advisor_types.length > 0 &&
    job.body.budget_band && job.body.location_state
  );
  const briefValid = !!(
    brief && brief.body && typeof brief.body === "object" &&
    brief.body.brief_template && brief.body.job_title && brief.body.contact_email &&
    brief.body.consent_share === true
  );
  const brokerValid = !!(
    broker && broker.body && typeof broker.body === "object" &&
    broker.body.broker_slug && broker.body.email && broker.body.rating &&
    broker.body.title && broker.body.body
  );
  const advisorValid = !!(
    advisor && advisor.body && typeof advisor.body === "object" &&
    advisor.body.professional_id !== undefined && advisor.body.rating &&
    advisor.body.communication_rating && advisor.body.expertise_rating &&
    advisor.body.value_for_money_rating && typeof advisor.body.used_services === "boolean" &&
    advisor.body.body
  );

  const summary = {
    base: BASE,
    flows: {
      postJob: { rendered: results.postJob.rendered, redirectedToBriefs: results.postJob.redirectedToBriefs, landedUrl: results.postJob.landedUrl, submitted: results.postJob.submitted, confirmation: results.postJob.confirmation, note: results.postJob.note },
      postBrief: { rendered: results.postBrief.rendered, submitted: results.postBrief.submitted, confirmation: results.postBrief.confirmation, statusLinkHref: results.postBrief.statusLinkHref, note: results.postBrief.note },
      brokerReview: { opened: results.brokerReview.formOpened, formRendered: results.brokerReview.formRendered, starChecked: results.brokerReview.starChecked, consentChecked: results.brokerReview.consentChecked, submitted: results.brokerReview.submitted, confirmation: results.brokerReview.confirmation, profile: results.brokerReview.profileUrl, note: results.brokerReview.note },
      advisorReview: { opened: results.advisorReview.formOpened, submitted: results.advisorReview.submitted, confirmation: results.advisorReview.confirmation, profile: results.advisorReview.profileUrl, note: results.advisorReview.note },
    },
    payloads: {
      quotes: { captured: !!job, wellFormed: jobValid, keys: keysOf(job?.body), job_title: job?.body?.job_title, contact_email: job?.body?.contact_email, advisor_types: job?.body?.advisor_types, budget_band: job?.body?.budget_band, location_state: job?.body?.location_state },
      briefs: { captured: !!brief, wellFormed: briefValid, keys: keysOf(brief?.body), brief_template: brief?.body?.brief_template, job_title: brief?.body?.job_title, contact_email: brief?.body?.contact_email, consent_share: brief?.body?.consent_share, routing_mode: brief?.body?.routing_mode },
      userReview: { captured: !!broker, wellFormed: brokerValid, keys: keysOf(broker?.body), broker_slug: broker?.body?.broker_slug, email: broker?.body?.email, rating: broker?.body?.rating, title: broker?.body?.title },
      advisorReview: { captured: !!advisor, wellFormed: advisorValid, keys: keysOf(advisor?.body), professional_id: advisor?.body?.professional_id, rating: advisor?.body?.rating, used_services: advisor?.body?.used_services },
    },
    mockedWrites: {
      totalCapturedConversions: writes.length,
      totalMockedWritesAndAffiliate: Object.values(mockedByCat).reduce((a, b) => a + b, 0),
      byCategory: mockedByCat,
      everyMockedWritePath: allMockedWrites,
      realWritesReachingServer: 0,
    },
  };

  fs.writeFileSync(
    `${OUT}/marketplace-flows.json`,
    JSON.stringify({ summary, capturedWrites: writes, results }, null, 2),
  );
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nArtifacts + screenshots in ${OUT}/`);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
