import { test, expect } from "@playwright/test";

/**
 * Cross-border funnel (FIN_NOTEBOOK #24) — /find-advisor has folded fully
 * into /get-matched. The cross-border deep-link params (?specialty= /
 * ?country=) that once kept the dedicated wizard alive now redirect (308,
 * query preserved) to /get-matched, where lib/getmatched/deep-link-prefill
 * seeds the advisor lane / overseas starting point. These specs verify the
 * redirect fires and the unified funnel renders.
 */

test.describe("/find-advisor cross-border deep links fold into /get-matched", () => {
  test("UK Pension Transfer specialty redirects to /get-matched, query preserved", async ({ page }) => {
    await page.goto("/find-advisor?specialty=UK+Pension+Transfer", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/get-matched\?.*specialty=UK(\+|%20)Pension(\+|%20)Transfer/i);
    // The unified funnel renders (a question card / heading is present).
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("country param redirects to /get-matched, query preserved", async ({ page }) => {
    await page.goto("/find-advisor?country=hong-kong", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/get-matched\?.*country=hong-kong/i);
  });

  test("bare /find-advisor redirects to /get-matched", async ({ page }) => {
    await page.goto("/find-advisor", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/get-matched\b/);
  });

  test("/find-advisor/life-event stays on its dedicated flow (not redirected)", async ({ page }) => {
    await page.goto("/find-advisor/life-event", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/find-advisor\/life-event\b/);
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
