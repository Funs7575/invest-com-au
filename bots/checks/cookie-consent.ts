/**
 * Cookie consent and pre-consent analytics isolation checker.
 *
 * Regulatory background: Australia's Privacy Act 1988 (and the proposed
 * Privacy Act reform aligning closer to GDPR) requires that tracking
 * technologies are not activated until the user has been given a meaningful
 * choice. GDPR-equivalent compliance (relevant because AUS visitors include
 * EU residents) requires an explicit opt-in before analytics fire.
 *
 * This check spins up a *fresh* browser context (no cookies, no storage state)
 * to simulate a genuine first-time visit and then:
 *
 *   Check 1 — Consent banner presence.
 *     A consent banner must be visible on first load before the user interacts.
 *     Absence is a medium compliance finding.
 *
 *   Check 2 — Analytics before consent.
 *     PostHog and GA/GTM must NOT be fully initialised (capturing active) until
 *     consent is given. If either is running on the fresh page, that is a high
 *     compliance finding.
 *
 * Unlike the other checks this function accepts a `Browser` instance so it
 * can manage its own isolated context and close it when done.
 */

import type { Browser } from "@playwright/test";
import type { FindingStore } from "../findings/store";

interface AnalyticsState {
  posthogCapturing: boolean;
  gtagPresent: boolean;
  dataLayerPresent: boolean;
}

export async function checkCookieConsent(
  browser: Browser,
  baseUrl: string,
  store: FindingStore,
): Promise<void> {
  const persona = "cookie-consent-check";

  // Fresh context — no inherited cookies, localStorage, or storage state
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  const targetUrl = `${baseUrl.replace(/\/$/, "")}/`;

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // ── Check 1: Consent banner must be visible ────────────────────────────
    let bannerFound = false;
    try {
      await page
        .locator(
          '[data-testid*="consent"], [class*="cookie"], [id*="consent"], [class*="banner"]',
        )
        .first()
        .waitFor({ state: "visible", timeout: 3_000 });
      bannerFound = true;
    } catch {
      // Not visible within 3 s
    }

    if (!bannerFound) {
      store.add({
        severity: "medium",
        category: "compliance",
        title: "cookie consent: no consent banner found on first visit",
        detail:
          `A fresh (no-cookie) visit to ${targetUrl} did not reveal a cookie consent banner ` +
          `within 3 seconds. A consent mechanism is required before any tracking or analytics ` +
          `scripts are activated. Add a consent banner (e.g. via a CMP such as Cookiebot, ` +
          `Osano, or a custom component) that fires before PostHog/GA initialise.`,
        url: targetUrl,
        persona,
        signatureKey: "cookie:no-banner",
      });
    }

    // ── Check 2: Analytics must NOT be running before consent ──────────────
    let analyticsState: AnalyticsState;
    try {
      analyticsState = await page.evaluate((): AnalyticsState => {
        const win = window as Record<string, unknown>;

        // PostHog: capturing is active when opt_out_capturing_by_default is
        // explicitly false (i.e., the lib was init'd and capturing is on).
        // We check for the presence of the client AND that it is not opted out.
        const ph = win["posthog"] as Record<string, unknown> | undefined;
        let posthogCapturing = false;
        if (ph && typeof ph === "object") {
          // If posthog is present and has not been explicitly opted out, treat
          // it as capturing. The safest signal is checking
          // posthog.has_opted_out_capturing() or the opt_in_out cookie absence.
          const config = ph["config"] as Record<string, unknown> | undefined;
          const optedOut =
            typeof ph["has_opted_out_capturing"] === "function"
              ? (ph["has_opted_out_capturing"] as () => boolean)()
              : config?.["opt_out_capturing_by_default"] === true;
          posthogCapturing = !optedOut;
        }

        // GA4 / GTM: gtag function or dataLayer array being present means
        // the script has loaded and is ready to fire events.
        const gtagPresent = typeof win["gtag"] === "function";
        const dataLayerPresent = Array.isArray(win["dataLayer"]) && (win["dataLayer"] as unknown[]).length > 0;

        return { posthogCapturing, gtagPresent, dataLayerPresent };
      });
    } catch {
      // evaluate failed (page navigated away) — skip analytics check
      return;
    }

    const analyticsRunning =
      analyticsState.posthogCapturing ||
      analyticsState.gtagPresent ||
      analyticsState.dataLayerPresent;

    if (analyticsRunning) {
      const details: string[] = [];
      if (analyticsState.posthogCapturing) details.push("PostHog capturing active");
      if (analyticsState.gtagPresent) details.push("gtag() present");
      if (analyticsState.dataLayerPresent) details.push("dataLayer non-empty");

      store.add({
        severity: "high",
        category: "compliance",
        title: "cookie consent: analytics running before consent",
        detail:
          `On a fresh (no-cookie) visit to ${targetUrl}, analytics scripts were detected as ` +
          `active before any consent interaction: ${details.join(", ")}. ` +
          `Tracking must not fire until the user accepts cookies. Gate PostHog ` +
          `initialisation behind consent (posthog.opt_out_capturing() by default, then ` +
          `opt_in on accept) and delay GA/GTM script loading until consent is granted.`,
        url: targetUrl,
        persona,
        signatureKey: "cookie:analytics-before-consent",
        evidence: analyticsState as unknown as Record<string, unknown>,
      });
    }
  } finally {
    await context.close().catch(() => undefined);
  }
}
