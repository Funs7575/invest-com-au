import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isAllowed } from "@/lib/rate-limit-db";

const log = logger("community:vote");

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Per-user rate limit: 30 votes / min sustained, 60 burst
    if (!(await isAllowed("community_vote", `u:${user.id}`, { max: 60, refillPerSec: 0.5 }))) {
      return NextResponse.json({ error: "Slow down — voting too fast" }, { status: 429 });
    }

    const body = await req.json();
    const { target_type, target_id, vote } = body;

    // Validation
    if (!target_type || !target_id || vote === undefined) {
      return NextResponse.json({ error: "Missing required fields: target_type, target_id, vote" }, { status: 400 });
    }
    if (!["thread", "post"].includes(target_type)) {
      return NextResponse.json({ error: "target_type must be 'thread' or 'post'" }, { status: 400 });
    }
    if (vote !== 1 && vote !== -1) {
      return NextResponse.json({ error: "vote must be 1 or -1" }, { status: 400 });
    }

    const admin = createAdminClient();
    const table = target_type === "thread" ? "forum_threads" : "forum_posts";

    // Verify the target exists and get its author
    const { data: target, error: targetError } = await admin
      .from(table)
      .select("id, author_id, vote_score")
      .eq("id", target_id)
      .eq("is_removed", false)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: `${target_type} not found` }, { status: 404 });
    }

    // Prevent self-voting
    if (target.author_id === user.id) {
      return NextResponse.json({ error: "Cannot vote on your own content" }, { status: 400 });
    }

    // Check for existing vote
    const { data: existingVote } = await admin
      .from("forum_votes")
      .select("id, vote")
      .eq("target_type", target_type)
      .eq("target_id", target_id)
      .eq("user_id", user.id)
      .single();

    let scoreDelta = 0;
    let reputationDelta = 0;

    if (existingVote) {
      if (existingVote.vote === vote) {
        // Same vote again: remove the vote (toggle off)
        await admin
          .from("forum_votes")
          .delete()
          .eq("id", existingVote.id);

        scoreDelta = -vote;
        reputationDelta = -vote; // Remove the reputation effect
      } else {
        // Changing vote direction
        await admin
          .from("forum_votes")
          .update({ vote, created_at: new Date().toISOString() })
          .eq("id", existingVote.id);

        scoreDelta = vote * 2; // Swing from -1 to +1 or vice versa
        reputationDelta = vote * 2;
      }
    } else {
      // New vote
      const { error: insertError } = await admin
        .from("forum_votes")
        .insert({
          target_type,
          target_id,
          user_id: user.id,
          vote,
        });

      if (insertError) {
        log.error("Failed to insert vote", { error: insertError.message });
        return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
      }

      scoreDelta = vote;
      reputationDelta = vote;
    }

    // Update vote_score on target
    const newScore = (target.vote_score ?? 0) + scoreDelta;

    const { error: scoreError } = await admin
      .from(table)
      .update({ vote_score: newScore })
      .eq("id", target_id);

    if (scoreError) {
      log.error("Failed to update vote_score", { error: scoreError.message });
    }

    // Update author's reputation. Race-safe: ensure profile exists
    // first via upsert with ignoreDuplicates, then read-modify-write
    // the reputation. Same pattern as posts/threads route.
    if (reputationDelta !== 0) {
      await admin
        .from("forum_user_profiles")
        .upsert(
          {
            user_id: target.author_id,
            display_name: "User",
            reputation: 0,
            thread_count: 0,
            post_count: 0,
            is_moderator: false,
          },
          { onConflict: "user_id", ignoreDuplicates: true },
        );

      const { data: authorProfile } = await admin
        .from("forum_user_profiles")
        .select("reputation")
        .eq("user_id", target.author_id)
        .maybeSingle();
      if (authorProfile) {
        await admin
          .from("forum_user_profiles")
          .update({ reputation: (authorProfile.reputation ?? 0) + reputationDelta })
          .eq("user_id", target.author_id);
      }
    }

    return NextResponse.json({ vote_score: newScore });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
