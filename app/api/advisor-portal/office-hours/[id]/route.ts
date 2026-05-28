/**
 * PATCH  /api/advisor-portal/office-hours/[id] — update session (status, publish, etc.)
 * DELETE /api/advisor-portal/office-hours/[id] — delete a draft session
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

export const runtime = "nodejs";

const VALID_STATUS = ["draft", "upcoming", "live", "ended", "transcript"] as const;

const UpdateBody = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().max(2000).optional(),
  scheduled_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  max_questions: z.number().int().min(1).max(100).optional(),
  status: z.enum(VALID_STATUS).optional(),
  is_published: z.boolean().optional(),
});

type Params = Promise<{ id: string }>;

// ── PATCH ─────────────────────────────────────────────────────────────────────

export const PATCH = withValidatedBody(UpdateBody, async (req: NextRequest, body) => {
  const segments = req.nextUrl.pathname.split("/");
  const idStr = segments[segments.indexOf("office-hours") + 1];
  const sessionId = parseInt(idStr ?? "", 10);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const advisorId = await requireAdvisorSession(req);
  if (!advisorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // Verify session belongs to this advisor
  const { data: existing } = await supabase
    .from("advisor_office_hours")
    .select("id, advisor_id, status")
    .eq("id", sessionId)
    .eq("advisor_id", advisorId)
    .single();

  if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Disallow editing ended sessions except to publish transcript
  if (existing.status === "ended" && body.status !== "transcript") {
    return NextResponse.json({ error: "Cannot edit ended session" }, { status: 409 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at;
  if (body.max_questions !== undefined) updates.max_questions = body.max_questions;
  if (body.status !== undefined) updates.status = body.status;
  if (body.is_published !== undefined) updates.is_published = body.is_published;

  const { data, error } = await supabase
    .from("advisor_office_hours")
    .update(updates)
    .eq("id", sessionId)
    .select("id, title, status, is_published, updated_at")
    .single();

  if (error) return NextResponse.json({ error: "update_failed" }, { status: 500 });
  return NextResponse.json(data);
});

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const advisorId = await requireAdvisorSession(req);
  if (!advisorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // Only allow deleting draft sessions
  const { data: existing } = await supabase
    .from("advisor_office_hours")
    .select("id, advisor_id, status")
    .eq("id", sessionId)
    .eq("advisor_id", advisorId)
    .single();

  if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only draft sessions can be deleted" }, { status: 409 });
  }

  await supabase.from("advisor_office_hours").delete().eq("id", sessionId);
  return NextResponse.json({ success: true });
}
