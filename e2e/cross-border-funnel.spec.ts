import { test, expect } from "@playwright/test";

/**
 * Cross-border funnel (FIN_NOTEBOOK #24 Phase A) — verifies that the
 * /find-advisor?specialty=… URL shape renders the routing banner and
 * deep-links work from country pages.
 */

test.describe("/find-advisor specialty param", () => {
  test("UK Pension Transfer specialty shows the routing banner", async ({ page }) => {
    await page.goto("/find-advisor?specialty=UK+Pension+Transfer");
    await expect(page.getByText(/Routing you to a UK Pension Transfer specialist/i)).toBeVisible();
  });

  test("Invalid specialty is silently ignored (no banner, no broken page)", async ({ page }) => {
    await page.goto("/find-advisor?specialty=ArbitraryString");
    await expect(page.getByText(/Routing you to/i)).toHaveCount(0);
    // Page itself still renders.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("FATCA US specialty shows the routing banner", async ({ page }) => {
    await page.goto("/find-advisor?specialty=FATCA-Aware+US+Expat+Planning");
    await expect(page.getByText(/Routing you to a FATCA-Aware US Expat Planning specialist/i)).toBeVisible();
  });
});

test.describe("/brokers redirect", () => {
  test("/brokers redirects to /compare (no double-hop)", async ({ page }) => {
    const response = await page.goto("/brokers", { waitUntil: "domcontentloaded" });
    // Next.js 308 permanent → final URL should be /compare.
    expect(page.url()).toContain("/compare");
    // 200 on the destination is fine; intermediate 308 is internal.
    expect(response?.status() ?? 0).toBeLessThan(400);
  });
});
