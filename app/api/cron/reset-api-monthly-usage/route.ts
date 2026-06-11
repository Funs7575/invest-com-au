import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

const log = logger("cron-reset-api-monthly-usage");

/**
 * Monthly API-usage counter reset (1st of month, via the monthly-1-3 group).
 *
 * `api_keys.requests_this_month` is incremented on every authenticated API
 * call (lib/api-auth.ts) and was shipped with a "reset by cron" contract in
 * migration 20260610155736 — but the cron never existed, so the counter grew
 * forever and GET /api/v1/usage's `this_month` figure went wrong after the
 * first month. This closes that gap and stamps the new billing period start.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("api_keys")
    .update({
      requests_this_month: 0,
      billing_period_start: periodStart.toISOString(),
    })
    // gt 0 keeps the write set to keys actually used last month — the rest
    // are already at the migration default of 0.
    .gt("requests_this_month", 0)
    .select("id");

  if (error) {
    log.error("monthly usage reset failed", { error: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const resetCount = data?.length ?? 0;
  log.info("monthly API usage counters reset", { resetCount });
  return NextResponse.json({ ok: true, reset: resetCount, periodStart: periodStart.toISOString() });
}
