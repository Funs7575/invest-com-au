/**
 * Cron: Seasonal email campaigns — daily at 21:00 UTC (8am AEDT).
 *
 * Dispatches two annual campaigns based on current date:
 *
 *   EOFY countdown  (Jun 23–29 UTC): "X days to 30 June — review your
 *     investment costs before the financial year closes."
 *
 *   New-FY kickstart (Jul 1 UTC): "New Financial Year — a fresh start for
 *     your investment strategy."
 *
 * Both emails are sent once per user per year (UNIQUE constraint on
 * seasonal_email_sends). They target users with weekly_digest enabled
 * (the closest proxy for "interested in investment education").
 *
 * Anniversary emails: handled by the existing annual-mot cron.
 *
 * Schedule: daily-21 (shares the 8am AEDT slot with personalized-morning-brief).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { isFlagEnabled } from "@/lib/feature-flags";
import { wrappedFyForDate } from "@/lib/wrapped";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("seasonal-emails");
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

type CampaignKind = "eofy_countdown" | "new_fy_kickstart" | null;

function detectCampaign(now: Date): { kind: CampaignKind; daysToEofy?: number } {
  const mm = now.getUTCMonth() + 1; // 1-12
  const dd = now.getUTCDate();

  if (mm === 7 && dd === 1) return { kind: "new_fy_kickstart" };

  // EOFY countdown: send when 7, 6, 5, 4, 3, 2, 1 days remain before Jun 30.
  // Jun 23 = 7 days to go ... Jun 29 = 1 day to go.
  if (mm === 6 && dd >= 23 && dd <= 29) {
    return { kind: "eofy_countdown", daysToEofy: 30 - dd };
  }

  return { kind: null };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("seasonal-emails", async () => {
    const now = new Date();
    const { kind, daysToEofy } = detectCampaign(now);

    if (!kind) {
      return {
        response: NextResponse.json({ sent: 0, message: "No seasonal campaign active today" }),
        stats: { sent: 0, errors: 0 },
      };
    }

    const supabase = createAdminClient();
    const year = now.getUTCFullYear();
    const dateStr = now.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // FY Money Wrapped block in the EOFY email — flag-gated, fail-closed
    // (isFlagEnabled returns false when the flag row is absent, so this
    // ships dormant until `fy_wrapped_email` is enabled in the admin UI).
    const includeWrapped =
      kind === "eofy_countdown" && (await isFlagEnabled("fy_wrapped_email"));
    const wrappedFyLabel = wrappedFyForDate(now).label;

    // ── Opted-in users ────────────────────────────────────────────────────────

    const { data: prefUsers, error: prefError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("weekly_digest", true);

    if (prefError) {
      log.error("Failed to fetch prefs", { error: prefError.message });
      return {
        response: NextResponse.json({ error: prefError.message }, { status: 500 }),
        stats: { sent: 0, errors: 1 },
      };
    }

    if (!prefUsers || prefUsers.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No opted-in users" }),
        stats: { sent: 0, errors: 0 },
      };
    }

    const allIds = prefUsers.map((u) => u.user_id as string);

    // ── Dedup: once per year per campaign ─────────────────────────────────────

    const { data: alreadySent } = await supabase
      .from("seasonal_email_sends")
      .select("user_id")
      .eq("email_type", kind)
      .eq("send_year", year);

    const sentSet = new Set((alreadySent ?? []).map((s) => s.user_id as string));
    const pendingIds = allIds.filter((id) => !sentSet.has(id)).slice(0, 100);

    if (pendingIds.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "All users already received this campaign" }),
        stats: { sent: 0, errors: 0 },
      };
    }

    // ── Auth emails ───────────────────────────────────────────────────────────

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    // ── Send loop ─────────────────────────────────────────────────────────────

    let sent = 0;
    let errors = 0;
    const BATCH = 5;

    for (let i = 0; i < pendingIds.length; i += BATCH) {
      const batch = pendingIds.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map(async (userId) => {
          const email = emailMap.get(userId);
          if (!email) return;

          const { subject, html } =
            kind === "eofy_countdown"
              ? buildEofyEmail(email, dateStr, daysToEofy ?? 7, {
                  includeWrapped,
                  wrappedFyLabel,
                })
              : buildNewFyEmail(email, dateStr, year);

          const result = await sendEmail({
            to: email,
            subject,
            html,
            from: "Invest.com.au <seasonal@invest.com.au>",
          });

          if (!result.ok) throw new Error(result.error ?? "send failed");

          await supabase.from("seasonal_email_sends").insert({
            user_id: userId,
            email_type: kind,
            send_year: year,
          });
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled") sent++;
        else {
          errors++;
          log.warn(`${kind} send failed`, {
            error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          });
        }
      }

      if (i + BATCH < pendingIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    log.info("Seasonal emails complete", { kind, year, sent, errors, total: pendingIds.length });

    return {
      response: NextResponse.json({
        kind,
        sent,
        errors,
        total_eligible: pendingIds.length,
        skipped_already_sent: sentSet.size,
        year,
      }),
      stats: { sent, errors },
    };
  });
}

// ─── EOFY email ───────────────────────────────────────────────────────────────

function buildEofyEmail(
  email: string,
  dateStr: string,
  daysToEofy: number,
  wrapped: { includeWrapped: boolean; wrappedFyLabel: string },
): { subject: string; html: string } {
  const urgency =
    daysToEofy <= 1
      ? "Last day!"
      : daysToEofy <= 3
        ? `${daysToEofy} days left`
        : `${daysToEofy} days to go`;

  const subject = `EOFY: ${urgency} — review your investment costs before 30 June`;
  const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

  // Flag-gated FY Money Wrapped block (fy_wrapped_email) — dormant by default.
  const wrappedBlock = wrapped.includeWrapped
    ? `
  <div style="background:white;border:1px solid #ddd6fe;border-radius:12px;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:32px;margin:0 0 6px">🎁</p>
    <h2 style="font-size:17px;font-weight:800;color:#0f172a;margin:0 0 6px">Your ${esc(wrapped.wrappedFyLabel)} Money Wrapped is ready</h2>
    <p style="font-size:13px;color:#475569;margin:0 0 14px">Goals, balances, health score and streaks — your financial year, recapped from your own saved data. See it before the clock resets.</p>
    <a href="${BASE_URL}/wrapped" style="display:inline-block;padding:10px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">Unwrap my year →</a>
  </div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
  <div style="text-align:center;margin-bottom:20px">
    <a href="${BASE_URL}" style="font-size:20px;font-weight:800;color:#0f172a;text-decoration:none">Invest.com.au</a>
    <p style="font-size:12px;color:#94a3b8;margin:4px 0 0">EOFY Reminder &mdash; ${esc(dateStr)}</p>
  </div>

  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:12px;padding:32px;margin-bottom:20px;text-align:center">
    <p style="font-size:40px;margin:0 0 8px">📅</p>
    <h1 style="font-size:24px;font-weight:900;color:white;margin:0 0 8px">${daysToEofy === 1 ? "Last day of the financial year!" : `${daysToEofy} days to 30 June`}</h1>
    <p style="font-size:15px;color:#c4b5fd;margin:0">Review your investment costs before the year closes.</p>
  </div>
${wrappedBlock}
  <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:20px">
    <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 14px">EOFY investment checklist</h2>
    <ul style="padding-left:0;list-style:none;margin:0">
      ${[
        ["💰", "Check brokerage fees — have better-value platforms launched this year?", "/compare"],
        ["📊", "Review your savings rate — are you getting the current best rate?", "/savings"],
        ["🏛️", "SMSF members: ensure contributions are within your annual cap", "/best/smsf-platforms"],
        ["📋", "Check your action plans — any steps you haven't completed yet?", "/account/decisions"],
        ["🔁", "Term deposits maturing? Lock in rates before July rate moves", "/term-deposits"],
      ].map(([emoji, text, href]) => `
      <li style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px">
        <span style="font-size:20px;flex-shrink:0">${emoji}</span>
        <span style="font-size:14px;color:#334155;line-height:1.5">
          ${esc(text as string)}
          <a href="${BASE_URL}${href}" style="display:inline-block;margin-left:6px;font-size:12px;color:#7c3aed;text-decoration:none;font-weight:600">Check →</a>
        </span>
      </li>`).join("")}
    </ul>
  </div>

  <div style="text-align:center;margin-bottom:20px">
    <a href="${BASE_URL}/compare" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">Compare platforms for next FY →</a>
  </div>

  <div style="text-align:center;padding:10px 0">
    <p style="font-size:11px;color:#94a3b8;margin:0 0 6px">General information only — not tax or financial advice. Speak to your accountant for personalised guidance.</p>
    <a href="${unsubUrl}" style="font-size:11px;color:#94a3b8;text-decoration:underline">Unsubscribe</a>
    <span style="color:#cbd5e1;margin:0 6px">&middot;</span>
    <a href="${BASE_URL}/account/alerts" style="font-size:11px;color:#94a3b8;text-decoration:underline">Manage preferences</a>
  </div>
</div>
</body>
</html>`;

  return { subject, html };
}

// ─── New-FY kickstart email ───────────────────────────────────────────────────

function buildNewFyEmail(
  email: string,
  dateStr: string,
  year: number,
): { subject: string; html: string } {
  const subject = `New Financial Year ${year}–${year + 1} — fresh start on your investing strategy`;
  const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
  <div style="text-align:center;margin-bottom:20px">
    <a href="${BASE_URL}" style="font-size:20px;font-weight:800;color:#0f172a;text-decoration:none">Invest.com.au</a>
    <p style="font-size:12px;color:#94a3b8;margin:4px 0 0">New Financial Year &mdash; ${esc(dateStr)}</p>
  </div>

  <div style="background:linear-gradient(135deg,#059669,#0d9488);border-radius:12px;padding:32px;margin-bottom:20px;text-align:center">
    <p style="font-size:40px;margin:0 0 8px">🌱</p>
    <h1 style="font-size:24px;font-weight:900;color:white;margin:0 0 8px">Happy New Financial Year!</h1>
    <p style="font-size:15px;color:#a7f3d0;margin:0">FY${year}–${(year + 1).toString().slice(2)} starts today. Time to set new goals and review your platform stack.</p>
  </div>

  <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:20px">
    <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 14px">Start the new FY right</h2>
    <ul style="padding-left:0;list-style:none;margin:0">
      ${[
        ["🎯", "Set a new goal for FY" + (year + 1) + " — retirement, house deposit, or FIRE", "/account/goals"],
        ["💸", "Lock in today's best savings rates before they move", "/savings"],
        ["📈", "Check if your platform still offers the best value for your portfolio size", "/compare"],
        ["🔄", "Review your action plan — any steps to carry forward from last year?", "/account/plans"],
        ["🧾", "SMSF trustees: new year, new contribution cap cycle", "/best/smsf-platforms"],
      ].map(([emoji, text, href]) => `
      <li style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px">
        <span style="font-size:20px;flex-shrink:0">${emoji}</span>
        <span style="font-size:14px;color:#334155;line-height:1.5">
          ${esc(text as string)}
          <a href="${BASE_URL}${href}" style="display:inline-block;margin-left:6px;font-size:12px;color:#059669;text-decoration:none;font-weight:600">Go →</a>
        </span>
      </li>`).join("")}
    </ul>
  </div>

  <div style="text-align:center;margin-bottom:20px">
    <a href="${BASE_URL}/account/goals" style="display:inline-block;padding:12px 28px;background:#059669;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">Set your FY${year + 1} goals →</a>
  </div>

  <div style="text-align:center;padding:10px 0">
    <p style="font-size:11px;color:#94a3b8;margin:0 0 6px">General information only — not personal financial advice.</p>
    <a href="${unsubUrl}" style="font-size:11px;color:#94a3b8;text-decoration:underline">Unsubscribe</a>
    <span style="color:#cbd5e1;margin:0 6px">&middot;</span>
    <a href="${BASE_URL}/account/alerts" style="font-size:11px;color:#94a3b8;text-decoration:underline">Manage preferences</a>
  </div>
</div>
</body>
</html>`;

  return { subject, html };
}
