import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";

const log = logger("cron:monthly-advisor-reports");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Monthly performance report email for every active advisor.
 *
 * Sent on the 1st of each month at 9am AEST. For each advisor:
 *
 *   - Leads received last month (billed + free)
 *   - Leads responded to
 *   - Average response time
 *   - Conversion rate (converted_at set)
 *   - Percentile rank across advisors of the same type for response time
 *
 * This is both a performance nudge AND a retention play — advisors
 * who see their numbers every month tend to respond faster and
 * stay on the platform longer.
 *
 * Runs once per month; Vercel schedule: '0 9 1 * *'.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();
  const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const monthLabel = firstOfPrevMonth.toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  const { data: advisors, error } = await supabase
    .from("professionals")
    .select("id, name, email, type, rating, review_count")
    .eq("status", "active")
    .not("email", "is", null)
    .limit(5000);

  if (error) {
    log.error("Failed to fetch advisors", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const stats = {
    scanned: advisors?.length || 0,
    emailed: 0,
    skipped_no_leads: 0,
    errored: 0,
  };

  // Pre-fetch response time stats per advisor type for percentile calc
  const { data: typeStats } = await supabase
    .from("professional_leads")
    .select("professional_id, response_time_minutes, professionals(type)")
    .gte("created_at", firstOfPrevMonth.toISOString())
    .lte("created_at", lastOfPrevMonth.toISOString())
    .not("response_time_minutes", "is", null);

  // Build { type → sorted response times } map for percentile lookup
  const typeResponseTimes = new Map<string, number[]>();
  for (const row of (typeStats as unknown as Array<{
    professional_id: number;
    response_time_minutes: number;
    professionals: { type?: string } | { type?: string }[] | null;
  }>) || []) {
    const pro = Array.isArray(row.professionals) ? row.professionals[0] : row.professionals;
    const type = pro?.type || "unknown";
    if (!typeResponseTimes.has(type)) typeResponseTimes.set(type, []);
    typeResponseTimes.get(type)!.push(row.response_time_minutes);
  }
  for (const arr of typeResponseTimes.values()) arr.sort((a, b) => a - b);

  for (const advisor of advisors || []) {
    try {
      // Aggregate this advisor's last-month stats in a single query
      const { data: leads } = await supabase
        .from("professional_leads")
        .select("id, billed, responded_at, converted_at, response_time_minutes")
        .eq("professional_id", advisor.id)
        .gte("created_at", firstOfPrevMonth.toISOString())
        .lte("created_at", lastOfPrevMonth.toISOString());

      const leadCount = leads?.length || 0;
      if (leadCount === 0) {
        stats.skipped_no_leads++;
        continue;
      }

      const billed = leads!.filter((l) => l.billed).length;
      const responded = leads!.filter((l) => l.responded_at).length;
      const converted = leads!.filter((l) => l.converted_at).length;
      const myResponseTimes = leads!
        .filter((l) => l.response_time_minutes !== null)
        .map((l) => l.response_time_minutes as number);
      const avgResponseMin =
        myResponseTimes.length > 0
          ? Math.round(myResponseTimes.reduce((a, b) => a + b, 0) / myResponseTimes.length)
          : null;
      const conversionPct =
        billed > 0 ? Math.round((converted / billed) * 100) : 0;

      // Percentile rank across advisors of same type
      let percentile: number | null = null;
      const peerTimes = typeResponseTimes.get(advisor.type) || [];
      if (peerTimes.length > 0 && avgResponseMin !== null) {
        const below = peerTimes.filter((t) => t > avgResponseMin).length;
        percentile = Math.round((below / peerTimes.length) * 100);
      }

      sendEmail(
        advisor.email,
        `Your ${monthLabel} performance report`,
        buildReportEmail({
          advisorName: advisor.name || "there",
          monthLabel,
          leadCount,
          billed,
          responded,
          converted,
          avgResponseMin,
          conversionPct,
          percentile,
        }),
      );
      stats.emailed++;
    } catch (err) {
      stats.errored++;
      log.error("Monthly report threw for advisor", {
        advisorId: advisor.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Monthly advisor reports cron completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

function buildReportEmail(data: {
  advisorName: string;
  monthLabel: string;
  leadCount: number;
  billed: number;
  responded: number;
  converted: number;
  avgResponseMin: number | null;
  conversionPct: number;
  percentile: number | null;
}): string {
  const respondedPct = data.leadCount > 0 ? Math.round((data.responded / data.leadCount) * 100) : 0;
  const responseTimeLabel =
    data.avgResponseMin === null
      ? "—"
      : data.avgResponseMin < 60
        ? `${data.avgResponseMin} min`
        : `${Math.round((data.avgResponseMin / 60) * 10) / 10} hrs`;
  const percentileLabel = data.percentile === null ? "" : `Top ${100 - data.percentile}% of advisors in your category`;
  const siteUrl = getSiteUrl();

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
      <h2 style="color:#0f172a;font-size:20px;margin:0 0 16px">Your ${escapeHtml(data.monthLabel)} report</h2>
      <p style="font-size:14px;line-height:1.5">Hi ${escapeHtml(data.advisorName)}, here's how you performed last month on Invest.com.au.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:8px 0;color:#64748b">Leads received</td><td style="padding:8px 0;text-align:right;font-weight:600">${data.leadCount}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Billed (paid)</td><td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #e2e8f0">${data.billed}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Responded to</td><td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #e2e8f0">${data.responded} (${respondedPct}%)</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Average response time</td><td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #e2e8f0">${responseTimeLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Conversions</td><td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #e2e8f0">${data.converted} (${data.conversionPct}%)</td></tr>
      </table>
      ${percentileLabel ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin:12px 0;font-size:13px;color:#15803d">${percentileLabel}</div>` : ""}
      <a href="${siteUrl}/advisor-portal" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">Go to advisor portal →</a>
      <p style="font-size:11px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
        Sent monthly. Reply STOP to opt out.
      </p>
    </div>`;
}

function sendEmail(to: string | null, subject: string, html: string): void {
  if (!to || !process.env.RESEND_API_KEY) return;
  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <reports@invest.com.au>",
      to: [to],
      subject,
      html,
    }),
  }).catch(() => {});
}
