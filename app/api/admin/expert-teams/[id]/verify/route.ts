import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { AdminVerifyExpertTeamRequest } from "@/lib/api-schemas";
import { adminVerify, getTeamById } from "@/lib/expert-teams";
import { logger } from "@/lib/logger";

const log = logger("admin:expert-teams:verify");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) {
    return NextResponse.json({ error: "Invalid team id." }, { status: 400 });
  }
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = AdminVerifyExpertTeamRequest.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }

  const existing = await getTeamById(teamId);
  if (!existing) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  const team = await adminVerify({
    teamId,
    approved: parsed.data.approved,
    rejectionReason: parsed.data.rejection_reason,
    acceptsBriefs: parsed.data.accepts_briefs,
  });
  log.info("Expert team verification updated", {
    teamId,
    approved: parsed.data.approved,
    by: guard.email,
  });
  return NextResponse.json({ team });
}
