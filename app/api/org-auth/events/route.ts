import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("org-auth:events");

const CreateEventSchema = z.object({
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
});

/**
 * GET /api/org-auth/events
 *
 * Returns all events belonging to the authenticated organisation.
 */
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`org_events_get:${ip}`, 20, 1)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await requireOrgSession();
    const admin = createAdminClient();

    const { data: events, error } = await admin
      .from("advisor_events")
      .select(
        "id, title, description, event_type, starts_at, ends_at, timezone, location, meeting_url, max_attendees, price_cents, status, rsvp_count, created_at",
      )
      .eq("organisation_id", session.organisationId)
      .order("starts_at", { ascending: true });

    if (error) {
      log.error("Failed to fetch org events", { error, organisationId: session.organisationId });
      return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
    }

    return NextResponse.json({ events: events ?? [] });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("GET /api/org-auth/events error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/org-auth/events
 *
 * Creates a new event for the authenticated organisation.
 */
export const POST = withValidatedBody(CreateEventSchema, async (request, body) => {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`org_events_post:${ip}`, 5, 1)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await requireOrgSession();
    const admin = createAdminClient();

    const { data: event, error } = await admin
      .from("advisor_events")
      .insert({
        organisation_id: session.organisationId,
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
        status: "draft",
        rsvp_count: 0,
      })
      .select()
      .single();

    if (error) {
      log.error("Failed to create org event", { error, organisationId: session.organisationId });
      return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err as NextResponse;
    log.error("POST /api/org-auth/events error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
