import { NextRequest, NextResponse } from "next/server";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAdvisorTrustScore, type AdvisorTrustScoreInput } from "@/lib/advisor-trust-score";

export const runtime = "nodejs";

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
  trust_score_overall: number | null;
  trust_score_updated_at: string | null;
  trust_score_version: number | null;
};

export async function GET(req: NextRequest) {
  const professionalId = await requireAdvisorSession(req);
  if (!professionalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: rawRow, error } = await admin
    .from("professionals")
    .select(
      "id, verified, afsl_number, registration_number, verified_at, " +
      "created_at, years_experience, bio, photo_url, qualifications, " +
      "education, memberships, fee_structure, fee_description, " +
      "linkedin_url, website, languages, rating, review_count, " +
      "trust_score_overall, trust_score_updated_at, trust_score_version",
    )
    .eq("id", professionalId)
    .single();

  if (error || !rawRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = rawRow as unknown as ProfRow;

  const input: AdvisorTrustScoreInput = {
    verified: row.verified,
    afsl_number: row.afsl_number,
    registration_number: row.registration_number,
    verified_at: row.verified_at,
    created_at: row.created_at,
    years_experience: row.years_experience,
    bio: row.bio,
    photo_url: row.photo_url,
    qualifications: row.qualifications,
    education: row.education,
    memberships: row.memberships,
    fee_structure: row.fee_structure,
    fee_description: row.fee_description,
    linkedin_url: row.linkedin_url,
    website: row.website,
    languages: row.languages,
    rating: row.rating,
    review_count: row.review_count,
  };

  // Always compute fresh (pure function — no I/O)
  const score = computeAdvisorTrustScore(input);

  return NextResponse.json({
    score,
    cached_overall: row.trust_score_overall ?? null,
    cached_updated_at: row.trust_score_updated_at ?? null,
    cached_version: row.trust_score_version ?? 0,
  });
}
