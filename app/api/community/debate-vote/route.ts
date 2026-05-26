/**
 * /api/community/debate-vote
 *
 * GET  ?thread_id=<id>  — returns bull/bear tallies + the caller's current position
 * POST { thread_id, position: 'bull'|'bear' } — upsert or retract vote
 *   - POST with same position as existing vote → retract (idempotent removal)
 *   - POST with different position → switch sides
 *
 * debate_votes has UNIQUE(thread_id, voter_user_id); upsert handles the conflict.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";

const log = logger("api:community:debate-vote");

export const runtime = "nodejs";

const VoteBody = z.object({
  thread_id: z.coerce.number().int().positive(),
  position: z.enum(["bull", "bear"]),
});

interface Tallies {
  thread_id: number;
  bull_count: number;
  bear_count: number;
  total: number;
  user_position: "bull" | "bear" | null;
}

async function getTallies(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: number,
  userId: string | null,
): Promise<Tallies> {
  const { data: rows } = await supabase
    .from("debate_votes")
    .select("position, voter_user_id")
    .eq("thread_id", threadId);

  const votes = rows ?? [];
  const bull_count = votes.filter((v) => v.position === "bull").length;
  const bear_count = votes.filter((v) => v.position === "bear").length;
  const userRow = userId ? votes.find((v) => v.voter_user_id === userId) : null;

  return {
    thread_id: threadId,
    bull_count,
    bear_count,
    total: bull_count + bear_count,
    user_position: (userRow?.position as "bull" | "bear") ?? null,
  };
}

export async function GET(req: NextRequest) {
  const threadIdStr = req.nextUrl.searchParams.get("thread_id");
  const threadId = threadIdStr ? parseInt(threadIdStr, 10) : NaN;
  if (!Number.isFinite(threadId) || threadId <= 0) {
    return NextResponse.json({ error: "valid thread_id required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tallies = await getTallies(supabase, threadId, user?.id ?? null);
  return NextResponse.json(tallies, {
    headers: { "Cache-Control": "no-store" },
  });
}

export const POST = withValidatedBody(VoteBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (await isRateLimited(`debate_vote:${user.id}`, 30, 60)) {
    return NextResponse.json({ error: "voting_too_fast" }, { status: 429 });
  }

  const { thread_id, position } = body;

  // Verify the thread exists and is a debate thread.
  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, thread_type, is_removed")
    .eq("id", thread_id)
    .single();

  if (!thread) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
  if (thread.is_removed) return NextResponse.json({ error: "thread_removed" }, { status: 404 });
  if (thread.thread_type !== "debate") {
    return NextResponse.json({ error: "not_a_debate_thread" }, { status: 409 });
  }

  // Check existing vote to implement toggle behaviour.
  const { data: existing } = await supabase
    .from("debate_votes")
    .select("id, position")
    .eq("thread_id", thread_id)
    .eq("voter_user_id", user.id)
    .maybeSingle();

  if (existing && existing.position === position) {
    // Same side clicked again → retract the vote.
    const { error: delErr } = await supabase
      .from("debate_votes")
      .delete()
      .eq("id", existing.id);

    if (delErr) {
      log.warn("retract vote failed", { userId: user.id, thread_id, error: delErr.message });
      return NextResponse.json({ error: "vote_failed" }, { status: 500 });
    }
  } else {
    // New vote or side switch — upsert.
    const { error: upsertErr } = await supabase.from("debate_votes").upsert(
      {
        thread_id,
        voter_user_id: user.id,
        position,
        voted_at: new Date().toISOString(),
      },
      { onConflict: "thread_id,voter_user_id" },
    );

    if (upsertErr) {
      log.warn("upsert vote failed", { userId: user.id, thread_id, error: upsertErr.message });
      return NextResponse.json({ error: "vote_failed" }, { status: 500 });
    }
  }

  const tallies = await getTallies(supabase, thread_id, user.id);
  return NextResponse.json(tallies);
});
