import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("cron:rate-alerts");

// FIN_NOTEBOOK Revenue #4: scan public.rate_alert_subscriptions for
// verified subscribers whose threshold has been crossed by the current
// best-rate snapshot, and send a notification.
//
// Data flow:
//   1. Pull the best (highest rate_bps) snapshot per product_kind from
//      savings_rate_snapshots — that's the headline rate the alert is
//      compared against.
//   2. For each verified subscription, check whether the best rate for
//      its product_kind meets-or-exceeds the threshold.
//   3. Anti-spam: skip if last_notified_at is within 24h (instant) or
//      the matching frequency window (daily / weekly).
//   4. Dispatch via sendEmail (suppression-aware) and stamp
//      last_notified_at + bump notification_count.
//
// Failure modes:
//   - Empty snapshots → no-op heartbeat (logs count, returns
//     awaiting_rate_snapshot_ingestion status).
//   - Send failure for one subscriber → log + continue (don't block
//     other dispatches).

interface SnapshotRow {
  product_kind: string;
  rate_bps: number;
  captured_at: string;
}

interface SubscriptionRow {
  id: string;
  email: string;
  product_kind: string;
  threshold_bps: number;
  frequency: string;
  last_notified_at: string | null;
  notification_count: number;
}

function minMillisBetweenSends(frequency: string): number {
  switch (frequency) {
    case "daily":
      return 24 * 60 * 60 * 1000;
    case "weekly":
      return 7 * 24 * 60 * 60 * 1000;
    case "instant":
    default:
      // "instant" still rate-limits to once per 24h per user — the alert
      // is about a rate crossing the threshold, not the rate changing
      // by a cent every minute.
      return 24 * 60 * 60 * 1000;
  }
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();

  // Pull the most-recent snapshot per (broker_id, product_kind) and
  // pick the headline (highest rate_bps) per product_kind.
  const { data: snapshots, error: snapErr } = await supabase
    .from("savings_rate_snapshots")
    .select("product_kind, rate_bps, captured_at")
    .order("captured_at", { ascending: false })
    .limit(500);

  if (snapErr) {
    log.error("snapshot query failed", { err: snapErr.message });
    return NextResponse.json({ error: snapErr.message }, { status: 500 });
  }

  const bestByKind = new Map<string, SnapshotRow>();
  for (const snap of (snapshots ?? []) as SnapshotRow[]) {
    const current = bestByKind.get(snap.product_kind);
    if (!current || snap.rate_bps > current.rate_bps) {
      bestByKind.set(snap.product_kind, snap);
    }
  }

  const { data: subs, error: subsErr } = await supabase
    .from("rate_alert_subscriptions")
    .select("id, email, product_kind, threshold_bps, frequency, last_notified_at, notification_count")
    .eq("verified", true);

  if (subsErr) {
    log.error("verified subscriptions query failed", { err: subsErr.message });
    return NextResponse.json({ error: subsErr.message }, { status: 500 });
  }

  const verified = subs?.length ?? 0;
  if (bestByKind.size === 0) {
    log.info("rate-alerts cron heartbeat — no snapshots yet", { verified });
    return NextResponse.json({
      startedAt,
      verifiedSubscriptions: verified,
      notified: 0,
      status: "awaiting_rate_snapshot_ingestion",
    });
  }

  const now = Date.now();
  const siteUrl = getSiteUrl();
  let notified = 0;
  let skippedAntiSpam = 0;
  let skippedBelowThreshold = 0;
  const failures: { id: string; err: string }[] = [];

  for (const sub of (subs ?? []) as SubscriptionRow[]) {
    const best = bestByKind.get(sub.product_kind);
    if (!best) {
      skippedBelowThreshold++;
      continue;
    }
    if (best.rate_bps < sub.threshold_bps) {
      skippedBelowThreshold++;
      continue;
    }

    if (sub.last_notified_at) {
      const lastMs = new Date(sub.last_notified_at).getTime();
      if (now - lastMs < minMillisBetweenSends(sub.frequency)) {
        skippedAntiSpam++;
        continue;
      }
    }

    const productLabel = sub.product_kind === "savings_account" ? "savings account" : "term deposit";
    const ratePct = (best.rate_bps / 100).toFixed(2);
    const thresholdPct = (sub.threshold_bps / 100).toFixed(2);

    const result = await sendEmail({
      to: sub.email,
      subject: `Rate alert: ${productLabel} now at ${ratePct}% p.a.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;color:#334155">
          <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:18px">Rate Alert</h1>
          </div>
          <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <p style="font-size:15px;margin-top:0">An Australian ${productLabel} just crossed your <strong>${thresholdPct}%</strong> target.</p>
            <p style="font-size:14px;color:#64748b">Current headline rate: <strong>${ratePct}% p.a.</strong></p>
            <div style="text-align:center;margin:20px 0">
              <a href="${siteUrl}/${sub.product_kind === "savings_account" ? "savings" : "term-deposits"}"
                 style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
                Compare ${productLabel}s &rarr;
              </a>
            </div>
            <p style="font-size:12px;color:#94a3b8">Heads-up: bonus / intro rates may apply. Always check the fine print before switching.</p>
          </div>
        </div>
      `,
    });

    if (!result.ok) {
      failures.push({ id: sub.id, err: result.error ?? "unknown" });
      continue;
    }

    await supabase
      .from("rate_alert_subscriptions")
      .update({
        last_notified_at: new Date().toISOString(),
        notification_count: sub.notification_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);

    notified++;
  }

  log.info("rate-alerts cron complete", { verified, notified, skippedAntiSpam, skippedBelowThreshold, failures: failures.length });

  return NextResponse.json({
    startedAt,
    verifiedSubscriptions: verified,
    notified,
    skippedAntiSpam,
    skippedBelowThreshold,
    failures: failures.length,
  });
}
