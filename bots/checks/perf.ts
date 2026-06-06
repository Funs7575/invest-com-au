/**
 * Performance sample collector.
 *
 * Captures key Web Vitals-adjacent metrics from the browser after a page
 * visit using the Navigation Timing API and the Paint Timing API. Runs in
 * the Chromium context so performance.memory is available.
 *
 * Called from BotSession.visit() — one sample per route. Samples are stored
 * on the session and written to the shard so global-teardown can aggregate
 * them into a baseline table in the HTML report.
 *
 * Pure function: the only Playwright dependency is the Page handle.
 */

import type { Page } from "@playwright/test";

export interface PerfSample {
  /** Full URL that was navigated to. */
  url: string;
  /** Path portion only (for display). */
  route: string;
  /** Bot persona that captured this sample. */
  persona: string;
  /** Time from navigation start to DOMContentLoaded (ms). */
  domContentLoadedMs: number | null;
  /** Time from navigation start to load event (ms). */
  loadEventMs: number | null;
  /** First Contentful Paint (ms from navigation start). */
  fcpMs: number | null;
  /** JS heap in use at time of capture (KB). Chrome-only. */
  jsHeapKb: number | null;
  /** ISO timestamp when the sample was taken. */
  capturedAt: string;
}

interface BrowserTimings {
  domContentLoadedMs: number | null;
  loadEventMs: number | null;
  fcpMs: number | null;
  jsHeapKb: number | null;
}

/**
 * Capture a performance sample from the current page state.
 * Must be called *after* `waitForLoadState("load")` so timing entries are populated.
 * Returns null if the page is blank or the evaluate call fails.
 */
export async function capturePerfSample(
  page: Page,
  persona: string,
): Promise<PerfSample | null> {
  try {
    const timings = await page.evaluate((): BrowserTimings => {
      const t = performance.timing;
      const navStart = t.navigationStart;
      if (!navStart) return { domContentLoadedMs: null, loadEventMs: null, fcpMs: null, jsHeapKb: null };

      const paint = performance.getEntriesByType("paint");
      const fcpEntry = paint.find((p) => p.name === "first-contentful-paint");

      // performance.memory is a Chrome extension — cast carefully.
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

      return {
        domContentLoadedMs: t.domContentLoadedEventEnd > navStart
          ? t.domContentLoadedEventEnd - navStart
          : null,
        loadEventMs: t.loadEventEnd > navStart
          ? t.loadEventEnd - navStart
          : null,
        fcpMs: fcpEntry ? Math.round(fcpEntry.startTime) : null,
        jsHeapKb: mem ? Math.round(mem.usedJSHeapSize / 1024) : null,
      };
    });

    const url = page.url();
    let route = url;
    try {
      route = new URL(url).pathname;
    } catch {
      /* keep full url */
    }

    return {
      url,
      route,
      persona,
      ...timings,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    // evaluate can fail on navigated-away pages, error pages, etc.
    return null;
  }
}
