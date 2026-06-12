import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import { listPoolCardsForAdvisor } from "@/lib/briefs/demand-pools-actions";
import { DEMAND_POOLS_FLAG } from "@/lib/briefs/demand-pools";

const log = logger("advisor-auth:demand-pools");

/**
 * GET /api/advisor-auth/demand-pools — the calling adviser's Group Briefs pool
 * cards (anonymised: counts + suppressed budget distribution only, never a
 * consumer identity). 404 when the `demand_pools` flag is off so the client
 * panel renders nothing (fail-closed dormancy).
 */
export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const enabled = await isFlagEnabled(DEMAND_POOLS_FLAG, { segment: "advisor" });
  if (!enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const pools = await listPoolCardsForAdvisor(advisorId);
    return NextResponse.json({ pools });
  } catch (err) {
    log.error("demand-pools GET failed", {
      advisorId,
      err: err instanceof Error ? err.message : String(err),
    });
    // Fail-soft: the panel is additive on top of the inbox.
    return NextResponse.json({ pools: [] });
  }
}
