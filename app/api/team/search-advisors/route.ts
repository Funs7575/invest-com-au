/**
 * GET /api/team/search-advisors?teamId=&q=&type=&state= — Idea #16.
 *
 * Directory search scoped to active professionals invitable to a squad,
 * excluding current members + pending invitees. Public fields only.
 * Caller must be an active member of the team.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  professionalIdForUser,
  searchInvitableAdvisors,
} from "@/lib/team-management";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = Number(searchParams.get("teamId"));
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json({ error: "bad_team_id" }, { status: 400 });
  }

  const profId = await professionalIdForUser(user.id);
  if (!profId) return NextResponse.json({ error: "not_a_professional" }, { status: 403 });

  // Caller must be an active member of the team to search-to-invite.
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("expert_team_members")
    .select("status")
    .eq("team_id", teamId)
    .eq("professional_id", profId)
    .maybeSingle();
  const { data: team } = await admin
    .from("expert_teams")
    .select("owner_professional_id, lead_professional_id")
    .eq("id", teamId)
    .maybeSingle();
  const isMember =
    membership?.status === "active" ||
    team?.owner_professional_id === profId ||
    team?.lead_professional_id === profId;
  if (!isMember) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const results = await searchInvitableAdvisors({
    teamId,
    query: searchParams.get("q") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    state: searchParams.get("state") ?? undefined,
  });
  return NextResponse.json({ results });
}
