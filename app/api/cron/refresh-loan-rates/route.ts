import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import {
  validateLoanRateRows,
  buildFreshnessReport,
  LOAN_RATE_STALE_DAYS,
} from "@/lib/rate-ingest";
import { selectLoanRateAdapter } from "@/lib/rate-ingest-adapters";

const log = logger("cron:refresh-loan-rates");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/refresh-loan-rates
 *
 * Real rate-ingest pipeline for investment_loan_rates.
 *
 * Behaviour (graceful, idempotent):
 *   1. requireCronAuth — fail-closed on missing/short CRON_SECRET.
 *   2. Build a freshness report: query the most-recently updated row to
 *      determine how stale the table is.
 *   3. Select the adapter:
 *        - LOAN_RATE_FEED_URL + LOAN_RATE_FEED_API_KEY set → partner_feed
 *        - Otherwise → admin_db (re-reads existing admin-imported rows;
 *          re-stamps updated_at so staleness clocks reset, works TODAY)
 *   4. Fetch rows from the adapter (never throws — returns [] on failure).
 *   5. Validate each row (sane bounds, required fields).
 *   6. Upsert valid rows into investment_loan_rates keyed on lender_slug.
 *   7. Return structured stats for the cron-run-log heartbeat checker.
 *
 * AFSL: factual data operation only. No ranking, recommendation, or advice.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();

  // ── 1. Freshness check ──────────────────────────────────────────────────────
  const { data: latestRow } = await supabase
    .from("investment_loan_rates")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastUpdatedAt = (latestRow?.updated_at as string | null | undefined) ?? null;
  const { adapter, credentialed } = selectLoanRateAdapter();
  const freshness = buildFreshnessReport(lastUpdatedAt, LOAN_RATE_STALE_DAYS, credentialed ? "partner_feed" : "admin_db", now);

  log.info("loan-rates freshness", {
    lastUpdatedAt,
    daysSince: freshness.daysSince,
    isStale: freshness.isStale,
    source: freshness.source,
    credentialed,
  });

  // ── 2. Fetch from adapter ───────────────────────────────────────────────────
  const { rows: rawRows, source } = await adapter.fetch();

  if (rawRows.length === 0) {
    // No rows from the adapter (DB empty or feed unreachable). This is
    // non-fatal — log it and return. The cron-health-alert cron will surface
    // repeated empty runs separately.
    log.warn("loan-rates: adapter returned no rows", { source, credentialed });
    return NextResponse.json({
      ok: true,
      upserted: 0,
      invalid: 0,
      source,
      credentialed,
      freshness,
      note: "adapter returned no rows — DB may be empty or feed unreachable",
    });
  }

  // ── 3. Validate ─────────────────────────────────────────────────────────────
  const { valid, invalid } = validateLoanRateRows(rawRows);

  if (valid.length === 0) {
    log.error("loan-rates: all rows failed validation", { totalRows: rawRows.length, source });
    return NextResponse.json(
      {
        ok: false,
        upserted: 0,
        invalid: invalid.length,
        source,
        failures: invalid,
        note: "all adapter rows failed validation",
      },
      { status: 500 },
    );
  }

  // ── 4. Upsert ───────────────────────────────────────────────────────────────
  // Upsert on lender_slug (unique key). updated_at is set to now() so the
  // freshness check on the next run sees this cron's timestamp, not the
  // original admin-import timestamp.
  const upsertRows = valid.map((r) => ({
    ...r,
    updated_at: now.toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from("investment_loan_rates")
    .upsert(upsertRows, { onConflict: "lender_slug", ignoreDuplicates: false });

  if (upsertError) {
    log.error("loan-rates: upsert failed", { error: upsertError.message, rows: valid.length });
    return NextResponse.json(
      { ok: false, error: upsertError.message },
      { status: 500 },
    );
  }

  log.info("loan-rates refresh complete", {
    upserted: valid.length,
    invalid: invalid.length,
    source,
    credentialed,
    daysSince: freshness.daysSince,
  });

  return NextResponse.json({
    ok: true,
    upserted: valid.length,
    invalid: invalid.length,
    source,
    credentialed,
    freshness,
    timestamp: now.toISOString(),
    ...(invalid.length > 0 && { validationFailures: invalid }),
  });
}

export const GET = wrapCronHandler("refresh_loan_rates", handler);
