import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { cpdYearFor } from "@/lib/course-certificates";

const log = logger("cron-award-badges");

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const admin = createAdminClient();
  let awarded = 0;

  // Helper to upsert a badge
  const awardBadge = async (
    professionalId: number,
    badgeType: string,
    metadata?: object,
  ) => {
    const { error } = await admin.from("advisor_badges").upsert(
      {
        professional_id: professionalId,
        badge_type: badgeType,
        earned_at: new Date().toISOString(),
        metadata: metadata ?? null,
      },
      { onConflict: "professional_id,badge_type" },
    );
    if (!error) awarded++;
  };

  // 1. profile_complete: professionals with profile_score >= 90
  const { data: complete } = await admin
    .from("professionals")
    .select("id")
    .gte("profile_score", 90)
    .eq("status", "active");
  for (const p of complete ?? []) {
    await awardBadge(p.id, "profile_complete");
  }

  // 2. top_rated: rating >= 4.8 AND review_count >= 5
  const { data: topRated } = await admin
    .from("professionals")
    .select("id")
    .gte("rating", 4.8)
    .gte("review_count", 5)
    .eq("status", "active");
  for (const p of topRated ?? []) {
    await awardBadge(p.id, "top_rated");
  }

  // 3. first_review: review_count >= 1
  const { data: firstReview } = await admin
    .from("professionals")
    .select("id")
    .gte("review_count", 1)
    .eq("status", "active");
  for (const p of firstReview ?? []) {
    await awardBadge(p.id, "first_review");
  }

  // 4. cpd_compliant: 40+ hours in current CPD year
  const cpd_year = cpdYearFor(new Date());
  const { data: cpdCredits } = await admin
    .from("cpd_credits")
    .select("professional_id, hours_earned")
    .eq("cpd_year", cpd_year)
    .gte("hours_earned", 1);

  // Group by professional_id and sum
  const cpdByPro: Record<number, number> = {};
  for (const c of cpdCredits ?? []) {
    const pid = c.professional_id as number;
    cpdByPro[pid] = (cpdByPro[pid] ?? 0) + ((c.hours_earned as number) ?? 0);
  }
  for (const [pid, hours] of Object.entries(cpdByPro)) {
    if (hours >= 40) {
      await awardBadge(Number(pid), "cpd_compliant", { cpd_year, hours });
    }
  }

  // 5. verified: AFSL verified advisors (professionals with afsl_number set)
  const { data: verified } = await admin
    .from("professionals")
    .select("id")
    .not("afsl_number", "is", null)
    .eq("status", "active");
  for (const p of verified ?? []) {
    await awardBadge(p.id, "verified");
  }

  // 6. course_creator: has 3+ published advisor courses; first_course: 1+
  const { data: courseCreators } = await admin
    .from("courses")
    .select("advisor_professional_id")
    .eq("status", "published")
    .eq("creator_kind", "advisor")
    .not("advisor_professional_id", "is", null);

  const courseCounts: Record<number, number> = {};
  for (const c of courseCreators ?? []) {
    const pid = c.advisor_professional_id as number;
    courseCounts[pid] = (courseCounts[pid] ?? 0) + 1;
  }
  for (const [pid, count] of Object.entries(courseCounts)) {
    if (count >= 1) await awardBadge(Number(pid), "first_course");
    if (count >= 3) await awardBadge(Number(pid), "course_creator");
  }

  log.info("award-badges cron complete", { awarded });
  return NextResponse.json({ success: true, awarded });
}
