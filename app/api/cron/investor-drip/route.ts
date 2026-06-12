import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  getPersonalizedBrokers,
  type BrokerRecommendationContext,
} from "@/lib/broker-recommendations";
import { brokerDripEmail4, brokerDripEmail5 } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

const log = logger("cron-investor-drip");

export const runtime = "edge";
export const maxDuration = 60;

import { getSiteUrl } from "@/lib/url";
import { requireCronAuth } from "@/lib/cron-auth";
const SITE_URL = getSiteUrl();

/**
 * Investor email drip: 5-email sequence for new email captures and quiz leads.
 *
 * Email 1 (Day 0): Welcome — what the site offers, top tools
 * Email 2 (Day 2): Best content — top article + portfolio calculator CTA
 * Email 3 (Day 5): Personal recommendation — quiz CTA or advisor CTA
 * Email 4 (Day 7): Top 3 broker matches — personalized broker recommendations
 * Email 5 (Day 10): Final recommendation — #1 match with active deal (if any)
 *
 * Runs daily. Processes signups from the last 15 days.
 * Tracks sent emails in investor_drip_log to prevent duplicates.
 */

function welcomeEmail(name: string): string {
  const firstName = name.split(" ")[0] || "there";
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155">
    <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">Welcome to Invest.com.au</h1>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:13px">Australia's independent investing hub</p>
    </div>
    <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
      <p style="font-size:15px;line-height:1.6">Hi ${firstName},</p>
      <p style="font-size:14px;line-height:1.6;color:#64748b">Thanks for joining. Here's what you can do on Invest.com.au:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9"><strong style="color:#0f172a">Compare Platforms</strong><br><span style="color:#64748b;font-size:13px">33+ brokers with real-time fee data</span></td><td style="padding:10px;text-align:right"><a href="${SITE_URL}/compare" style="color:#2563eb;font-size:13px;font-weight:600">Compare →</a></td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9"><strong style="color:#0f172a">Portfolio Calculator</strong><br><span style="color:#64748b;font-size:13px">See exact fees for your trades</span></td><td style="padding:10px;text-align:right"><a href="${SITE_URL}/portfolio-calculator" style="color:#2563eb;font-size:13px;font-weight:600">Calculate →</a></td></tr>
        <tr><td style="padding:10px"><strong style="color:#0f172a">Find an Advisor</strong><br><span style="color:#64748b;font-size:13px">Verified SMSF, financial planners & more</span></td><td style="padding:10px;text-align:right"><a href="${SITE_URL}/find-advisor" style="color:#7c3aed;font-size:13px;font-weight:600">Find →</a></td></tr>
      </table>
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">Invest.com.au — independent, free, updated daily.</p>
    </div></div>`;
}

function bestContentEmail(name: string): string {
  const firstName = name.split(" ")[0] || "there";
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155">
    <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
      <h1 style="color:white;margin:0;font-size:18px">Are you overpaying your broker?</h1>
    </div>
    <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
      <p style="font-size:15px;line-height:1.6">Hi ${firstName},</p>
      <p style="font-size:14px;line-height:1.6;color:#64748b">Most Australian investors pay more in fees than they need to. Our portfolio calculator shows you the exact cost at every broker — and how much you could save.</p>
      <div style="text-align:center;margin:20px 0">
        <a href="${SITE_URL}/portfolio-calculator" style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">Calculate My Fees →</a>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#64748b">Or dive into our most popular guides:</p>
      <ul style="font-size:13px;color:#334155;padding-left:18px;line-height:2">
        <li><a href="${SITE_URL}/article/best-share-trading-platforms-australia" style="color:#2563eb">Best Share Trading Platforms 2026</a></li>
        <li><a href="${SITE_URL}/article/best-etfs-australia" style="color:#2563eb">Best ETFs for Australian Investors</a></li>
        <li><a href="${SITE_URL}/compare" style="color:#2563eb">Full Platform Comparison Table</a></li>
      </ul>
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">Invest.com.au — real fees, real data.</p>
    </div></div>`;
}

function personalRecEmail(name: string, hasQuizResult: boolean): string {
  const firstName = name.split(" ")[0] || "there";
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155">
    <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
      <h1 style="color:white;margin:0;font-size:18px">${hasQuizResult ? "Your personalised match is ready" : "Find your perfect platform in 60 seconds"}</h1>
    </div>
    <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
      <p style="font-size:15px;line-height:1.6">Hi ${firstName},</p>
      ${hasQuizResult 
        ? `<p style="font-size:14px;line-height:1.6;color:#64748b">You took our platform quiz — your personalised results are still available. Have you had a chance to check out the top match?</p>
           <div style="text-align:center;margin:20px 0">
             <a href="${SITE_URL}/quiz" style="display:inline-block;padding:12px 32px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">View My Results →</a>
           </div>`
        : `<p style="font-size:14px;line-height:1.6;color:#64748b">We've built a 60-second quiz that matches you with the best platform based on your investing style, budget, and goals.</p>
           <div style="text-align:center;margin:20px 0">
             <a href="${SITE_URL}/quiz" style="display:inline-block;padding:12px 32px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">Take the Quiz →</a>
           </div>`
      }
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:16px;border:1px solid #e2e8f0">
        <p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 6px">Need professional help instead?</p>
        <p style="font-size:13px;color:#64748b;margin:0 0 10px">Browse verified SMSF accountants, financial planners, and tax agents.</p>
        <a href="${SITE_URL}/find-advisor" style="color:#7c3aed;font-size:13px;font-weight:600;text-decoration:none">Find an Advisor →</a>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">Invest.com.au — compare platforms & find advisors.</p>
    </div></div>`;
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 500 });
  }

  const supabase = createAdminClient();

  const now = new Date();
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 86400000).toISOString();
  let emailsSent = 0;
  let skipped = 0;

  // Get recent email captures (exclude bounced)
  const { data: captures } = await supabase
    .from("email_captures")
    .select("email, name, source, context, created_at")
    .gte("created_at", fifteenDaysAgo)
    .neq("status", "bounced")
    .order("created_at", { ascending: true })
    .limit(200);

  // Get recent quiz leads (exclude unsubscribed)
  const { data: quizLeads } = await supabase
    .from("quiz_leads")
    .select("email, name, created_at, top_match_slug, experience_level, investment_range, trading_interest")
    .gte("created_at", fifteenDaysAgo)
    .neq("unsubscribed", true)
    .order("created_at", { ascending: true })
    .limit(200);

  // Merge into unique emails with earliest signup date and quiz context
  interface UserInfo {
    name: string;
    signupDate: Date;
    hasQuiz: boolean;
    context: BrokerRecommendationContext;
  }
  const emailMap = new Map<string, UserInfo>();

  for (const c of captures || []) {
    if (!c.email) continue;
    const email = c.email.toLowerCase().trim();
    if (!emailMap.has(email)) {
      // Extract context from email_captures.context JSONB if available
      const captureCtx = (c as Record<string, unknown>).context as Record<string, string> | null;
      emailMap.set(email, {
        name: c.name || "",
        signupDate: new Date(c.created_at),
        hasQuiz: false,
        context: captureCtx ? {
          experience_level: captureCtx.experience_level,
          investment_range: captureCtx.investment_range,
          trading_interest: captureCtx.trading_interest,
          top_match_slug: captureCtx.top_match_slug,
          source: c.source || undefined,
        } : { source: c.source || undefined },
      });
    }
  }
  for (const q of quizLeads || []) {
    if (!q.email) continue;
    const email = q.email.toLowerCase().trim();
    const quizCtx: BrokerRecommendationContext = {
      experience_level: q.experience_level || undefined,
      investment_range: q.investment_range || undefined,
      trading_interest: q.trading_interest || undefined,
      top_match_slug: q.top_match_slug || undefined,
      source: "quiz",
    };
    const existing = emailMap.get(email);
    if (existing) {
      existing.hasQuiz = true;
      // Quiz data is richer, merge it into context
      existing.context = { ...existing.context, ...quizCtx };
    } else {
      emailMap.set(email, {
        name: q.name || "",
        signupDate: new Date(q.created_at),
        hasQuiz: true,
        context: quizCtx,
      });
    }
  }

  // Get already-sent drips
  const { data: sentDrips } = await supabase
    .from("investor_drip_log")
    .select("email, drip_number")
    .gte("sent_at", fifteenDaysAgo);

  const sentSet = new Set((sentDrips || []).map(d => `${d.email}:${d.drip_number}`));

  const dripSchedule = [
    { number: 1, minDays: 0, subject: "Welcome to Invest.com.au" },
    { number: 2, minDays: 2, subject: "Are you overpaying your broker?" },
    { number: 3, minDays: 5, subject: "Find your perfect platform" },
    { number: 4, minDays: 7, subject: "Your top 3 broker matches" },
    { number: 5, minDays: 10, subject: "One final recommendation" },
  ];

  for (const [email, info] of emailMap) {
    const daysSinceSignup = Math.floor((now.getTime() - info.signupDate.getTime()) / 86400000);
    const firstName = (info.name || "").split(" ")[0] || "there";

    for (const drip of dripSchedule) {
      if (daysSinceSignup < drip.minDays) continue;
      if (sentSet.has(`${email}:${drip.number}`)) continue;

      // Send the email
      try {
        let html: string;
        let brokerRecommendations: unknown = undefined;

        if (drip.number === 1) {
          html = welcomeEmail(info.name);
        } else if (drip.number === 2) {
          html = bestContentEmail(info.name);
        } else if (drip.number === 3) {
          html = personalRecEmail(info.name, info.hasQuiz);
        } else if (drip.number === 4) {
          // Day 7: Top 3 broker matches using personalized recommendations
          const brokers = await getPersonalizedBrokers(info.context, {
            email,
            dripNumber: 4,
          });
          if (brokers.length === 0) continue; // Skip if no brokers available
          html = brokerDripEmail4(firstName, brokers);
          brokerRecommendations = brokers.map((b) => ({
            slug: b.slug,
            name: b.name,
            position: brokers.indexOf(b) + 1,
          }));
        } else if (drip.number === 5) {
          // Day 10: Final recommendation — #1 match with any active deal
          const brokers = await getPersonalizedBrokers(info.context, {
            email,
            dripNumber: 5,
          });
          if (brokers.length === 0) continue;
          const topBroker = brokers[0];

          // Check if the top broker has an active deal
          const { data: dealData } = await supabase
            .from("brokers")
            .select("deal, deal_text")
            .eq("slug", topBroker.slug)
            .eq("deal", true)
            .maybeSingle();

          const hasDeal = !!dealData?.deal;
          const dealText = dealData?.deal_text || undefined;

          html = brokerDripEmail5(firstName, topBroker, hasDeal, dealText);
          brokerRecommendations = [{
            slug: topBroker.slug,
            name: topBroker.name,
            position: 1,
            has_deal: hasDeal,
          }];
        } else {
          continue;
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Invest.com.au <hello@invest.com.au>",
            to: email,
            subject: drip.subject,
            html,
          }),
        });

        if (res.ok) {
          await supabase.from("investor_drip_log").insert({
            email,
            drip_number: drip.number,
            drip_type: "investor",
            sent_at: now.toISOString(),
            ...(brokerRecommendations ? { broker_recommendations: brokerRecommendations } : {}),
          });
          emailsSent++;
        }
      } catch (err) {
        log.warn("Investor drip email failed", { err: err instanceof Error ? err.message : String(err), email, dripNumber: drip.number });
      }

      // Only send one drip per user per run
      break;
    }
    skipped++;
  }

  return NextResponse.json({
    processed: emailMap.size,
    emails_sent: emailsSent,
    skipped,
    timestamp: now.toISOString(),
  });
}
