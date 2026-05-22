import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { cpdYearFor } from "@/lib/course-certificates";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("cron:cpd-reminder");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * GET /api/cron/cpd-reminder
 *
 * Weekly cron: sends a CPD reminder email to advisors who have completed
 * fewer than 30 hours (less than 75% of the 40-hour annual requirement)
 * in the current ASIC CPD year (July 1 – June 30).
 *
 * Cron routes under /api/cron/* are exempt from rate limiting per the
 * project rate-limit audit.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const siteUrl = getSiteUrl();
  const now = new Date();
  const cpd_year = cpdYearFor(now);

  // CPD year runs July 1 to June 30 (ending calendar year).
  // e.g. cpd_year 2026 → Jul 1 2025 to Jun 30 2026.
  const yearStart = new Date(`${cpd_year - 1}-07-01T00:00:00.000Z`);
  const yearEnd = new Date(`${cpd_year}-06-30T23:59:59.999Z`);
  const daysInYear = (yearEnd.getTime() - yearStart.getTime()) / 86400000;
  const daysElapsed = (now.getTime() - yearStart.getTime()) / 86400000;
  const targetPct = daysElapsed / daysInYear; // how far through the year we are

  log.info("CPD reminder cron starting", {
    cpd_year,
    targetPct: (targetPct * 100).toFixed(1) + "%",
    daysElapsed: Math.round(daysElapsed),
  });

  // Aggregate CPD hours per advisor for the current year
  const { data: cpdRows, error: cpdError } = await supabase
    .from("cpd_credits")
    .select("professional_id, hours")
    .eq("cpd_year", cpd_year);

  if (cpdError) {
    log.error("Failed to fetch cpd_credits", { error: cpdError.message });
    return NextResponse.json({ ok: false, error: "cpd_fetch_failed" }, { status: 500 });
  }

  // Sum hours per professional
  const hoursMap = new Map<number, number>();
  for (const row of cpdRows ?? []) {
    const pid = row.professional_id as number;
    hoursMap.set(pid, (hoursMap.get(pid) ?? 0) + (row.hours as number));
  }

  // Fetch all active advisors with email
  const { data: advisors, error: advisorError } = await supabase
    .from("professionals")
    .select("id, name, email")
    .eq("status", "active")
    .not("email", "is", null);

  if (advisorError) {
    log.error("Failed to fetch professionals", { error: advisorError.message });
    return NextResponse.json({ ok: false, error: "advisor_fetch_failed" }, { status: 500 });
  }

  const REQUIRED_HOURS = 40;
  const REMINDER_THRESHOLD = 30; // < 75% of 40 hours
  let sent = 0;
  let skipped = 0;

  for (const advisor of advisors ?? []) {
    if (!advisor.email) {
      skipped++;
      continue;
    }

    const completedHours = hoursMap.get(advisor.id as number) ?? 0;

    // Only send to advisors below the 75% completion threshold
    if (completedHours >= REMINDER_THRESHOLD) {
      skipped++;
      continue;
    }

    const remaining = Math.max(0, REQUIRED_HOURS - completedHours);
    const advisorName = (advisor.name as string | null) ?? "there";
    const firstName = escapeHtml(advisorName.trim().split(" ")[0] ?? "there");

    const subject = `CPD reminder: ${remaining.toFixed(0)} hours to complete by 30 June ${cpd_year}`;

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#334155">
        <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
          <span style="color:#ffffff;font-weight:800;font-size:18px">Invest.com.au</span>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a">CPD Hours Reminder</h2>
          <p style="font-size:15px;margin:0 0 12px">Hi ${firstName},</p>
          <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 16px">
            You've completed <strong style="color:#0f172a">${completedHours.toFixed(1)} hours</strong> of your
            <strong style="color:#0f172a">${REQUIRED_HOURS}-hour</strong> annual CPD requirement.
            You have until <strong style="color:#0f172a">30 June ${cpd_year}</strong> to complete the
            remaining <strong style="color:#0f172a">${remaining.toFixed(0)} hours</strong>.
          </p>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:0 0 20px">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="font-size:13px;color:#92400e;font-weight:600">Completed</td>
                <td style="font-size:13px;color:#92400e;text-align:right">${completedHours.toFixed(1)} / ${REQUIRED_HOURS} hours</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#92400e;font-weight:600;padding-top:4px">Remaining</td>
                <td style="font-size:13px;color:#b91c1c;font-weight:700;text-align:right;padding-top:4px">${remaining.toFixed(0)} hours</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#92400e;font-weight:600;padding-top:4px">Deadline</td>
                <td style="font-size:13px;color:#92400e;text-align:right;padding-top:4px">30 June ${cpd_year}</td>
              </tr>
            </table>
          </div>
          <div style="text-align:center;margin:0 0 20px">
            <a href="${siteUrl}/academy"
              style="display:inline-block;padding:12px 32px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
              Browse CPD courses &rarr;
            </a>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6">
            You're receiving this because you are a registered advisor on Invest.com.au.
            <a href="${siteUrl}/advisor-portal" style="color:#64748b">Manage preferences</a>
          </p>
        </div>
      </div>`;

    const text = `Hi ${firstName},\n\nYou've completed ${completedHours.toFixed(1)} hours of your ${REQUIRED_HOURS}-hour annual CPD requirement. You have until 30 June ${cpd_year} to complete the remaining ${remaining.toFixed(0)} hours.\n\nBrowse CPD courses: ${siteUrl}/academy`;

    const result = await sendEmail({
      to: advisor.email as string,
      subject,
      html,
      text,
      from: "Invest.com.au <advisors@invest.com.au>",
    });

    if (result.ok) {
      sent++;
      log.info("CPD reminder sent", { professional_id: advisor.id, completedHours });
    } else {
      log.warn("CPD reminder send failed", {
        professional_id: advisor.id,
        error: result.error,
      });
    }
  }

  log.info("CPD reminder cron complete", { sent, skipped, cpd_year });
  return NextResponse.json({ sent, skipped, cpd_year });
}
