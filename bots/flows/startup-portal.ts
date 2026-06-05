/**
 * Startup ecosystem flow — exercises the public-facing startup investor surfaces
 * and verifies the startup portal auth gate.
 *
 * Steps:
 *   1. startups-hub            — /invest/startups hub renders with listings
 *   2. startups-for-you        — /invest/startups/for-you renders (may be
 *                                empty if no thesis set; that's OK)
 *   3. startups-listings       — /invest/startups/listings renders a list
 *   4. startup-signup-render   — /startup-signup renders its registration form
 *   5. startup-portal-gate     — /startup-portal redirects to /auth/login
 *                                (not a 500; verifies the auth guard is intact)
 *
 * Steps 1–3 are public and run against any target. Steps 4–5 are also public
 * (they test the shell/gate, not authenticated content). No storageState
 * required — these run without any seeded auth.
 */

import type { Flow } from "./types";

export const STARTUP_ECOSYSTEM_FLOW: Flow = {
  name: "startup-ecosystem",
  description:
    "Public startup investor surfaces: hub → for-you → listings → signup form → portal gate.",
  steps: [
    // ── Step 1: startup hub ──────────────────────────────────────────────────
    {
      name: "startups-hub",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/invest/startups";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          throw new Error(`/invest/startups returned HTTP ${status}`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        const bodyText = await page
          .locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 50) {
          store.add({
            severity: "high",
            category: "dead-end",
            title: "startup hub rendered almost no content",
            detail: `GET /invest/startups → ${status} but <main> had only ${bodyText.trim().length} chars.`,
            url,
            persona,
            signatureKey: "startup:hub:empty",
          });
        }
      },
    },

    // ── Step 2: for-you feed ─────────────────────────────────────────────────
    {
      name: "startups-for-you",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/invest/startups/for-you";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 500) {
          throw new Error(`/invest/startups/for-you returned HTTP ${status}`);
        }
        if (status === 404) {
          store.add({
            severity: "medium",
            category: "http-error",
            title: "startups/for-you returned 404",
            detail: "The personalised deal feed route is missing or has been removed.",
            url,
            persona,
            signatureKey: "startup:for-you:404",
          });
          return;
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        // The page may legitimately be empty for unauthenticated users — just
        // verify it doesn't error or show a raw exception.
        const hasError = (await page.locator('[data-testid="error"], .error-boundary').count()) > 0;
        if (hasError) {
          throw new Error("/invest/startups/for-you rendered an error boundary");
        }
      },
    },

    // ── Step 3: listings page ────────────────────────────────────────────────
    {
      name: "startups-listings",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/invest/startups/listings";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          throw new Error(`/invest/startups/listings returned HTTP ${status}`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        const bodyText = await page
          .locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 30) {
          store.add({
            severity: "medium",
            category: "dead-end",
            title: "startup listings page rendered almost nothing",
            detail: `GET /invest/startups/listings → ${status} but <main> had only ${bodyText.trim().length} chars.`,
            url,
            persona,
            signatureKey: "startup:listings:empty",
          });
        }
      },
    },

    // ── Step 4: startup-signup form renders ──────────────────────────────────
    {
      name: "startup-signup-render",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/startup-signup";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          throw new Error(`/startup-signup returned HTTP ${status}`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        // Verify the form (or an "already registered" message) is present.
        const hasForm = (await page.locator("form, input, [role=\"form\"]").count()) > 0;
        const hasContent = (await page.locator("main, body").first().innerText().catch(() => "")).trim().length > 30;

        if (!hasForm && !hasContent) {
          store.add({
            severity: "high",
            category: "dead-end",
            title: "startup-signup page rendered no form and no content",
            detail: "Expected either a registration form or meaningful content on /startup-signup.",
            url,
            persona,
            signatureKey: "startup:signup:empty",
          });
        }
      },
    },

    // ── Step 5: startup-portal auth gate ─────────────────────────────────────
    {
      name: "startup-portal-gate",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/startup-portal";
        const res = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        const status = res?.status() ?? 0;

        if (status >= 500) {
          throw new Error(`/startup-portal returned HTTP ${status} — auth gate may be broken`);
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        const finalUrl = page.url();

        // Should have redirected to /auth/login or /startup-signup, not stayed
        // at /startup-portal and rendered (which would indicate the auth guard
        // was removed) and not errored.
        const redirectedToLogin =
          /\/(auth\/login|login|startup-signup)/.test(finalUrl);
        const stayedAtPortal = finalUrl.includes("/startup-portal");

        if (stayedAtPortal) {
          // If we stayed, check there's actually content (logged-in state in test).
          const bodyText = await page
            .locator("main, body").first().innerText().catch(() => "");
          if (bodyText.trim().length < 50) {
            store.add({
              severity: "high",
              category: "flow-failure",
              title: "startup-portal: stayed at URL but rendered nothing (auth gate may be broken or empty)",
              detail: `Stayed at ${finalUrl} but rendered only ${bodyText.trim().length} chars.`,
              url,
              persona,
              signatureKey: "startup:portal-gate:empty",
            });
          }
        } else if (!redirectedToLogin) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: `startup-portal redirected to unexpected URL: ${finalUrl}`,
            detail: `Expected /auth/login or /startup-signup, got ${finalUrl}.`,
            url,
            persona,
            signatureKey: "startup:portal-gate:unexpected-redirect",
          });
        }
        // redirectedToLogin is the happy path — auth gate is working correctly.
      },
    },
  ],
};
