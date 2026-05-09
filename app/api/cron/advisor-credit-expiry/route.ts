import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { expireOldCredits } from "@/lib/advisor-credit-ledger";

const log = logger("cron:advisor-credit-expiry");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily sweep that expires advisor top-up credits whose 24-month
 * window has elapsed. For every eligible credit row the helper
 * inserts a matching `kind='expiry'` ledger entry referencing it,
 * which guards against double-expiry under retried cron runs via
 * the unique (kind, reference_type, reference_id) index.
 *
 * Note: refunded + proration credits intentionally have NULL
 * `expires_at` (they're owed money and don't time-box). Only
 * top-ups participate in expiry.
 */
async function handler(request: NextRequest) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  try {
    const result = await expireOldCredits(new Date());
    log.info("Advisor credit expiry sweep complete", { expiredCount: result.expiredCount });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    log.error("Advisor credit expiry sweep failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export const GET = wrapCronHandler("advisor-credit-expiry", handler);
