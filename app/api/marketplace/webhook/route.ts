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
    if (event.type === "checkout.session.completed") {
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
          await supabase
            .from("marketplace_invoices")
            .update({
              status: "paid",
              stripe_payment_intent_id: session.payment_intent as string,
              paid_at: new Date().toISOString(),
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
    }
  } catch (err) {
    console.error("Marketplace webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
