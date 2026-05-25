/**
 * /api/account/alerts — authenticated CRUD for rate/fee alert subscriptions.
 *
 * GET    — list the current user's alert subscriptions
 * POST   — create a new subscription (auto-verified for signed-in users)
 * DELETE — remove a subscription by id
 *
 * Auth: all methods require a valid Supabase session (401 otherwise).
 * RLS: the authenticated policy on rate_alert_subscriptions gates on
 *      user_id = auth.uid(), so the DB enforces ownership too.
 *
 * Metric kinds:
 *   savings_rate  → savings_rate_snapshots
 *   term_deposit  → savings_rate_snapshots (product_kind='term_deposit')
 *   loan_rate     → investment_loan_rates
 *   broker_fee    → brokers.asx_fee_value / us_fee_value
 *
 * AFSL: factual threshold comparisons on public data only.
 * No advice, no ranking, no prediction.
 */

import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:account:alerts");

export const runtime = "nodejs";

const METRIC_KINDS = ["savings_rate", "term_deposit", "loan_rate", "broker_fee"] as const;

const CreateBody = z.object({
  metric_kind: z.enum(METRIC_KINDS),
  /** Threshold as a percentage (e.g. 5.25). Converted to basis points on insert. */
  threshold_pct: z.number().min(0).max(100),
  /** "above" fires when current ≥ threshold; "below" when current ≤ threshold. */
  direction: z.enum(["above", "below"]).default("above"),
  frequency: z.enum(["instant", "daily", "weekly"]).default("instant"),
  /** Required for broker_fee subscriptions. */
  broker_slug: z.string().max(100).optional().nullable(),
  /** Required for loan_rate subscriptions. */
  lender_slug: z.string().max(100).optional().nullable(),
  /** Optional JSON filter bag for future refinement (min_balance etc.). */
  product_filters: z.record(z.string(), z.unknown()).optional(),
});

const DeleteBody = z.object({
  id: z.string().uuid(),
});

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("rate_alert_subscriptions")
    .select(
      "id, metric_kind, product_kind, threshold_bps, direction, frequency, broker_slug, lender_slug, verified, last_notified_at, last_fired_value_bps, notification_count, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    log.warn("alerts GET failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

// ── POST ───────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(CreateBody, async (_req: NextRequest, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const email = user.email ?? "";
  if (!email) {
    return NextResponse.json({ error: "user_email_missing" }, { status: 400 });
  }

  // Validate context-required fields.
  if (body.metric_kind === "broker_fee" && !body.broker_slug) {
    return NextResponse.json(
      { error: "broker_slug required for broker_fee alerts" },
      { status: 400 },
    );
  }
  if (body.metric_kind === "loan_rate" && !body.lender_slug) {
    return NextResponse.json(
      { error: "lender_slug required for loan_rate alerts" },
      { status: 400 },
    );
  }

  const thresholdBps = Math.round(body.threshold_pct * 100);

  // Map metric_kind to legacy product_kind for backward compat with the
  // existing cron which still reads product_kind.
  const legacyProductKind =
    body.metric_kind === "savings_rate"
      ? "savings_account"
      : body.metric_kind === "term_deposit"
      ? "term_deposit"
      : "other";

  // Signed-in users skip double-opt-in — their session is already verified.
  const unsubscribeToken = randomBytes(24).toString("hex");
  const verifyToken = randomBytes(24).toString("hex");

  const { data: inserted, error: insertErr } = await supabase
    .from("rate_alert_subscriptions")
    .insert({
      user_id: user.id,
      email: email.toLowerCase(),
      metric_kind: body.metric_kind,
      product_kind: legacyProductKind,
      threshold_bps: thresholdBps,
      direction: body.direction,
      frequency: body.frequency,
      broker_slug: body.broker_slug ?? null,
      lender_slug: body.lender_slug ?? null,
      product_filters: body.product_filters ?? {},
      verified: true, // signed-in users are auto-verified
      verify_token: verifyToken,
      unsubscribe_token: unsubscribeToken,
      last_notified_at: null,
      notification_count: 0,
    })
    .select("id, metric_kind, threshold_bps, direction, frequency")
    .single();

  if (insertErr) {
    log.warn("alerts POST insert failed", {
      userId: user.id,
      err: insertErr.message,
    });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  log.info("alert created", {
    userId: user.id,
    alertId: inserted?.id,
    metricKind: body.metric_kind,
    thresholdBps,
    direction: body.direction,
  });

  return NextResponse.json({ item: inserted }, { status: 201 });
});

// ── DELETE ─────────────────────────────────────────────────────────────────────

export const DELETE = withValidatedBody(DeleteBody, async (_req: NextRequest, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("rate_alert_subscriptions")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id); // ownership enforced at both app + RLS layers

  if (error) {
    log.warn("alerts DELETE failed", {
      userId: user.id,
      alertId: body.id,
      err: error.message,
    });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
