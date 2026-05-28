import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  SharesightSyncError,
  syncSharesightHoldings,
} from "@/lib/sharesight/sync";

const log = logger("api:account:holdings:sharesight:sync");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/holdings/sharesight/sync
 *
 * Triggers a pull-sync of the user's Sharesight portfolio into
 * `investor_holdings`. Response shape mirrors the CSV-import route so the
 * UI can render the same "X inserted, Y skipped, Z errors" summary.
 *
 *   200 OK    — { inserted, skippedAsDuplicate, errors }
 *   401       — no session
 *   404       — no Sharesight connection
 *   500       — sync failed (refresh / fetch / insert)
 *   503       — integration unconfigured
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Sharesight syncs hit an external API — limit to 6/min per user
  if (await isRateLimited(`sharesight_sync:${user.id}`, 6, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const result = await syncSharesightHoldings({
      supabase,
      userId: user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SharesightSyncError) {
      const statusByCode = {
        not_connected: 404,
        config_missing: 503,
        refresh_failed: 401,
        fetch_failed: 502,
        insert_failed: 500,
      } as const;
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: statusByCode[err.code] },
      );
    }
    log.warn("sharesight sync unexpected error", {
      userId: user.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
