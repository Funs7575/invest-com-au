import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { markUserEntitiesDeleted, redactUserEntities } from "@/lib/gdpr-soft-delete";
import { eraseUserData } from "@/lib/privacy-data";

const log = logger("cron:redact-deleted-users");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily cron — redaction half of the GDPR / APP account-deletion lifecycle.
 *
 * Drives off main's existing `account_deletion_requests` ledger (populated by
 * POST /api/account/delete). For every request that has passed its 30-day
 * grace window and is still 'scheduled' (i.e. the user never cancelled):
 *
 *   1. Ensure the user's entity rows are soft-deleted (defensive — the
 *      endpoint already stamps deleted_at, but re-stamping is idempotent and
 *      covers requests created before the marker wiring shipped).
 *   2. Null the PII columns on each entity row and stamp pii_redacted_at,
 *      retaining a "Deleted user" skeleton for the AFSL 7-year financial-
 *      record requirement (see lib/gdpr-soft-delete.ts PII_REDACTION_MAP).
 *   3. Erase / anonymise the user's email-keyed PII surfaces (leads, reviews,
 *      captures, subscriptions) via the existing lib/privacy-data.ts
 *      `eraseUserData` config, so the full GDPR loop closes from one place
 *      rather than two parallel erasure systems.
 *   4. Mark the request status='purged', fulfilled_at + pii_redacted_at = now
 *      so it is excluded from subsequent runs.
 *
 * The hard-delete cron (/api/cron/hard-delete-expired) removes the redacted
 * skeleton once the 7-year window elapses.
 *
 * Idempotent: the status='scheduled' + scheduled_purge_at filter means a
 * processed request is skipped on later runs, and redactUserEntities guards
 * on `pii_redacted_at IS NULL` per row. BATCH_SIZE bounds latency on the
 * first run after a large soft-delete event.
 */

const BATCH_SIZE = 100;

interface DeletionRequestRow {
  id: number;
  user_id: string;
  email: string | null;
}

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("redact_deleted_users")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: candidates, error } = await supabase
    .from("account_deletion_requests")
    .select("id, user_id, email")
    .eq("status", "scheduled")
    .lt("scheduled_purge_at", now)
    .is("pii_redacted_at", null)
    .limit(BATCH_SIZE);

  if (error) {
    // Forward-compatible: account_deletion_requests may not be migrated in a
    // given environment yet (tracked as Blocked A-MISSING-TABLE-1 on main).
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      log.warn("account_deletion_requests not migrated — skipping redaction cron", {
        hint: "Apply 20260427_wave_security_observability.sql to unblock.",
      });
      return NextResponse.json({ ok: true, skipped: "table_not_migrated", redacted: 0 });
    }
    log.error("candidate fetch failed", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const requests: DeletionRequestRow[] = (candidates ?? []) as DeletionRequestRow[];
  const stats = { scanned: requests.length, redacted: 0, failed: 0 };

  for (const request of requests) {
    try {
      // Defensive re-stamp so requests created before the endpoint wiring
      // shipped (no deleted_at) are still picked up by redactUserEntities,
      // which only touches rows where deleted_at IS NOT NULL.
      await markUserEntitiesDeleted(supabase, request.user_id, now);

      const { failedTables } = await redactUserEntities(supabase, request.user_id, now);
      if (failedTables.length > 0) {
        log.warn("entity redaction partial failure", {
          requestId: request.id,
          userId: request.user_id,
          failedTables,
        });
      }

      // Close the email-keyed PII surfaces (leads, reviews, captures,
      // subscriptions) via the existing privacy-data config so deletion is
      // complete across both the account-identity tables and the
      // transactional/marketing tables. Best-effort — eraseUserData swallows
      // per-surface errors internally.
      if (request.email) {
        await eraseUserData(supabase, request.email);
      }

      const { error: updErr } = await supabase
        .from("account_deletion_requests")
        .update({ status: "purged", fulfilled_at: now, pii_redacted_at: now })
        .eq("id", request.id)
        .eq("status", "scheduled");
      if (updErr) {
        stats.failed += 1;
        log.warn("deletion request status update failed", {
          requestId: request.id,
          err: updErr.message,
        });
        continue;
      }

      stats.redacted += 1;
    } catch (err) {
      stats.failed += 1;
      log.warn("redaction threw", {
        requestId: request.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("redact-deleted-users completed", stats);
  return NextResponse.json({ ok: stats.failed === 0, ...stats });
}

export const GET = wrapCronHandler("redact-deleted-users", handler);
