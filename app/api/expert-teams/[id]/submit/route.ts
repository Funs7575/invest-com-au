import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { submitForVerification } from "@/lib/expert-teams";
import { logger } from "@/lib/logger";

const log = logger("expert-teams:submit");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const { id } = await ctx.params;
    const teamId = Number(id);
    if (!Number.isFinite(teamId)) {
      return NextResponse.json({ error: "Invalid team id." }, { status: 400 });
    }
    try {
      const team = await submitForVerification(teamId, advisorId);
      return NextResponse.json({ team });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "submit_failed";
      if (msg === "team_not_found") {
        return NextResponse.json({ error: "Team not found." }, { status: 404 });
      }
      if (msg === "not_owner") {
        return NextResponse.json(
          { error: "Only the team owner can submit for verification." },
          { status: 403 },
        );
      }
      if (msg.startsWith("incomplete:")) {
        return NextResponse.json(
          {
            error: "Team is not ready for verification.",
            missing: msg.slice("incomplete:".length).split(","),
          },
          { status: 400 },
        );
      }
      throw err;
    }
  } catch (err) {
    log.error("submit error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to submit team." }, { status: 500 });
  }
}
