/**
 * Keyword → canonical URL auto-linker.
 *
 * Scans article prose and wraps the first occurrence of high-value
 * keywords in an internal link. Distributes SEO authority from 266
 * published articles down to deep broker / advisor / hub pages.
 *
 * Pure — no DB lookups at render time. Maintain the keyword map in
 * this file when a new broker, advisor type, or hub launches.
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

export interface LinkTarget {
  /** Keyword match (case-insensitive, word-boundary) */
  keyword: string;
  /** Internal URL to link to */
  href: string;
  /** Optional rel attribute — "sponsored nofollow" for broker links etc */
  rel?: string;
  /** Optional title attribute for accessibility / hover */
  title?: string;
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
  { keyword: "SMSF Investment Guide", href: "/invest/smsf" },
  { keyword: "SMSF accountant", href: "/advisors/smsf-accountants" },
  { keyword: "SMSF auditor", href: "/smsf/auditors" },
  { keyword: "SMSF specialist", href: "/advisors/smsf-specialists" },
  { keyword: "financial planner", href: "/advisors/financial-planners" },
  { keyword: "financial planners", href: "/advisors/financial-planners" },
  { keyword: "mortgage broker", href: "/advisors/mortgage-brokers" },
  { keyword: "buyers agent", href: "/advisors/buyers-agents" },
  { keyword: "buyer's agent", href: "/advisors/buyers-agents" },
  { keyword: "migration agent", href: "/advisors/migration-agents", title: "MARA-registered migration agents" },
  { keyword: "mining lawyer", href: "/advisors/mining-lawyers" },
  { keyword: "mining tax advisor", href: "/advisors/mining-tax-advisors" },
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

  // Brokers — canonical broker slugs seed the map. Add new brokers
  // as they launch.
  { keyword: "CommSec", href: "/broker/commsec" },
  { keyword: "SelfWealth", href: "/broker/selfwealth" },
  { keyword: "Pearler", href: "/broker/pearler" },
  { keyword: "Moomoo", href: "/broker/moomoo" },
  { keyword: "Superhero", href: "/broker/superhero" },
  { keyword: "Interactive Brokers", href: "/broker/interactive-brokers" },
  { keyword: "CMC Markets", href: "/broker/cmc-markets" },
  { keyword: "nabtrade", href: "/broker/nabtrade" },
  { keyword: "Westpac Online Investing", href: "/broker/westpac-online-investing" },
  { keyword: "Saxo", href: "/broker/saxo-bank" },
  { keyword: "Stake", href: "/broker/stake" },

  // Tools
  { keyword: "FIRB fee estimator", href: "/firb-fee-estimator" },
  { keyword: "FIRB application fee", href: "/firb-fee-estimator" },
  { keyword: "franking credit calculator", href: "/franking-credits-calculator" },
  { keyword: "CGT calculator", href: "/cgt-calculator" },
  { keyword: "withholding tax calculator", href: "/tools/withholding-tax-calculator" },
  { keyword: "non-resident dividend calculator", href: "/non-resident-dividend-calculator" },
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
  { keyword: "SMSF", href: "/smsf" },
  { keyword: "FIRB", href: "/foreign-investment" },
  { keyword: "SIV", href: "/foreign-investment/siv" },
  { keyword: "PRRT", href: "/article/prrt-petroleum-resource-rent-tax-explained" },
  { keyword: "uranium", href: "/invest/uranium" },
  { keyword: "hydrogen", href: "/invest/hydrogen" },
  { keyword: "lithium", href: "/invest/lithium" },
  { keyword: "compare brokers", href: "/compare" },
  { keyword: "ETF hub", href: "/etfs" },
  { keyword: "research reports", href: "/research" },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pre-sort keywords longest-first so greedy matching honours
// priority (multi-word phrases win over bare nouns).
const SORTED_TARGETS = [...INTERNAL_LINK_TARGETS].sort(
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
 */
export function splitByLinks(text: string): TextOrLink[] {
  if (!text) return [];
  const out: TextOrLink[] = [];
  const used = new Set<string>();
  const rx = new RegExp(COMBINED_REGEX_SOURCE, "gi");
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
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
