/**
 * Cron: office-hours-reminders — daily at 09:00 UTC (daily-9).
 *
 * For each advisor office hours session starting tomorrow:
 *   1. Find all users who RSVP'd.
 *   2. Skip any already emailed for this session.
 *   3. Send a reminder email with session details.
 *
 * Dedup: a simple sent-check against a `*_sent_at`-equivalent pattern —
 * we filter by `sent_at IS NULL` from an in-memory set of already-sent
 * session IDs (small enough at this scale; no separate log table needed
 * because RSVP rows exist exactly once per user/session and we add
 * `reminded_at` to office_hour_rsvps via a service-role UPDATE after send).
 *
 * Compliance: general information only. Sessions cover general financial
 * topics — not personal advice.
 */

import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "@/lib/html-escape";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { logger } from "@/lib/logger";

const log = logger("cron:office-hours-reminders");

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://invest.com.au";


interface Session {
  id: number;
  title: string;
  description: string | null;
  scheduled_at: string;
  professionals: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

interface RsvpRow {
  user_id: string;
  session_id: number;
  reminded_at: string | null;
}

interface UserRow {
  id: string;
  email: string;
}

function resolveAdvisor(
  pros: Session["professionals"],
): { name: string; slug: string } | null {
  if (!pros) return null;
  return Array.isArray(pros) ? (pros[0] ?? null) : pros;
}

function buildReminderEmail(
  session: Session,
  advisorName: string,
  _advisorSlug: string,
): { subject: string; html: string } {
  const scheduled = new Date(session.scheduled_at).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
    timeZoneName: "short",
  });

  const subject = `Reminder: ${session.title} — live Q&A tomorrow`;
  const sessionUrl = `${BASE_URL}/questions`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

  <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 32px;">
    <p style="margin:0;font-size:12px;font-weight:600;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.08em;">Office Hours Reminder</p>
    <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#fff;">Your session is tomorrow</h1>
  </td></tr>

  <tr><td style="padding:28px 32px;">
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e293b;">${escapeHtml(session.title)}</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;">With <strong>${escapeHtml(advisorName)}</strong></p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tr>
        <td style="padding:12px 16px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">When</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e293b;">${escapeHtml(scheduled)}</p>
        </td>
      </tr>
    </table>

    ${session.description ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6;">${escapeHtml(session.description)}</p>` : ""}

    <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6;">
      Submit your questions in advance on the session page, or join live tomorrow to ask and upvote questions in real-time.
    </p>

    <p style="margin:20px 0 0;">
      <a href="${sessionUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">View session →</a>
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
      General information only — not personal financial advice. You received this because you RSVP'd to this session.
      <a href="${BASE_URL}/account/notifications" style="color:#4f46e5;">Manage notifications</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;

  return { subject, html };
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("office-hours-reminders", async () => {
    const supabase = createAdminClient();

    const tomorrowStart = new Date();
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    tomorrowStart.setUTCHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setUTCHours(23, 59, 59, 999);

    // ── 1. Sessions starting tomorrow ────────────────────────────────────────
    const { data: sessionRows, error: sessErr } = await supabase
      .from("advisor_office_hours")
      .select("id, title, description, scheduled_at, professionals(name, slug)")
      .eq("is_published", true)
      .in("status", ["upcoming", "live"])
      .gte("scheduled_at", tomorrowStart.toISOString())
      .lte("scheduled_at", tomorrowEnd.toISOString())
      .limit(20);

    if (sessErr) {
      log.error("failed to fetch sessions", { error: sessErr.message });
      return {
        response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }),
        stats: { sent: 0 },
      };
    }

    const sessions = (sessionRows ?? []) as Session[];
    if (sessions.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No sessions starting tomorrow" }),
        stats: { sent: 0 },
      };
    }

    // ── 2. Load RSVPs (not yet reminded) ─────────────────────────────────────
    const sessionIds = sessions.map((s) => s.id);

    const { data: rsvpRows } = await supabase
      .from("office_hour_rsvps")
      .select("user_id, session_id, reminded_at")
      .in("session_id", sessionIds)
      .is("reminded_at", null)
      .limit(500);

    const rsvps = (rsvpRows ?? []) as RsvpRow[];
    if (rsvps.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "All RSVPs already reminded" }),
        stats: { sent: 0 },
      };
    }

    // ── 3. Fetch user emails ──────────────────────────────────────────────────
    const userIds = [...new Set(rsvps.map((r) => r.user_id))];
    const { data: userRows } = await supabase
      .from("auth.users")
      .select("id, email")
      .in("id", userIds);

    const emailByUserId = new Map<string, string>();
    for (const u of (userRows ?? []) as UserRow[]) {
      if (u.email) emailByUserId.set(u.id, u.email);
    }

    const sessionById = new Map(sessions.map((s) => [s.id, s]));

    // ── 4. Send reminders ─────────────────────────────────────────────────────
    let sent = 0;
    let skipped = 0;

    for (const rsvp of rsvps) {
      const session = sessionById.get(rsvp.session_id);
      if (!session) { skipped++; continue; }

      const email = emailByUserId.get(rsvp.user_id);
      if (!email) { skipped++; continue; }

      const advisor = resolveAdvisor(session.professionals);
      if (!advisor) { skipped++; continue; }

      const { subject, html } = buildReminderEmail(session, advisor.name, advisor.slug);

      const { error: sendErr } = await sendEmail({
        to: email,
        subject,
        html,
        from: "Invest.com.au <reminders@invest.com.au>",
      });

      if (sendErr) {
        log.warn("send failed", { userId: rsvp.user_id, sessionId: rsvp.session_id });
        continue;
      }

      // Mark reminded
      await supabase
        .from("office_hour_rsvps")
        .update({ reminded_at: new Date().toISOString() })
        .eq("session_id", rsvp.session_id)
        .eq("user_id", rsvp.user_id);

      sent++;
    }

    log.info("done", { sent, skipped, totalRsvps: rsvps.length });
    return {
      response: NextResponse.json({ sent, skipped }),
      stats: { sent, skipped },
    };
  });
}
