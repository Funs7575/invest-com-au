/**
 * Keyword → canonical URL auto-linker.
 *
 * Scans article prose and wraps the first occurrence of high-value
 * keywords in an internal link. Distributes SEO authority from 266
 * published articles down to deep broker / advisor / hub pages.
 *
 * Two layers of targets (priority order):
 *   1. INTERNAL_LINK_TARGETS — broker/advisor/hub pages (highest priority)
 *   2. GLOSSARY_LINK_TARGETS — /glossary/{slug} pages (fills gaps)
 *
 * Two entry points:
 *   - linkifyHtml(html)   — rewrites an HTML string, skipping
 *                           content already inside <a> / <code> /
 *                           tag attributes.
 *   - splitByLinks(text)  — splits plain text into an array of
 *                           strings and {href,label} objects so
 *                           the caller renders real <Link>s via
 *                           React. Safer than dangerouslySetInnerHTML.
 */

import { GLOSSARY_ENTRIES } from "@/lib/glossary";

export interface LinkTarget {
  /** Keyword match (case-insensitive, word-boundary) */
  keyword: string;
  /** Internal URL to link to */
  href: string;
  /** Optional rel attribute — "sponsored nofollow" for broker links etc */
  rel?: string;
  /** Optional title attribute for accessibility / hover */
  title?: string;
  /**
   * Topic cluster IDs where this target is semantically relevant.
   * Used by `splitByLinksForArticle` to boost cluster-relevant links when
   * the density cap forces a choice — affine targets are promoted over
   * positionally-earlier non-affine ones.
   * Cluster IDs match the `id` field in `lib/topic-clusters.ts`.
   */
  affinity?: string[];
}

/**
 * Keyword map. Longer-specific phrases first so "SMSF accountant"
 * wins over bare "SMSF" when both could match.
 */
export const INTERNAL_LINK_TARGETS: readonly LinkTarget[] = [
  // Multi-word specifics first (longest match wins)
  { keyword: "Significant Investor Visa", href: "/foreign-investment/siv", title: "SIV pathway and complying investments" },
  { keyword: "Business Innovation Visa", href: "/tools/visa-investment-calculator" },
  { keyword: "Global Talent Visa", href: "/tools/visa-investment-calculator" },
  { keyword: "SMSF Investment Guide", href: "/invest/smsf", affinity: ["super-australia"] },
  { keyword: "SMSF accountant", href: "/advisors/smsf-accountants", affinity: ["super-australia"] },
  { keyword: "SMSF auditor", href: "/smsf/auditors", affinity: ["super-australia"] },
  { keyword: "SMSF specialist", href: "/advisors/smsf-specialists", affinity: ["super-australia"] },
  { keyword: "financial planner", href: "/advisors/financial-planners", affinity: ["investing-beginners", "super-australia"] },
  { keyword: "financial planners", href: "/advisors/financial-planners", affinity: ["investing-beginners", "super-australia"] },
  { keyword: "mortgage broker", href: "/advisors/mortgage-brokers", affinity: ["property-investing"] },
  { keyword: "buyers agent", href: "/advisors/buyers-agents", affinity: ["property-investing"] },
  { keyword: "buyer's agent", href: "/advisors/buyers-agents", affinity: ["property-investing"] },
  { keyword: "migration agent", href: "/advisors/migration-agents", title: "MARA-registered migration agents" },
  { keyword: "mining lawyer", href: "/advisors/mining-lawyers" },
  { keyword: "mining tax advisor", href: "/advisors/mining-tax-advisors", affinity: ["tax-investing"] },
  { keyword: "foreign investment lawyer", href: "/advisors/foreign-investment-lawyers" },
  { keyword: "immigration investment lawyer", href: "/advisors/immigration-investment-lawyers" },
  { keyword: "petroleum royalties", href: "/advisors/petroleum-royalties-advisors" },
  { keyword: "resources fund manager", href: "/advisors/resources-fund-managers" },
  { keyword: "energy financial planner", href: "/advisors/energy-financial-planners" },
  { keyword: "fund manager", href: "/advisors/fund-managers" },

  // Hubs / verticals
  { keyword: "oil and gas", href: "/invest/oil-gas" },
  { keyword: "oil & gas", href: "/invest/oil-gas" },
  { keyword: "Perth Mint", href: "/invest/gold" },
  { keyword: "critical minerals", href: "/invest/mining" },
  { keyword: "Investment Funds", href: "/invest/funds" },

  // Brokers — canonical broker slugs seed the map.
  { keyword: "CommSec", href: "/broker/commsec", affinity: ["best-brokers"] },
  { keyword: "SelfWealth", href: "/broker/selfwealth", affinity: ["best-brokers"] },
  { keyword: "Pearler", href: "/broker/pearler", affinity: ["best-brokers"] },
  { keyword: "Moomoo", href: "/broker/moomoo", affinity: ["best-brokers"] },
  { keyword: "Superhero", href: "/broker/superhero", affinity: ["best-brokers"] },
  { keyword: "Interactive Brokers", href: "/broker/interactive-brokers", affinity: ["best-brokers"] },
  { keyword: "CMC Markets", href: "/broker/cmc-markets", affinity: ["best-brokers", "cfd-forex"] },
  { keyword: "nabtrade", href: "/broker/nabtrade", affinity: ["best-brokers"] },
  { keyword: "Westpac Online Investing", href: "/broker/westpac-online-investing", affinity: ["best-brokers"] },
  { keyword: "Saxo", href: "/broker/saxo-bank", affinity: ["best-brokers", "cfd-forex"] },
  { keyword: "Stake", href: "/broker/stake", affinity: ["best-brokers"] },

  // Tools
  { keyword: "FIRB fee estimator", href: "/firb-fee-estimator" },
  { keyword: "FIRB application fee", href: "/firb-fee-estimator" },
  { keyword: "franking credit calculator", href: "/franking-credits-calculator", affinity: ["tax-investing"] },
  { keyword: "CGT calculator", href: "/cgt-calculator", affinity: ["tax-investing"] },
  { keyword: "withholding tax calculator", href: "/tools/withholding-tax-calculator", affinity: ["tax-investing"] },
  { keyword: "non-resident dividend calculator", href: "/non-resident-dividend-calculator", affinity: ["tax-investing"] },
  { keyword: "visa investment calculator", href: "/tools/visa-investment-calculator" },

  // Named commodity stocks that should link to sector hubs
  { keyword: "Woodside Energy", href: "/invest/oil-gas" },
  { keyword: "Santos", href: "/invest/oil-gas" },
  { keyword: "Paladin Energy", href: "/invest/uranium" },
  { keyword: "Boss Energy", href: "/invest/uranium" },
  { keyword: "Deep Yellow", href: "/invest/uranium" },
  { keyword: "Fortescue", href: "/invest/hydrogen" },
  { keyword: "Pilbara Minerals", href: "/invest/lithium" },

  // Concepts / shorter keywords (lowest priority — come last)
  { keyword: "SMSF", href: "/smsf", affinity: ["super-australia"] },
  { keyword: "FIRB", href: "/foreign-investment" },
  { keyword: "SIV", href: "/foreign-investment/siv" },
  { keyword: "PRRT", href: "/article/prrt-petroleum-resource-rent-tax-explained" },
  { keyword: "uranium", href: "/invest/uranium" },
  { keyword: "hydrogen", href: "/invest/hydrogen" },
  { keyword: "lithium", href: "/invest/lithium" },
  { keyword: "compare brokers", href: "/compare", affinity: ["best-brokers"] },
  { keyword: "ETF hub", href: "/etfs", affinity: ["etfs-australia"] },
  { keyword: "research reports", href: "/research", affinity: ["research-tools"] },
];

// Glossary link targets — /glossary/{slug} for terms not already
// covered by a more-specific INTERNAL_LINK_TARGETS entry.
// Truncate definition to 120 chars for tooltip readability.
const _internalKeywords = new Set(
  INTERNAL_LINK_TARGETS.map((t) => t.keyword.toLowerCase()),
);
export const GLOSSARY_LINK_TARGETS: readonly LinkTarget[] = GLOSSARY_ENTRIES
  .filter((e) => !_internalKeywords.has(e.term.toLowerCase()))
  .map((e) => ({
    keyword: e.term,
    href: `/glossary/${e.slug}`,
    title: e.definition.length > 120 ? e.definition.slice(0, 117) + "…" : e.definition,
    rel: "glossary",
  }));

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Internal links first (higher priority), then glossary; sort longest-
// first within each tier so multi-word phrases win over bare nouns.
const ALL_TARGETS = [...INTERNAL_LINK_TARGETS, ...GLOSSARY_LINK_TARGETS];
const SORTED_TARGETS = ALL_TARGETS.sort(
  (a, b) => b.keyword.length - a.keyword.length,
);

// Combined regex built once at module load. Case-insensitive, word
// boundary on both sides so we don't rewrite "smsfcheck" or
// "pre-SMSF" inside other words.
const COMBINED_REGEX_SOURCE =
  "\\b(" +
  SORTED_TARGETS.map((l) => escapeRegex(l.keyword)).join("|") +
  ")\\b";

function findTarget(matchedText: string): LinkTarget | undefined {
  const lower = matchedText.toLowerCase();
  return SORTED_TARGETS.find((l) => l.keyword.toLowerCase() === lower);
}

export type TextOrLink =
  | string
  | { href: string; label: string; title?: string; rel?: string };

/**
 * Splits a plain-text string into an array of strings and link
 * objects. Only the first occurrence of each keyword is linked —
 * subsequent occurrences render as plain text. Safe for React
 * rendering without dangerouslySetInnerHTML.
 *
 * @param maxLinks - Maximum unique keywords to inject as links. Defaults to
 *   unlimited (all first occurrences). Pass a small integer (e.g. 5) to cap
 *   link density per text block — text after the cap renders as plain text.
 */
export function splitByLinks(text: string, maxLinks = Infinity): TextOrLink[] {
  if (!text) return [];
  const out: TextOrLink[] = [];
  const used = new Set<string>();
  const rx = new RegExp(COMBINED_REGEX_SOURCE, "gi");
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    // Density cap: once we've injected maxLinks unique keywords, skip further
    // injections. The regex still scans forward so remaining text is captured
    // correctly in the final text.slice(lastIndex) below.
    if (used.size >= maxLinks) continue;
    const match = m[0];
    const key = match.toLowerCase();
    if (used.has(key)) continue;
    const target = findTarget(match);
    if (!target) continue;
    used.add(key);
    if (m.index > lastIndex) out.push(text.slice(lastIndex, m.index));
    out.push({
      href: target.href,
      label: match,
      title: target.title,
      rel: target.rel,
    });
    lastIndex = m.index + match.length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

/**
 * Cluster-aware variant of `splitByLinks`.
 *
 * When a `maxLinks` density cap is in effect, positional ordering means the
 * first N keywords found in the text consume all cap slots — even if later
 * keywords are more semantically relevant to the article's topic cluster.
 *
 * This function uses a two-pass approach to solve that:
 *   Pass 1 — collect ALL first-occurrence keyword matches (no cap).
 *   Sort    — cluster-affine matches (those whose `affinity` overlaps
 *              `clusterIds`) float to the front; ties broken by text position.
 *   Pass 2  — take the top `maxLinks` from the sorted list and reconstruct
 *              the output in positional order so links appear naturally in prose.
 *
 * Falls back to `splitByLinks` when `clusterIds` is empty or `maxLinks` is
 * unlimited (the sort has no effect in those cases).
 *
 * @param clusterIds - Cluster IDs the current article belongs to (from
 *   `getClustersForArticle(slug).map(c => c.cluster.id)`).
 */
export function splitByLinksForArticle(
  text: string,
  clusterIds: string[],
  maxLinks = Infinity,
): TextOrLink[] {
  if (!text) return [];
  if (!clusterIds.length || maxLinks === Infinity) return splitByLinks(text, maxLinks);

  const clusterSet = new Set(clusterIds);

  // Pass 1: collect all first-occurrence keyword matches without a density cap.
  type Match = { index: number; end: number; match: string; target: LinkTarget; affine: boolean };
  const found: Match[] = [];
  const seenKeys = new Set<string>();
  const rx = new RegExp(COMBINED_REGEX_SOURCE, "gi");
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    const key = m[0].toLowerCase();
    if (seenKeys.has(key)) continue;
    const target = findTarget(m[0]);
    if (!target) continue;
    seenKeys.add(key);
    const affine = target.affinity?.some((id) => clusterSet.has(id)) ?? false;
    found.push({ index: m.index, end: m.index + m[0].length, match: m[0], target, affine });
  }

  // Sort: cluster-affine first, then by text position within each tier.
  found.sort((a, b) => {
    if (a.affine !== b.affine) return a.affine ? -1 : 1;
    return a.index - b.index;
  });

  // Take the top maxLinks winners and look them up by their lowercased match text.
  const chosen = new Set(found.slice(0, maxLinks).map((f) => f.match.toLowerCase()));

  // Pass 2: reconstruct output in positional order with chosen links injected.
  const byPosition = found
    .filter((f) => chosen.has(f.match.toLowerCase()))
    .sort((a, b) => a.index - b.index);

  const out: TextOrLink[] = [];
  let last = 0;
  for (const { index, end, match, target } of byPosition) {
    if (index > last) out.push(text.slice(last, index));
    out.push({ href: target.href, label: match, title: target.title, rel: target.rel });
    last = end;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * HTML-safe linkifier for article bodies. Scans an HTML string and
 * wraps the first occurrence of each keyword in an `<a href>`.
 *
 * Skips:
 *   - Content inside existing <a> tags (no nested links)
 *   - Content inside <code> / <pre> blocks (don't touch code)
 *   - Content inside tag attributes (href, alt, etc.)
 *
 * First-occurrence semantics per keyword so prose stays readable.
 */
export function linkifyHtml(html: string): string {
  if (!html) return "";
  const used = new Set<string>();
  let out = "";
  let i = 0;
  const len = html.length;

  while (i < len) {
    const ch = html[i];
    if (ch === "<") {
      const close = html.indexOf(">", i + 1);
      if (close === -1) {
        out += html.slice(i);
        break;
      }
      const tag = html.slice(i, close + 1);
      out += tag;
      i = close + 1;

      // Skip block content of <a>, <code>, <pre> — never inject links here.
      const openMatch = /^<(a|code|pre)[\s>]/i.exec(tag);
      if (openMatch) {
        const closer = `</${openMatch[1]!.toLowerCase()}>`;
        const closeAt = html.toLowerCase().indexOf(closer, i);
        if (closeAt === -1) {
          out += html.slice(i);
          return out;
        }
        out += html.slice(i, closeAt + closer.length);
        i = closeAt + closer.length;
      }
      continue;
    }

    const nextTag = html.indexOf("<", i);
    const chunk = nextTag === -1 ? html.slice(i) : html.slice(i, nextTag);
    out += replaceFirstKeywords(chunk, used);
    i += chunk.length;
  }
  return out;
}

function replaceFirstKeywords(text: string, used: Set<string>): string {
  const rx = new RegExp(COMBINED_REGEX_SOURCE, "gi");
  return text.replace(rx, (match) => {
    const key = match.toLowerCase();
    if (used.has(key)) return match;
    const target = findTarget(match);
    if (!target) return match;
    used.add(key);
    const relAttr = target.rel ? ` rel="${target.rel}"` : "";
    const titleAttr = target.title
      ? ` title="${target.title.replace(/"/g, "&quot;")}"`
      : "";
    return `<a href="${target.href}"${titleAttr}${relAttr} class="text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-800">${match}</a>`;
  });
}
