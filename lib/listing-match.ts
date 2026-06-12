/**
 * Smart-match score for /invest listings.
 *
 * Cross-references the visitor's `investor_profiles` row against a
 * listing's shape to produce a 0–100 affinity score. Used by the
 * page to render a "85% match" badge on cards that are particularly
 * well-suited.
 *
 * Design choices:
 *   - Pure function — no DB calls, no async — so it can run for every
 *     card in one pass without N+1 cost.
 *   - Returns `null` when there isn't enough signal to score, so the
 *     UI hides the badge entirely (better than a confidently-wrong
 *     "50% match" on an anonymous browser).
 *   - Score floor is 50 — once a listing matches *anything*, "0%" is
 *     misleading. Hide weak matches entirely instead.
 *   - We mirror the inputs the existing GetMatched routing logic uses
 *     so the two surfaces feel consistent: budget_band → ticket size
 *     bucket, is_cross_border → FIRB / SIV relevance, primary_vertical
 *     → vertical match, intent_country_snapshot → foreign-investor
 *     boost on SIV-complying / FIRB-eligible rows.
 */

import type { InvestmentListing } from "@/lib/types";
import { deriveListingKind } from "@/lib/listing-kind";

/**
 * Subset of `investor_profiles` columns the matcher reads. Marked
 * partial so the matcher works against either a row fetched fresh
 * or a cookie-cached pruned profile.
 */
export interface InvestorProfileSnapshot {
  is_fhb?: boolean | null;
  is_pre_retiree?: boolean | null;
  is_business_owner?: boolean | null;
  is_cross_border?: boolean | null;
  is_hnw?: boolean | null;
  intent_country_snapshot?: string | null;
  /** Free-text budget band: "under_100k" / "100k_to_1m" / "1m_to_5m" / "5m_plus" */
  budget_band?: string | null;
  /** "beginner" / "intermediate" / "advanced" */
  experience_level?: string | null;
  /** Primary vertical interest — matches investment_listings.vertical */
  primary_vertical?: string | null;
}

const SCORE_FLOOR = 50;
const SCORE_CEILING = 99;

/**
 * Map a budget_band enum value to the ticket-size cents range we'd
 * expect a listing to fall within for a "good" match. Boundaries
 * align with TICKET_BUCKETS in lib/listing-kind.ts.
 */
function ticketRangeForBudget(band?: string | null): [number, number] | null {
  switch (band) {
    case "under_100k":  return [0, 10_000_000];
    case "100k_to_1m":  return [10_000_000, 100_000_000];
    case "1m_to_5m":    return [100_000_000, 500_000_000];
    case "5m_plus":     return [500_000_000, Infinity];
    default: return null;
  }
}

/** Returns a 0..100 match score, or null if there isn't enough signal. */
export function computeMatchScore(
  listing: InvestmentListing,
  profile: InvestorProfileSnapshot | null | undefined,
): number | null {
  if (!profile) return null;

  // Need at least one signal field set to bother scoring.
  const hasSignal =
    !!profile.primary_vertical ||
    !!profile.budget_band ||
    profile.is_cross_border === true ||
    profile.is_hnw === true ||
    profile.is_business_owner === true ||
    profile.is_pre_retiree === true ||
    profile.is_fhb === true ||
    !!profile.intent_country_snapshot;
  if (!hasSignal) return null;

  let score = 0;
  let denominator = 0;

  // Each weight slot is denominator++ + (matched ? weight : 0)
  // Total weights sum to 100 so the raw score is naturally a percent.
  const weights = {
    vertical: 25,
    budget: 20,
    cross_border_alignment: 15,
    hnw_alignment: 10,
    profile_archetype: 10,
    siv_alignment: 10,
    experience_alignment: 10,
  };

  const km = (listing.key_metrics ?? {}) as Record<string, unknown>;
  const kind = deriveListingKind(listing);

  // 1) Vertical / primary interest match
  denominator += weights.vertical;
  if (profile.primary_vertical && listing.vertical === profile.primary_vertical) {
    score += weights.vertical;
  } else if (profile.primary_vertical && relatedVertical(profile.primary_vertical, listing.vertical)) {
    score += Math.round(weights.vertical * 0.6);
  }

  // 2) Budget / ticket match
  denominator += weights.budget;
  const range = ticketRangeForBudget(profile.budget_band);
  if (range) {
    const minInvest = km["min_investment_aud"] ?? km["min_commit_aud"] ?? km["min_investment"];
    const minInvestCents = typeof minInvest === "number" ? minInvest * 100 : undefined;
    const ticket = listing.asking_price_cents ?? minInvestCents;
    if (ticket != null) {
      if (ticket >= range[0] && ticket < range[1]) {
        score += weights.budget;
      } else if (ticket < range[1] * 2 && ticket > range[0] / 2) {
        // Adjacent bucket — partial credit
        score += Math.round(weights.budget * 0.5);
      }
    }
  }

  // 3) Cross-border alignment
  denominator += weights.cross_border_alignment;
  const wholesaleOnly = km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
  if (profile.is_cross_border) {
    if (listing.firb_eligible) score += weights.cross_border_alignment;
    else if (km["accepts_international"] === true) score += Math.round(weights.cross_border_alignment * 0.7);
  } else {
    // Domestic visitor — neutral on FIRB, but penalise wholesale-only
    // unless they're HNW (they qualify for s708 self-attest).
    if (!wholesaleOnly || profile.is_hnw) {
      score += weights.cross_border_alignment;
    } else {
      score += Math.round(weights.cross_border_alignment * 0.3);
    }
  }

  // 4) HNW alignment — HNW investors get a small boost for project
  //    equity, private credit, royalty, pre-IPO; non-HNW get a boost
  //    for retail-friendly kinds (for_sale_business, physical_asset).
  denominator += weights.hnw_alignment;
  const hnwFavoured: typeof kind[] = ["project_equity", "royalty", "equity_raise"];
  if (profile.is_hnw && hnwFavoured.includes(kind)) {
    score += weights.hnw_alignment;
  } else if (!profile.is_hnw && (kind === "for_sale_business" || kind === "physical_asset" || kind === "listed_security")) {
    score += weights.hnw_alignment;
  } else {
    score += Math.round(weights.hnw_alignment * 0.5);
  }

  // 5) Profile archetype — match obvious affinities.
  denominator += weights.profile_archetype;
  if (profile.is_business_owner && kind === "for_sale_business") score += weights.profile_archetype;
  else if (profile.is_pre_retiree && (kind === "fund" || kind === "for_sale_asset")) score += weights.profile_archetype;
  else if (profile.is_fhb && (listing.vertical as string) === "commercial-property") score += weights.profile_archetype;
  else score += Math.round(weights.profile_archetype * 0.5);

  // 6) SIV alignment — only meaningful when the visitor has indicated
  //    foreign-investor intent (intent_country_snapshot set).
  denominator += weights.siv_alignment;
  if (profile.intent_country_snapshot && listing.siv_complying) {
    score += weights.siv_alignment;
  } else if (profile.intent_country_snapshot && listing.firb_eligible) {
    score += Math.round(weights.siv_alignment * 0.6);
  } else if (!profile.intent_country_snapshot) {
    // Domestic visitor — neutral pass
    score += Math.round(weights.siv_alignment * 0.7);
  }

  // 7) Experience alignment — beginners get a boost for retail kinds
  //    with PDS / public-read available; advanced get a boost for
  //    wholesale / accredited offerings.
  denominator += weights.experience_alignment;
  if (profile.experience_level === "beginner" && !wholesaleOnly) {
    score += weights.experience_alignment;
  } else if ((profile.experience_level === "advanced" || profile.is_hnw) && wholesaleOnly) {
    score += weights.experience_alignment;
  } else {
    score += Math.round(weights.experience_alignment * 0.5);
  }

  const pct = Math.round((score / denominator) * 100);
  if (pct < SCORE_FLOOR) return null; // hide weak matches
  return Math.min(SCORE_CEILING, pct);
}

/** Relaxed vertical comparison — captures obvious sector neighbours. */
function relatedVertical(a: string, b: string): boolean {
  const groups = [
    ["mining", "uranium", "hydrogen", "oil-gas", "lithium", "gold", "commodities"],
    ["renewable-energy", "hydrogen", "carbon-environmental-markets"],
    ["commercial_property", "commercial-property", "farmland", "livestock"],
    ["fund", "funds", "private-credit", "private-equity", "infrastructure"],
    ["startup", "startups", "pre_ipo", "pre-ipo"],
  ];
  for (const g of groups) {
    if (g.includes(a) && g.includes(b)) return true;
  }
  return false;
}
