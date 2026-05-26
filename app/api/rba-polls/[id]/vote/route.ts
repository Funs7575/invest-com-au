/**
 * POST /api/rba-polls/[id]/vote — cast or change an RBA prediction.
 *
 * Body: { vote: 1 | 0 | -1 }  (1=HIKE, 0=HOLD, -1=CUT)
 *
 * Upserts into forum_votes on UNIQUE(target_type, target_id, voter_user_id).
 * Returns early if the poll is no longer open (revealed or closed).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:rba-polls:vote");

export const runtime = "nodejs";

const VoteBody = z.object({
  vote: z.union([z.literal(1), z.literal(0), z.literal(-1)]),
});

export const POST = withValidatedBody(VoteBody, async (req: NextRequest, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { pathname } = new URL(req.url);
  const segments = pathname.split("/");
  const idSegment = segments[segments.indexOf("rba-polls") + 1] ?? "";
  const pollId = parseInt(idSegment, 10);
  if (!Number.isFinite(pollId) || pollId <= 0) {
    return NextResponse.json({ error: "invalid_poll_id" }, { status: 400 });
  }

  // Verify poll exists and is still open.
  const { data: poll } = await supabase
    .from("rba_polls")
    .select("id, status")
    .eq("id", pollId)
    .single();

  if (!poll) return NextResponse.json({ error: "poll_not_found" }, { status: 404 });
  if (poll.status !== "open") {
    return NextResponse.json({ error: "poll_closed" }, { status: 409 });
  }

  // Upsert prediction — one per (poll, user).
  const { error } = await supabase
    .from("forum_votes")
    .upsert(
      {
        target_type: "rba_poll",
        target_id: pollId,
        voter_user_id: user.id,
        vote: body.vote,
      },
      { onConflict: "target_type,target_id,voter_user_id" },
    );

  if (error) {
    log.warn("upsert failed", { userId: user.id, pollId, error: error.message });
    return NextResponse.json({ error: "vote_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pollId, vote: body.vote });
});
