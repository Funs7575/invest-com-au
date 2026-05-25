/**
 * /api/admin/affiliate-dashboard — admin-only read of affiliate performance
 * data (clicks, signups, monthly reports) for the admin dashboard page.
 *
 *   GET ?period=7d|30d|90d|all
 *     → { clicks, signups, monthlyReports }
 *
 * affiliate_monthly_reports holds revenue / CPA / EPC data. The
 * 20260521_buildfix_rls_overopen.sql migration restricts it to service_role,
 * so the dashboard's previous anon-client read is now denied at the database.
 * This route reads all three datasets via the service-role client behind the
 * standard ADMIN_EMAILS guard, preserving the exact selects / filters /
 * ordering / limits the page relied on so its useMemo aggregation is unchanged.
 */

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:admin:affiliate-dashboard");

export const runtime = "nodejs";

type Period = "7d" | "30d" | "90d" | "all";

function resolvePeriod(raw: string | null): Period {
  return raw === "7d" || raw === "30d" || raw === "90d" || raw === "all"
    ? raw
    : "30d";
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const period = resolvePeriod(new URL(req.url).searchParams.get("period"));
  // Identical `since` computation to the page's previous client-side logic.
  const since =
    period === "all"
      ? "2020-01-01"
      : new Date(
          Date.now() -
            (period === "7d" ? 7 : period === "30d" ? 30 : 90) * 86400000,
        ).toISOString();

  const supabase = createAdminClient();

  const [clicksRes, signupsRes, reportsRes] = await Promise.all([
    supabase
      .from("affiliate_clicks")
      .select("broker_slug, broker_name, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("broker_signups")
      .select(
        "id, broker_slug, click_id, signup_date, revenue_cents, status, source, external_ref, utm_source, utm_campaign",
      )
      .gte("signup_date", since)
      .order("signup_date", { ascending: false }),
    supabase
      .from("affiliate_monthly_reports")
      .select("*")
      .order("month", { ascending: false })
      .limit(50),
  ]);

  if (clicksRes.error || signupsRes.error || reportsRes.error) {
    log.error("affiliate-dashboard read failed", {
      clicks: clicksRes.error?.message,
      signups: signupsRes.error?.message,
      reports: reportsRes.error?.message,
    });
    return NextResponse.json(
      { error: "Failed to load affiliate data." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    clicks: clicksRes.data || [],
    signups: signupsRes.data || [],
    monthlyReports: reportsRes.data || [],
  });
}
