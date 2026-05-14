import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { AcceptExpertTeamInvitationRequest } from "@/lib/api-schemas";
import { acceptInvitation } from "@/lib/expert-teams";
import { logger } from "@/lib/logger";

const log = logger("expert-teams:invite:accept");

export async function POST(request: NextRequest) {
  try {
    if (!(await isAllowed("expert_teams_invite_accept", ipKey(request), { max: 10, refillPerSec: 0.1 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = AcceptExpertTeamInvitationRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }
    try {
      const { teamId } = await acceptInvitation({
        token: parsed.data.token,
        professionalId: advisorId,
      });
      return NextResponse.json({ success: true, team_id: teamId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "accept_failed";
      const map: Record<string, { code: number; message: string }> = {
        invalid_invitation: { code: 404, message: "Invalid invitation." },
        invitation_unavailable: {
          code: 410,
          message: "This invitation has already been used or revoked.",
        },
        invitation_expired: { code: 410, message: "This invitation has expired." },
      };
      const m = map[msg];
      if (m) return NextResponse.json({ error: m.message }, { status: m.code });
      throw err;
    }
  } catch (err) {
    log.error("accept invite error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to accept invitation." }, { status: 500 });
  }
}
