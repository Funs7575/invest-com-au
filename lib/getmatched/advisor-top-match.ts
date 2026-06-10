/**
 * lib/getmatched/advisor-top-match.ts
 *
 * Decision Engine P2 (docs/plans/UNIFIED_MATCHING_ENGINE.md): the advisor lane
 * for /get-matched's resolve. For advisor-shaped routes it returns REAL ranked
 * advisors — loaded from `professionals`, scored by the one shared engine
 * (`scoreQuizAdvisors`) with an attribute-driven one-line "why" — in the
 * existing `TopMatch` shape the carousel already renders.
 *
 * Gated by the `advisor_match_v2_get_matched` feature flag: flag off (or any
 * error) reproduces today's behaviour exactly (brokers for `compare`, []
 * otherwise). Fail-soft everywhere — resolve must never break on this lane.
 */
// Documented service-role exception: serves the anonymous /get-matched path;
// full professionals profile columns have no anon SELECT policy (same
// category as POST /api/advisor-match — see CLAUDE.md "Two Supabase clients").
// eslint-disable-next-line no-restricted-imports -- anonymous-path exception, see above
import { createAdminClient } from "@/lib/supabase/admin";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import {
  scoreQuizAdvisors,
  type QuizAdvisorCandidate,
} from "@/lib/quiz-advisor-scoring";
import { buildAdvisorMatchReasons } from "@/lib/quiz-advisor-match-reasons";
import { dbTypeForNeed } from "@/lib/quiz-advisor-types";
import { fetchAdvisorOutcomeStats, rankByOutcomes } from "@/lib/advisor-match-ranking";
import { allocateAdvisorsFromActionPlan } from "./advisor-allocation";
import { computeTopMatches } from "./top-match";
import type { ActionPlanAnswers, RouteType, TopMatch, Vertical } from "./types";

const log = logger("getmatched:advisor-top-match");

export const ADVISOR_MATCH_V2_FLAG = "advisor_match_v2_get_matched";

const ADVISOR_ROUTES: ReadonlySet<RouteType> = new Set([
  "individual",
  "firm",
  "expert_team",
] as RouteType[]);

// Same whitelisted column set as POST /api/advisor-match — no email/phone or
// internal columns ever leave the server.
const CANDIDATE_SELECT =
  "id, slug, name, firm_name, type, photo_url, rating, review_count, " +
  "location_display, location_state, office_states, specialties, " +
  "fee_description, verified, min_investment_cents, minimum_investment_cents, " +
  "accepts_new_clients, accepting_new_clients, availability_status, " +
  "available_in_countries, firb_specialist, international_tax_specialist, " +
  "accepts_international_clients, languages, years_experience, " +
  "avg_response_minutes, response_time_hours, initial_consultation_free, " +
  "trust_score_overall, country_eligibility";

/** Rank real advisors for a get-matched plan via the shared engine. */
export async function computeTopAdvisors(
  answers: ActionPlanAnswers,
  limit = 3,
): Promise<TopMatch[]> {
  const { advisorType, scoringContext } = allocateAdvisorsFromActionPlan(answers);
  const dbType = dbTypeForNeed(advisorType);

  const supabase = createAdminClient();
  let query = supabase
    .from("professionals")
    .select(CANDIDATE_SELECT)
    .eq("status", "active")
    .eq("verified", true);
  if (dbType) query = query.eq("type", dbType);

  const { data, error } = await query
    .order("rating", { ascending: false })
    .order("review_count", { ascending: false })
    .limit(40);

  if (error) {
    log.warn("advisor candidate load failed — lane empty", { err: error.message });
    return [];
  }

  const candidates = (data ?? []) as unknown as QuizAdvisorCandidate[];
  let ranked = scoreQuizAdvisors(candidates, scoringContext, limit);

  // P9 outcome learning: blend the engine's fit scores with real historical
  // engagement (professional_leads outcomes) via the shared rankByOutcomes.
  // Fail-soft — stats unavailable or empty preserves the pure engine order.
  try {
    const stats = await fetchAdvisorOutcomeStats(supabase);
    if (stats.length > 0) {
      const blended = rankByOutcomes(
        ranked.map((a) => ({ id: a.id, matchScore: a.matchScore })),
        stats,
      );
      const pos = new Map(blended.map((b, i) => [b.id, i]));
      ranked = [...ranked].sort(
        (x, y) => (pos.get(x.id) ?? 999) - (pos.get(y.id) ?? 999),
      );
    }
  } catch {
    /* keep engine order */
  }

  return ranked.map((a, i) => {
    const reasons = buildAdvisorMatchReasons(
      {
        type: a.type,
        specialties: a.specialties,
        location_display: a.location_display,
        location_state: a.location_state,
        rating: a.rating,
        review_count: a.review_count,
        verified: a.verified,
        accepts_international_clients: a.accepts_international_clients,
        international_tax_specialist: a.international_tax_specialist,
        firb_specialist: a.firb_specialist,
        languages: a.languages,
        available_in_countries: a.available_in_countries,
        years_experience: a.years_experience,
        avg_response_minutes: a.avg_response_minutes,
        response_time_hours: a.response_time_hours,
        initial_consultation_free: a.initial_consultation_free,
      },
      {
        advisorType,
        goal: scoringContext.goal,
        budget: scoringContext.budget,
        userState: scoringContext.userState,
        isInternational: scoringContext.isInternational,
        investorCountry: scoringContext.investorCountry,
        visaStatus: scoringContext.visaStatus,
        investorGoalIntl: scoringContext.investorGoalIntl,
      },
      1,
    );
    return {
      kind: "advisor" as const,
      ref_id: a.id,
      slug: a.slug,
      name: a.name,
      logo_url: a.photo_url ?? null,
      rating: a.rating ?? null,
      rating_count: a.review_count ?? null,
      one_line_why: reasons[0] ?? "Matched to your stated needs",
      location_display: a.location_display ?? null,
      fee_description: a.fee_description ?? null,
      specialties_preview: (a.specialties ?? []).slice(0, 3),
      cta_label: "View profile",
      cta_href: `/advisor/${a.slug}`,
      vertical: null,
      tier: i + 1,
    };
  });
}

/**
 * The single top-match decision for resolve: compare → brokers (unchanged);
 * advisor-shaped routes → real advisors when the flag is on; else [].
 */
export async function topMatchesForRoute(
  answers: ActionPlanAnswers,
  resolved: { route: RouteType; vertical: Vertical | null },
  limit = 3,
): Promise<TopMatch[]> {
  if (resolved.route === "compare") {
    return computeTopMatches(answers, resolved.vertical, limit);
  }
  if (!ADVISOR_ROUTES.has(resolved.route)) return [];
  try {
    const enabled = await isFlagEnabled(ADVISOR_MATCH_V2_FLAG, {});
    if (!enabled) return [];
    return await computeTopAdvisors(answers, limit);
  } catch (err) {
    log.warn("advisor lane failed — falling back to empty", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
