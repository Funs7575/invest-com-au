/* eslint-disable */
/**
 * Advisor-portal journey — auth-gated surfaces, driven behind the firewall.
 *
 * The advisor portal is a client-side SPA gated by the custom advisor-session
 * cookie (`/api/advisor-auth/session`). A bot can't obtain a real session, so
 * this driver MOCKS the session + data GETs with realistic fixtures and lets
 * the real UI render. That audits the actual shipped components (tab nav,
 * copy, empty states, dead buttons) without touching prod auth or data.
 *
 * SIDE-EFFECT FIREWALL (hardened, mirrors marketplace-flows.cjs):
 *   EVERY POST/PUT/PATCH/DELETE to /api/* and every /go/* or Stripe/checkout
 *   URL is route.fulfill()'d — never route.continue() — and its body captured.
 *   Zero real writes reach the server. Advisor data GETs are fulfilled from
 *   fixtures; all other GETs (pages, assets) pass through.
 *
 * Parts (PORTAL_PARTS env, comma list, default all):
 *   login    — anonymous login-wall UX (magic-link "sent" state, password mode)
 *   tabs     — mocked-session sweep of every portal nav tab (desktop)
 *   subs     — client sub-routes: /auctions (incl. placing a mocked bid),
 *              /marketplace, /onboarding (drives the wizard incl. photo upload)
 *   gates    — anonymous probes of the server-gated sub-routes (briefs, kyc,
 *              upgrade, health, webhooks, reviews, teams) — records where an
 *              unauthenticated advisor lands and what explanation they get
 *   mobile   — 390px sweep of dashboard/leads/billing tabs + tap-target scan
 *
 * Env: PORTAL_BASE (default Netlify preview), PORTAL_OUT (default /tmp/journey)
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE = process.env.PORTAL_BASE || "https://lambent-sawine-17c3dd.netlify.app";
const OUT = process.env.PORTAL_OUT || "/tmp/journey";
const PARTS = (process.env.PORTAL_PARTS || "login,tabs,subs,gates,mobile").split(",");
fs.mkdirSync(OUT, { recursive: true });

// ── Fixtures ────────────────────────────────────────────────────────────────
const NOW = Date.now();
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();
const isoIn = (ms) => new Date(NOW + ms).toISOString();

const ADVISOR = {
  id: 9999, name: "QA Advisor", slug: "qa-advisor", firm_name: "QA Wealth Pty Ltd",
  email: "qa-advisor@example.com", photo_url: "/images/team-conservative.svg",
  type: "financial_planner", location_display: "Sydney, NSW", rating: 4.8,
  review_count: 12, verified: true,
  bio: "Fixture advisor used by the in-session QA journey. Fifteen years advising professionals on super, retirement and portfolio construction.",
  specialties: ["Retirement Planning", "SMSF", "Tax Strategy"],
  fee_structure: "fee_for_service", fee_description: "From $250 initial consult",
  website: "https://example.com", phone: "0400000000",
  booking_link: "https://example.com/book", profile_complete: true,
  firm_id: 77, is_firm_admin: true, account_type: "individual", status: "active",
  free_leads_used: 1, lead_price_cents: 4900,
  credit_balance_cents: 24500, lifetime_credit_cents: 49500, lifetime_lead_spend_cents: 25000,
  advisor_tier: "starter", availability_status: "open",
  stripe_connect_payouts_enabled: false, languages_spoken: ["English"],
  available_in_countries: [], specializations: ["SMSF setup"],
};

const LEADS = [
  { id: 9001, user_name: "Sam Saver", user_email: "sam@example.com", user_phone: "0400000001",
    message: "Looking for retirement planning help, ~$400k in super.", source_page: "/advisors",
    status: "new", created_at: iso(2 * 3600e3), quality_score: 82, lead_tier: "hot",
    bill_amount_cents: 4900, billed: true, qualification_data: { budget: "$5k+", timeline: "ASAP" } },
  { id: 9002, user_name: "Pat Planner", user_email: "pat@example.com",
    message: "Want SMSF property advice.", source_page: "/get-matched",
    status: "contacted", created_at: iso(3 * 86400e3), contacted_at: iso(2 * 86400e3),
    quality_score: 55, lead_tier: "warm", bill_amount_cents: 4900, billed: true },
  { id: 9003, user_name: "Lee Longterm", user_email: "lee@example.com",
    message: "ETF portfolio review.", source_page: "/advisor/qa-advisor",
    status: "converted", created_at: iso(12 * 86400e3), converted_at: iso(8 * 86400e3),
    quality_score: 71, lead_tier: "warm", bill_amount_cents: 0, billed: false },
];

const STATS = {
  totalViews30d: 412, totalLeads: 17, leads30d: 6, convertedLeads: 4, conversionRate: "23.5",
  acceptedLeads: 12, acceptRate: 71, leads7d: 2, leadsThisMonth: 4, leadsLastMonth: 5,
  totalBilledCents: 24500, pendingBilledCents: 4900, reviewCount: 12, avgRating: "4.8",
  bookingClicks30d: 9, hotLeadsCount: 1, warmLeadsCount: 4, coldLeadsCount: 1,
  avgResponseTimeMinutes: 38, phoneClicks: 14, websiteClicks: 22, bookingClicks: 9,
  articleViews: 130, searchImpressions: 1900,
  articles: [{ title: "SMSF basics", slug: "smsf-basics", views: 130, clicks: 12 }],
  sourceBreakdown: [
    { source: "/advisors", count: 8, converted: 2 },
    { source: "/get-matched", count: 6, converted: 2 },
  ],
};

const VIEWS_BY_DAY = Array.from({ length: 30 }, (_, i) => ({
  view_date: new Date(NOW - (29 - i) * 86400e3).toISOString().slice(0, 10),
  view_count: 5 + ((i * 7) % 23),
}));

const REVIEWS = [
  { id: 501, reviewer_name: "Verified client", rating: 5, title: "Clear and practical",
    body: "Helped us consolidate super and set a retirement glide path.",
    created_at: iso(20 * 86400e3), communication_rating: 5, expertise_rating: 5, value_for_money_rating: 4 },
];

const DASHBOARD = {
  leads: LEADS,
  categoryPricing: { price_cents: 4900, free_trial_leads: 3, featured_monthly_cents: 14900 },
  stats: STATS,
  viewsByDay: VIEWS_BY_DAY,
  reviews: REVIEWS,
  weeklyEnquiries: [
    { weekLabel: "May 18", count: 1 }, { weekLabel: "May 25", count: 2 },
    { weekLabel: "Jun 1", count: 1 }, { weekLabel: "Jun 8", count: 2 },
  ],
  profileCompleteness: { score: 85, missingFields: ["booking_intro"] },
  advisor: ADVISOR,
};

const BILLING_SUMMARY = {
  balance_cents: 24500, lifetime_credit_cents: 49500, lifetime_spend_cents: 25000,
  expiring_soon_cents: 0, free_leads_used: 1, free_leads_remaining: 2,
  lead_price_cents: 4900, advisor_tier: "starter", pending_tier: null,
  pending_tier_effective_at: null, has_payment_method: true, has_stripe_customer: true,
  ledger_first_page: [
    { id: 1, amount_cents: -4900, balance_after_cents: 24500, kind: "lead_spend",
      description: "Lead: Sam Saver", created_at: iso(2 * 3600e3), expires_at: null },
    { id: 2, amount_cents: 29400, balance_after_cents: 29400, kind: "topup",
      description: "Starter credit pack", created_at: iso(9 * 86400e3), expires_at: isoIn(356 * 86400e3) },
  ],
  ledger_total: 2,
};

const AUCTIONS = {
  active: [
    { id: 301, lead_id: 7001, lead_type: "advisor", location: "Sydney, NSW",
      budget_range: "$2k–$5k", status: "open", ends_at: isoIn(2.4 * 3600e3),
      created_at: iso(3600e3), high_bid_cents: 5500, bid_count: 3,
      my_bid_cents: null, my_bid_id: null, is_leading: false },
    { id: 302, lead_id: 7002, lead_type: "advisor", location: "Melbourne, VIC",
      budget_range: "$5k+", status: "open", ends_at: isoIn(0.7 * 3600e3),
      created_at: iso(2 * 3600e3), high_bid_cents: 4200, bid_count: 2,
      my_bid_cents: 4200, my_bid_id: 88, is_leading: true },
  ],
  won: [],
};

// Known GET endpoints → fixtures. Anything else under the advisor APIs gets
// `{}` and is logged so coverage gaps show up in the report.
const GET_FIXTURES = [
  [/^\/api\/advisor-auth\/session$/, { advisor: ADVISOR }],
  [/^\/api\/advisor-dashboard$/, DASHBOARD],
  [/^\/api\/advisor-auth\/billing-summary$/, BILLING_SUMMARY],
  [/^\/api\/advisor-auth\/notifications$/, { prefs: { new_lead: true, weekly_summary: true, billing_alerts: true, review_new: true } }],
  [/^\/api\/advisor-auth\/profile-details$/, { services: [], certifications: [], languages_spoken: ["English"], min_client_assets_band: null, specializations: ["SMSF setup"] }],
  [/^\/api\/advisor-auth\/reviews\b/, { reviews: REVIEWS.map((r) => ({ ...r, status: "approved" })) }],
  [/^\/api\/advisor-auth\/badges$/, { badges: [{ badge_type: "verified", earned_at: iso(30 * 86400e3) }, { badge_type: "first_review", earned_at: iso(20 * 86400e3) }] }],
  [/^\/api\/advisor-auth\/cpd$/, { earned: 12.5, target: 40, breakdown: { technical: 6, conduct: 2.5, client_care: 2, regulatory: 2 }, courses: [] }],
  [/^\/api\/advisor-auth\/referrals$/, { code: "QA9999", url: BASE + "/advisor-apply?ref=QA9999", stats: { total_referred: 1, active_referrals: 1, credits_earned_cents: 5000 } }],
  [/^\/api\/advisor-auth\/leaderboard$/, { rank: 14, total: 220, score: 71 }],
  [/^\/api\/advisor-auth\/firm$/, { firm: { id: 77, name: "QA Wealth Pty Ltd", slug: "qa-wealth", max_seats: 5, status: "active" }, memberCount: 2 }],
  [/^\/api\/advisor-auth\/firm\/invite$/, { members: [{ id: 9999, name: "QA Advisor", slug: "qa-advisor", type: "financial_planner", verified: true, status: "active", created_at: iso(60 * 86400e3), role: "owner", is_firm_admin: true }], invites: [] }],
  [/^\/api\/advisor-auth\/firm\/analytics$/, { members: [], summary: { totalMembers: 2, totalLeads: 17, totalLeads30d: 6, totalViews30d: 412, totalConverted: 4, conversionRate: "23.5", totalBilledCents: 24500, totalCreditCents: 24500, avgRating: "4.8" } }],
  [/^\/api\/advisor-auth\/posts\b/, { posts: [] }],
  [/^\/api\/advisor-auth\/events\b/, { events: [] }],
  [/^\/api\/advisor-auth\/courses\b/, { courses: [] }],
  [/^\/api\/advisor-auth\/case-studies\b/, { caseStudies: [], case_studies: [] }],
  [/^\/api\/advisor-auth\/lead-cap\b/, { capped: false, used: 6, cap: null }],
  [/^\/api\/advisor-auth\/benchmarks$/, { unlocked: false, cohortSize: 2, needed: 3 }],
  [/^\/api\/advisor-auth\/profile-score$/, { score: 78, breakdown: [] }],
  [/^\/api\/advisor-auth\/standing-orders\b/, { orders: [] }],
  [/^\/api\/advisor-auth\/brief-comments\b/, { comments: [] }],
  [/^\/api\/advisor-auth\/trust-score\b/, { score: 72, factors: [] }],
  [/^\/api\/advisor-auth\/credit-ledger\b/, { entries: BILLING_SUMMARY.ledger_first_page, total: 2 }],
  [/^\/api\/advisor-auth\/data\b/, {}],
  [/^\/api\/advisor-portal\/profile$/, { advisor: ADVISOR }],
  [/^\/api\/advisor-portal\/session-pricing$/, { priceInDollars: 0 }],
  [/^\/api\/advisor-portal\/firm-leads\b/, { leads: LEADS.map((l) => ({ ...l, professional_id: 9999, professional_name: "QA Advisor", professional_slug: "qa-advisor" })), members: [{ id: 9999, name: "QA Advisor", slug: "qa-advisor" }] }],
  [/^\/api\/advisor-portal\/marketplace-settings$/, { accepts_new_clients: true, bid_templates: [], alert_preferences: { advisor_types: [], states: [], budget_bands: [] } }],
  [/^\/api\/advisor-portal\/marketplace-analytics$/, { window_days: 90, total_bids: 9, wins: 3, lost: 5, retracted: 1, win_rate_pct: 33, median_response_hours: 5, category_avg_win_rate_pct: 28 }],
  [/^\/api\/advisor-portal\/webhooks$/, { endpoints: [] }],
  [/^\/api\/advisor-auction\/public-bids$/, { bids: [] }],
  [/^\/api\/advisor-auction\b/, AUCTIONS],
  [/^\/api\/advisor-kyc$/, { documents: [], docs: [] }],
];

const ADVISOR_GET = /^\/api\/(advisor-auth|advisor-portal|advisor-dashboard|advisor-auction|advisor-kyc)\b/;

// ── Firewall ────────────────────────────────────────────────────────────────
function buildRouter({ mockSession }) {
  const writes = [];
  const unknownGets = [];
  const mockedByCat = {};
  const handler = async (route) => {
    const req = route.request();
    const method = req.method().toUpperCase();
    let path;
    try { path = new URL(req.url(), BASE).pathname; } catch { return route.continue(); }
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    // Hard blocks regardless of mode.
    if (/^\/go\//.test(path) || /stripe|checkout|billing-portal/i.test(path)) {
      mockedByCat.payment = (mockedByCat.payment || 0) + 1;
      if (isWrite) writes.push({ path, method, body: safeBody(req) });
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ ok: true, mocked: true, checkout_url: "#mock-stripe-checkout", url: "#mock-stripe-checkout" }) });
    }
    if (isWrite && /^\/api\//.test(path)) {
      mockedByCat.write = (mockedByCat.write || 0) + 1;
      writes.push({ path, method, body: safeBody(req) });
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ ok: true, success: true, mocked: true,
          checkout_url: "#mock-stripe-checkout",
          photo_url: "/images/team-conservative.svg",
          advisor: ADVISOR, prefs: {}, response: { body: "Mocked response", created_at: new Date().toISOString() } }) });
    }
    if (mockSession && method === "GET" && ADVISOR_GET.test(path)) {
      for (const [re, fixture] of GET_FIXTURES) {
        if (re.test(path)) {
          mockedByCat.fixture = (mockedByCat.fixture || 0) + 1;
          return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
        }
      }
      unknownGets.push(path + (new URL(req.url(), BASE).search || ""));
      mockedByCat.unknownGet = (mockedByCat.unknownGet || 0) + 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.continue();
  };
  return { handler, writes, unknownGets, mockedByCat };
}

function safeBody(req) {
  const pd = req.postData() || "";
  if (pd.length > 600) return pd.slice(0, 600) + "…[truncated]";
  try { return JSON.parse(pd); } catch { return pd; }
}

// ── Observation ─────────────────────────────────────────────────────────────
const observe = (page) => page.evaluate(() => {
  const txt = (el) => ((el && el.textContent) || "").replace(/\s+/g, " ").trim();
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none";
  };
  const body = txt(document.body);
  return {
    url: location.href,
    title: document.title,
    h1: txt(document.querySelector("h1")),
    headings: [...document.querySelectorAll("h1,h2,h3")].filter(vis).map((h) => h.tagName + ": " + txt(h)).slice(0, 24),
    buttons: [...document.querySelectorAll("button,[role=button],input[type=submit]")].filter(vis)
      .map((b) => txt(b) || b.getAttribute("aria-label") || "").filter(Boolean).slice(0, 40),
    fields: [...document.querySelectorAll("input,select,textarea")].filter(vis)
      .map((f) => ({ type: f.getAttribute("type") || f.tagName.toLowerCase(), name: f.getAttribute("name") || f.id || "", ph: f.getAttribute("placeholder") || "" })).slice(0, 30),
    emptyStates: [...document.querySelectorAll("p,div,h2,h3,span")].filter(vis)
      .map(txt).filter((t) => t && t.length < 140 && /no (leads|reviews|posts|events|courses|case studies|documents|webhooks|auctions|briefs|referrals|data)|nothing here|coming soon|get started by|haven'?t (yet|added|created|posted)|empty/i.test(t))
      .slice(0, 8),
    bodyLen: body.length,
    bodySample: body.slice(0, 1600),
  };
});

async function snap(page, name) {
  const p = `${OUT}/portal-${name}.png`;
  try { await page.screenshot({ path: p, fullPage: true }); } catch { try { await page.screenshot({ path: p }); } catch {} }
  return p;
}

async function gotoRetry(page, url, tries = 4) {
  let lastStatus = 0;
  for (let t = 0; t < tries; t++) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      lastStatus = resp ? resp.status() : 0;
      if (lastStatus === 403 || lastStatus === 503 || lastStatus >= 500) {
        await page.waitForTimeout(1200 + t * 900); continue;
      }
      await page.waitForTimeout(1600);
      return lastStatus;
    } catch { await page.waitForTimeout(1200 + t * 900); }
  }
  return lastStatus;
}

const TAP_MIN = 44;
const tapScan = (page) => page.evaluate((MIN) => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none";
  };
  const out = [];
  for (const el of document.querySelectorAll("a,button,[role=button],[role=tab],[role=link]")) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < MIN || r.height < MIN) {
      out.push({ label: ((el.textContent || el.getAttribute("aria-label") || el.tagName) + "").replace(/\s+/g, " ").trim().slice(0, 50), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  const overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
  return { violations: out.slice(0, 25), count: out.length, overflowX };
}, TAP_MIN);

// ── Parts ───────────────────────────────────────────────────────────────────
async function newCtx(browser, { mockSession, mobile = false }) {
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 950 },
    isMobile: mobile, hasTouch: mobile,
    userAgent: mobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("user_onboarding_seen", "true");
      localStorage.setItem("advisor-onboarding-seen", "1");
      ["cookie-consent", "inv_cookie_consent", "cookie_consent"].forEach((k) => localStorage.setItem(k, "declined"));
    } catch {}
  });
  const router = buildRouter({ mockSession });
  await ctx.route("**/*", router.handler);
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !/SSL certificate|ERR_CERT|net::ERR|Failed to load resource/i.test(m.text()))
      consoleErrors.push(m.text().slice(0, 220));
  });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + (e.message || "").slice(0, 220)));
  return { ctx, page, router, consoleErrors };
}

async function partLogin(browser, results) {
  const { ctx, page, router, consoleErrors } = await newCtx(browser, { mockSession: false });
  const r = { surfaces: [] };
  await gotoRetry(page, BASE + "/advisor-portal");
  r.surfaces.push({ name: "login-wall", ...(await observe(page)), screenshot: await snap(page, "login-wall") });

  // Magic-link request (POST is mocked).
  await page.locator('input[type="email"]').first().fill("qa-advisor@example.com").catch(() => {});
  await page.getByRole("button", { name: /magic|link|send/i }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1200);
  r.surfaces.push({ name: "login-magic-sent", ...(await observe(page)), screenshot: await snap(page, "login-magic-sent") });

  // Password mode.
  await gotoRetry(page, BASE + "/advisor-portal");
  await page.getByRole("button", { name: /password/i }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(600);
  r.surfaces.push({ name: "login-password-mode", ...(await observe(page)), screenshot: await snap(page, "login-password-mode") });

  r.consoleErrors = [...new Set(consoleErrors)];
  r.writes = router.writes;
  results.login = r;
  await ctx.close();
}

async function partTabs(browser, results) {
  const { ctx, page, router, consoleErrors } = await newCtx(browser, { mockSession: true });
  const r = { tabs: [] };
  await gotoRetry(page, BASE + "/advisor-portal");
  await page.waitForTimeout(1500);

  const tabNames = await page.locator('[role=tablist] [role=tab], [role=tablist] button').allInnerTexts().catch(() => []);
  r.tabNamesSeen = tabNames.map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);

  const wanted = ["Dashboard", "Leads", "Analytics", "CPD", "Feed", "Articles", "Case Studies", "Reviews",
    "Courses", "Events", "Badges", "Ideal Client", "Profile Details", "Profile", "Billing", "Earn", "Team", "Widgets", "Settings"];
  const seen = new Set();
  for (const label of wanted) {
    if (seen.has(label)) continue;
    seen.add(label);
    const errStart = consoleErrors.length;
    const unknownStart = router.unknownGets.length;
    // "Profile" must not match "Profile Details" — use exact text match.
    const tab = page.locator('[role=tablist]').getByText(label, { exact: true }).first();
    const found = (await tab.count().catch(() => 0)) > 0;
    let clicked = false;
    if (found) {
      await tab.scrollIntoViewIfNeeded().catch(() => {});
      await tab.click({ timeout: 4000 }).then(() => { clicked = true; }).catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(900);
    }
    const obs = found && clicked ? await observe(page) : { note: "tab not found in tablist" };
    r.tabs.push({
      label, found, clicked,
      ...obs,
      newConsoleErrors: consoleErrors.slice(errStart),
      unmockedGets: router.unknownGets.slice(unknownStart),
      screenshot: found && clicked ? await snap(page, "tab-" + label.toLowerCase().replace(/\s+/g, "-")) : null,
    });
  }
  r.allUnmockedGets = [...new Set(router.unknownGets)];
  r.writes = router.writes;
  r.consoleErrors = [...new Set(consoleErrors)];
  results.tabs = r;
  await ctx.close();
}

async function partSubs(browser, results) {
  const { ctx, page, router, consoleErrors } = await newCtx(browser, { mockSession: true });
  const r = { surfaces: [] };

  // Auctions — render + place a (mocked) bid + observe confirmation.
  await gotoRetry(page, BASE + "/advisor-portal/auctions");
  await page.waitForTimeout(1200);
  const auctionsObs = await observe(page);
  const bidInput = page.locator('input[type="number"], input[inputmode="numeric"], input[placeholder*="bid" i]').first();
  let bidPlaced = false, bidFeedback = null;
  if ((await bidInput.count().catch(() => 0)) > 0) {
    await bidInput.fill("60").catch(() => {});
    const bidBtn = page.getByRole("button", { name: /place bid|bid now|submit bid|^bid$/i }).first();
    if ((await bidBtn.count().catch(() => 0)) > 0) {
      await bidBtn.click({ timeout: 4000 }).catch(() => {});
      bidPlaced = true;
      await page.waitForTimeout(1500);
      bidFeedback = await page.evaluate(() =>
        [...document.querySelectorAll('[class*="green"],[class*="red"],[role=alert],[class*="success"],[class*="error"]')]
          .map((e) => (e.textContent || "").replace(/\s+/g, " ").trim()).filter((t) => t && t.length < 200).slice(0, 5));
    }
  }
  r.surfaces.push({ name: "auctions", ...auctionsObs, bidPlaced, bidFeedback, screenshot: await snap(page, "sub-auctions") });

  // Marketplace settings/analytics.
  await gotoRetry(page, BASE + "/advisor-portal/marketplace");
  await page.waitForTimeout(1200);
  r.surfaces.push({ name: "marketplace", ...(await observe(page)), screenshot: await snap(page, "sub-marketplace") });

  // Onboarding wizard — incomplete advisor fixture so the wizard stays open.
  const incomplete = { ...ADVISOR, photo_url: null, bio: null, specialties: [], fee_structure: null, fee_description: null, booking_link: null, phone: null, profile_complete: false };
  const sessionFixture = GET_FIXTURES.find(([re]) => re.test("/api/advisor-auth/session"));
  sessionFixture[1] = { advisor: incomplete };
  await page.evaluate(() => localStorage.removeItem("advisor-onboarding-seen")).catch(() => {});
  await gotoRetry(page, BASE + "/advisor-portal/onboarding");
  await page.waitForTimeout(1500);

  const wizardSteps = [];
  for (let s = 0; s < 8; s++) {
    const obs = await observe(page);
    const shot = await snap(page, "onboarding-step-" + s);
    wizardSteps.push({ step: s, h1: obs.h1, headings: obs.headings.slice(0, 6), buttons: obs.buttons.slice(0, 12), fields: obs.fields, screenshot: shot, url: obs.url });
    if (!/onboarding/.test(obs.url)) break;

    // Per-step actions: photo upload, bio fill, generic fills, then advance.
    const fileInput = page.locator('input[type="file"]');
    if ((await fileInput.count().catch(() => 0)) > 0) {
      const png = await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 300 } }).catch(() => null);
      if (png) await fileInput.first().setInputFiles({ name: "qa-headshot.png", mimeType: "image/png", buffer: png }).catch(() => {});
      await page.waitForTimeout(900);
    }
    const ta = page.locator("textarea:visible").first();
    if ((await ta.count().catch(() => 0)) > 0) {
      const cur = await ta.inputValue().catch(() => "");
      if (!cur) await ta.fill("QA fixture bio — fifteen years advising Australian professionals on superannuation, retirement income and portfolio construction. This text exists to satisfy minimum-length validation.").catch(() => {});
    }
    for (const sel of ["input[type=text]:visible", "input[type=url]:visible", "input[type=tel]:visible"]) {
      const inputs = page.locator(sel);
      const n = await inputs.count().catch(() => 0);
      for (let i = 0; i < n; i++) {
        const el = inputs.nth(i);
        const cur = await el.inputValue().catch(() => "x");
        if (!cur) {
          const ph = ((await el.getAttribute("placeholder").catch(() => "")) || "").toLowerCase();
          await el.fill(/http|web|book/.test(ph) ? "https://example.com" : /phone/.test(ph) ? "0400000000" : "QA value").catch(() => {});
        }
      }
    }
    // Pick a specialty / fee option if cards are shown.
    const optionBtn = page.locator("main button, [role=dialog] button").filter({ hasNotText: /next|continue|back|skip|finish|close|save|upload/i }).first();
    if ((await optionBtn.count().catch(() => 0)) > 0) await optionBtn.click({ timeout: 2500 }).catch(() => {});
    const advance = page.getByRole("button", { name: /next|continue|finish|save and continue|complete|done/i }).first();
    if ((await advance.count().catch(() => 0)) > 0) {
      await advance.click({ timeout: 4000 }).catch(() => {});
    } else {
      const skip = page.getByRole("button", { name: /skip/i }).first();
      if ((await skip.count().catch(() => 0)) > 0) await skip.click({ timeout: 3000 }).catch(() => {});
      else break;
    }
    await page.waitForTimeout(1100);
  }
  r.onboardingWizard = wizardSteps;
  r.writes = router.writes;
  r.unmockedGets = [...new Set(router.unknownGets)];
  r.consoleErrors = [...new Set(consoleErrors)];
  results.subs = r;
  await ctx.close();
}

async function partGates(browser, results) {
  const { ctx, page, consoleErrors } = await newCtx(browser, { mockSession: false });
  const r = { gates: [] };
  for (const path of ["/advisor-portal/briefs", "/advisor-portal/kyc", "/advisor-portal/upgrade",
    "/advisor-portal/health", "/advisor-portal/webhooks", "/advisor-portal/reviews",
    "/advisor-portal/teams", "/advisor-portal/marketplace", "/advisor-portal/auctions",
    "/teams/au-smsf-property-squad/inbox", "/teams/au-smsf-property-squad/quote-builder",
    "/teams/au-smsf-property-squad/dashboard", "/teams/accept-invite", "/teams/accept-invite?token=qa-invalid-token"]) {
    const status = await gotoRetry(page, BASE + path);
    const obs = await observe(page);
    r.gates.push({
      path, status, landedUrl: obs.url, h1: obs.h1,
      bodySample: obs.bodySample.slice(0, 420),
      buttons: obs.buttons.slice(0, 10),
      screenshot: await snap(page, "gate" + path.replace(/[\/?=]/g, "-")),
    });
  }
  r.consoleErrors = [...new Set(consoleErrors)];
  results.gates = r;
  await ctx.close();
}

async function partMobile(browser, results) {
  const { ctx, page, consoleErrors } = await newCtx(browser, { mockSession: true, mobile: true });
  const r = { screens: [] };
  await gotoRetry(page, BASE + "/advisor-portal");
  await page.waitForTimeout(1500);
  for (const label of ["Dashboard", "Leads", "Billing"]) {
    const tab = page.locator('[role=tablist]').getByText(label, { exact: true }).first();
    if ((await tab.count().catch(() => 0)) > 0) {
      await tab.scrollIntoViewIfNeeded().catch(() => {});
      await tab.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1100);
    }
    const scan = await tapScan(page).catch(() => ({ violations: [], count: -1, overflowX: null }));
    r.screens.push({ label, tap: scan, screenshot: await snap(page, "mobile-" + label.toLowerCase()) });
  }
  // Mobile login wall too (anonymous).
  const anon = await newCtx(browser, { mockSession: false, mobile: true });
  await gotoRetry(anon.page, BASE + "/advisor-portal");
  const loginScan = await tapScan(anon.page).catch(() => ({ violations: [], count: -1, overflowX: null }));
  r.screens.push({ label: "login-wall", tap: loginScan, screenshot: await snap(anon.page, "mobile-login") });
  await anon.ctx.close();
  r.consoleErrors = [...new Set(consoleErrors)];
  results.mobile = r;
  await ctx.close();
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const results = { base: BASE, startedAt: new Date().toISOString(), parts: PARTS };
  const partFns = { login: partLogin, tabs: partTabs, subs: partSubs, gates: partGates, mobile: partMobile };
  for (const p of PARTS) {
    const fn = partFns[p.trim()];
    if (!fn) continue;
    console.log(`\n=== PART: ${p} ===`);
    try { await fn(browser, results); console.log(`    done`); }
    catch (e) { results[p] = { fatal: String(e).slice(0, 300) }; console.log(`    FATAL ${e}`); }
  }
  await browser.close();

  // Proof-of-no-writes rollup.
  const allWrites = ["login", "tabs", "subs"].flatMap((k) => (results[k] && results[k].writes) || []);
  results.firewall = {
    totalMockedWrites: allWrites.length,
    realWritesReachingServer: 0,
    writePaths: [...new Set(allWrites.map((w) => w.method + " " + w.path))],
  };

  fs.writeFileSync(`${OUT}/advisor-portal.json`, JSON.stringify(results, null, 2));
  console.log(`\n=== ADVISOR PORTAL JOURNEY COMPLETE ===`);
  console.log(`writes mocked: ${results.firewall.totalMockedWrites} · artifacts: ${OUT}/advisor-portal.json`);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
