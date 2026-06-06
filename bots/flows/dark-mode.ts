/**
 * Dark-mode a11y flow.
 *
 * Dark mode shipped with hand-found findings (`bots/findings/r2-2-dark-mode.md`)
 * but no bot ever drove a journey *in* dark mode, so contrast regressions
 * (invisible text, failing focus rings) were only caught by eye. This flow runs
 * on a session created with `colorScheme: "dark"` + a pinned `theme=dark`
 * preference, so the whole journey renders under the dark palette. For each
 * core surface it:
 *
 *   1. Asserts the dark class is actually applied (`<html class="dark">`) — a
 *      regression where the theme silently falls back to light is itself a bug.
 *   2. Re-runs the same axe a11y audit the light-mode personas run, which
 *      surfaces dark-palette-specific colour-contrast violations.
 *
 * Reads only — safe on any target.
 */

import type { Page } from "@playwright/test";
import type { Flow } from "./types";
import { runAxe } from "../checks/a11y";

/** Core surfaces worth re-auditing under the dark palette. */
export const DARK_MODE_ROUTES = ["/", "/compare", "/advisors", "/get-matched"] as const;

async function darkApplied(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.classList.contains("dark"));
}

export const DARK_MODE_FLOW: Flow = {
  name: "dark-mode",
  description:
    "Walks core surfaces with the dark palette forced and re-runs the a11y audit to catch dark-mode contrast regressions.",
  steps: DARK_MODE_ROUTES.map((route) => ({
    name: `dark-mode ${route}`,
    async run({ page, store, persona, config }) {
      const url = config.baseUrl.replace(/\/$/, "") + route;
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if ((res?.status() ?? 0) >= 500) {
        throw new Error(`${route} returned HTTP ${res?.status()} in dark mode`);
      }
      await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
      await page.waitForTimeout(300);

      if (!(await darkApplied(page))) {
        store.add({
          severity: "medium",
          category: "dark-mode",
          title: `dark theme not applied on ${route}`,
          detail:
            `The session pinned theme=dark + prefers-color-scheme: dark, but <html> has no "dark" class on ` +
            `${route}. The theme is silently falling back to light — the inline theme script or ThemeProvider ` +
            "isn't honouring the stored preference here.",
          url,
          persona,
          signatureKey: `dark-mode:not-applied:${route}`,
        });
      }

      // Re-run the a11y audit; contrast violations here are dark-mode specific.
      await runAxe(page, store, persona);
    },
  })),
};
