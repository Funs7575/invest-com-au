import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { getStaleStats, getUpcomingStaleStats } from "@/lib/dated-stats";
import { ADMIN_EMAIL } from "@/lib/admin";

const log = logger("cron:dated-stats-check");

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Daily cron that alerts when any registered <DatedStatBadge> entry is stale
 * or approaching its stalesAt date.
 *
 * Sends a single digest email to ADMIN_EMAIL so the founder can update the
 * stat and push a new stalesAt date before users see outdated numbers.
 *
 * Registered in CRON_GROUPS["daily-8"]. Non-blocking on email failure.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const now = new Date();
  const stale = getStaleStats(now);
  const upcoming = getUpcomingStaleStats(7, now); // warn 7 days ahead

  log.info("Dated-stats check", {
    stale: stale.length,
    upcoming: upcoming.length,
    total: stale.length + upcoming.length,
  });

  if (stale.length === 0 && upcoming.length === 0) {
    return NextResponse.json({ ok: true, stale: 0, upcoming: 0 });
  }

  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL || process.env.OPS_ALERT_EMAIL || ADMIN_EMAIL;

  const staleRows = stale
    .map(
      (s) =>
        `<tr><td style="padding:4px 8px">${s.id}</td><td style="padding:4px 8px">${s.label}</td><td style="padding:4px 8px">${s.value}</td><td style="padding:4px 8px;color:#dc2626">${s.stalesAt.toLocaleDateString("en-AU")}</td><td style="padding:4px 8px">${s.page ?? ""}</td></tr>`
    )
    .join("");

  const upcomingRows = upcoming
    .map(
      (s) =>
        `<tr><td style="padding:4px 8px">${s.id}</td><td style="padding:4px 8px">${s.label}</td><td style="padding:4px 8px">${s.value}</td><td style="padding:4px 8px;color:#d97706">${s.stalesAt.toLocaleDateString("en-AU")}</td><td style="padding:4px 8px">${s.page ?? ""}</td></tr>`
    )
    .join("");

  const tableHead = `<tr style="background:#f3f4f6"><th style="padding:4px 8px;text-align:left">ID</th><th style="padding:4px 8px;text-align:left">Label</th><th style="padding:4px 8px;text-align:left">Value</th><th style="padding:4px 8px;text-align:left">Stales At</th><th style="padding:4px 8px;text-align:left">Page</th></tr>`;

  const html = `
<h2 style="color:#1e293b">Dated Stats Alert — invest.com.au</h2>
${
  stale.length > 0
    ? `<h3 style="color:#dc2626">🔴 ${stale.length} stale stat${stale.length > 1 ? "s" : ""} (past stalesAt)</h3>
<table style="border-collapse:collapse;width:100%;font-size:14px">${tableHead}${staleRows}</table>
<p style="font-size:13px;color:#6b7280">These stats have passed their stalesAt date. Update them in <code>lib/dated-stats.ts</code> and push a deploy.</p>`
    : ""
}
${
  upcoming.length > 0
    ? `<h3 style="color:#d97706">🟡 ${upcoming.length} stat${upcoming.length > 1 ? "s" : ""} expiring within 7 days</h3>
<table style="border-collapse:collapse;width:100%;font-size:14px">${tableHead}${upcomingRows}</table>`
    : ""
}
  `.trim();

  const { ok, error } = await sendEmail({
    to: adminEmail,
    subject: `[invest.com.au] Dated Stats Alert — ${stale.length} stale, ${upcoming.length} expiring soon`,
    html,
  });

  if (!ok) {
    log.warn("Failed to send dated-stats alert email", { error });
  }

  return NextResponse.json({ ok: true, stale: stale.length, upcoming: upcoming.length });
}
