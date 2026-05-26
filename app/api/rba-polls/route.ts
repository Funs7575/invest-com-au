/**
 * GET /api/rba-polls — list RBA cash-rate prediction polls.
 *
 * Returns all polls (newest first) with per-poll vote tallies (HIKE/HOLD/CUT)
 * and, for authenticated users, their own prediction.
 *
 * ISR-friendly: response is cache-control: max-age=60 so pages can revalidate
 * without hammering the DB on every request.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:rba-polls");

export const runtime = "nodejs";

interface PollRow {
  id: number;
  meeting_date: string;
  description: string;
  status: string;
  outcome: number | null;
  change_bps: number | null;
  decided_at: string | null;
}

interface VoteRow {
  target_id: number;
  vote: number;
  voter_user_id: string;
}

function tallyVotes(votes: VoteRow[], pollId: number) {
  const subset = votes.filter((v) => v.target_id === pollId);
  const tally = { hike: 0, hold: 0, cut: 0, total: 0 };
  for (const v of subset) {
    tally.total++;
    if (v.vote === 1) tally.hike++;
    else if (v.vote === 0) tally.hold++;
    else if (v.vote === -1) tally.cut++;
  }
  return tally;
}

export async function GET() {
  // Fetch polls with admin client (public-readable, but admin avoids
  // per-request cookie parsing and cookie jar for this aggregate endpoint).
  const admin = createAdminClient();

  const { data: polls, error: pollsErr } = await admin
    .from("rba_polls")
    .select("id, meeting_date, description, status, outcome, change_bps, decided_at")
    .order("meeting_date", { ascending: false })
    .limit(20);

  if (pollsErr) {
    log.warn("polls fetch failed", { error: pollsErr.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const typedPolls = (polls ?? []) as PollRow[];
  const pollIds = typedPolls.map((p) => p.id);

  if (pollIds.length === 0) {
    return NextResponse.json({ polls: [] });
  }

  // Fetch all votes for these polls in one query.
  const { data: voteRows } = await admin
    .from("forum_votes")
    .select("target_id, vote, voter_user_id")
    .eq("target_type", "rba_poll")
    .in("target_id", pollIds);

  const votes = (voteRows ?? []) as VoteRow[];

  // Check if user is authenticated so we can return their own vote.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Not authenticated — skip.
  }

  const enriched = typedPolls.map((poll) => {
    const tally = tallyVotes(votes, poll.id);
    const myVote = userId
      ? (votes.find((v) => v.target_id === poll.id && v.voter_user_id === userId)?.vote ?? null)
      : null;
    return { ...poll, tally, myVote };
  });

  const res = NextResponse.json({ polls: enriched });
  res.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return res;
}
