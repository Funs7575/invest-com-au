import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth-events-rsvps");

const DeleteSchema = z.object({ rsvpId: z.number().int() });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limited = await isRateLimited(`advisor-rsvps-get-${advisorId}`, 30, 1);
  if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { eventId } = await params;
  const eventIdNum = parseInt(eventId, 10);
  if (isNaN(eventIdNum)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

  const admin = createAdminClient();

  // Verify ownership
  const { data: event } = await admin
    .from("advisor_events")
    .select("id")
    .eq("id", eventIdNum)
    .eq("professional_id", advisorId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: rsvps, count, error } = await admin
    .from("advisor_event_rsvps")
    .select("*", { count: "exact" })
    .eq("event_id", eventIdNum)
    .order("created_at", { ascending: true });

  if (error) {
    log.error("Failed to fetch RSVPs", { error: error.message, advisorId, eventId: eventIdNum });
    return NextResponse.json({ error: "Failed to fetch RSVPs" }, { status: 500 });
  }

  return NextResponse.json({ rsvps: rsvps ?? [], count: count ?? 0 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { eventId } = await params;
  const eventIdNum = parseInt(eventId, 10);
  if (isNaN(eventIdNum)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify event ownership
  const { data: event } = await admin
    .from("advisor_events")
    .select("id")
    .eq("id", eventIdNum)
    .eq("professional_id", advisorId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { error } = await admin
    .from("advisor_event_rsvps")
    .delete()
    .eq("id", parsed.data.rsvpId)
    .eq("event_id", eventIdNum);

  if (error) {
    log.error("Failed to delete RSVP", { error: error.message, advisorId, eventId: eventIdNum, rsvpId: parsed.data.rsvpId });
    return NextResponse.json({ error: "Failed to delete RSVP" }, { status: 500 });
  }

  // Decrement rsvp_count
  const { data: currentEvent } = await admin
    .from("advisor_events")
    .select("rsvp_count")
    .eq("id", eventIdNum)
    .single();

  if (currentEvent) {
    const newCount = Math.max(0, (currentEvent.rsvp_count ?? 0) - 1);
    await admin.from("advisor_events").update({ rsvp_count: newCount }).eq("id", eventIdNum);
  }

  return NextResponse.json({ success: true });
}
