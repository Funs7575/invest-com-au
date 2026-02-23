import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

// Ensure this runs in Node.js runtime (needed for Stripe signature verification)
export const runtime = "nodejs";

async function upsertSubscription(subscription: Stripe.Subscription) {
  const supabase = createAdminClient();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Look up user by stripe_customer_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("No profile found for Stripe customer:", customerId);
    return;
  }

  const item = subscription.items.data[0];

  const subscriptionData = {
    user_id: profile.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: subscription.status,
    price_id: item?.price?.id || null,
    plan_interval: item?.price?.recurring?.interval || null,
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, { onConflict: "stripe_subscription_id" });

  if (error) {
    console.error("Subscription upsert error:", error.message);
  }
}

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

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error(
      "Webhook signature verification failed:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          "Payment failed for customer:",
          invoice.customer,
          "invoice:",
          invoice.id
        );
        // The subscription.updated webhook will also fire with status 'past_due',
        // which upsertSubscription handles automatically
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle one-time course purchases
        if (session.metadata?.type === "course" && session.mode === "payment") {
          const userId = session.metadata.supabase_user_id;
          const courseSlug = session.metadata.course_slug || "investing-101";

          if (userId) {
            const supabase = createAdminClient();

            // Look up course for course_id + revenue tracking
            const { data: course } = await supabase
              .from("courses")
              .select("id, creator_id, revenue_share_percent")
              .eq("slug", courseSlug)
              .maybeSingle();

            const { data: purchase, error } = await supabase
              .from("course_purchases")
              .upsert(
                {
                  user_id: userId,
                  course_slug: courseSlug,
                  course_id: course?.id || null,
                  stripe_payment_id: session.payment_intent as string,
                  amount_paid: session.amount_total || 0,
                  purchased_at: new Date().toISOString(),
                },
                { onConflict: "user_id,course_slug" }
              )
              .select("id")
              .single();

            if (error) {
              console.error("Course purchase upsert error:", error.message);
            }

            // Insert revenue tracking row if course has a creator
            if (purchase && course?.creator_id && course.revenue_share_percent > 0) {
              const totalAmount = session.amount_total || 0;
              const creatorAmount = Math.round(totalAmount * (course.revenue_share_percent / 100));
              const platformAmount = totalAmount - creatorAmount;

              const { error: revenueError } = await supabase
                .from("course_revenue")
                .insert({
                  course_id: course.id,
                  purchase_id: purchase.id,
                  creator_id: course.creator_id,
                  total_amount: totalAmount,
                  creator_amount: creatorAmount,
                  platform_amount: platformAmount,
                  revenue_share_percent: course.revenue_share_percent,
                });

              if (revenueError) {
                console.error("Course revenue insert error:", revenueError.message);
              }
            }
          }
        }

        // Handle marketplace wallet top-ups
        if (session.metadata?.type === "wallet_topup" && session.mode === "payment") {
          const brokerSlug = session.metadata.broker_slug;
          const amountCents = parseInt(session.metadata.amount_cents || "0", 10);
          const invoiceId = session.metadata.invoice_id;

          if (brokerSlug && amountCents > 0) {
            try {
              const { creditWallet } = await import("@/lib/marketplace/wallet");
              const supabase = createAdminClient();

              await creditWallet(
                brokerSlug,
                amountCents,
                `Wallet top-up — $${(amountCents / 100).toFixed(2)}`,
                {
                  type: "wallet_topup",
                  id: invoiceId || session.id,
                  stripe_payment_intent_id: session.payment_intent as string,
                },
                "stripe_webhook"
              );

              // Update invoice status to paid
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
                },
                admin_email: "stripe_webhook",
              });
            } catch (err) {
              console.error("Wallet top-up credit error:", err);
            }
          }
        }

        // Handle consultation bookings
        if (session.metadata?.type === "consultation" && session.mode === "payment") {
          const userId = session.metadata.supabase_user_id;
          const consultationSlug = session.metadata.consultation_slug;

          if (userId && consultationSlug) {
            const supabase = createAdminClient();

            const { data: consultation } = await supabase
              .from("consultations")
              .select("id")
              .eq("slug", consultationSlug)
              .maybeSingle();

            if (consultation) {
              const { error: bookingError } = await supabase
                .from("consultation_bookings")
                .upsert(
                  {
                    user_id: userId,
                    consultation_id: consultation.id,
                    stripe_payment_id: session.payment_intent as string,
                    amount_paid: session.amount_total || 0,
                    status: "confirmed",
                    booked_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id,consultation_id" }
                );

              if (bookingError) {
                console.error("Consultation booking upsert error:", bookingError.message);
              }
            }
          }
        }
        break;
      }

      default:
        // Unhandled event type — log for debugging
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
