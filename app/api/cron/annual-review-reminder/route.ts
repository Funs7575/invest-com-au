import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { notificationFooter } from "@/lib/email-templates";

const log = logger("cron-annual-reminder");

export const runtime = "edge";
export const maxDuration = 30;

/**
 * ANNUAL BROKER REVIEW REMINDER
 *
 * Runs monthly. Finds users who signed up 11-13 months ago and sends
 * them a "time for your annual broker review" email. This brings them
 * back to the site for re-comparison → new affiliate clicks.
 *
 * Cost per user: $0 (already in your email list)
 * Revenue per return visit: ~$1.50 (average across all visitors)
 * At 1,000 annual reminders/month with 30% open rate and 10% click rate:
 * = 30 return visits = ~$45/month recurring, growing with list size
 *
 * The real value: it reactivates dormant users at zero acquisition cost.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

  // Find users who signed up 11-13 months ago and haven't received an annual reminder
  const elevenMonthsAgo = new Date(Date.now() - 335 * 86400000).toISOString();
  const thirteenMonthsAgo = new Date(Date.now() - 395 * 86400000).toISOString();

  const { data: emailUsers } = await supabase
    .from("email_captures")
    .select("id, email, name, source, created_at")
    .gte("created_at", thirteenMonthsAgo)
    .lte("created_at", elevenMonthsAgo)
    .neq("status", "bounced")
    .is("last_annual_reminder", null)
    .limit(50);

  const { data: quizUsers } = await supabase
    .from("quiz_leads")
    .select("id, email, name, created_at")
    .gte("created_at", thirteenMonthsAgo)
    .lte("created_at", elevenMonthsAgo)
    .neq("unsubscribed", true)
    .is("last_annual_reminder", null)
    .limit(50);

  // Deduplicate by email
  const seen = new Set<string>();
  const users: { email: string; name: string; source: string; table: string; id: number }[] = [];

  for (const u of emailUsers || []) {
    const em = u.email?.toLowerCase();
    if (em && !seen.has(em)) {
      seen.add(em);
      users.push({ email: em, name: u.name || "", source: u.source || "website", table: "email_captures", id: u.id });
    }
  }
  for (const u of quizUsers || []) {
    const em = u.email?.toLowerCase();
    if (em && !seen.has(em)) {
      seen.add(em);
      users.push({ email: em, name: u.name || "", source: "quiz", table: "quiz_leads", id: u.id });
    }
  }

  let sent = 0;

  for (const user of users) {
    const firstName = user.name?.split(" ")[0] || "there";

    const subject = `${firstName}, it's time for your annual broker review`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#0f172a;font-size:18px">🔄 Time for Your Annual Broker Check-Up</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          Hi ${firstName},
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          It's been about a year since you compared investing platforms on Invest.com.au.
          <strong>A lot has changed since then:</strong>
        </p>
        <ul style="color:#475569;font-size:14px;line-height:1.8">
          <li>Several brokers have cut their fees</li>
          <li>New platforms have launched in Australia</li>
          <li>Savings account rates have shifted significantly</li>
          <li>New deals and promotions are available</li>
        </ul>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          <strong>Are you still getting the best deal?</strong> It only takes 60 seconds to check.
        </p>
        <a href="${siteUrl}/switching-calculator?utm_source=annual_reminder&utm_medium=email" style="display:inline-block;padding:14px 28px;background:#0f172a;color:white;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;margin:12px 0">
          Check If You're Overpaying →
        </a>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin-top:16px">
          Or jump straight to:
        </p>
        <ul style="color:#475569;font-size:14px;line-height:1.8">
          <li><a href="${siteUrl}/compare?utm_source=annual_reminder" style="color:#7c3aed">Compare all 73 platforms</a></li>
          <li><a href="${siteUrl}/best/high-interest-savings?utm_source=annual_reminder" style="color:#7c3aed">Best savings rates right now</a></li>
          <li><a href="${siteUrl}/quiz?utm_source=annual_reminder" style="color:#7c3aed">Retake the platform quiz</a></li>
        </ul>
        ${notificationFooter()}
      </div>
    `;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: user.email,
          subject,
          html,
        }),
      });

      // Mark as sent
      await supabase.from(user.table).update({
        last_annual_reminder: new Date().toISOString(),
      }).eq("id", user.id);

      sent++;
    } catch (e) {
      log.error("Annual reminder failed", { email: user.email, error: e instanceof Error ? e.message : String(e) });
    }
  }

  log.info("Annual reminders sent", { sent, checked: users.length });
  return NextResponse.json({ sent, checked: users.length });
}
