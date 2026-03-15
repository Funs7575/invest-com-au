import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { notificationFooter } from "@/lib/email-templates";

const log = logger("cron-post-enquiry-drip");

export const runtime = "edge";
export const maxDuration = 30;

// ═══════════════════════════════════════════════
// Cross-sell mapping: advisor type → related types the user likely also needs
// Each entry has a need key (for /find-advisor?need=X), label, and a reason shown in the email.
// ═══════════════════════════════════════════════

type CrossSell = { needKey: string; label: string; reason: string };

const CROSS_SELL_MAP: Record<string, CrossSell[]> = {
  mortgage_broker: [
    { needKey: "buyers", label: "Buyers Agent", reason: "Help you find and negotiate the right property" },
    { needKey: "insurance", label: "Insurance Broker", reason: "Protect your new home and income with the right cover" },
    { needKey: "tax", label: "Tax Agent", reason: "Maximise deductions on your mortgage interest and property costs" },
  ],
  buyers_agent: [
    { needKey: "mortgage", label: "Mortgage Broker", reason: "Lock in the best rate for your purchase" },
    { needKey: "insurance", label: "Insurance Broker", reason: "Get building, contents, and landlord cover sorted" },
    { needKey: "tax", label: "Tax Agent", reason: "Structure your property investment for maximum tax efficiency" },
  ],
  financial_planner: [
    { needKey: "tax", label: "Tax Agent", reason: "Minimise tax on your investment income and capital gains" },
    { needKey: "estate", label: "Estate Planner", reason: "Protect your wealth with the right will and trust structure" },
    { needKey: "insurance", label: "Insurance Broker", reason: "Make sure your income and family are protected" },
  ],
  smsf_accountant: [
    { needKey: "planning", label: "Financial Planner", reason: "Get investment strategy advice for your SMSF portfolio" },
    { needKey: "tax", label: "Tax Agent", reason: "Ensure your personal tax return aligns with your SMSF strategy" },
    { needKey: "estate", label: "Estate Planner", reason: "Set up binding death benefit nominations and succession" },
  ],
  tax_agent: [
    { needKey: "planning", label: "Financial Planner", reason: "Turn your tax savings into a long-term wealth strategy" },
    { needKey: "smsf", label: "SMSF Accountant", reason: "Explore whether an SMSF could cut your super fees" },
  ],
  property_advisor: [
    { needKey: "mortgage", label: "Mortgage Broker", reason: "Finance your investment property at the best rate" },
    { needKey: "tax", label: "Tax Agent", reason: "Claim depreciation, negative gearing, and CGT concessions" },
    { needKey: "insurance", label: "Insurance Broker", reason: "Protect your investment with landlord insurance" },
  ],
  estate_planner: [
    { needKey: "planning", label: "Financial Planner", reason: "Align your estate plan with your overall financial goals" },
    { needKey: "tax", label: "Tax Agent", reason: "Minimise tax impact of asset transfers and trusts" },
  ],
  insurance_broker: [
    { needKey: "planning", label: "Financial Planner", reason: "Make sure your insurance fits your broader financial plan" },
    { needKey: "estate", label: "Estate Planner", reason: "Ensure your beneficiaries are correctly structured" },
  ],
  wealth_manager: [
    { needKey: "tax", label: "Tax Agent", reason: "Optimise the tax treatment of your portfolio income" },
    { needKey: "estate", label: "Estate Planner", reason: "Protect and transfer your wealth across generations" },
  ],
  aged_care_advisor: [
    { needKey: "estate", label: "Estate Planner", reason: "Update powers of attorney and guardianship arrangements" },
    { needKey: "planning", label: "Financial Planner", reason: "Structure assets to balance aged care fees and family needs" },
  ],
  crypto_advisor: [
    { needKey: "tax", label: "Tax Agent", reason: "Get your crypto CGT right before the ATO catches up" },
    { needKey: "planning", label: "Financial Planner", reason: "Integrate crypto into your broader portfolio strategy" },
  ],
  debt_counsellor: [
    { needKey: "planning", label: "Financial Planner", reason: "Build a plan to grow wealth once your debt is under control" },
    { needKey: "tax", label: "Tax Agent", reason: "Check if any debt costs are tax-deductible" },
  ],
  real_estate_agent: [
    { needKey: "mortgage", label: "Mortgage Broker", reason: "Get pre-approval sorted to strengthen your position" },
    { needKey: "buyers", label: "Buyers Agent", reason: "Get independent representation when purchasing" },
  ],
};

function buildCrossSellHtml(crossSells: CrossSell[], siteUrl: string): string {
  const rows = crossSells.map(cs => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">
        <div style="font-size:14px;font-weight:600;color:#0f172a">${cs.label}</div>
        <div style="font-size:13px;color:#64748b;margin-top:2px">${cs.reason}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:middle">
        <a href="${siteUrl}/find-advisor?need=${cs.needKey}" style="display:inline-block;padding:8px 16px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap">
          Get Matched Free →
        </a>
      </td>
    </tr>
  `).join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:16px 0">
      <thead>
        <tr><td colspan="2" style="padding:12px;background:#f8fafc;font-size:13px;font-weight:700;color:#334155;border-bottom:1px solid #e2e8f0">
          Other professionals you might need
        </td></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/**
 * POST-ENQUIRY DRIP SEQUENCE
 *
 * After someone sends an advisor enquiry, they typically leave our site forever.
 * This drip brings them back, cross-sells related advisor types, and monetises
 * through new leads across complementary verticals.
 *
 * Step 1 (Day 1):  "Your enquiry was sent" + cross-sell related advisor types
 * Step 2 (Day 7):  "How did it go? Rate [advisor]" + comparison tools
 * Step 3 (Day 14): Dedicated cross-sell email — "3 other professionals who can help"
 * Step 4 (Day 30): "Fee update: your shortlisted brokers changed" + annual check-in
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

  // Get leads that need their next drip (now 4 steps)
  const { data: leads } = await supabase
    .from("professional_leads")
    .select("id, user_name, user_email, professional_id, source_page, created_at, post_drip_step")
    .lt("post_drip_step", 4)
    .gte("created_at", new Date(Date.now() - 45 * 86400000).toISOString())
    .order("created_at", { ascending: true })
    .limit(50);

  // Get advisor names + types for personalisation and cross-sell
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
    const advisorType = advisor?.type || "";
    const firstName = lead.user_name?.split(" ")[0] || "there";
    const crossSells = CROSS_SELL_MAP[advisorType] || [];

    let subject = "";
    let html = "";
    let shouldSend = false;

    // Step 1: Day 1 — Confirmation + cross-sell teaser
    if (step === 0 && daysSince >= 1) {
      shouldSend = true;
      subject = `${firstName}, your enquiry to ${advisorName} is on its way`;

      const crossSellSection = crossSells.length > 0
        ? `
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
          <p style="color:#475569;font-size:14px;line-height:1.6">
            <strong>You might also need...</strong>
          </p>
          <p style="color:#475569;font-size:13px;line-height:1.6">
            People working with a ${advisorType.replace(/_/g, " ")} often also benefit from these professionals:
          </p>
          ${buildCrossSellHtml(crossSells, siteUrl)}
        `
        : "";

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
          ${crossSellSection}
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

    // Step 3: Day 14 — Dedicated cross-sell email
    if (step === 2 && daysSince >= 14 && crossSells.length > 0) {
      shouldSend = true;
      const typeLabel = advisorType.replace(/_/g, " ");
      subject = `${firstName}, ${crossSells.length} other professionals who can help`;

      const contextMap: Record<string, string> = {
        mortgage_broker: "buying a home or refinancing",
        buyers_agent: "purchasing property",
        financial_planner: "building wealth",
        smsf_accountant: "managing your SMSF",
        tax_agent: "optimising your tax",
        property_advisor: "investing in property",
        estate_planner: "protecting your estate",
        insurance_broker: "getting the right cover",
        wealth_manager: "growing your portfolio",
        aged_care_advisor: "navigating aged care",
        crypto_advisor: "investing in crypto",
        debt_counsellor: "getting on top of debt",
        real_estate_agent: "selling your property",
      };
      const context = contextMap[advisorType] || `working with a ${typeLabel}`;

      html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#0f172a;font-size:18px">${crossSells.length} Other Professionals You Might Need</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Hi ${firstName},
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Two weeks ago you enquired with ${advisorName} about ${context}.
            Most people in your situation also benefit from these professionals — and matching is free:
          </p>
          ${buildCrossSellHtml(crossSells, siteUrl)}
          <p style="color:#475569;font-size:14px;line-height:1.6;margin-top:16px">
            Each match is free and takes 30 seconds. The right team of professionals working together can save you thousands.
          </p>
          <p style="color:#94a3b8;font-size:12px;margin-top:20px">
            Need help? Reply to this email or visit <a href="${siteUrl}" style="color:#7c3aed">invest.com.au</a>.
          </p>
          ${notificationFooter()}
        </div>
      `;
    }

    // Skip Step 3 if no cross-sells available for this advisor type
    if (step === 2 && daysSince >= 14 && crossSells.length === 0) {
      // Auto-advance past cross-sell step for types without cross-sells
      await supabase.from("professional_leads").update({
        post_drip_step: 3,
        post_drip_last_at: new Date().toISOString(),
      }).eq("id", lead.id);
      continue;
    }

    // Step 4: Day 30 — Fee update + annual check-in hook
    if (step === 3 && daysSince >= 30) {
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

  // ═══════════════════════════════════════════════
  // ADVISOR NUDGE: 3 days after lead creation, ask the advisor for an outcome update
  // ═══════════════════════════════════════════════

  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();

  const { data: nudgeLeads } = await supabase
    .from("professional_leads")
    .select("id, user_name, professional_id, created_at")
    .eq("status", "new")
    .is("advisor_nudge_sent_at", null)
    .lte("created_at", threeDaysAgo)
    .gte("created_at", tenDaysAgo)
    .order("created_at", { ascending: true })
    .limit(30);

  // Fetch advisor details for nudge leads
  const nudgeProIds = [...new Set((nudgeLeads || []).map(l => l.professional_id))];
  const { data: nudgePros } = nudgeProIds.length > 0
    ? await supabase.from("professionals").select("id, name, email").in("id", nudgeProIds)
    : { data: [] };
  const nudgeProMap = new Map((nudgePros || []).map(p => [p.id, p]));

  let advisorNudgesSent = 0;

  for (const lead of nudgeLeads || []) {
    const advisor = nudgeProMap.get(lead.professional_id);
    if (!advisor?.email) continue;

    const userName = lead.user_name || "a potential client";
    const createdDate = new Date(lead.created_at).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const nudgeSubject = `Did you contact ${userName}? Update your lead status`;
    const nudgeHtml = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#0f172a;font-size:18px">Lead Status Update</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          Hi ${advisor.name || "there"},
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          You received an enquiry from <strong>${userName}</strong> on ${createdDate}.
          Have you had a chance to follow up?
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          Please let us know the outcome so we can keep your lead pipeline accurate:
        </p>
        <div style="margin:20px 0;text-align:center">
          <a href="${siteUrl}/advisor-portal?action=contacted&lead=${lead.id}" style="display:inline-block;padding:12px 20px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin:6px">
            I contacted them
          </a>
          <a href="${siteUrl}/advisor-portal?action=converted&lead=${lead.id}" style="display:inline-block;padding:12px 20px;background:#16a34a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin:6px">
            Converted to client
          </a>
          <a href="${siteUrl}/advisor-portal?action=lost&lead=${lead.id}" style="display:inline-block;padding:12px 20px;background:#64748b;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin:6px">
            Not interested
          </a>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:20px">
          Keeping your leads up to date helps us send you better-matched enquiries.
        </p>
        ${notificationFooter()}
      </div>
    `;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: advisor.email,
          subject: nudgeSubject,
          html: nudgeHtml,
        }),
      });

      await supabase.from("professional_leads").update({
        advisor_nudge_sent_at: new Date().toISOString(),
      }).eq("id", lead.id);

      advisorNudgesSent++;
    } catch (e) {
      log.error("Advisor nudge email failed", { lead: lead.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ sent, checked: (leads || []).length, advisor_nudges_sent: advisorNudgesSent });
}
