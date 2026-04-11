import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("qa-vote");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`qa_vote:${ip}`, 30, 1)) {
      return NextResponse.json(
        { error: "Too many votes. Please try again later." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const answerId = parseInt(id, 10);
    if (isNaN(answerId)) {
      return NextResponse.json({ error: "Invalid answer ID" }, { status: 400 });
    }

    const body = await req.json();
    const vote = body.vote;
    if (vote !== 1 && vote !== -1) {
      return NextResponse.json(
        { error: "Vote must be 1 or -1" },
        { status: 400 }
      );
    }

    const voterIdentifier = crypto
      .createHash("sha256")
      .update(ip + (process.env.VOTE_HASH_SALT || "invest-qa-salt"))
      .digest("hex");

    const supabase = createAdminClient();

    // Verify answer exists and is approved
    const { data: answer, error: aErr } = await supabase
      .from("broker_answers")
      .select("id, vote_count, helpful_count")
      .eq("id", answerId)
      .eq("status", "approved")
      .single();

    if (aErr || !answer) {
      return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    }

    // Check for existing vote
    const { data: existingVote } = await supabase
      .from("qa_votes")
      .select("id, vote_value")
      .eq("target_type", "answer")
      .eq("target_id", answerId)
      .eq("voter_identifier", voterIdentifier)
      .single();

    let voteDelta = vote;
    let helpfulDelta = vote === 1 ? 1 : 0;

    if (existingVote) {
      if (existingVote.vote_value === vote) {
        // Same vote already cast - no change
        return NextResponse.json({
          vote_count: answer.vote_count,
          helpful_count: answer.helpful_count,
        });
      }
      // Changing vote: delta is the difference
      voteDelta = vote - existingVote.vote_value;

      // Helpful count tracks upvotes only:
      // changing from -1 to 1 => +1 helpful
      // changing from 1 to -1 => -1 helpful
      if (vote === 1) {
        helpfulDelta = 1; // gaining an upvote
      } else {
        helpfulDelta = -1; // losing an upvote
      }

      const { error: updateErr } = await supabase
        .from("qa_votes")
        .update({ vote_value: vote })
        .eq("id", existingVote.id);

      if (updateErr) {
        log.error("Failed to update answer vote", { error: updateErr.message });
        return NextResponse.json({ error: "Failed to update vote" }, { status: 500 });
      }
    } else {
      // Insert new vote
      const { error: insertErr } = await supabase.from("qa_votes").insert({
        target_type: "answer",
        target_id: answerId,
        voter_identifier: voterIdentifier,
        vote_value: vote,
      });

      if (insertErr) {
        log.error("Failed to insert answer vote", { error: insertErr.message });
        return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
      }
    }

    // Update vote_count and helpful_count on the answer
    const newVoteCount = (answer.vote_count || 0) + voteDelta;
    const newHelpfulCount = Math.max(0, (answer.helpful_count || 0) + helpfulDelta);

    const { error: countErr } = await supabase
      .from("broker_answers")
      .update({ vote_count: newVoteCount, helpful_count: newHelpfulCount })
      .eq("id", answerId);

    if (countErr) {
      log.error("Failed to update answer vote_count", { error: countErr.message });
      return NextResponse.json({ error: "Failed to update vote count" }, { status: 500 });
    }

    return NextResponse.json({
      vote_count: newVoteCount,
      helpful_count: newHelpfulCount,
    });
  } catch (err) {
    log.error("Answer vote error", { error: err instanceof Error ? err.message : "Unknown" });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
