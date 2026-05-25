import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("org-auth:settings");

const SettingsSchema = z.object({
  notification_prefs: z
    .object({
      new_enrollment: z.boolean().optional(),
      weekly_summary: z.boolean().optional(),
      payout_alerts: z.boolean().optional(),
    })
    .optional(),
});

/**
 * PATCH /api/org-auth/settings
 *
 * Updates organisation notification preferences.
 * Admin role required.
 *
 * Note: `notification_prefs` column may not yet exist on the organisations
 * table. If the update fails due to a missing column, the error is returned
 * with details rather than silently swallowed.
 */
export const PATCH = withValidatedBody(SettingsSchema, async (_request: NextRequest, body) => {
  try {
    const session = await requireOrgSession();

    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Only org admins can update settings" },
        { status: 403 },
      );
    }

    const admin = createAdminClient();

    const update: Record<string, unknown> = {};
    if (body.notification_prefs !== undefined) {
      update.notification_prefs = body.notification_prefs;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "No settings to update" });
    }

    const { data: org, error: updateErr } = await admin
      .from("organisations")
      .update(update)
      .eq("id", session.organisationId)
      .select("id, notification_prefs")
      .single();

    if (updateErr) {
      // Gracefully handle missing column — return error details so the
      // caller knows the column needs to be added via migration.
      log.warn("Failed to update org settings", {
        organisationId: session.organisationId,
        error: updateErr.message,
        hint: updateErr.hint,
      });
      return NextResponse.json(
        {
          error: "Failed to update settings",
          detail: updateErr.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ org });
  } catch (err) {
    if (err instanceof Response) return err as NextResponse;
    log.error("PATCH /api/org-auth/settings error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
