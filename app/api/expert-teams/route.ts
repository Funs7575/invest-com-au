import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { CreateExpertTeamRequest } from "@/lib/api-schemas";
import { createTeam, listTeamsForProfessional } from "@/lib/expert-teams";
import { logger } from "@/lib/logger";

const log = logger("expert-teams");

export async function GET(request: NextRequest) {
  if (!(await isAllowed("expert_teams_list", ipKey(request), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const teams = await listTeamsForProfessional(advisorId);
  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAllowed("expert_teams_create", ipKey(request), { max: 5, refillPerSec: 0.05 }))) {
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
    const parsed = CreateExpertTeamRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }

    const team = await createTeam({
      ownerProfessionalId: advisorId,
      name: parsed.data.name,
      teamCategory: parsed.data.team_category,
      teamType: parsed.data.team_type,
      description: parsed.data.description,
      niche: parsed.data.niche,
      locationState: parsed.data.location_state,
      serviceAreas: parsed.data.service_areas,
      firmId: parsed.data.firm_id ?? null,
      disclosure: parsed.data.disclosure,
      acceptedBriefTemplates: parsed.data.accepted_brief_templates,
    });

    log.info("Expert team created", { teamId: team.id, ownerId: advisorId });
    return NextResponse.json({ team });
  } catch (err) {
    log.error("create team error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to create team." }, { status: 500 });
  }
}
