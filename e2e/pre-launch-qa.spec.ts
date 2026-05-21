import { test, expect } from "@playwright/test";

/**
 * CO-05: Pre-launch QA automation suite.
 *
 * Run against the production Vercel deployment BEFORE DNS cutover
 * (E2E_BASE_URL=https://invest-com-au.vercel.app) to verify the app
 * is ready, then AGAIN after cutover (E2E_BASE_URL=https://invest.com.au)
 * to verify the live domain is fully operational.
 *
 * Usage:
 *   E2E_BASE_URL=https://invest-com-au.vercel.app E2E_SKIP_WEBSERVER=1 npx playwright test e2e/pre-launch-qa.spec.ts
 *   E2E_BASE_URL=https://invest.com.au E2E_SKIP_WEBSERVER=1 npx playwright test e2e/pre-launch-qa.spec.ts
 */

// ─── Core public pages ────────────────────────────────────────────────────────

const CRITICAL_PAGES = [
  "/",
  "/compare",
  "/get-matched",
  "/advisors",
  "/invest",
  "/super",
  "/savings",
  "/etfs",
  "/articles",
  "/about",
  "/privacy",
  "/terms",
  "/how-we-earn",
  "/sitemap.xml",
  "/robots.txt",
];

for (const path of CRITICAL_PAGES) {
  test(`${path} is reachable (2xx)`, async ({ page }) => {
    const response = await page.goto(path);
    expect(
      response?.status(),
      `${path} returned ${response?.status()} — expected 2xx`,
    ).toBeLessThan(400);
  });
}

// ─── Redirect coverage (key entries from next.config.ts) ─────────────────────

const REDIRECTS: [string, string][] = [
  ["/brokers", "/compare"],
  ["/quiz", "/get-matched"],
  ["/learn", "/articles"],
  ["/investments", "/invest"],
  ["/discover", "/invest"],
  ["/super-funds", "/super"],
  ["/savings-accounts", "/savings"],
  ["/course", "/courses/investing-101"],
  ["/grants", "/startup/grants"],
  ["/quotes/post", "/briefs/new"],
  ["/invest/forex", "/cfd"],
  ["/invest/managed-funds", "/invest/funds"],
  ["/invest/dividend-investing", "/dividends"],
  ["/invest/ipos", "/invest/ipo-calendar"],
  ["/start", "/get-matched"],
];

for (const [from, to] of REDIRECTS) {
  test(`redirect ${from} → ${to}`, async ({ page }) => {
    const response = await page.goto(from, { waitUntil: "commit" });
    // After following redirects, the final URL should contain the destination
    const finalUrl = page.url();
    expect(
      finalUrl,
      `Expected redirect from ${from} to land on ${to}, but landed on ${finalUrl}`,
    ).toContain(to);
    // Status of the final page (after redirect) should be 2xx
    expect(response?.status() ?? 200).toBeLessThan(400);
  });
}

// ─── Sitemap ──────────────────────────────────────────────────────────────────

test("sitemap.xml is valid XML and contains homepage URL", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain("<?xml");
  expect(body).toContain("<urlset");
  // Must reference the canonical domain — invest.com.au not the Vercel alias
  expect(body).toContain("invest.com.au");
  // Homepage entry with priority 1.0
  expect(body).toContain("<loc>https://invest.com.au</loc>");
});

test("sitemap.xml contains /compare (high priority)", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  const body = await response.text();
  expect(body).toContain("invest.com.au/compare");
});

// ─── robots.txt ───────────────────────────────────────────────────────────────

test("robots.txt references canonical sitemap URL", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const body = await response.text();
  // Sitemap line must use the canonical domain (not the Vercel alias)
  expect(body).toContain("Sitemap: https://invest.com.au/sitemap.xml");
  // /account/* should be blocked
  expect(body).toContain("/account");
});

// ─── Security headers ─────────────────────────────────────────────────────────

test("homepage has HSTS header", async ({ request }) => {
  const response = await request.get("/");
  const hsts = response.headers()["strict-transport-security"];
  expect(hsts, "HSTS header missing").toBeTruthy();
  expect(hsts).toContain("max-age=");
  expect(hsts).toContain("includeSubDomains");
});

test("homepage has X-Content-Type-Options: nosniff", async ({ request }) => {
  const response = await request.get("/");
  const xcto = response.headers()["x-content-type-options"];
  expect(xcto, "X-Content-Type-Options header missing").toBe("nosniff");
});

test("homepage has Referrer-Policy header", async ({ request }) => {
  const response = await request.get("/");
  const rp = response.headers()["referrer-policy"];
  expect(rp, "Referrer-Policy header missing").toBeTruthy();
});

// ─── No founder PII in page source ───────────────────────────────────────────
// Lightweight version of the CL-09 gate — catches regressions on the
// most-likely-to-be-indexed pages without the full grep scan.

const PII_PATTERNS = [/finn@invest\.com\.au/i, /finnduns@gmail\.com/i, /Finn Webster/i];

const INDEXED_PAGES = ["/", "/compare", "/about", "/advisors"];

for (const path of INDEXED_PAGES) {
  test(`${path} HTML does not expose founder PII`, async ({ page }) => {
    await page.goto(path);
    const content = await page.content();
    for (const pattern of PII_PATTERNS) {
      expect(content, `Found ${pattern} in ${path} HTML`).not.toMatch(pattern);
    }
  });
}

// ─── Key flows render correctly ───────────────────────────────────────────────

test("homepage renders a nav and main landmark", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("nav").first()).toBeVisible();
  await expect(page.locator("main, [role='main']").first()).toBeVisible();
});

test("/compare renders a comparison table or card grid", async ({ page }) => {
  await page.goto("/compare");
  const content = page.locator("table, article, [data-test='broker-card']").first();
  await expect(content).toBeVisible();
});

test("/get-matched renders a quiz step", async ({ page }) => {
  await page.goto("/get-matched");
  // Any visible question or step indicator
  const step = page.locator("button, [role='radio'], form").first();
  await expect(step).toBeVisible();
});

test("/advisors renders an advisor card or list", async ({ page }) => {
  await page.goto("/advisors");
  // Card list or empty state — both are valid
  const rendered = page.locator("article, [data-test='advisor-card'], main").first();
  await expect(rendered).toBeVisible();
});

// ─── 404 handling ─────────────────────────────────────────────────────────────

test("unknown path returns 404 (not 500)", async ({ page }) => {
  const response = await page.goto("/this-page-definitely-does-not-exist-co05-qa");
  // Should be 404, not 500
  expect(response?.status()).toBe(404);
  // Should still render a page (not a blank error)
  await expect(page.locator("body")).toBeVisible();
});

// ─── Canonical base URL check ─────────────────────────────────────────────────
// Ensures NEXT_PUBLIC_SITE_URL is set to invest.com.au in the production
// environment, not the Vercel alias. Check via the sitemap which uses the env var.

test("canonical base URL in sitemap is invest.com.au (not Vercel alias)", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  const body = await response.text();
  // Must NOT contain the Vercel preview alias as a canonical URL
  const vercelAlias = "invest-com-au.vercel.app";
  expect(body, `Sitemap contains Vercel alias ${vercelAlias} — set NEXT_PUBLIC_SITE_URL in Vercel env`).not.toContain(vercelAlias);
});
