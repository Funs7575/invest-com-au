import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { creditWallet } from "@/lib/marketplace/wallet";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Marketplace webhook signature failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === "wallet_topup") {
          const brokerSlug = session.metadata.broker_slug;
          const amountCents = parseInt(session.metadata.amount_cents || "0", 10);
          const invoiceId = session.metadata.invoice_id;

          if (!brokerSlug || !amountCents) {
            console.error("Missing metadata on wallet_topup checkout:", session.metadata);
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
              console.error("Auto top-up credit error:", err);
            }
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("Marketplace webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
