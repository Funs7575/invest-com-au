import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { notifyUser } from "@/lib/notifications";
import { dispatchPushToUser } from "@/lib/push-dispatch";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";
import {
  evaluateThreshold,
  metricKindLabel,
  metricKindPath,
  type AlertSubscription,
  type MetricKind,
} from "@/lib/alert-thresholds";
import {
  isTelegramConfigured,
  formatRateAlertMessage,
  dispatchTelegramAlerts,
} from "@/lib/telegram";
import { wrapCronHandler } from "@/lib/cron-run-log";

export const runtime = "nodejs";
export const maxDuration = 120;

const log = logger("cron:rate-alerts");

// FIN_NOTEBOOK Revenue #4: evaluate all rate_alert_subscriptions against
// current market data and dispatch email + in-app notifications when
// a threshold is crossed.
//
// Metric sources:
//   savings_rate / term_deposit → savings_rate_snapshots (best per product_kind)
//   loan_rate                   → investment_loan_rates (per lender_slug or best)
//   broker_fee                  → brokers.asx_fee_value (per broker_slug)
//
// Idempotent:
//   - Records last_notified_at + last_fired_value_bps on fire.
//   - lib/alert-thresholds.ts enforces cooldown + hysteresis before fire.
//   - notifyUser() deduplicates in-app notifications via email_delivery_key.

interface SubscriptionRow {
  id: string;
  user_id: string | null;
  email: string;
  metric_kind: string | null;
  product_kind: string;
  threshold_bps: number;
  direction: string;
  frequency: string;
  broker_slug: string | null;
  lender_slug: string | null;
  last_notified_at: string | null;
  last_fired_value_bps: number | null;
  notification_count: number;
}

// ── Market-data snapshot types ────────────────────────────────────────────────

interface SavingsSnapshot {
  product_kind: string;
  rate_bps: number;
}

interface LoanRateRow {
  lender_slug: string;
  rate_pct: number; // percentage — convert to bps (* 100)
}

interface BrokerFeeRow {
  slug: string;
  asx_fee_value: number | null;
}

// ── Resolve current market value for a subscription ───────────────────────────

function resolveCurrentValue(
  sub: SubscriptionRow,
  bestSavingsByKind: Map<string, number>,
  loanRatesBySlug: Map<string, number>,
  brokerFeesBySlug: Map<string, number>,
): number | null {
  const kind = (sub.metric_kind ?? sub.product_kind) as MetricKind | string;

  if (kind === "savings_rate" || kind === "savings_account") {
    return bestSavingsByKind.get("savings_account") ?? null;
  }
  if (kind === "term_deposit") {
    return bestSavingsByKind.get("term_deposit") ?? null;
  }
  if (kind === "loan_rate") {
    if (sub.lender_slug) {
      return loanRatesBySlug.get(sub.lender_slug) ?? null;
    }
    // No specific lender — use the best (lowest) rate available.
    if (loanRatesBySlug.size === 0) return null;
    return Math.min(...loanRatesBySlug.values());
  }
  if (kind === "broker_fee") {
    if (!sub.broker_slug) return null;
    return brokerFeesBySlug.get(sub.broker_slug) ?? null;
  }
  return null;
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();
  const siteUrl = getSiteUrl();
  const nowMs = Date.now();

  // ── 1. Load market data ────────────────────────────────────────────────────

  const [savingsRes, loansRes, brokersRes] = await Promise.all([
    supabase
      .from("savings_rate_snapshots")
      .select("product_kind, rate_bps, captured_at")
      .order("captured_at", { ascending: false })
      .limit(500),
    supabase
      .from("investment_loan_rates")
      .select("lender_slug, rate_pct"),
    supabase
      .from("brokers")
      .select("slug, asx_fee_value")
      .eq("status", "active"),
  ]);

  if (savingsRes.error) {
    log.error("savings snapshots query failed", { err: savingsRes.error.message });
    return NextResponse.json({ error: savingsRes.error.message }, { status: 500 });
  }

  // Build best (highest rate_bps) per product_kind for savings/td.
  const bestSavingsByKind = new Map<string, number>();
  for (const snap of (savingsRes.data ?? []) as SavingsSnapshot[]) {
    const current = bestSavingsByKind.get(snap.product_kind);
    if (current === undefined || snap.rate_bps > current) {
      bestSavingsByKind.set(snap.product_kind, snap.rate_bps);
    }
  }

  // Loan rates: rate_pct → bps.
  const loanRatesBySlug = new Map<string, number>();
  for (const row of (loansRes.data ?? []) as LoanRateRow[]) {
    loanRatesBySlug.set(row.lender_slug, Math.round(row.rate_pct * 100));
  }

  // Broker fees: asx_fee_value is in cents; treat cents as bps units for
  // comparison (1 cent = 1 bps unit). Threshold set by user in same unit.
  const brokerFeesBySlug = new Map<string, number>();
  for (const row of (brokersRes.data ?? []) as BrokerFeeRow[]) {
    if (row.asx_fee_value !== null) {
      brokerFeesBySlug.set(row.slug, Math.round(row.asx_fee_value));
    }
  }

  // ── 2. Load verified subscriptions ────────────────────────────────────────

  const { data: subs, error: subsErr } = await supabase
    .from("rate_alert_subscriptions")
    .select(
      "id, user_id, email, metric_kind, product_kind, threshold_bps, direction, frequency, broker_slug, lender_slug, last_notified_at, last_fired_value_bps, notification_count",
    )
    .eq("verified", true);

  if (subsErr) {
    log.error("subscriptions query failed", { err: subsErr.message });
    return NextResponse.json({ error: subsErr.message }, { status: 500 });
  }

  const verified = subs?.length ?? 0;

  if (verified === 0) {
    log.info("rate-alerts cron heartbeat — no verified subscriptions", { verified });
    return NextResponse.json({ startedAt, verified, notified: 0, status: "no_subscriptions" });
  }

  // ── 2b. Load Telegram subscriptions (batch — one query for all emails) ─────
  // email (lowercase) → list of confirmed+active chat IDs for rate_alerts
  const telegramByEmail = new Map<string, number[]>();
  if (isTelegramConfigured()) {
    const { data: tgSubs } = await supabase
      .from("telegram_subscriptions")
      .select("email, telegram_chat_id")
      .eq("confirmed", true)
      .eq("active", true)
      .eq("rate_alerts", true);
    for (const row of (tgSubs ?? []) as { email: string; telegram_chat_id: number }[]) {
      const key = row.email.toLowerCase();
      const existing = telegramByEmail.get(key) ?? [];
      existing.push(row.telegram_chat_id);
      telegramByEmail.set(key, existing);
    }
  }

  // ── 3. Evaluate thresholds and dispatch ───────────────────────────────────

  let notified = 0;
  let skippedNoData = 0;
  let skippedNotCrossed = 0;
  let skippedCooldown = 0;
  let skippedHysteresis = 0;
  const failures: { id: string; err: string }[] = [];

  for (const rawSub of (subs ?? []) as SubscriptionRow[]) {
    const currentValue = resolveCurrentValue(
      rawSub,
      bestSavingsByKind,
      loanRatesBySlug,
      brokerFeesBySlug,
    );

    if (currentValue === null) {
      skippedNoData++;
      continue;
    }

    const alertSub: AlertSubscription = {
      id: rawSub.id,
      metric_kind: (rawSub.metric_kind ?? rawSub.product_kind) as MetricKind,
      threshold_bps: rawSub.threshold_bps,
      direction: (rawSub.direction ?? "above") as "above" | "below",
      frequency: (rawSub.frequency ?? "instant") as AlertSubscription["frequency"],
      last_notified_at: rawSub.last_notified_at,
      last_fired_value_bps: rawSub.last_fired_value_bps,
    };

    const result = evaluateThreshold(alertSub, currentValue, nowMs);

    if (!result.shouldFire) {
      if (result.suppressReason === "not_crossed") skippedNotCrossed++;
      else if (result.suppressReason === "cooldown") skippedCooldown++;
      else if (result.suppressReason === "hysteresis") skippedHysteresis++;
      continue;
    }

    const kind = alertSub.metric_kind;
    const label = metricKindLabel(kind);
    const path = metricKindPath(kind);
    const valuePct = (currentValue / 100).toFixed(2);
    const thresholdPct = (rawSub.threshold_bps / 100).toFixed(2);
    const directionText = alertSub.direction === "above" ? "crossed above" : "dropped below";
    const valueDisplay =
      kind === "broker_fee"
        ? `$${valuePct} (ASX fee)`
        : `${valuePct}% p.a.`;

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;color:#334155">
        <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:18px">Rate Alert</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <p style="font-size:15px;margin-top:0">
            The <strong>${label}</strong> just ${directionText} your
            <strong>${kind === "broker_fee" ? `$${thresholdPct}` : `${thresholdPct}%`}</strong> threshold.
          </p>
          <p style="font-size:14px;color:#64748b">
            Current value: <strong>${valueDisplay}</strong>
          </p>
          <div style="text-align:center;margin:20px 0">
            <a href="${siteUrl}${path}"
               style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
              Compare now &rarr;
            </a>
          </div>
          <p style="font-size:12px;color:#94a3b8">
            This is a factual market data alert — not personal financial advice.
            Rates and fees may vary. Always read the product disclosure statement.
          </p>
        </div>
      </div>
    `;

    const emailResult = await sendEmail({
      to: rawSub.email,
      subject: `Alert: ${label} ${directionText} ${kind === "broker_fee" ? `$${thresholdPct}` : `${thresholdPct}%`}`,
      html: emailHtml,
    });

    if (!emailResult.ok) {
      failures.push({ id: rawSub.id, err: emailResult.error ?? "unknown" });
    }

    // Telegram dispatch — fire-and-forget alongside email
    const tgChatIds = telegramByEmail.get(rawSub.email.toLowerCase()) ?? [];
    if (tgChatIds.length > 0) {
      const tgMessage = formatRateAlertMessage({
        metricLabel: label,
        direction: alertSub.direction,
        oldRatePct: kind === "broker_fee" ? `$${(rawSub.threshold_bps / 100).toFixed(2)}` : `${(rawSub.threshold_bps / 100).toFixed(2)}%`,
        newRatePct: valueDisplay,
        productName: rawSub.broker_slug ?? rawSub.lender_slug ?? label,
        deepLinkUrl: `${siteUrl}${path}`,
      });
      dispatchTelegramAlerts(
        tgChatIds.map((chatId) => ({ chatId, email: rawSub.email })),
        tgMessage,
      ).catch((err) => log.warn("Telegram rate-alert dispatch failed (non-blocking)", { err }));
    }

    // Always stamp the row (even if email failed) so we don't immediately retry.
    await supabase
      .from("rate_alert_subscriptions")
      .update({
        last_notified_at: new Date().toISOString(),
        last_fired_value_bps: currentValue,
        notification_count: (rawSub.notification_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rawSub.id);

    // Write in-app notification + browser push for user-linked subscriptions.
    if (rawSub.user_id) {
      // Dedup key: one in-app notification per subscription per calendar day.
      const dayKey = Math.floor(nowMs / 86_400_000);
      const notifTitle = `${label.charAt(0).toUpperCase() + label.slice(1)} alert`;
      const notifBody = `${label.charAt(0).toUpperCase() + label.slice(1)} (${valueDisplay}) ${directionText} your ${kind === "broker_fee" ? `$${thresholdPct}` : `${thresholdPct}%`} threshold.`;

      await notifyUser({
        userId: rawSub.user_id,
        type: "fee_change",
        title: notifTitle,
        body: notifBody,
        linkUrl: path,
        emailDeliveryKey: `rate_alert:${rawSub.id}:${dayKey}`,
      });

      // Browser push — reuses the same dedupe key already stamped above on
      // last_notified_at, so double-fires are structurally impossible within
      // the cooldown window enforced by evaluateThreshold.
      await dispatchPushToUser(rawSub.user_id, {
        title: notifTitle,
        body: notifBody,
        url: path,
        tag: `rate_alert:${rawSub.id}`,
      });
    }

    notified++;
  }

  log.info("rate-alerts cron complete", {
    verified,
    notified,
    skippedNoData,
    skippedNotCrossed,
    skippedCooldown,
    skippedHysteresis,
    failures: failures.length,
  });

  return NextResponse.json({
    startedAt,
    verifiedSubscriptions: verified,
    notified,
    skippedNoData,
    skippedNotCrossed,
    skippedCooldown,
    skippedHysteresis,
    failures: failures.length,
  });
}

export const GET = wrapCronHandler("rate-alerts", handler);
