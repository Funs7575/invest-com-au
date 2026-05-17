import { test, expect } from "@playwright/test";

/**
 * Smoke checks for the AI advisor surface:
 *   1. /advisors hero has "Ask the AI concierge" link → /concierge?finder=advisor-finder
 *   2. /concierge?finder=advisor-finder auto-fires a POST /api/concierge
 *      (with finder=advisor-finder + the server-mapped prompt)
 *   3. /concierge?finder=… does NOT auto-fire when a stored session is hydrating
 *   4. ConciergeClient renders Sources block when SSE emits a 'retrieved' event
 *   5. Unknown finder values do NOT auto-fire
 *   6. /advisors/compare?add=<slug> toggles the slug into the shortlist and
 *      strips the ?add= param from the URL
 *
 * /api/concierge is intercepted in tests 2-5 so we never make a real
 * Claude call (zero added inference cost).
 *
 * Previously test 2 in this file covered /advisors/search — that route was
 * retired 2026-05; its filters are now hosted inside /advisors and the URL
 * 301s to /advisors via next.config redirects().
 */

// Server-side prompt for finder=advisor-finder; kept in sync with
// CONCIERGE_SEEDS in lib/concierge-seeds.ts. If you edit that file,
// update this string.
const ADVISOR_FINDER_PROMPT =
  "I'm thinking about hiring a financial advisor. What should I look for, and what questions should I ask?";

function mockConciergeStream(opts?: {
  sessionId?: string;
  text?: string;
  retrieved?: Array<{ type: string; id: string; title: string; score: number }>;
}) {
  const sessionId = opts?.sessionId ?? "test-session-1234";
  const text = opts?.text ?? "Mock concierge reply.";
  const events = [
    `data: ${JSON.stringify({ type: "session", session_id: sessionId })}\n\n`,
  ];
  if (opts?.retrieved) {
    events.push(
      `data: ${JSON.stringify({ type: "retrieved", docs: opts.retrieved })}\n\n`,
    );
  }
  events.push(
    `data: ${JSON.stringify({ type: "delta", text })}\n\n`,
    `data: ${JSON.stringify({ type: "done", tokens_in: 0, tokens_out: 0 })}\n\n`,
  );
  return events.join("");
}

test.describe("Advisor AI surface", () => {
  test("/advisors hero shows the AI concierge CTA pointing to /concierge?finder=advisor-finder", async ({ page }) => {
    await page.goto("/advisors");
    const cta = page.getByRole("link", { name: /Ask the AI concierge/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toBe("/concierge?finder=advisor-finder");
  });

  test("/advisors/search 301-redirects to /advisors", async ({ page }) => {
    const response = await page.goto("/advisors/search");
    // Next's permanent redirects resolve to /advisors before the response
    // reaches the browser; only assert the landed URL since redirect status
    // chains are flaky to capture in Playwright.
    await expect(page).toHaveURL(/\/advisors(\?|$)/);
    expect(response).not.toBeNull();
  });

  test("/concierge?finder=advisor-finder auto-fires a POST /api/concierge with the mapped prompt + finder", async ({ page }) => {
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

    await page.goto("/concierge?finder=advisor-finder");

    await expect(page.locator("text=Mock concierge reply.")).toBeVisible({ timeout: 10_000 });

    expect(capturedRequestBody).not.toBeNull();
    const body = capturedRequestBody as { message?: string; finder?: string };
    expect(body.message).toBe(ADVISOR_FINDER_PROMPT);
    expect(body.finder).toBe("advisor-finder");
  });

  test("/concierge?finder=… does NOT auto-fire when a stored session is hydrating", async ({ page, context }) => {
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

    await page.goto("/concierge?finder=advisor-finder");

    // Wait until prior history has rendered.
    await expect(page.locator("text=Earlier answer")).toBeVisible({ timeout: 10_000 });
    // Give the seed effect a chance to NOT fire.
    await page.waitForTimeout(800);

    expect(postCount).toBe(0);
  });

  test("ConciergeClient renders the Sources block when SSE emits a 'retrieved' event", async ({ page }) => {
    await page.route("**/api/concierge", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream; charset=utf-8",
          body: mockConciergeStream({
            retrieved: [
              { type: "advisor", id: "casey-lin", title: "Casey Lin — Acme Wealth", score: 0.91 },
              { type: "broker", id: "commsec", title: "CommSec", score: 0.84 },
            ],
            text: "Here is some general information.",
          }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"messages":[]}' });
    });

    await page.goto("/concierge?finder=advisor-finder");

    await expect(page.locator("text=Sources:")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Casey Lin/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /CommSec/i })).toBeVisible();
  });

  test("an unknown finder value does NOT auto-fire", async ({ page }) => {
    let postCount = 0;
    await page.route("**/api/concierge**", async (route, request) => {
      if (request.method() === "POST") postCount += 1;
      await route.fulfill({
        status: 200,
        contentType: request.method() === "POST" ? "text/event-stream; charset=utf-8" : "application/json",
        body: request.method() === "POST" ? mockConciergeStream() : '{"messages":[]}',
      });
    });

    await page.goto("/concierge?finder=unknown-finder-key");
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
