import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { sendEmail } from "@/lib/resend";
import { notifyUser } from "@/lib/notifications";
import { dispatchPushToUser } from "@/lib/push-dispatch";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";
import {
  evaluateThreshold,
  metricKindLabel,
  metricKindPath,
  minMillisBetweenSends,
  type AlertSubscription,
  type MetricKind,
} from "@/lib/alert-thresholds";
import {
  renderThresholdAlertEmail,
  renderRateChangesEmail,
  type RateChangeItem,
} from "@/lib/rate-alert-emails";
import {
  isTelegramConfigured,
  formatRateAlertMessage,
  dispatchTelegramAlerts,
} from "@/lib/telegram";

export const runtime = "nodejs";
export const maxDuration = 120;

const log = logger("cron:rate-alerts");

// FIN_NOTEBOOK Revenue #4: the rate-alert mailer. Two subscription modes,
// both read from rate_alert_subscriptions (verified = true):
//
//   threshold (default)            — evaluate current market data against the
//                                    user threshold; email when crossed.
//   any_change (product_filters.mode='any_change')
//                                  — email a digest of rate_change_log entries
//                                    for the subscribed product kind since the
//                                    last notification.
//
// Metric sources:
//   savings_rate / term_deposit → savings_rate_snapshots (best per product_kind)
//   loan_rate                   → investment_loan_rates (per lender_slug or best)
//   broker_fee                  → brokers.asx_fee_value (per broker_slug)
//   any_change digests          → rate_change_log (written by rate-change-digest)
//
// Idempotency (layered):
//   - rate_alert_sends: unique (subscription_id, period_key) claimed BEFORE
//     send — a concurrent double-run can never double-send within a UTC day.
//     Degrades gracefully (cooldown-only) until the table's migration is
//     pushed to prod.
//   - last_notified_at + frequency cooldown via lib/alert-thresholds.
//   - hysteresis re-arm band for threshold subs.
//   - notifyUser() deduplicates in-app notifications via email_delivery_key.
//
// Paused subscriptions (product_filters.paused = true, set from the
// tokenised /rate-alerts/manage page) are skipped entirely.
//
// Compliance: emails are rendered by lib/rate-alert-emails.ts — factual
// tone, GENERAL_ADVICE_WARNING, manage-preferences + unsubscribe links on
// every send (Spam Act 2003).

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
  product_filters: Record<string, unknown> | null;
  unsubscribe_token: string;
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

interface RateChangeRow {
  broker_name: string;
  product_kind: string;
  old_rate_bps: number | null;
  new_rate_bps: number;
  direction: "up" | "down" | "new";
  snapshot_captured_at: string;
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

/** product_kind in rate_change_log terms for an any-change subscription. */
function changeProductKind(sub: SubscriptionRow): "savings_account" | "term_deposit" {
  const kind = sub.metric_kind ?? sub.product_kind;
  return kind === "term_deposit" ? "term_deposit" : "savings_account";
}

/** Normalised metric kind for rendering (legacy product_kind fallbacks). */
function normalisedMetricKind(sub: SubscriptionRow): MetricKind {
  const kind = sub.metric_kind ?? sub.product_kind;
  if (kind === "savings_account") return "savings_rate";
  if (kind === "term_deposit" || kind === "loan_rate" || kind === "broker_fee") {
    return kind;
  }
  return "savings_rate";
}

// ── Idempotent send-slot claim ────────────────────────────────────────────────

type SendSlot = "claimed" | "duplicate" | "unavailable";

/**
 * Claim the (subscription, UTC-day) send slot BEFORE sending. A unique
 * violation means another run already sent today → skip. Any other failure
 * (most importantly 42P01 while the rate_alert_sends migration hasn't been
 * pushed) falls back to the cooldown-only dedupe that predates the table.
 */
async function claimSendSlot(
  supabase: ReturnType<typeof createAdminClient>,
  subscriptionId: string,
  periodKey: string,
  kind: "threshold" | "rate_change",
): Promise<SendSlot> {
  const { error } = await supabase
    .from("rate_alert_sends")
    .insert({ subscription_id: subscriptionId, period_key: periodKey, kind });
  if (!error) return "claimed";
  if (error.code === "23505") return "duplicate";
  log.warn("rate_alert_sends unavailable — falling back to cooldown dedupe", {
    code: error.code,
    err: error.message,
  });
  return "unavailable";
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  // Ops kill switch (automation_kill_switches row 'rate_alerts' or 'global').
  // No row present = enabled, matching the pre-switch behaviour.
  if (await isFeatureDisabled("rate_alerts")) {
    log.info("rate-alerts mailer disabled via kill switch — skipping");
    return NextResponse.json({ skipped: true, reason: "kill_switch" });
  }

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();
  const siteUrl = getSiteUrl();
  const nowMs = Date.now();
  const dayKey = Math.floor(nowMs / 86_400_000);
  const periodKey = `d${dayKey}`;

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
  if (loansRes.error) {
    // investment_loan_rates is absent until its migration is pushed —
    // loan_rate subscriptions are skipped (no data), everything else runs.
    log.warn("loan rates query failed — loan_rate alerts skipped", {
      err: loansRes.error.message,
    });
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
      "id, user_id, email, metric_kind, product_kind, threshold_bps, direction, frequency, broker_slug, lender_slug, product_filters, unsubscribe_token, last_notified_at, last_fired_value_bps, notification_count",
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

  // ── 2a. Partition: paused / any-change / threshold ─────────────────────────

  const thresholdSubs: SubscriptionRow[] = [];
  const changeSubs: SubscriptionRow[] = [];
  let skippedPaused = 0;

  for (const rawSub of (subs ?? []) as SubscriptionRow[]) {
    const filters = (rawSub.product_filters ?? {}) as Record<string, unknown>;
    if (filters.paused === true) {
      skippedPaused++;
      continue;
    }
    if (filters.mode === "any_change") changeSubs.push(rawSub);
    else thresholdSubs.push(rawSub);
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

  // ── 2c. Load recent rate changes once (7-day window) for any-change subs ──

  let recentChanges: RateChangeRow[] = [];
  if (changeSubs.length > 0) {
    const lookbackIso = new Date(nowMs - 7 * 86_400_000).toISOString();
    const { data: changeRows, error: changesErr } = await supabase
      .from("rate_change_log")
      .select("broker_name, product_kind, old_rate_bps, new_rate_bps, direction, snapshot_captured_at")
      .gte("snapshot_captured_at", lookbackIso)
      .order("snapshot_captured_at", { ascending: false })
      .limit(500);
    if (changesErr) {
      log.warn("rate_change_log query failed — any-change digests skipped", {
        err: changesErr.message,
      });
    } else {
      recentChanges = (changeRows ?? []) as RateChangeRow[];
    }
  }

  // ── 3. Shared post-send bookkeeping ────────────────────────────────────────

  let notified = 0;
  let changeNotified = 0;
  let skippedNoData = 0;
  let skippedNotCrossed = 0;
  let skippedCooldown = 0;
  let skippedHysteresis = 0;
  let skippedDuplicate = 0;
  let skippedNoChanges = 0;
  const failures: { id: string; err: string }[] = [];

  async function stampSubscription(rawSub: SubscriptionRow, firedValueBps: number | null) {
    await supabase
      .from("rate_alert_subscriptions")
      .update({
        last_notified_at: new Date().toISOString(),
        ...(firedValueBps !== null ? { last_fired_value_bps: firedValueBps } : {}),
        notification_count: (rawSub.notification_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rawSub.id);
  }

  // ── 4. Threshold subscriptions ─────────────────────────────────────────────

  for (const rawSub of thresholdSubs) {
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

    const kind = normalisedMetricKind(rawSub);
    const alertSub: AlertSubscription = {
      id: rawSub.id,
      metric_kind: kind,
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

    // Claim the per-day send slot before doing anything visible.
    const slot = await claimSendSlot(supabase, rawSub.id, periodKey, "threshold");
    if (slot === "duplicate") {
      skippedDuplicate++;
      continue;
    }

    const label = metricKindLabel(kind);
    const path = metricKindPath(kind);
    const thresholdPct = (rawSub.threshold_bps / 100).toFixed(2);
    const directionText = alertSub.direction === "above" ? "crossed above" : "dropped below";
    const valueDisplay =
      kind === "broker_fee"
        ? `$${(currentValue / 100).toFixed(2)} (ASX fee)`
        : `${(currentValue / 100).toFixed(2)}% p.a.`;

    const email = renderThresholdAlertEmail({
      siteUrl,
      metricKind: kind,
      direction: alertSub.direction,
      thresholdBps: rawSub.threshold_bps,
      currentValueBps: currentValue,
      unsubscribeToken: rawSub.unsubscribe_token,
    });

    const emailResult = await sendEmail({
      to: rawSub.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
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
        oldRatePct: kind === "broker_fee" ? `$${thresholdPct}` : `${thresholdPct}%`,
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
    await stampSubscription(rawSub, currentValue);

    // Write in-app notification + browser push for user-linked subscriptions.
    if (rawSub.user_id) {
      // Dedup key: one in-app notification per subscription per calendar day.
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

  // ── 5. Any-change subscriptions ────────────────────────────────────────────

  for (const rawSub of changeSubs) {
    const frequency = (rawSub.frequency ?? "instant") as AlertSubscription["frequency"];
    const cooldownMs = minMillisBetweenSends(frequency);

    // Frequency cooldown — same windows as threshold subs (instant=24h cap).
    if (rawSub.last_notified_at !== null) {
      const lastMs = new Date(rawSub.last_notified_at).getTime();
      if (nowMs - lastMs < cooldownMs) {
        skippedCooldown++;
        continue;
      }
    }

    // Changes since the last notification (or one cooldown window for new
    // subs), capped at the 7-day query window.
    const sinceMs = rawSub.last_notified_at
      ? Math.max(new Date(rawSub.last_notified_at).getTime(), nowMs - 7 * 86_400_000)
      : nowMs - cooldownMs;

    const wantedKind = changeProductKind(rawSub);
    const relevant = recentChanges.filter(
      (change) =>
        change.product_kind === wantedKind &&
        new Date(change.snapshot_captured_at).getTime() > sinceMs,
    );

    if (relevant.length === 0) {
      skippedNoChanges++;
      continue;
    }

    const slot = await claimSendSlot(supabase, rawSub.id, periodKey, "rate_change");
    if (slot === "duplicate") {
      skippedDuplicate++;
      continue;
    }

    const kind = normalisedMetricKind(rawSub);
    const items: RateChangeItem[] = relevant.slice(0, 20).map((change) => ({
      brokerName: change.broker_name,
      productKind: change.product_kind,
      oldRateBps: change.old_rate_bps,
      newRateBps: change.new_rate_bps,
      direction: change.direction,
    }));

    const email = renderRateChangesEmail({
      siteUrl,
      metricKind: kind,
      changes: items,
      unsubscribeToken: rawSub.unsubscribe_token,
    });

    const emailResult = await sendEmail({
      to: rawSub.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (!emailResult.ok) {
      failures.push({ id: rawSub.id, err: emailResult.error ?? "unknown" });
    }

    await stampSubscription(rawSub, null);

    if (rawSub.user_id) {
      const label = metricKindLabel(kind);
      await notifyUser({
        userId: rawSub.user_id,
        type: "fee_change",
        title: `${relevant.length} ${label} change${relevant.length === 1 ? "" : "s"}`,
        body: `${relevant.length} ${label} change${relevant.length === 1 ? "" : "s"} since your last update.`,
        linkUrl: metricKindPath(kind),
        emailDeliveryKey: `rate_alert:${rawSub.id}:${dayKey}`,
      });
    }

    changeNotified++;
  }

  log.info("rate-alerts cron complete", {
    verified,
    notified,
    changeNotified,
    skippedPaused,
    skippedNoData,
    skippedNotCrossed,
    skippedCooldown,
    skippedHysteresis,
    skippedDuplicate,
    skippedNoChanges,
    failures: failures.length,
  });

  return NextResponse.json({
    startedAt,
    verifiedSubscriptions: verified,
    notified,
    changeNotified,
    skippedPaused,
    skippedNoData,
    skippedNotCrossed,
    skippedCooldown,
    skippedHysteresis,
    skippedDuplicate,
    skippedNoChanges,
    failures: failures.length,
    // `failed` keys the withCronRunLog partial-status convention.
    failed: failures.length,
  });
}

export const GET = wrapCronHandler("rate_alerts", handler);
