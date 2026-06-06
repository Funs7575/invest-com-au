/**
 * Mobile-viewport flow.
 *
 * Webkit/mobile-safari are configured in playwright but the a11y job is
 * chromium-only and the AI journeys run desktop, so no bot ever drove a journey
 * at a phone width — where the nav collapses to a hamburger and the directory
 * filters move into a slide-over drawer. This flow runs on a session created
 * with a 390×844 viewport and checks the things that only break on mobile:
 *
 *   1. No horizontal overflow — content wider than the viewport (the classic
 *      mobile bug: a stray fixed-width element forcing a sideways scroll).
 *   2. The hamburger menu opens and exposes navigation.
 *   3. The directory filter drawer opens (and Escape closes it).
 *
 * Reads only — safe on any target. Pair with a mobile viewport in the registry.
 */

import type { Page } from "@playwright/test";
import type { Flow } from "./types";

/** True if the document scrolls horizontally beyond the viewport. */
async function hasHorizontalOverflow(page: Page): Promise<{ overflow: boolean; scrollW: number; clientW: number }> {
  return page.evaluate(() => {
    const el = document.documentElement;
    const scrollW = el.scrollWidth;
    const clientW = el.clientWidth;
    return { overflow: scrollW > clientW + 2, scrollW, clientW };
  });
}

async function goto(page: Page, base: string, route: string): Promise<void> {
  const res = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 30_000 });
  if ((res?.status() ?? 0) >= 500) throw new Error(`${route} returned HTTP ${res?.status()} (mobile)`);
  await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

export const MOBILE_NAV_FLOW: Flow = {
  name: "mobile-nav",
  description:
    "Drives core surfaces at a phone viewport: checks for horizontal overflow, opens the hamburger menu, and opens/closes the directory filter drawer.",
  steps: [
    {
      name: "mobile-home-no-overflow",
      async run({ page, store, persona, config }) {
        const base = config.baseUrl.replace(/\/$/, "");
        await goto(page, base, "/");
        const { overflow, scrollW, clientW } = await hasHorizontalOverflow(page);
        if (overflow) {
          store.add({
            severity: "medium",
            category: "mobile",
            title: "home page scrolls horizontally on mobile",
            detail: `At a 390px viewport the document scrollWidth (${scrollW}px) exceeds the viewport (${clientW}px). A fixed-width element is forcing a sideways scroll.`,
            url: page.url(),
            persona,
            signatureKey: "mobile:overflow:/",
          });
        }
      },
    },
    {
      name: "mobile-hamburger-opens",
      async run({ page, store, persona }) {
        const toggle = page.getByRole("button", { name: /open menu|menu/i }).first();
        if ((await toggle.count().catch(() => 0)) === 0) {
          store.add({
            severity: "high",
            category: "mobile",
            title: "no mobile menu toggle found",
            detail: "At phone width there was no hamburger/menu button — primary navigation may be unreachable on mobile.",
            url: page.url(),
            persona,
            signatureKey: "mobile:no-hamburger",
          });
          throw new Error("no mobile menu toggle");
        }
        await toggle.click().catch(() => undefined);
        await page.waitForTimeout(400);
        // After opening, navigation links should be visible.
        const navLinks = await page.locator("nav a:visible, [role=dialog] a:visible").count().catch(() => 0);
        if (navLinks < 3) {
          store.add({
            severity: "high",
            category: "mobile",
            title: "mobile menu opened but exposed no navigation",
            detail: `Tapped the menu toggle but only ${navLinks} visible nav links appeared. The mobile menu may not be opening or is empty.`,
            url: page.url(),
            persona,
            signatureKey: "mobile:menu-empty",
          });
        }
      },
    },
    {
      name: "mobile-filter-drawer",
      async run({ page, store, persona, config }) {
        const base = config.baseUrl.replace(/\/$/, "");
        await goto(page, base, "/advisors");

        const { overflow, scrollW, clientW } = await hasHorizontalOverflow(page);
        if (overflow) {
          store.add({
            severity: "medium",
            category: "mobile",
            title: "advisor directory scrolls horizontally on mobile",
            detail: `/advisors scrollWidth ${scrollW}px exceeds the ${clientW}px viewport — a card or filter row is overflowing.`,
            url: page.url(),
            persona,
            signatureKey: "mobile:overflow:/advisors",
          });
        }

        const opener = page.getByRole("button", { name: /filters?/i }).first();
        if ((await opener.count().catch(() => 0)) === 0) {
          store.add({
            severity: "low",
            category: "mobile",
            title: "no filter-drawer trigger on mobile directory",
            detail: "Could not find a Filters button to open the mobile filter drawer; drawer interaction not exercised.",
            url: page.url(),
            persona,
            signatureKey: "mobile:no-filter-trigger",
          });
          return;
        }
        await opener.click().catch(() => undefined);
        await page.waitForTimeout(400);
        const drawerOpen =
          (await page.locator('[role="dialog"], [aria-label="Close filters"], [aria-label="Close filter drawer"]').count().catch(() => 0)) > 0;
        if (!drawerOpen) {
          store.add({
            severity: "medium",
            category: "mobile",
            title: "filter drawer did not open on mobile",
            detail: "Tapped Filters but no slide-over drawer (role=dialog) appeared — the mobile filter UX is broken.",
            url: page.url(),
            persona,
            signatureKey: "mobile:drawer-no-open",
          });
          return;
        }
        // Escape should close the drawer (FilterPanel wires Escape-to-close).
        await page.keyboard.press("Escape").catch(() => undefined);
        await page.waitForTimeout(300);
        const stillOpen = (await page.locator('[role="dialog"]').count().catch(() => 0)) > 0;
        if (stillOpen) {
          store.add({
            severity: "low",
            category: "mobile",
            title: "filter drawer did not close on Escape",
            detail: "The mobile filter drawer stayed open after pressing Escape — keyboard dismissal is broken.",
            url: page.url(),
            persona,
            signatureKey: "mobile:drawer-no-escape",
          });
        }
      },
    },
  ],
};
