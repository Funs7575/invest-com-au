/**
 * POST   /api/office-hours/[id]/questions/[qid]/upvote — add upvote
 * DELETE /api/office-hours/[id]/questions/[qid]/upvote — remove upvote
 *
 * Atomically increments/decrements upvote_count on office_hour_questions.
 * The UPDATE fires a Realtime event so live viewers see the count change.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

type Params = Promise<{ id: string; qid: string }>;

async function getIds(params: Params): Promise<{ sessionId: number; questionId: number } | null> {
  const { id, qid } = await params;
  const sessionId = parseInt(id, 10);
  const questionId = parseInt(qid, 10);
  if (!Number.isInteger(sessionId) || sessionId <= 0) return null;
  if (!Number.isInteger(questionId) || questionId <= 0) return null;
  return { sessionId, questionId };
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const ids = await getIds(params);
  if (!ids) return NextResponse.json({ error: "Invalid ids" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (await isRateLimited(`oh_upvote:${user.id}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Insert upvote record
  const { error: insertErr } = await supabase
    .from("office_hour_upvotes")
    .insert({ question_id: ids.questionId, user_id: user.id });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "Already upvoted" }, { status: 409 });
    }
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // Increment count — fires Realtime UPDATE on office_hour_questions
  await supabase.rpc("increment_oh_upvote", { question_id_arg: ids.questionId });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const ids = await getIds(params);
  if (!ids) return NextResponse.json({ error: "Invalid ids" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error: delErr } = await supabase
    .from("office_hour_upvotes")
    .delete()
    .eq("question_id", ids.questionId)
    .eq("user_id", user.id);

  if (delErr) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  // Decrement count — fires Realtime UPDATE on office_hour_questions
  await supabase.rpc("decrement_oh_upvote", { question_id_arg: ids.questionId });

  return NextResponse.json({ success: true });
}
