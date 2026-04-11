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
    const questionId = parseInt(id, 10);
    if (isNaN(questionId)) {
      return NextResponse.json({ error: "Invalid question ID" }, { status: 400 });
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

    // Verify question exists and is approved
    const { data: question, error: qErr } = await supabase
      .from("broker_questions")
      .select("id, vote_count")
      .eq("id", questionId)
      .eq("status", "approved")
      .single();

    if (qErr || !question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check for existing vote
    const { data: existingVote } = await supabase
      .from("qa_votes")
      .select("id, vote_value")
      .eq("target_type", "question")
      .eq("target_id", questionId)
      .eq("voter_identifier", voterIdentifier)
      .single();

    let voteDelta = vote;

    if (existingVote) {
      if (existingVote.vote_value === vote) {
        // Same vote already cast - no change
        return NextResponse.json({ vote_count: question.vote_count });
      }
      // Changing vote: delta is the difference (e.g., -1 to 1 = +2)
      voteDelta = vote - existingVote.vote_value;

      const { error: updateErr } = await supabase
        .from("qa_votes")
        .update({ vote_value: vote })
        .eq("id", existingVote.id);

      if (updateErr) {
        log.error("Failed to update vote", { error: updateErr.message });
        return NextResponse.json({ error: "Failed to update vote" }, { status: 500 });
      }
    } else {
      // Insert new vote
      const { error: insertErr } = await supabase.from("qa_votes").insert({
        target_type: "question",
        target_id: questionId,
        voter_identifier: voterIdentifier,
        vote_value: vote,
      });

      if (insertErr) {
        log.error("Failed to insert vote", { error: insertErr.message });
        return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
      }
    }

    // Update vote_count on the question
    const newVoteCount = (question.vote_count || 0) + voteDelta;
    const { error: countErr } = await supabase
      .from("broker_questions")
      .update({ vote_count: newVoteCount })
      .eq("id", questionId);

    if (countErr) {
      log.error("Failed to update question vote_count", { error: countErr.message });
      return NextResponse.json({ error: "Failed to update vote count" }, { status: 500 });
    }

    return NextResponse.json({ vote_count: newVoteCount });
  } catch (err) {
    log.error("Vote error", { error: err instanceof Error ? err.message : "Unknown" });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
