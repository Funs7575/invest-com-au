/**
 * related-content.ts — pure helpers for content discovery rails.
 *
 * Given the current entity (article, broker, or advisor), returns ranked
 * lists of related items from existing data for display in the "Related"
 * rail component.
 *
 * Design principles:
 *   - Deterministic ranking: no random order, no personalisation.
 *   - AFSL-safe: factual discovery only ("similar brokers", "same category
 *     articles") — never "recommended for you to buy" or advice framing.
 *   - Pure: no I/O. All inputs must be pre-fetched by the caller (RSC page).
 *   - Self-exclusion: the current entity is always excluded from results.
 *   - Capped results: each helper enforces a max count.
 */

import type { Article, Broker, Professional } from "@/lib/types";

// ─── Shared types ──────────────────────────────────────────────

/** A single item in any related-content rail. */
export interface RelatedItem {
  id: string | number;
  href: string;
  title: string;
  /** Short contextual label (e.g. article category, broker platform type). */
  badgeText?: string;
  /** Tailwind classes for the badge background + text colour. */
  badgeClass?: string;
  /** Optional meta line (e.g. "5 min read", "Financial Planner"). */
  meta?: string;
}

/** Structured result for the article-page rail. */
export interface ArticleRelatedResult {
  articles: RelatedItem[];
  /** Up to 2 calculator/guide links surfaced based on category+tags. */
  tools: RelatedItem[];
}

/** Structured result for the broker-page rail. */
export interface BrokerRelatedResult {
  brokers: RelatedItem[];
  articles: RelatedItem[];
}

/** Structured result for the advisor-page rail. */
export interface AdvisorRelatedResult {
  advisors: RelatedItem[];
  guides: RelatedItem[];
}

// ─── Constants ──────────────────────────────────────────────────

const MAX_RELATED_ARTICLES = 6;
const MAX_RELATED_BROKERS = 4;
const MAX_RELATED_ADVISORS = 3;
const MAX_TOOLS = 2;

/** Calculators surfaced on the article rail, keyed by the article's
 *  `related_calc` slug value or derived from category/tags. */
const CALC_MAP: Record<
  string,
  { name: string; href: string; meta?: string }
> = {
  "calc-franking": {
    name: "Franking Credits Calculator",
    href: "/calculators?calc=calc-franking",
    meta: "Free tool",
  },
  "calc-switching": {
    name: "Switching Cost Simulator",
    href: "/calculators?calc=calc-switching",
    meta: "Free tool",
  },
  "calc-fx": {
    name: "FX Fee Calculator",
    href: "/calculators?calc=calc-fx",
    meta: "Free tool",
  },
  "calc-cgt": {
    name: "CGT Estimator",
    href: "/calculators?calc=calc-cgt",
    meta: "Free tool",
  },
  "calc-chess": {
    name: "CHESS Lookup Tool",
    href: "/calculators?calc=calc-chess",
    meta: "Free tool",
  },
};

/** Category/tag → calculator hint (best match only, deterministic). */
const CATEGORY_CALC_HINTS: { pattern: RegExp; calc: string }[] = [
  { pattern: /\bfranking\b|\bdividend\b|\bfranked\b/i, calc: "calc-franking" },
  { pattern: /\btax\b|\bcgt\b|\bcapital.gain\b|\beofy\b/i, calc: "calc-cgt" },
  { pattern: /\bfx\b|\bcurrency\b|\binternational\b|\bforex\b|\bremitt/i, calc: "calc-fx" },
  { pattern: /\bchess\b|\bcustody\b/i, calc: "calc-chess" },
  { pattern: /\bswitch\b|\btransfer\b/i, calc: "calc-switching" },
];

/** Category → advisor-guide hint for the article rail. */
const CATEGORY_GUIDE_HINTS: {
  pattern: RegExp;
  name: string;
  href: string;
}[] = [
  {
    pattern: /\bmortgage\b|\bhome.loan\b|\brefinanc\b/i,
    name: "Mortgage Broker Guide",
    href: "/advisor-guides/mortgage-broker",
  },
  {
    pattern: /\bsmsf\b|\bself.managed\b/i,
    name: "SMSF Accountant Guide",
    href: "/advisor-guides/smsf-accountant",
  },
  {
    pattern: /\btax\b|\bcapital.gain\b|\beofy\b|\bdeduction\b/i,
    name: "Tax Agent Guide",
    href: "/advisor-guides/tax-agent",
  },
  {
    pattern: /\bproperty\b|\bnegative.gear\b|\binvestment.property\b/i,
    name: "Property Advisor Guide",
    href: "/advisor-guides/property-advisor",
  },
  {
    pattern: /\bsuper\b|\bretirement\b|\bpension\b/i,
    name: "Financial Planner Guide",
    href: "/advisor-guides/financial-planner",
  },
  {
    pattern: /\binsurance\b|\bcover\b|\bincome.protection\b/i,
    name: "Insurance Broker Guide",
    href: "/advisor-guides/insurance-broker",
  },
];

/** Platform type → advisor guide hint for the broker rail. */
const PLATFORM_GUIDE_HINTS: Record<
  string,
  { name: string; href: string }
> = {
  share_broker: {
    name: "How to Choose a Share Broker",
    href: "/advisor-guides/financial-planner",
  },
  crypto_exchange: {
    name: "Crypto Tax Guide",
    href: "/advisor-guides/tax-agent",
  },
  super_fund: {
    name: "SMSF vs Managed Super",
    href: "/advisor-guides/smsf-accountant",
  },
  robo_advisor: {
    name: "Robo-Advisor vs Financial Planner",
    href: "/advisor-guides/financial-planner",
  },
  property_platform: {
    name: "Property Investment Guide",
    href: "/advisor-guides/property-advisor",
  },
  cfd_forex: {
    name: "CFD & Forex Tax Explained",
    href: "/advisor-guides/tax-agent",
  },
  savings_account: {
    name: "Savings vs Investing Guide",
    href: "/advisor-guides/financial-planner",
  },
  term_deposit: {
    name: "Term Deposit vs Shares Guide",
    href: "/advisor-guides/financial-planner",
  },
};

/** Advisor type → relevant guide hint. */
const ADVISOR_GUIDE_HINTS: Record<
  string,
  { name: string; href: string }
> = {
  financial_planner: {
    name: "Financial Planner vs Robo-Advisor",
    href: "/advisor-guides/financial-planner-vs-robo-advisor",
  },
  mortgage_broker: {
    name: "Mortgage Broker vs Bank",
    href: "/advisor-guides/mortgage-broker-vs-bank",
  },
  smsf_accountant: {
    name: "SMSF Accountant vs DIY",
    href: "/advisor-guides/smsf-accountant-vs-diy",
  },
  tax_agent: {
    name: "Tax Agent vs Accountant",
    href: "/advisor-guides/tax-agent-vs-accountant",
  },
  buyers_agent: {
    name: "Buyer's Agent vs DIY",
    href: "/advisor-guides/buyers-agent-vs-diy",
  },
};

// ─── Article rail ───────────────────────────────────────────────

/**
 * For an article page, returns:
 *   - Up to `MAX_RELATED_ARTICLES` related articles (prioritised by same-category
 *     + tag overlap, recency-tiebreaker).
 *   - Up to `MAX_TOOLS` calculator/guide tools derived from the article's
 *     `related_calc`, category, and tags — in that priority order.
 *
 * @param current  The current article (used for exclusion + attributes).
 * @param allArticles  Published articles to draw from (excluding the current).
 */
export function getRelatedForArticle(
  current: Pick<Article, "id" | "slug" | "category" | "tags" | "related_calc">,
  allArticles: Pick<Article, "id" | "slug" | "title" | "category" | "tags" | "read_time" | "published_at">[],
): ArticleRelatedResult {
  // --- Articles ---
  const candidates = allArticles.filter((a) => a.slug !== current.slug);

  const scored = candidates.map((a) => ({
    article: a,
    score: scoreArticleSimilarity(current, a),
  }));

  // Sort: descending score, then descending recency
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const dateA = a.article.published_at ?? "";
    const dateB = b.article.published_at ?? "";
    return dateB.localeCompare(dateA);
  });

  const articles: RelatedItem[] = scored
    .filter(({ score }) => score > 0)
    .slice(0, MAX_RELATED_ARTICLES)
    .map(({ article: a }) => ({
      id: a.id,
      href: `/article/${a.slug}`,
      title: a.title,
      badgeText: a.category ?? undefined,
      badgeClass: undefined, // caller can inject colour from CATEGORY_COLORS
      meta: a.read_time ? `${a.read_time} min read` : undefined,
    }));

  // --- Tools ---
  const tools: RelatedItem[] = [];

  // 1. Explicit related_calc field takes priority
  if (current.related_calc && CALC_MAP[current.related_calc]) {
    const calc = CALC_MAP[current.related_calc]!;
    tools.push({
      id: `calc:${current.related_calc}`,
      href: calc.href,
      title: calc.name,
      badgeText: "Calculator",
      badgeClass: "bg-amber-100 text-amber-700",
      meta: calc.meta,
    });
  }

  // 2. Derive from category + tags if still under cap
  if (tools.length < MAX_TOOLS) {
    const combined = [current.category ?? "", ...(current.tags ?? [])].join(" ");
    const addedCalcs = new Set(tools.map((t) => t.href));

    for (const hint of CATEGORY_CALC_HINTS) {
      if (tools.length >= MAX_TOOLS) break;
      if (hint.pattern.test(combined)) {
        const calc = CALC_MAP[hint.calc];
        if (calc && !addedCalcs.has(calc.href)) {
          tools.push({
            id: `calc:${hint.calc}`,
            href: calc.href,
            title: calc.name,
            badgeText: "Calculator",
            badgeClass: "bg-amber-100 text-amber-700",
            meta: calc.meta,
          });
          addedCalcs.add(calc.href);
        }
      }
    }

    // Then advisor guide hints
    for (const hint of CATEGORY_GUIDE_HINTS) {
      if (tools.length >= MAX_TOOLS) break;
      if (hint.pattern.test(combined) && !addedCalcs.has(hint.href)) {
        tools.push({
          id: `guide:${hint.href}`,
          href: hint.href,
          title: hint.name,
          badgeText: "Guide",
          badgeClass: "bg-violet-100 text-violet-700",
          meta: "Free guide",
        });
        addedCalcs.add(hint.href);
      }
    }
  }

  return { articles, tools };
}

// ─── Broker rail ────────────────────────────────────────────────

/**
 * For a broker review page, returns:
 *   - Up to `MAX_RELATED_BROKERS` similar brokers (scored by feature overlap).
 *   - Up to 3 related articles from `brokerArticles`.
 *
 * NOTE: "similar brokers" should COMPLEMENT — not duplicate — the
 * existing "vs Alternatives" section in BrokerReviewClient which
 * already uses `scoreBrokerSimilarity` from `lib/internal-links.ts`.
 * This helper is intended for a separate rail placed below the main
 * review body, distinct from the tab-based alternatives section.
 *
 * @param current       The broker being reviewed.
 * @param allBrokers    Active brokers to draw from (excluding current).
 * @param brokerArticles Pre-fetched articles that mention this broker.
 */
export function getRelatedForBroker(
  current: Pick<
    Broker,
    "id" | "slug" | "platform_type" | "is_crypto" | "chess_sponsored" | "smsf_support" | "markets" | "rating"
  >,
  allBrokers: Pick<
    Broker,
    "id" | "slug" | "name" | "platform_type" | "is_crypto" | "chess_sponsored" | "smsf_support" | "markets" | "rating" | "asx_fee_value"
  >[],
  brokerArticles: Pick<Article, "id" | "slug" | "title" | "category" | "read_time">[],
): BrokerRelatedResult {
  // --- Brokers ---
  const candidates = allBrokers.filter((b) => b.slug !== current.slug);

  const scored = candidates.map((b) => ({
    broker: b,
    score: scoreBrokerFeatureOverlap(current, b),
  }));

  scored.sort((a, b) => b.score - a.score);

  const brokers: RelatedItem[] = scored
    .filter(({ score }) => score > 0)
    .slice(0, MAX_RELATED_BROKERS)
    .map(({ broker: b }) => ({
      id: b.id,
      href: `/broker/${b.slug}`,
      title: b.name,
      badgeText: platformTypeLabel(b.platform_type),
      badgeClass: "bg-slate-100 text-slate-700",
      meta: b.rating ? `${b.rating.toFixed(1)} / 5` : undefined,
    }));

  // --- Articles ---
  const articles: RelatedItem[] = brokerArticles.slice(0, 3).map((a) => ({
    id: a.id,
    href: `/article/${a.slug}`,
    title: a.title,
    badgeText: a.category ?? undefined,
    badgeClass: "bg-slate-100 text-slate-700",
    meta: a.read_time ? `${a.read_time} min read` : undefined,
  }));

  return { brokers, articles };
}

// ─── Advisor rail ───────────────────────────────────────────────

/**
 * For an advisor profile page, returns:
 *   - Up to `MAX_RELATED_ADVISORS` advisors sharing the same type + at least
 *     one overlapping specialty or same state (whichever yields more matches),
 *     ranked by rating.
 *   - Up to 2 guide links relevant to the advisor type.
 *
 * @param current    The advisor whose profile is being viewed.
 * @param allAdvisors Active advisors of the same type, excluding current.
 */
export function getRelatedForAdvisor(
  current: Pick<
    Professional,
    "id" | "slug" | "type" | "specialties" | "location_state"
  >,
  allAdvisors: Pick<
    Professional,
    "id" | "slug" | "name" | "type" | "specialties" | "location_state" | "location_display" | "rating" | "verified" | "firm_name"
  >[],
): AdvisorRelatedResult {
  // --- Advisors ---
  const candidates = allAdvisors.filter(
    (a) => a.slug !== current.slug && a.type === current.type,
  );

  const scored = candidates.map((a) => ({
    advisor: a,
    score: scoreAdvisorSimilarity(current, a),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tiebreak: higher rating first
    return (b.advisor.rating ?? 0) - (a.advisor.rating ?? 0);
  });

  const advisors: RelatedItem[] = scored
    .filter(({ score }) => score > 0)
    .slice(0, MAX_RELATED_ADVISORS)
    .map(({ advisor: a }) => ({
      id: a.id,
      href: `/advisor/${a.slug}`,
      title: a.name,
      badgeText: a.location_display ?? a.location_state ?? undefined,
      badgeClass: "bg-slate-100 text-slate-700",
      meta: a.verified ? "Verified" : undefined,
    }));

  // --- Guides ---
  const guides: RelatedItem[] = [];
  const guideHint = ADVISOR_GUIDE_HINTS[current.type];
  if (guideHint) {
    guides.push({
      id: `guide:${guideHint.href}`,
      href: guideHint.href,
      title: guideHint.name,
      badgeText: "Guide",
      badgeClass: "bg-violet-100 text-violet-700",
      meta: "Free guide",
    });
  }

  // Add the advisor directory link as a second guide entry
  const dirSlug = current.type.replace(/_/g, "-") + "s";
  const dirLabel = ADVISOR_TYPE_LABELS[current.type] ?? current.type.replace(/_/g, " ");
  guides.push({
    id: `dir:${dirSlug}`,
    href: `/advisors/${dirSlug}`,
    title: `Find a ${dirLabel}`,
    badgeText: "Directory",
    badgeClass: "bg-teal-100 text-teal-700",
    meta: "Browse all",
  });

  return { advisors, guides: guides.slice(0, MAX_TOOLS) };
}

// ─── Internal scoring helpers ───────────────────────────────────

/**
 * Score how related two articles are. Returns 0 when there is no overlap
 * (so the caller can filter these out).
 *
 * Scoring:
 *   Same category  → +4
 *   Each shared tag → +2 (capped at 6 pts)
 */
function scoreArticleSimilarity(
  current: Pick<Article, "category" | "tags">,
  candidate: Pick<Article, "category" | "tags">,
): number {
  let score = 0;
  if (current.category && candidate.category === current.category) score += 4;
  const currentTags = new Set(current.tags ?? []);
  for (const tag of candidate.tags ?? []) {
    if (currentTags.has(tag)) score += 2;
    if (score >= 4 + 6) break; // cap tag contribution at 6
  }
  return score;
}

/**
 * Score how similar two brokers are for the related rail.
 *
 * Distinct from `scoreBrokerSimilarity` in `lib/internal-links.ts` which
 * drives the "vs Alternatives" tab. This version weights platform_type more
 * heavily (same type = must match) and uses markets + feature flags as
 * secondary signals. crypto must match (same as parent scorer).
 */
function scoreBrokerFeatureOverlap(
  current: Pick<
    Broker,
    "platform_type" | "is_crypto" | "chess_sponsored" | "smsf_support" | "markets" | "rating"
  >,
  candidate: Pick<
    Broker,
    "platform_type" | "is_crypto" | "chess_sponsored" | "smsf_support" | "markets" | "rating" | "asx_fee_value"
  >,
): number {
  // Crypto type must match (same rule as parent scorer)
  if (current.is_crypto !== candidate.is_crypto) return 0;

  // Platform type must match for the rail to show a broker — we want
  // same-category discovery, not cross-category noise. Brokers of a
  // different platform_type are excluded from the rail entirely.
  if (candidate.platform_type !== current.platform_type) return 0;

  let score = 0;

  // Same platform_type is the primary signal (+5)
  if (candidate.platform_type === current.platform_type) score += 5;

  // Feature flag matches
  if (current.chess_sponsored === candidate.chess_sponsored) score += 2;
  if (current.smsf_support === candidate.smsf_support) score += 1;

  // Market overlap (each shared market = +1, cap at 3)
  const currentMarkets = new Set(current.markets ?? []);
  let marketOverlap = 0;
  for (const m of candidate.markets ?? []) {
    if (currentMarkets.has(m)) marketOverlap++;
    if (marketOverlap >= 3) break;
  }
  score += marketOverlap;

  // Rating proximity tiebreaker (within 0.5 → small bonus)
  const ratingDiff = Math.abs((current.rating ?? 0) - (candidate.rating ?? 0));
  if (ratingDiff <= 0.5) score += 1;

  return score;
}

/**
 * Score how similar two advisors are for the related rail.
 *
 * Scoring:
 *   Same type is a pre-filter (only same-type candidates reach this fn).
 *   Each shared specialty → +2 (cap at 6)
 *   Same state → +3
 *   Verified → +1
 */
function scoreAdvisorSimilarity(
  current: Pick<Professional, "specialties" | "location_state">,
  candidate: Pick<Professional, "specialties" | "location_state" | "verified">,
): number {
  let score = 0;

  // Specialty overlap
  const currentSpecialties = new Set(current.specialties ?? []);
  let specialtyPts = 0;
  for (const s of candidate.specialties ?? []) {
    if (currentSpecialties.has(s)) specialtyPts += 2;
    if (specialtyPts >= 6) break;
  }
  score += specialtyPts;

  // Same state
  if (
    current.location_state &&
    candidate.location_state === current.location_state
  ) {
    score += 3;
  }

  // Verified bonus
  if (candidate.verified) score += 1;

  return score;
}

// ─── Utility ────────────────────────────────────────────────────

function platformTypeLabel(type: string): string {
  const LABELS: Record<string, string> = {
    share_broker: "Share Broker",
    crypto_exchange: "Crypto Exchange",
    robo_advisor: "Robo-Advisor",
    research_tool: "Research Tool",
    super_fund: "Super Fund",
    property_platform: "Property",
    cfd_forex: "CFD & Forex",
    savings_account: "Savings Account",
    term_deposit: "Term Deposit",
    fx_provider: "FX Provider",
    business_lender: "Business Lender",
  };
  return LABELS[type] ?? type;
}

const ADVISOR_TYPE_LABELS: Record<string, string> = {
  financial_planner: "Financial Planner",
  mortgage_broker: "Mortgage Broker",
  smsf_accountant: "SMSF Accountant",
  tax_agent: "Tax Agent",
  buyers_agent: "Buyer's Agent",
  property_advisor: "Property Advisor",
  insurance_broker: "Insurance Broker",
  estate_planner: "Estate Planner",
  wealth_manager: "Wealth Manager",
  crypto_advisor: "Crypto Advisor",
  stockbroker_firm: "Stockbroker",
  private_wealth_manager: "Private Wealth Manager",
  aged_care_advisor: "Aged Care Advisor",
  debt_counsellor: "Debt Counsellor",
};
