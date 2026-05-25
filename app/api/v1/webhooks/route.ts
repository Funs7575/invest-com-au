/**
 * /api/v1/webhooks — consumer webhook registration.
 *
 * GET  — list all webhooks registered for the authenticated API key.
 * POST — register a new webhook endpoint.
 * DELETE — deactivate a webhook (pass ?id=<webhook-id>).
 *
 * Tier requirement: basic or higher (free tier cannot register webhooks).
 *
 * Webhook signing:
 *   Each registration gets a unique signing secret (`whsec_<32-hex-chars>`).
 *   The secret is returned exactly once at creation time — it is stored as a
 *   SHA-256 hash. Payloads are signed as:
 *     X-Invest-Signature: sha256=<HMAC-SHA256(secret, body)>
 *
 * Supported events (passed as an array in `events`):
 *   - "broker.updated"
 *   - "health_score.updated"
 *   - "advisor.updated"
 *   - "savings.updated"
 *
 * Max 5 webhook endpoints per API key.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, API_CORS_HEADERS } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { randomBytes, createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-webhooks");

const MAX_WEBHOOKS_PER_KEY = 5;

const SUPPORTED_EVENTS = [
  "broker.updated",
  "health_score.updated",
  "advisor.updated",
  "savings.updated",
] as const;

const CreateWebhookBody = z.object({
  url: z
    .string()
    .url("Must be a valid HTTPS URL")
    .max(2048)
    .refine((u) => u.startsWith("https://"), {
      message: "Webhook URL must use HTTPS",
    }),
  events: z
    .array(z.enum(SUPPORTED_EVENTS))
    .min(1, "At least one event type is required")
    .max(SUPPORTED_EVENTS.length),
});

// ── Shared auth helper ────────────────────────────────────────────────────────

async function requireAuth(request: NextRequest) {
  const auth = await validateApiKey(request, "/api/v1/webhooks");
  if (!auth.valid || !auth.apiKey) {
    return {
      key: null,
      response: NextResponse.json(
        { error: auth.error ?? "Unauthorized" },
        { status: auth.statusCode ?? 401, headers: API_CORS_HEADERS },
      ),
    };
  }
  // Webhooks require basic tier or higher
  if (auth.apiKey.tier === "free") {
    return {
      key: null,
      response: NextResponse.json(
        {
          error:
            "Webhook registration requires a Basic or higher API plan. Upgrade at invest.com.au/api-docs.",
        },
        { status: 403, headers: API_CORS_HEADERS },
      ),
    };
  }
  return { key: auth.apiKey, response: null };
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { key, response } = await requireAuth(request);
  if (!key) return response!;

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("api_consumer_webhooks")
    .select("id, url, events, secret_prefix, is_active, created_at, updated_at")
    .eq("api_key_id", key.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Failed to list webhooks", { keyId: key.id, error: error.message });
    return NextResponse.json(
      { error: "Failed to list webhooks" },
      { status: 500, headers: API_CORS_HEADERS },
    );
  }

  return NextResponse.json(
    {
      webhooks: (data ?? []).map((w: Record<string, unknown>) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        secret_prefix: w.secret_prefix, // e.g. whsec_ab — for identification only
        is_active: w.is_active,
        created_at: w.created_at,
        updated_at: w.updated_at,
      })),
    },
    { headers: API_CORS_HEADERS },
  );
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(
  CreateWebhookBody,
  async (request: NextRequest, body) => {
    const { key, response } = await requireAuth(request);
    if (!key) return response!;

    const supabase = createAdminClient();

    // Enforce per-key limit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countError } = await (supabase as any)
      .from("api_consumer_webhooks")
      .select("id", { count: "exact", head: true })
      .eq("api_key_id", key.id)
      .eq("is_active", true);

    if (countError) {
      log.error("Webhook count query failed", { keyId: key.id, error: countError.message });
      return NextResponse.json(
        { error: "Failed to check webhook count" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    if ((count ?? 0) >= MAX_WEBHOOKS_PER_KEY) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_WEBHOOKS_PER_KEY} webhooks per API key. Delete an existing webhook first.`,
        },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    // Generate signing secret
    const plainSecret = `whsec_${randomBytes(32).toString("hex")}`;
    const secretHash = createHash("sha256").update(plainSecret).digest("hex");
    const secretPrefix = plainSecret.slice(0, 12); // "whsec_xxxxxx"

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertError } = await (supabase as any)
      .from("api_consumer_webhooks")
      .insert({
        api_key_id: key.id,
        url: body.url,
        events: body.events,
        secret_hash: secretHash,
        secret_prefix: secretPrefix,
        is_active: true,
      })
      .select("id, url, events, secret_prefix, is_active, created_at")
      .single();

    if (insertError) {
      log.error("Webhook insert failed", { keyId: key.id, error: insertError.message });
      return NextResponse.json(
        { error: "Failed to register webhook" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    log.info("Consumer webhook registered", {
      keyId: key.id,
      webhookId: inserted.id,
      url: body.url,
      events: body.events,
    });

    return NextResponse.json(
      {
        webhook: {
          id: inserted.id,
          url: inserted.url,
          events: inserted.events,
          secret: plainSecret, // shown exactly once
          secret_prefix: inserted.secret_prefix,
          is_active: inserted.is_active,
          created_at: inserted.created_at,
        },
        message: "Save your signing secret securely — it will not be shown again.",
      },
      { status: 201, headers: API_CORS_HEADERS },
    );
  },
);

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { key, response } = await requireAuth(request);
  if (!key) return response!;

  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get("id");

  if (!webhookId) {
    return NextResponse.json(
      { error: "Missing ?id=<webhook-id> query parameter" },
      { status: 400, headers: API_CORS_HEADERS },
    );
  }

  const supabase = createAdminClient();

  // Soft-delete: deactivate so we keep history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("api_consumer_webhooks")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", webhookId)
    .eq("api_key_id", key.id) // scoped to this key — cannot delete others' webhooks
    .select("id")
    .maybeSingle();

  if (error) {
    log.error("Webhook delete failed", { keyId: key.id, webhookId, error: error.message });
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500, headers: API_CORS_HEADERS },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Webhook not found or already deleted" },
      { status: 404, headers: API_CORS_HEADERS },
    );
  }

  log.info("Consumer webhook deactivated", { keyId: key.id, webhookId });

  return NextResponse.json(
    { message: "Webhook deleted", id: webhookId },
    { headers: API_CORS_HEADERS },
  );
}
