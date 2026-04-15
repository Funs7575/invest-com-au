import { test, expect } from "@playwright/test";

/**
 * Smoke tests — prove the big public pages render without a 500.
 *
 * These are the "if any of these break, the site is down" tests.
 * Every PR runs them before merge; they take ~20 seconds total.
 */

const SMOKE_URLS = [
  "/",
  "/compare",
  "/brokers",
  "/quiz",
  "/find-advisor",
  "/fee-impact",
  "/property/suburbs",
  "/property/listings",
  "/property/buyer-agents",
  "/super",
  "/calculators",
  "/privacy",
  "/privacy/data-rights",
  "/methodology",
  "/about",
];

for (const path of SMOKE_URLS) {
  test(`GET ${path} returns 200 and renders a <main>`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should return 200 but got ${response?.status()}`).toBeLessThan(400);
    // Every public page should have a <main> landmark for a11y
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });
}

test("homepage has a visible CTA", async ({ page }) => {
  await page.goto("/");
  // Any primary CTA — compare, quiz, brokers
  const cta = page.locator('a[href*="/quiz"], a[href*="/compare"]').first();
  await expect(cta).toBeVisible();
});

test("compare page renders the broker table", async ({ page }) => {
  await page.goto("/compare");
  // Either a table or a card grid of brokers
  const rendered = await page.locator("table, [data-test='broker-card'], article").first();
  await expect(rendered).toBeVisible();
});
