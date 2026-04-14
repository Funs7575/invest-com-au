import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  extractSvixHeaders,
  verifyResendSignature,
} from "@/lib/resend-webhook-verify";

const log = logger("resend-webhook");

export const runtime = "nodejs";

/**
 * POST /api/webhooks/resend
 * Handles Resend delivery webhooks: bounce, complaint, delivery failure.
 * When an email bounces, marks the address so we stop sending to it.
 *
 * Set this URL in Resend dashboard > Webhooks:
 * https://invest.com.au/api/webhooks/resend
 *
 * Events to subscribe: email.bounced, email.complained, email.delivery_delayed
 *
 * Security: verifies the Svix HMAC-SHA256 signature Resend attaches.
 * RESEND_WEBHOOK_SECRET is REQUIRED — without it the endpoint rejects
 * every request. This closes the prior plaintext-compare vulnerability
 * where an attacker could forge bounce events and mass-unsubscribe
 * real users.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error("RESEND_WEBHOOK_SECRET not configured — rejecting webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Read the raw body ONCE; we need the exact bytes Svix signed.
  const rawBody = await request.text();
  const svixHeaders = extractSvixHeaders(request.headers);

  if (!verifyResendSignature(webhookSecret, rawBody, svixHeaders)) {
    log.warn("Resend webhook rejected: invalid signature", {
      svixId: svixHeaders.svixId,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: { type?: string; data?: Record<string, unknown> };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Narrow unknown data to the fields we actually read
    const d = data as {
      to?: string[];
      email_id?: string;
      bounce?: { message?: string };
      complaint?: { type?: string };
    };
    const email = d.to?.[0] || d.email_id;

    if (type === "email.bounced" || type === "email.complained") {
      log.info(`Email ${type}`, {
        email,
        reason: d.bounce?.message || d.complaint?.type,
      });

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
