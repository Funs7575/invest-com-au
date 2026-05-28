/**
 * GET /api/cron/cpd-year-renewal
 *
 * Fires on 1 July (start of the new ASIC CPD year). Sends a "your CPD year
 * has reset" email to all active advisors who held the cpd_compliant badge
 * in the prior year, reminding them their hours are now back at 0/40.
 *
 * Schedule: monthly-1-6 (1st of the month at 6am) — only meaningful on
 * 1 July, but harmless the rest of the year because most months have no
 * qualifying recipients.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { withCronRunLog } from "@/lib/cron-run-log";
import { sendEmail } from "@/lib/resend";
import { cpdYearFor } from "@/lib/course-certificates";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

const log = logger("cron-cpd-year-renewal");

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("cpd-year-renewal", async () => {
    // Only act in July
    const now = new Date();
    if (now.getUTCMonth() !== 6) {
      log.info("cpd-year-renewal: skipping — not July", { month: now.getUTCMonth() + 1 });
      return {
        response: NextResponse.json({ skipped: true, reason: "not July" }),
        stats: { skipped: 1 },
      };
    }

    const admin = createAdminClient();
    const siteUrl = getSiteUrl();
    const newYear = cpdYearFor(now);
    const priorYear = newYear - 1;

    // Find advisors who had cpd_compliant badge — they care about CPD
    const { data: badgeRows, error: badgeErr } = await admin
      .from("advisor_badges")
      .select("professional_id")
      .eq("badge_type", "cpd_compliant");

    if (badgeErr) {
      log.error("Failed to load badges", { error: badgeErr.message });
      return { response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }), stats: {} };
    }

    const proIds = [...new Set((badgeRows ?? []).map((b) => (b.professional_id as number)))];
    if (proIds.length === 0) {
      return {
        response: NextResponse.json({ success: true, sent: 0 }),
        stats: { sent: 0 },
      };
    }

    // Load their emails
    const { data: advisors, error: advErr } = await admin
      .from("professionals")
      .select("id, name, email")
      .in("id", proIds)
      .eq("status", "active")
      .not("email", "is", null);

    if (advErr) {
      log.error("Failed to load professionals", { error: advErr.message });
      return { response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }), stats: {} };
    }

    let sent = 0;
    for (const adv of (advisors ?? []) as unknown as Array<{ id: number; name: string; email: string }>) {
      if (!adv.email) continue;

      const firstName = adv.name.split(" ")[0] ?? adv.name;
      const html = `
        <p>Hi ${firstName},</p>
        <p>Your ASIC CPD year has reset. The ${priorYear - 1}&ndash;${priorYear} CPD year ended on 30 June &mdash; well done on completing your 40 hours.</p>
        <p>The new ${priorYear}&ndash;${newYear} CPD year started on 1 July. Your hours are now back at <strong>0 / 40</strong>.</p>
        <p>Keep the momentum going &mdash; check your CPD progress and browse new courses on Invest.com.au:</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${siteUrl}/advisor-portal?view=cpd" style="background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
            View my CPD tracker →
          </a>
        </p>
        <p style="font-size:12px;color:#64748b">ASIC requires 40 CPD hours per year (July 1 – June 30). Courses completed on Invest.com.au automatically count toward your total.</p>
      `;

      try {
        await sendEmail({
          to: adv.email,
          subject: `New CPD year started — your 40-hour clock has reset`,
          html,
        });
        sent++;
      } catch (err) {
        log.error("Failed to send renewal email", { id: adv.id, err });
      }
    }

    log.info("cpd-year-renewal complete", { sent, total: (advisors ?? []).length });
    return {
      response: NextResponse.json({ success: true, sent }),
      stats: { sent },
    };
  });
}
