/**
 * GEO (Generative Engine Optimisation) citability check.
 *
 * Evaluates whether a page is well-positioned to be cited by AI answer
 * engines (Google AI Overviews, ChatGPT, Perplexity, etc.). Scores each
 * page against a set of citation-readiness signals and emits findings for
 * gaps.
 *
 * Signals checked:
 *   1. JSON-LD schema present (schema types, @context)
 *   2. Speakable schema present (marks answer-first DOM region)
 *   3. Answer-first H1 / lead paragraph (starts with a direct statement,
 *      not a question or vague intro)
 *   4. FAQPage schema present (structured Q&A = citability gold)
 *   5. Page title contains the year (freshness signal for AI rankers)
 *
 * Called from BotSession.audit() for every visited page.
 */

import type { Page } from "@playwright/test";
import type { FindingStore } from "../findings/store";

/** Pages where GEO checks are most impactful (prefix or exact match). */
const GEO_PRIORITY_ROUTES = new Set([
  "/compare",
  "/share-trading",
  "/etfs",
  "/advisors",
  "/super",
  "/savings",
  "/foreign-investment",
  "/glossary",
  "/questions",
  "/article",
  "/broker",
  "/best",
  "/best-for",
]);

function isGeoRoute(route: string): boolean {
  if (GEO_PRIORITY_ROUTES.has(route)) return true;
  for (const prefix of GEO_PRIORITY_ROUTES) {
    if (prefix.endsWith("/") && route.startsWith(prefix)) return true;
    if (route.startsWith(prefix + "/")) return true;
  }
  return false;
}

interface PageGeoSignals {
  hasSchema: boolean;
  hasSpeakable: boolean;
  hasFaqPage: boolean;
  hasAnswerFirstH1: boolean;
  hasYearInTitle: boolean;
  schemaTypes: string[];
}

async function extractGeoSignals(page: Page): Promise<PageGeoSignals> {
  return page.evaluate((): PageGeoSignals => {
    const schemaTypes: string[] = [];
    let hasSpeakable = false;
    let hasFaqPage = false;

    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const s of scripts) {
      try {
        const parsed = JSON.parse(s.textContent ?? "");
        const nodes = Array.isArray((parsed as Record<string, unknown>)["@graph"])
          ? ((parsed as Record<string, unknown>)["@graph"] as unknown[])
          : [parsed];

        for (const node of nodes) {
          if (!node || typeof node !== "object") continue;
          const n = node as Record<string, unknown>;
          const t = typeof n["@type"] === "string" ? n["@type"]
            : Array.isArray(n["@type"]) ? (n["@type"] as string[])[0] ?? ""
            : "";
          if (t) schemaTypes.push(t);
          if (t === "FAQPage") hasFaqPage = true;
          if (t === "WebPage" && n.speakable) hasSpeakable = true;
          // Speakable can also appear as a separate SpeakableSpecification node
          if (t === "SpeakableSpecification") hasSpeakable = true;
        }
      } catch {
        // ignore parse errors
      }
    }

    // Also check for [data-speakable] attribute as a proxy
    if (!hasSpeakable && document.querySelector("[data-speakable]")) {
      hasSpeakable = true; // page has marked answer regions
    }

    const h1Text = document.querySelector("h1")?.textContent?.trim() ?? "";
    const hasAnswerFirstH1 =
      h1Text.length > 10 && !h1Text.endsWith("?") && h1Text.length < 120;

    const titleText = document.title;
    const currentYear = new Date().getFullYear();
    const hasYearInTitle = titleText.includes(String(currentYear));

    return {
      hasSchema: schemaTypes.length > 0,
      hasSpeakable,
      hasFaqPage,
      hasAnswerFirstH1,
      hasYearInTitle,
      schemaTypes,
    };
  });
}

export async function checkGeoCitability(
  page: Page,
  store: FindingStore,
  persona: string,
): Promise<void> {
  const pageUrl = page.url();
  let route = pageUrl;
  try {
    route = new URL(pageUrl).pathname;
  } catch {
    return;
  }

  if (!isGeoRoute(route)) return;

  let signals: PageGeoSignals;
  try {
    signals = await extractGeoSignals(page);
  } catch {
    return; // page may have navigated away
  }

  // ── 1. No JSON-LD at all ───────────────────────────────────────────────────
  if (!signals.hasSchema) {
    store.add({
      severity: "high",
      category: "schema",
      title: `GEO: no JSON-LD schema on ${route}`,
      detail:
        `${route} is a priority GEO page but has no <script type="application/ld+json"> blocks. ` +
        `JSON-LD schema is required for AI engines (Google AI Overview, ChatGPT, Perplexity) to ` +
        `extract structured answers. Add at minimum a WebPage + BreadcrumbList schema.`,
      url: pageUrl,
      persona,
      signatureKey: `geo:no-schema:${route}`,
    });
    return; // no point checking sub-signals if there's no schema at all
  }

  // ── 2. No Speakable schema ─────────────────────────────────────────────────
  if (!signals.hasSpeakable) {
    store.add({
      severity: "medium",
      category: "schema",
      title: `GEO: no Speakable schema on ${route}`,
      detail:
        `${route} has JSON-LD (types: ${signals.schemaTypes.join(", ")}) but no Speakable ` +
        `specification. Speakable marks the exact DOM region holding the answer-first text, ` +
        `letting AI engines extract direct answers rather than guessing. Use ` +
        `speakableWebPageJsonLd() from lib/schema-markup.ts with a CSS selector pointing at ` +
        `the H1 + lead paragraph container.`,
      url: pageUrl,
      persona,
      signatureKey: `geo:no-speakable:${route}`,
    });
  }

  // ── 3. No FAQPage schema on key pillar pages ───────────────────────────────
  const FAQ_EXPECTED_ROUTES = ["/compare", "/share-trading", "/etfs", "/super", "/savings"];
  const needsFaq = FAQ_EXPECTED_ROUTES.some((r) => route === r || route.startsWith(r + "/"));
  if (needsFaq && !signals.hasFaqPage) {
    store.add({
      severity: "medium",
      category: "schema",
      title: `GEO: no FAQPage schema on ${route}`,
      detail:
        `${route} is a pillar page that should carry a FAQPage schema with 3–5 common questions ` +
        `and direct answers. FAQPage schema is one of the strongest signals for AI citation — ` +
        `it gives answer engines structured Q&A pairs to quote directly.`,
      url: pageUrl,
      persona,
      signatureKey: `geo:no-faqpage:${route}`,
    });
  }

  // ── 4. Year not in title (freshness) ──────────────────────────────────────
  if (!signals.hasYearInTitle && !route.startsWith("/article/") && !route.startsWith("/glossary/")) {
    store.add({
      severity: "low",
      category: "schema",
      title: `GEO: year missing from page title on ${route}`,
      detail:
        `The page title on ${route} does not include the current year. AI answer engines ` +
        `prefer recently-dated content. Including the year in the <title> and H1 is a low-cost ` +
        `freshness signal that improves citation probability.`,
      url: pageUrl,
      persona,
      signatureKey: `geo:no-year:${route}`,
    });
  }
}
