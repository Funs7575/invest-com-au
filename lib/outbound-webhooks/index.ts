/**
 * Outbound webhooks — Stripe-style HMAC SHA-256 signed POSTs to subscriber
 * endpoints. Pros and squads can register endpoints for events they care
 * about (e.g. `brief.accepted`, `brief.completed`) and verify signatures
 * with the secret returned at endpoint creation.
 *
 * Signature header: `X-Invest-Signature: t=<unix_ts>,v1=<hex_hmac>`
 * Signed payload:   `<unix_ts>.<json_payload>`
 *
 * Delivery is fire-and-forget — call sites should never await the
 * response. Failed deliveries are recorded with `response_status=null`
 * (network error) or the actual non-2xx status; admin can replay via the
 * deliveries table.
 *
 * Retry policy: not automatic in v1. Admin-triggered replay only.
 */
import { createHmac, randomBytes } from "node:crypto";

// eslint-disable-next-line no-restricted-imports -- webhook fan-out runs outside any user JWT context; service-role legitimate per CLAUDE.md (table-level RLS is deny-all-anon).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("outbound-webhooks");

const DELIVERY_TIMEOUT_MS = 10_000;

export type WebhookOwnerKind = "professional" | "team" | "admin";

export interface WebhookEndpoint {
  id: number;
  owner_kind: WebhookOwnerKind;
  owner_id: string;
  url: string;
  signing_secret: string;
  event_subscriptions: string[];
  enabled: boolean;
}

export function generateSigningSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

export function signPayload(
  unixTimestamp: number,
  payload: string,
  secret: string,
): string {
  const signedString = `${unixTimestamp}.${payload}`;
  const hmac = createHmac("sha256", secret).update(signedString).digest("hex");
  return `t=${unixTimestamp},v1=${hmac}`;
}

export interface CreateEndpointInput {
  ownerKind: WebhookOwnerKind;
  ownerId: string;
  url: string;
  eventSubscriptions: string[];
}

export interface CreateEndpointResult {
  endpoint: WebhookEndpoint;
  /** Plain-text signing secret. Returned ONCE at creation; never displayed again. */
  signingSecret: string;
}

export async function createEndpoint(
  input: CreateEndpointInput,
): Promise<CreateEndpointResult> {
  const secret = generateSigningSecret();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("outbound_webhook_endpoints")
    .insert({
      owner_kind: input.ownerKind,
      owner_id: input.ownerId,
      url: input.url,
      signing_secret: secret,
      event_subscriptions: input.eventSubscriptions,
      enabled: true,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`createEndpoint failed: ${error?.message ?? "no row"}`);
  }
  return {
    endpoint: data as WebhookEndpoint,
    signingSecret: secret,
  };
}

export async function listEndpoints(
  ownerKind: WebhookOwnerKind,
  ownerId: string,
): Promise<WebhookEndpoint[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("outbound_webhook_endpoints")
    .select("*")
    .eq("owner_kind", ownerKind)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as WebhookEndpoint[];
}

export async function disableEndpoint(endpointId: number): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("outbound_webhook_endpoints")
    .update({ enabled: false })
    .eq("id", endpointId);
}

/**
 * Fan out a webhook event to all subscribed endpoints. Fire-and-forget;
 * caller should NOT await. Each delivery is logged regardless of outcome.
 */
export async function sendOutboundWebhook(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  const { data: endpoints } = await admin
    .from("outbound_webhook_endpoints")
    .select("*")
    .eq("enabled", true)
    .contains("event_subscriptions", [eventType]);

  if (!endpoints || endpoints.length === 0) return;

  const ts = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ event: eventType, ts, data: payload });

  for (const ep of endpoints as WebhookEndpoint[]) {
    const signature = signPayload(ts, body, ep.signing_secret);
    void deliverWithLogging(ep, eventType, body, signature, ts, payload);
  }
}

async function deliverWithLogging(
  endpoint: WebhookEndpoint,
  eventType: string,
  body: string,
  signature: string,
  ts: number,
  rawPayload: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-invest-signature": signature,
        "user-agent": "Invest-Webhook/1.0",
      },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    responseStatus = res.status;
    try {
      responseBody = (await res.text()).slice(0, 2000);
    } catch {
      responseBody = null;
    }

    if (res.ok) {
      await admin
        .from("outbound_webhook_endpoints")
        .update({ last_success_at: new Date().toISOString() })
        .eq("id", endpoint.id);
    } else {
      await admin.rpc("increment_webhook_failure_count", { endpoint_id: endpoint.id }).single();
    }
  } catch (err) {
    log.warn("outbound webhook delivery threw", {
      endpoint_id: endpoint.id,
      url: endpoint.url,
      err: err instanceof Error ? err.message : String(err),
    });
  } finally {
    await admin.from("outbound_webhook_deliveries").insert({
      endpoint_id: endpoint.id,
      event_type: eventType,
      payload: rawPayload,
      signed_payload: `${ts}.${body}`,
      signature,
      response_status: responseStatus,
      response_body: responseBody,
      delivered_at: new Date().toISOString(),
    });
  }
}
