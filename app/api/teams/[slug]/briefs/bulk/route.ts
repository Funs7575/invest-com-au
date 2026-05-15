/**
 * POST /api/teams/[slug]/briefs/bulk — bulk action across up to 50 briefs
 * from the squad shared inbox. Supported actions: claim, release, decline,
 * refer. Returns per-brief results so the UI can show granular state.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { runBulkAction, MAX_BULK } from "@/lib/squad-bulk-actions";
import { logger } from "@/lib/logger";

const log = logger("api:squad-bulk");

const Body = z.object({
  action: z.enum(["claim", "release", "decline", "refer"]),
  brief_ids: z.array(z.number().int().positive()).min(1).max(MAX_BULK),
  to_team_id: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const professionalId = await requireAdvisorSession(request);
  if (professionalId === null) {
    return NextResponse.json({ error: "Auth required." }, { status: 401 });
  }

  if (
    !(await isAllowed("squad_bulk_action", ipKey(request), {
      max: 60,
      refillPerSec: 0.5,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { slug } = await ctx.params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  // Resolve the team_id from the slug and verify the caller is an active member.
  const admin = createAdminClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }
  const { data: member } = await admin
    .from("expert_team_members")
    .select("id")
    .eq("team_id", team.id)
    .eq("professional_id", professionalId)
    .eq("status", "active")
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "Not a team member." }, { status: 403 });
  }

  if (parsed.data.action === "refer" && !parsed.data.to_team_id) {
    return NextResponse.json(
      { error: "to_team_id required for refer." },
      { status: 400 },
    );
  }

  try {
    const result = await runBulkAction({
      action: parsed.data.action,
      teamId: team.id as number,
      professionalId,
      briefIds: parsed.data.brief_ids,
      toTeamId: parsed.data.to_team_id,
      reason: parsed.data.reason,
    });
    const status = result.summary.failed === 0
      ? 200
      : result.summary.ok === 0
        ? 422
        : 207;
    return NextResponse.json(result, { status });
  } catch (err) {
    log.error("bulk run threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Run failed." }, { status: 500 });
  }
}
