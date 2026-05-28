/**
 * Cron: ipo-alerts — daily at 07:00 UTC (daily-7).
 *
 * For each IPO transitioning into a relevant status today:
 *   - offer_open_date  = today  → alert_type 'open'
 *   - offer_close_date = today  → alert_type 'close'
 *   - listing_date     = today  → alert_type 'listing'
 *   - prospectus_url set, offer_open_date = tomorrow → alert_type 'prospectus'
 *     (heads-up that application window opens tomorrow)
 *
 * For each qualifying (ipo_id, alert_type) pair:
 *   1. Find all ipo_watchlist rows for that pair.
 *   2. Skip any user_id already in ipo_alert_sends for that triplet.
 *   3. Send email and record in ipo_alert_sends.
 *
 * Capped at 500 sends per run (reruns handle overflow).
 * Dedup: UNIQUE(user_id, ipo_id, alert_type) in ipo_alert_sends.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { logger } from "@/lib/logger";

const log = logger("cron:ipo-alerts");

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://invest.com.au";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface IpoOffer {
  id: number;
  asx_code: string | null;
  company_name: string;
  sector: string | null;
  offer_open_date: string | null;
  offer_close_date: string | null;
  listing_date: string | null;
  prospectus_url: string | null;
  issue_price_cents: number | null;
  amount_raised_cents: number | null;
}

interface WatchlistRow {
  user_id: string;
  ipo_id: number;
  alert_type: string;
}

interface UserRow {
  id: string;
  email: string;
}

function fmtPrice(cents: number | null): string {
  if (!cents) return "TBC";
  return "$" + (cents / 100).toFixed(2);
}

function fmtRaise(cents: number | null): string {
  if (!cents) return "TBC";
  const m = cents / 100 / 1_000_000;
  return m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : `$${m.toFixed(0)}M`;
}

function buildAlertEmail(
  ipo: IpoOffer,
  alertType: string,
): { subject: string; html: string } {
  const codePart = ipo.asx_code ? ` (${ipo.asx_code})` : "";
  const company = escapeHtml(ipo.company_name);

  const ALERT_COPY: Record<string, { subject: string; heading: string; body: string }> = {
    open: {
      subject: `Applications open today: ${ipo.company_name}${codePart} IPO`,
      heading: "Applications are open",
      body: `The offer for <strong>${company}${codePart}</strong> is now open for applications. Apply before the offer closes — allocations are limited.`,
    },
    close: {
      subject: `Last day to apply: ${ipo.company_name}${codePart} IPO closes today`,
      heading: "Offer closes today",
      body: `Today is the last day to apply for the <strong>${company}${codePart}</strong> IPO. Applications must be received before the offer closes tonight.`,
    },
    listing: {
      subject: `${ipo.company_name}${codePart} lists on the ASX today`,
      heading: "Lists on ASX today",
      body: `<strong>${company}${codePart}</strong> lists on the Australian Securities Exchange today. First-day trading will be under code <strong>${escapeHtml(ipo.asx_code ?? "TBC")}</strong>.`,
    },
    prospectus: {
      subject: `Applications open tomorrow: ${ipo.company_name}${codePart} IPO`,
      heading: "Applications open tomorrow",
      body: `The <strong>${company}${codePart}</strong> IPO opens for applications <strong>tomorrow</strong>. Review the prospectus and prepare your application form today.`,
    },
  };

  const copy = ALERT_COPY[alertType] ?? ALERT_COPY["open"]!;

  const detailRows = [
    ipo.issue_price_cents !== null ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Issue price</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;font-size:14px;">${fmtPrice(ipo.issue_price_cents)}</td></tr>` : "",
    ipo.amount_raised_cents !== null ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">Raise target</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;font-size:14px;">${fmtRaise(ipo.amount_raised_cents)}</td></tr>` : "",
    ipo.sector ? `<tr><td style="padding:8px 12px;color:#64748b;font-size:13px;">Sector</td><td style="padding:8px 12px;font-weight:600;color:#1e293b;font-size:14px;">${escapeHtml(ipo.sector)}</td></tr>` : "",
  ].filter(Boolean).join("");

  const prospectusLink = ipo.prospectus_url
    ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(ipo.prospectus_url)}" style="color:#4f46e5;font-size:14px;">Read the prospectus →</a></p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

  <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 32px;">
    <p style="margin:0;font-size:12px;font-weight:600;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.08em;">IPO Alert</p>
    <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#fff;">${escapeHtml(copy.heading)}</h1>
  </td></tr>

  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">${copy.body}</p>

    ${detailRows ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;"><tbody>${detailRows}</tbody></table>` : ""}

    ${prospectusLink}

    <p style="margin:20px 0 0;">
      <a href="${BASE_URL}/invest/ipo-calendar" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">View IPO calendar →</a>
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
      General information only — not personal financial advice. IPO allocations are not guaranteed.
      Always read the prospectus and consider your own circumstances before investing.
      <a href="${BASE_URL}/account/notifications" style="color:#4f46e5;">Manage alerts</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;

  return { subject: copy.subject, html };
}

// ── Alert trigger logic ───────────────────────────────────────────────────────

function getTriggeredAlerts(ipo: IpoOffer, today: string, tomorrow: string): string[] {
  const alerts: string[] = [];
  if (ipo.offer_open_date === today) alerts.push("open");
  if (ipo.offer_close_date === today) alerts.push("close");
  if (ipo.listing_date === today) alerts.push("listing");
  if (ipo.offer_open_date === tomorrow && ipo.prospectus_url) alerts.push("prospectus");
  return alerts;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("ipo-alerts", async () => {
    const supabase = createAdminClient();
    const todayDate = new Date();
    const today = todayDate.toISOString().slice(0, 10);
    const tomorrowDate = new Date(Date.now() + 86_400_000);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);

    // ── 1. Fetch published IPOs that may trigger today ──────────────────────
    const { data: ipoRows, error: ipoErr } = await supabase
      .from("ipo_offers")
      .select(
        "id, asx_code, company_name, sector, offer_open_date, offer_close_date, listing_date, prospectus_url, issue_price_cents, amount_raised_cents",
      )
      .eq("is_published", true)
      .in("status", ["upcoming", "open"])
      .or(
        `offer_open_date.eq.${today},offer_close_date.eq.${today},listing_date.eq.${today},offer_open_date.eq.${tomorrow}`,
      )
      .limit(100);

    if (ipoErr) {
      log.error("failed to fetch IPOs", { error: ipoErr.message });
      return {
        response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }),
        stats: { sent: 0 },
      };
    }

    const ipos = (ipoRows ?? []) as IpoOffer[];
    if (ipos.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No IPO alerts to send today" }),
        stats: { sent: 0 },
      };
    }

    // ── 2. Build (ipo_id, alert_type) pairs that trigger today ──────────────
    const triggeredPairs: { ipo: IpoOffer; alertType: string }[] = [];
    for (const ipo of ipos) {
      for (const alertType of getTriggeredAlerts(ipo, today, tomorrow)) {
        triggeredPairs.push({ ipo, alertType });
      }
    }

    if (triggeredPairs.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No alert triggers matched today" }),
        stats: { sent: 0 },
      };
    }

    // ── 3. Load watchlist subscribers for those pairs ────────────────────────
    const ipoIds = [...new Set(triggeredPairs.map((p) => p.ipo.id))];
    const alertTypes = [...new Set(triggeredPairs.map((p) => p.alertType))];

    const { data: watchlistRows } = await supabase
      .from("ipo_watchlist")
      .select("user_id, ipo_id, alert_type")
      .in("ipo_id", ipoIds)
      .in("alert_type", alertTypes)
      .limit(1000);

    if (!watchlistRows || watchlistRows.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No subscribers for triggered IPOs" }),
        stats: { sent: 0 },
      };
    }

    const subscribers = watchlistRows as WatchlistRow[];

    // ── 4. Load existing sends to dedup ──────────────────────────────────────
    const userIds = [...new Set(subscribers.map((s) => s.user_id))];

    const { data: existingSends } = await supabase
      .from("ipo_alert_sends")
      .select("user_id, ipo_id, alert_type")
      .in("user_id", userIds)
      .in("ipo_id", ipoIds);

    const sentSet = new Set(
      (existingSends ?? []).map((s: { user_id: string; ipo_id: number; alert_type: string }) =>
        `${s.user_id}:${s.ipo_id}:${s.alert_type}`,
      ),
    );

    // ── 5. Fetch user emails ──────────────────────────────────────────────────
    const { data: userRows } = await supabase
      .from("auth.users")
      .select("id, email")
      .in("id", userIds);

    const emailByUserId = new Map<string, string>();
    for (const u of (userRows ?? []) as UserRow[]) {
      if (u.email) emailByUserId.set(u.id, u.email);
    }

    // ── 6. Send alerts ────────────────────────────────────────────────────────
    let sent = 0;
    let skipped = 0;
    const CAP = 500;

    const ipoById = new Map(ipos.map((i) => [i.id, i]));

    for (const { ipo, alertType } of triggeredPairs) {
      const ipoSubscribers = subscribers.filter(
        (s) => s.ipo_id === ipo.id && s.alert_type === alertType,
      );

      for (const sub of ipoSubscribers) {
        if (sent >= CAP) break;

        const key = `${sub.user_id}:${ipo.id}:${alertType}`;
        if (sentSet.has(key)) {
          skipped++;
          continue;
        }

        const email = emailByUserId.get(sub.user_id);
        if (!email) {
          log.warn("no email for user", { userId: sub.user_id, ipoId: ipo.id });
          continue;
        }

        const ipoData = ipoById.get(ipo.id);
        if (!ipoData) continue;

        const { subject, html } = buildAlertEmail(ipoData, alertType);

        const { error: sendErr } = await sendEmail({
          to: email,
          subject,
          html,
          from: "Invest.com.au <alerts@invest.com.au>",
        });

        if (sendErr) {
          log.warn("send failed", { userId: sub.user_id, ipoId: ipo.id, alertType });
          continue;
        }

        await supabase
          .from("ipo_alert_sends")
          .insert({ user_id: sub.user_id, ipo_id: ipo.id, alert_type: alertType })
          .throwOnError();

        sent++;
        sentSet.add(key);
      }

      if (sent >= CAP) break;
    }

    log.info("done", { sent, skipped });
    return {
      response: NextResponse.json({ sent, skipped }),
      stats: { sent, skipped },
    };
  });
}
