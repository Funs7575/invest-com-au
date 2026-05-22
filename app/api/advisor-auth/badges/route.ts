/**
 * GET /api/advisor-auth/badges
 *
 * Returns the authenticated advisor's earned badges.
 * Uses requireAdvisorSession() which supports both Supabase Auth and legacy
 * cookie-based sessions. Uses createAdminClient() because advisor_badges
 * SELECT is public but the professional_id scoping requires an admin lookup
 * for legacy-session advisors (no auth.uid() linkage on advisor_sessions).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth:badges");

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`advisor_badges_get:${ip}`, 60, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const professionalId = await requireAdvisorSession(request);
    if (!professionalId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: badges, error } = await admin
      .from("advisor_badges")
      .select("*")
      .eq("professional_id", professionalId)
      .order("earned_at", { ascending: false });

    if (error) {
      log.error("badges fetch error", { error: error.message });
      return NextResponse.json(
        { error: "Failed to fetch badges" },
        { status: 500 },
      );
    }

    return NextResponse.json({ badges: badges ?? [] });
  } catch (err) {
    log.error("badges route error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 },
    );
  }
}
