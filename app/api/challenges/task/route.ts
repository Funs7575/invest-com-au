/**
 * POST /api/challenges/task — mark (or unmark) a challenge task complete.
 *
 * Body: { slug, taskKey, done }. `done: true` records a completion (idempotent
 * via the UNIQUE(enrolment_id, task_key) constraint); `done: false` removes it.
 * On reaching 100% a completion certificate is minted into the enrolment row.
 *
 * Owner-scoped via RLS (the completion is gated through the user's own
 * enrolment). Tasks are self-attested. Dormant behind the `cohort_challenges`
 * flag.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { challengesEnabled, type ChallengeRow, type EnrolmentRow } from "@/lib/challenges/data";
import { getCurriculum, taskKeySet } from "@/lib/challenges/progress";
import { maybeIssueCertificate } from "@/lib/challenges/certificate";

export const runtime = "nodejs";

const log = logger("api:challenges:task");

const Body = z.object({
  slug: z.string().min(1).max(120),
  taskKey: z.string().min(1).max(120),
  done: z.boolean(),
});

export const POST = withValidatedBody(
  Body,
  async (req: NextRequest, body): Promise<NextResponse> => {
    if (!(await challengesEnabled())) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (
      !(await isAllowed("challenges_task", ipKey(req), {
        max: 60,
        refillPerSec: 1,
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

    const curriculum = getCurriculum(challenge.curriculum_key);
    if (!curriculum) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    // Reject task keys that don't belong to this curriculum.
    if (!taskKeySet(curriculum).has(body.taskKey)) {
      return NextResponse.json({ error: "unknown_task" }, { status: 400 });
    }

    // Must have an active enrolment to record progress.
    const { data: enrolmentData } = await supabase
      .from("challenge_enrolments")
      .select(
        "id, challenge_id, user_id, status, enrolled_at, completed_at, certificate_id, certificate_issued_at, last_nudge_on",
      )
      .eq("challenge_id", challenge.id)
      .eq("user_id", user.id)
      .maybeSingle();
    const enrolment = enrolmentData as EnrolmentRow | null;
    if (!enrolment || enrolment.status !== "enrolled") {
      return NextResponse.json({ error: "not_enrolled" }, { status: 403 });
    }

    if (!body.done) {
      const { error } = await supabase
        .from("challenge_task_completions")
        .delete()
        .eq("enrolment_id", enrolment.id)
        .eq("task_key", body.taskKey);
      if (error) {
        log.error("task uncomplete failed", { error: error.message });
        return NextResponse.json({ error: "update_failed" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, done: false });
    }

    // Record completion idempotently (UNIQUE(enrolment_id, task_key)).
    const { error: insErr } = await supabase
      .from("challenge_task_completions")
      .upsert(
        { enrolment_id: enrolment.id, task_key: body.taskKey },
        { onConflict: "enrolment_id,task_key", ignoreDuplicates: true },
      );
    if (insErr) {
      log.error("task complete failed", { error: insErr.message });
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    // Re-read the full completed set and mint a certificate if now 100%.
    const { data: completions } = await supabase
      .from("challenge_task_completions")
      .select("task_key")
      .eq("enrolment_id", enrolment.id);
    const completedKeys = new Set(
      ((completions as { task_key: string }[] | null) ?? []).map((r) => r.task_key),
    );

    let certificateId: string | null = enrolment.certificate_id;
    const mint = await maybeIssueCertificate(
      enrolment,
      challenge.curriculum_key,
      completedKeys,
    );
    if (mint) certificateId = mint.certificateId;

    return NextResponse.json({
      ok: true,
      done: true,
      completed: completedKeys.size,
      total: curriculum.tasks.length,
      certificateId,
    });
  },
);
