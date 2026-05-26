/**
 * GET /api/firm-portal/performance
 *
 * Returns 30-day aggregate metrics and the current-month leaderboard ranking
 * for every member of the calling firm admin's firm. Backs the refresh action
 * in FirmPerformanceClient — the page itself calls getFirmPerformanceSummary
 * directly on first load.
 *
 * Auth: requireAdvisorSession + resolveFirmAdminContext (must be is_firm_admin).
 * Rate-limit: 20 / min / IP.
 */
import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { resolveFirmAdminContext } from "@/lib/firm-billing";
import { getFirmPerformanceSummary } from "@/lib/firm-performance";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("firm-portal:performance");

export async function GET(request: NextRequest) {
  if (
    !(await isAllowed("firm_portal_performance", ipKey(request), {
      max: 20,
      refillPerSec: 0.33,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveFirmAdminContext(professionalId);
  if (!ctx) {
    return NextResponse.json({ error: "Firm admin access required." }, { status: 403 });
  }

  const summary = await getFirmPerformanceSummary(ctx.firmId);
  if (!summary) {
    log.error("getFirmPerformanceSummary returned null", { firmId: ctx.firmId });
    return NextResponse.json({ error: "Failed to load performance data." }, { status: 500 });
  }

  return NextResponse.json({ summary });
}
