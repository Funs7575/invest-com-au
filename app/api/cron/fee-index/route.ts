import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { logger } from "@/lib/logger";
import {
  computeFeeIndex,
  readRecentBrokerSnapshots,
  upsertFeeIndexSnapshot,
  utcDay,
} from "@/lib/fee-index";

const log = logger("cron-fee-index");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: AU Brokerage Fee Index.
 *
 * Reads a recent window of broker_price_snapshots (written hourly by
 * the broker-snapshot cron), reduces to the latest snapshot per active
 * broker, and computes the average + median ASX per-trade fee,
 * US-share fee, and FX spread across them. The computed aggregate is
 * upserted as one row per UTC calendar day in fee_index_snapshots so
 * the public /brokerage-fee-index page can render a stable historical
 * trend without recomputing on every request.
 *
 * Factual aggregate only — no advice. The figures are derived purely
 * from the platform's own fee snapshots; the page discloses that.
 *
 * Idempotent: upsert on (period) means a re-run for the same day
 * refreshes that day's row rather than duplicating it.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const now = new Date();
  const period = utcDay(now);

  const rows = await readRecentBrokerSnapshots(now);
  const computation = computeFeeIndex(rows, period);

  // A run with zero contributing brokers usually means the
  // broker-snapshot cron hasn't populated the window yet. Persist
  // nothing in that case — an all-null row would pollute the trend and
  // make the page look broken. Report it so the cron-health check can
  // see a string of empty runs.
  if (computation.brokerCount === 0) {
    log.warn("fee-index: no broker snapshots in window — skipping upsert", {
      period,
      snapshotRows: rows.length,
    });
    return NextResponse.json({
      ok: true,
      period,
      brokerCount: 0,
      persisted: false,
      note: "no broker snapshots in lookback window",
    });
  }

  const result = await upsertFeeIndexSnapshot(computation, "cron");

  if (!result.ok) {
    log.error("fee-index: upsert failed", { period, error: result.error });
    return NextResponse.json(
      { ok: false, period, error: result.error },
      { status: 500 },
    );
  }

  log.info("fee-index cron complete", {
    period,
    brokerCount: computation.brokerCount,
    avgAsxFee: computation.asxFee.mean,
    avgUsFee: computation.usFee.mean,
    avgFxSpread: computation.fxSpread.mean,
  });

  return NextResponse.json({
    ok: true,
    period,
    persisted: true,
    brokerCount: computation.brokerCount,
    asxFeeSample: computation.asxFee.sample,
    usFeeSample: computation.usFee.sample,
    fxSpreadSample: computation.fxSpread.sample,
    avgAsxFee: computation.asxFee.mean,
    avgUsFee: computation.usFee.mean,
    avgFxSpread: computation.fxSpread.mean,
  });
}

export const GET = wrapCronHandler("fee-index", handler);
