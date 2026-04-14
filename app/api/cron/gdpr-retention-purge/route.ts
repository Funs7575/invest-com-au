import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";

const log = logger("cron:gdpr-retention-purge");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily cron that enforces data retention policies.
 *
 * For each enabled row in `retention_rules`:
 *   - If strategy = 'delete': hard-delete rows older than keep_days
 *   - If strategy = 'anonymise': null out email_column on rows
 *     older than keep_days
 *
 * Idempotent — re-running after a successful purge is a no-op
 * because the already-purged rows no longer match the date cut-off.
 *
 * Safety: every run stamps last_run_at + last_rows_affected on the
 * rule so admins can see what happened. Each rule has its own try
 * block so one broken rule doesn't stop the rest. Failures go to
 * Sentry via the structured logger.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("gdpr_retention_purge")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const { data: rules, error } = await supabase
    .from("retention_rules")
    .select("*")
    .eq("enabled", true);

  if (error) {
    log.error("Failed to fetch retention_rules", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const stats = { rules: rules?.length || 0, deleted: 0, anonymised: 0, failed: 0 };
  const now = new Date();

  for (const rule of rules || []) {
    try {
      const cutoff = new Date(
        now.getTime() - (rule.keep_days as number) * 24 * 60 * 60 * 1000,
      ).toISOString();
      const tsCol = rule.timestamp_column as string;
      const table = rule.table_name as string;

      if (rule.strategy === "delete") {
        const { count, error: delErr } = await supabase
          .from(table)
          .delete({ count: "exact" })
          .lt(tsCol, cutoff);
        if (delErr) throw new Error(delErr.message);
        stats.deleted += count || 0;
        await supabase
          .from("retention_rules")
          .update({
            last_run_at: now.toISOString(),
            last_rows_affected: count || 0,
          })
          .eq("id", rule.id);
      } else if (rule.strategy === "anonymise") {
        const emailCol = rule.email_column as string | null;
        if (!emailCol) {
          log.warn("anonymise rule without email_column — skipping", {
            table,
            id: rule.id,
          });
          continue;
        }
        const placeholder = `anonymised-${rule.id}@privacy.invest.com.au`;
        const { count, error: updErr } = await supabase
          .from(table)
          .update({ [emailCol]: placeholder }, { count: "exact" })
          .lt(tsCol, cutoff)
          .neq(emailCol, placeholder);
        if (updErr) throw new Error(updErr.message);
        stats.anonymised += count || 0;
        await supabase
          .from("retention_rules")
          .update({
            last_run_at: now.toISOString(),
            last_rows_affected: count || 0,
          })
          .eq("id", rule.id);
      }
    } catch (err) {
      stats.failed++;
      log.error("retention rule failed", {
        id: rule.id,
        table: rule.table_name,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("gdpr retention purge completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("gdpr-retention-purge", handler);
