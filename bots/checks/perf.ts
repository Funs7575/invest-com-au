/**
 * Performance sample collector + budget evaluator.
 *
 * Captures key Web Vitals-adjacent metrics from the browser after a page
 * visit using the Navigation Timing API and the Paint Timing API. Runs in
 * the Chromium context so performance.memory is available.
 *
 * Called from BotSession.visit() — one sample per route. Samples are stored
 * on the session and written to the shard so global-teardown can aggregate
 * them into a baseline table in the HTML report.
 *
 * After the run, evaluatePerfBudgets() checks aggregated samples against the
 * per-route budgets defined in PERF_BUDGETS. Violations are returned as
 * structured records and written to perf-violations.json in the run dir;
 * the bots-perf CI job fails if that file is non-empty.
 *
 * Pure functions: the only Playwright dependency is the Page handle in
 * capturePerfSample().
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

// ── Perf budget evaluation ─────────────────────────────────────────────────

/**
 * Per-route budget thresholds. Routes are matched by exact path first, then
 * by prefix (longest prefix wins). All values in milliseconds.
 *
 * FCP (First Contentful Paint) is measured directly via the Paint Timing API.
 * loadEventMs is used as a proxy for LCP (it's a conservative upper bound).
 */
export interface PerfBudget {
  /** Route path (exact) or prefix (ends with '/'). */
  route: string;
  /** Max FCP in ms. null = not checked. */
  fcpMs: number | null;
  /** Max load-event time in ms (LCP proxy). null = not checked. */
  loadEventMs: number | null;
}

export const PERF_BUDGETS: PerfBudget[] = [
  // Money pages — tightest budgets (Google "good" LCP: ≤ 2500ms)
  { route: "/compare",      fcpMs: 2500, loadEventMs: 3000 },
  { route: "/",             fcpMs: 2500, loadEventMs: 3000 },
  // Broker detail (prefix match — /broker/stake, /broker/cmc-markets …)
  { route: "/broker/",      fcpMs: 2500, loadEventMs: 3000 },
  // Advisor directory
  { route: "/advisors",     fcpMs: 2500, loadEventMs: 3000 },
  { route: "/find-advisor", fcpMs: 2500, loadEventMs: 3000 },
  // Content pillars — key GEO/SEO pages
  { route: "/share-trading",      fcpMs: 2500, loadEventMs: 3000 },
  { route: "/etfs",               fcpMs: 2500, loadEventMs: 3000 },
  { route: "/best-broker/",       fcpMs: 2500, loadEventMs: 3000 },
  { route: "/foreign-investment", fcpMs: 2500, loadEventMs: 3000 },
  // Account surfaces (authenticated) — slightly more lenient (SSR + auth)
  { route: "/account/",           fcpMs: 3000, loadEventMs: 4000 },
];

export interface PerfViolation {
  route: string;
  url: string;
  persona: string;
  metric: "fcpMs" | "loadEventMs";
  budget: number;
  actual: number;
  capturedAt: string;
}

/** Match a sample's route against the budget table (exact → prefix → null). */
function findBudget(route: string): PerfBudget | null {
  // Normalise: strip trailing slash (except root)
  const norm = route === "/" ? "/" : route.replace(/\/$/, "");

  // Exact match first
  const exact = PERF_BUDGETS.find((b) => b.route === norm || b.route === route);
  if (exact) return exact;

  // Prefix match (descending length → longest wins)
  const prefixes = PERF_BUDGETS.filter((b) => b.route.endsWith("/")).sort(
    (a, b) => b.route.length - a.route.length,
  );
  for (const b of prefixes) {
    if (norm.startsWith(b.route) || route.startsWith(b.route)) return b;
  }

  return null;
}

/**
 * Evaluate a flat array of PerfSamples against PERF_BUDGETS.
 * Returns one violation record per exceeded metric per sample.
 * Samples with null metric values are skipped (metric unavailable).
 */
export function evaluatePerfBudgets(samples: PerfSample[]): PerfViolation[] {
  const violations: PerfViolation[] = [];

  for (const s of samples) {
    const budget = findBudget(s.route);
    if (!budget) continue;

    if (budget.fcpMs !== null && s.fcpMs !== null && s.fcpMs > budget.fcpMs) {
      violations.push({
        route: s.route,
        url: s.url,
        persona: s.persona,
        metric: "fcpMs",
        budget: budget.fcpMs,
        actual: s.fcpMs,
        capturedAt: s.capturedAt,
      });
    }

    if (
      budget.loadEventMs !== null &&
      s.loadEventMs !== null &&
      s.loadEventMs > budget.loadEventMs
    ) {
      violations.push({
        route: s.route,
        url: s.url,
        persona: s.persona,
        metric: "loadEventMs",
        budget: budget.loadEventMs,
        actual: s.loadEventMs,
        capturedAt: s.capturedAt,
      });
    }
  }

  return violations;
}
