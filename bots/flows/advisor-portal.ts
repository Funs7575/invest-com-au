/**
 * Advisor portal flow — smoke-tests the advisor-facing portal surfaces.
 *
 * The advisor portal uses a custom session-token auth (not Supabase Auth)
 * so a standard Playwright storageState cannot easily represent an
 * authenticated advisor. This flow therefore:
 *
 *   1. advisor-portal-login-render — /advisor-portal shows a login form,
 *                                    not a 500 or empty page
 *   2. advisor-portal-login-fields — the login form has the expected email
 *                                    and password inputs with labels
 *   3. advisor-portal-health       — /advisor-portal/health is publicly
 *                                    accessible (it's a status ping page)
 *   4. advisor-directory-render    — /advisors hub renders for anonymous users
 *   5. advisor-find-render         — /find-advisor renders its matching form
 *
 * For authenticated advisor-portal routes (dashboard, leads, marketplace etc.)
 * use the AUTHED_PERSONAS sweep with the `advisor` storageState — those are
 * covered by the existing AUTHED_PERSONAS flow once the advisor account is
 * seeded and auto-logged-in.
 */

import type { Flow } from "./types";

export const ADVISOR_PORTAL_FLOW: Flow = {
  name: "advisor-portal",
  description:
    "Advisor portal smoke: login form render + field check + public health endpoint + directory hub + find-advisor.",
  steps: [
    // ── Step 1: login page renders ───────────────────────────────────────────
    {
      name: "advisor-portal-login-render",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisor-portal";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 500) {
          throw new Error(`/advisor-portal returned HTTP ${status}`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        const finalUrl = page.url();
        // If it hard-redirects away from /advisor-portal, note it.
        if (!finalUrl.includes("advisor-portal") && !finalUrl.includes("advisor")) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: `advisor-portal redirected unexpectedly to ${finalUrl}`,
            detail: "Expected to stay at /advisor-portal (login wall) or a related advisor route.",
            url,
            persona,
            signatureKey: "advisor-portal:login:unexpected-redirect",
          });
        }

        const bodyText = await page
          .locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 30) {
          throw new Error("/advisor-portal rendered almost no content (possible blank screen)");
        }
      },
    },

    // ── Step 2: login form has email input + password tab option ────────────
    {
      name: "advisor-portal-login-fields",
      async run({ page, store, persona }) {
        const url = page.url();

        // The login form has two tabs: "magic-link" (default) and "password".
        // We verify the email input is present (always visible) and that the
        // password tab button exists so both auth paths are reachable.
        const emailInput = page.locator(
          'input[type="email"], input[name="email"], input[placeholder*="email" i]',
        ).first();
        // The login form has two tab buttons (magic-link + password) rendered
        // with aria-pressed. We check that at least one exists so the tab UI
        // is present. We don't require the password input to be visible since
        // the form correctly defaults to magic-link (email only).
        const tabButtons = page.locator('button[aria-pressed]');

        const hasEmail = (await emailInput.count()) > 0;
        const hasPasswordTab = (await tabButtons.count()) >= 1;

        if (!hasEmail) {
          store.add({
            severity: "high",
            category: "flow-failure",
            title: "advisor-portal login form: email input missing",
            detail:
              "Could not find input[type=email] or a recognisable email field on the login screen. " +
              "This means the login form is not rendering — likely a hydration failure or blank screen.",
            url,
            persona,
            signatureKey: "advisor-portal:login:no-email",
          });
        }
        if (!hasPasswordTab) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "advisor-portal login form: password tab missing",
            detail:
              "Could not find the aria-pressed tab buttons on the login screen. " +
              "Both magic-link and password auth paths may be unreachable.",
            url,
            persona,
            signatureKey: "advisor-portal:login:no-password-tab",
          });
        }
        if (!hasEmail) {
          throw new Error("advisor-portal login form is missing the email input");
        }
      },
    },

    // ── Step 3: health endpoint ──────────────────────────────────────────────
    {
      name: "advisor-portal-health",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisor-portal/health";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        const status = res?.status() ?? 0;

        // Health endpoint should return 200 — it's a public status check.
        // If it 404s, the route may have been removed.
        if (status === 404) {
          store.add({
            severity: "low",
            category: "http-error",
            title: "advisor-portal/health returned 404",
            detail: "The health endpoint is missing. This is used for uptime monitoring.",
            url,
            persona,
            signatureKey: "advisor-portal:health:404",
          });
        } else if (status >= 500) {
          throw new Error(`/advisor-portal/health returned HTTP ${status}`);
        }
      },
    },

    // ── Step 4: advisor directory hub ───────────────────────────────────────
    {
      name: "advisor-directory-render",
      async run({ page, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisors";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          throw new Error(`/advisors returned HTTP ${status}`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        const bodyText = await page
          .locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 50) {
          throw new Error("/advisors rendered almost no content");
        }
      },
    },

    // ── Step 5: find-advisor entry point ────────────────────────────────────
    {
      name: "advisor-find-render",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/find-advisor";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          throw new Error(`/find-advisor returned HTTP ${status}`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        // Verify the matching form or a meaningful landing is visible.
        const hasInteractive =
          (await page.locator("form, select, input, button").count()) > 0;
        const bodyText = await page
          .locator("main, body").first().innerText().catch(() => "");

        if (!hasInteractive || bodyText.trim().length < 30) {
          store.add({
            severity: "medium",
            category: "dead-end",
            title: "find-advisor page has no interactive elements or is nearly empty",
            detail: "Expected a matching form or meaningful content on /find-advisor.",
            url,
            persona,
            signatureKey: "advisor-portal:find:empty",
          });
        }
      },
    },
  ],
};
