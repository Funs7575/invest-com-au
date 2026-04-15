/**
 * Advisor health scorecard.
 *
 * Same signal set the ranker uses (response time, review stats,
 * dispute history, profile completeness, AFSL status) but
 * expressed as a transparent 0-100 breakdown the advisor can see
 * at /advisor-portal/health. The goal is "if your score is 62,
 * here's exactly what you can fix to get it to 80".
 *
 * Factors (each 0-100):
 *   - response_speed      — median response time on recent leads
 *   - lead_acceptance     — accepted / delivered (declines hurt)
 *   - review_quality      — recent rating + volume
 *   - dispute_rate        — 1 - disputes/leads (30 day window)
 *   - profile_completeness — % of key profile fields populated
 *   - compliance_status   — AFSL active + verified
 *
 * Overall score = weighted average, weights tuned to match the
 * ranker's blend so "improve your health score" actually improves
 * the ranking result.
 *
 * Recomputed per-advisor by `recomputeAdvisorHealth(id)`, which
 * the job_queue worker calls nightly plus on demand after a
 * dispute / review event. Result cached in
 * `professionals.health_score / health_scored_at / health_factors`.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("advisor-health");

export interface HealthFactor {
  key:
    | "response_speed"
    | "lead_acceptance"
    | "review_quality"
    | "dispute_rate"
    | "profile_completeness"
    | "compliance_status";
  label: string;
  score: number; // 0-100
  weight: number; // relative weight used for the overall score
  recommendation: string;
}

export interface HealthScorecard {
  advisorId: number;
  overall: number; // 0-100
  factors: HealthFactor[];
  updatedAt: string;
}

const FACTOR_WEIGHTS: Record<HealthFactor["key"], number> = {
  response_speed: 0.25,
  lead_acceptance: 0.15,
  review_quality: 0.2,
  dispute_rate: 0.15,
  profile_completeness: 0.15,
  compliance_status: 0.1,
};

/**
 * Pure scoring function. Input is a set of raw measurements;
 * output is the breakdown. Exported so unit tests don't need a
 * Supabase stub.
 */
export function computeHealthFactors(input: {
  medianResponseHours: number | null;
  leadsDelivered: number;
  leadsAccepted: number;
  leadsDisputed: number;
  recentRating: number | null;
  recentReviewCount: number;
  profileFieldsFilled: number;
  profileFieldsTotal: number;
  afslActive: boolean;
  verified: boolean;
}): HealthFactor[] {
  const factors: HealthFactor[] = [];

  // ── Response speed ──
  {
    const hours = input.medianResponseHours;
    let score = 50;
    let rec = "Respond to new leads within 2 hours to keep this above 80.";
    if (hours == null) {
      score = 60;
      rec = "No response data yet — respond to your first lead to seed this metric.";
    } else if (hours <= 1) {
      score = 100;
      rec = "Great — keep responses under 1 hour.";
    } else if (hours <= 2) {
      score = 90;
      rec = "Excellent response time.";
    } else if (hours <= 6) {
      score = 75;
      rec = "Good, but dropping below 2 hours lifts this to 90+.";
    } else if (hours <= 24) {
      score = 50;
      rec = "Respond inside 6 hours to jump this score by 25 points.";
    } else {
      score = 20;
      rec = "Slow response — aim for under 24 hours to stop the ranker penalising you.";
    }
    factors.push({
      key: "response_speed",
      label: "Response speed",
      score,
      weight: FACTOR_WEIGHTS.response_speed,
      recommendation: rec,
    });
  }

  // ── Lead acceptance ──
  {
    const denom = Math.max(input.leadsDelivered, 1);
    const rate = input.leadsAccepted / denom;
    const score = Math.round(rate * 100);
    let rec = "Keep acceptance above 80%.";
    if (input.leadsDelivered === 0) rec = "Not enough leads delivered yet.";
    else if (rate < 0.5) rec = "Decline rate is high — consider narrowing your lead criteria.";
    else if (rate < 0.8) rec = "Moderate decline rate. Tighten your advisor profile so you only get matching leads.";
    factors.push({
      key: "lead_acceptance",
      label: "Lead acceptance",
      score,
      weight: FACTOR_WEIGHTS.lead_acceptance,
      recommendation: rec,
    });
  }

  // ── Review quality ──
  {
    const rating = input.recentRating;
    const count = input.recentReviewCount;
    let score = 50;
    let rec = "Collect 10+ reviews with a 4.5+ average to hit 90.";
    if (rating == null || count === 0) {
      score = 50;
      rec = "No recent reviews — ask clients who had a good outcome for a short review.";
    } else if (rating >= 4.8 && count >= 10) {
      score = 100;
      rec = "Outstanding review quality.";
    } else if (rating >= 4.5 && count >= 5) {
      score = 85;
      rec = "Strong. More reviews at this rating push you to 100.";
    } else if (rating >= 4.0) {
      score = 70;
      rec = "Good. Gather more feedback to stabilise this.";
    } else {
      score = 40;
      rec = "Below target — recent ratings are pulling you down. Flag review issues with support.";
    }
    factors.push({
      key: "review_quality",
      label: "Review quality",
      score,
      weight: FACTOR_WEIGHTS.review_quality,
      recommendation: rec,
    });
  }

  // ── Dispute rate ──
  {
    const denom = Math.max(input.leadsDelivered, 1);
    const rate = input.leadsDisputed / denom;
    const score = Math.round((1 - Math.min(rate, 0.5) * 2) * 100);
    let rec = "No open disputes — keep it that way.";
    if (rate >= 0.1) rec = "Dispute rate is high. Review which lead signals you want and tighten your filters.";
    else if (rate > 0) rec = "A few disputes in the window. Ensure the lead matches your stated criteria before billing.";
    factors.push({
      key: "dispute_rate",
      label: "Dispute rate",
      score,
      weight: FACTOR_WEIGHTS.dispute_rate,
      recommendation: rec,
    });
  }

  // ── Profile completeness ──
  {
    const total = Math.max(input.profileFieldsTotal, 1);
    const score = Math.round((input.profileFieldsFilled / total) * 100);
    let rec = "Profile 100% complete.";
    if (score < 100) rec = `Fill out the remaining ${total - input.profileFieldsFilled} profile fields.`;
    if (score < 60) rec = "Profile incomplete — the ranker discounts partial profiles significantly.";
    factors.push({
      key: "profile_completeness",
      label: "Profile completeness",
      score,
      weight: FACTOR_WEIGHTS.profile_completeness,
      recommendation: rec,
    });
  }

  // ── Compliance status ──
  {
    let score = 50;
    let rec = "AFSL must be active + advisor verified to hit 100.";
    if (input.afslActive && input.verified) {
      score = 100;
      rec = "AFSL active and verified. ";
    } else if (input.afslActive) {
      score = 70;
      rec = "AFSL active but advisor not yet verified.";
    } else if (input.verified) {
      score = 50;
      rec = "Verified but AFSL status needs refresh.";
    } else {
      score = 20;
      rec = "AFSL or verification missing — this blocks new lead billing.";
    }
    factors.push({
      key: "compliance_status",
      label: "Compliance status",
      score,
      weight: FACTOR_WEIGHTS.compliance_status,
      recommendation: rec,
    });
  }

  return factors;
}

/**
 * Overall health score is a weighted average of the factors.
 * Pure function.
 */
export function computeOverallHealth(factors: HealthFactor[]): number {
  if (factors.length === 0) return 0;
  let weighted = 0;
  let totalWeight = 0;
  for (const f of factors) {
    weighted += f.score * f.weight;
    totalWeight += f.weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round(weighted / totalWeight);
}

/**
 * Fetch raw data for an advisor + compute the scorecard + cache
 * to the `professionals` row. Called from the job queue worker
 * on demand (e.g. after a dispute) and by a nightly cron for the
 * full population.
 */
export async function recomputeAdvisorHealth(advisorId: number): Promise<HealthScorecard | null> {
  const supabase = createAdminClient();

  const { data: advisor, error } = await supabase
    .from("professionals")
    .select(
      "id, status, verified, auto_pause_reason, median_response_hours, rating, review_count, name, firm_name, bio, location_display, photo_url, website_url",
    )
    .eq("id", advisorId)
    .maybeSingle();

  if (error || !advisor) {
    log.warn("recomputeAdvisorHealth — advisor not found", { advisorId });
    return null;
  }

  // 30-day lead + dispute window
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: delivered }, { count: accepted }, { count: disputed }] = await Promise.all([
    supabase
      .from("professional_leads")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", advisorId)
      .gte("created_at", windowStart),
    supabase
      .from("professional_leads")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", advisorId)
      .eq("billed", true)
      .gte("created_at", windowStart),
    supabase
      .from("lead_disputes")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", advisorId)
      .gte("created_at", windowStart),
  ]);

  const profileFields = [
    advisor.name,
    advisor.firm_name,
    advisor.bio,
    advisor.location_display,
    advisor.photo_url,
    advisor.website_url,
  ];
  const filled = profileFields.filter((v) => !!v).length;

  const factors = computeHealthFactors({
    medianResponseHours: (advisor.median_response_hours as number | null) ?? null,
    leadsDelivered: delivered || 0,
    leadsAccepted: accepted || 0,
    leadsDisputed: disputed || 0,
    recentRating: (advisor.rating as number | null) ?? null,
    recentReviewCount: (advisor.review_count as number | null) ?? 0,
    profileFieldsFilled: filled,
    profileFieldsTotal: profileFields.length,
    afslActive: advisor.auto_pause_reason !== "afsl_ceased",
    verified: !!advisor.verified,
  });

  const overall = computeOverallHealth(factors);
  const scoredAt = new Date().toISOString();

  await supabase
    .from("professionals")
    .update({
      health_score: overall,
      health_scored_at: scoredAt,
      health_factors: factors as unknown as Record<string, unknown>,
    })
    .eq("id", advisorId);

  return { advisorId, overall, factors, updatedAt: scoredAt };
}
