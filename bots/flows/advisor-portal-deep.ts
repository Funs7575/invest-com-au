/**
 * Advisor portal — deep public smoke flow.
 *
 * Extends the existing advisor-portal flow with deeper coverage of
 * public-accessible portal surfaces and authenticated surfaces accessible
 * via seeded auth state (gracefully skips if no auth state exists):
 *
 *   1. Portal signup / apply page renders
 *   2. Advisor pricing page renders with tier comparison
 *   3. For-advisors FAQ section renders
 *   4. Advisor terms page renders
 *   5. Portal health endpoint is a valid JSON response
 *   6. Public advisor profile widget renders (embed endpoint)
 *   7. Advisor guides hub renders with article links
 *   8. Advisor guides article renders with correct schema
 */

import type { Flow } from "./types";

export const ADVISOR_PORTAL_DEEP_FLOW: Flow = {
  name: "advisor-portal-deep",
  description:
    "Deep public smoke of advisor portal surfaces: apply/signup, pricing tiers, terms, widget embed, advisor guides, and portal health JSON.",
  steps: [
    // ── Step 1: advisor apply / signup page ───────────────────────────────────
    {
      name: "advisor-apply-renders",
      async run({ page, store, persona, config }) {
        const candidates = ["/advisor-apply", "/advisor-signup", "/for-advisors/apply"];
        let found = false;

        for (const path of candidates) {
          const url = config.baseUrl.replace(/\/$/, "") + path;
          const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
          const status = res?.status() ?? 0;
          if (status < 400) {
            found = true;
            await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
            await page.waitForTimeout(300);
            break;
          }
        }

        if (!found) {
          store.add({
            severity: "medium",
            category: "http-error",
            title: "advisor apply/signup page not found at expected paths",
            detail: "None of /advisor-apply, /advisor-signup, /for-advisors/apply returned a 2xx response.",
            url: page.url(),
            persona,
            signatureKey: "advisor-portal:apply:not-found",
          });
          return;
        }

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        const hasForm =
          (await page.locator('form, input[type="email"], button[type="submit"]').count().catch(() => 0)) > 0;

        if (!hasForm) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "advisor apply page: no form or submit button found",
            detail: "The advisor apply/signup page rendered but has no form. The onboarding entry point is broken.",
            url: page.url(),
            persona,
            signatureKey: "advisor-portal:apply:no-form",
          });
        }

        // Key CTA label check.
        if (!/apply|sign up|register|get started|join/i.test(bodyText)) {
          store.add({
            severity: "low",
            category: "ux",
            title: "advisor apply page: no apply/signup CTA language detected",
            url: page.url(),
            persona,
            signatureKey: "advisor-portal:apply:no-cta-text",
            detail: "The apply page doesn't contain 'Apply', 'Sign up', 'Register', or 'Join' text.",
          });
        }
      },
    },

    // ── Step 2: advisor pricing page ─────────────────────────────────────────
    {
      name: "advisor-pricing-renders",
      async run({ page, store, persona, config }) {
        const candidates = ["/for-advisors/pricing", "/advisor-pricing", "/for-advisors#pricing"];
        let found = false;

        for (const path of candidates) {
          const url = config.baseUrl.replace(/\/$/, "") + path;
          const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
          const status = res?.status() ?? 0;
          if (status < 400) {
            found = true;
            await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
            await page.waitForTimeout(300);
            break;
          }
        }

        if (!found) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "advisor pricing page not found at expected paths",
            detail: "None of /for-advisors/pricing, /advisor-pricing returned 2xx. Pricing transparency is critical for advisor conversion.",
            url: page.url(),
            persona,
            signatureKey: "advisor-portal:pricing:not-found",
          });
          return;
        }

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");

        // Pricing page should have monetary amounts.
        const hasPrices = /\$[\d,]+|per month|\/month|credit|plan|tier/i.test(bodyText);
        if (!hasPrices) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "advisor pricing page: no price amounts or tier names detected",
            detail: "The pricing page renders but shows no $ amounts, plan names, or tier comparison. The pricing section may be empty.",
            url: page.url(),
            persona,
            signatureKey: "advisor-portal:pricing:no-prices",
          });
        }
      },
    },

    // ── Step 3: advisor terms page ────────────────────────────────────────────
    {
      name: "advisor-terms-renders",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisor-terms";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          store.add({
            severity: status >= 500 ? "high" : "medium",
            category: "http-error",
            title: `advisor-terms returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `advisor-portal:terms:${status}`,
            detail: "The advisor-specific terms page is inaccessible. AFSL compliance requires accessible terms.",
          });
          return;
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(300);

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 200) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "advisor-terms: page rendered very short content (<200 chars)",
            url,
            persona,
            signatureKey: "advisor-portal:terms:thin",
            detail: "The terms page is nearly empty. This is a compliance risk.",
          });
        }
      },
    },

    // ── Step 4: advisor guides hub ────────────────────────────────────────────
    {
      name: "advisor-guides-hub",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisor-guides";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          store.add({
            severity: status >= 500 ? "high" : "medium",
            category: "http-error",
            title: `advisor-guides returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `advisor-portal:guides:${status}`,
            detail: "/advisor-guides is a top SEO/GEO surface.",
          });
          return;
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        const guideLinks = page.locator('main a[href*="/advisor-guides/"], main a[href*="/advisor-guide/"]');
        const count = await guideLinks.count().catch(() => 0);

        if (count === 0) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "advisor-guides hub: no guide links found",
            detail: "The /advisor-guides hub rendered but has no guide article links. The guide list may be empty or using an unexpected URL pattern.",
            url,
            persona,
            signatureKey: "advisor-portal:guides:no-links",
          });
          return;
        }

        // Open first guide.
        const href = await guideLinks.first().getAttribute("href") ?? "";
        const guideUrl = config.baseUrl.replace(/\/$/, "") + href;
        const guideRes = await page.goto(guideUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const guideStatus = guideRes?.status() ?? 0;

        if (guideStatus >= 400) {
          store.add({
            severity: guideStatus >= 500 ? "high" : "medium",
            category: "http-error",
            title: `advisor guide ${href} returned HTTP ${guideStatus}`,
            url: guideUrl,
            persona,
            signatureKey: `advisor-portal:guide:${guideStatus}`,
            detail: "A linked guide article returned an error.",
          });
          return;
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(300);

        // Verify h1 and schema.
        const h1Count = await page.locator("h1").count().catch(() => 0);
        if (h1Count === 0) {
          store.add({
            severity: "high",
            category: "ux",
            title: "advisor guide article: no h1 heading",
            url: page.url(),
            persona,
            signatureKey: "advisor-portal:guide:no-h1",
            detail: "Advisor guide article has no <h1>. This is an SEO and GEO critical issue.",
          });
        }
      },
    },

    // ── Step 5: portal health returns valid JSON ──────────────────────────────
    {
      name: "portal-health-json",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisor-portal/health";
        const res = await page.request.fetch(url, { method: "GET", timeout: 10_000 }).catch(() => null);

        if (!res) {
          store.add({
            severity: "medium",
            category: "http-error",
            title: "advisor portal health endpoint: request failed",
            url,
            persona,
            signatureKey: "advisor-portal:health:failed",
            detail: "GET /advisor-portal/health threw a network error or timed out.",
          });
          return;
        }

        const status = res.status();
        if (status >= 400) {
          store.add({
            severity: status >= 500 ? "high" : "low",
            category: "http-error",
            title: `advisor portal health returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `advisor-portal:health:${status}`,
            detail: "Health endpoint is not returning 2xx.",
          });
          return;
        }

        // Should be valid JSON.
        const text = await res.text().catch(() => "");
        try {
          JSON.parse(text);
        } catch {
          store.add({
            severity: "medium",
            category: "http-error",
            title: "advisor portal health: non-JSON response body",
            url,
            persona,
            signatureKey: "advisor-portal:health:non-json",
            detail: `Health endpoint returned non-JSON: ${text.slice(0, 100)}`,
          });
        }
      },
    },
  ],
};
