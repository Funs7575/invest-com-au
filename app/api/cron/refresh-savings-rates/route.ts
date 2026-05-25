import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import {
  validateSavingsRateRows,
  buildFreshnessReport,
  SAVINGS_RATE_STALE_DAYS,
} from "@/lib/rate-ingest";
import { selectSavingsRateAdapter } from "@/lib/rate-ingest-adapters";

const log = logger("cron:refresh-savings-rates");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/refresh-savings-rates
 *
 * Real rate-ingest pipeline for savings_rate_snapshots.
 *
 * Behaviour (graceful, idempotent):
 *   1. requireCronAuth — fail-closed on missing/short CRON_SECRET.
 *   2. Freshness check: query the most-recently captured snapshot to assess
 *      data age relative to SAVINGS_RATE_STALE_DAYS (3 days).
 *   3. Select adapter:
 *        - SAVINGS_RATE_FEED_URL + SAVINGS_RATE_FEED_API_KEY set → partner_feed
 *        - Otherwise → admin_db (re-reads existing admin-imported rows;
 *          writes new snapshots with captured_at=now() so the rate-alerts
 *          cron always sees current-looking data, works TODAY)
 *   4. Fetch rows (never throws — returns [] on failure).
 *   5. Validate each row (bounds, intro-rate consistency, etc.).
 *   6. Insert new snapshots (append-only; the rate-alerts cron reads the
 *      most-recent snapshot per broker+product_kind so duplication is
 *      harmless and makes staleness trivially detectable).
 *   7. Return structured stats for the heartbeat checker.
 *
 * Append-only design: savings_rate_snapshots is a time-series table.
 * We INSERT rather than UPSERT so the history of rate changes is preserved
 * (useful for future trend / change-detection features). The rate-alerts cron
 * already scans the most-recent snapshot per kind, so a fresh insert is all
 * it needs.
 *
 * AFSL: factual data operation only. No ranking, recommendation, or advice.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();

  // ── 1. Freshness check ──────────────────────────────────────────────────────
  const { data: latestSnap } = await supabase
    .from("savings_rate_snapshots")
    .select("captured_at")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastCapturedAt = (latestSnap?.captured_at as string | null | undefined) ?? null;
  const { adapter, credentialed } = selectSavingsRateAdapter();
  const freshness = buildFreshnessReport(lastCapturedAt, SAVINGS_RATE_STALE_DAYS, credentialed ? "partner_feed" : "admin_db", now);

  log.info("savings-rates freshness", {
    lastCapturedAt,
    daysSince: freshness.daysSince,
    isStale: freshness.isStale,
    source: freshness.source,
    credentialed,
  });

  // ── 2. Fetch from adapter ───────────────────────────────────────────────────
  const { rows: rawRows, source } = await adapter.fetch();

  if (rawRows.length === 0) {
    log.warn("savings-rates: adapter returned no rows", { source, credentialed });
    return NextResponse.json({
      ok: true,
      inserted: 0,
      invalid: 0,
      source,
      credentialed,
      freshness,
      note: "adapter returned no rows — no manual imports yet or feed unreachable",
    });
  }

  // ── 3. Validate ─────────────────────────────────────────────────────────────
  const { valid, invalid } = validateSavingsRateRows(rawRows);

  if (valid.length === 0) {
    log.error("savings-rates: all rows failed validation", { totalRows: rawRows.length, source });
    return NextResponse.json(
      {
        ok: false,
        inserted: 0,
        invalid: invalid.length,
        source,
        failures: invalid,
        note: "all adapter rows failed validation",
      },
      { status: 500 },
    );
  }

  // ── 4. Insert snapshots ─────────────────────────────────────────────────────
  // Stamp captured_at = now() on all rows so the rate-alerts cron sees fresh
  // data regardless of whether this is a DB re-read or a live feed push.
  const insertRows = valid.map((r) => ({
    broker_id: r.broker_id,
    product_kind: r.product_kind,
    rate_bps: r.rate_bps,
    intro_rate_bps: r.intro_rate_bps,
    intro_term_months: r.intro_term_months,
    min_balance_cents: r.min_balance_cents,
    max_balance_cents: r.max_balance_cents,
    term_months: r.term_months,
    source: source === "admin_db" ? ("manual" as const) : ("partner_feed" as const),
    notes: r.notes,
    captured_at: now.toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("savings_rate_snapshots")
    .insert(insertRows);

  if (insertError) {
    log.error("savings-rates: insert failed", { error: insertError.message, rows: valid.length });
    return NextResponse.json(
      { ok: false, error: insertError.message },
      { status: 500 },
    );
  }

  log.info("savings-rates refresh complete", {
    inserted: valid.length,
    invalid: invalid.length,
    source,
    credentialed,
    daysSince: freshness.daysSince,
  });

  return NextResponse.json({
    ok: true,
    inserted: valid.length,
    invalid: invalid.length,
    source,
    credentialed,
    freshness,
    timestamp: now.toISOString(),
    ...(invalid.length > 0 && { validationFailures: invalid }),
  });
}

export const GET = wrapCronHandler("refresh_savings_rates", handler);
