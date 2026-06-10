/**
 * lib/listings/match-listings.ts
 *
 * Decision Engine P4 (docs/plans/UNIFIED_MATCHING_ENGINE.md): the LISTINGS
 * lane scorer. Given a user's get-matched answers and a pool of
 * `investment_listings`, ranks the specific listings that match their stated
 * criteria — vertical affinity, ticket size vs budget band, state, overseas
 * eligibility, listing quality and freshness.
 *
 * COMPLIANCE REDLINES (REGULATORY-AVOID-LIST):
 * - Matches are FACTUAL CRITERIA matches ("matches your stated budget/state/
 *   category") — never quality endorsements, performance claims or advice.
 *   Every reason string here must stay factual.
 * - `equity_raise` listings (startups / pre-IPO primary capital) are HARD
 *   EXCLUDED until the s708 wholesale gate exists — same rule as the homepage
 *   teaser (lib/home-listing-curation.ts).
 * - Non-resident users only see listings explicitly flagged `firb_eligible`.
 *
 * Pure — no I/O. The caller loads candidate rows (status=active) and renders.
 */
import type { ActionPlanAnswers } from "@/lib/getmatched/types";

export interface MatchableListing {
  id: number;
  slug: string;
  title: string;
  vertical: string;
  listing_kind?: string | null;
  location_state?: string | null;
  asking_price_cents?: number | null;
  price_display?: string | null;
  listing_type?: string | null; // standard | featured | premium
  firb_eligible?: boolean | null;
  images?: string[] | null;
  status?: string | null;
  created_at?: string | null;
}

export interface ListingMatchContext {
  /** Preferred listing verticals derived from the user's goal/sub-answers. */
  preferredVerticals?: string[];
  /** Budget band midpoint in cents (from get-matched budget_band). */
  budgetMidpointCents?: number;
  /** AU state code, when the user gave one. */
  userState?: string;
  /** Overseas (non-expat) user → FIRB-eligibility gate applies. */
  isNonResident?: boolean;
}

export interface ScoredListing extends MatchableListing {
  matchScore: number; // 0–100
  /** Factual criteria-match reasons — never endorsements. */
  matchReasons: string[];
}

const BAND_MIDPOINT_CENTS: Record<string, number> = {
  under_10k: 5_000_00,
  "10k_100k": 55_000_00,
  "100k_500k": 300_000_00,
  "500k_1m": 750_000_00,
  "1m_plus": 2_000_000_00,
};

const BAND_LABELS: Record<string, string> = {
  under_10k: "under A$10k",
  "10k_100k": "A$10k–A$100k",
  "100k_500k": "A$100k–A$500k",
  "500k_1m": "A$500k–A$1m",
  "1m_plus": "A$1m+",
};

// Goal/sub-answer → listing-vertical affinity (real InvestListingVertical slugs).
const GOAL_VERTICALS: Record<string, string[]> = {
  property: ["commercial_property", "farmland"],
  alt_assets: ["bullion", "fund"],
  royalties: ["royalties"],
  pre_ipo: ["pre_ipo", "venture-capital", "private-equity"],
  income: ["fund", "royalties", "commercial_property"],
  grow: ["fund"],
  browse: [],
};

const SUB_VERTICALS: Record<string, string[]> = {
  // alt_assets_sub values widen the affinity beyond the generic mapping.
  whisky: ["fund"],
  commercial: ["commercial_property"],
  farmland: ["farmland", "aquaculture", "livestock", "water-rights"],
  business: ["business", "franchise"],
  mining: ["mining", "energy"],
};

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Derive the listing-lane context from get-matched answers. */
export function listingContextFromAnswers(a: ActionPlanAnswers): ListingMatchContext {
  const goal = str(a.intent) ?? "";
  const verticals = new Set<string>(GOAL_VERTICALS[goal] ?? []);
  for (const key of ["alt_assets_sub", "browse_sub", "property_sub"]) {
    const sub = str(a[key]);
    if (sub) for (const v of SUB_VERTICALS[sub] ?? []) verticals.add(v);
  }
  const state = str(a.location_state);
  return {
    preferredVerticals: [...verticals],
    budgetMidpointCents: BAND_MIDPOINT_CENTS[str(a.budget_band) ?? ""],
    userState: state && state !== "any" && state !== "prefer_not" ? state : undefined,
    isNonResident: str(a.starting_point) === "overseas",
  };
}

/** Human label for the budget band a midpoint came from (for reasons). */
function bandLabelFor(midpoint: number | undefined): string | null {
  if (midpoint == null) return null;
  for (const [band, mid] of Object.entries(BAND_MIDPOINT_CENTS)) {
    if (mid === midpoint) return BAND_LABELS[band] ?? null;
  }
  return null;
}

function scoreOne(l: MatchableListing, ctx: ListingMatchContext): ScoredListing | null {
  // Hard gates first.
  if (l.status && l.status !== "active") return null;
  if (l.listing_kind === "equity_raise") return null; // CSF redline — no s708 gate yet
  if (ctx.isNonResident && l.firb_eligible !== true) return null;

  let score = 0;
  const reasons: string[] = [];

  // 1) Vertical affinity (30).
  const prefs = ctx.preferredVerticals ?? [];
  if (prefs.length === 0) {
    score += 18; // no stated preference — neutral
  } else if (prefs.includes(l.vertical)) {
    score += 30;
    reasons.push(`In a category you chose (${l.vertical.replace(/[-_]/g, " ")})`);
  } else {
    score += 6;
  }

  // 2) Ticket size vs budget (25).
  const price = l.asking_price_cents ?? null;
  const budget = ctx.budgetMidpointCents ?? null;
  if (budget != null && price != null) {
    if (price <= budget) {
      score += 25;
      const label = bandLabelFor(budget);
      if (label) reasons.push(`Within your stated budget (${label})`);
    } else if (price <= budget * 2) {
      score += 12;
    } else {
      score += 4;
    }
  } else {
    score += 14; // unknown on either side — neutral
  }

  // 3) Location (15).
  if (ctx.userState && l.location_state) {
    if (l.location_state === ctx.userState) {
      score += 15;
      reasons.push(`Located in ${l.location_state}`);
    } else {
      score += 5;
    }
  } else {
    score += 9;
  }
  if (ctx.isNonResident && l.firb_eligible === true) {
    reasons.push("Open to overseas buyers (FIRB-eligible)");
  }

  // 4) Quality + freshness (30): tier ≤10, image ≤8, recency ≤12.
  const tier = l.listing_type === "premium" ? 10 : l.listing_type === "featured" ? 7 : 4;
  score += tier;
  if (l.images && l.images.length > 0 && l.images[0]) score += 8;
  if (l.created_at) {
    const ageDays = (Date.now() - new Date(l.created_at).getTime()) / 86_400_000;
    score += ageDays <= 30 ? 12 : ageDays <= 90 ? 8 : 3;
  } else {
    score += 3;
  }

  return {
    ...l,
    matchScore: Math.round(Math.max(0, Math.min(100, score))),
    matchReasons: reasons.slice(0, 3),
  };
}

/**
 * Rank listings for a user. Applies the hard gates (active-only, CSF
 * exclusion, FIRB for non-residents), scores the rest, returns the top
 * `limit` best-first (ties → newer first).
 */
export function matchListings(
  listings: ReadonlyArray<MatchableListing>,
  ctx: ListingMatchContext,
  limit = 6,
): ScoredListing[] {
  const scored: ScoredListing[] = [];
  for (const l of listings) {
    const s = scoreOne(l, ctx);
    if (s) scored.push(s);
  }
  scored.sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  );
  return scored.slice(0, limit);
}
