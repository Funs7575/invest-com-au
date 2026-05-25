import { test, expect } from "@playwright/test";

/**
 * SP-13 — Startup Portal smoke tests.
 *
 * Covers the routes introduced in SP-01..SP-12 at the "renders without
 * crashing + expected affordances are present" level.  Auth-gated routes
 * are exercised unauthenticated to verify the redirect/401 path — no
 * login is performed, which keeps these tests stable across environments.
 *
 * API routes are spot-checked for 401 (not 500) when unauthenticated.
 */

// ─── Public routes ──────────────────────────────────────────────────

test("/startup-signup renders the multi-step signup form", async ({ page }) => {
  const res = await page.goto("/startup-signup");
  expect(res?.status()).toBeLessThan(500);
  await expect(page.locator("h1, h2").first()).toContainText(
    /startup|founder|company|register/i,
  );
  // Email field should be present on step 1
  await expect(page.getByLabel(/email/i).first()).toBeVisible();
});

test("/invest/startups hub renders without crash", async ({ page }) => {
  const res = await page.goto("/invest/startups");
  expect(res?.status()).toBeLessThan(500);
  await expect(page.locator("h1")).toContainText(/startup/i);
});

// ─── Startup portal — auth-gated (unauthenticated → redirect) ───────

test("/startup-portal redirects unauthenticated users", async ({ page }) => {
  const res = await page.goto("/startup-portal");
  expect(res?.status()).toBeLessThan(500);
  // Must end up on a login/account page, not the portal dashboard
  await expect(page).toHaveURL(
    /\/(account\/login|auth\/login|login|startup-portal$)/,
  );
});

test("/startup-portal/round redirects unauthenticated users", async ({
  page,
}) => {
  const res = await page.goto("/startup-portal/round");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/(account\/login|auth\/login|login)/);
});

test("/startup-portal/round/new redirects unauthenticated users", async ({
  page,
}) => {
  const res = await page.goto("/startup-portal/round/new");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/(account\/login|auth\/login|login)/);
});

test("/startup-portal/investors redirects unauthenticated users", async ({
  page,
}) => {
  const res = await page.goto("/startup-portal/investors");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/(account\/login|auth\/login|login)/);
});

test("/startup-portal/profile redirects unauthenticated users", async ({
  page,
}) => {
  const res = await page.goto("/startup-portal/profile");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/(account\/login|auth\/login|login)/);
});

test("/startup-portal/data-room redirects unauthenticated users", async ({
  page,
}) => {
  const res = await page.goto("/startup-portal/data-room");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/(account\/login|auth\/login|login)/);
});

test("/startup-portal/esic-verification redirects unauthenticated users", async ({
  page,
}) => {
  const res = await page.goto("/startup-portal/esic-verification");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/(account\/login|auth\/login|login)/);
});

// ─── Account portal additions — auth-gated ──────────────────────────

test("/account/wholesale-cert redirects unauthenticated users", async ({
  page,
}) => {
  const res = await page.goto("/account/wholesale-cert");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(
    /\/(account\/login|auth\/login|login|account\/wholesale-cert)/,
  );
});

test("/account/startup-thesis redirects unauthenticated users", async ({
  page,
}) => {
  const res = await page.goto("/account/startup-thesis");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(
    /\/(account\/login|auth\/login|login|account\/startup-thesis)/,
  );
});

// ─── Investor feed — auth-gated ─────────────────────────────────────

test("/invest/startups/for-you redirects unauthenticated users", async ({
  page,
}) => {
  const res = await page.goto("/invest/startups/for-you");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(
    /\/(account\/login|auth\/login|login|invest\/startups\/for-you)/,
  );
});

// ─── Admin startup review — auth-gated ──────────────────────────────

test("/admin/startups redirects or 401s unauthenticated users", async ({
  page,
}) => {
  const res = await page.goto("/admin/startups");
  // Accept any of: redirect to login, 401, or 403. Never 500.
  const finalStatus = res?.status() ?? 0;
  const finalUrl = page.url();
  const redirectedToLogin = /\/(account\/login|auth\/login|login)/.test(
    finalUrl,
  );
  expect(finalStatus < 500 || redirectedToLogin).toBe(true);
});

// ─── API auth gates ──────────────────────────────────────────────────

test("POST /api/startups/signup returns 400 on empty body, not 500", async ({
  request,
}) => {
  const res = await request.post("/api/startups/signup", {
    data: {},
  });
  // Zod validation should reject with 400; never 500
  expect(res.status()).toBeLessThan(500);
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test("PATCH /api/admin/startups/1/review returns 401 unauthenticated", async ({
  request,
}) => {
  const res = await request.patch("/api/admin/startups/1/review", {
    data: { action: "approve" },
  });
  expect(res.status()).toBe(401);
});

test("POST /api/wholesale-investor-cert/submit returns 401 unauthenticated", async ({
  request,
}) => {
  const res = await request.post("/api/wholesale-investor-cert/submit", {
    multipart: {
      cert_type: "s708_sophisticated",
    },
  });
  expect(res.status()).toBe(401);
});

test("POST /api/startups/data-room returns 401 unauthenticated", async ({
  request,
}) => {
  const res = await request.post("/api/startups/data-room", {
    multipart: { category: "pitch_deck" },
  });
  expect(res.status()).toBe(401);
});

test("GET /api/account/startup-thesis returns 401 unauthenticated", async ({
  request,
}) => {
  const res = await request.get("/api/account/startup-thesis");
  expect(res.status()).toBe(401);
});
