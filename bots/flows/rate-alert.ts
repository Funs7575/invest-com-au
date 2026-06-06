/**
 * Rate-alert flow — tests the rate-alert creation surface for an authenticated
 * investor.
 *
 * Prerequisites:
 *   - Bot buyer persona must be authenticated (auth state captured via
 *     `npm run screenshots:auto-login`).
 *   - The /account/alerts route must exist and be accessible to logged-in users.
 *
 * Steps:
 *   1. rate-alert-nav     — Navigate to /account/alerts, assert no login redirect.
 *   2. rate-alert-render  — Verify the page renders content and detect the
 *                           create-alert button.
 *   3. rate-alert-create  — Click create, fill the form, submit.
 *   4. rate-alert-verify  — Confirm a new alert is visible after submission.
 */

import type { Flow } from "./types";

export const RATE_ALERT_FLOW: Flow = {
  name: "rate-alert",
  description:
    "Creates a rate alert as a logged-in investor, verifies it persists in the UI.",
  steps: [
    // ── Step 1: navigate to the alerts page ─────────────────────────────────
    {
      name: "rate-alert-nav",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/account/alerts";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          store.add({
            severity: "high",
            category: "flow-failure",
            title: "rate-alert: /account/alerts returned HTTP error",
            detail: `GET /account/alerts → ${status}`,
            url,
            persona,
            signatureKey: "rate-alert:nav:http-error",
          });
          throw new Error(`/account/alerts returned ${status}`);
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        // Detect an auth redirect — the bot persona should already be logged in.
        const finalUrl = page.url();
        if (/\/(login|auth\/)/.test(finalUrl)) {
          store.add({
            severity: "critical",
            category: "flow-failure",
            title: "rate-alert: auth redirect to login — bot-buyer state invalid",
            detail:
              `Expected /account/alerts to render for the authed bot persona, ` +
              `but was redirected to ${finalUrl}.`,
            url,
            persona,
            signatureKey: "rate-alert:nav:auth-redirect",
          });
          throw new Error("/account/alerts redirected to login");
        }
      },
    },

    // ── Step 2: verify page renders and locate the create button ────────────
    {
      name: "rate-alert-render",
      async run({ page, store, persona }) {
        const url = page.url();

        // The page must render at least minimal content.
        const bodyText = await page
          .locator("main, body")
          .first()
          .innerText()
          .catch(() => "");
        if (bodyText.trim().length <= 30) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "rate-alert: alerts page rendered almost nothing",
            detail: `<main> contained only ${bodyText.trim().length} chars.`,
            url,
            persona,
            signatureKey: "rate-alert:render:empty",
          });
        }

        // Detect an empty-state message — not a failure, just informational.
        const emptyStatePatterns = [
          /no alerts/i,
          /no rate alerts/i,
          /you haven't set up/i,
          /no notifications set up/i,
          /get started/i,
        ];
        const pageTextLower = bodyText.toLowerCase();
        const hasEmptyState = emptyStatePatterns.some((re) => re.test(pageTextLower));
        if (hasEmptyState) {
          store.add({
            severity: "info",
            category: "flow-failure",
            title: "rate-alert: alerts page shows empty-state (no alerts yet)",
            detail:
              "The page rendered an empty-state message. This is expected for a fresh account.",
            url,
            persona,
            signatureKey: "rate-alert:render:empty-state",
          });
        }

        // Locate the create-alert button.
        const createBtn = page.getByRole("button", { name: /create|add|new|set up/i });
        if ((await createBtn.count()) === 0) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "rate-alert: no create-alert button found",
            detail:
              'Expected a button matching /create|add|new|set up/i on /account/alerts.',
            url,
            persona,
            signatureKey: "rate-alert:render:no-create-btn",
          });
          // Signal the next steps that there is nothing to interact with.
          throw new Error("no create-alert button found — subsequent steps skipped");
        }
      },
    },

    // ── Step 3: click create, fill form, submit ──────────────────────────────
    {
      name: "rate-alert-create",
      async run({ page, store, persona }) {
        const url = page.url();

        const createBtn = page.getByRole("button", { name: /create|add|new|set up/i });
        await createBtn.first().click();

        // Give the modal / form time to animate in.
        await page.waitForTimeout(1_000);

        // Assert a dialog or form appeared.
        const formLocator = page.locator('[role="dialog"], form, [data-modal]');
        if ((await formLocator.count()) === 0) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "rate-alert: no form appeared after clicking create",
            detail:
              'Clicked the create-alert button but no [role="dialog"], <form>, or [data-modal] ' +
              "appeared within 1 s.",
            url,
            persona,
            signatureKey: "rate-alert:create:no-form",
          });
          throw new Error("no form appeared after clicking create-alert button");
        }

        // Fill the first input whose placeholder or label hints at rate/threshold/product.
        const rateInput = page
          .locator(
            'input[placeholder*="rate" i], input[placeholder*="threshold" i], ' +
            'input[placeholder*="product" i], input[placeholder*="type" i]',
          )
          .first();

        // Fallback: any visible text/number input inside the form/dialog.
        const anyInput = formLocator
          .locator('input[type="text"], input[type="number"], input:not([type])')
          .first();

        const targetInput = (await rateInput.count()) > 0 ? rateInput : anyInput;
        if ((await targetInput.count()) > 0) {
          // Try a numeric threshold first; fall back to a product name string.
          const inputType = await targetInput.getAttribute("type").catch(() => "text");
          await targetInput.fill(inputType === "number" ? "5" : "Savings");
        }

        // Submit the form.
        const submitBtn = page.getByRole("button", {
          name: /submit|confirm|save|create|add/i,
        });
        if ((await submitBtn.count()) > 0) {
          await submitBtn.first().click();
        } else {
          // Fallback: press Enter in the input.
          if ((await targetInput.count()) > 0) await targetInput.press("Enter");
        }

        // Wait for the network to settle after submission.
        await page.waitForTimeout(2_000);
      },
    },

    // ── Step 4: verify the new alert is visible ──────────────────────────────
    {
      name: "rate-alert-verify",
      async run({ page, store, persona }) {
        const url = page.url();

        // Capture post-submit body text length.
        const bodyTextAfter = await page
          .locator("main, body")
          .first()
          .innerText()
          .catch(() => "");

        // Accept explicit success indicators.
        const successPatterns = [
          /alert created/i,
          /alert saved/i,
          /alert added/i,
          /success/i,
          /you.ll be notified/i,
          /notification set/i,
        ];
        const hasSuccess = successPatterns.some((re) => re.test(bodyTextAfter));

        // Accept a non-empty list item / card appearing (any li, tr, or card).
        const listItemCount = await page
          .locator("ul li, tbody tr, [data-alert-item], [data-testid*='alert']")
          .count();
        const hasListItem = listItemCount > 0;

        if (!hasSuccess && !hasListItem) {
          // Heuristic: if body text length after submit is within 10% of the
          // pre-submit length (captured implicitly via render step), treat it as
          // "no visible change". We don't have the pre-submit length here, so we
          // emit a medium finding whenever neither success copy nor a list item
          // is present.
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "rate-alert: no visible change after creating alert",
            detail:
              "Submitted the rate-alert form but neither a success message nor a new list item " +
              "appeared. The alert may not have been saved, or the UI failed to update.",
            url,
            persona,
            signatureKey: "rate-alert:verify:no-change",
          });
        }
      },
    },
  ],
};
