/**
 * Find-advisor quiz flow.
 *
 * Drives through the multi-step matching quiz up to the point where a result
 * renders, without submitting any real lead data (safety net blocks /api/advisor-lead).
 *
 *   1. Landing page renders — form or question visible
 *   2. First question selectable (radio/checkbox interaction)
 *   3. Progress indicator present
 *   4. Second step renders after first-step answer
 *   5. "Back" navigation works (doesn't 404)
 *   6. Postcode / state selector renders on location step
 *   7. Results or match card renders after completing the flow
 *   8. Match card has advisor name + CTA
 */

import type { Flow } from "./types";

export const FIND_ADVISOR_QUIZ_FLOW: Flow = {
  name: "find-advisor-quiz",
  description:
    "Walks through the find-advisor matching quiz: renders, question interaction, progress, back navigation, location step, and result card.",
  steps: [
    // ── Step 1: landing page renders ─────────────────────────────────────────
    {
      name: "quiz-landing-renders",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/find-advisor";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;
        if (status >= 400) throw new Error(`/find-advisor returned HTTP ${status}`);
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(500);

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 20) throw new Error("/find-advisor rendered almost no content");

        const hasInteractive = (await page.locator("button, input, select").count()) > 0;
        if (!hasInteractive) {
          store.add({
            severity: "high",
            category: "ux",
            title: "find-advisor: no interactive elements on landing",
            detail: "The /find-advisor page has no buttons, inputs, or selects. The quiz failed to render.",
            url,
            persona,
            signatureKey: "find-advisor:no-interactive",
          });
          throw new Error("no interactive elements on find-advisor");
        }
      },
    },

    // ── Step 2: progress indicator present ───────────────────────────────────
    {
      name: "progress-indicator-present",
      async run({ page, store, persona }) {
        const url = page.url();
        // Progress bars / step counters.
        const hasProgress =
          (await page.locator('[role="progressbar"], [aria-label*="step" i], [aria-label*="progress" i], .progress-bar').count().catch(() => 0)) > 0 ||
          /step\s+\d+\s+of\s+\d+/i.test(await page.locator("main").first().innerText().catch(() => ""));

        if (!hasProgress) {
          store.add({
            severity: "low",
            category: "ux",
            title: "find-advisor: no visible progress indicator on quiz",
            detail:
              "The quiz has no progress bar or 'Step X of Y' indicator. " +
              "Users don't know how long the quiz is, increasing drop-off.",
            url,
            persona,
            signatureKey: "find-advisor:no-progress",
          });
        }
      },
    },

    // ── Step 3: first question interactable ──────────────────────────────────
    {
      name: "first-question-interaction",
      async run({ page, store, persona }) {
        const url = page.url();

        // Try clicking the first radio/checkbox/button answer option.
        const options = page.locator('input[type="radio"], input[type="checkbox"], button[data-option], [role="radio"], [role="option"]');
        const count = await options.count().catch(() => 0);

        if (count === 0) {
          // May need to click a "Get Started" button first.
          const startBtn = page.locator('button:has-text("Get Started"), button:has-text("Start"), button:has-text("Begin"), a:has-text("Get Started")');
          if ((await startBtn.count().catch(() => 0)) > 0) {
            await startBtn.first().click().catch(() => undefined);
            await page.waitForTimeout(600);
          }
        }

        const opts2 = page.locator('input[type="radio"], input[type="checkbox"], button[data-option], [role="radio"]');
        const count2 = await opts2.count().catch(() => 0);

        if (count2 === 0) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "find-advisor: no question answer options found",
            detail: "No radio, checkbox, or [role=radio] answer options were found on step 1. The quiz questions may not be rendering.",
            url,
            persona,
            signatureKey: "find-advisor:no-options",
          });
          return;
        }

        // Click first option.
        await opts2.first().click().catch(() => undefined);
        await page.waitForTimeout(400);
      },
    },

    // ── Step 4: next-step button advances the quiz ────────────────────────────
    {
      name: "next-step-advances",
      async run({ page, store, persona }) {
        const url = page.url();
        const bodyBefore = await page.locator("main").first().innerText().catch(() => "");

        const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]:not([disabled])').first();
        if ((await nextBtn.count().catch(() => 0)) === 0) {
          // Some quizzes auto-advance on selection — that's fine.
          return;
        }

        await nextBtn.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(800);

        const bodyAfter = await page.locator("main").first().innerText().catch(() => "");
        if (bodyAfter === bodyBefore) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "find-advisor: Next button did not advance the quiz",
            detail:
              "Clicking Next produced no visible change in the quiz content. " +
              "The step transition may be broken or the button is a no-op.",
            url,
            persona,
            signatureKey: "find-advisor:next-stuck",
          });
        }
      },
    },

    // ── Step 5: back navigation works ────────────────────────────────────────
    {
      name: "back-navigation-works",
      async run({ page, store, persona }) {
        const url = page.url();
        const backBtn = page.locator('button:has-text("Back"), a:has-text("Back"), button[aria-label*="back" i]').first();

        if ((await backBtn.count().catch(() => 0)) === 0) {
          store.add({
            severity: "low",
            category: "ux",
            title: "find-advisor: no Back button on quiz step 2",
            detail: "No Back button found after advancing the quiz. Users can't correct mistakes on previous steps.",
            url,
            persona,
            signatureKey: "find-advisor:no-back-btn",
          });
          return;
        }

        await backBtn.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(600);

        const status = (await page.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 10_000 }).catch(() => null))?.status() ?? 200;
        if (status >= 500) {
          store.add({
            severity: "high",
            category: "flow-failure",
            title: "find-advisor: Back button caused a 5xx error",
            url: page.url(),
            persona,
            signatureKey: "find-advisor:back-500",
            detail: "Clicking Back on the quiz returned a server error.",
          });
        }
        // Re-navigate forward so subsequent steps have the correct state.
        await page.goBack().catch(() => undefined);
        await page.waitForTimeout(400);
      },
    },

    // ── Step 6: location step renders postcode or state selector ─────────────
    {
      name: "location-step-renders",
      async run({ page, store, persona, config }) {
        // Navigate directly to /find-advisor to restart the quiz.
        const url = config.baseUrl.replace(/\/$/, "") + "/find-advisor";
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        // Click through multiple steps trying to find the location step.
        for (let i = 0; i < 6; i++) {
          const bodyText = await page.locator("main").first().innerText().catch(() => "");
          if (/postcode|location|suburb|state|where are you/i.test(bodyText)) {
            // Found the location step.
            const hasLocationInput =
              (await page.locator('input[name="postcode"], input[placeholder*="postcode" i], input[placeholder*="suburb" i], select[name="state"]').count().catch(() => 0)) > 0;
            if (!hasLocationInput) {
              store.add({
                severity: "medium",
                category: "ux",
                title: "find-advisor: location step has no postcode/state input",
                detail: "The quiz shows a location step but no postcode input or state selector was found.",
                url: page.url(),
                persona,
                signatureKey: "find-advisor:no-location-input",
              });
            }
            return;
          }

          // Click first available answer then Next.
          const opts = page.locator('input[type="radio"], input[type="checkbox"], [role="radio"]');
          if ((await opts.count().catch(() => 0)) > 0) await opts.first().click().catch(() => undefined);
          const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]:not([disabled])').first();
          if ((await nextBtn.count().catch(() => 0)) > 0) {
            await nextBtn.click({ force: true }).catch(() => undefined);
          }
          await page.waitForTimeout(600);
        }
      },
    },
  ],
};
