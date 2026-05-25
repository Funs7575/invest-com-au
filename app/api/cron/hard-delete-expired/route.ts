import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { SOFT_DELETE_ENTITY_TABLES } from "@/lib/gdpr-soft-delete";

const log = logger("cron:hard-delete-expired");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily cron — hard-delete half of the GDPR / APP account-deletion lifecycle.
 *
 * For each soft-delete-aware entity table, hard-deletes rows whose PII was
 * redacted (pii_redacted_at IS NOT NULL) more than 7 years ago. The redacted
 * skeleton is retained until then to satisfy the Australian financial-record
 * retention requirement (per AFSL obligations); earlier deletion would
 * violate that minimum, later deletion violates GDPR right-to-erasure /
 * APP 11.
 *
 * Works directly on the entity tables (rather than a central principals row)
 * so this lifecycle is self-contained and does not depend on the principals
 * registry being present.
 *
 * Idempotent — rows past the cutoff are removed in BATCH_SIZE chunks per
 * table each run; subsequent runs scan only the remainder. Each table has its
 * own try block so one failure does not stop the rest.
 */

const BATCH_SIZE = 50;
const HARD_DELETE_DELAY_MS = 7 * 365 * 24 * 60 * 60 * 1000; // ~7 years

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("hard_delete_expired_users")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - HARD_DELETE_DELAY_MS).toISOString();
  const stats = { scanned: 0, deleted: 0, failed: 0 };

  for (const table of SOFT_DELETE_ENTITY_TABLES) {
    try {
      // Select a bounded batch of expired ids first, then delete by id. This
      // keeps each statement small and lets us report per-run progress.
      const { data: rows, error: selErr } = await supabase
        .from(table)
        .select("id")
        .not("pii_redacted_at", "is", null)
        .lt("pii_redacted_at", cutoff)
        .limit(BATCH_SIZE);
      if (selErr) throw new Error(selErr.message);

      const ids = ((rows ?? []) as { id: string | number }[]).map((r) => r.id);
      stats.scanned += ids.length;
      if (ids.length === 0) continue;

      const { error: delErr, count } = await supabase
        .from(table)
        .delete({ count: "exact" })
        .in("id", ids);
      if (delErr) throw new Error(delErr.message);

      stats.deleted += count ?? 0;
    } catch (err) {
      stats.failed += 1;
      log.error("hard-delete failed for table", {
        table,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("hard-delete-expired completed", stats);
  return NextResponse.json({ ok: stats.failed === 0, ...stats });
}

export const GET = wrapCronHandler("hard-delete-expired", handler);
