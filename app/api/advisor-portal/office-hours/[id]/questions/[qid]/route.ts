/**
 * PATCH /api/advisor-portal/office-hours/[id]/questions/[qid]
 *
 * Advisor answers a question or removes it.
 * Updating `answer` fires a Realtime UPDATE event on office_hour_questions
 * so live attendees see the answer appear in real-time.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

export const runtime = "nodejs";

const AnswerBody = z.object({
  answer: z.string().min(1).max(2000).optional(),
  is_removed: z.boolean().optional(),
});

export const PATCH = withValidatedBody(AnswerBody, async (req: NextRequest, body) => {
  const segments = req.nextUrl.pathname.split("/");
  const ohIdx = segments.indexOf("office-hours");
  const sessionId = parseInt(segments[ohIdx + 1] ?? "", 10);
  const questionId = parseInt(segments[segments.indexOf("questions") + 1] ?? "", 10);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }
  if (!Number.isInteger(questionId) || questionId <= 0) {
    return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
  }

  const advisorId = await requireAdvisorSession(req);
  if (!advisorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // Verify the session belongs to this advisor
  const { data: session } = await supabase
    .from("advisor_office_hours")
    .select("id, advisor_id")
    .eq("id", sessionId)
    .eq("advisor_id", advisorId)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Verify the question belongs to this session
  const { data: question } = await supabase
    .from("office_hour_questions")
    .select("id, session_id")
    .eq("id", questionId)
    .eq("session_id", sessionId)
    .single();

  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.answer !== undefined) {
    updates.answer = body.answer;
    updates.answered_at = new Date().toISOString();
  }
  if (body.is_removed !== undefined) updates.is_removed = body.is_removed;

  const { data, error } = await supabase
    .from("office_hour_questions")
    .update(updates)
    .eq("id", questionId)
    .select("id, question, answer, answered_at, is_removed")
    .single();

  if (error) return NextResponse.json({ error: "update_failed" }, { status: 500 });
  return NextResponse.json(data);
});
