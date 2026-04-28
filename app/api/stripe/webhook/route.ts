import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { dispatchEvent } from "@/lib/stripe-webhook/registry";
// Side-effect import — registers per-event handlers into the registry
// before `dispatchEvent` runs. All event types are now registered
// (J-01a through J-01c-2). The legacy switch below handles only the
// `default` arm (unrecognised event types) and can be removed in J-01e.
import "@/lib/stripe-webhook/handlers";

const log = logger("stripe-webhook");

// Ensure this runs in Node.js runtime (needed for Stripe signature verification)
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    log.error("Webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Idempotency (crash-robust) ────────────────────────────────────
  // Stripe retries events after transient failures, so the same event.id
  // can arrive multiple times. Claim with a processing → done state
  // machine so that a crashed handler's event can be re-taken after a
  // 5 minute timeout. Previous version was PK-only, which meant a
  // handler crash left a permanent "duplicate" row and the event was
  // never retried.
  //
  // Duplicate handling without this check produces: double welcome emails,
  // double wallet credits, duplicated audit-log rows, and double refund
  // reversals. All of those are revenue / trust disasters.
  const idempotencyClient = createAdminClient();
  const FIVE_MINS_AGO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  {
    const { error: dedupeError } = await idempotencyClient
      .from("stripe_webhook_events")
      .insert({
        event_id: event.id,
        event_type: event.type,
        status: "processing",
        started_at: new Date().toISOString(),
      });

    if (dedupeError) {
      if (dedupeError.code === "23505") {
        // Row already exists. If it's 'done', we're finished. If it's
        // 'processing' and younger than 5 min, another worker owns
        // it. If 'processing' and older, we re-take it (previous
        // worker crashed).
        const { data: existing } = await idempotencyClient
          .from("stripe_webhook_events")
          .select("status, started_at")
          .eq("event_id", event.id)
          .maybeSingle();

        if (existing?.status === "done") {
          log.info("Duplicate webhook event ignored (already done)", {
            eventId: event.id,
            type: event.type,
          });
          return NextResponse.json({ received: true, duplicate: true });
        }
        if (
          existing?.status === "processing" &&
          existing.started_at &&
          existing.started_at > FIVE_MINS_AGO
        ) {
          log.info("Duplicate webhook event ignored (in-flight)", {
            eventId: event.id,
            type: event.type,
          });
          return NextResponse.json({ received: true, inflight: true });
        }
        // Stale processing row — re-take it.
        await idempotencyClient
          .from("stripe_webhook_events")
          .update({ status: "processing", started_at: new Date().toISOString() })
          .eq("event_id", event.id);
        log.warn("Retaking stale stripe webhook event", {
          eventId: event.id,
          type: event.type,
        });
      } else {
        log.warn("Idempotency claim failed, processing anyway", {
          eventId: event.id,
          error: dedupeError.message,
        });
      }
    }
  }

  // Mark the row complete once the handler finishes successfully. On
  // exception we mark it 'error' so a retry can come along. Use a
  // finally-style wrapper that runs even if the handler throws.
  let finalStatus: "done" | "error" = "done";
  try {
    // J-01a: try the handler-registry first. Events not yet migrated
    // (J-01b/c) fall through to the legacy switch below. The registry's
    // handlers receive a typed `WebhookContext` so they can be unit-
    // tested in isolation without spinning up the full route.
    const dispatched = await dispatchEvent(event, {
      admin: createAdminClient(),
      stripe: getStripe(),
      log,
    });
    if (dispatched.handled) {
      if (dispatched.result.status === "error") {
        throw dispatched.result.error;
      }
      // Skip the legacy switch — registry owns this event type now.
      // Fall through to the post-switch idempotency stamp below.
    } else switch (event.type) {
      // All event types (checkout.session.completed, charge.*, customer.subscription.*,
      // invoice.*) are migrated to the handler registry (J-01a through J-01c-2).
      // This switch now only catches unrecognised event types. J-01e will remove it.

      default:
        // Unhandled event type — log for debugging
        break;
    }
  } catch (err) {
    log.error("Webhook handler error", { error: err instanceof Error ? err.message : String(err) });
    finalStatus = "error";
    // Mark the event row as 'error' so a Stripe retry can re-take it
    // by the stale-processing fallback path above.
    try {
      await idempotencyClient
        .from("stripe_webhook_events")
        .update({ status: "error", completed_at: new Date().toISOString() })
        .eq("event_id", event.id);
    } catch {
      // swallow — this is a best-effort status update
    }
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  // Mark done so this event will never be re-processed by a retry.
  if (finalStatus === "done") {
    try {
      await idempotencyClient
        .from("stripe_webhook_events")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("event_id", event.id);
    } catch {
      // swallow — the event was processed; the status stamp is best-effort
    }
  }

  return NextResponse.json({ received: true });
}
