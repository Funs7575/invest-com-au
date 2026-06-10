import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { classifyText } from "@/lib/text-moderation";
import {
  getTeamById,
  listMembers,
  listInvitations,
  isProfessionalOnTeam,
  updateTeamSettings,
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

const UpdateTeamSchema = z
  .object({
    description: z.string().max(600).nullable().optional(),
    niche: z.string().max(200).nullable().optional(),
    team_story: z.string().max(5000).nullable().optional(),
    specialty_tags: z.array(z.string().min(1).max(60)).max(12).optional(),
  })
  .refine(
    (b) =>
      b.description !== undefined ||
      b.niche !== undefined ||
      b.team_story !== undefined ||
      b.specialty_tags !== undefined,
    { message: "No fields to update." },
  );

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAllowed("expert_teams_patch", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
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

  const parsed = UpdateTeamSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const body = parsed.data;

  const team = await getTeamById(teamId);
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });

  // Presentation fields are owner/lead-editable only (members can't rewrite
  // the public story of a team they don't run).
  if (team.owner_professional_id !== advisorId && team.lead_professional_id !== advisorId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  // Public prose runs the same publish gate as every UGC surface — verified
  // teams render this on an indexed page with the platform's authority.
  for (const text of [body.team_story, body.description, body.niche]) {
    if (typeof text === "string" && text.length > 0) {
      const verdict = classifyText({ text, title: null, surface: "advisor_post" });
      if (verdict.verdict !== "auto_publish") {
        return NextResponse.json(
          {
            error:
              "This text can't be published — it appears to include forward-looking claims or content outside our general-advice posture. Rephrase and try again.",
          },
          { status: 400 },
        );
      }
    }
  }

  try {
    const { team: updated, teamStoryPending } = await updateTeamSettings(teamId, {
      description: body.description,
      niche: body.niche,
      teamStory: body.team_story,
      specialtyTags: body.specialty_tags,
    });
    return NextResponse.json({ team: updated, team_story_pending: teamStoryPending });
  } catch {
    return NextResponse.json({ error: "Failed to update team." }, { status: 500 });
  }
}
