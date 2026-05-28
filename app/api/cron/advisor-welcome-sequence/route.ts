import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";
import { wrapCronHandler } from "@/lib/cron-run-log";

const log = logger("cron:advisor-welcome-sequence");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * GET /api/cron/advisor-welcome-sequence
 *
 * Runs daily. Sends a welcome email to advisors who were activated 24–48h ago
 * and have not yet received their welcome email (welcome_email_sent_at IS NULL).
 *
 * The 24h hold window gives a buffer so the advisor's profile is seeded
 * before we encourage them to share it. We use the created_at timestamp as
 * a proxy for activation time because onboarded_at is set when the advisor
 * completes the onboarding wizard (which may lag behind status = 'active').
 *
 * Cron routes under /api/cron/* are exempt from rate limiting.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const siteUrl = getSiteUrl();
  const now = new Date();

  const window48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const window24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Advisors who became active 24–48h ago and haven't received the welcome email
  const { data: advisors, error } = await supabase
    .from("professionals")
    .select("id, name, email, slug")
    .eq("status", "active")
    .is("welcome_email_sent_at", null)
    .gt("created_at", window48h)
    .lt("created_at", window24h)
    .not("email", "is", null);

  if (error) {
    log.error("Failed to fetch professionals for welcome sequence", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const advisor of advisors ?? []) {
    if (!advisor.email) continue;

    const advisorName = (advisor.name as string | null) ?? "there";
    const firstName = escapeHtml(advisorName.trim().split(" ")[0] ?? "there");
    const profileUrl = advisor.slug
      ? `${siteUrl}/advisor/${advisor.slug as string}`
      : `${siteUrl}/advisor-portal`;

    const subject = "Welcome to Invest.com.au — your profile is live";

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#334155">
        <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
          <span style="color:#ffffff;font-weight:800;font-size:18px">Invest.com.au</span>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <div style="text-align:center;padding:8px 0 24px">
            <div style="display:inline-block;width:56px;height:56px;background:#dcfce7;border-radius:14px;line-height:56px;text-align:center">
              <span style="font-size:24px;color:#16a34a;font-weight:700">&#10003;</span>
            </div>
          </div>
          <h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;text-align:center">
            Welcome to Invest.com.au, ${firstName}!
          </h2>
          <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 16px;text-align:center">
            Your advisor profile is now live and visible to thousands of Australians searching for financial advice.
          </p>

          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:0 0 20px">
            <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 12px">
              Here's what to do next:
            </p>
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9">
                  <span style="display:inline-block;width:20px;height:20px;background:#7c3aed;color:#fff;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;margin-right:8px">1</span>
                  <strong style="color:#0f172a">Complete your profile</strong> &mdash; add a photo, bio, and specialties
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9">
                  <span style="display:inline-block;width:20px;height:20px;background:#7c3aed;color:#fff;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;margin-right:8px">2</span>
                  <strong style="color:#0f172a">Add your services</strong> &mdash; set your fee structure and service areas
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9">
                  <span style="display:inline-block;width:20px;height:20px;background:#7c3aed;color:#fff;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;margin-right:8px">3</span>
                  <strong style="color:#0f172a">Earn CPD hours</strong> &mdash; browse accredited courses in our academy
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9">
                  <span style="display:inline-block;width:20px;height:20px;background:#7c3aed;color:#fff;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;margin-right:8px">4</span>
                  <strong style="color:#0f172a">Create courses</strong> &mdash; share your expertise with the community
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#64748b">
                  <span style="display:inline-block;width:20px;height:20px;background:#7c3aed;color:#fff;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;margin-right:8px">5</span>
                  <strong style="color:#0f172a">Set your availability</strong> &mdash; let clients know when you can meet
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align:center;margin:0 0 20px">
            <a href="${siteUrl}/advisor-portal"
              style="display:inline-block;padding:12px 32px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
              Open advisor portal &rarr;
            </a>
          </div>

          <p style="font-size:13px;color:#94a3b8;margin:0 0 4px;text-align:center">
            Your public profile:
            <a href="${profileUrl}" style="color:#64748b;text-decoration:underline">${profileUrl}</a>
          </p>
          <p style="font-size:12px;color:#94a3b8;margin:0;text-align:center">
            Questions? Reply to this email or visit the
            <a href="${siteUrl}/advisor-portal" style="color:#64748b">advisor portal</a>.
          </p>
        </div>
      </div>`;

    const text = `Welcome to Invest.com.au, ${firstName}!\n\nYour advisor profile is now live and visible to thousands of Australians searching for financial advice.\n\nHere's what to do next:\n1. Complete your profile — add a photo, bio, and specialties\n2. Add your services — set your fee structure and service areas\n3. Earn CPD hours — browse accredited courses in our academy\n4. Create courses — share your expertise\n5. Set your availability — let clients know when you can meet\n\nOpen your advisor portal: ${siteUrl}/advisor-portal\nYour public profile: ${profileUrl}`;

    const result = await sendEmail({
      to: advisor.email as string,
      subject,
      html,
      text,
      from: "Invest.com.au <advisors@invest.com.au>",
    });

    if (result.ok) {
      // Mark welcome email as sent
      await supabase
        .from("professionals")
        .update({ welcome_email_sent_at: now.toISOString() })
        .eq("id", advisor.id);

      sent++;
      log.info("Welcome email sent", { professional_id: advisor.id });
    } else {
      failed++;
      log.warn("Welcome email send failed", {
        professional_id: advisor.id,
        error: result.error,
      });
    }
  }

  log.info("Advisor welcome sequence complete", {
    checked: (advisors ?? []).length,
    sent,
    failed,
  });

  return NextResponse.json({ sent, failed, checked: (advisors ?? []).length });
}

export const GET = wrapCronHandler("advisor-welcome-sequence", handler);
