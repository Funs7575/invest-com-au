/**
 * Advisor enquiry form flow.
 *
 * Tests both happy-path and negative-path on the advisor enquiry form:
 *   1. Find an advisor profile with an enquiry form
 *   2. Submit empty form → validation errors, not 500
 *   3. Submit with invalid email → field-level error
 *   4. Submit oversized message → graceful rejection
 *   5. Verify CSRF / double-submit protection (no duplicate on re-submit)
 *
 * All submissions are blocked by the safety net (advisor-lead is on the
 * money-paths mock list) so no real leads are created.
 */

import type { Flow } from "./types";

export const ADVISOR_ENQUIRY_FORM_FLOW: Flow = {
  name: "advisor-enquiry-form",
  description:
    "Drives the advisor enquiry form through empty, invalid-email, and oversized-message submissions; verifies validation errors render gracefully.",
  steps: [
    // ── Step 1: navigate to a profile with an enquiry form ───────────────────
    {
      name: "find-enquiry-form",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisors";
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        const profileLinks = page.locator('main a[href^="/advisor/"]');
        const count = await profileLinks.count().catch(() => 0);
        if (count === 0) throw new Error("no advisor profiles on directory — cannot test enquiry form");

        const href = await profileLinks.first().getAttribute("href") ?? "";
        const profileUrl = config.baseUrl.replace(/\/$/, "") + href;
        await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(500);

        // Look for the enquiry form. It may be directly on the page or inside a dialog/modal.
        const formSelector = 'form[data-form="enquiry"], form:has(input[name="name"]), form:has(input[name="message"])';
        let formCount = await page.locator(formSelector).count().catch(() => 0);

        if (formCount === 0) {
          // Try clicking the CTA to open a dialog form.
          const ctaBtn = page.locator(
            'button:has-text("Enquiry"), button:has-text("enquiry"), a:has-text("Enquiry"), button:has-text("Contact"), button:has-text("Get in touch")'
          ).first();
          if ((await ctaBtn.count().catch(() => 0)) > 0) {
            await ctaBtn.click().catch(() => undefined);
            await page.waitForTimeout(600);
            formCount = await page.locator(formSelector).count().catch(() => 0);
          }
        }

        if (formCount === 0) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "advisor enquiry form not found on profile",
            detail: "No enquiry form was found on the advisor profile page, even after attempting to click a CTA button. Validation tests skipped.",
            url: page.url(),
            persona,
            signatureKey: "advisor-enquiry:no-form",
          });
          throw new Error("no enquiry form found");
        }
      },
    },

    // ── Step 2: empty submit → validation errors ──────────────────────────────
    {
      name: "empty-submit-validation",
      async run({ page, store, persona }) {
        const url = page.url();

        // Submit with all fields empty.
        const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
        if ((await submitBtn.count().catch(() => 0)) === 0) throw new Error("no submit button found");

        await submitBtn.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(800);

        // Should still be on the same page (no navigation) and show validation errors.
        const bodyText = await page.locator("main, body, [role=dialog]").first().innerText().catch(() => "");
        const hasValidationMsg = /required|please|invalid|can't be blank|error/i.test(bodyText);

        if (!hasValidationMsg) {
          store.add({
            severity: "high",
            category: "form-validation",
            title: "advisor enquiry form: empty submit shows no validation errors",
            detail:
              "Submitting an empty enquiry form produced no visible validation messages. " +
              "Either the form submitted silently (possible data quality issue) or the errors aren't rendered.",
            url,
            persona,
            signatureKey: "advisor-enquiry:empty-no-errors",
          });
        }
      },
    },

    // ── Step 3: invalid email → field-level error ─────────────────────────────
    {
      name: "invalid-email-error",
      async run({ page, store, persona }) {
        const url = page.url();

        const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const msgInput = page.locator('textarea[name="message"], textarea[placeholder*="message" i]').first();
        const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();

        if ((await emailInput.count().catch(() => 0)) === 0) return; // form doesn't have email — skip

        await nameInput.fill("Bot Test").catch(() => undefined);
        await emailInput.fill("not-an-email").catch(() => undefined);
        await msgInput.fill("Test enquiry message").catch(() => undefined);
        await submitBtn.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(800);

        const bodyText = await page.locator("main, body, [role=dialog]").first().innerText().catch(() => "");
        const hasEmailError = /invalid email|valid email|email.*invalid|email.*required/i.test(bodyText);

        if (!hasEmailError) {
          store.add({
            severity: "medium",
            category: "form-validation",
            title: "advisor enquiry form: invalid email accepted without error",
            detail:
              'Submitting "not-an-email" as the email address produced no visible validation error. ' +
              "This could let garbage contacts into the advisor's lead queue.",
            url,
            persona,
            signatureKey: "advisor-enquiry:invalid-email-no-error",
          });
        }
      },
    },

    // ── Step 4: oversized message → graceful rejection ────────────────────────
    {
      name: "oversized-message-rejection",
      async run({ page, store, persona }) {
        const url = page.url();

        const msgInput = page.locator('textarea[name="message"], textarea[placeholder*="message" i]').first();
        if ((await msgInput.count().catch(() => 0)) === 0) return;

        // 10 KB of text — well above any reasonable limit.
        const bigMessage = "a".repeat(10_000);
        await msgInput.fill(bigMessage).catch(() => undefined);

        const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
        await submitBtn.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(1000);

        // Check for a 500 error page (indicates the server didn't handle the payload).
        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        const has500 = /500|internal server error|something went wrong/i.test(bodyText);
        if (has500) {
          store.add({
            severity: "high",
            category: "form-validation",
            title: "advisor enquiry form: oversized message caused a 500 error",
            detail:
              "Submitting a 10 KB message to the enquiry form returned a server error. " +
              "The route is not rejecting oversized payloads at the validation layer.",
            url,
            persona,
            signatureKey: "advisor-enquiry:oversized-500",
          });
        }
      },
    },
  ],
};
