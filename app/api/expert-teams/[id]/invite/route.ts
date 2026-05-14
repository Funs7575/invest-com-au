import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { InviteExpertTeamMemberRequest } from "@/lib/api-schemas";
import { getTeamById, inviteMember } from "@/lib/expert-teams";
import { logger } from "@/lib/logger";

const log = logger("expert-teams:invite");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isAllowed("expert_teams_invite", ipKey(request), { max: 20, refillPerSec: 0.1 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const { id } = await ctx.params;
    const teamId = Number(id);
    if (!Number.isFinite(teamId)) {
      return NextResponse.json({ error: "Invalid team id." }, { status: 400 });
    }
    const team = await getTeamById(teamId);
    if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });
    if (team.owner_professional_id !== advisorId) {
      return NextResponse.json(
        { error: "Only the team owner can invite members." },
        { status: 403 },
      );
    }
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = InviteExpertTeamMemberRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }
    try {
      const invitation = await inviteMember({
        teamId,
        invitedByProfessionalId: advisorId,
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
      });
      return NextResponse.json({ invitation });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "invite_failed";
      if (msg === "invitation_already_pending") {
        return NextResponse.json(
          { error: "That email already has a pending invitation." },
          { status: 409 },
        );
      }
      if (msg === "already_member") {
        return NextResponse.json(
          { error: "That professional is already on this team." },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (err) {
    log.error("invite error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to invite member." }, { status: 500 });
  }
}
