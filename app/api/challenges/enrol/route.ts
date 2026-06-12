/**
 * POST /api/challenges/enrol — enrol the signed-in user in a challenge cohort.
 *
 * - When the cohort's `enrolment_open` is true → an 'enrolled' row.
 * - When closed → a 'waitlisted' row (the next-cohort waitlist) so we can email
 *   them when the next cohort opens.
 * - Honours `max_cohort`: if the enrolled count has hit the cap, the user is
 *   waitlisted instead of rejected.
 *
 * Idempotent: re-enrolling returns the existing row. Owner-scoped via RLS
 * (auth.uid() = user_id). Dormant behind the `cohort_challenges` flag.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  challengesEnabled,
  getEnrolledCount,
  type ChallengeRow,
} from "@/lib/challenges/data";

export const runtime = "nodejs";

const log = logger("api:challenges:enrol");

const Body = z.object({
  slug: z.string().min(1).max(120),
});

export const POST = withValidatedBody(
  Body,
  async (req: NextRequest, body): Promise<NextResponse> => {
    if (!(await challengesEnabled())) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (
      !(await isAllowed("challenges_enrol", ipKey(req), {
        max: 20,
        refillPerSec: 0.2,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Resolve the cohort (public read).
    const { data: challengeData, error: chErr } = await supabase
      .from("challenges")
      .select(
        "id, slug, title, description, curriculum_key, starts_at, ends_at, enrolment_open, max_cohort, club_id, created_at",
      )
      .eq("slug", body.slug)
      .maybeSingle();
    if (chErr || !challengeData) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const challenge = challengeData as ChallengeRow;

    // Already enrolled? Return the existing row (idempotent).
    const { data: existing } = await supabase
      .from("challenge_enrolments")
      .select("id, status")
      .eq("challenge_id", challenge.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        ok: true,
        status: (existing as { status: string }).status,
        already: true,
      });
    }

    // Decide enrolled vs waitlisted: closed cohort, or cap reached → waitlist.
    let status: "enrolled" | "waitlisted" = challenge.enrolment_open
      ? "enrolled"
      : "waitlisted";
    if (status === "enrolled" && challenge.max_cohort != null) {
      const enrolled = await getEnrolledCount(challenge.id);
      if (enrolled >= challenge.max_cohort) status = "waitlisted";
    }

    const { error: insErr } = await supabase
      .from("challenge_enrolments")
      .insert({ challenge_id: challenge.id, user_id: user.id, status });

    if (insErr) {
      // Unique violation = concurrent enrol; treat as success.
      if ((insErr as { code?: string }).code === "23505") {
        return NextResponse.json({ ok: true, status, already: true });
      }
      log.error("enrol insert failed", {
        error: insErr.message,
        challengeId: challenge.id,
      });
      return NextResponse.json({ error: "enrol_failed" }, { status: 500 });
    }

    log.info("challenge enrolment created", {
      challengeId: challenge.id,
      status,
    });
    return NextResponse.json({ ok: true, status, already: false });
  },
);
