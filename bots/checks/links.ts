/**
 * Broken-link check. Extracts same-origin links from the current page and
 * fetches a capped sample to catch 4xx/5xx targets.
 *
 * Safety: link fetches go through `page.request` (an API context that bypasses
 * the page-route safety net), so we must NOT fetch side-effecting paths. Every
 * candidate is run through `decide()` and skipped if it carries any side effect
 * (e.g. a `/go/*` redirect would write an affiliate click row on GET).
 */

import type { Page } from "@playwright/test";
import type { BotConfig } from "../config";
import type { FindingStore } from "../findings/store";
import { decide } from "../safety/money-paths";
import { normalizeUrl } from "../findings/types";

export async function extractInternalLinks(page: Page, origin: string): Promise<string[]> {
  const hrefs = await page.$$eval("a[href]", (els) =>
    els.map((el) => (el as HTMLAnchorElement).href),
  );
  const seen = new Set<string>();
  for (const href of hrefs) {
    try {
      const u = new URL(href);
      if (u.origin === origin) seen.add(u.pathname + u.search);
    } catch {
      // ignore malformed hrefs (mailto:, tel:, javascript:)
    }
  }
  return [...seen];
}

export interface LinkCheckOptions {
  /** Max new links to fetch on this page. */
  limit?: number;
  /** Shared set of already-checked pathnames (dedupes across a session). */
  checked: Set<string>;
}

export async function checkInternalLinks(
  page: Page,
  config: BotConfig,
  store: FindingStore,
  persona: string,
  opts: LinkCheckOptions,
): Promise<void> {
  let origin = "";
  try {
    origin = new URL(config.baseUrl).origin;
  } catch {
    return;
  }
  const policy = {
    targetClass: config.targetClass,
    mockAi: config.mockAi,
    allowDestructive: config.allowDestructive,
  };
  const limit = opts.limit ?? 12;
  const links = await extractInternalLinks(page, origin);
  let checkedNow = 0;

  for (const link of links) {
    if (checkedNow >= limit) break;
    const pathname = link.split("?")[0] ?? link;
    if (opts.checked.has(pathname)) continue;
    // Skip anything side-effecting — never trip a money path via a GET.
    if (decide(pathname, "GET", policy) !== null) continue;
    opts.checked.add(pathname);
    checkedNow += 1;

    try {
      const res = await page.request.get(origin + link, { maxRedirects: 5, timeout: 15_000 });
      const status = res.status();
      if (status >= 400) {
        store.add({
          severity: status >= 500 ? "critical" : "high",
          category: "broken-link",
          title: `${status} link → ${pathname}`,
          detail: `Internal link ${link} (found on ${page.url()}) returned HTTP ${status}.`,
          url: page.url(),
          persona,
          signatureKey: `${status}:${normalizeUrl(pathname)}`,
          evidence: { status, link },
        });
      }
    } catch (err) {
      store.add({
        severity: "medium",
        category: "broken-link",
        title: `unreachable link → ${pathname}`,
        detail: `Internal link ${link} could not be fetched: ${(err as Error).message}`,
        url: page.url(),
        persona,
        signatureKey: `unreachable:${normalizeUrl(pathname)}`,
      });
    }
  }
}
