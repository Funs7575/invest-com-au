/**
 * POST   /api/office-hours/[id]/rsvp — add RSVP (auth required)
 * DELETE /api/office-hours/[id]/rsvp — remove RSVP (auth required)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function POST(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (await isRateLimited(`oh_rsvp:${user.id}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Verify session exists and accepts RSVPs
  const { data: session } = await supabase
    .from("advisor_office_hours")
    .select("id, status, is_published")
    .eq("id", sessionId)
    .single();

  if (!session || !session.is_published) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status === "ended" || session.status === "transcript") {
    return NextResponse.json({ error: "Session is no longer accepting RSVPs" }, { status: 409 });
  }

  const { error } = await supabase
    .from("office_hour_rsvps")
    .insert({ session_id: sessionId, user_id: user.id });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already RSVP'd" }, { status: 409 });
    }
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // Increment rsvp_count denormalized column
  await supabase
    .from("advisor_office_hours")
    .update({ rsvp_count: (session as unknown as { rsvp_count?: number })?.rsvp_count ?? 0 })
    .eq("id", sessionId);

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("office_hour_rsvps")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  return NextResponse.json({ success: true });
}
