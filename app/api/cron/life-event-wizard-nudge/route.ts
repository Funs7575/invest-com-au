/**
 * Cron: life-event-wizard-nudge — weekly on Monday at 09:00 UTC (weekly-mon-9).
 *
 * For each user with an in-progress life event wizard (completed > 0 but
 * not all steps done) that hasn't been updated in the last 7 days:
 *   1. Skip if already nudged this week (tracked via updated_at sentinel).
 *   2. Send a re-engagement email with progress summary and a deep link.
 *
 * Capped at 200 per run. Dedup: we only nudge wizards where
 * updated_at < 7 days ago (user hasn't touched them recently).
 *
 * Compliance: general information only.
 */

import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "@/lib/html-escape";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { logger } from "@/lib/logger";
import { LIFE_EVENTS } from "@/lib/life-events";
import { getChecklist, getCompletedCount } from "@/lib/life-event-checklist";

const log = logger("cron:life-event-wizard-nudge");

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://invest.com.au";


interface WizardRow {
  user_id: string;
  life_event_id: string;
  step: number;
  form_data: { completed?: string[]; [key: string]: unknown };
  updated_at: string;
}

interface UserRow {
  id: string;
  email: string;
}

const eventById = new Map(LIFE_EVENTS.map((e) => [e.id, e]));

function buildNudgeEmail(
  rows: WizardRow[],
): { subject: string; html: string } {
  const subject =
    rows.length === 1
      ? `Your ${eventById.get(rows[0]!.life_event_id)?.title ?? "life event"} checklist is waiting`
      : `You have ${rows.length} in-progress life event checklists`;

  const itemRows = rows
    .slice(0, 5)
    .map((row) => {
      const event = eventById.get(row.life_event_id);
      if (!event) return "";
      const total = getChecklist(event.id).length;
      const done = getCompletedCount(event.id, row.form_data);
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const url = `${BASE_URL}/account/life-events/${event.id}`;
      return `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">
            <span style="font-size:18px;margin-right:8px;">${event.emoji}</span>
            <a href="${url}" style="font-size:14px;font-weight:600;color:#4f46e5;text-decoration:none;">${escapeHtml(event.title)}</a>
            <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${done} of ${total} steps · ${pct}% complete</p>
          </td>
          <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:middle;">
            <a href="${url}" style="font-size:12px;font-weight:600;color:#4f46e5;text-decoration:none;">Continue →</a>
          </td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

  <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 32px;">
    <p style="margin:0;font-size:12px;font-weight:600;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.08em;">Life Event Checklists</p>
    <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#fff;">Your checklists are waiting</h1>
  </td></tr>

  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
      You&apos;ve started ${rows.length > 1 ? "some" : "a"} life event checklist${rows.length > 1 ? "s" : ""} on Invest.com.au. Pick up where you left off — each completed step keeps your finances on track.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tbody>${itemRows}</tbody>
    </table>

    <p style="margin:20px 0 0;">
      <a href="${BASE_URL}/account/life-events" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">View all checklists →</a>
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
      General information only — not personal financial advice. These are prompts to help you organise your own circumstances.
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

  return withCronRunLog<NextResponse>("life-event-wizard-nudge", async () => {
    const supabase = createAdminClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    // ── 1. Find stale in-progress wizards ────────────────────────────────────
    const { data: rows, error: rowsErr } = await supabase
      .from("life_event_wizard_state")
      .select("user_id, life_event_id, step, form_data, updated_at")
      .lt("updated_at", sevenDaysAgo)
      .gt("step", 0)
      .limit(500);

    if (rowsErr) {
      log.error("failed to fetch wizard states", { error: rowsErr.message });
      return {
        response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }),
        stats: { sent: 0 },
      };
    }

    const allRows = (rows ?? []) as WizardRow[];

    // Filter to rows where there's actually partial progress (step > 0 but not all done)
    const staleRows = allRows.filter((row) => {
      const steps = getChecklist(row.life_event_id);
      if (steps.length === 0) return false;
      const done = getCompletedCount(row.life_event_id, row.form_data);
      return done > 0 && done < steps.length;
    });

    if (staleRows.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No stale in-progress wizards" }),
        stats: { sent: 0 },
      };
    }

    // ── 2. Group by user_id ───────────────────────────────────────────────────
    const byUser = new Map<string, WizardRow[]>();
    for (const row of staleRows) {
      const arr = byUser.get(row.user_id) ?? [];
      arr.push(row);
      byUser.set(row.user_id, arr);
    }

    // ── 3. Fetch emails ───────────────────────────────────────────────────────
    const userIds = [...byUser.keys()];
    const { data: userRows } = await supabase
      .from("auth.users")
      .select("id, email")
      .in("id", userIds);

    const emailByUserId = new Map<string, string>();
    for (const u of (userRows ?? []) as UserRow[]) {
      if (u.email) emailByUserId.set(u.id, u.email);
    }

    // ── 4. Send nudges ────────────────────────────────────────────────────────
    let sent = 0;
    let skipped = 0;
    const CAP = 200;

    for (const [userId, userRows2] of byUser) {
      if (sent >= CAP) break;

      const email = emailByUserId.get(userId);
      if (!email) { skipped++; continue; }

      const { subject, html } = buildNudgeEmail(userRows2);

      const { error: sendErr } = await sendEmail({
        to: email,
        subject,
        html,
        from: "Invest.com.au <reminders@invest.com.au>",
      });

      if (sendErr) {
        log.warn("send failed", { userId });
        continue;
      }

      sent++;
    }

    log.info("done", { sent, skipped, staleUsers: byUser.size });
    return {
      response: NextResponse.json({ sent, skipped }),
      stats: { sent, skipped },
    };
  });
}
