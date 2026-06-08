import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditWallet } from "@/lib/marketplace/wallet";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";

const log = logger("marketplace-webhook");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  // ── Fail-closed signature secret ──────────────────────────────────
  // The marketplace endpoint has its OWN Stripe webhook endpoint and its
  // OWN signing secret (STRIPE_MARKETPLACE_WEBHOOK_SECRET), distinct from
  // the subscription endpoint's STRIPE_WEBHOOK_SECRET. Previously this
  // handler fell back to STRIPE_WEBHOOK_SECRET when the marketplace secret
  // was unset, which silently conflated two endpoints' trust boundaries
  // and masked a deployment misconfiguration on a money-movement path
  // (broker wallet credits + invoice settlement). Mirror the subscription
  // handler: read only the marketplace secret and fail closed (500) if it
  // is missing, rather than borrowing the platform secret.
  const webhookSecret = process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error("STRIPE_MARKETPLACE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    log.error("Marketplace webhook signature failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Event-level idempotency (crash-robust) ────────────────────────
  // Stripe retries events after transient failures (any 500 below — e.g.
  // a creditWallet optimistic-lock failure — triggers re-delivery), so the
  // same event.id can arrive multiple times. creditWallet is already
  // idempotent on stripe_payment_intent_id (the actual money movement is
  // safe), but the admin_audit_log INSERT and the marketplace_invoices
  // paid_at update are NOT — duplicate deliveries pollute the financial
  // audit trail and drift the recorded settlement time. Claim each event
  // in stripe_webhook_events with a processing → done state machine so a
  // retried event.id is short-circuited, and a crashed handler's event can
  // be re-taken after a 5-minute timeout. Mirrors app/api/stripe/webhook.
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
        // 'processing' and younger than 5 min, another worker owns it.
        // If 'processing' and older, we re-take it (previous worker crashed).
        const { data: existing } = await idempotencyClient
          .from("stripe_webhook_events")
          .select("status, started_at")
          .eq("event_id", event.id)
          .maybeSingle();

        if (existing?.status === "done") {
          log.info("Duplicate marketplace webhook event ignored (already done)", {
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
          log.info("Duplicate marketplace webhook event ignored (in-flight)", {
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
        log.warn("Retaking stale marketplace webhook event", {
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

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === "wallet_topup") {
          const brokerSlug = session.metadata.broker_slug;
          const amountCents = parseInt(session.metadata.amount_cents || "0", 10);
          const invoiceId = session.metadata.invoice_id;

          if (!brokerSlug || !amountCents) {
            log.error("Missing metadata on wallet_topup checkout", { metadata: session.metadata });
            // Mark the event 'error' so it is not stuck in 'processing'; a
            // re-delivery of the same (still-invalid) event will be re-taken
            // and short-circuited the same way.
            await markEvent(idempotencyClient, event.id, "error");
            return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
          }

          // Credit the wallet
          await creditWallet(
            brokerSlug,
            amountCents,
            `Wallet top-up via Stripe — $${(amountCents / 100).toFixed(0)} AUD`,
            {
              type: "stripe_checkout",
              id: session.id,
              stripe_payment_intent_id: session.payment_intent as string,
            },
            "stripe_webhook"
          );

          // Update invoice to paid
          if (invoiceId) {
            // Look up broker details for invoice enrichment
            const { data: account } = await supabase
              .from("broker_accounts")
              .select("company_name, email")
              .eq("broker_slug", brokerSlug)
              .limit(1)
              .maybeSingle();

            await supabase
              .from("marketplace_invoices")
              .update({
                status: "paid",
                stripe_payment_intent_id: session.payment_intent as string,
                paid_at: new Date().toISOString(),
                line_items: JSON.stringify([
                  {
                    description: `Wallet top-up`,
                    amount_cents: amountCents,
                    quantity: 1,
                  },
                ]),
                subtotal_cents: amountCents,
                tax_cents: Math.round(amountCents / 11),
                broker_company_name: account?.company_name || null,
                broker_email: account?.email || null,
              })
              .eq("id", parseInt(invoiceId, 10));
          }

          // Audit log
          await supabase.from("admin_audit_log").insert({
            action: "wallet_topup",
            entity_type: "broker_wallet",
            entity_id: brokerSlug,
            entity_name: brokerSlug,
            details: {
              amount_cents: amountCents,
              stripe_session: session.id,
              invoice_id: invoiceId,
            },
            admin_email: "stripe_webhook",
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Handle auto top-up completions
        if (paymentIntent.metadata?.type === "auto_topup") {
          const brokerSlug = paymentIntent.metadata.broker_slug;
          const amountCents = paymentIntent.amount;
          const invoiceId = paymentIntent.metadata.invoice_id;

          if (brokerSlug && amountCents > 0) {
            try {
              await creditWallet(
                brokerSlug,
                amountCents,
                `Auto top-up — $${(amountCents / 100).toFixed(2)}`,
                {
                  type: "auto_topup",
                  id: invoiceId || paymentIntent.id,
                  stripe_payment_intent_id: paymentIntent.id,
                },
                "auto_topup"
              );

              // Update invoice status
              if (invoiceId) {
                // Look up broker details for invoice enrichment
                const { data: account } = await supabase
                  .from("broker_accounts")
                  .select("company_name, email")
                  .eq("broker_slug", brokerSlug)
                  .limit(1)
                  .maybeSingle();

                await supabase
                  .from("marketplace_invoices")
                  .update({
                    status: "paid",
                    stripe_payment_intent_id: paymentIntent.id,
                    paid_at: new Date().toISOString(),
                    line_items: JSON.stringify([
                      {
                        description: `Auto wallet top-up`,
                        amount_cents: amountCents,
                        quantity: 1,
                      },
                    ]),
                    subtotal_cents: amountCents,
                    tax_cents: Math.round(amountCents / 11),
                    broker_company_name: account?.company_name || null,
                    broker_email: account?.email || null,
                  })
                  .eq("id", parseInt(invoiceId, 10));
              }

              // Audit log
              await supabase.from("admin_audit_log").insert({
                action: "auto_topup",
                entity_type: "broker_wallet",
                entity_id: brokerSlug,
                entity_name: brokerSlug,
                details: {
                  amount_cents: amountCents,
                  payment_intent: paymentIntent.id,
                },
                admin_email: "auto_topup",
              });
            } catch (err) {
              log.error("Auto top-up credit error", { error: err instanceof Error ? err.message : String(err) });
            }
          }
        }
        break;
      }
    }
  } catch (err) {
    log.error("Marketplace webhook error", { error: err instanceof Error ? err.message : String(err) });
    // Mark the event row 'error' so a Stripe retry can re-take it via the
    // stale-processing fallback above (the handler did NOT complete its
    // non-idempotent side effects, so re-running is correct).
    await markEvent(idempotencyClient, event.id, "error");
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  // Mark done so this event will never be re-processed by a Stripe retry.
  await markEvent(idempotencyClient, event.id, "done");

  return NextResponse.json({ received: true });
}

/**
 * Best-effort terminal status stamp for the idempotency row. Swallows
 * errors — the event was already processed (or already failed); the stamp
 * is only an optimisation/observability aid, not a correctness guarantee.
 */
async function markEvent(
  client: ReturnType<typeof createAdminClient>,
  eventId: string,
  status: "done" | "error"
): Promise<void> {
  try {
    await client
      .from("stripe_webhook_events")
      .update({ status, completed_at: new Date().toISOString() })
      .eq("event_id", eventId);
  } catch {
    // swallow — terminal stamp is best-effort
  }
}
