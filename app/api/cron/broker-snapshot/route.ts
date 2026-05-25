import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  captureBrokerSnapshotsBatch,
  type BrokerRow,
} from "@/lib/price-snapshots";
import { logger } from "@/lib/logger";

const log = logger("cron-broker-snapshot");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Cron: broker fee snapshot.
 *
 * Runs hourly. Captures a point-in-time snapshot of every active
 * broker's fee fields into broker_price_snapshots. The snapshot
 * table is append-only so the broker detail page + history charts
 * can render a proper time-series instead of just "current"
 * numbers that the user has no way to verify.
 *
 * This is a capture-only cron — it reads the current state of
 * the `brokers` table (which is separately updated by check-fees
 * when source pages change) and persists a timestamped copy.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brokers")
    .select(
      "id, slug, status, asx_fee, us_fee, fx_rate, inactivity_fee, min_deposit, deal, deal_text, deal_expiry",
    )
    .eq("status", "active");

  if (error) {
    log.error("broker fetch failed", { error: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const brokers = ((data as unknown as BrokerRow[]) || []).filter(
    (b) => b.slug && b.id != null,
  );

  const result = await captureBrokerSnapshotsBatch(brokers, "cron");

  log.info("broker snapshot cron complete", result);

  return NextResponse.json({
    ok: true,
    total: result.total,
    succeeded: result.succeeded,
    failed: result.failed,
  });
}

export const GET = wrapCronHandler("broker-snapshot", handler);
