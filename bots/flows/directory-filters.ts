/**
 * Directory filter-interaction flow.
 *
 * The `components/directory/*` primitives (search, sort, filter panel, compare
 * bar, empty state, result count) are the shared backbone of every directory
 * page, but bots only ever *landed* on those pages — they never drove the
 * controls. This flow exercises the interaction surface on /advisors, the
 * richest consumer:
 *
 *   1. Baseline    — the list renders some results.
 *   2. Search miss — a gibberish query collapses to the EmptyState ("No
 *      results"), proving search filtering + the empty state both work.
 *   3. Clear       — clearing the search restores the full list (no stuck
 *      empty state).
 *   4. Sort        — changing the sort doesn't crash or empty the list.
 *   5. Compare     — selecting two cards surfaces the CompareBar shortlist
 *      (best-effort; soft-skips if the page exposes no compare toggles).
 *
 * Reads only — safe on the protected mirror.
 */

import type { Page } from "@playwright/test";
import type { Flow } from "./types";

const DIRECTORY_PATH = "/advisors";

/** Count rendered result cards via a few resilient selectors. */
async function resultCount(page: Page): Promise<number> {
  // Try, in order: explicit result-card markup, article cards, then the most
  // reliable signal on the advisor directory — links into individual profiles.
  const explicit = await page.locator("[data-result-card], main article").count().catch(() => 0);
  if (explicit > 0) return explicit;
  return page
    .locator('main a[href*="/advisor/"], main li a[href^="/advisors/"]')
    .count()
    .catch(() => 0);
}

async function hasEmptyState(page: Page): Promise<boolean> {
  if ((await page.locator('[aria-label="No results"]').count().catch(() => 0)) > 0) return true;
  const body = await page.locator("main").first().innerText().catch(() => "");
  return /no results|no advisers|nothing matched|no matches/i.test(body);
}

export const DIRECTORY_FILTERS_FLOW: Flow = {
  name: "directory-filters",
  description:
    "Drives search / sort / compare on the /advisors directory and asserts the empty state, clear, and compare-bar primitives behave.",
  steps: [
    {
      name: "directory-baseline",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + DIRECTORY_PATH;
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if ((res?.status() ?? 0) >= 400) {
          throw new Error(`${DIRECTORY_PATH} returned HTTP ${res?.status()}`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(500);
        const n = await resultCount(page);
        if (n === 0) {
          // No data on this target — record and stop; later steps need a list.
          store.add({
            severity: "low",
            category: "flow-failure",
            title: "advisor directory rendered no result cards",
            detail: `No result cards on ${DIRECTORY_PATH} — the directory may be unseeded on this target. Filter checks skipped.`,
            url,
            persona,
            signatureKey: "directory:no-baseline",
          });
          throw new Error("no baseline results to filter");
        }
      },
    },
    {
      name: "search-miss-empty-state",
      async run({ page, store, persona }) {
        const search = page.getByPlaceholder(/search name|search/i).first();
        if ((await search.count().catch(() => 0)) === 0) {
          throw new Error("no search input found on the directory");
        }
        await search.fill("zzqqxxnomatch12345");
        await page.waitForTimeout(700);
        if (!(await hasEmptyState(page)) && (await resultCount(page)) > 0) {
          store.add({
            severity: "medium",
            category: "directory",
            title: "directory search did not filter to an empty state",
            detail:
              "A gibberish query still returned result cards and showed no empty state. Either search isn't " +
              "filtering or the EmptyState primitive isn't wired — users get stale/irrelevant results.",
            url: page.url(),
            persona,
            signatureKey: "directory:search-no-empty",
          });
        }
      },
    },
    {
      name: "search-clear-restores",
      async run({ page, store, persona }) {
        const clear = page.locator('[aria-label="Clear search"]');
        if ((await clear.count().catch(() => 0)) > 0) {
          await clear.first().click().catch(() => undefined);
        } else {
          await page.getByPlaceholder(/search name|search/i).first().fill("").catch(() => undefined);
        }
        await page.waitForTimeout(700);
        if ((await resultCount(page)) === 0) {
          store.add({
            severity: "medium",
            category: "directory",
            title: "clearing the directory search did not restore results",
            detail: "After clearing the search the list stayed empty — a stuck empty state. The clear control or the filter reset is broken.",
            url: page.url(),
            persona,
            signatureKey: "directory:clear-stuck",
          });
        }
      },
    },
    {
      name: "sort-does-not-break",
      async run({ page, store, persona }) {
        const sort = page.locator("select").first();
        if ((await sort.count().catch(() => 0)) === 0) return; // no sort on this surface
        const before = await resultCount(page);
        const optionValues = await sort.locator("option").evaluateAll((opts) =>
          (opts as HTMLOptionElement[]).map((o) => o.value).filter(Boolean),
        );
        if (optionValues.length > 1) {
          await sort.selectOption(optionValues[optionValues.length - 1]!).catch(() => undefined);
          await page.waitForTimeout(700);
          const after = await resultCount(page);
          if (before > 0 && after === 0) {
            store.add({
              severity: "medium",
              category: "directory",
              title: "changing the sort emptied the directory",
              detail: `Sorting by "${optionValues[optionValues.length - 1]}" dropped the result count from ${before} to 0 — the sort handler is mutating the filtered set.`,
              url: page.url(),
              persona,
              signatureKey: "directory:sort-empties",
            });
          }
        }
      },
    },
    {
      name: "compare-bar-appears",
      async run({ page, store, persona }) {
        // Compare toggles are usually a checkbox or a "Compare" control per card.
        const toggles = page.locator(
          'input[type="checkbox"][aria-label*="ompare" i], button:has-text("Compare"), [aria-label*="add to compare" i]',
        );
        const count = await toggles.count().catch(() => 0);
        if (count < 2) {
          store.add({
            severity: "info",
            category: "directory",
            title: "compare toggles not present — compare-bar check skipped",
            detail: "Could not find at least two per-card compare toggles on the directory; the CompareBar interaction was not exercised.",
            url: page.url(),
            persona,
            signatureKey: "directory:compare-skip",
          });
          return;
        }
        await toggles.nth(0).click().catch(() => undefined);
        await toggles.nth(1).click().catch(() => undefined);
        await page.waitForTimeout(500);
        const bar = page.locator('[aria-label="Comparison shortlist"]');
        if ((await bar.count().catch(() => 0)) === 0) {
          store.add({
            severity: "medium",
            category: "directory",
            title: "CompareBar did not appear after selecting two items",
            detail: "Selected two compare toggles but the Comparison shortlist bar never rendered — the compare state isn't wired to the CompareBar primitive.",
            url: page.url(),
            persona,
            signatureKey: "directory:compare-no-bar",
          });
        }
      },
    },
  ],
};
