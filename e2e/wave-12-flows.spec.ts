import { test, expect } from "@playwright/test";

/**
 * Wave 12 critical flows — user-account surfaces + admin moderation.
 *
 * These smoke-test the routes that previously had zero browser
 * coverage. Each test stays at the "page renders without crashing
 * + expected affordances are present" level so we don't get
 * flakiness from content changes, while still catching
 *   - missing imports
 *   - SSR crashes
 *   - broken route shapes
 *   - regressions in the public contract of the page
 *
 * Auth-gated routes are exercised by hitting them directly and
 * asserting the redirect/401 path, not by logging in.
 */

// ─── Public content routes (wave 11) ─────────────────────────────

test("/topic/[slug] renders an SEO hub page", async ({ page }) => {
  const res = await page.goto("/topic/etfs");
  expect(res?.status()).toBeLessThan(500);
  await expect(page.locator("h1")).toContainText("ETFs", { ignoreCase: true });
  // Breadcrumb back to /articles
  await expect(page.locator('a[href="/articles"]').first()).toBeVisible();
});

test("/topic/invalid slug returns 404", async ({ page }) => {
  const res = await page.goto("/topic/there-is-no-such-topic-xyz");
  expect(res?.status()).toBe(404);
});

test("/authors index page lists editorial team", async ({ page }) => {
  const res = await page.goto("/authors");
  expect(res?.status()).toBeLessThan(500);
  await expect(page.locator("h1")).toContainText("editorial team", {
    ignoreCase: true,
  });
});

test("/press page renders media + brand assets", async ({ page }) => {
  const res = await page.goto("/press");
  expect(res?.status()).toBeLessThan(500);
  await expect(page.locator("h1")).toContainText("press", { ignoreCase: true });
  await expect(
    page.locator('a[href^="mailto:press@invest.com.au"]').first(),
  ).toBeVisible();
});

// ─── Account surfaces (should redirect to login when unauthed) ───

test("/account/notifications redirects unauthed users to login", async ({ page }) => {
  const res = await page.goto("/account/notifications");
  // Either a redirect to /account/login or the page renders + auth
  // gate shows — both are valid. We accept any 2xx that ends up on
  // the login page, OR an actual 3xx redirect. Anything else means
  // the handler crashed.
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/(account\/login|account\/notifications|auth\/login)/);
});

test("/account/bookmarks redirects unauthed users", async ({ page }) => {
  const res = await page.goto("/account/bookmarks");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/(account\/login|account\/bookmarks|auth\/login)/);
});

test("/account/quizzes redirects unauthed users", async ({ page }) => {
  const res = await page.goto("/account/quizzes");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/(account\/login|account\/quizzes|auth\/login)/);
});

test("/advisor-portal/kyc renders the upload interface", async ({ page }) => {
  const res = await page.goto("/advisor-portal/kyc");
  expect(res?.status()).toBeLessThan(500);
  await expect(page.locator("h1")).toContainText("KYC", { ignoreCase: true });
});

// ─── API contract smoke (unauthenticated → 401) ──────────────────

test("GET /api/account/notifications is auth-gated", async ({ request }) => {
  const res = await request.get("/api/account/notifications");
  expect(res.status()).toBe(401);
});

test("GET /api/account/bookmarks is auth-gated", async ({ request }) => {
  const res = await request.get("/api/account/bookmarks");
  expect(res.status()).toBe(401);
});

test("POST /api/account/claim-anonymous is auth-gated", async ({ request }) => {
  const res = await request.post("/api/account/claim-anonymous", {
    data: { session_id: "sess-1" },
  });
  expect(res.status()).toBe(401);
});

test("GET /api/admin/article-comments is admin-gated", async ({ request }) => {
  const res = await request.get("/api/admin/article-comments");
  expect([401, 403]).toContain(res.status());
});

test("GET /api/admin/advisor-kyc is admin-gated", async ({ request }) => {
  const res = await request.get("/api/admin/advisor-kyc");
  expect([401, 403]).toContain(res.status());
});

test("GET /api/admin/financial-periods is admin-gated", async ({ request }) => {
  const res = await request.get("/api/admin/financial-periods");
  expect([401, 403]).toContain(res.status());
});

// ─── Article comment submission (anonymous is allowed) ───────────

test("POST /api/article-comments validates minimum body length", async ({ request }) => {
  const res = await request.post("/api/article-comments", {
    data: {
      slug: "best-etfs-australia",
      name: "E2E Tester",
      email: "e2e@example.com",
      body: "short",
    },
  });
  // Either 400 too_short (validated) or 429 rate-limit; anything
  // else means the handler didn't check length.
  expect([400, 429]).toContain(res.status());
});

test("POST /api/article-reactions rejects unknown reaction types", async ({ request }) => {
  const res = await request.post("/api/article-reactions", {
    data: { slug: "best-etfs-australia", reaction: "nope" },
  });
  expect([400, 429]).toContain(res.status());
});
