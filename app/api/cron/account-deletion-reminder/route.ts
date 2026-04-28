import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/resend";

const log = logger("cron-account-deletion-reminder");

export const runtime = "nodejs";
export const maxDuration = 60;

const GRACE_PERIOD_DAYS = 30;
const REMINDER_WINDOW_DAYS = 5; // warn when purge is ≤5 days away

function reminderHtml(args: {
  email: string;
  scheduledPurgeAt: string;
  cancelUrl: string;
}): { subject: string; html: string } {
  const purgeDate = new Date(args.scheduledPurgeAt).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const daysLeft = Math.ceil(
    (new Date(args.scheduledPurgeAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
  const subject = `Final reminder: your invest.com.au account deletes in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const html = `
<p>Hi,</p>
<p>This is a final reminder that the invest.com.au account associated with <strong>${args.email}</strong> is scheduled for <strong>permanent deletion on ${purgeDate}</strong> — in <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>.</p>
<p style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:4px">
  <strong>After ${purgeDate}, all your data will be permanently erased and cannot be recovered.</strong>
</p>
<p><strong>Changed your mind?</strong> You can still cancel this request — simply <a href="${args.cancelUrl}">visit your account settings</a> before the deadline. Once cancelled, your account and data are fully restored.</p>
<p>If you don't want to cancel, no action is needed. Your data will be deleted automatically on the scheduled date.</p>
<p>If you didn't request this deletion, please <a href="${args.cancelUrl}">cancel immediately</a> and contact our support team — your account may be compromised.</p>
<p style="font-size:12px;color:#64748b;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
  You received this because you (or someone with access to your account) requested account deletion ${GRACE_PERIOD_DAYS} days ago.<br>
  Compliance: APP 11 (security and destruction of personal info) and GDPR Article 17 (right to erasure).
</p>
  `.trim();
  return { subject, html };
}

/**
 * Cron: day-25 account-deletion grace-period reminder.
 *
 * Audit K-07b (2026-04-26 §7 SEC-07). Fires daily. Scans
 * `account_deletion_requests` for rows where:
 *   - status = 'scheduled'
 *   - scheduled_purge_at ≤ NOW() + 5 days  (within the final window)
 *   - reminder_sent_at IS NULL              (not yet reminded — idempotent)
 *
 * For each such row, sends a final-warning email to the user and stamps
 * reminder_sent_at so subsequent daily fires skip the row.
 *
 * Forward-compatible: the `account_deletion_requests` table is defined
 * in migration `20260427_wave_security_observability.sql` but has not
 * been applied to the live DB yet (Blocked entry A-MISSING-TABLE-1).
 * If the table is absent, the query throws a Postgres "relation does not
 * exist" error which we catch, log as warn (not error), and return
 * ok=true so the cron-run-log doesn't flag a false failure.
 *
 * The `reminder_sent_at` column is added by migration
 * `20260523_account_deletion_requests_reminder.sql` which must be
 * applied alongside the parent table migration.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";
  const cancelUrl = `${siteUrl}/account/privacy`;

  // All rows that are: scheduled + not yet reminded + purge in ≤5 days.
  const windowCutoff = new Date(
    Date.now() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: pending, error } = await supabase
    .from("account_deletion_requests")
    .select("id, email, scheduled_purge_at")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .lte("scheduled_purge_at", windowCutoff)
    .order("scheduled_purge_at", { ascending: true })
    .limit(200);

  if (error) {
    // Forward-compatible: table may not exist in live yet.
    if (
      error.message?.includes("does not exist") ||
      error.code === "42P01"
    ) {
      log.warn(
        "account_deletion_requests table not yet migrated — skipping reminder cron",
        { hint: "Apply 20260427_wave_security_observability.sql to unblock." },
      );
      return NextResponse.json({ ok: true, skipped: "table_not_migrated", sent: 0 });
    }
    log.error("Failed to query account_deletion_requests", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = pending ?? [];
  if (rows.length === 0) {
    log.info("No pending deletion reminders to send");
    return NextResponse.json({ ok: true, sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const { subject, html } = reminderHtml({
      email: row.email,
      scheduledPurgeAt: row.scheduled_purge_at,
      cancelUrl,
    });

    const result = await sendEmail({ to: row.email, subject, html });

    if (!result.ok) {
      log.warn("Failed to send deletion reminder", {
        id: row.id,
        email: row.email,
        error: result.error,
      });
      failed++;
      continue;
    }

    // Stamp reminder_sent_at only after a successful send so a transient
    // Resend failure retries on the next daily run (up to the purge date).
    const { error: updateErr } = await supabase
      .from("account_deletion_requests")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("reminder_sent_at", null); // guard against concurrent run (IS NULL, not = null)

    if (updateErr) {
      log.warn("Failed to stamp reminder_sent_at", {
        id: row.id,
        error: updateErr.message,
      });
    }

    log.info("Deletion reminder sent", { id: row.id, email: row.email });
    sent++;
  }

  return NextResponse.json({ ok: failed === 0, sent, failed, total: rows.length });
}

export const GET = wrapCronHandler("account-deletion-reminder", handler);
