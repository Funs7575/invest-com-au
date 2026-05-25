import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("org-auth:team:invite");

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]),
});

/**
 * POST /api/org-auth/team/invite
 *
 * Invites a new member to the organisation. Only admins can invite.
 * Enforces max_seats limit from the organisations row.
 */
export const POST = withValidatedBody(InviteSchema, async (request: NextRequest, body) => {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    // Rate limit: 10 invites per hour per org (key on IP as org ID not yet resolved)
    if (await isRateLimited(`org_invite:${ip}`, 10, 60)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await requireOrgSession();

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Only org admins can invite members" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Check org max_seats
    const { data: org, error: orgErr } = await admin
      .from("organisations")
      .select("max_seats")
      .eq("id", session.organisationId)
      .single();

    if (orgErr || !org) {
      log.error("Failed to fetch org", { organisationId: session.organisationId, error: orgErr });
      return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
    }

    const maxSeats = (org.max_seats as number) ?? 5;

    // Count current active + pending members
    const { count, error: countErr } = await admin
      .from("organisation_members")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", session.organisationId)
      .in("status", ["active", "pending"]);

    if (countErr) {
      log.error("Failed to count members", { error: countErr });
      return NextResponse.json({ error: "Failed to check seat limit" }, { status: 500 });
    }

    if ((count ?? 0) >= maxSeats) {
      return NextResponse.json(
        { error: `Seat limit reached (max ${maxSeats})` },
        { status: 403 },
      );
    }

    // Check if email already has a pending/active invite
    const { data: existing } = await admin
      .from("organisation_members")
      .select("id")
      .eq("organisation_id", session.organisationId)
      .eq("invited_email", body.email)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This email already has an active or pending invitation" },
        { status: 409 },
      );
    }

    const { data: member, error: insertErr } = await admin
      .from("organisation_members")
      .insert({
        organisation_id: session.organisationId,
        invited_email: body.email,
        role: body.role,
        status: "pending",
        invited_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertErr || !member) {
      log.error("Failed to insert invite", { error: insertErr });
      return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err as NextResponse;
    log.error("POST /api/org-auth/team/invite error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
