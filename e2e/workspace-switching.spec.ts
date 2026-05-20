import { test, expect } from "@playwright/test";

/**
 * Workspace switching e2e (Phase 1.3).
 *
 * The full multi-kind+multi-squad happy path needs a seeded staging
 * Supabase user holding several account kinds — that runs in the
 * "Playwright vs staging Supabase" job with E2E_TEST_USER credentials.
 * The auth-gate behaviour below needs NO seeding and runs on every PR:
 * unauthenticated visitors to any portal / the chooser must be bounced
 * to login, never shown another kind's data.
 */

const PORTAL_GATES = [
  { path: "/account/select-workspace", name: "workspace chooser" },
  { path: "/wholesale-portal", name: "wholesale operator portal" },
  { path: "/embed-portal", name: "embed customer portal" },
  { path: "/advisor-portal", name: "advisor portal" },
  { path: "/broker-portal", name: "broker partner portal" },
];

for (const gate of PORTAL_GATES) {
  test(`unauthenticated visit to ${gate.name} is bounced to login`, async ({ page }) => {
    const res = await page.goto(gate.path);
    // Either a redirect to a login route, or the page renders a login
    // affordance. Never a 500, never another kind's dashboard.
    expect(res?.status(), `${gate.path} should not 500`).toBeLessThan(500);
    await page.waitForLoadState("domcontentloaded");
    const url = page.url();
    const onLogin = /\/(account\/login|auth\/login|broker-portal\/login|login)/.test(url);
    const hasLoginAffordance = await page
      .locator('input[type="email"], a[href*="login"], button:has-text("Sign in")')
      .first()
      .count();
    expect(
      onLogin || hasLoginAffordance > 0,
      `${gate.path} should gate unauthenticated users (url=${url})`,
    ).toBeTruthy();
  });
}

/**
 * Full authenticated flow — requires E2E_TEST_USER_EMAIL + a seeded user
 * holding 2+ kinds (e.g. advisor + investor + a squad membership).
 * Skips cleanly when the env isn't provisioned so the spec is safe to
 * run locally / on PRs without secrets.
 */
test("multi-kind user sees chooser then lands in a workspace", async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL;
  const otp = process.env.E2E_TEST_USER_OTP;
  if (!email || !otp) {
    test.skip(true, "E2E_TEST_USER_EMAIL / _OTP not set — needs seeded staging user");
    return;
  }

  // Magic-link / OTP sign-in (project uses email OTP by default).
  await page.goto("/auth/login");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('button[type="submit"]').first().click();
  await page.locator('input[name="token"], input[autocomplete="one-time-code"]').first().fill(otp);
  await page.locator('button[type="submit"]').first().click();

  // Multi-kind users land on the chooser. Pick the first workspace card.
  await page.waitForURL(/\/account\/select-workspace/, { timeout: 15_000 });
  const firstCard = page.locator('button:has-text("Open this workspace")').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();

  // We should leave the chooser and the workspace switcher pill should
  // be present in the header (rendered only for multi-kind users).
  await expect(page).not.toHaveURL(/\/account\/select-workspace/, { timeout: 15_000 });
  await expect(page.getByTestId("workspace-switcher")).toBeVisible();
});
