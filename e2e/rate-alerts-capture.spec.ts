import { test, expect } from "@playwright/test";

/**
 * Rate-alert capture (FIN_NOTEBOOK Revenue #4) — smoke for the
 * embedded form on /savings and /term-deposits. Mocks the
 * /api/rate-alerts POST so the test doesn't need RESEND_API_KEY +
 * supabase to be wired against real backends.
 */

test.describe("RateAlertCapture on /savings", () => {
  test("renders the capture form with savings copy", async ({ page }) => {
    await page.goto("/savings");
    await expect(page.getByText(/savings rates beat your target/i)).toBeVisible();
  });

  test("submits with email + threshold and hits /api/rate-alerts", async ({ page }) => {
    let called = false;
    let body: { email?: string; product_kind?: string; threshold_pct?: number } | null = null;
    await page.route("**/api/rate-alerts", async (route) => {
      called = true;
      body = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/savings");
    await page.getByPlaceholder(/you@example.com/i).fill("test@example.com");
    // defaultThresholdPct is 5.25 — value comes pre-filled but the user
    // can edit. Submit as-is to verify the bps conversion in the API.
    await page.getByRole("button", { name: /alert me/i }).click();

    await expect.poll(() => called, { timeout: 5000 }).toBe(true);
    expect(body?.email).toBe("test@example.com");
    expect(body?.product_kind).toBe("savings_account");
    expect(body?.threshold_pct).toBe(5.25);

    await expect(page.getByText(/check your inbox/i)).toBeVisible();
  });
});

test.describe("RateAlertCapture on /term-deposits", () => {
  test("renders with term-deposit copy + default 5.00%", async ({ page }) => {
    let body: { product_kind?: string; threshold_pct?: number } | null = null;
    await page.route("**/api/rate-alerts", async (route) => {
      body = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/term-deposits");
    await expect(page.getByText(/term-deposit rates beat your target/i)).toBeVisible();

    await page.getByPlaceholder(/you@example.com/i).fill("td@example.com");
    await page.getByRole("button", { name: /alert me/i }).click();

    await expect.poll(() => body !== null, { timeout: 5000 }).toBe(true);
    expect(body?.product_kind).toBe("term_deposit");
    expect(body?.threshold_pct).toBe(5.0);
  });
});
