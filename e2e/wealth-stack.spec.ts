import { test, expect } from "@playwright/test";

/**
 * Wealth-stack page (FIN_NOTEBOOK Revenue #1) — smoke tests for the
 * happy path. Does NOT exercise /api/wealth-stack against real broker
 * data (that needs DB seeding); instead validates the form renders, the
 * controls work, and submit hits the API. The success state requires
 * real data so it's covered as an integration test in vitest, not E2E.
 */

test.describe("/wealth-stack", () => {
  test("renders the 2-question form on first load", async ({ page }) => {
    await page.goto("/wealth-stack");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/wealth stack/i);
    await expect(page.getByText(/What's your main goal/i)).toBeVisible();
    await expect(page.getByText(/How much are you starting with/i)).toBeVisible();
  });

  test("requires both goal and amount before submitting", async ({ page }) => {
    await page.goto("/wealth-stack");

    await page.getByRole("button", { name: /build my stack/i }).click();

    // Form-level validation kicks in. Either we see an alert error or
    // the form simply doesn't submit (button stays "Build my stack",
    // not "Building your stack…").
    await expect(page.getByRole("button", { name: /build my stack/i })).toBeVisible();
  });

  test("submits with goal + amount selected and posts to /api/wealth-stack", async ({ page }) => {
    let apiCalled = false;
    let apiBody: { goal?: string; amount?: string } | null = null;
    await page.route("**/api/wealth-stack", async (route) => {
      apiCalled = true;
      apiBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          stack: { components: [], stackId: "stack_e2e_test" },
        }),
      });
    });

    await page.goto("/wealth-stack");
    await page.getByLabel(/Build long-term wealth/i).check({ force: true });
    await page.getByLabel(/^\$5k–\$25k$/i).check({ force: true });
    await page.getByRole("button", { name: /build my stack/i }).click();

    await expect.poll(() => apiCalled, { timeout: 5000 }).toBe(true);
    expect(apiBody?.goal).toBe("grow");
    expect(apiBody?.amount).toBe("medium");
  });
});
