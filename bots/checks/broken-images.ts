/**
 * Broken image checker.
 *
 * Scans the rendered DOM for <img> elements whose load has completed but whose
 * natural dimensions are zero — the browser's canonical signal that the image
 * resource could not be decoded (404, CORS block, malformed src, etc.).
 *
 * Filtering:
 *   • data: URIs are skipped (always "valid" in the browser's eyes).
 *   • Inline SVGs and empty src attributes are skipped.
 *   • Images that are still loading (complete === false) are skipped — they
 *     may still succeed and re-checking on a later page visit is cheaper than
 *     waiting for every image on every page.
 *
 * Deduplication:
 *   Pass the same `opts.checkedSrcs` Set for the lifetime of a session so each
 *   broken src is reported only once regardless of how many pages it appears on.
 *   This mirrors the pattern used in affiliate-links.ts.
 *
 * Cap: at most 5 broken images are reported per page call to avoid flooding the
 * finding store on asset-heavy pages with a CDN outage.
 *
 * Called from BotSession.audit() for every visited page.
 */

import type { Page } from "@playwright/test";
import type { FindingStore } from "../findings/store";

const MAX_PER_PAGE = 5;

interface ImageInfo {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  alt: string;
  complete: boolean;
}

export interface BrokenImageOptions {
  /** Shared across the session to avoid duplicate findings per src. */
  checkedSrcs: Set<string>;
}

export async function checkBrokenImages(
  page: Page,
  store: FindingStore,
  persona: string,
  opts: BrokenImageOptions,
): Promise<void> {
  const pageUrl = page.url();

  let images: ImageInfo[];
  try {
    images = await page.evaluate((): ImageInfo[] => {
      return Array.from(document.querySelectorAll("img")).map((img) => ({
        src: img.src ?? "",
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        alt: (img.alt ?? "").trim().slice(0, 200),
        complete: img.complete,
      }));
    });
  } catch {
    return; // page may have navigated away
  }

  let reportedThisPage = 0;

  for (const img of images) {
    if (reportedThisPage >= MAX_PER_PAGE) break;

    const src = img.src;

    // Skip non-applicable images
    if (!src) continue;
    if (src.startsWith("data:")) continue;
    if (src.startsWith("data:image/svg+xml")) continue; // redundant but explicit

    // Skip still-loading images — may succeed later
    if (!img.complete) continue;

    // The broken signal: loaded but zero natural size
    const isBroken = img.naturalWidth === 0 && img.naturalHeight === 0;
    if (!isBroken) continue;

    // Dedup globally across the session
    if (opts.checkedSrcs.has(src)) continue;
    opts.checkedSrcs.add(src);

    reportedThisPage += 1;

    store.add({
      severity: "medium",
      category: "broken-link",
      title: `broken image: ${src}`,
      detail:
        `An <img> on ${pageUrl} has completed loading but has zero natural dimensions, ` +
        `indicating the resource could not be fetched or decoded. ` +
        `alt="${img.alt || "(none)"}". ` +
        `Check the src URL is correct, the asset exists in the CDN/public directory, ` +
        `and that CORS headers permit loading from this origin.`,
      url: pageUrl,
      persona,
      signatureKey: `broken-img:${src}`,
      evidence: {
        src,
        alt: img.alt,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      },
    });
  }
}
