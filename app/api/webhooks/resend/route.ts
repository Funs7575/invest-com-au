import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const log = logger("resend-webhook");

/**
 * POST /api/webhooks/resend
 * Handles Resend delivery webhooks: bounce, complaint, delivery failure.
 * When an email bounces, marks the address so we stop sending to it.
 *
 * Set this URL in Resend dashboard > Webhooks:
 * https://invest.com.au/api/webhooks/resend
 *
 * Events to subscribe: email.bounced, email.complained, email.delivery_delayed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const email = data.to?.[0] || data.email_id;

    if (type === "email.bounced" || type === "email.complained") {
      log.info(`Email ${type}`, { email, reason: data.bounce?.message || data.complaint?.type });

      // Mark email as bounced in email_captures
      if (email) {
        await supabase
          .from("email_captures")
          .update({ status: "bounced" })
          .eq("email", email.toLowerCase());

        // Also mark in fee_alert_subscriptions
        await supabase
          .from("fee_alert_subscriptions")
          .update({ verified: false })
          .eq("email", email.toLowerCase());

        // Mark in quiz_leads
        await supabase
          .from("quiz_leads")
          .update({ unsubscribed: true })
          .eq("email", email.toLowerCase());
      }
    } else if (type === "email.delivery_delayed") {
      log.info("Email delivery delayed", { email });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error("Resend webhook error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
