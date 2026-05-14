import { NextRequest, NextResponse } from "next/server";

import { getInvitationByToken } from "@/lib/expert-teams";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

export async function GET(request: NextRequest) {
  if (
    !(await isAllowed("expert_teams_invite_get", ipKey(request), {
      max: 20,
      refillPerSec: 0.1,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required." }, { status: 400 });
  }
  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    return NextResponse.json({ error: "Invalid invitation." }, { status: 404 });
  }
  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: "This invitation has already been used or revoked." },
      { status: 410 },
    );
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }
  const admin = createAdminClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("id, name, slug, team_category")
    .eq("id", invitation.team_id)
    .maybeSingle();

  return NextResponse.json({
    email: invitation.email,
    name: invitation.name,
    role: invitation.invited_role,
    team,
  });
}
