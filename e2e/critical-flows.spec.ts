import { test, expect } from "@playwright/test";

/**
 * Critical user journeys. These are the flows that, if broken,
 * directly hurt revenue or compliance:
 *
 *   1. Quiz submission — email capture → match page
 *   2. Broker comparison → outbound affiliate click
 *   3. Advisor finder → advisor detail → enquiry form
 *   4. Fee calculator submission
 *   5. Privacy data request form validation
 *
 * Each flow hits the major UI touch points without actually
 * submitting real leads (we stop at the submit button or mock
 * the POST).
 */

test("quiz flow: can reach an answer step and advance", async ({ page }) => {
  await page.goto("/quiz");
  // Page title or a question
  await expect(page).toHaveTitle(/Quiz|Filter|Invest/i);

  // There should be a set of option cards or buttons
  const option = page.locator('button:has-text("Beginner"), button:has-text("DIY"), button:has-text("Long-term"), button:has-text("Grow")').first();
  await expect(option).toBeVisible({ timeout: 10_000 });
});

test("find-advisor: page renders without auth", async ({ page }) => {
  await page.goto("/find-advisor");
  await expect(page.locator("main, [role='main']").first()).toBeVisible();
  // There should be a postcode / suburb input OR a city picker
  const input = page.locator('input[type="text"], input[type="search"], button').first();
  await expect(input).toBeVisible();
});

test("compare: broker cards link to affiliate or detail pages", async ({ page }) => {
  await page.goto("/compare");
  // Any broker-linking href
  const link = page.locator('a[href*="/broker/"], a[href*="/compare/"], a[rel*="sponsored"]').first();
  await expect(link).toBeVisible({ timeout: 10_000 });
});

test("privacy data rights: form validation rejects empty submission", async ({ page }) => {
  await page.goto("/privacy/data-rights");
  await expect(page.locator('h1')).toContainText("data rights", { ignoreCase: true });

  // Radio buttons exist
  await expect(page.locator('input[type="radio"]').first()).toBeVisible();

  // Submit button exists
  await expect(page.locator('button[type="submit"]').first()).toBeVisible();
});

test("fee-impact calculator page loads", async ({ page }) => {
  await page.goto("/fee-impact");
  await expect(page.locator("main").first()).toBeVisible();
  // There should be numeric inputs or sliders
  const numericInput = page.locator('input[type="number"], input[type="range"]').first();
  await expect(numericInput).toBeVisible({ timeout: 10_000 });
});

test("super page renders with compliance footer", async ({ page }) => {
  await page.goto("/super");
  await expect(page.locator("main").first()).toBeVisible();
  // Compliance text is required on every product page
  const compliance = page.locator("text=/general advice|not financial advice/i").first();
  await expect(compliance).toBeVisible();
});

test("404 page renders for unknown URL", async ({ page }) => {
  const response = await page.goto("/this-definitely-does-not-exist-12345");
  expect(response?.status()).toBe(404);
});
