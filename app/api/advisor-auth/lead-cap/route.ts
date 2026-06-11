import { NextRequest, NextResponse } from "next/server";
// professional_leads has no advisor-session SELECT policy (the portal's
// custom cookie session carries no Supabase JWT); the count below is
// scoped in-query to the validated advisorId — same pattern as
// /api/advisor-auth/data.
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { logger } from "@/lib/logger";
import { getLeadCapStatus } from "@/lib/advisor-lead-cap";

const log = logger("advisor-auth-lead-cap");

export const runtime = "nodejs";

/**
 * GET /api/advisor-auth/lead-cap
 *
 * Returns the advisor's monthly lead-cap status for the cap-upsell
 * banner: tier, cap, exact leads received this calendar month, and
 * the next tier that raises/removes the cap. Uses a head-only count
 * query (not the 50-row-limited dashboard list) so the usage figure
 * stays exact for Growth's 60-lead cap.
 */
export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: advisor, error: advisorError }, { count, error: countError }] =
    await Promise.all([
      admin
        .from("professionals")
        .select("advisor_tier")
        .eq("id", advisorId)
        .maybeSingle(),
      admin
        .from("professional_leads")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", advisorId)
        .gte("created_at", monthStart),
    ]);

  if (advisorError || countError) {
    log.error("lead-cap lookup failed", {
      advisorId,
      error: advisorError?.message ?? countError?.message,
    });
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  const status = getLeadCapStatus(
    (advisor?.advisor_tier as string | null) ?? null,
    count ?? 0,
  );

  return NextResponse.json({
    tier: status.tier,
    cap: status.cap,
    used: status.used,
    remaining: status.remaining,
    level: status.level,
    next_tier: status.nextTier
      ? {
          id: status.nextTier.id,
          label: status.nextTier.label,
          monthly_price_cents: status.nextTier.monthlyPriceCents,
          max_leads_per_month: status.nextTier.maxLeadsPerMonth,
        }
      : null,
    month_label: now.toLocaleDateString("en-AU", { month: "long", year: "numeric" }),
  });
}
