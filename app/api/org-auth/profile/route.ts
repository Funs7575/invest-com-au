import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("org-auth:profile");

const PatchProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  bio: z.string().max(2000).optional(),
  logo_url: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional().nullable(),
  location_state: z
    .enum(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"])
    .optional()
    .nullable(),
  cpd_provider_number: z.string().max(50).optional().nullable(),
  abn: z.string().max(20).optional().nullable(),
});

/**
 * GET /api/org-auth/profile
 *
 * Returns the full org profile row for the authenticated organisation.
 */
export async function GET() {
  try {
    const session = await requireOrgSession();
    const admin = createAdminClient();

    const { data: org, error } = await admin
      .from("organisations")
      .select("*")
      .eq("id", session.organisationId)
      .single();

    if (error || !org) {
      log.error("Failed to fetch org profile", { organisationId: session.organisationId, error });
      return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
    }

    return NextResponse.json({ org });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("GET /api/org-auth/profile error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/org-auth/profile
 *
 * Updates allowed org profile fields. Admin role required.
 */
export const PATCH = withValidatedBody(
  PatchProfileSchema,
  async (_request: NextRequest, body) => {
    try {
      const session = await requireOrgSession();

      if (session.role !== "admin") {
        return NextResponse.json(
          { error: "Only org admins can update the profile" },
          { status: 403 },
        );
      }

      const admin = createAdminClient();

      // Build update payload — only include fields explicitly provided
      const update: Record<string, unknown> = {};
      if (body.name !== undefined) update.name = body.name;
      if (body.bio !== undefined) update.bio = body.bio;
      if (body.logo_url !== undefined) update.logo_url = body.logo_url;
      if (body.website !== undefined) update.website = body.website;
      if (body.email !== undefined) update.email = body.email;
      if (body.phone !== undefined) update.phone = body.phone;
      if (body.location_state !== undefined) update.location_state = body.location_state;
      if (body.cpd_provider_number !== undefined)
        update.cpd_provider_number = body.cpd_provider_number;
      if (body.abn !== undefined) update.abn = body.abn;

      const { data: org, error: updateErr } = await admin
        .from("organisations")
        .update(update)
        .eq("id", session.organisationId)
        .select("*")
        .single();

      if (updateErr || !org) {
        log.error("Failed to update org profile", { error: updateErr });
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
      }

      return NextResponse.json({ org });
    } catch (err) {
      if (err instanceof Response) return err as NextResponse;
      log.error("PATCH /api/org-auth/profile error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
);
