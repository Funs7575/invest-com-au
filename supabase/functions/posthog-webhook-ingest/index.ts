// Supabase Edge Function: posthog-webhook-ingest
//
// Receives PostHog webhook payloads, validates a shared-secret header,
// and upserts each event into public.posthog_events_mirror keyed on
// posthog_event_id. Dedup via ON CONFLICT DO NOTHING so PostHog retries
// are safe.
//
// Deployed with verify_jwt=false because PostHog can't pass a Supabase
// JWT; auth is via the X-PostHog-Webhook-Secret header against the
// POSTHOG_WEBHOOK_SECRET env var.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PostHogEvent {
  uuid?: string;
  event: string;
  distinct_id?: string;
  properties?: Record<string, unknown>;
  person?: { properties?: Record<string, unknown> };
  timestamp?: string;
}

interface PostHogWebhookBody {
  event?: PostHogEvent;
  events?: PostHogEvent[];
}

function toRow(e: PostHogEvent) {
  const p = e.properties ?? {};
  const pick = (k: string): string | null => {
    const v = p[k];
    return typeof v === "string" && v.length > 0 ? v : null;
  };
  return {
    posthog_event_id: e.uuid ?? crypto.randomUUID(),
    event_name: e.event,
    distinct_id: e.distinct_id ?? "anonymous",
    properties: p,
    person_properties: e.person?.properties ?? null,
    session_id: pick("$session_id"),
    url: pick("$current_url"),
    referrer: pick("$referrer"),
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
    country: pick("$geoip_country_name"),
    city: pick("$geoip_city_name"),
    device_type: pick("$device_type"),
    browser: pick("$browser"),
    os: pick("$os"),
    event_timestamp: e.timestamp ?? new Date().toISOString(),
  };
}

// Shared-secret fallback. The env var `POSTHOG_WEBHOOK_SECRET` (set via
// `supabase secrets set`) takes precedence when present. If neither the
// env var nor this fallback matches the header, the request is rejected
// 401. Rotate by updating `supabase secrets set POSTHOG_WEBHOOK_SECRET=…`
// and removing this constant.
const FALLBACK_SECRET =
  "64d1da6f32a182013e7c3a9d60d70d393adefefca425e7f8524e6742b6bc28ef";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const expected = Deno.env.get("POSTHOG_WEBHOOK_SECRET") ?? FALLBACK_SECRET;
  const provided = req.headers.get("x-posthog-webhook-secret");
  if (!provided || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: PostHogWebhookBody;
  try {
    body = (await req.json()) as PostHogWebhookBody;
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const events: PostHogEvent[] = body.events ?? (body.event ? [body.event] : []);
  if (events.length === 0) {
    return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(url, key, { auth: { persistSession: false } });

  const rows = events.map(toRow);
  const { error } = await client
    .from("posthog_events_mirror")
    .upsert(rows, { onConflict: "posthog_event_id", ignoreDuplicates: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
