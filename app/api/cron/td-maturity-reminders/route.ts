/**
 * Cron: TD maturity reminders — daily at 07:00 UTC (daily-7).
 *
 * For each user_term_deposit maturing in exactly 30, 7, or 1 day(s):
 *   1. Skip if already sent for that (td_id, days_before) pair.
 *   2. Fetch the 5 best current TD rates from savings_rate_snapshots.
 *   3. Send a personalised reminder email with the current best rates
 *      so the user can decide whether to roll over or redeploy.
 *
 * Deduplication: td_reminder_sends(td_id, days_before) UNIQUE constraint.
 * Capped at 200 TDs per invocation (reruns handle the rest).
 *
 * Compliance: factual rate comparison only — not personal financial advice.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { logger } from "@/lib/logger";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("cron:td-maturity-reminders");
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://invest.com.au";
const REMINDER_WINDOWS = [30, 7, 1] as const;

interface TdRow {
  id: number;
  user_id: string;
  institution_name: string;
  principal_cents: number;
  rate_bps: number;
  term_months: number;
  maturity_date: string;
}

interface UserRow {
  id: string;
  email: string;
}

interface BrokerInfo {
  name: string;
  slug: string;
}

interface BestRateRow {
  broker_id: number;
  rate_bps: number;
  term_months: number | null;
  // Supabase returns the joined row as object or array depending on relationship cardinality.
  brokers: BrokerInfo | BrokerInfo[] | null;
}

function resolveProvider(row: BestRateRow): BrokerInfo | null {
  if (!row.brokers) return null;
  return Array.isArray(row.brokers) ? (row.brokers[0] ?? null) : row.brokers;
}

// ─── Email builder ─────────────────────────────────────────────────────────

function fmtAud(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function fmtRate(bps: number): string {
  return (bps / 100).toFixed(2) + "% p.a.";
}

function buildReminderEmail(
  td: TdRow,
  daysBefore: number,
  bestRates: BestRateRow[],
): { subject: string; html: string } {
  const maturityFormatted = new Date(td.maturity_date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const urgencyLabel =
    daysBefore === 1
      ? "tomorrow"
      : daysBefore === 7
        ? "in 7 days"
        : "in 30 days";

  const subject =
    daysBefore === 1
      ? `Your ${escapeHtml(td.institution_name)} term deposit matures tomorrow`
      : `Your ${escapeHtml(td.institution_name)} term deposit matures ${urgencyLabel}`;

  const rateRows = bestRates
    .slice(0, 5)
    .map((r) => {
      const provider = resolveProvider(r);
      const providerName = provider?.name ?? "Unknown provider";
      const providerSlug = provider?.slug ?? "";
      const termLabel = r.term_months != null ? `${r.term_months}m` : "—";
      const href = providerSlug
        ? `${BASE_URL}/term-deposits/${providerSlug}`
        : `${BASE_URL}/term-deposits`;
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:14px;">
            <a href="${href}" style="color:#7c3aed;text-decoration:none;">${escapeHtml(providerName)}</a>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#059669;font-size:14px;">${fmtRate(r.rate_bps)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b;font-size:13px;">${termLabel}</td>
        </tr>`;
    })
    .join("");

  const ratesSection =
    bestRates.length > 0
      ? `
    <h2 style="font-size:16px;font-weight:600;color:#1e293b;margin:24px 0 12px;">Current best TD rates</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Provider</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Rate</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Term</th>
        </tr>
      </thead>
      <tbody>${rateRows}</tbody>
    </table>
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Rates sourced from Invest.com.au — may not reflect the latest offers. Verify directly with each provider before deciding.</p>
    <p style="margin:16px 0 0;">
      <a href="${BASE_URL}/term-deposits" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Compare all TD rates →</a>
    </p>`
      : `<p style="color:#64748b;font-size:14px;">
      <a href="${BASE_URL}/term-deposits" style="color:#7c3aed;">Compare current TD rates →</a>
    </p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 32px;">
    <p style="margin:0;font-size:12px;font-weight:600;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.08em;">Term Deposit Reminder</p>
    <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#fff;">Your TD matures ${urgencyLabel}</h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 32px;">

    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
      Your term deposit with <strong>${escapeHtml(td.institution_name)}</strong> matures on
      <strong>${maturityFormatted}</strong>. Time to decide: roll over, switch provider, or redeploy.
    </p>

    <!-- TD summary card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:4px;">
      <tr>
        <td style="padding:12px 16px;border-right:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Principal</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#1e293b;">${fmtAud(td.principal_cents)}</p>
        </td>
        <td style="padding:12px 16px;border-right:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Your rate</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#059669;">${fmtRate(td.rate_bps)}</p>
        </td>
        <td style="padding:12px 16px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Term</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#1e293b;">${td.term_months}m</p>
        </td>
      </tr>
    </table>

    ${ratesSection}

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">

    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
      General information only — not personal financial advice. Always compare products and
      consider your own circumstances before investing. Rates change frequently.
      <a href="${BASE_URL}/account/term-deposits" style="color:#7c3aed;">Manage your TDs</a> ·
      <a href="${BASE_URL}/account/notifications" style="color:#7c3aed;">Notification settings</a>
    </p>

  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;

  return { subject, html };
}

// ─── Route ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("td-maturity-reminders", async () => {
    const supabase = createAdminClient();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // ── 1. Collect TDs maturing in 30/7/1 days ──────────────────────────────
    const targetDates = REMINDER_WINDOWS.map((days) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + days);
      return { days, iso: d.toISOString().slice(0, 10) };
    });

    const { data: allTds, error: tdsErr } = await supabase
      .from("user_term_deposits")
      .select(
        "id, user_id, institution_name, principal_cents, rate_bps, term_months, maturity_date",
      )
      .in(
        "maturity_date",
        targetDates.map((t) => t.iso),
      )
      .limit(200);

    if (tdsErr) {
      log.error("failed to fetch TDs", { error: tdsErr.message });
      return {
        response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }),
        stats: { sent: 0 },
      };
    }

    const tds = (allTds ?? []) as TdRow[];
    if (tds.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No TDs maturing in reminder windows" }),
        stats: { sent: 0, totalTds: 0 },
      };
    }

    // ── 2. Load existing sends to dedup ─────────────────────────────────────
    const tdIds = tds.map((t) => t.id);
    const { data: existingSends } = await supabase
      .from("td_reminder_sends")
      .select("td_id, days_before")
      .in("td_id", tdIds);

    const sentSet = new Set(
      (existingSends ?? []).map((s) => `${s.td_id}:${s.days_before}`),
    );

    // ── 3. Fetch best current TD rates (top 5 by rate_bps) ──────────────────
    // Order by broker_id + captured_at DESC so we can dedup to latest per broker in JS.
    const { data: snapshotRows } = await supabase
      .from("savings_rate_snapshots")
      .select("broker_id, rate_bps, term_months, brokers(name, slug)")
      .eq("product_kind", "term_deposit")
      .order("broker_id")
      .order("captured_at", { ascending: false })
      .limit(200);

    const seenBroker = new Set<number>();
    const latestPerBroker: BestRateRow[] = [];
    for (const row of snapshotRows ?? []) {
      if (!seenBroker.has(row.broker_id)) {
        seenBroker.add(row.broker_id);
        latestPerBroker.push(row as unknown as BestRateRow);
      }
    }
    const bestRates = latestPerBroker
      .sort((a, b) => b.rate_bps - a.rate_bps)
      .slice(0, 5);

    // ── 4. Collect unique user_ids needing emails ────────────────────────────
    const userIds = [...new Set(tds.map((t) => t.user_id))];
    const { data: userRows } = await supabase
      .from("auth.users")
      .select("id, email")
      .in("id", userIds);

    const emailByUserId = new Map<string, string>();
    for (const u of userRows ?? []) {
      const typed = u as UserRow;
      if (typed.email) emailByUserId.set(typed.id, typed.email);
    }

    // ── 5. Send reminders ────────────────────────────────────────────────────
    let sent = 0;
    let skipped = 0;

    for (const window of targetDates) {
      const windowTds = tds.filter((t) => t.maturity_date === window.iso);
      for (const td of windowTds) {
        const key = `${td.id}:${window.days}`;
        if (sentSet.has(key)) {
          skipped++;
          continue;
        }

        const email = emailByUserId.get(td.user_id);
        if (!email) {
          log.warn("no email for user", { userId: td.user_id, tdId: td.id });
          continue;
        }

        // Prefer rates with similar term length; fall back to overall best.
        const similarRates = bestRates.filter(
          (r) =>
            r.term_months != null &&
            r.term_months >= Math.ceil(td.term_months / 2) &&
            r.term_months <= td.term_months * 2,
        );
        const ratesToShow = similarRates.length >= 3 ? similarRates : bestRates;

        const { subject, html } = buildReminderEmail(td, window.days, ratesToShow);

        const { error: sendErr } = await sendEmail({
          to: email,
          subject,
          html,
          from: "Invest.com.au <reminders@invest.com.au>",
        });

        if (sendErr) {
          log.warn("send failed", { userId: td.user_id, tdId: td.id, daysBefore: window.days });
          continue;
        }

        await supabase
          .from("td_reminder_sends")
          .insert({ td_id: td.id, days_before: window.days })
          .throwOnError();

        sent++;
        sentSet.add(key);
      }
    }

    log.info("done", { sent, skipped, totalTds: tds.length });
    return {
      response: NextResponse.json({ sent, skipped, totalTds: tds.length }),
      stats: { sent, skipped, totalTds: tds.length },
    };
  });
}
