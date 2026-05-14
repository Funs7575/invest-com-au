import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import {
  getTeamById,
  listMembers,
  listInvitations,
  isProfessionalOnTeam,
} from "@/lib/expert-teams";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAllowed("expert_teams_get", ipKey(request), { max: 60, refillPerSec: 1 }))) {
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
  const isMember =
    team.owner_professional_id === advisorId ||
    (await isProfessionalOnTeam(teamId, advisorId));
  if (!isMember) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const [members, invitations] = await Promise.all([
    listMembers(teamId),
    listInvitations(teamId),
  ]);
  return NextResponse.json({ team, members, invitations });
}
