import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";

const log = logger("cron:refresh-loan-rates");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/refresh-loan-rates
 *
 * Refreshes investment loan rates from an external rate provider.
 *
 * Current state: stub — touches updated_at on all rows so the UI's
 * "rates as of" timestamp stays current and the heartbeat check can
 * surface stale jobs. The actual rate-fetch logic lives in the TODO
 * below; the stub is intentional so the cron is wired up and observable
 * before a rate-provider contract is in place.
 *
 * TODO: integrate a real rate source. Candidates:
 *   - Canstar / RateCity data-feed API (requires commercial agreement)
 *   - Lender public rate pages scraped via Browserbase (needs legal review)
 *   - Manual editorial update via /admin/loan-rates when no feed is available
 *
 * When a real source is added, replace the UPDATE below with a full
 * upsert loop that syncs each lender's rate_pct, comparison_rate_pct,
 * max_lvr, and any changed fields.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Stub: bump updated_at on all rows. This keeps the ISR-cached page's
  // "rates as of" label current and proves the cron is reaching the DB.
  const { data, error } = await supabase
    .from("investment_loan_rates")
    .update({ updated_at: now })
    .neq("id", "00000000-0000-0000-0000-000000000000") // touch all rows
    .select("id");

  if (error) {
    log.error("Failed to update loan rates timestamp", { error: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const updated = (data ?? []).length;

  log.info("Loan rates refresh completed (stub)", { updated, timestamp: now });

  return NextResponse.json({
    ok: true,
    updated,
    mode: "stub",
    timestamp: now,
    note: "Rate values unchanged — stub until a rate-provider feed is integrated. See TODO in route.ts.",
  });
}

export const GET = wrapCronHandler("refresh_loan_rates", handler);
