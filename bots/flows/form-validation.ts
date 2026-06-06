/**
 * Form-validation negative-path flow.
 *
 * Every form bot so far drove the *happy* path (fill valid fields → submit →
 * confirmation). Nothing exercised what happens on bad input — yet the app's
 * Zod schemas reject by default (`z.string().max(N)` → 400, never truncates;
 * see CLAUDE.md), so the question "does the UI degrade gracefully on invalid
 * input?" was untested.
 *
 * Drives the adviser enquiry form (the seeded `james-wong-sydney` profile, the
 * same target the lead-flows happy path uses) and checks the negative paths:
 *
 *   1. Empty submit  — required fields must BLOCK submission; a confirmation
 *      screen appearing with empty fields would be a validation bypass.
 *   2. Invalid email — a malformed address must not produce a success screen.
 *   3. Oversized text — a 20k-char message must not crash the page (no 5xx
 *      surfaced, the form stays responsive); on a real backend it should show a
 *      friendly error rather than a thrown screen.
 *
 * The lead write itself is mocked by the safety net, so no real enquiry is
 * created on any target.
 */

import type { Page } from "@playwright/test";
import type { Flow } from "./types";

const PROFILE_PATH = "/advisor/james-wong-sydney";
const CONFIRMATION_RE = /enquiry sent|thank you|we'?ll be in touch|message sent/i;

/** Open the enquiry form if it sits behind an "Enquire"/"Contact" button. */
async function openEnquiryForm(page: Page): Promise<boolean> {
  const nameInput = page.locator('input[placeholder="Full name"], input[name="name"]');
  if ((await nameInput.count().catch(() => 0)) > 0) return true;

  const opener = page.getByRole("button", { name: /enquire|contact|get in touch|send enquiry/i });
  if ((await opener.count().catch(() => 0)) > 0) {
    await opener.first().click({ timeout: 4000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
  }
  return (await nameInput.count().catch(() => 0)) > 0;
}

async function submit(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /send enquiry|submit|send/i });
  if ((await btn.count().catch(() => 0)) > 0) {
    await btn.first().click({ timeout: 4000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
  }
}

async function sawConfirmation(page: Page): Promise<boolean> {
  const body = await page.locator("main, body").first().innerText().catch(() => "");
  return CONFIRMATION_RE.test(body);
}

export const FORM_VALIDATION_FLOW: Flow = {
  name: "form-validation",
  description:
    "Submits empty, invalid-email, and oversized payloads to the adviser enquiry form and asserts each is handled gracefully (blocked / errored, never a crash or false confirmation).",
  steps: [
    {
      name: "enquiry-form-present",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + PROFILE_PATH;
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if ((res?.status() ?? 0) >= 500) {
          throw new Error(`${PROFILE_PATH} returned HTTP ${res?.status()}`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        const opened = await openEnquiryForm(page);
        if (!opened) {
          // Not a hard failure — the seed profile may be absent on this target.
          store.add({
            severity: "low",
            category: "flow-failure",
            title: "adviser enquiry form not found for negative-path testing",
            detail: `No enquiry form on ${PROFILE_PATH} (profile may not be seeded on this target). Negative-path checks skipped.`,
            url,
            persona,
            signatureKey: "form-validation:no-form",
          });
          throw new Error("enquiry form not found");
        }
      },
    },
    {
      name: "empty-submit-blocked",
      async run({ page, store, persona }) {
        await submit(page);
        if (await sawConfirmation(page)) {
          store.add({
            severity: "high",
            category: "form-validation",
            title: "adviser enquiry accepted an EMPTY submission",
            detail:
              "Submitting the enquiry form with no name/email produced a confirmation. Required-field " +
              "validation is being bypassed — junk leads with no contact details can be created.",
            url: page.url(),
            persona,
            signatureKey: "form-validation:empty-accepted",
          });
          throw new Error("empty submission was accepted");
        }
      },
    },
    {
      name: "invalid-email-rejected",
      async run({ page, store, persona }) {
        await page.locator('input[placeholder="Full name"], input[name="name"]').first()
          .fill("QA Bot (pre-launch test)").catch(() => undefined);
        await page.locator('input[placeholder="your@email.com"], input[type="email"], input[name="email"]').first()
          .fill("not-an-email").catch(() => undefined);
        const msg = page.locator("textarea").first();
        if ((await msg.count().catch(() => 0)) > 0) await msg.fill("Test message").catch(() => undefined);

        await submit(page);
        if (await sawConfirmation(page)) {
          store.add({
            severity: "high",
            category: "form-validation",
            title: "adviser enquiry accepted an invalid email",
            detail:
              'Submitting with email "not-an-email" produced a confirmation. The email field is not validated ' +
              "client- or server-side, so unreachable leads can be created.",
            url: page.url(),
            persona,
            signatureKey: "form-validation:bad-email-accepted",
          });
        }
      },
    },
    {
      name: "oversized-input-graceful",
      async run({ page, store, persona }) {
        const huge = "A".repeat(20_000);
        await page.locator('input[placeholder="Full name"], input[name="name"]').first()
          .fill("QA Bot").catch(() => undefined);
        await page.locator('input[placeholder="your@email.com"], input[type="email"], input[name="email"]').first()
          .fill("qa-bot@example.com").catch(() => undefined);
        const msg = page.locator("textarea").first();
        if ((await msg.count().catch(() => 0)) > 0) await msg.fill(huge).catch(() => undefined);

        // Track any 5xx the submit triggers (negative path must not crash).
        let serverError = false;
        const onResp = (r: import("@playwright/test").Response) => {
          if (r.status() >= 500) serverError = true;
        };
        page.on("response", onResp);
        await submit(page);
        page.off("response", onResp);

        if (serverError) {
          store.add({
            severity: "high",
            category: "form-validation",
            title: "oversized enquiry input triggered a 5xx",
            detail:
              "A 20k-character message caused a 5xx response. Zod's max-length rejection should surface as a " +
              "400 + friendly message, not a server crash. Read the body with safeParse and return a clean 400.",
            url: page.url(),
            persona,
            signatureKey: "form-validation:oversized-5xx",
          });
        }

        // The page must still be interactive (not a thrown error boundary).
        const stillInteractive = (await page.locator("input, textarea, button").count().catch(() => 0)) > 0;
        if (!stillInteractive) {
          store.add({
            severity: "medium",
            category: "form-validation",
            title: "form became unresponsive after oversized input",
            detail: "After submitting a 20k-char message the page had no interactive controls — likely an unhandled error boundary.",
            url: page.url(),
            persona,
            signatureKey: "form-validation:oversized-dead",
          });
        }
      },
    },
  ],
};
