/**
 * POST /api/challenges/withdraw — withdraw the signed-in user from a cohort.
 *
 * Deletes the user's enrolment (and, by ON DELETE CASCADE, their task
 * completions). Owner-scoped via RLS. Idempotent — withdrawing when not
 * enrolled is a no-op success. Dormant behind the `cohort_challenges` flag.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { challengesEnabled } from "@/lib/challenges/data";

export const runtime = "nodejs";

const log = logger("api:challenges:withdraw");

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
      !(await isAllowed("challenges_withdraw", ipKey(req), {
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

    const { data: challenge, error: chErr } = await supabase
      .from("challenges")
      .select("id")
      .eq("slug", body.slug)
      .maybeSingle();
    if (chErr || !challenge) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { error: delErr } = await supabase
      .from("challenge_enrolments")
      .delete()
      .eq("challenge_id", (challenge as { id: string }).id)
      .eq("user_id", user.id);

    if (delErr) {
      log.error("withdraw delete failed", { error: delErr.message });
      return NextResponse.json({ error: "withdraw_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  },
);
