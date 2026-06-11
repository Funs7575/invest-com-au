/**
 * Consumer webhook dispatch — fire HMAC-signed POSTs to all active registered
 * endpoints subscribed to a given event, log each attempt, and mark failures
 * for retry.
 *
 * AFSL note: this module only fires factual data-change events (broker fees,
 * health scores, savings rates, advisor profile updates). No ranking,
 * recommendation, or advice content is included in payloads.
 *
 * Signing scheme (mirrors registration route):
 *   X-Invest-Signature: sha256=<HMAC-SHA256(signing_secret, body_bytes)>
 *   where body = JSON.stringify({ event, ts, data })
 *
 * Delivery is fire-and-forget — callers must NOT await. The function never
 * throws so it cannot break cron routes that call it at their tail.
 *
 * Retry: failed deliveries have needs_retry=true. The retry-consumer-webhooks
 * cron picks them up, re-signs with a fresh timestamp, and re-attempts up to
 * MAX_CONSUMER_DELIVERY_ATTEMPTS times within CONSUMER_RETRY_WINDOW_MS.
 */

import { createHmac } from "node:crypto";
// eslint-disable-next-line no-restricted-imports -- consumer webhook fan-out runs outside any user JWT context; service-role legitimate per CLAUDE.md (cron/admin caller).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("consumer-webhook-dispatch");

export const CONSUMER_DELIVERY_TIMEOUT_MS = 10_000;
export const CONSUMER_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h
export const MAX_CONSUMER_DELIVERY_ATTEMPTS = 5;

/** All supported consumer event types. Mirrors SUPPORTED_EVENTS in the registration route. */
export type ConsumerWebhookEvent =
  | "broker.updated"
  | "health_score.updated"
  | "advisor.updated"
  | "savings.updated"
  | "fee.changed";

interface ConsumerWebhookRow {
  id: string;
  url: string;
  events: string[];
  signing_secret: string | null;
}

/**
 * Build the `X-Invest-Signature` header value.
 *
 * Format:  sha256=<hex_hmac>
 * Signed:  raw body bytes (UTF-8 encoded JSON string)
 *
 * Consumers verify: HMAC-SHA256(signing_secret, body) === hex_part.
 */
export function buildConsumerSignature(body: string, signingSecret: string): string {
  const hmac = createHmac("sha256", signingSecret).update(body, "utf8").digest("hex");
  return `sha256=${hmac}`;
}

/**
 * Inject-able fetch sender for testing. Defaults to global fetch.
 * The real sender: POST with a 10 s timeout.
 */
export type FetchSender = (
  url: string,
  body: string,
  signature: string,
) => Promise<{ status: number; bodyText: string | null }>;

export const defaultFetchSender: FetchSender = async (url, body, signature) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-invest-signature": signature,
      "user-agent": "Invest-Webhook/1.0",
    },
    body,
    signal: AbortSignal.timeout(CONSUMER_DELIVERY_TIMEOUT_MS),
  });
  let bodyText: string | null = null;
  try {
    bodyText = (await res.text()).slice(0, 2000);
  } catch {
    // ignore
  }
  return { status: res.status, bodyText };
};

/**
 * Fire a consumer webhook event to all active subscribers.
 *
 * Call at the tail of data-mutation crons after data has been written.
 * Never await the returned promise in a cron — use `void fireConsumerWebhook(...)`.
 */
export async function fireConsumerWebhook(
  event: ConsumerWebhookEvent,
  payload: Record<string, unknown>,
  sender: FetchSender = defaultFetchSender,
): Promise<void> {
  const admin = createAdminClient();

  // Load all active webhooks subscribed to this event that have a signing secret.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hooks, error: fetchErr } = await (admin as any)
    .from("api_consumer_webhooks")
    .select("id, url, events, signing_secret")
    .eq("is_active", true)
    .contains("events", [event]);

  if (fetchErr) {
    log.error("consumer-webhook-dispatch: failed to load hooks", {
      event,
      error: fetchErr.message,
    });
    return;
  }

  const rows = (hooks ?? []) as ConsumerWebhookRow[];

  if (rows.length === 0) {
    log.info("consumer-webhook-dispatch: no subscribers", { event });
    return;
  }

  const ts = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ event, ts, data: payload });

  for (const hook of rows) {
    void deliverAndLog(hook, event, body, ts, payload, sender, admin);
  }
}

async function deliverAndLog(
  hook: ConsumerWebhookRow,
  eventType: string,
  body: string,
  ts: number,
  rawPayload: Record<string, unknown>,
  sender: FetchSender,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<void> {
  if (!hook.signing_secret) {
    // Webhook registered before signing_secret column existed — cannot sign.
    log.warn("consumer-webhook-dispatch: skipping hook with no signing_secret", {
      webhookId: hook.id,
      event: eventType,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("consumer_webhook_deliveries").insert({
      webhook_id: hook.id,
      event_type: eventType,
      payload: rawPayload,
      attempt_count: 1,
      error_message: "No signing_secret — webhook was registered before delivery support was deployed. Re-register to enable delivery.",
      needs_retry: false,
    });
    return;
  }

  const signature = buildConsumerSignature(body, hook.signing_secret);

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;
  let success = false;

  try {
    const result = await sender(hook.url, body, signature);
    responseStatus = result.status;
    responseBody = result.bodyText;
    success = responseStatus >= 200 && responseStatus < 300;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    log.warn("consumer-webhook-dispatch: delivery threw", {
      webhookId: hook.id,
      url: hook.url,
      event: eventType,
      error: errorMessage,
    });
  }

  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("consumer_webhook_deliveries").insert({
    webhook_id: hook.id,
    event_type: eventType,
    payload: rawPayload,
    response_status: responseStatus,
    response_body: responseBody,
    error_message: errorMessage,
    attempt_count: 1,
    delivered_at: success ? now : null,
    needs_retry: !success,
  });

  if (!success) {
    log.warn("consumer-webhook-dispatch: delivery failed, queued for retry", {
      webhookId: hook.id,
      event: eventType,
      responseStatus,
      errorMessage,
    });
  } else {
    log.info("consumer-webhook-dispatch: delivered", {
      webhookId: hook.id,
      event: eventType,
      responseStatus,
    });
  }
}

// ── Retry worker ────────────────────────────────────────────────────────────

/**
 * Retry recently-failed consumer webhook deliveries.
 *
 * Groups delivery rows in the last 24 h by (webhook_id, event_type, payload).
 * For groups whose latest attempt failed and are under the attempt cap,
 * re-signs with a fresh timestamp and re-attempts. Mirrors the pattern in
 * retryFailedOutboundWebhooks() from lib/outbound-webhooks/index.ts.
 */
export async function retryFailedConsumerWebhooks(
  sender: FetchSender = defaultFetchSender,
): Promise<{
  groups: number;
  retried: number;
  skipped_succeeded: number;
  skipped_max_attempts: number;
  skipped_no_secret: number;
  skipped_hook_gone: number;
}> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - CONSUMER_RETRY_WINDOW_MS).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: deliveries, error: fetchError } = await (admin as any)
    .from("consumer_webhook_deliveries")
    .select(
      "id, webhook_id, event_type, payload, response_status, error_message, attempt_count, needs_retry",
    )
    .gte("created_at", since)
    .eq("needs_retry", true)
    .order("created_at", { ascending: true });

  const stats = {
    groups: 0,
    retried: 0,
    skipped_succeeded: 0,
    skipped_max_attempts: 0,
    skipped_no_secret: 0,
    skipped_hook_gone: 0,
  };

  // A fetch error must not masquerade as "queue empty" — that exact silent
  // swallow hid the missing-schema state for weeks (the 30-min cron returned
  // ok/all-zeros on every run while /api/v1/webhooks 500'd). Log loudly and
  // throw so the cron run records a failure the health checks can see.
  if (fetchError) {
    log.error("consumer webhook retry queue read failed", { error: fetchError.message });
    throw new Error(`consumer_webhook_deliveries read failed: ${fetchError.message}`);
  }

  if (!deliveries || deliveries.length === 0) return stats;

  // Group by webhook_id + event_type + payload — pick latest row per key and
  // track every delivery id in the group so we can clear needs_retry on all of
  // them (not just the latest) when the group is resolved. Identical payloads
  // can recur across cron runs (e.g. the timestamp-less broker.updated event),
  // producing multiple needs_retry=true rows in one group; clearing only the
  // latest would orphan the siblings as permanently needs_retry=true.
  interface DeliveryGroup {
    webhookId: string;
    eventType: string;
    payload: Record<string, unknown>;
    attempts: number;
    ids: string[];
  }
  const groups = new Map<string, DeliveryGroup>();

  for (const d of deliveries as Array<{
    id: string;
    webhook_id: string;
    event_type: string;
    payload: Record<string, unknown>;
    response_status: number | null;
    attempt_count: number;
    needs_retry: boolean;
  }>) {
    const key = `${d.webhook_id}|${d.event_type}|${JSON.stringify(d.payload)}`;
    const existing = groups.get(key);
    const attempts = existing ? existing.attempts + d.attempt_count : d.attempt_count;
    const ids = existing ? [...existing.ids, d.id] : [d.id];
    groups.set(key, {
      webhookId: d.webhook_id,
      eventType: d.event_type,
      payload: d.payload,
      attempts,
      ids,
    });
  }

  stats.groups = groups.size;

  for (const g of groups.values()) {
    if (g.attempts >= MAX_CONSUMER_DELIVERY_ATTEMPTS) {
      // Mark every delivery row in the group as permanently failed (stop retrying).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from("consumer_webhook_deliveries")
        .update({ needs_retry: false })
        .in("id", g.ids);
      stats.skipped_max_attempts += 1;
      continue;
    }

    // Load the hook to get signing_secret + current is_active status.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hook } = await (admin as any)
      .from("api_consumer_webhooks")
      .select("id, url, events, signing_secret, is_active")
      .eq("id", g.webhookId)
      .maybeSingle();

    if (!hook || !hook.is_active) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from("consumer_webhook_deliveries")
        .update({ needs_retry: false })
        .in("id", g.ids);
      stats.skipped_hook_gone += 1;
      continue;
    }

    if (!hook.signing_secret) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from("consumer_webhook_deliveries")
        .update({ needs_retry: false })
        .in("id", g.ids);
      stats.skipped_no_secret += 1;
      continue;
    }

    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ event: g.eventType, ts, data: g.payload });
    const signature = buildConsumerSignature(body, hook.signing_secret as string);

    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let success = false;

    try {
      const result = await sender(hook.url as string, body, signature);
      responseStatus = result.status;
      responseBody = result.bodyText;
      success = responseStatus >= 200 && responseStatus < 300;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    const now = new Date().toISOString();
    const newAttemptCount = g.attempts + 1;

    // Mark every old delivery row in the group as no longer needing retry —
    // not just the latest — so recurring identical-payload siblings are cleared.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("consumer_webhook_deliveries")
      .update({ needs_retry: false })
      .in("id", g.ids);

    // Insert a fresh delivery row for this attempt.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("consumer_webhook_deliveries").insert({
      webhook_id: g.webhookId,
      event_type: g.eventType,
      payload: g.payload,
      response_status: responseStatus,
      response_body: responseBody,
      error_message: errorMessage,
      attempt_count: newAttemptCount,
      delivered_at: success ? now : null,
      needs_retry: !success && newAttemptCount < MAX_CONSUMER_DELIVERY_ATTEMPTS,
    });

    stats.retried += 1;
  }

  return stats;
}
