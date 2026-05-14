import { test, expect, type Page } from "@playwright/test";

/**
 * Critical revenue path — Get Matched → Action Plan → Match Request.
 *
 * Walks the same flow a real visitor takes on the main money path:
 *
 *   1. Land on /get-matched (no error card, first question visible)
 *   2. Pick "I live in Australia" → "Start investing / Long-term growth"
 *      → "Compare platforms side-by-side" → "Complete beginner"
 *      → "A$10k – A$100k" → "Now"
 *   3. Wait for the 1.5s "Building your action plan…" interstitial
 *   4. Land on the action-plan screen — verify the headline strip and the
 *      primary CTA (top-match carousel + match-score badge are optional;
 *      neither renders on the ephemeral guide route).
 *   5. (Optional) follow the Get Quotes path to /briefs/new and verify the
 *      pre-fill banner if the route exposed it — non-fatal if absent.
 *   6. Screenshot the result for visual regression.
 *
 * Design constraints:
 *   - **Ephemeral-safe**: passes whether the DB is ready or not. We never
 *     assert plan_id is positive and never wait on a save endpoint.
 *   - **No mocks on the quiz path** — we want to catch regressions in
 *     /api/get-matched/{start,answer,resolve} as a real user would.
 *   - **Brief submit is intercepted** via `page.route` so we never write a
 *     real lead to prod (the form submission isn't reached in the happy
 *     path here, but the route handler is registered before any clicks for
 *     defence in depth).
 *
 * TODO(once accepted): once the marketplace flow is stable, extend this
 *   test to:
 *     - submit the Match Request form on /briefs/new (mocked POST)
 *     - flip `advisor_auctions.accepted_by_professional_id` via a test-mode
 *       admin endpoint (or DB seed) to simulate a provider accept
 *     - verify contact unlock on the resulting /briefs/[slug] page
 *   Today, the post-form path requires a real Supabase + real auctions
 *   table, neither of which the e2e job guarantees.
 *
 * TODO(playwright.config.ts): add a `--project=chromium` only entry-point
 *   convenience. Currently the file is restricted via the `chromium`
 *   project's `testMatch` defaulting — invoke with:
 *     npx playwright test e2e/critical-path-get-matched-to-brief.spec.ts \
 *       --project=chromium
 */

// The fallback question copy lives in lib/getmatched/fallbacks.ts; if the
// DB is empty the same labels render. We match on the leading text only
// (no emoji, no sub-copy) so the assertions survive copy tweaks.
const ANSWER_LABELS = {
  starting_point: "I live in Australia",
  goal: "Start investing / Long-term growth",
  help_preference: "Compare platforms side-by-side",
  experience: "Complete beginner",
  budget: "A$10k", // matches "A$10k – A$100k"
  timeline: "Now",
} as const;

/**
 * Pick a radio-style option button by its visible label. The QuestionCard
 * renders each option as a `<button role="radio">`. We anchor on the
 * label text rather than the emoji + sub copy so this stays resilient to
 * cosmetic tweaks.
 */
async function pickOption(page: Page, labelPrefix: string): Promise<void> {
  // Wait for at least one radio button — guards against acting before the
  // question card has hydrated.
  const radios = page.getByRole("radio");
  await expect(radios.first()).toBeVisible({ timeout: 10_000 });
  const option = radios.filter({ hasText: labelPrefix }).first();
  await expect(option).toBeVisible({ timeout: 5_000 });
  await option.click();
}

test.describe("Critical path: /get-matched → action plan → brief", () => {
  // We deliberately do NOT call test.use({ ...devices['Desktop Chrome'] })
  // here — the playwright.config.ts already lists chromium as a project,
  // and the spec is invoked with --project=chromium per the doc comment
  // at the top. Adding test.use here would force every project to run it.

  test("walks the quiz, lands on the action plan, and exposes a primary CTA", async ({
    page,
  }, testInfo) => {
    // Intercept the brief-create endpoint so even an accidental form submit
    // (e.g. during a future refactor) can't write to prod. Returns a fake
    // success payload that mirrors the real shape.
    await page.route("**/api/briefs", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            slug: "test-brief-e2e",
            accept_credits_cost: 2,
            risk_review_status: "clear",
          }),
        });
        return;
      }
      await route.fallback();
    });
    await page.route("**/api/get-matched/plans/*/to-brief", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            brief_slug: "test-brief-e2e",
            accept_credits_cost: 2,
            risk_review_status: "clear",
          }),
        });
        return;
      }
      await route.fallback();
    });

    // ─── Step 1: open /get-matched ─────────────────────────────────────
    const response = await page.goto("/get-matched");
    expect(
      response?.status(),
      "/get-matched should respond 2xx/3xx",
    ).toBeLessThan(400);

    // The "Building your plan…" loading state appears briefly before the
    // first question renders. We don't need to wait for it explicitly —
    // pickOption polls for the radiogroup.
    // Error-card guard: if the start endpoint blew up we want a clear
    // failure rather than a timeout in pickOption.
    await expect(
      page.locator("text=/Get Matched ran into a problem/i"),
      "Get Matched error card should not be shown on initial load",
    ).toHaveCount(0);

    // ─── Step 2: walk through the 6 questions ──────────────────────────
    // 2a — starting point
    await pickOption(page, ANSWER_LABELS.starting_point);
    // 2b — goal (next question's prompt is "What are you trying to do?")
    await pickOption(page, ANSWER_LABELS.goal);
    // 2c — help preference (the sub-question for `grow` is skipped — no
    //      shown_if matches the `grow` slug; the next question is
    //      `help_preference`).
    await pickOption(page, ANSWER_LABELS.help_preference);
    // 2d — experience (shown when help_preference ∈ {info_only, browse,
    //      compare})
    await pickOption(page, ANSWER_LABELS.experience);
    // 2e — budget band
    await pickOption(page, ANSWER_LABELS.budget);
    // 2f — timeline
    await pickOption(page, ANSWER_LABELS.timeline);

    // ─── Step 3: analyzing screen (~1.5s) ──────────────────────────────
    // AnalyzingScreen renders the literal "Building your action plan…".
    // We don't strictly assert it appears — if the resolve fetch is very
    // fast it could theoretically be missed — but we DO wait for it OR
    // the result screen to show up.
    const analyzing = page.getByText(/Building your action plan/i);
    const headline = page.getByText(/Your Investment Action Plan/i);
    await expect(analyzing.or(headline).first()).toBeVisible({
      timeout: 10_000,
    });

    // ─── Step 4: action plan result ────────────────────────────────────
    await expect(headline).toBeVisible({ timeout: 10_000 });

    // The result screen always renders SOME primary CTA. For the
    // `compare` route it's "See full comparison"; if the engine instead
    // chose `investor_brief` it's "Get Quotes". We accept either rather
    // than coupling the test to engine routing rules.
    const primaryCta = page.getByRole("link", {
      name: /see full comparison|get quotes|continue|browse|view opportunities/i,
    });
    // The "primary CTA" can be either an <a> (Link) or a <button>
    // depending on whether `recommended_brief_template && !ephemeral`.
    const primaryCtaButton = page.getByRole("button", {
      name: /see full comparison|get quotes|continue/i,
    });
    await expect(primaryCta.or(primaryCtaButton).first()).toBeVisible({
      timeout: 10_000,
    });

    // The "Recommended route" pill must be present — it's the load-bearing
    // proof that the engine resolved a template.
    await expect(
      page.locator("text=/Recommended route/i").first(),
    ).toBeVisible();

    // Match-score badge and top-match carousel are route-specific (only
    // the `compare` route ships top_matches). We assert non-fatally so
    // the test still passes if the engine picks a different route.
    const matchScoreOrCarousel = page.locator(
      "[data-testid='match-score'], [data-testid='top-match-carousel'], text=/Match Score/i",
    );
    // Non-fatal: log presence but don't fail if absent.
    const hasMatchUi = (await matchScoreOrCarousel.count()) > 0;
    testInfo.annotations.push({
      type: "info",
      description: `Match score/carousel present: ${hasMatchUi}`,
    });

    // ─── Step 5: optionally chase the "Get Quotes" path ────────────────
    // Only follow it if the action plan exposes a Get Quotes CTA AND the
    // result isn't in ephemeral mode (in ephemeral mode the brief deep-
    // link is suppressed in favour of an in-page banner).
    const ephemeralBanner = page.locator("text=/Preview mode/i");
    const isEphemeral = (await ephemeralBanner.count()) > 0;
    if (!isEphemeral) {
      const getQuotes = page.getByRole("link", { name: /Get Quotes/i }).first();
      const getQuotesButton = page
        .getByRole("button", { name: /Get Quotes/i })
        .first();
      const linkVisible = await getQuotes.isVisible().catch(() => false);
      const buttonVisible = await getQuotesButton.isVisible().catch(() => false);
      if (linkVisible || buttonVisible) {
        if (linkVisible) {
          await getQuotes.click();
        } else {
          await getQuotesButton.click();
        }
        // Either route lands us on /briefs/new.
        await page.waitForURL(/\/briefs\/new/, { timeout: 10_000 });
        // The pre-fill banner only appears when the plan→brief endpoint
        // returned data (i.e., a real plan_id, non-ephemeral). It's the
        // load-bearing signal that the hand-off works.
        const prefillBanner = page.locator(
          "text=/Pre-filled from your Action Plan/i",
        );
        // Allow ~3s for the by-id fetch to land.
        await prefillBanner.first().waitFor({ state: "visible", timeout: 3_000 })
          .catch(() => {
            // Non-fatal: in some env configurations the by-id endpoint is
            // mocked or unavailable. We still assert the page loaded.
          });
        await expect(page.locator("main").first()).toBeVisible();
      }
    }

    // ─── Step 6: visual regression screenshot ──────────────────────────
    // Navigate back to the action plan if we drilled into /briefs/new so
    // the screenshot is always of the action plan screen.
    if (page.url().includes("/briefs/new")) {
      await page.goBack();
      await expect(
        page.getByText(/Your Investment Action Plan/i),
      ).toBeVisible({ timeout: 10_000 });
    }
    await page.screenshot({
      path: testInfo.outputPath("action-plan-final.png"),
      fullPage: true,
    });
  });
});
