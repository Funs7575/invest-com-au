import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/resend";

const log = logger("cron-data-export-monitor");

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cron: data-export-request stale-pending monitor.
 *
 * Audit K-06a (2026-04-26 §7 SEC-06). `/api/account/export-data`
 * inserts a row into `data_export_requests` with status='pending'
 * and tells the user "you'll receive a download link within 30
 * days" (Australian Privacy Principle 12 / GDPR Article 15
 * obligation). The actual export-processing path
 * (`/api/cron/process-data-exports`) doesn't exist yet — every
 * pending request silently sits in the table until the founder
 * processes it manually.
 *
 * This cron is the safety net: it fires daily, scans pending
 * requests, and emails the founder when any have aged past the
 * tolerance buckets so a missed request never quietly burns the
 * 30-day legal window.
 *
 * Buckets:
 *   - 7+ days old   → reminder email (manual processing needed)
 *   - 25+ days old  → urgent email (deadline in <5 days)
 *
 * The full processor (K-06b — generate JSON archive, sign URL,
 * email user) is tracked separately. Until it ships, this cron
 * ensures legal compliance via founder oversight.
 *
 * Once K-06b lands, this monitor still has value: it surfaces any
 * stalled requests where the processor itself failed.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twentyFiveDaysAgo = new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString();

  // Pull all pending requests older than 7 days. Small table; full scan is fine.
  const { data: stale, error } = await supabase
    .from("data_export_requests")
    .select("id, user_id, email, requested_at")
    .eq("status", "pending")
    .lte("requested_at", sevenDaysAgo)
    .order("requested_at", { ascending: true });

  if (error) {
    log.error("Failed to query stale data_export_requests", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = stale ?? [];
  if (rows.length === 0) {
    log.info("No stale pending data export requests");
    return NextResponse.json({ ok: true, stale_count: 0, urgent_count: 0 });
  }

  // Split by urgency. Urgent = 25+ days old (legal deadline at 30).
  const urgent = rows.filter((r) => r.requested_at <= twentyFiveDaysAgo);
  const reminder = rows.filter((r) => r.requested_at > twentyFiveDaysAgo);

  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.ADMIN_EMAIL ||
    (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim();

  if (!adminEmail) {
    log.warn(
      "No ADMIN_NOTIFICATION_EMAIL / ADMIN_EMAIL / ADMIN_EMAILS configured — cannot send alert",
      { stale_count: rows.length, urgent_count: urgent.length },
    );
    return NextResponse.json({
      ok: false,
      error: "No admin email configured",
      stale_count: rows.length,
      urgent_count: urgent.length,
    });
  }

  const formatRow = (r: { id: string; email: string; requested_at: string }) => {
    const ageDays = Math.floor(
      (now - new Date(r.requested_at).getTime()) / (24 * 60 * 60 * 1000),
    );
    return `<li><code>${r.id}</code> · ${r.email} · requested ${ageDays}d ago (${r.requested_at})</li>`;
  };

  const subject =
    urgent.length > 0
      ? `[URGENT] ${urgent.length} GDPR/APP12 export request(s) approaching 30-day deadline`
      : `${reminder.length} pending data export request(s) need processing`;

  const html = `
<p>Heads-up: there are pending data export requests that need to be processed.</p>

${
  urgent.length > 0
    ? `
<h3 style="color:#b91c1c">⚠️ Urgent — ${urgent.length} request(s) within 5 days of the 30-day legal deadline</h3>
<ul>${urgent.map(formatRow).join("")}</ul>
<p><strong>Action required within 5 days</strong> to avoid OAIC notifiable-breach exposure (APP 12) / GDPR Art. 15 violation.</p>
`
    : ""
}

${
  reminder.length > 0
    ? `
<h3>Reminder — ${reminder.length} request(s) older than 7 days</h3>
<ul>${reminder.map(formatRow).join("")}</ul>
`
    : ""
}

<p>To process: open the admin console (<a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au"}/admin/privacy">/admin/privacy</a>) or run the manual export script. The automated processor is tracked as queue item K-06b.</p>

<p style="font-size:12px;color:#64748b">— Data export monitor cron · daily</p>
  `.trim();

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
  });

  if (!result.ok) {
    log.error("Failed to send admin alert", { error: result.error });
    return NextResponse.json({
      ok: false,
      error: result.error,
      stale_count: rows.length,
      urgent_count: urgent.length,
    });
  }

  log.info("Sent stale-export alert", {
    to: adminEmail,
    stale_count: rows.length,
    urgent_count: urgent.length,
  });

  return NextResponse.json({
    ok: true,
    stale_count: rows.length,
    urgent_count: urgent.length,
    alert_sent_to: adminEmail,
  });
}

export const GET = wrapCronHandler("data-export-monitor", handler);
