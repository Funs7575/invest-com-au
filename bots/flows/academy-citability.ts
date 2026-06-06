/**
 * Academy / glossary citability crawl.
 *
 * The GEO-citability and JSON-LD-schema checks already run on every page a bot
 * lands on — but personas only ever touch a handful of content pages, so the
 * largest, most citation-valuable surface (the Academy, glossary, and Q&A
 * content trees) went almost entirely unmeasured. This flow walks each content
 * index, samples its child pages, and runs the existing citability + schema
 * checks across the sample — turning a per-page check into surface-wide
 * coverage where it matters most for AI answer-engine citation.
 *
 * It reuses `checkGeoCitability` + `checkSchemaMarkup` directly (no duplicated
 * logic) and caps the sample per section so runtime stays bounded.
 *
 * Reads only — safe on the protected mirror.
 */

import type { Page } from "@playwright/test";
import type { Flow, FlowStepContext } from "./types";
import { checkGeoCitability } from "../checks/geo-citability";
import { checkSchemaMarkup } from "../checks/schema-markup";

/** Content index → the href prefix its child pages share. */
export const CONTENT_SECTIONS: { index: string; childPrefix: string }[] = [
  { index: "/glossary", childPrefix: "/glossary/" },
  { index: "/academy", childPrefix: "/academy/" },
  { index: "/questions", childPrefix: "/questions/" },
];

/** Max child pages to sample per section (keeps the crawl bounded). */
export const SAMPLE_PER_SECTION = 8;

/** Collect up to `limit` same-section child links from the current page. */
async function collectChildLinks(page: Page, prefix: string, limit: number): Promise<string[]> {
  const hrefs = await page.evaluate((pfx) => {
    const out = new Set<string>();
    for (const a of Array.from(document.querySelectorAll("a[href]"))) {
      const href = a.getAttribute("href") ?? "";
      // Normalise to a pathname, ignore the bare index and deep query strings.
      let path = href;
      try {
        path = new URL(href, location.origin).pathname;
      } catch {
        /* relative already */
      }
      if (path.startsWith(pfx) && path.length > pfx.length) out.add(path);
    }
    return Array.from(out);
  }, prefix);
  return hrefs.slice(0, limit);
}

async function crawlSection(
  ctx: FlowStepContext,
  section: { index: string; childPrefix: string },
): Promise<void> {
  const { page, store, persona, config } = ctx;
  const base = config.baseUrl.replace(/\/$/, "");

  const res = await page.goto(base + section.index, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const status = res?.status() ?? 0;
  if (status >= 400) {
    // A missing index isn't fatal — note it and move on to the next section.
    store.add({
      severity: status >= 500 ? "high" : "low",
      category: "http-error",
      title: `content index ${section.index} returned HTTP ${status}`,
      detail: `Could not crawl ${section.index} for citability sampling.`,
      url: base + section.index,
      persona,
      signatureKey: `academy:index:${status}:${section.index}`,
    });
    return;
  }
  await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

  // Audit the index itself too.
  await checkGeoCitability(page, store, persona);
  await checkSchemaMarkup(page, store, persona);

  const links = await collectChildLinks(page, section.childPrefix, SAMPLE_PER_SECTION);
  if (links.length === 0) {
    store.add({
      severity: "info",
      category: "geo",
      title: `no child pages found under ${section.index}`,
      detail: `The index at ${section.index} exposed no ${section.childPrefix}* links to sample (unseeded target or a markup change).`,
      url: base + section.index,
      persona,
      signatureKey: `academy:no-children:${section.index}`,
    });
    return;
  }

  for (const path of links) {
    const child = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => null);
    if (!child || child.status() >= 400) continue;
    await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => undefined);
    await checkGeoCitability(page, store, persona);
    await checkSchemaMarkup(page, store, persona);
  }
}

export const ACADEMY_CITABILITY_FLOW: Flow = {
  name: "academy-citability",
  description:
    "Crawls the glossary / academy / questions content trees and runs the GEO-citability + JSON-LD schema checks across a sample of each, surfacing citability gaps at scale.",
  steps: CONTENT_SECTIONS.map((section) => ({
    name: `citability crawl ${section.index}`,
    run: (ctx) => crawlSection(ctx, section),
  })),
};
