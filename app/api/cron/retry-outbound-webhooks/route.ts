import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { retryFailedOutboundWebhooks } from "@/lib/outbound-webhooks";
import { logger } from "@/lib/logger";

const log = logger("cron-retry-outbound-webhooks");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: re-attempt recently-failed OUTBOUND webhook deliveries (audit §5 #17).
 *
 * Outbound deliveries were admin-replay-only, so a downed subscriber endpoint
 * silently dropped events. This re-delivers failures from the last 24h that
 * have no later success and are under the per-event attempt cap. Runs every
 * 30m (effective backoff = the interval); the cap prevents infinite retries.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const stats = await retryFailedOutboundWebhooks();
  log.info("retry-outbound-webhooks completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("retry-outbound-webhooks", handler);
