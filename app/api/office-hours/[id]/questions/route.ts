/**
 * GET  /api/office-hours/[id]/questions — list questions for a session
 * POST /api/office-hours/[id]/questions — submit a question (auth required)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const QuestionBody = z.object({
  question: z.string().min(5).max(500),
  is_anonymous: z.boolean().optional(),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("office_hour_questions")
    .select("id, session_id, display_name, question, is_anonymous, answer, answered_at, upvote_count, created_at")
    .eq("session_id", sessionId)
    .eq("is_removed", false)
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ questions: data ?? [] });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(QuestionBody, async (req: NextRequest, body) => {
  const segments = req.nextUrl.pathname.split("/");
  const idStr = segments[segments.indexOf("office-hours") + 1];
  const sessionId = parseInt(idStr ?? "", 10);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (await isRateLimited(`oh_question:${user.id}`, 10, 60)) {
    return NextResponse.json({ error: "Too many questions" }, { status: 429 });
  }

  // Verify session exists, is published, and is accepting questions (live or upcoming)
  const { data: session } = await supabase
    .from("advisor_office_hours")
    .select("id, status, max_questions, is_published")
    .eq("id", sessionId)
    .single();

  if (!session || !session.is_published) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "live" && session.status !== "upcoming") {
    return NextResponse.json({ error: "Session is not accepting questions" }, { status: 409 });
  }

  // Count existing questions to enforce max_questions
  const { count } = await supabase
    .from("office_hour_questions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("is_removed", false);

  if ((count ?? 0) >= session.max_questions) {
    return NextResponse.json({ error: "Question limit reached for this session" }, { status: 409 });
  }

  const { question, is_anonymous = false } = body;

  // Resolve display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, first_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = is_anonymous
    ? "Anonymous"
    : (profile as { display_name?: string; first_name?: string } | null)?.display_name ||
      (profile as { display_name?: string; first_name?: string } | null)?.first_name ||
      "Investor";

  const { data: inserted, error: insertErr } = await supabase
    .from("office_hour_questions")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      display_name: displayName,
      question,
      is_anonymous,
    })
    .select("id, session_id, display_name, question, is_anonymous, upvote_count, created_at")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
});
