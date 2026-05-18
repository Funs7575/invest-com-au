/**
 * POST /api/teams/[slug]/decisions — squad-inbox "not for us" / "snooze 7d"
 * action. Records into `team_brief_decisions`. Authenticated team-member only.
 *
 * DELETE clears a prior decision (e.g., un-snooze).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  clearDecision,
  recordDecision,
  type DecisionKind,
} from "@/lib/team-brief-decisions";

const log = logger("api:team-decisions");

const PostBody = z.object({
  briefId: z.number().int().positive(),
  decision: z.enum(["not_for_us", "snoozed"]),
  reason: z.string().max(1000).optional().nullable(),
});

const DeleteBody = z.object({
  briefId: z.number().int().positive(),
});

async function resolveTeamAndMembership(
  slug: string,
  professionalId: number,
): Promise<{ teamId: number } | { error: string; status: number }> {
  const admin = createAdminClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!team) return { error: "Team not found.", status: 404 };

  const { data: member } = await admin
    .from("expert_team_members")
    .select("id")
    .eq("team_id", team.id)
    .eq("professional_id", professionalId)
    .eq("status", "active")
    .maybeSingle();
  if (!member) {
    return { error: "Not an active member of this team.", status: 403 };
  }
  return { teamId: team.id as number };
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (
    !(await isAllowed("team_decisions_post", ipKey(request), {
      max: 40,
      refillPerSec: 0.5,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = PostBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const { slug } = await ctx.params;
  const teamResolution = await resolveTeamAndMembership(slug, advisorId);
  if ("error" in teamResolution) {
    return NextResponse.json(
      { error: teamResolution.error },
      { status: teamResolution.status },
    );
  }

  try {
    const row = await recordDecision({
      teamId: teamResolution.teamId,
      briefId: parsed.data.briefId,
      decision: parsed.data.decision as DecisionKind,
      decidedByProfessionalId: advisorId,
      reason: parsed.data.reason ?? null,
    });
    return NextResponse.json({ decision: row });
  } catch (err) {
    log.error("recordDecision failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to record decision." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (
    !(await isAllowed("team_decisions_delete", ipKey(request), {
      max: 40,
      refillPerSec: 0.5,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = DeleteBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const { slug } = await ctx.params;
  const teamResolution = await resolveTeamAndMembership(slug, advisorId);
  if ("error" in teamResolution) {
    return NextResponse.json(
      { error: teamResolution.error },
      { status: teamResolution.status },
    );
  }

  await clearDecision({
    teamId: teamResolution.teamId,
    briefId: parsed.data.briefId,
  });
  return NextResponse.json({ ok: true });
}
