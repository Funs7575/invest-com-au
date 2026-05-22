import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("org-auth:events:eventId");

const PatchEventSchema = z.object({
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
  status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
});

/**
 * PATCH /api/org-auth/events/[eventId]
 *
 * Updates an event owned by the authenticated organisation.
 */
export const PATCH = withValidatedBody(
  PatchEventSchema,
  async (request: NextRequest, body) => {
    try {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
      if (await isRateLimited(`org_events_patch:${ip}`, 10, 1)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }

      const session = await requireOrgSession();
      const admin = createAdminClient();

      const url = new URL(request.url);
      const segments = url.pathname.split("/");
      const eventIdStr = segments[segments.length - 1] ?? "";
      const eventId = parseInt(eventIdStr, 10);
      if (isNaN(eventId)) {
        return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
      }

      // Verify ownership
      const { data: existing } = await admin
        .from("advisor_events")
        .select("id, status, organisation_id")
        .eq("id", eventId)
        .eq("organisation_id", session.organisationId)
        .single();

      if (!existing) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      if (existing.status === "cancelled") {
        return NextResponse.json({ error: "Cannot update a cancelled event" }, { status: 400 });
      }

      // Validate status transitions
      if (body.status !== undefined) {
        const validTransitions: Record<string, string[]> = {
          draft: ["published"],
          published: ["cancelled", "completed"],
          completed: [],
        };
        const allowed = validTransitions[existing.status as string] ?? [];
        if (!allowed.includes(body.status)) {
          return NextResponse.json(
            { error: `Cannot transition from ${existing.status} to ${body.status}` },
            { status: 400 },
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
      if (body.status !== undefined) updates.status = body.status;

      const { data: updated, error } = await admin
        .from("advisor_events")
        .update(updates)
        .eq("id", eventId)
        .select()
        .single();

      if (error || !updated) {
        log.error("Failed to update org event", { error, organisationId: session.organisationId, eventId });
        return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
      }

      return NextResponse.json({ event: updated });
    } catch (err) {
      if (err instanceof Response) return err as NextResponse;
      log.error("PATCH /api/org-auth/events/[eventId] error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
);

/**
 * DELETE /api/org-auth/events/[eventId]
 *
 * Deletes a draft event owned by the authenticated organisation.
 * Only draft events may be deleted; published events must be cancelled first.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`org_events_delete:${ip}`, 10, 1)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await requireOrgSession();
    const admin = createAdminClient();

    const { eventId: eventIdStr } = await params;
    const eventId = parseInt(eventIdStr, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Verify ownership
    const { data: existing } = await admin
      .from("advisor_events")
      .select("id, status, organisation_id")
      .eq("id", eventId)
      .eq("organisation_id", session.organisationId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft events can be deleted. Cancel the event first." },
        { status: 400 },
      );
    }

    const { error } = await admin
      .from("advisor_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      log.error("Failed to delete org event", { error, organisationId: session.organisationId, eventId });
      return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("DELETE /api/org-auth/events/[eventId] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
