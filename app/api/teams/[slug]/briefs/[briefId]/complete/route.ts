import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { SquadCompleteBriefRequest } from "@/lib/api-schemas";
import { completeBriefAssignment } from "@/lib/team-brief-assignments";
import { resolveSquadRouteContext } from "@/lib/team-brief-routes";

const log = logger("teams:briefs:complete");

/**
 * POST /api/teams/[slug]/briefs/[briefId]/complete
 *
 * Marks the caller's claim as 'completed'. Idempotent — re-completing
 * an already-completed row is a 200 no-op.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string; briefId: string }> },
) {
  try {
    if (
      !(await isAllowed("teams_briefs_complete", ipKey(request), {
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
    const parsed = SquadCompleteBriefRequest.safeParse(rawBody);
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

    const updated = await completeBriefAssignment({
      briefId: route.briefId,
      professionalId: advisorId,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "You do not have a claim on this brief." },
        { status: 409 },
      );
    }

    log.info("Brief completed", {
      briefId: route.briefId,
      teamId: route.teamId,
      professionalId: advisorId,
    });

    return NextResponse.json({ success: true, assignment: updated });
  } catch (err) {
    log.error("complete error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to mark brief completed." }, { status: 500 });
  }
}
