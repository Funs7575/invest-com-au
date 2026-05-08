import { test, expect } from "@playwright/test";

/**
 * Smoke checks for the cheap-now AI advisor surface shipped 2026-05-08:
 *   1. /advisors hero has the "Ask the AI concierge" CTA → /concierge?seed=…
 *   2. /advisors/search header has the same CTA shape
 *   3. /concierge?seed=<text> auto-fires a POST /api/concierge with that text
 *   4. /concierge?seed=… does NOT auto-fire when a stored session is hydrating
 *   5. /advisors/compare?add=<slug> toggles the slug into the shortlist and
 *      strips the ?add= param from the URL
 *
 * /api/concierge is intercepted in tests 3 + 4 so we never make a real
 * Claude call (zero added inference cost).
 */

const SEED_TEXT =
  "I'm thinking about hiring a financial advisor. What should I look for, and what questions should I ask?";

function mockConciergeStream(sessionId = "test-session-1234") {
  // Minimal SSE stream that satisfies ConciergeClient's parser.
  return [
    `data: ${JSON.stringify({ type: "session", session_id: sessionId })}\n\n`,
    `data: ${JSON.stringify({ type: "delta", text: "Mock concierge reply." })}\n\n`,
    `data: ${JSON.stringify({ type: "done", tokens_in: 0, tokens_out: 0 })}\n\n`,
  ].join("");
}

test.describe("Advisor AI surface — cheap-now plan", () => {
  test("/advisors hero shows the AI concierge CTA pointing to /concierge?seed=…", async ({ page }) => {
    await page.goto("/advisors");
    const cta = page.getByRole("link", { name: /Ask the AI concierge/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toContain("/concierge?seed=");
    expect(decodeURIComponent(href ?? "")).toContain("hiring a financial advisor");
  });

  test("/advisors/search header shows the AI CTA", async ({ page }) => {
    await page.goto("/advisors/search");
    const cta = page.getByRole("link", { name: /Ask the AI/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toContain("/concierge?seed=");
  });

  test("/concierge?seed=… auto-fires a POST /api/concierge with the seed text", async ({ page }) => {
    let capturedRequestBody: unknown = null;

    await page.route("**/api/concierge", async (route, request) => {
      if (request.method() === "POST") {
        try {
          capturedRequestBody = JSON.parse(request.postData() ?? "{}");
        } catch {
          capturedRequestBody = { __parseError: true };
        }
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream; charset=utf-8",
          body: mockConciergeStream(),
        });
        return;
      }
      // GET (history) — return empty list so we count as a fresh start.
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"messages":[]}' });
    });

    await page.goto(`/concierge?seed=${encodeURIComponent(SEED_TEXT)}`);

    await expect(page.locator("text=Mock concierge reply.")).toBeVisible({ timeout: 10_000 });

    expect(capturedRequestBody).not.toBeNull();
    const body = capturedRequestBody as { message?: string };
    expect(body.message).toBe(SEED_TEXT);
  });

  test("/concierge?seed=… does NOT auto-fire when a stored session is hydrating", async ({ page, context }) => {
    let postCount = 0;
    await context.addInitScript(() => {
      try {
        localStorage.setItem("ic_concierge_session_v1", "stored-sess-abcdef");
      } catch {
        /* ignore */
      }
    });

    await page.route("**/api/concierge**", async (route, request) => {
      const url = new URL(request.url());
      if (request.method() === "GET" && url.searchParams.get("session_id")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            messages: [
              { role: "user", content: "Earlier question" },
              { role: "assistant", content: "Earlier answer" },
            ],
          }),
        });
        return;
      }
      if (request.method() === "POST") {
        postCount += 1;
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream; charset=utf-8",
          body: mockConciergeStream(),
        });
        return;
      }
      await route.fulfill({ status: 200, body: "" });
    });

    await page.goto(`/concierge?seed=${encodeURIComponent(SEED_TEXT)}`);

    // Wait until prior history has rendered.
    await expect(page.locator("text=Earlier answer")).toBeVisible({ timeout: 10_000 });
    // Give the seed effect a chance to NOT fire.
    await page.waitForTimeout(800);

    expect(postCount).toBe(0);
  });

  test("/advisors/compare?add=<slug> toggles slug into shortlist and strips the param", async ({ page }) => {
    // Stub /api/advisor-compare so the page renders an advisor card without
    // needing real DB content. The deep-link logic runs purely client-side.
    await page.route("**/api/advisor-compare**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          advisors: [
            {
              id: 1,
              slug: "acme-financial-planning",
              name: "Acme Financial Planning",
              firm_name: "Acme Wealth",
              type: "financial_planner",
              rating: 4.8,
              review_count: 12,
              verified: true,
              specialties: ["SMSF"],
            },
          ],
        }),
      });
    });

    await page.goto("/advisors/compare?add=acme-financial-planning");

    // URL should be cleaned up.
    await expect.poll(() => new URL(page.url()).searchParams.get("add"), { timeout: 5_000 }).toBeNull();

    // localStorage shortlist should contain the slug.
    const slugs = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem("invest_advisor_shortlist");
        return raw ? (JSON.parse(raw) as string[]) : [];
      } catch {
        return [];
      }
    });
    expect(slugs).toContain("acme-financial-planning");

    // Compare card should render.
    await expect(page.locator("text=Acme Financial Planning")).toBeVisible({ timeout: 10_000 });
  });
});
