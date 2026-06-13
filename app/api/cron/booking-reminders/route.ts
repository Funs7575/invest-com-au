/**
 * Cron: booking reminders (booking-v2). Runs hourly (registered in the
 * `hourly-0` dispatch group). Sends a 24h-before and a 1h-before reminder for
 * confirmed first-party bookings.
 *
 * Idempotency: each window stamps reminder_24h_sent_at / reminder_1h_sent_at,
 * so a re-run inside the same window is a no-op.
 *
 * Double-gated:
 *   1. booking_v2 feature flag (fail-closed) — if off, the cron no-ops.
 *   2. email suppression — suppressed recipients are skipped (sendEmail also
 *      enforces this, but we check first to avoid wasted work + keep the count
 *      honest). Reminders are transactional but we still honour hard
 *      suppression here (bounces/complaints) by not bypassing it.
 *
 * Push: a best-effort web-push nudge is sent IF the consumer email maps to an
 * auth user with browser_push enabled (most booking consumers are anonymous /
 * email-only, in which case push is simply skipped — email always goes).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";
import { isSuppressed } from "@/lib/email-suppression";
import { dispatchPushToUser } from "@/lib/push-dispatch";
import { buildEmailToUserIdMap } from "@/lib/notifications";
import { isBookingV2Enabled, DEFAULT_BOOKING_TZ } from "@/lib/booking-v2";
import { formatBookingForHumans } from "@/lib/booking-v2/time";
import type { AdvisorBookingRow } from "@/lib/booking-v2/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("cron-booking-reminders");

const FROM = "Invest.com.au <hello@invest.com.au>";

type Window = "24h" | "1h";

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  // Fail-closed flag gate (global — no per-advisor key at the cron level).
  if (!(await isBookingV2Enabled())) {
    return NextResponse.json({ ok: true, skipped: "flag_off" });
  }

  const admin = createAdminClient();
  const now = Date.now();

  let sent24 = 0;
  let sent1 = 0;
  let skipped = 0;
  let pushed = 0;

  // ── 24h window: bookings starting in ~23–25h, not yet 24h-reminded ──
  const due24 = await fetchDue(admin, {
    lowerMs: now + 23 * 3_600_000,
    upperMs: now + 25 * 3_600_000,
    column: "reminder_24h_sent_at",
  });
  // ── 1h window: bookings starting in ~0.5–1.5h, not yet 1h-reminded ──
  const due1 = await fetchDue(admin, {
    lowerMs: now + 30 * 60_000,
    upperMs: now + 90 * 60_000,
    column: "reminder_1h_sent_at",
  });

  // Resolve consumer emails → user ids once for push targeting. Only build the
  // map if there's actually work to do (it pages the full auth user list).
  const emailToUserId =
    due24.length + due1.length > 0
      ? await buildEmailToUserIdMap()
      : new Map<string, string>();

  for (const booking of due24) {
    const ok = await sendReminder(admin, booking, "24h", emailToUserId);
    if (ok.emailSent) sent24++;
    else skipped++;
    if (ok.pushed) pushed++;
  }
  for (const booking of due1) {
    const ok = await sendReminder(admin, booking, "1h", emailToUserId);
    if (ok.emailSent) sent1++;
    else skipped++;
    if (ok.pushed) pushed++;
  }

  log.info("booking reminders processed", {
    sent24,
    sent1,
    skipped,
    pushed,
    scanned24: due24.length,
    scanned1: due1.length,
  });
  return NextResponse.json({ sent24, sent1, skipped, pushed });
}

async function fetchDue(
  admin: ReturnType<typeof createAdminClient>,
  opts: { lowerMs: number; upperMs: number; column: "reminder_24h_sent_at" | "reminder_1h_sent_at" },
): Promise<AdvisorBookingRow[]> {
  const { data, error } = await admin
    .from("advisor_bookings")
    .select("*")
    .eq("status", "confirmed")
    .not("starts_at_utc", "is", null)
    .is(opts.column, null)
    .gte("starts_at_utc", new Date(opts.lowerMs).toISOString())
    .lte("starts_at_utc", new Date(opts.upperMs).toISOString())
    .limit(200);
  if (error) {
    log.error("fetchDue failed", { column: opts.column, err: error.message });
    return [];
  }
  return (data as AdvisorBookingRow[] | null) ?? [];
}

async function sendReminder(
  admin: ReturnType<typeof createAdminClient>,
  booking: AdvisorBookingRow,
  window: Window,
  emailToUserId: Map<string, string>,
): Promise<{ emailSent: boolean; pushed: boolean }> {
  const column =
    window === "24h" ? "reminder_24h_sent_at" : "reminder_1h_sent_at";

  // Stamp FIRST (claim the work) so a concurrent/overlapping run can't double-send.
  // The .is(column, null) guard makes the update a compare-and-set.
  const { data: claimed, error: claimErr } = await admin
    .from("advisor_bookings")
    .update({ [column]: new Date().toISOString() })
    .eq("id", booking.id)
    .is(column, null)
    .select("id")
    .maybeSingle();
  if (claimErr || !claimed) {
    // Someone else claimed it (or DB error) — skip without sending.
    return { emailSent: false, pushed: false };
  }

  if (await isSuppressed(booking.investor_email)) {
    return { emailSent: false, pushed: false };
  }

  const tz = booking.booking_tz ?? DEFAULT_BOOKING_TZ;
  const startUtc = booking.starts_at_utc
    ? new Date(booking.starts_at_utc)
    : null;
  if (!startUtc) return { emailSent: false, pushed: false };
  const when = formatBookingForHumans(startUtc, tz);

  const { data: pro } = await admin
    .from("professionals")
    .select("name")
    .eq("id", booking.professional_id)
    .maybeSingle();
  const advisorName = (pro?.name as string) ?? "your adviser";

  const site = getSiteUrl();
  const manageUrl = booking.reschedule_token
    ? `${site}/booking/${booking.reschedule_token}/manage`
    : `${site}/advisor`;

  const lead = window === "24h" ? "tomorrow" : "in about an hour";
  const subject =
    window === "24h"
      ? `Reminder: your consultation with ${advisorName} is tomorrow`
      : `Starting soon: your consultation with ${advisorName}`;
  const html =
    `<p>This is a reminder that your consultation with <strong>${escapeHtml(advisorName)}</strong> is ${lead}:</p>` +
    `<p style="font-size:16px"><strong>${escapeHtml(when)}</strong></p>` +
    `<p><a href="${manageUrl}">Reschedule or cancel →</a></p>` +
    `<p style="font-size:12px;color:#94a3b8">Booked through <a href="${site}">Invest.com.au</a></p>`;

  // Reminders are transactional but we still honour hard suppression (checked
  // above); do NOT bypass here.
  const result = await sendEmail({
    to: booking.investor_email,
    from: FROM,
    subject,
    html,
  });

  // Best-effort push if the consumer is a known auth user.
  let pushed = false;
  const userId = emailToUserId.get(booking.investor_email.toLowerCase());
  if (userId) {
    try {
      const r = await dispatchPushToUser(userId, {
        title:
          window === "24h" ? "Consultation tomorrow" : "Consultation starting soon",
        body: `${advisorName} — ${when}`,
        url: manageUrl,
        tag: `booking-${booking.id}-${window}`,
      });
      pushed = r.sent > 0;
    } catch {
      /* non-fatal */
    }
  }

  return { emailSent: result.ok, pushed };
}
