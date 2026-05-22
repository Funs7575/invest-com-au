import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("org-auth:team");

/**
 * GET /api/org-auth/team
 *
 * Returns all members of the authenticated organisation.
 */
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`org_team_get:${ip}`, 20, 1)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await requireOrgSession();
    const admin = createAdminClient();

    const { data: members, error } = await admin
      .from("organisation_members")
      .select(
        "id, organisation_id, user_id, invited_email, role, status, invited_at, accepted_at",
      )
      .eq("organisation_id", session.organisationId)
      .order("invited_at", { ascending: false });

    if (error) {
      log.error("Failed to fetch team members", { error });
      return NextResponse.json({ error: "Failed to load team" }, { status: 500 });
    }

    return NextResponse.json({ members: members ?? [] });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("GET /api/org-auth/team error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
