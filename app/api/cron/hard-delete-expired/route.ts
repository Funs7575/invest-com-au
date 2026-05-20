import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";

const log = logger("cron:hard-delete-expired");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily cron — Phase 2.1 hard-delete half.
 *
 * For every principal where `deleted_at < NOW() - 7 years`, hard-delete
 * the principal row. CASCADE on principal_id FKs drops entity rows;
 * cascade on entity tables' own auth_user_id FKs drops financial
 * skeletons that were retained under "Deleted user".
 *
 * 7-year window matches the Australian financial-record retention
 * requirement (per AFSL obligations). Earlier deletion would violate
 * that minimum; later deletion violates GDPR right-to-erasure / APP 11.
 *
 * Idempotent — rows past the cutoff are deleted in BATCH_SIZE chunks
 * each run; subsequent runs scan only the not-yet-deleted remainder.
 */

const BATCH_SIZE = 50;
const HARD_DELETE_DELAY_MS = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("hard_delete_expired_users")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - HARD_DELETE_DELAY_MS).toISOString();

  const { data: candidates, error } = await supabase
    .from("principals")
    .select("id")
    .lt("deleted_at", cutoff)
    .limit(BATCH_SIZE);

  if (error) {
    log.error("candidate fetch failed", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const ids = ((candidates ?? []) as { id: string }[]).map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0, deleted: 0 });
  }

  const { error: delErr, count } = await supabase
    .from("principals")
    .delete({ count: "exact" })
    .in("id", ids);

  if (delErr) {
    log.error("principal hard-delete failed", { ids, error: delErr.message });
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }

  const stats = { scanned: ids.length, deleted: count ?? 0 };
  log.info("hard-delete-expired completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("hard-delete-expired", handler);
