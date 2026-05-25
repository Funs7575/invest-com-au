import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("api-events-rsvp");

const RsvpSchema = z.object({
  user_name: z.string().max(100).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const limited = await isRateLimited(`rsvp-post-${user.id}`, 10, 1);
  if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { eventId } = await params;
  const eventIdNum = parseInt(eventId, 10);
  if (isNaN(eventIdNum)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = RsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch event and check capacity
  const { data: event } = await admin
    .from("advisor_events")
    .select("id, status, max_attendees, rsvp_count")
    .eq("id", eventIdNum)
    .eq("status", "published")
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  if (
    event.max_attendees != null &&
    (event.rsvp_count ?? 0) >= event.max_attendees
  ) {
    return NextResponse.json({ error: "Event is full" }, { status: 409 });
  }

  // Check for existing RSVP
  const { data: existing } = await admin
    .from("advisor_event_rsvps")
    .select("id")
    .eq("event_id", eventIdNum)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already registered for this event" }, { status: 409 });
  }

  const { data: rsvp, error } = await admin
    .from("advisor_event_rsvps")
    .insert({
      event_id: eventIdNum,
      user_id: user.id,
      user_email: user.email ?? "",
      user_name: parsed.data.user_name ?? null,
      status: "registered",
    })
    .select()
    .single();

  if (error) {
    log.error("Failed to create RSVP", { error: error.message, userId: user.id, eventId: eventIdNum });
    return NextResponse.json({ error: "Failed to register for event" }, { status: 500 });
  }

  // Increment rsvp_count
  await admin
    .from("advisor_events")
    .update({ rsvp_count: (event.rsvp_count ?? 0) + 1 })
    .eq("id", eventIdNum);

  return NextResponse.json({ rsvp }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const limited = await isRateLimited(`rsvp-delete-${user.id}`, 10, 1);
  if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { eventId } = await params;
  const eventIdNum = parseInt(eventId, 10);
  if (isNaN(eventIdNum)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

  const admin = createAdminClient();

  // Fetch existing RSVP
  const { data: rsvp } = await admin
    .from("advisor_event_rsvps")
    .select("id")
    .eq("event_id", eventIdNum)
    .eq("user_id", user.id)
    .single();

  if (!rsvp) return NextResponse.json({ error: "RSVP not found" }, { status: 404 });

  const { error } = await admin
    .from("advisor_event_rsvps")
    .delete()
    .eq("id", rsvp.id);

  if (error) {
    log.error("Failed to cancel RSVP", { error: error.message, userId: user.id, eventId: eventIdNum });
    return NextResponse.json({ error: "Failed to cancel registration" }, { status: 500 });
  }

  // Decrement rsvp_count
  const { data: event } = await admin
    .from("advisor_events")
    .select("rsvp_count")
    .eq("id", eventIdNum)
    .single();

  if (event) {
    const newCount = Math.max(0, (event.rsvp_count ?? 0) - 1);
    await admin.from("advisor_events").update({ rsvp_count: newCount }).eq("id", eventIdNum);
  }

  return NextResponse.json({ success: true });
}
