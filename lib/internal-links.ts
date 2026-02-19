import type { Broker } from "./types";
import { getCategoryBySlug } from "./best-broker-categories";

// ── Shared category colors (used by article pages + best-for pages) ──

export const CATEGORY_COLORS: Record<string, string> = {
  tax: "bg-purple-100 text-purple-700",
  beginners: "bg-blue-100 text-blue-700",
  smsf: "bg-green-100 text-green-700",
  strategy: "bg-amber-100 text-amber-700",
  news: "bg-red-100 text-red-700",
  reviews: "bg-teal-100 text-teal-700",
};

// ── Article → Best-for category mapping ──

/** Maps article category to matching best-for page slugs */
const CATEGORY_TO_BEST: Record<string, string[]> = {
  beginners: ["beginners"],
  smsf: ["smsf"],
  reviews: [],
  tax: [],
  strategy: [],
  news: [],
};

/** Maps article tags to matching best-for page slugs */
const TAG_TO_BEST: Record<string, string[]> = {
  beginners: ["beginners"],
  chess: ["chess-sponsored"],
  smsf: ["smsf"],
  international: ["us-shares", "low-fx-fees"],
  "passive-investing": ["low-fees"],
  etfs: ["low-fees", "beginners"],
  apps: ["beginners"],
  "best-platforms": ["beginners", "low-fees"],
};

export interface BestPageLink {
  slug: string;
  h1: string;
  href: string;
}

/**
 * Returns best-for category pages relevant to an article based on its
 * category and tags. Pure function — no DB query needed.
 */
export function getBestPagesForArticle(
  category?: string,
  tags?: string[],
): BestPageLink[] {
  const slugSet = new Set<string>();

  if (category && CATEGORY_TO_BEST[category]) {
    CATEGORY_TO_BEST[category].forEach((s) => slugSet.add(s));
  }

  if (tags) {
    for (const tag of tags) {
      const matches = TAG_TO_BEST[tag];
      if (matches) matches.forEach((s) => slugSet.add(s));
    }
  }

  return Array.from(slugSet)
    .map((slug) => {
      const cat = getCategoryBySlug(slug);
      if (!cat) return null;
      return { slug, h1: cat.h1, href: `/best/${slug}` };
    })
    .filter((x): x is BestPageLink => x !== null);
}

// ── Best-for → Article filter mapping (reverse direction) ──

interface ArticleFilters {
  categories: string[];
  tags: string[];
}

/** Maps best-for page slug to the article categories/tags that are relevant */
const BEST_TO_ARTICLE_FILTERS: Record<string, ArticleFilters> = {
  beginners: { categories: ["beginners"], tags: ["beginners"] },
  "us-shares": { categories: [], tags: ["international"] },
  "low-fees": { categories: [], tags: ["passive-investing", "etfs", "best-platforms"] },
  "chess-sponsored": { categories: [], tags: ["chess"] },
  smsf: { categories: ["smsf"], tags: ["smsf"] },
  crypto: { categories: [], tags: [] },
  "low-fx-fees": { categories: [], tags: ["international"] },
  "active-traders": { categories: [], tags: ["best-platforms"] },
  "day-trading": { categories: [], tags: ["strategy"] },
  "asx-shares": { categories: [], tags: ["asx"] },
  "no-inactivity-fees": { categories: [], tags: [] },
  "options-trading": { categories: [], tags: [] },
};

/**
 * Returns article categories and tags to query for a given best-for page slug.
 * Used to build a Supabase `.or()` filter.
 */
export function getArticleFiltersForBestPage(bestSlug: string): ArticleFilters {
  return BEST_TO_ARTICLE_FILTERS[bestSlug] || { categories: [], tags: [] };
}

// ── Broker similarity scoring ──

/**
 * Scores how similar two brokers are for "Similar Brokers" recommendations.
 * Returns -1 if they should never be shown together (crypto/non-crypto mismatch).
 * Higher score = more similar.
 */
export function scoreBrokerSimilarity(target: Broker, candidate: Broker): number {
  // Crypto type must match (existing behaviour)
  if (target.is_crypto !== candidate.is_crypto) return -1;

  let score = 0;

  // CHESS sponsorship match (+3)
  if (target.chess_sponsored === candidate.chess_sponsored) score += 3;

  // SMSF support match (+2)
  if (target.smsf_support === candidate.smsf_support) score += 2;

  // Fee tier proximity: closer ASX fees = more similar
  const targetFee = target.asx_fee_value ?? 99;
  const candidateFee = candidate.asx_fee_value ?? 99;
  const feeDiff = Math.abs(targetFee - candidateFee);
  if (feeDiff <= 2) score += 3;
  else if (feeDiff <= 5) score += 1;

  // Rating proximity (prefer similarly-rated brokers)
  const targetRating = target.rating ?? 0;
  const candidateRating = candidate.rating ?? 0;
  const ratingDiff = Math.abs(targetRating - candidateRating);
  if (ratingDiff <= 0.3) score += 2;
  else if (ratingDiff <= 0.7) score += 1;

  // Slight bonus for higher-rated candidates (tiebreaker)
  score += candidateRating * 0.1;

  return score;
}
