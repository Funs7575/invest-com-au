import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { notificationFooter } from "@/lib/email-templates";

const log = logger("cron-post-enquiry-drip");

export const runtime = "edge";
export const maxDuration = 30;

/**
 * POST-ENQUIRY DRIP SEQUENCE
 *
 * After someone sends an advisor enquiry, they typically leave our site forever.
 * This drip brings them back and monetises them through affiliate clicks.
 *
 * Step 1 (Day 1): "Your enquiry was sent" + relevant guide link
 * Step 2 (Day 7): "How did it go? Rate [advisor]" + comparison tools
 * Step 3 (Day 30): "Fee update: your shortlisted brokers changed" + annual check-in
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

  // Get leads that need their next drip
  const { data: leads } = await supabase
    .from("professional_leads")
    .select("id, user_name, user_email, professional_id, source_page, created_at, post_drip_step")
    .lt("post_drip_step", 3)
    .gte("created_at", new Date(Date.now() - 45 * 86400000).toISOString()) // Only last 45 days
    .order("created_at", { ascending: true })
    .limit(50);

  // Get advisor names for personalisation
  const proIds = [...new Set((leads || []).map(l => l.professional_id))];
  const { data: pros } = proIds.length > 0
    ? await supabase.from("professionals").select("id, name, slug, type").in("id", proIds)
    : { data: [] };
  const proMap = new Map((pros || []).map(p => [p.id, p]));

  let sent = 0;

  for (const lead of leads || []) {
    if (!lead.user_email) continue;
    const daysSince = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000);
    const step = lead.post_drip_step || 0;
    const advisor = proMap.get(lead.professional_id);
    const advisorName = advisor?.name || "your advisor";
    const firstName = lead.user_name?.split(" ")[0] || "there";

    let subject = "";
    let html = "";
    let shouldSend = false;

    // Step 1: Day 1 — Confirmation + relevant guide
    if (step === 0 && daysSince >= 1) {
      shouldSend = true;
      subject = `${firstName}, your enquiry to ${advisorName} is on its way`;
      html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#0f172a;font-size:18px">Your Enquiry Has Been Sent</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Hi ${firstName},
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            ${advisorName} has received your enquiry and should be in touch soon.
            Most advisors respond within 24 hours.
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            <strong>While you wait, here are some useful tools:</strong>
          </p>
          <ul style="color:#475569;font-size:14px;line-height:1.8">
            <li><a href="${siteUrl}/switching-calculator" style="color:#7c3aed">Switching Calculator</a> — see how much you'd save by changing brokers</li>
            <li><a href="${siteUrl}/quiz" style="color:#7c3aed">Platform Quiz</a> — find the best platform for your situation</li>
            <li><a href="${siteUrl}/compare" style="color:#7c3aed">Compare All Platforms</a> — side-by-side fee comparison</li>
          </ul>
          <p style="color:#94a3b8;font-size:12px;margin-top:20px">
            Need help? Reply to this email or visit <a href="${siteUrl}" style="color:#7c3aed">invest.com.au</a>.
          </p>
          ${notificationFooter()}
        </div>
      `;
    }

    // Step 2: Day 7 — Rate the advisor + explore tools
    if (step === 1 && daysSince >= 7) {
      shouldSend = true;
      const advisorSlug = advisor?.slug || "";
      subject = `How was your experience with ${advisorName}?`;
      html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#0f172a;font-size:18px">How Did It Go?</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Hi ${firstName},
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            It's been a week since you enquired with ${advisorName}. We'd love to hear how it went!
          </p>
          ${advisorSlug ? `
          <a href="${siteUrl}/advisor/${advisorSlug}#reviews" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;margin:8px 0">
            Leave a Review for ${advisorName} →
          </a>
          ` : ""}
          <p style="color:#475569;font-size:14px;line-height:1.6;margin-top:16px">
            Your review helps other investors find great advisors — and holds advisors accountable for their service quality.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
          <p style="color:#475569;font-size:14px;line-height:1.6">
            <strong>Still comparing investment platforms?</strong>
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Check out our <a href="${siteUrl}/best/beginners" style="color:#7c3aed">Best Brokers for Beginners</a> or use the
            <a href="${siteUrl}/savings-calculator" style="color:#7c3aed">Savings Calculator</a> to see if your money is working hard enough.
          </p>
          ${notificationFooter()}
        </div>
      `;
    }

    // Step 3: Day 30 — Fee update + annual check-in hook
    if (step === 2 && daysSince >= 30) {
      shouldSend = true;
      subject = `${firstName}, broker fees have changed — are you still getting the best deal?`;
      html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#0f172a;font-size:18px">Monthly Fee Update</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Hi ${firstName},
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            It's been a month since you reached out to ${advisorName}.
            Whether you've signed up with an advisor or are still deciding, here's what's changed:
          </p>
          <ul style="color:#475569;font-size:14px;line-height:1.8">
            <li>Several brokers have updated their fee schedules</li>
            <li>New deals and promotions are available</li>
            <li>Our comparison tables are updated with the latest data</li>
          </ul>
          <a href="${siteUrl}/compare" style="display:inline-block;padding:12px 24px;background:#0f172a;color:white;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;margin:8px 0">
            Check Latest Fees →
          </a>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
          <p style="color:#475569;font-size:14px;line-height:1.6">
            <strong>Tip:</strong> Set up a <a href="${siteUrl}/fee-alerts" style="color:#7c3aed">free fee alert</a>
            and we'll email you whenever your broker changes their fees — so you're never overpaying.
          </p>
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
            from: "Invest.com.au <hello@invest.com.au>",
            to: lead.user_email,
            subject,
            html,
          }),
        });

        await supabase.from("professional_leads").update({
          post_drip_step: step + 1,
          post_drip_last_at: new Date().toISOString(),
        }).eq("id", lead.id);

        sent++;
      } catch (e) {
        log.error("Post-enquiry drip failed", { lead: lead.id, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return NextResponse.json({ sent, checked: (leads || []).length });
}
