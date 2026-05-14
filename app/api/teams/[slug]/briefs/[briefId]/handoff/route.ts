import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { SquadHandoffBriefRequest } from "@/lib/api-schemas";
import { handoffBriefAssignment } from "@/lib/team-brief-assignments";
import { resolveSquadRouteContext } from "@/lib/team-brief-routes";
import { createAdminClient } from "@/lib/supabase/admin";

const log = logger("teams:briefs:handoff");

/**
 * POST /api/teams/[slug]/briefs/[briefId]/handoff
 *
 * Body: { note?: string, to_professional_id?: number }
 *
 * Flips the caller's claim to 'handed_off' and, if to_professional_id is
 * supplied AND that person is an active team member, opens (or re-opens)
 * a fresh 'claimed' row for them.
 *
 * Re-handoff after handoff is permitted (idempotency requirement).
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string; briefId: string }> },
) {
  try {
    if (
      !(await isAllowed("teams_briefs_handoff", ipKey(request), {
        max: 20,
        refillPerSec: 0.3,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { slug, briefId } = await ctx.params;

    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      // Optional body.
    }
    const parsed = SquadHandoffBriefRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }

    const route = await resolveSquadRouteContext({
      teamSlug: slug,
      briefIdParam: briefId,
      professionalId: advisorId,
    });
    if (!route) {
      return NextResponse.json(
        { error: "Brief not found for this team." },
        { status: 404 },
      );
    }

    // If a handoff target is supplied, validate they're an active member.
    let toProfessionalId: number | null = null;
    if (parsed.data.to_professional_id) {
      const admin = createAdminClient();
      const { data: m } = await admin
        .from("expert_team_members")
        .select("id, status")
        .eq("team_id", route.teamId)
        .eq("professional_id", parsed.data.to_professional_id)
        .maybeSingle();
      if (!m || (m.status as string) !== "active") {
        return NextResponse.json(
          { error: "Handoff target is not an active team member." },
          { status: 400 },
        );
      }
      toProfessionalId = parsed.data.to_professional_id;
    }

    const result = await handoffBriefAssignment({
      briefId: route.briefId,
      teamId: route.teamId,
      fromProfessionalId: advisorId,
      toProfessionalId,
      note: parsed.data.note ?? null,
    });

    if (!result) {
      return NextResponse.json(
        { error: "You do not have an active claim on this brief." },
        { status: 409 },
      );
    }

    log.info("Brief handed off", {
      briefId: route.briefId,
      teamId: route.teamId,
      fromProfessionalId: advisorId,
      toProfessionalId,
    });

    return NextResponse.json({
      success: true,
      from: result.fromRow,
      to: result.toRow,
    });
  } catch (err) {
    log.error("handoff error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to hand off brief." }, { status: 500 });
  }
}
