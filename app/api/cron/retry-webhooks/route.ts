import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

/**
 * Cron: Retry failed webhook deliveries with exponential backoff.
 *
 * Processes the webhook_delivery_queue table:
 * - Picks up pending items whose next_retry_at ≤ now
 * - Sends POST to broker webhook_url with conversion payload
 * - On success: marks as 'delivered'
 * - On failure: increments attempt_count, calculates next retry (exponential backoff)
 * - After max_attempts: marks as 'failed', notifies broker
 *
 * Backoff schedule: 1min → 5min → 30min → 2hr → 12hr
 */

const BACKOFF_DELAYS_MS = [
  60_000,        // 1 minute
  300_000,       // 5 minutes
  1_800_000,     // 30 minutes
  7_200_000,     // 2 hours
  43_200_000,    // 12 hours
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();

  // Fetch pending deliveries that are due for retry
  const { data: queue } = await supabase
    .from("webhook_delivery_queue")
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", now.toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(50);

  if (!queue || queue.length === 0) {
    return NextResponse.json({ processed: 0, delivered: 0, retried: 0, failed: 0 });
  }

  let delivered = 0;
  let retried = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const res = await fetch(item.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Source": "invest.com.au",
          "X-Delivery-Attempt": String(item.attempt_count + 1),
        },
        body: JSON.stringify(item.payload),
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      if (res.ok || res.status === 200 || res.status === 201 || res.status === 204) {
        // Success — mark as delivered
        await supabase
          .from("webhook_delivery_queue")
          .update({
            status: "delivered",
            attempt_count: item.attempt_count + 1,
            updated_at: now.toISOString(),
          })
          .eq("id", item.id);
        delivered++;
      } else {
        throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => "no body")}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      const nextAttempt = item.attempt_count + 1;

      if (nextAttempt >= item.max_attempts) {
        // Max retries exhausted — mark as failed
        await supabase
          .from("webhook_delivery_queue")
          .update({
            status: "failed",
            attempt_count: nextAttempt,
            last_error: errorMsg,
            updated_at: now.toISOString(),
          })
          .eq("id", item.id);

        // Notify broker about failed delivery
        await supabase.from("broker_notifications").insert({
          broker_slug: item.broker_slug,
          type: "webhook_failed",
          title: "Webhook Delivery Failed",
          message: `A conversion webhook failed after ${nextAttempt} attempts. Last error: ${errorMsg}. Check your webhook endpoint.`,
          link: "/broker-portal/webhooks",
          is_read: false,
          email_sent: false,
        });

        failed++;
      } else {
        // Schedule next retry with exponential backoff
        const delay = BACKOFF_DELAYS_MS[Math.min(nextAttempt - 1, BACKOFF_DELAYS_MS.length - 1)];
        const nextRetry = new Date(now.getTime() + delay);

        await supabase
          .from("webhook_delivery_queue")
          .update({
            attempt_count: nextAttempt,
            next_retry_at: nextRetry.toISOString(),
            last_error: errorMsg,
            updated_at: now.toISOString(),
          })
          .eq("id", item.id);

        retried++;
      }
    }
  }

  return NextResponse.json({
    processed: queue.length,
    delivered,
    retried,
    failed,
    timestamp: now.toISOString(),
  });
}
