import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

const log = logger("cron:rate-alerts");

// FIN_NOTEBOOK Revenue #4: scan public.rate_alert_subscriptions for
// verified subscribers whose threshold has been crossed by the current
// best-rate snapshot, and send a notification.
//
// **Currently a no-op** until the rate-snapshot ingestion ships. The
// brokers table doesn't yet carry per-product rate columns (no `rate`,
// `apy`, `intro_rate`, etc. — only `min_deposit` is structured), so
// there is no source of truth to compare thresholds against.
//
// What this route DOES today:
//   - Authenticates correctly (requireCronAuth)
//   - Reads the verified subscription set so the query path is exercised
//   - Logs counts for SLO monitoring so the dispatch infrastructure is
//     visible from day one
//
// What lands next (separate PR):
//   - `savings_rate_snapshots` (broker_id, product_kind, rate_bps,
//     intro_rate_bps, intro_term_months, min_balance_cents, captured_at)
//   - Admin import flow (CSV or scraped data) populating snapshots
//   - This route's `compareThresholds` block flipping from no-op to
//     "INSERT INTO notifications" + Resend dispatch
//
// Keeping the cron wired now means:
//   - SLO monitoring picks up a heartbeat from day one
//   - The dispatch group is already configured (lib/cron-groups.ts)
//   - When the data lands, the change is local to this file, not a
//     fresh infra-wire-up

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();

  const { data: subs, error } = await supabase
    .from("rate_alert_subscriptions")
    .select("id, email, product_kind, threshold_bps, last_notified_at")
    .eq("verified", true);

  if (error) {
    log.error("verified subscriptions query failed", { err: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // No-op block — flip to real comparison once savings_rate_snapshots ships.
  // The expected shape:
  //
  //   const { data: snapshots } = await supabase
  //     .from("savings_rate_snapshots")
  //     .select("broker_id, product_kind, rate_bps, captured_at")
  //     .order("captured_at", { ascending: false });
  //   const bestByKind = pickBestPerKind(snapshots);
  //   const hits = subs.filter((s) =>
  //     bestByKind[s.product_kind]?.rate_bps >= s.threshold_bps &&
  //     dayssince(s.last_notified_at) >= 1,
  //   );
  //   for (const hit of hits) { ...send + update last_notified_at... }

  const verified = subs?.length ?? 0;
  log.info("rate-alerts cron heartbeat", {
    verified,
    notified: 0,
    note: "rate-snapshot ingestion pending",
  });

  return NextResponse.json({
    startedAt,
    verifiedSubscriptions: verified,
    notified: 0,
    status: "awaiting_rate_snapshot_ingestion",
  });
}
