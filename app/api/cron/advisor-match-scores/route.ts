import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { withCronRunLog } from "@/lib/cron-run-log";
import { computeAdvisorProfileMatch, type UserMatchProfile, type AdvisorMatchProfile, type IdealClientCriteria } from "@/lib/advisor-profile-match";
import { rankByOutcomes, fetchAdvisorOutcomeStats } from "@/lib/advisor-match-ranking";
import { logger } from "@/lib/logger";

const log = logger("cron-advisor-match-scores");

export const runtime = "nodejs";
export const maxDuration = 300;

// Store top N matches per user
const TOP_N = 30;

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("advisor-match-scores", async () => {
    const admin = createAdminClient();

    // Load all investor profiles with at least one signal
    const { data: rawProfiles, error: profErr } = await admin
      .from("investor_profiles")
      .select("auth_user_id, primary_vertical, budget_band, is_fhb, is_hnw, is_pre_retiree, experience_level");

    if (profErr) {
      log.error("Failed to load investor_profiles", { error: profErr.message });
      return { response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }), stats: {} };
    }

    const profiles = (rawProfiles ?? []) as unknown as Array<{
      auth_user_id: string;
      primary_vertical: string | null;
      budget_band: string | null;
      is_fhb: boolean;
      is_hnw: boolean;
      is_pre_retiree: boolean;
      experience_level: string | null;
    }>;

    // Only process users who have set at least one preference
    const activeProfiles = profiles.filter(
      (p) => p.primary_vertical || p.budget_band || p.is_fhb || p.is_hnw || p.is_pre_retiree,
    );

    // Load all active advisors
    const { data: rawAdvisors, error: advErr } = await admin
      .from("professionals")
      .select(
        "id, specialties, min_investment_cents, minimum_investment_cents, " +
        "location_state, office_states, accepts_new_clients, advisor_tier, " +
        "rating, review_count",
      )
      .eq("status", "active")
      .eq("accepts_new_clients", true);

    if (advErr) {
      log.error("Failed to load professionals", { error: advErr.message });
      return { response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }), stats: {} };
    }

    const advisors = (rawAdvisors ?? []) as unknown as AdvisorMatchProfile[];

    // Load ideal-client criteria for all advisors (for match boost)
    const { data: rawCriteria } = await admin
      .from("advisor_ideal_clients")
      .select("professional_id, criteria");
    const criteriaByAdvisor = new Map<number, IdealClientCriteria>();
    for (const row of (rawCriteria ?? []) as unknown as Array<{ professional_id: number; criteria: IdealClientCriteria }>) {
      criteriaByAdvisor.set(row.professional_id, row.criteria);
    }

    // Load historical outcomes for all advisors
    const outcomesStats = await fetchAdvisorOutcomeStats(admin);

    let upserted = 0;
    let errors = 0;

    for (const profile of activeProfiles) {
      try {
        const userProfile: UserMatchProfile = {
          primary_vertical: profile.primary_vertical,
          budget_band: profile.budget_band,
          is_fhb: profile.is_fhb,
          is_hnw: profile.is_hnw,
          is_pre_retiree: profile.is_pre_retiree,
          experience_level: profile.experience_level,
        };

        // Compute base match score for each advisor (with ideal-client boost)
        const candidates = advisors.map((advisor) => ({
          id: advisor.id,
          matchScore: computeAdvisorProfileMatch(userProfile, advisor, criteriaByAdvisor.get(advisor.id)),
        }));

        // Blend with historical outcomes via rankByOutcomes
        const ranked = rankByOutcomes(candidates, outcomesStats);

        // Take top N
        const topN = ranked.slice(0, TOP_N);

        // Upsert match scores
        const rows = topN.map((r) => ({
          user_id: profile.auth_user_id,
          professional_id: r.id,
          match_percent: Math.round(r._outcomesScore),
          computed_at: new Date().toISOString(),
        }));

        if (rows.length > 0) {
          const { error: upsertErr } = await admin
            .from("advisor_user_match_scores")
            .upsert(rows, { onConflict: "user_id,professional_id" });
          if (upsertErr) {
            log.error("Upsert failed", { user_id: profile.auth_user_id, error: upsertErr.message });
            errors++;
          } else {
            upserted += rows.length;
          }
        }
      } catch (err) {
        log.error("Unexpected error for profile", { user_id: profile.auth_user_id, err });
        errors++;
      }
    }

    log.info("advisor-match-scores complete", {
      profiles: activeProfiles.length,
      advisors: advisors.length,
      upserted,
      errors,
    });

    return {
      response: NextResponse.json({
        success: true,
        profiles: activeProfiles.length,
        advisors: advisors.length,
        upserted,
        errors,
      }),
      stats: { profiles: activeProfiles.length, advisors: advisors.length, upserted, errors },
    };
  });
}
