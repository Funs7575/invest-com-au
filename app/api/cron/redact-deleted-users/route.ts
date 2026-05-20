import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";

const log = logger("cron:redact-deleted-users");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily cron — Phase 2.1 redaction half.
 *
 * For every principal where `deleted_at < NOW() - 30 days` AND
 * `pii_redacted_at IS NULL`:
 *   - Null the PII columns on the principal (display_name → "Deleted user",
 *     slug → NULL, metadata kept but auth_user_id cleared)
 *   - Null PII columns on each linked entity row across the 5 kind tables
 *   - Stamp pii_redacted_at = NOW() on principal + entity rows
 *
 * Financial-record skeletons (e.g. lead ledger entries, advisor billing
 * rows) are retained under the anonymised principal for the AFSL 7-year
 * retention requirement; the hard-delete cron purges them at the end of
 * that window.
 *
 * Idempotent — pii_redacted_at IS NULL guard means a redacted user is
 * skipped on subsequent runs. Per-batch processing (BATCH_SIZE) bounds
 * latency on the first run after a large soft-delete event.
 */

const BATCH_SIZE = 100;
const REDACTION_DELAY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Per-table PII redaction config. Keys are columns to set to NULL (or to
// a fixed placeholder when the column is NOT NULL).
const PII_NULL_MAP: Record<string, Record<string, string | null>> = {
  principals: {
    auth_user_id: null,
    slug: null,
    // display_name is NOT NULL — replace with placeholder.
    display_name: "Deleted user",
  },
  professionals: {
    email: null,
    phone: null,
    bio: null,
    photo_url: null,
    name: "Deleted user",
  },
  broker_accounts: {
    email: null,
    phone: null,
    full_name: "Deleted user",
  },
  investor_profiles: {
    display_name: null,
  },
  business_accounts: {
    // legal_name + business_name are NOT NULL on this table
    business_name: "Deleted account",
    legal_name: null,
  },
  listing_owner_accounts: {
    display_name: null,
  },
};

interface CandidatePrincipal {
  id: string;
  auth_user_id: string | null;
}

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("redact_deleted_users")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - REDACTION_DELAY_MS).toISOString();
  const now = new Date().toISOString();

  const { data: candidates, error } = await supabase
    .from("principals")
    .select("id, auth_user_id")
    .lt("deleted_at", cutoff)
    .is("pii_redacted_at", null)
    .limit(BATCH_SIZE);

  if (error) {
    log.error("candidate fetch failed", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const principals: CandidatePrincipal[] = (candidates ?? []) as CandidatePrincipal[];
  const stats = { scanned: principals.length, redacted: 0, failed: 0 };

  for (const principal of principals) {
    try {
      // Redact entity rows first so principal_id stays valid for the
      // join queries — soft-deleted rows are still discoverable by
      // (auth_user_id) match for cleanup.
      if (principal.auth_user_id) {
        for (const [table, patch] of Object.entries(PII_NULL_MAP)) {
          if (table === "principals") continue; // principal updated separately below
          const { error: tblErr } = await supabase
            .from(table)
            .update({ ...patch, pii_redacted_at: now })
            .eq("auth_user_id", principal.auth_user_id)
            .is("pii_redacted_at", null);
          if (tblErr) {
            log.warn("entity redaction failed", {
              principalId: principal.id,
              table,
              err: tblErr.message,
            });
          }
        }
      }

      const { error: prErr } = await supabase
        .from("principals")
        .update({ ...PII_NULL_MAP.principals, pii_redacted_at: now })
        .eq("id", principal.id)
        .is("pii_redacted_at", null);
      if (prErr) {
        stats.failed += 1;
        log.warn("principal redaction failed", {
          principalId: principal.id,
          err: prErr.message,
        });
        continue;
      }

      stats.redacted += 1;
    } catch (err) {
      stats.failed += 1;
      log.warn("redaction threw", {
        principalId: principal.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("redact-deleted-users completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("redact-deleted-users", handler);
