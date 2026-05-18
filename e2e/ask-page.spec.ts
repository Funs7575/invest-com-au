import { test, expect } from "@playwright/test";

/**
 * /ask — public AI Q&A landing page (FIN_NOTEBOOK Revenue #7).
 *
 * Smoke-test that:
 *   1. The page renders the hero + suggested-question chips.
 *   2. Submitting a question via the input dispatches a POST to
 *      /api/chatbot (intercepted; we don't hit the real provider in CI).
 *   3. The reply lands in the conversation panel.
 *   4. AFSL-disclosure copy is on the page (compliance-critical).
 */
test.describe("/ask", () => {
  test("renders hero + suggested questions", async ({ page }) => {
    await page.goto("/ask");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/ask anything/i);
    // Popular question chips render.
    await expect(page.getByText(/cheapest broker|cheapest way to buy crypto|FATCA|FIRB/i).first()).toBeVisible();
    // AFSL disclosure copy must be present for compliance.
    await expect(page.locator("text=/AFSL/i").first()).toBeVisible();
  });

  test("submitting a question shows an assistant reply", async ({ page }) => {
    await page.route("**/api/chatbot", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "We track 35 ASX brokers; the cheapest as of today is Pearler with $6.50/trade.",
          retrieved: [{ source: "broker", title: "Pearler", url: "/broker/pearler" }],
          flagged: false,
        }),
      });
    });

    await page.goto("/ask");
    await page
      .getByPlaceholder(/type your question/i)
      .fill("What's the cheapest broker in Australia?");
    await page.getByRole("button", { name: /^ask$/i }).click();

    await expect(page.getByText(/Pearler with/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/References used/i)).toBeVisible();
  });
});
