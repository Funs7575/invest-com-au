/**
 * POST /api/advisor-portal/office-hours — create a new session
 * GET  /api/advisor-portal/office-hours — list advisor's own sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

export const runtime = "nodejs";

const CreateBody = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(2000).optional(),
  scheduled_at: z.string().datetime(),
  ends_at: z.string().datetime().optional(),
  max_questions: z.number().int().min(1).max(100).optional(),
  is_published: z.boolean().optional(),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const advisorId = await requireAdvisorSession(req);
  if (!advisorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("advisor_office_hours")
    .select("id, title, scheduled_at, ends_at, status, max_questions, rsvp_count, is_published, created_at")
    .eq("advisor_id", advisorId)
    .order("scheduled_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(CreateBody, async (req: NextRequest, body) => {
  const advisorId = await requireAdvisorSession(req);
  if (!advisorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: inserted, error } = await supabase
    .from("advisor_office_hours")
    .insert({
      advisor_id: advisorId,
      title: body.title,
      description: body.description ?? null,
      scheduled_at: body.scheduled_at,
      ends_at: body.ends_at ?? null,
      max_questions: body.max_questions ?? 20,
      status: "upcoming",
      is_published: body.is_published ?? false,
    })
    .select("id, title, scheduled_at, status, max_questions, is_published")
    .single();

  if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  return NextResponse.json(inserted, { status: 201 });
});
