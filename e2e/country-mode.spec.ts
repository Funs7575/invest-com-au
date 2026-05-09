import { test, expect } from "@playwright/test";

/**
 * Country Mode E2E tests — CC-04.
 *
 * Tests the meaningful UI surfaces of the five-level resolution chain:
 *   1. Cookie → CountryModeBanner (server-rendered strip on every page)
 *   2. GeoIP → GeoSoftPrompt (client-side soft-prompt after /api/geo)
 *   3. Cookie clear via "View global" → banner disappears
 *
 * Covers: cookie persistence, soft-prompt accept/dismiss, dismissal
 * persistence, and the guard that suppresses the prompt when a cookie
 * is already set.
 */

const COOKIE_NAME = "iv_intent_country";
const DISMISSED_KEY = "iv-country-prompt-dismissed";

test.describe("Country Mode — cookie → CountryModeBanner", () => {
  test("setting iv_intent_country=hk shows the country banner", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: COOKIE_NAME, value: "hk", domain: "localhost", path: "/" },
    ]);
    await page.goto("/");

    const banner = page.locator('[role="status"]').filter({
      hasText: /HK investors/i,
    });
    await expect(banner).toBeVisible({ timeout: 10_000 });
  });

  test("banner remains visible after page reload", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: COOKIE_NAME, value: "hk", domain: "localhost", path: "/" },
    ]);
    await page.goto("/");
    const banner = page.locator('[role="status"]').filter({
      hasText: /HK investors/i,
    });
    await expect(banner).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(banner).toBeVisible({ timeout: 10_000 });
  });

  test('"View global" button clears the banner', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: COOKIE_NAME, value: "hk", domain: "localhost", path: "/" },
    ]);
    await page.goto("/");
    const banner = page.locator('[role="status"]').filter({
      hasText: /HK investors/i,
    });
    await expect(banner).toBeVisible({ timeout: 10_000 });

    await page.locator('button:has-text("View global")').click();
    await expect(banner).not.toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Country Mode — GeoSoftPrompt", () => {
  test("geo detection shows soft prompt when no cookie is set", async ({
    page,
  }) => {
    await page.route("**/api/geo", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ country: "HK" }),
      }),
    );

    await page.goto("/");
    const prompt = page.locator(
      '[role="dialog"][aria-label="Suggested country: Hong Kong"]',
    );
    await expect(prompt).toBeVisible({ timeout: 10_000 });
    await expect(prompt).toContainText(/hong kong/i);
  });

  test("dismissing the prompt persists dismissal in localStorage", async ({
    page,
  }) => {
    await page.route("**/api/geo", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ country: "HK" }),
      }),
    );

    await page.goto("/");
    const prompt = page.locator(
      '[role="dialog"][aria-label="Suggested country: Hong Kong"]',
    );
    await expect(prompt).toBeVisible({ timeout: 10_000 });

    await prompt.getByRole("button", { name: /stay on global/i }).click();
    await expect(prompt).not.toBeVisible({ timeout: 5_000 });

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      DISMISSED_KEY,
    );
    expect(stored).toBe("1");
  });

  test("prompt does not appear when dismissal flag is already in localStorage", async ({
    page,
  }) => {
    await page.route("**/api/geo", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ country: "HK" }),
      }),
    );

    await page.addInitScript(
      (key) => window.localStorage.setItem(key, "1"),
      DISMISSED_KEY,
    );

    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator(
        '[role="dialog"][aria-label="Suggested country: Hong Kong"]',
      ),
    ).not.toBeVisible();
  });

  test("prompt does not appear when iv_intent_country cookie is already set", async ({
    page,
    context,
  }) => {
    await page.route("**/api/geo", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ country: "HK" }),
      }),
    );
    await context.addCookies([
      { name: COOKIE_NAME, value: "hk", domain: "localhost", path: "/" },
    ]);

    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator(
        '[role="dialog"][aria-label="Suggested country: Hong Kong"]',
      ),
    ).not.toBeVisible();
  });
});
