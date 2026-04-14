import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { refreshSuburb } from "@/lib/property-suburb-refresh";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";

const log = logger("cron:property-suburb-refresh");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Quarterly cron (runs 1st of every month early-morning AEST).
 *
 * Refreshes a batch of the oldest stale suburb records from
 * whichever paid provider is configured. Because the CoreLogic /
 * SQM contracts meter per-call, the cron intentionally only
 * processes a small batch per run — the next run picks up the
 * next-oldest batch, and the whole dataset cycles through every
 * few weeks.
 *
 * When no provider is configured this cron does zero external
 * calls and still logs a success row so the automation dashboard
 * doesn't alert. The admin dashboard shows the "stub" provider
 * in the per-suburb log, making the no-op state unambiguous.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  // Kill switch short-circuit — lets an operator pause this cron
  // instantly without a deploy if something is wrong upstream.
  if (await isFeatureDisabled("property_suburb_refresh")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();

  // Pull oldest 25 by updated_at. If updated_at is null (first run)
  // the coalesce makes sure those come first.
  const { data: suburbs, error } = await supabase
    .from("suburb_data")
    .select("slug, state, updated_at")
    .order("updated_at", { ascending: true, nullsFirst: true })
    .limit(25);

  if (error) {
    log.error("Failed to fetch suburb batch", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const stats = {
    scanned: suburbs?.length || 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    fields_changed_total: 0,
  };

  for (const row of suburbs || []) {
    try {
      const result = await refreshSuburb(row.slug as string, row.state as string);
      if (result.error) {
        stats.failed++;
        continue;
      }
      const changedCount = Object.keys(result.fieldsChanged).length;
      if (changedCount > 0) {
        stats.updated++;
        stats.fields_changed_total += changedCount;
      } else {
        stats.unchanged++;
      }
      // Pace at ~200ms between external calls to stay well under any
      // per-second rate limit on CoreLogic/SQM.
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      stats.failed++;
      log.error("refreshSuburb threw", {
        slug: row.slug,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("property-suburb-refresh cron completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("property-suburb-refresh", handler);
