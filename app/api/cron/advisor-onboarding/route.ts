import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { notificationFooter } from "@/lib/email-templates";
import { requireCronAuth } from "@/lib/cron-auth";

const log = logger("cron-advisor-onboarding");

export const runtime = "edge";
export const maxDuration = 30;

/**
 * GET /api/cron/advisor-onboarding
 * Runs daily. Sends a 3-email onboarding sequence to new advisors:
 *   Step 0 → 1: Day 0 — Welcome + portal link (sent by advisor-welcome route on signup)
 *   Step 1 → 2: Day 2 — Complete your profile + add Calendly
 *   Step 2 → 3: Day 5 — Write your first article ($299)
 */
export async function GET(req: Request) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";

  // Get advisors who need the next drip email
  const { data: advisors } = await supabase
    .from("professionals")
    .select("id, name, email, slug, onboarding_step, onboarded_at, last_drip_at, booking_link, bio, profile_complete")
    .eq("status", "active")
    .lt("onboarding_step", 3)
    .not("email", "is", null);

  let sent = 0;

  for (const advisor of advisors || []) {
    if (!advisor.email || !advisor.onboarded_at) continue;

    const daysSinceOnboard = Math.floor((Date.now() - new Date(advisor.onboarded_at).getTime()) / 86400000);
    const step = advisor.onboarding_step || 0;

    let subject = "";
    let html = "";
    let shouldSend = false;

    // Step 1: Day 2 — Complete your profile
    if (step <= 1 && daysSinceOnboard >= 2) {
      shouldSend = true;
      subject = `${advisor.name}, your profile is 60% done — let's finish it`;
      html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#0f172a;font-size:18px">Complete Your Profile</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Hi ${advisor.name},
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Your Invest.com.au advisor profile is live, but it's not yet reaching its full potential.
            Advisors with complete profiles get <strong>3x more enquiries</strong> than incomplete ones.
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6"><strong>Quick wins to boost your profile:</strong></p>
          <ul style="color:#475569;font-size:14px;line-height:1.8">
            <li>${advisor.bio ? '✅' : '❌'} <strong>Bio</strong> — Tell potential clients about your approach</li>
            <li>${advisor.booking_link ? '✅' : '❌'} <strong>Booking link</strong> — Add your Calendly/Cal.com URL so people can book directly</li>
            <li>❌ <strong>Photo</strong> — Profiles with photos get 2x more clicks</li>
          </ul>
          <a href="${siteUrl}/advisor-portal" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;margin-top:12px">
            Complete Your Profile →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:20px">
            Your profile: <a href="${siteUrl}/advisor/${advisor.slug}" style="color:#7c3aed">${siteUrl}/advisor/${advisor.slug}</a>
          </p>
          ${notificationFooter()}
        </div>
      `;
    }

    // Step 2: Day 5 — Write your first article
    if (step <= 2 && step >= 1 && daysSinceOnboard >= 5) {
      shouldSend = true;
      subject = `Grow your reach: publish an expert article on Invest.com.au`;
      html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#0f172a;font-size:18px">Publish an Expert Article</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Hi ${advisor.name},
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Did you know you can publish expert articles on Invest.com.au?
            Articles with your byline appear across the site and in our newsletter,
            positioning you as a thought leader to thousands of Australian investors.
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6"><strong>Three tiers:</strong></p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155">
            <tr style="background:#f8fafc"><td style="padding:8px;border:1px solid #e2e8f0"><strong>Standard — $299</strong></td><td style="padding:8px;border:1px solid #e2e8f0">Article with author byline + profile link</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Featured — $499</strong></td><td style="padding:8px;border:1px solid #e2e8f0">Above + homepage Expert Insights + newsletter</td></tr>
            <tr style="background:#f8fafc"><td style="padding:8px;border:1px solid #e2e8f0"><strong>Sponsored — $799</strong></td><td style="padding:8px;border:1px solid #e2e8f0">Above + pinned to top + social media promo</td></tr>
          </table>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin-top:12px">
            Write about what you know best — SMSF strategies, tax planning, retirement,
            property investing. We handle the editing and publishing.
          </p>
          <a href="${siteUrl}/advisor-portal" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;margin-top:12px">
            Write an Article →
          </a>
          ${notificationFooter()}
        </div>
      `;
    }

    if (shouldSend) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "Invest.com.au <advisors@invest.com.au>",
            to: advisor.email,
            subject,
            html,
          }),
        });

        await supabase.from("professionals").update({
          onboarding_step: (step || 0) + 1,
          last_drip_at: new Date().toISOString(),
        }).eq("id", advisor.id);

        sent++;
        log.info(`Sent onboarding step ${step + 1} to ${advisor.name}`);
      } catch (e) {
        log.error("Onboarding email failed", { advisor: advisor.name, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return NextResponse.json({ sent, checked: (advisors || []).length });
}
