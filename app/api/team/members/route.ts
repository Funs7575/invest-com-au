/**
 * /api/team/members — squad roster read + admin mutations (Idea #16).
 *
 * GET  ?teamId=         → roster (active + pending), any active member
 * POST { teamId, action: 'set_role'|'remove', professionalId, role? }
 *                       → admin-only (owner / lead)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import {
  professionalIdForUser,
  listSquadRoster,
  setSquadMemberRole,
  removeSquadMember,
} from "@/lib/team-management";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await isAllowed("team_members_read", ipKey(req), { max: 40, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const teamId = Number(new URL(req.url).searchParams.get("teamId"));
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json({ error: "bad_team_id" }, { status: 400 });
  }

  const profId = await professionalIdForUser(user.id);
  if (!profId) return NextResponse.json({ error: "not_a_professional" }, { status: 403 });

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

  const roster = await listSquadRoster(teamId);
  return NextResponse.json({ roster });
}

const Body = z.object({
  teamId: z.number().int().positive(),
  action: z.enum(["set_role", "remove"]),
  professionalId: z.number().int().positive(),
  role: z.enum(["lead", "member"]).optional(),
});

export const POST = withValidatedBody(Body, async (_req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const callerProfId = await professionalIdForUser(user.id);
  if (!callerProfId) return NextResponse.json({ error: "not_a_professional" }, { status: 403 });

  if (body.action === "set_role") {
    if (!body.role) return NextResponse.json({ error: "role_required" }, { status: 400 });
    const ok = await setSquadMemberRole({
      teamId: body.teamId,
      targetProfessionalId: body.professionalId,
      role: body.role,
      callerProfessionalId: callerProfId,
    });
    return NextResponse.json({ ok }, { status: ok ? 200 : 403 });
  }

  const ok = await removeSquadMember({
    teamId: body.teamId,
    targetProfessionalId: body.professionalId,
    callerProfessionalId: callerProfId,
  });
  return NextResponse.json({ ok }, { status: ok ? 200 : 403 });
});
