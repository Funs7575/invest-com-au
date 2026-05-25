/**
 * GET /api/advisor-auth/cpd
 *
 * Returns the CPD (Continuing Professional Development) summary for the
 * authenticated advisor, scoped to the current ASIC CPD year (July–June).
 *
 * Uses requireAdvisorSession() which supports both Supabase Auth and legacy
 * cookie-based advisor sessions. Uses createAdminClient() for the lookup
 * because cpd_credits SELECT policy checks professionals.auth_user_id which
 * may not be populated for legacy-session advisors.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { getCpdSummary } from "@/lib/course-certificates";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth:cpd");

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`advisor_cpd_get:${ip}`, 60, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const summary = await getCpdSummary(advisorId);
    return NextResponse.json(summary);
  } catch (err) {
    log.error("CPD summary fetch error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to fetch CPD summary" }, { status: 500 });
  }
}
