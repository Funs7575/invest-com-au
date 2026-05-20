import { test, expect, type Page } from "@playwright/test";

/**
 * T-TESTS-02 — Golden conversion-flow E2E suite.
 *
 * Walks the four journeys that, end-to-end, generate revenue or capture
 * leads. Each is one `test()` so a single broken flow names itself in CI.
 *
 *   a. Quiz → results → lead capture   (/quiz)
 *   b. Compare → select 2+ → full compare   (/compare)
 *   c. Advisor directory → Get Matched CTA   (/advisors → /get-matched)
 *   d. CGT calculator → input → computed output   (/tools/cgt-calculator)
 *
 * Runs against an already-deployed target (no local webserver), e.g.:
 *   E2E_BASE_URL=https://invest-com-au.vercel.app E2E_SKIP_WEBSERVER=1 \
 *     npx playwright test e2e/golden-flows.spec.ts
 *
 * Resilience constraints (CLAUDE.md):
 *   - Selectors are role/label/text-anchored, never brittle CSS, so they
 *     survive class/markup churn.
 *   - No `networkidle` waits — webkit + mobile-safari flake on them. We
 *     await explicit URL changes / element visibility instead.
 *   - Lead-writing endpoints are intercepted with `page.route` so a real
 *     run against prod never persists a fake lead.
 *   - Assertions accept the legitimate range of engine outcomes (e.g. the
 *     quiz result heading differs by inferred outcome) rather than pinning
 *     one branch.
 */

// Selectors are anchored on stable copy pulled from the live components:
//   - Quiz options render as `<button role="radio" aria-label={label}>` in
//     QuizQuestionScreen; we match the leading label text.
//   - The DIY answer chain (location → goal → mode → experience → amount →
//     priority) keeps us on the broker-results track that shows the inline
//     email capture (QuizInlineEmailCapture).
const QUIZ_DIY_PATH = [
  "I live in Australia", // location → australia
  "Long-term growth", // goal → grow ("Start investing / Long-term growth")
  "Do it myself", // mode → diy
  "Complete beginner", // experience → beginner
  "Building a portfolio", // amount → medium (sub-copy; unique vs "Under $10,000")
  "Lowest fees", // priority → fees
] as const;

/**
 * Click a quiz radio option by its visible label. Waits for the radiogroup
 * to hydrate first so we never act on a stale/unmounted screen, then matches
 * the option whose text contains `labelPrefix`.
 */
async function pickQuizOption(page: Page, labelPrefix: string): Promise<void> {
  const radios = page.getByRole("radio");
  await expect(radios.first()).toBeVisible({ timeout: 10_000 });
  const option = radios.filter({ hasText: labelPrefix }).first();
  await expect(option).toBeVisible({ timeout: 5_000 });
  await option.click();
}

test.describe("Golden conversion flows", () => {
  test("quiz → results → inline lead capture", async ({ page }) => {
    // Intercept the lead-write so a prod run never persists a fake lead.
    // Returns the success shape the client expects (res.ok → submitted).
    await page.route("**/api/quiz-lead", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      await route.fallback();
    });

    const response = await page.goto("/quiz");
    expect(response?.status(), "/quiz should respond 2xx/3xx").toBeLessThan(400);

    // A returning visitor may see the "Welcome back!" resume prompt (saved
    // localStorage progress). Start clean so we drive a deterministic path.
    const startOver = page.getByRole("button", { name: /start over/i });
    if (await startOver.isVisible().catch(() => false)) {
      await startOver.click();
    }

    // First question must be live before we begin.
    await expect(
      page.getByRole("heading", { name: /where are you based/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Walk the DIY answer chain.
    for (const label of QUIZ_DIY_PATH) {
      await pickQuizOption(page, label);
    }

    // After the final answer the DIY analyzing screen ("Filtering
    // platforms…") shows ~1.8s, then the results screen. Accept either the
    // interstitial or the result heading so a fast resolve isn't a miss.
    const analyzing = page.getByText(/Filtering platforms/i);
    // Result heading is "Your top match" (diy-broker) or "Your best next
    // step" (non-broker outcome) — both are valid landings.
    const resultHeading = page.getByRole("heading", {
      name: /your top match|your best next step/i,
    });
    await expect(analyzing.or(resultHeading).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(resultHeading.first()).toBeVisible({ timeout: 10_000 });

    // The lead-capture journey ends at the inline email capture rendered
    // below the results (QuizInlineEmailCapture). Its prompt + email field
    // are the load-bearing proof the capture surface reached the user.
    await expect(
      page.getByRole("heading", { name: /want a pdf copy emailed to you/i }),
    ).toBeVisible({ timeout: 10_000 });

    const emailInput = page.getByLabel("Email address for quiz results");
    await expect(emailInput).toBeVisible();
    await emailInput.fill("e2e-golden@example.com");

    const submit = page.getByRole("button", { name: /email me the pdf/i });
    await expect(submit).toBeEnabled();
    await submit.click();

    // Success swaps the form for a thank-you confirmation.
    await expect(
      page.getByText(/check your inbox/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("compare → select two platforms → full compare", async ({ page }) => {
    const response = await page.goto("/compare");
    expect(response?.status(), "/compare should respond 2xx/3xx").toBeLessThan(
      400,
    );

    // The selection bar (CompareSelectionBar) only mounts at 2+ selections
    // and is the conversion bridge to the comparison view. Both the desktop
    // table (CompareDesktopTable) and mobile cards render a per-row checkbox
    // with the same aria-label "Pin {name} to shortlist" — but only one set
    // is shown per viewport (the other is `display:none` via Tailwind
    // md:hidden / hidden md:block). `filter({ visible: true })` keeps just
    // the rendered set so nth() indexing is correct on every project
    // (chromium + webkit desktop, mobile-safari).
    const pinCheckboxes = page
      .getByRole("checkbox", { name: /pin .* to shortlist/i })
      .filter({ visible: true });

    // Wait for the broker list to render at least a couple of selectable rows.
    await expect(pinCheckboxes.first()).toBeVisible({ timeout: 15_000 });
    const count = await pinCheckboxes.count();
    expect(count, "expected at least two selectable platforms").toBeGreaterThanOrEqual(2);

    await pinCheckboxes.nth(0).check();
    await pinCheckboxes.nth(1).check();

    // The bar announces "{n}/4 selected" and exposes "Full Compare →"
    // linking to /versus?vs=slug1,slug2.
    await expect(page.getByText(/\/4 selected/i).first()).toBeVisible({
      timeout: 10_000,
    });
    const fullCompare = page
      .getByRole("link", { name: /full compare/i })
      .first();
    await expect(fullCompare).toBeVisible();

    await fullCompare.click();
    await page.waitForURL(/\/versus(\?|\/)/, { timeout: 15_000 });
    // The comparison view rendered (any main landmark / heading is enough —
    // we're proving navigation + page render, not the table internals).
    await expect(page.locator("main, [role='main']").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("advisor directory → Get Matched CTA routes into the flow", async ({
    page,
  }) => {
    const response = await page.goto("/advisors");
    expect(response?.status(), "/advisors should respond 2xx/3xx").toBeLessThan(
      400,
    );

    // The directory H1 + a listing count prove the list rendered.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/listings|advisors/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // The advisor-match CTA is the GetMatchedEmbed in the hero — a link
    // reading "Build my action plan" that deep-links to /get-matched with
    // the advisor_directory context. This is the on-ramp into the matching
    // flow from the directory.
    const getMatched = page
      .getByRole("link", { name: /build my action plan/i })
      .first();
    await expect(getMatched).toBeVisible({ timeout: 10_000 });
    await expect(getMatched).toHaveAttribute("href", /\/get-matched/);

    await getMatched.click();
    await page.waitForURL(/\/get-matched/, { timeout: 15_000 });

    // The Get Matched flow renders its first question card (radio options)
    // or its building/loading interstitial — either confirms we landed in
    // the live flow rather than a crashed route.
    const firstStep = page.getByRole("radio").first();
    const building = page.getByText(/building your/i).first();
    await expect(firstStep.or(building)).toBeVisible({ timeout: 10_000 });

    // Defensive: the start endpoint error card must NOT be showing.
    await expect(
      page.getByText(/Get Matched ran into a problem/i),
    ).toHaveCount(0);
  });

  test("CGT calculator computes a result from inputs", async ({ page }) => {
    const response = await page.goto("/tools/cgt-calculator");
    expect(
      response?.status(),
      "/tools/cgt-calculator should respond 2xx/3xx",
    ).toBeLessThan(400);

    await expect(
      page.getByRole("heading", { name: /capital gains tax calculator/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Drive the two key money inputs. CGTCalculatorClient renders four
    // `<input type=number>` (role=spinbutton), in DOM order: purchase price,
    // sale price, purchase costs, sale costs. The labels aren't associated
    // via for/id, so we index the spinbuttons rather than use getByLabel.
    const numberInputs = page.getByRole("spinbutton");
    const purchase = numberInputs.nth(0);
    const sale = numberInputs.nth(1);
    await expect(purchase).toBeVisible({ timeout: 10_000 });

    // A clear gain: $20k → $60k. The result block renders once proceeds and
    // cost base are positive, which they are for these values.
    await purchase.fill("20000");
    await sale.fill("60000");

    // The breakdown card is the computed-output proof: it only renders when
    // the calculator has produced numbers.
    await expect(
      page.getByRole("heading", { name: /calculation breakdown/i }),
    ).toBeVisible({ timeout: 10_000 });

    // "Gross capital gain" + "Net profit after CGT" are computed rows. The
    // value cells are AUD-formatted (contain "$"). We assert the labels are
    // present and that a currency-formatted figure renders alongside the
    // headline gross-gain number.
    await expect(page.getByText(/gross capital gain/i).first()).toBeVisible();
    await expect(page.getByText(/net profit after cgt/i).first()).toBeVisible();

    // The headline gross-gain stat for a $40k pre-discount gain. The exact
    // figure is deterministic from the inputs (60000 − 20000 = 40000,
    // ignoring the default purchase/sale costs which net to a slightly lower
    // figure), so we assert a currency value renders rather than pinning the
    // post-cost cents.
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible();
  });
});
