import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAdvisorTrustScore, type AdvisorTrustScoreInput } from "@/lib/advisor-trust-score";
import { withCronRunLog } from "@/lib/cron-run-log";
import { logger } from "@/lib/logger";

type ProfRow = {
  id: number;
  verified: boolean | null;
  afsl_number: string | null;
  registration_number: string | null;
  verified_at: string | null;
  created_at: string | null;
  years_experience: number | null;
  bio: string | null;
  photo_url: string | null;
  qualifications: unknown[] | null;
  education: unknown[] | null;
  memberships: unknown[] | null;
  fee_structure: string | null;
  fee_description: string | null;
  linkedin_url: string | null;
  website: string | null;
  languages: unknown[] | null;
  rating: number | null;
  review_count: number | null;
  trust_score_version: number | null;
};

const log = logger("cron-recompute-trust-scores");

export const runtime = "nodejs";
export const maxDuration = 300;

// Trust tier badge thresholds (score → badge_type)
const TRUST_TIERS = [
  { threshold: 85, badge: "trust_elite" },
  { threshold: 70, badge: "trust_pro" },
  { threshold: 55, badge: "trust_growth" },
  { threshold: 40, badge: "trust_starter" },
] as const;

function tierBadgeFor(score: number): string | null {
  for (const { threshold, badge } of TRUST_TIERS) {
    if (score >= threshold) return badge;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("recompute-trust-scores", async () => {
    const admin = createAdminClient();
    const computedAt = new Date().toISOString();

    // Load all active professionals with trust-score input fields
    const { data: rawData, error: fetchErr } = await admin
      .from("professionals")
      .select(
        "id, verified, afsl_number, registration_number, verified_at, " +
        "created_at, years_experience, bio, photo_url, qualifications, " +
        "education, memberships, fee_structure, fee_description, " +
        "linkedin_url, website, languages, rating, review_count, " +
        "trust_score_version",
      )
      .eq("status", "active");

    if (fetchErr) {
      log.error("Failed to load professionals", { error: fetchErr.message });
      return { response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }), stats: {} };
    }

    const rows = (rawData ?? []) as unknown as ProfRow[];
    let updated = 0;
    let badgesAwarded = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const input: AdvisorTrustScoreInput = {
          verified: row.verified,
          afsl_number: row.afsl_number,
          registration_number: row.registration_number,
          verified_at: row.verified_at,
          created_at: row.created_at,
          years_experience: row.years_experience,
          bio: row.bio,
          photo_url: row.photo_url,
          qualifications: row.qualifications as unknown[] | null,
          education: row.education as unknown[] | null,
          memberships: row.memberships as unknown[] | null,
          fee_structure: row.fee_structure,
          fee_description: row.fee_description,
          linkedin_url: row.linkedin_url,
          website: row.website,
          languages: row.languages as unknown[] | null,
          rating: row.rating,
          review_count: row.review_count,
        };

        const score = computeAdvisorTrustScore(input, computedAt);

        const { error: updateErr } = await admin
          .from("professionals")
          .update({
            trust_score_overall: score.overall,
            trust_score_updated_at: computedAt,
            trust_score_version: ((row.trust_score_version as number | null) ?? 0) + 1,
          })
          .eq("id", row.id);

        if (updateErr) {
          log.error("Failed to update trust score", { id: row.id, error: updateErr.message });
          errors++;
          continue;
        }
        updated++;

        // Award the highest-qualifying trust tier badge
        const tierBadge = tierBadgeFor(score.overall);
        if (tierBadge) {
          const { error: badgeErr } = await admin
            .from("advisor_badges")
            .upsert(
              {
                professional_id: row.id,
                badge_type: tierBadge,
                earned_at: computedAt,
                metadata: { score: score.overall, label: score.label },
              },
              { onConflict: "professional_id,badge_type" },
            );
          if (!badgeErr) badgesAwarded++;
        }
      } catch (err) {
        log.error("Unexpected error for professional", { id: row.id, err });
        errors++;
      }
    }

    log.info("recompute-trust-scores complete", { total: rows.length, updated, badgesAwarded, errors });
    return {
      response: NextResponse.json({ success: true, total: rows.length, updated, badgesAwarded, errors }),
      stats: { total: rows.length, updated, badgesAwarded, errors },
    };
  });
}
