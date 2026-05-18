/**
 * PATCH /api/teams/[slug]/ops-settings — update wave-3 ops columns on
 * expert_teams: specialty_tags, auto_claim_mode, auto_claim_member_ids.
 *
 * Members-only (any active member). Team-owner-only enforcement would
 * be nicer but is more invasive — fine to defer to a permissions PR.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:teams:ops-settings");

const Body = z.object({
  specialty_tags: z
    .array(z.string().min(1).max(60))
    .max(20)
    .optional(),
  auto_claim_mode: z.enum(["manual", "round_robin"]).optional(),
  auto_claim_member_ids: z
    .array(z.number().int().positive())
    .max(20)
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (
    !(await isAllowed("team_ops_settings", ipKey(request), {
      max: 20,
      refillPerSec: 0.2,
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
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const { slug } = await ctx.params;
  const admin = createAdminClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("expert_team_members")
    .select("id")
    .eq("team_id", team.id)
    .eq("professional_id", advisorId)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json(
      { error: "Not an active member of this team." },
      { status: 403 },
    );
  }

  // If switching to round_robin, the picked members must all be active
  // members of this team.
  if (
    parsed.data.auto_claim_mode === "round_robin" &&
    parsed.data.auto_claim_member_ids
  ) {
    const { data: activeMembers } = await admin
      .from("expert_team_members")
      .select("professional_id")
      .eq("team_id", team.id)
      .eq("status", "active")
      .in("professional_id", parsed.data.auto_claim_member_ids);
    const valid = new Set(
      ((activeMembers ?? []) as { professional_id: number }[]).map(
        (m) => m.professional_id,
      ),
    );
    const invalid = parsed.data.auto_claim_member_ids.filter(
      (id) => !valid.has(id),
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: `Members [${invalid.join(", ")}] are not active members of this team.`,
        },
        { status: 400 },
      );
    }
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.specialty_tags !== undefined) {
    update.specialty_tags = parsed.data.specialty_tags;
  }
  if (parsed.data.auto_claim_mode !== undefined) {
    update.auto_claim_mode = parsed.data.auto_claim_mode;
    // Reset rotation pointer when toggling modes.
    update.last_auto_claim_index = 0;
  }
  if (parsed.data.auto_claim_member_ids !== undefined) {
    update.auto_claim_member_ids = parsed.data.auto_claim_member_ids;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error: updateError } = await admin
    .from("expert_teams")
    .update(update)
    .eq("id", team.id);
  if (updateError) {
    log.error("ops-settings update failed", {
      teamId: team.id,
      err: updateError.message,
    });
    return NextResponse.json(
      { error: "Failed to save settings." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
