/**
 * lib/quiz-advisor-scoring.ts
 *
 * Weighted ranking for the find-advisor quiz's advisor path. Replaces the old
 * `rating DESC` ordering with a 0–100 fit score composed from the user's quiz
 * answers and the advisor's stated attributes:
 *
 *   Specialty / goal fit                     35
 *   Budget vs stated minimum                 25
 *   Location (domestic) / corridor (intl)    20
 *   Quality (rating · trust · responsiveness)20
 *
 * Plus a country-eligibility GATE (a UK visitor never sees a UK-blocked
 * advisor — the old client query skipped this) and a qualitative confidence
 * band (strong / good / fair) for the UI — never a fake-precise %.
 *
 * COMPLIANCE: factual stated-profile overlap only — NOT a suitability
 * recommendation under RG 234 / RG 256. Mirrors lib/advisor-profile-match.ts.
 * The confidence band describes *profile match*, not advice quality.
 *
 * Pure — no I/O. The route (app/api/advisor-match) does the DB read and passes
 * rows in; eligibility resolution + intent mapping are pure too.
 */

import {
  filterByCountryEligibility,
  type CountryEligibility,
} from "./country-mode/eligibility-filter";
import { intentCountryFromQuizKey } from "./intent-context";
import { TYPE_KEYWORDS, INTL_KEYWORDS } from "./quiz-advisor-match-reasons";

export type MatchConfidence = "strong" | "good" | "fair";

/** Advisor attributes the scorer reads. All optional — a partial DB projection
 *  degrades gracefully (missing signals score neutral, never throw). */
export interface QuizAdvisorCandidate {
  id: number;
  slug: string;
  name: string;
  firm_name?: string | null;
  type: string;
  photo_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  location_display?: string | null;
  location_state?: string | null;
  office_states?: string[] | null;
  specialties?: string[] | null;
  fee_description?: string | null;
  verified?: boolean | null;
  min_investment_cents?: number | null;
  minimum_investment_cents?: number | null;
  accepts_new_clients?: boolean | null;
  accepting_new_clients?: boolean | null;
  availability_status?: string | null;
  available_in_countries?: string[] | null;
  firb_specialist?: boolean | null;
  international_tax_specialist?: boolean | null;
  accepts_international_clients?: boolean | null;
  languages?: string[] | null;
  years_experience?: number | null;
  avg_response_minutes?: number | null;
  response_time_hours?: number | null;
  initial_consultation_free?: boolean | null;
  trust_score_overall?: number | null;
  country_eligibility?: CountryEligibility | Record<string, unknown> | null;
}

export interface QuizAdvisorScoringContext {
  /** Quiz advisor_type slug, hyphenated e.g. "mortgage-broker". */
  advisorType?: string;
  goal?: string;
  amount?: string;
  /** AdvisorLocationStep budget value, e.g. "100k_500k". */
  budget?: string;
  /** User's AU state, e.g. "NSW". */
  userState?: string;
  isInternational?: boolean;
  /** Quiz investor_country key, e.g. "uk". */
  investorCountry?: string;
  visaStatus?: string;
  investorGoalIntl?: string;
}

export interface ScoredQuizAdvisor extends QuizAdvisorCandidate {
  /** 0–100 factual profile-fit score. */
  matchScore: number;
  confidence: MatchConfidence;
}

// Approx budget midpoints in cents. AdvisorLocationStep budget bands take
// precedence (more specific to the advisor context); else derive from the
// quiz `amount`. Used only for the min-investment comparison.
const BUDGET_MIDPOINTS_CENTS: Record<string, number> = {
  under_100k: 50_000_00,
  "100k_500k": 300_000_00,
  "500k_2m": 1_250_000_00,
  over_2m: 3_000_000_00,
};
const AMOUNT_MIDPOINTS_CENTS: Record<string, number> = {
  small: 10_000_00,
  medium: 55_000_00,
  large: 300_000_00,
  whale: 1_000_000_00,
};

const GOAL_KEYWORDS: Record<string, string[]> = {
  property: ["property", "real estate", "buyer", "investment property", "negative gearing"],
  home: ["home", "first home", "mortgage", "loan", "refinanc"],
  super: ["super", "smsf", "retirement", "pension"],
  crypto: ["crypto", "digital asset", "cgt"],
  shares: ["share", "equit", "portfolio", "etf"],
  savings: ["savings", "cash", "deposit"],
  business: ["business", "company", "structuring"],
};

function userMidpointCents(ctx: QuizAdvisorScoringContext): number | null {
  if (ctx.budget && BUDGET_MIDPOINTS_CENTS[ctx.budget] != null) return BUDGET_MIDPOINTS_CENTS[ctx.budget];
  if (ctx.amount && AMOUNT_MIDPOINTS_CENTS[ctx.amount] != null) return AMOUNT_MIDPOINTS_CENTS[ctx.amount];
  return null;
}

function goalKeywordsFor(goal?: string, intlGoal?: string): string[] {
  const g = goal ?? intlGoal;
  return g ? GOAL_KEYWORDS[g] ?? [] : [];
}

/** Qualitative band from the numeric score — surfaced to users instead of a
 *  fake-precise %, per the CRO research on confidence cues. */
export function confidenceBand(score: number): MatchConfidence {
  if (score >= 75) return "strong";
  if (score >= 55) return "good";
  return "fair";
}

/** Human label for a confidence band. */
export function confidenceLabel(c: MatchConfidence): string {
  return c === "strong" ? "Strong match" : c === "good" ? "Good match" : "Possible match";
}

function scoreOne(c: QuizAdvisorCandidate, ctx: QuizAdvisorScoringContext): number {
  let score = 0;
  const specsLower = (c.specialties ?? []).filter(Boolean).map((s) => s.toLowerCase());

  // 1) Specialty / goal fit (35). Candidates are already the requested type,
  //    so this rewards a sub-specialty that matches the goal/intl-goal.
  const typeKeywords = ctx.advisorType ? TYPE_KEYWORDS[ctx.advisorType] ?? [] : [];
  const pool = ctx.isInternational
    ? [...typeKeywords, ...goalKeywordsFor(ctx.goal, ctx.investorGoalIntl), ...INTL_KEYWORDS]
    : [...typeKeywords, ...goalKeywordsFor(ctx.goal, ctx.investorGoalIntl)];
  if (pool.length > 0 && specsLower.some((s) => pool.some((k) => s.includes(k)))) {
    score += 35;
  } else if (specsLower.length > 0) {
    score += 14; // right type, lists specialties, no direct goal hit
  } else {
    score += 18; // generalist of the requested type
  }

  // 2) Budget vs stated minimum (25).
  const minInvest = c.min_investment_cents ?? c.minimum_investment_cents ?? null;
  const midpoint = userMidpointCents(ctx);
  if (midpoint != null && minInvest != null) {
    if (minInvest <= midpoint) score += 25;
    else if (minInvest <= midpoint * 2) score += 13;
    // else 0 — advisor's minimum is well above this budget
  } else if (minInvest == null) {
    score += 18; // no minimum stated — broadly accessible
  } else {
    score += 12; // budget unknown but advisor has a minimum — neutral
  }

  // 3) Location (domestic) / corridor (international) (20).
  if (ctx.isInternational) {
    const country = ctx.investorCountry;
    if (country && (c.available_in_countries ?? []).includes(country)) score += 20;
    else if (c.firb_specialist && (ctx.investorGoalIntl === "property" || !ctx.investorGoalIntl)) score += 13;
    else if (c.international_tax_specialist) score += 12;
    else if (c.accepts_international_clients) score += 9;
    else score += 3;
  } else if (ctx.userState) {
    const states = (c.office_states && c.office_states.length > 0
      ? c.office_states
      : c.location_state
        ? [c.location_state]
        : []
    ).map((s) => s.toLowerCase());
    score += states.includes(ctx.userState.toLowerCase()) ? 20 : 6;
  } else {
    score += 10; // no location given — neutral
  }

  // 4) Quality (20): rating (≤12, review-confidence weighted) + trust (≤5) +
  //    responsiveness (≤3).
  let quality = 0;
  if (typeof c.rating === "number" && c.rating > 0) {
    const conf = Math.min(1, (c.review_count ?? 0) / 10);
    quality += Math.min(12, (c.rating / 5) * 12 * (0.5 + 0.5 * conf));
  } else {
    quality += 6;
  }
  if (typeof c.trust_score_overall === "number") {
    quality += Math.max(0, Math.min(5, (c.trust_score_overall / 100) * 5));
  }
  const respMin = c.avg_response_minutes ?? (c.response_time_hours != null ? c.response_time_hours * 60 : null);
  if (respMin != null) {
    if (respMin <= 120) quality += 3;
    else if (respMin <= 1440) quality += 2;
    else quality += 1;
  }
  score += Math.min(20, quality);

  // 5) Availability damp — if the advisor is EXPLICITLY not taking clients,
  //    damp (don't exclude; the flag is often unset = unknown = assume open).
  const explicitlyClosed =
    c.accepts_new_clients === false ||
    c.accepting_new_clients === false ||
    (typeof c.availability_status === "string" && /closed|paused|full|not[_-]?accepting/i.test(c.availability_status));
  if (explicitlyClosed) score *= 0.7;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Rank advisor candidates for a quiz user. Applies the country-eligibility
 * gate first (international users only), scores each, sorts best-first, and
 * returns the top `limit`. Ties break on rating then review_count.
 */
export function scoreQuizAdvisors(
  candidates: ReadonlyArray<QuizAdvisorCandidate>,
  ctx: QuizAdvisorScoringContext,
  limit = 5,
): ScoredQuizAdvisor[] {
  const intentCountry = ctx.isInternational
    ? intentCountryFromQuizKey(ctx.investorCountry ?? null)
    : null;
  const eligible = filterByCountryEligibility(candidates, intentCountry);

  const scored: ScoredQuizAdvisor[] = eligible.map((c) => {
    const matchScore = scoreOne(c, ctx);
    return { ...c, matchScore, confidence: confidenceBand(matchScore) };
  });

  scored.sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      (b.rating ?? 0) - (a.rating ?? 0) ||
      (b.review_count ?? 0) - (a.review_count ?? 0),
  );

  return scored.slice(0, limit);
}
