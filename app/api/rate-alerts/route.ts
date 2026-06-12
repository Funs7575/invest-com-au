import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";
import { isSuppressed } from "@/lib/email-suppression";
import { awardIfEligible } from "@/lib/quests-server";

const log = logger("rate-alerts");

// FIN_NOTEBOOK Revenue #4: high-intent email capture for users who want
// notifications when savings or term-deposit rates cross a threshold.
// Mirrors the fee-alerts pattern (table fee_alert_subscriptions) for
// consistency — double-opt-in via email, unsubscribe via signed token.
//
// Until the rate-snapshot ingestion lands the cron is a no-op, but
// capture is valuable on its own (a list of users actively shopping
// for savings rates is high-quality lifecycle-email + BD-pitch fuel).

const SubscribeSchema = z
  .object({
    email: z.string().email().max(254),
    product_kind: z.enum(["savings_account", "term_deposit"]),
    // threshold (default): alert when the best rate crosses threshold_pct.
    // any_change: alert whenever any tracked rate for the product changes
    // (stored as product_filters.mode = 'any_change'; threshold unused).
    mode: z.enum(["threshold", "any_change"]).default("threshold"),
    // Rate as a percentage (e.g. 5.25). Persisted as basis points to
    // avoid floating-point comparison pain in the cron query. Required
    // for threshold mode; ignored for any_change.
    threshold_pct: z.number().min(0).max(50).optional(),
    product_filters: z.record(z.string(), z.unknown()).optional(),
    frequency: z.enum(["instant", "daily", "weekly"]).default("instant"),
    // Honeypot — bots fill, real users never see.
    website: z.string().optional(),
  })
  .refine((body) => body.mode === "any_change" || body.threshold_pct !== undefined, {
    message: "threshold_pct is required for threshold alerts",
    path: ["threshold_pct"],
  });

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`rate_alert:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { email, product_kind, mode, threshold_pct, product_filters, frequency, website } =
    parsed.data;

  // Honeypot: silently 200 so bots don't probe.
  if (website && website.length > 0) {
    return NextResponse.json({ success: true });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "Please use a real email address." }, { status: 400 });
  }

  // Respect the suppression list — never confirm a subscribe email to an
  // address that has bounced, complained, or unsubscribed elsewhere.
  if (await isSuppressed(email)) {
    // Pretend it succeeded so we don't leak suppression state to spammers
    // who could otherwise harvest the bounce/complaint list.
    log.info("rate-alert subscribe blocked: suppressed", { email });
    return NextResponse.json({ success: true });
  }

  const supabase = await createClient();
  const verifyToken = randomBytes(24).toString("hex");
  const unsubscribeToken = randomBytes(24).toString("hex");
  // any_change subscriptions carry no meaningful threshold — store 0 (valid
  // per the 0..10000 CHECK) and flag the mode in product_filters so the
  // cron can partition without a schema change.
  const thresholdBps = mode === "any_change" ? 0 : Math.round((threshold_pct ?? 0) * 100);
  const filters: Record<string, unknown> = {
    ...(product_filters ?? {}),
    ...(mode === "any_change" ? { mode: "any_change" } : {}),
  };

  // Anon RLS on rate_alert_subscriptions grants INSERT ONLY (see
  // supabase/migrations/20260518010000_rate_alert_subscriptions.sql) — an
  // .upsert() (INSERT ... ON CONFLICT DO UPDATE) needs UPDATE + SELECT and
  // so 500s for every anonymous subscriber. Branch on session: authenticated
  // users fall under the service_role/FOR ALL path where an upsert is fine;
  // anonymous users do a plain .insert() and treat a unique-violation
  // (Postgres 23505 on the (lower(email), product_kind) index) as success —
  // they're already subscribed. Mirrors graceful-duplicate handling
  // elsewhere (e.g. app/api/account/watchlist/route.ts).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row = {
    email: email.toLowerCase(),
    product_kind,
    threshold_bps: thresholdBps,
    product_filters: filters,
    frequency,
    verified: false,
    verify_token: verifyToken,
    unsubscribe_token: unsubscribeToken,
    last_notified_at: null,
    notification_count: 0,
    updated_at: new Date().toISOString(),
  };

  if (user) {
    // Authenticated path: upsert on (lower(email), product_kind). Re-subscribing
    // with the same pair refreshes the threshold + tokens; old verified state is
    // reset because the threshold change is a meaningful intent shift.
    const { error: upsertErr } = await supabase
      .from("rate_alert_subscriptions")
      .upsert(row, { onConflict: "email,product_kind" });

    if (upsertErr) {
      log.error("rate-alert subscribe upsert failed", { err: upsertErr.message });
      return NextResponse.json({ error: "Failed to subscribe." }, { status: 500 });
    }
    // Quest: first-rate-alert. Authenticated subscribers only. Fire-and-
    // forget — flag-gated + fail-soft inside; never affects the subscribe
    // response or the verification email below.
    void awardIfEligible(user.id, "first-rate-alert");
  } else {
    // Anonymous path: INSERT only. A 23505 means the (email, product_kind)
    // pair already exists — already subscribed, so report success rather than
    // 500. The verification email below still re-fires so the user can confirm.
    const { error: insertErr } = await supabase
      .from("rate_alert_subscriptions")
      .insert(row);

    if (insertErr && insertErr.code !== "23505") {
      log.error("rate-alert subscribe insert failed", { err: insertErr.message });
      return NextResponse.json({ error: "Failed to subscribe." }, { status: 500 });
    }
  }

  // Fire-and-forget verification email; the subscriber row already
  // exists so the user can retry verification later by re-subscribing.
  const siteUrl = getSiteUrl();
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const productLabel = product_kind === "savings_account" ? "savings account" : "term deposit";
    const confirmLine =
      mode === "any_change"
        ? `We'll email you whenever a tracked Australian ${productLabel} rate changes.`
        : `We'll email you when any Australian ${productLabel} crosses <strong>${(threshold_pct ?? 0).toFixed(2)}% p.a.</strong>`;
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: email,
          subject: `Confirm your ${productLabel} rate alert`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #334155;">
              <div style="background: #0f172a; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 18px;">Rate Alert</h1>
              </div>
              <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 15px; margin-top: 0;">
                  ${confirmLine}
                </p>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${siteUrl}/rate-alerts?verify=${verifyToken}"
                     style="display: inline-block; padding: 12px 32px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                    Confirm Alert &rarr;
                  </a>
                </div>
                <p style="font-size: 12px; color: #94a3b8;">
                  <a href="${siteUrl}/rate-alerts/manage?token=${unsubscribeToken}" style="color: #64748b;">Manage preferences</a>
                  &nbsp;&middot;&nbsp;
                  Didn't mean to subscribe?
                  <a href="${siteUrl}/rate-alerts?unsubscribe=${unsubscribeToken}" style="color: #64748b;">Unsubscribe</a>
                </p>
              </div>
            </div>
          `,
        }),
      });
    } catch (err) {
      // Verification-email failure is non-fatal — row is captured, user
      // can re-subscribe to retry.
      log.warn("rate-alert verify email send failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const verifyToken = searchParams.get("verify");
  const unsubToken = searchParams.get("unsubscribe");

  if (!verifyToken && !unsubToken) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const supabase = await createClient();

  if (verifyToken) {
    const { error } = await supabase
      .from("rate_alert_subscriptions")
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq("verify_token", verifyToken);
    if (error) {
      log.warn("rate-alert verify failed", { err: error.message });
      return NextResponse.json({ error: "Verification failed." }, { status: 500 });
    }
    return NextResponse.json({ success: true, action: "verified" });
  }

  if (unsubToken) {
    const { error } = await supabase
      .from("rate_alert_subscriptions")
      .delete()
      .eq("unsubscribe_token", unsubToken);
    if (error) {
      log.warn("rate-alert unsubscribe failed", { err: error.message });
      return NextResponse.json({ error: "Unsubscribe failed." }, { status: 500 });
    }
    return NextResponse.json({ success: true, action: "unsubscribed" });
  }

  return NextResponse.json({ error: "Missing token." }, { status: 400 });
}
