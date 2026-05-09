import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { invalidateFlagCache } from "@/lib/feature-flags";

const log = logger("cron:feature-flag-expiry");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Nightly cron that archives feature flags dormant for > ARCHIVE_AFTER_DAYS.
 *
 * A flag is eligible when:
 *   - enabled = false  (flag is not actively serving traffic)
 *   - archived_at IS NULL  (not already archived)
 *   - updated_at < NOW() - ARCHIVE_AFTER_DAYS  (stale for a long time)
 *
 * Archival sets archived_at = NOW().  Archived flags are excluded from
 * isFlagEnabled() queries (the evaluator filters them out), so they
 * evaluate as false without a round-trip.  The admin UI can surface
 * archived flags separately for housekeeping.
 *
 * Safe: read-only discovery + targeted update per flagKey.  No delete.
 * Reversible: clear archived_at to un-archive a flag.
 */
const ARCHIVE_AFTER_DAYS = 90;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const cutoff = new Date(
    Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: candidates, error: fetchErr } = await supabase
    .from("feature_flags")
    .select("flag_key, updated_at")
    .eq("enabled", false)
    .is("archived_at", null)
    .lt("updated_at", cutoff);

  if (fetchErr) {
    log.error("feature-flag-expiry: failed to fetch candidates", {
      error: fetchErr.message,
    });
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const toArchive = candidates ?? [];
  log.info("feature-flag-expiry: candidates", { count: toArchive.length });

  if (toArchive.length === 0) {
    return NextResponse.json({ archived: 0 });
  }

  const archivedKeys: string[] = [];
  const errors: string[] = [];

  for (const flag of toArchive) {
    const { error: updateErr } = await supabase
      .from("feature_flags")
      .update({ archived_at: new Date().toISOString() })
      .eq("flag_key", flag.flag_key)
      .is("archived_at", null);

    if (updateErr) {
      log.warn("feature-flag-expiry: failed to archive flag", {
        flag: flag.flag_key,
        error: updateErr.message,
      });
      errors.push(flag.flag_key);
    } else {
      archivedKeys.push(flag.flag_key);
      invalidateFlagCache(flag.flag_key);
      log.info("feature-flag-expiry: archived flag", {
        flag: flag.flag_key,
        dormant_since: flag.updated_at,
      });
    }
  }

  return NextResponse.json({
    archived: archivedKeys.length,
    archivedKeys,
    errors: errors.length > 0 ? errors : undefined,
  });
}
