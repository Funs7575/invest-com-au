import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { SquadClaimBriefRequest } from "@/lib/api-schemas";
import { claimBriefForMember } from "@/lib/team-brief-assignments";
import {
  resolveSquadRouteContext,
  listOtherActiveMembers,
} from "@/lib/team-brief-routes";
import { sendSquadClaimNotification } from "@/lib/marketplace-squad-emails";
import { createAdminClient } from "@/lib/supabase/admin";

const log = logger("teams:briefs:claim");

/**
 * POST /api/teams/[slug]/briefs/[briefId]/claim
 *
 * Claims an unclaimed accepted brief for the calling active team member.
 * Idempotent: re-claiming your own active claim is a 200 no-op. Returns
 * 409 if another member already has an active claim.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string; briefId: string }> },
) {
  try {
    if (
      !(await isAllowed("teams_briefs_claim", ipKey(request), {
        max: 30,
        refillPerSec: 0.5,
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
      // Body optional.
    }
    const parsed = SquadClaimBriefRequest.safeParse(rawBody);
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

    const result = await claimBriefForMember({
      briefId: route.briefId,
      teamId: route.teamId,
      professionalId: advisorId,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Another squad member has already claimed this brief.",
          reason: result.reason,
        },
        { status: 409 },
      );
    }

    log.info("Brief claimed", {
      briefId: route.briefId,
      teamId: route.teamId,
      professionalId: advisorId,
      created: result.created,
    });

    // Fan-out notification to other active squad members. Fire-and-forget.
    if (result.created) {
      void notifySquadOfClaim({
        route,
        claimerProfessionalId: advisorId,
      }).catch((err) => {
        log.warn("squad claim notification failed", {
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }

    return NextResponse.json({
      success: true,
      created: result.created,
      assignment: result.row,
    });
  } catch (err) {
    log.error("claim error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to claim brief." }, { status: 500 });
  }
}

async function notifySquadOfClaim(input: {
  route: {
    teamId: number;
    teamSlug: string;
    teamName: string;
    briefTitle: string;
  };
  claimerProfessionalId: number;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: claimer } = await admin
    .from("professionals")
    .select("name")
    .eq("id", input.claimerProfessionalId)
    .maybeSingle();
  const claimerName =
    (claimer?.name as string | undefined) ?? "A squad member";

  const recipients = await listOtherActiveMembers({
    teamId: input.route.teamId,
    excludeProfessionalId: input.claimerProfessionalId,
  });

  await Promise.all(
    recipients.map((r) =>
      sendSquadClaimNotification({
        recipientEmail: r.email,
        recipientName: r.name,
        claimerName,
        teamSlug: input.route.teamSlug,
        teamName: input.route.teamName,
        briefTitle: input.route.briefTitle,
      }),
    ),
  );
}
