import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("advisor-auth-events");

const EventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(3000).optional().nullable(),
  event_type: z
    .enum(["webinar", "seminar", "workshop", "conference", "networking", "other"])
    .optional()
    .default("webinar"),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional().nullable(),
  timezone: z.string().max(50).optional().default("Australia/Sydney"),
  location: z.string().max(300).optional().nullable(),
  meeting_url: z.string().url().optional().nullable(),
  max_attendees: z.number().int().min(1).max(10000).optional().nullable(),
  price_cents: z.number().int().min(0).optional().default(0),
  cover_image_url: z.string().url().optional().nullable(),
});

const PatchSchema = z.object({
  eventId: z.number().int(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(3000).optional().nullable(),
  event_type: z
    .enum(["webinar", "seminar", "workshop", "conference", "networking", "other"])
    .optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional().nullable(),
  timezone: z.string().max(50).optional(),
  location: z.string().max(300).optional().nullable(),
  meeting_url: z.string().url().optional().nullable(),
  max_attendees: z.number().int().min(1).max(10000).optional().nullable(),
  price_cents: z.number().int().min(0).optional(),
  cover_image_url: z.string().url().optional().nullable(),
  status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
});

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limited = await isRateLimited(`advisor-events-get-${advisorId}`, 30, 1);
  if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const admin = createAdminClient();
  const { data: events, error } = await admin
    .from("advisor_events")
    .select("*")
    .eq("professional_id", advisorId)
    .order("starts_at", { ascending: true })
    .limit(50);

  if (error) {
    log.error("Failed to fetch advisor events", { error: error.message, advisorId });
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }

  return NextResponse.json({ events: events ?? [] });
}

export const POST = withValidatedBody(EventSchema, async (request, body) => {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limited = await isRateLimited(`advisor-events-post-${advisorId}`, 10, 1);
  if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("advisor_events")
    .insert({
      professional_id: advisorId,
      title: body.title,
      description: body.description ?? null,
      event_type: body.event_type,
      starts_at: body.starts_at,
      ends_at: body.ends_at ?? null,
      timezone: body.timezone,
      location: body.location ?? null,
      meeting_url: body.meeting_url ?? null,
      max_attendees: body.max_attendees ?? null,
      price_cents: body.price_cents,
      cover_image_url: body.cover_image_url ?? null,
      status: "draft",
      rsvp_count: 0,
    })
    .select()
    .single();

  if (error) {
    log.error("Failed to create advisor event", { error: error.message, advisorId });
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }

  return NextResponse.json({ event }, { status: 201 });
});

export const PATCH = withValidatedBody(PatchSchema, async (request, body) => {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // Verify ownership
  const { data: existing } = await admin
    .from("advisor_events")
    .select("id, status, professional_id")
    .eq("id", body.eventId)
    .eq("professional_id", advisorId)
    .single();

  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  if (existing.status === "cancelled") {
    return NextResponse.json({ error: "Cannot update a cancelled event" }, { status: 400 });
  }

  // Validate status transitions
  if (body.status) {
    const validTransitions: Record<string, string[]> = {
      draft: ["published"],
      published: ["cancelled", "completed"],
      completed: [],
    };
    const allowed = validTransitions[existing.status as string] ?? [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existing.status} to ${body.status}` },
        { status: 400 }
      );
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.event_type !== undefined) updates.event_type = body.event_type;
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at;
  if (body.timezone !== undefined) updates.timezone = body.timezone;
  if (body.location !== undefined) updates.location = body.location;
  if (body.meeting_url !== undefined) updates.meeting_url = body.meeting_url;
  if (body.max_attendees !== undefined) updates.max_attendees = body.max_attendees;
  if (body.price_cents !== undefined) updates.price_cents = body.price_cents;
  if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url;
  if (body.status !== undefined) updates.status = body.status;

  const { data: updated, error } = await admin
    .from("advisor_events")
    .update(updates)
    .eq("id", body.eventId)
    .select()
    .single();

  if (error) {
    log.error("Failed to update advisor event", { error: error.message, advisorId, eventId: body.eventId });
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }

  return NextResponse.json({ event: updated });
});
