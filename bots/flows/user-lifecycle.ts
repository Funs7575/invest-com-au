/**
 * User lifecycle flow — the full authenticated journey a new investor takes:
 *
 *   1. quiz-initial-render    — /get-matched loads and shows the first question
 *   2. quiz-flow              — click through all questions to the action plan
 *                               (sandbox only; gracefully noted on protected where
 *                               API writes are mocked)
 *   3. account-dashboard      — /account/dashboard renders with content
 *   4. account-holdings       — /account/holdings renders with content
 *   5. account-bookmarks      — /account/bookmarks renders with content
 *   6. advisor-enquiry        — /advisor/james-wong-sydney profile renders,
 *                               contact form fills and submits successfully
 *   7. account-notifications  — /account/notifications renders (may be empty)
 *
 * The bot account must be seeded first (`npm run bots:seed-users`) and its
 * auth state captured (`E2E_BASE_URL=... npm run screenshots:auto-login`).
 * All money/external paths remain intercepted by safety/money-paths.ts, so
 * zero real-world side effects occur even when run against a sandbox.
 */

import type { Flow } from "./types";

/** Max quiz questions to click through before giving up. */
const MAX_QUIZ_STEPS = 20;

/** Known seeded advisor slug (from supabase/migrations/20260309_seed_mock_advisors.sql). */
const ADVISOR_SLUG = "james-wong-sydney";

/** Bot test account details — matches the seed in scripts/seed-bot-users.ts. */
const BOT_NAME = "Bot Test User";
const BOT_EMAIL = "test-bot-buyer@invest-test.local";

export const USER_LIFECYCLE_FLOW: Flow = {
  name: "user-lifecycle",
  description:
    "Full authenticated investor journey: quiz → action plan → account surfaces → advisor enquiry → notifications.",
  steps: [
    // ── Step 1: quiz page loads and renders the first question ──────────────
    {
      name: "quiz-initial-render",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/get-matched";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          store.add({
            severity: "high",
            category: "flow-failure",
            title: "quiz page returned HTTP error",
            detail: `GET /get-matched → ${status}`,
            url,
            persona,
            signatureKey: "lifecycle:quiz:http-error",
          });
          throw new Error(`/get-matched returned ${status}`);
        }

        // Wait for either the first radiogroup or an error alert.
        await page
          .waitForSelector('[role="radiogroup"], [role="alert"]', { timeout: 15_000 })
          .catch(() => {
            throw new Error(
              "quiz page loaded but neither a radiogroup nor an error alert appeared within 15 s",
            );
          });

        const hasOptions = (await page.locator('[role="radio"]').count()) > 0;
        if (!hasOptions) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "quiz rendered radiogroup but no radio options inside it",
            detail: "Expected at least one [role=radio] chip on the first question.",
            url,
            persona,
            signatureKey: "lifecycle:quiz:no-options",
          });
        }
      },
    },

    // ── Step 2: click through the quiz to reach the action plan ─────────────
    {
      name: "quiz-flow",
      async run({ page, store, persona, config }) {
        if (config.targetClass !== "sandbox") {
          // On protected targets the quiz POST APIs are mocked — the client
          // receives {ok:true,mocked:true} instead of {plan_id,...}, which
          // triggers an error state. Record this as expected behaviour and
          // skip the interactive portion; the page-render check in step 1 is
          // sufficient for protected targets.
          store.add({
            severity: "info",
            category: "flow-failure",
            title: "quiz-flow skipped on protected target (quiz APIs mocked)",
            detail:
              "POST /api/get-matched/* is intercepted on protected targets. " +
              "Run against a sandbox (npm run bots:sandbox) for the full interactive quiz flow.",
            url: page.url(),
            persona,
            signatureKey: "lifecycle:quiz-flow:protected-skip",
          });
          return;
        }

        // On sandbox: APIs go through for real. Click through all questions.
        for (let q = 0; q < MAX_QUIZ_STEPS; q++) {
          // Analyzing interstitial — wait it out then break.
          const analyzing = page.locator('[role="status"]').filter({
            hasText: "Building your action plan",
          });
          if ((await analyzing.count()) > 0) {
            await page
              .waitForFunction(
                () =>
                  !document.querySelector(
                    '[role="status"]',
                  ),
                { timeout: 10_000 },
              )
              .catch(() => undefined);
            break;
          }

          // If no radiogroup is visible, we've reached the result screen.
          if ((await page.locator('[role="radiogroup"]').count()) === 0) {
            const hasInput = (await page.locator('input[type="text"], input[type="number"]').count()) > 0;
            if (!hasInput) break; // no question → result rendered
          }

          // ── Select / contextual question (radio chips, auto-advance on click) ─
          const radiogroup = page.locator('[role="radiogroup"]').first();
          if ((await radiogroup.count()) > 0) {
            const radios = radiogroup.locator('[role="radio"]');
            if ((await radios.count()) > 0) {
              await radios.first().click();
              await page.waitForTimeout(900); // wait for API round-trip
              continue;
            }
          }

          // ── Number input question ────────────────────────────────────────────
          const numInput = page.locator('input[type="number"]').first();
          if ((await numInput.count()) > 0) {
            await numInput.fill("50000");
            const continueBtn = page.getByRole("button", { name: /continue/i });
            if ((await continueBtn.count()) > 0) await continueBtn.click();
            await page.waitForTimeout(900);
            continue;
          }

          // ── Text input question ──────────────────────────────────────────────
          const textInput = page.locator('input[type="text"]').first();
          if ((await textInput.count()) > 0) {
            await textInput.fill("General investment growth");
            const continueBtn = page.getByRole("button", { name: /continue/i });
            if ((await continueBtn.count()) > 0) await continueBtn.click();
            await page.waitForTimeout(900);
            continue;
          }

          // ── Multiselect question (plain toggle buttons + Continue) ───────────
          // Detected by: no radiogroup, no single inputs, but a Continue button exists.
          const continueBtn = page.getByRole("button", { name: /continue/i });
          if ((await continueBtn.count()) > 0) {
            // Click the first available option chip then confirm.
            const chips = page.locator('article button:not([disabled])').first();
            if ((await chips.count()) > 0) await chips.click();
            await continueBtn.click();
            await page.waitForTimeout(900);
            continue;
          }

          // Nothing matched — we're probably on the result screen.
          break;
        }

        // Wait for the action plan result to render.
        const resultVisible = await page
          .waitForFunction(
            () => {
              if (document.querySelector('[role="status"]')) return false;
              const main = document.querySelector("main");
              return main !== null && (main.innerText ?? "").trim().length > 100;
            },
            { timeout: 30_000 },
          )
          .then(() => true)
          .catch(() => false);

        if (!resultVisible) {
          throw new Error(
            "action plan never rendered after completing quiz (main content stayed below 100 chars or status remained)",
          );
        }
      },
    },

    // ── Step 3: account dashboard ────────────────────────────────────────────
    {
      name: "account-dashboard",
      async run({ page, store, persona, config }) {
        await assertAccountPage(page, store, persona, config, "/account/dashboard", "dashboard");
      },
    },

    // ── Step 4: holdings ─────────────────────────────────────────────────────
    {
      name: "account-holdings",
      async run({ page, store, persona, config }) {
        await assertAccountPage(page, store, persona, config, "/account/holdings", "holdings");
      },
    },

    // ── Step 5: bookmarks ────────────────────────────────────────────────────
    {
      name: "account-bookmarks",
      async run({ page, store, persona, config }) {
        await assertAccountPage(page, store, persona, config, "/account/bookmarks", "bookmarks");
      },
    },

    // ── Step 6: advisor enquiry ───────────────────────────────────────────────
    {
      name: "advisor-enquiry",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + `/advisor/${ADVISOR_SLUG}`;
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status === 404) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "advisor profile 404 — seeded slug not found",
            detail: `GET /advisor/${ADVISOR_SLUG} → 404. ` +
              "The mock advisor seed (20260309_seed_mock_advisors.sql) may not have run on this target.",
            url,
            persona,
            signatureKey: "lifecycle:advisor:404",
          });
          return; // Can't test enquiry form without the profile.
        }
        if (status >= 400) {
          throw new Error(`/advisor/${ADVISOR_SLUG} returned ${status}`);
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        // Scroll to the contact form section.
        const contactSection = page.locator("#contact");
        await contactSection
          .scrollIntoViewIfNeeded()
          .catch(() => undefined);
        await page.waitForTimeout(500);

        // Verify the form fields exist.
        const nameField = page.locator("#advisor-contact-name");
        const emailField = page.locator("#advisor-contact-email");
        const messageField = page.locator("#advisor-contact-message");

        if ((await nameField.count()) === 0 || (await emailField.count()) === 0) {
          store.add({
            severity: "high",
            category: "flow-failure",
            title: "advisor contact form fields missing",
            detail: "Expected #advisor-contact-name and #advisor-contact-email on the profile page.",
            url,
            persona,
            signatureKey: "lifecycle:advisor:form-missing",
          });
          throw new Error("contact form fields not found on advisor profile");
        }

        // Fill the form.
        await nameField.fill(BOT_NAME);
        await emailField.fill(BOT_EMAIL);
        if ((await messageField.count()) > 0) {
          await messageField.fill(
            "Hi, I am a pre-launch QA bot testing this form. Please ignore this enquiry.",
          );
        }

        // Submit (on protected: POST is mocked → {ok:true} → client sets formState=success;
        //         on sandbox: real lead row inserted against throwaway DB).
        const submitBtn = page.locator("button").filter({ hasText: /send enquiry/i });
        if ((await submitBtn.count()) === 0) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "advisor enquiry submit button not found",
            detail: 'Expected a button matching /send enquiry/i on the contact form.',
            url,
            persona,
            signatureKey: "lifecycle:advisor:no-submit",
          });
          return;
        }
        await submitBtn.first().click();

        // Wait for success confirmation (both targets: mock returns ok:true).
        const successVisible = await page
          .waitForFunction(
            () => {
              const contact = document.getElementById("contact");
              if (!contact) return false;
              const text = contact.innerText ?? "";
              return (
                text.includes("sent") ||
                text.includes("Thank you") ||
                text.includes("success") ||
                text.includes("Sent") ||
                text.includes("enquiry received")
              );
            },
            { timeout: 10_000 },
          )
          .then(() => true)
          .catch(() => false);

        if (!successVisible) {
          store.add({
            severity: "high",
            category: "flow-failure",
            title: "advisor enquiry form: success state not shown after submit",
            detail:
              "Submitted the contact form but no success confirmation appeared within 10 s. " +
              "The form may have errored silently.",
            url,
            persona,
            signatureKey: "lifecycle:advisor:no-success",
          });
        }
      },
    },

    // ── Step 7: notifications ─────────────────────────────────────────────────
    {
      name: "account-notifications",
      async run({ page, store, persona, config }) {
        await assertAccountPage(
          page, store, persona, config, "/account/notifications", "notifications",
        );
      },
    },
  ],
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Navigate to an authenticated account route and verify it renders real content
 * (not a login redirect, not a dead-end blank page).
 */
async function assertAccountPage(
  page: import("@playwright/test").Page,
  store: import("../findings/store").FindingStore,
  persona: string,
  config: import("../config").BotConfig,
  route: string,
  label: string,
): Promise<void> {
  const url = config.baseUrl.replace(/\/$/, "") + route;
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const status = res?.status() ?? 0;

  if (status >= 400) {
    throw new Error(`${route} returned HTTP ${status}`);
  }

  await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

  // Detect an auth redirect (landed on /login or /auth/*).
  const finalUrl = page.url();
  if (/\/(login|auth\/)/.test(finalUrl)) {
    store.add({
      severity: "critical",
      category: "flow-failure",
      title: `${label} redirected to login — auth state lost`,
      detail: `Expected ${route} to render for the authed bot persona, but was redirected to ${finalUrl}.`,
      url,
      persona,
      signatureKey: `lifecycle:${label}:auth-redirect`,
    });
    throw new Error(`${route} redirected to login`);
  }

  // Check the page rendered meaningful content.
  const bodyText = await page
    .locator("main, body")
    .first()
    .innerText()
    .catch(() => "");
  if (bodyText.trim().length < 30) {
    store.add({
      severity: "medium",
      category: "flow-failure",
      title: `${label} page rendered almost nothing`,
      detail: `${route} returned ${status} but <main> contained only ${bodyText.trim().length} chars.`,
      url,
      persona,
      signatureKey: `lifecycle:${label}:empty`,
    });
  }
}
