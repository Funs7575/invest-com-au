/**
 * BFS internal-link deep-crawler.
 *
 * Finds 404s and 5xx errors buried in nav / footer / related links by issuing
 * a HEAD request for each new internal URL discovered on the current page.
 *
 * Depth model: this function performs a single-level crawl (all links on the
 * current page). Callers that want depth-2 coverage should navigate to child
 * pages and call this function again on each. The `maxDepth` option is
 * documented here for callers to use as a loop guard.
 *
 * Safety: only internal links are checked. The following paths are excluded to
 * avoid side effects:
 *   - Fragment-only hrefs (#)
 *   - mailto: / tel: links
 *   - /api/* (server actions / route handlers)
 *   - /go/* (affiliate redirect — would write a click row on HEAD)
 *   - /_next/* (internal Next.js assets)
 */

import type { Page } from "@playwright/test";
import type { BotConfig } from "../config";
import type { FindingStore } from "../findings/store";

export interface DeepCrawlOptions {
  /** Shared set of already-visited URLs (dedupes across multiple calls). */
  visitedUrls: Set<string>;
  /**
   * Maximum BFS depth. Documented for callers that loop over child pages.
   * This function itself always performs a single-level crawl; call it
   * repeatedly on child pages to achieve deeper coverage.
   */
  maxDepth?: number;
  /** Hard cap on total new URLs checked across this call (default: 50). */
  maxLinks?: number;
}

/**
 * Collect all href attributes from anchor elements on the current page,
 * returning them as raw strings (absolute or relative).
 */
async function getRawHrefs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]")).map(
      (el) => (el as HTMLAnchorElement).getAttribute("href") ?? "",
    ),
  );
}

/** Patterns that are never safe to HEAD-fetch in the bot fleet. */
const EXCLUDED_PATTERNS = [
  /^#/,           // fragment-only
  /^mailto:/i,    // email links
  /^tel:/i,       // phone links
  /^javascript:/i,// inline JS
  /^\/api\//,     // API routes — may have side effects
  /^\/go\//,      // affiliate redirect — writes click row on GET/HEAD
  /^\/_next\//,   // Next.js internal assets
];

function isExcluded(pathname: string): boolean {
  return EXCLUDED_PATTERNS.some((re) => re.test(pathname));
}

/**
 * Deep-crawl internal links found on the current page, reporting any 404 or
 * 5xx responses as findings.
 *
 * @param page        - Playwright Page (the currently loaded page to crawl from)
 * @param config      - Bot configuration (provides baseUrl)
 * @param store       - Finding store to append results to
 * @param persona     - Persona name for attribution on findings
 * @param opts        - Crawl options (visitedUrls, maxDepth, maxLinks)
 */
export async function checkDeepLinks(
  page: Page,
  config: BotConfig,
  store: FindingStore,
  persona: string,
  opts: DeepCrawlOptions,
): Promise<void> {
  const maxLinks = opts.maxLinks ?? 50;

  let origin: string;
  try {
    origin = new URL(config.baseUrl).origin;
  } catch {
    // Malformed baseUrl — can't build absolute URLs, bail out.
    return;
  }

  const rawHrefs = await getRawHrefs(page).catch(() => [] as string[]);

  let checkedCount = 0;

  for (const href of rawHrefs) {
    if (checkedCount >= maxLinks) break;
    if (!href) continue;

    // Normalise to absolute URL.
    let pathname: string;
    try {
      const abs = new URL(href, config.baseUrl);
      // Only follow same-origin links.
      if (abs.origin !== origin) continue;
      pathname = abs.pathname;
    } catch {
      // Relative path without a leading slash or malformed — skip.
      continue;
    }

    // Skip excluded path patterns.
    if (isExcluded(pathname)) continue;

    // Skip fragment / query-only references.
    if (href.startsWith("#")) continue;

    // Always mark as visited (whether we check it or not) to avoid
    // re-examining the same path from a different page.
    if (opts.visitedUrls.has(pathname)) continue;
    opts.visitedUrls.add(pathname);

    checkedCount += 1;
    const absoluteUrl = origin + pathname;

    try {
      const res = await page.request.fetch(absoluteUrl, {
        method: "HEAD",
        timeout: 8_000,
      });
      const status = res.status();

      if (status === 404) {
        store.add({
          severity: "high",
          category: "broken-link",
          title: `dead link: ${pathname}`,
          detail: `Internal link to ${pathname} (found on ${page.url()}) returned HTTP 404.`,
          url: page.url(),
          persona,
          signatureKey: `dead-link:${pathname}`,
        });
      } else if (status >= 500) {
        store.add({
          severity: "critical",
          category: "http-error",
          title: `server error on linked page: ${pathname} → ${status}`,
          detail:
            `Internal link to ${pathname} (found on ${page.url()}) returned HTTP ${status}.`,
          url: page.url(),
          persona,
          signatureKey: `server-error:${pathname}:${status}`,
        });
      }
    } catch {
      // Network-level failures (DNS, timeout, abort) are not emitted here —
      // the shallow links.ts check covers unreachable-link detection.
      // Silently continue so one flaky fetch doesn't abort the whole crawl.
    }
  }
}
