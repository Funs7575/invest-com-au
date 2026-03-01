import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const REFUND_WINDOW_DAYS = 7;

export async function POST() {
  try {
    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get active subscription
    const admin = createAdminClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, status, created_at")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Verify within 7-day refund window
    const createdAt = new Date(sub.created_at);
    const now = new Date();
    const daysSinceCreation =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCreation > REFUND_WINDOW_DAYS) {
      return NextResponse.json(
        {
          error:
            "Refund window has expired. Refunds are available within the first 7 days.",
        },
        { status: 400 }
      );
    }

    // Get the latest invoice for this subscription
    const invoices = await getStripe().invoices.list({
      subscription: sub.stripe_subscription_id,
      limit: 1,
    });

    const invoice = invoices.data[0];
    if (!invoice || !invoice.payment_intent) {
      return NextResponse.json(
        { error: "No payment found to refund" },
        { status: 400 }
      );
    }

    const paymentIntentId =
      typeof invoice.payment_intent === "string"
        ? invoice.payment_intent
        : invoice.payment_intent.id;

    // Check if already refunded
    const charges = await getStripe().charges.list({
      payment_intent: paymentIntentId,
      limit: 1,
    });

    if (charges.data[0]?.refunded) {
      return NextResponse.json(
        { error: "This subscription has already been refunded" },
        { status: 400 }
      );
    }

    // Issue full refund
    await getStripe().refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
      },
      {
        idempotencyKey: `refund_${sub.stripe_subscription_id}_${paymentIntentId}`,
      }
    );

    // Cancel subscription immediately (not at period end)
    await getStripe().subscriptions.cancel(sub.stripe_subscription_id, {
      prorate: false, // Already issuing a full refund
    });

    // Audit log
    await admin.from("admin_audit_log").insert({
      action: "self_service_refund",
      entity_type: "subscription",
      entity_id: sub.stripe_subscription_id,
      entity_name: user.email || user.id,
      details: {
        user_id: user.id,
        payment_intent_id: paymentIntentId,
        days_since_creation: Math.floor(daysSinceCreation),
      },
      admin_email: "self_service",
    });

    // Send refund confirmation email
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && user.email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Invest.com.au <hello@invest.com.au>",
            to: [user.email],
            subject: "Your Invest.com.au Pro refund has been processed",
            html: buildRefundEmail(),
          }),
        });
      } catch (emailErr) {
        console.error("Refund confirmation email failed:", emailErr);
        // Non-blocking — refund already processed
      }
    }

    // Webhook events will fire automatically:
    //   - charge.refunded → existing handler logs to admin_audit_log
    //   - customer.subscription.deleted → upsertSubscription() sets status='canceled'

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Refund subscription error:", err);
    return NextResponse.json(
      {
        error:
          "Failed to process refund. Please try again or contact support.",
      },
      { status: 500 }
    );
  }
}

function buildRefundEmail(): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 24px 16px;">
      <div style="background: #0f172a; padding: 20px 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <span style="color: #fff; font-weight: 800; font-size: 16px;">Refund Processed</span>
      </div>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Your refund is on its way</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          We've processed a full refund for your Investor Pro subscription. It typically takes 5–10 business days to appear on your statement.
        </p>
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
          <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Status:</strong> Refund initiated</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #334155;"><strong>Subscription:</strong> Cancelled immediately</p>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          We're sorry to see you go. You're welcome to resubscribe anytime from the <a href="https://invest.com.au/pro" style="color: #2563eb;">Pro page</a>.
        </p>
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 24px 0 0 0; line-height: 1.5;">
          Invest.com.au &mdash; Independent investing education &amp; comparison<br>
          <a href="https://invest.com.au/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
        </p>
      </div>
    </div>`;
}
