import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { retryFailedConsumerWebhooks } from "@/lib/consumer-webhook-dispatch";
import { logger } from "@/lib/logger";

const log = logger("cron-retry-consumer-webhooks");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: re-attempt recently-failed consumer webhook deliveries.
 *
 * Runs every 30 min (same slot as retry-outbound-webhooks). Picks up
 * `consumer_webhook_deliveries` rows where needs_retry=true and
 * created_at is within the last 24 h, then re-signs with a fresh
 * timestamp and re-delivers. Attempt cap of 5 prevents infinite retries.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const stats = await retryFailedConsumerWebhooks();
  log.info("retry-consumer-webhooks completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("retry-consumer-webhooks", handler);
