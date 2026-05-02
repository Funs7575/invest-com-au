import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";
import { buildEmailToUserIdMap, notifyUser } from "@/lib/notifications";

const log = logger("cron:abandoned-quiz-drip");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Daily cron — "abandoned quiz" re-engagement.
 *
 * Target audience: users who completed the quiz and submitted their
 * email (so we have consent) but never followed through with an
 * advisor enquiry or broker click. The audit found this was a
 * 40% segment with no nudge at all.
 *
 * Step 1 — 48h: "Here's your top match" soft nudge
 * Step 2 — 7d:  "Still thinking about it?" with a new angle
 * Step 3 — 14d: Final email, then stop.
 *
 * Idempotency: we stamp `drip_step` and `drip_last_sent_at` on the
 * quiz_leads row so a retry or duplicate cron run can't double-send.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("abandoned_quiz_drip")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const stats = {
    scanned: 0,
    sent_step_1: 0,
    sent_step_2: 0,
    sent_step_3: 0,
    skipped: 0,
    failed: 0,
    inboxed: 0,
  };

  // Pre-load email→user_id once so per-lead inbox drops are O(1).
  // Most quiz leads are email-only — a minority will have since
  // signed up, and only those land in the in-app inbox.
  const emailToUserId = await buildEmailToUserIdMap();

  // Look at quiz leads from the last 21 days that haven't been
  // fully dripped and have no follow-through event yet.
  const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();

  const { data: leads, error } = await supabase
    .from("quiz_leads")
    // inferred_vertical drives template selection; goal is read for finer
    // template choice (e.g. super-vs-property under the property vertical).
    // Both columns are populated by /api/quiz-lead since 2026-05-02; older
    // rows have nulls and fall through to the default broker template.
    .select("id, email, name, captured_at, drip_step, drip_last_sent_at, unsubscribed, converted_at, inferred_vertical, goal")
    .gte("captured_at", twentyOneDaysAgo)
    .is("converted_at", null)
    .neq("unsubscribed", true)
    .order("captured_at", { ascending: true })
    .limit(1000);

  if (error) {
    log.error("Failed to fetch quiz_leads", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  stats.scanned = leads?.length || 0;

  for (const lead of leads || []) {
    try {
      const age = now.getTime() - new Date(lead.captured_at as string).getTime();
      const ageDays = age / (24 * 60 * 60 * 1000);
      const lastSent = lead.drip_last_sent_at
        ? new Date(lead.drip_last_sent_at as string)
        : null;
      const hoursSinceLast = lastSent
        ? (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)
        : Infinity;
      const currentStep = (lead.drip_step as number) || 0;

      let nextStep = 0;
      if (currentStep === 0 && ageDays >= 2) nextStep = 1;
      else if (currentStep === 1 && ageDays >= 7 && hoursSinceLast >= 24) nextStep = 2;
      else if (currentStep === 2 && ageDays >= 14 && hoursSinceLast >= 24) nextStep = 3;
      else {
        stats.skipped++;
        continue;
      }

      await sendStepEmail(
        lead.email as string,
        lead.name as string | null,
        nextStep,
        (lead.inferred_vertical as string | null) ?? null,
        (lead.goal as string | null) ?? null,
      );

      // Drop a matching in-app notification when the user has signed up
      // post-quiz. The same email_delivery_key the cron already uses
      // (drip step + lead id) keeps dedup tight across replay + retries.
      const userId = emailToUserId.get((lead.email as string).toLowerCase());
      if (userId) {
        const titleByStep: Record<number, string> = {
          1: "Your top broker match is waiting",
          2: "Still researching? Here's what to do next",
          3: "Last check-in on your quiz result",
        };
        const ok = await notifyUser({
          userId,
          type: "system",
          title: titleByStep[nextStep] || "Update on your quiz",
          body: "We've lined up your top match + a side-by-side compare. It takes 30 seconds to review.",
          linkUrl: "/quiz",
          emailDeliveryKey: `abandoned_quiz:${lead.id}:${nextStep}`,
        });
        if (ok) stats.inboxed += 1;
      }

      await supabase
        .from("quiz_leads")
        .update({
          drip_step: nextStep,
          drip_last_sent_at: now.toISOString(),
        })
        .eq("id", lead.id);

      if (nextStep === 1) stats.sent_step_1++;
      if (nextStep === 2) stats.sent_step_2++;
      if (nextStep === 3) stats.sent_step_3++;
    } catch (err) {
      stats.failed++;
      log.error("abandoned quiz drip per-lead failure", {
        id: lead.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("abandoned quiz drip completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

/**
 * Vertical-aware drip templates.
 *
 * Each vertical defines step 1/2/3 with copy + CTAs that match what the
 * user actually came for. Previously every lead got the same broker-flavoured
 * sequence regardless of their goal; a super-fund quiz-taker would get a
 * "compare brokers" email at step 2 even though super isn't a brokerage
 * decision.
 *
 * Default vertical is "broker" — covers shares/income/grow/automate goals
 * and any leads that pre-date inferred_vertical persistence (will arrive
 * with inferred_vertical = null).
 */
type StepTemplate = { subject: string; body: (name: string) => string };
type VerticalKey =
  | "broker"
  | "super"
  | "crypto"
  | "property"
  | "advisor"
  | "international"
  | "home"
  | "robo"
  | "cfd";

const FOOT = (name: string) =>
  `<h2 style="color:#0f172a;font-size:18px">Hi ${escapeHtml(name || "there")},</h2>`;

const cta = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${label}</a></p>`;

const link = (href: string, label: string) =>
  `<p style="margin:14px 0"><a href="${href}" style="color:#0f172a;font-weight:600">${label} →</a></p>`;

const para = (text: string) =>
  `<p style="color:#334155;font-size:14px;line-height:1.6">${text}</p>`;

const VERTICAL_TEMPLATES: Record<VerticalKey, [StepTemplate, StepTemplate, StepTemplate]> = {
  broker: [
    {
      subject: "Your top broker match is waiting",
      body: (name) => `${FOOT(name)}${para("You took our quiz a couple of days ago — your top platform match is still waiting. 30 seconds to review.")}${cta(`${getSiteUrl()}/quiz`, "See my match →")}`,
    },
    {
      subject: "Still researching? Compare your top picks side-by-side",
      body: (name) => `${FOOT(name)}${para("Most of our quiz-takers pick a broker within a week. Two tools that close the deal — the side-by-side compare table, and the fee-impact calculator.")}${link(`${getSiteUrl()}/compare`, "Compare brokers side-by-side")}${link(`${getSiteUrl()}/fee-impact`, "Calculate what fees cost you")}`,
    },
    {
      subject: "Last check-in on your broker quiz",
      body: (name) => `${FOOT(name)}${para("Last email in this sequence. If you've decided to wait, no worries. If something specific is holding you back, hit reply.")}`,
    },
  ],

  super: [
    {
      subject: "Your retirement number — and the fund to get there",
      body: (name) => `${FOOT(name)}${para("You took our quiz looking at super. Before switching funds, run our retirement calculator — it shows what your balance becomes by retirement, and how a fund switch shifts the number.")}${cta(`${getSiteUrl()}/retirement-calculator`, "Run the retirement calc →")}${link(`${getSiteUrl()}/quiz`, "See your top fund match")}`,
    },
    {
      subject: "Could an SMSF save you money? Run the numbers",
      body: (name) => `${FOOT(name)}${para("If your super balance is approaching $200k and you want more control, an SMSF starts to make sense. Our SMSF calculator shows the break-even point — and a verified SMSF accountant can take it from there.")}${link(`${getSiteUrl()}/smsf-calculator`, "Run the SMSF calculator")}${link(`${getSiteUrl()}/advisors/smsf-accountants`, "Find an SMSF accountant")}`,
    },
    {
      subject: "One last super check-in",
      body: (name) => `${FOOT(name)}${para("Last email about your super quiz. If you've found a fund, great. If you'd like a financial planner to model your specific scenario, here's our directory.")}${link(`${getSiteUrl()}/advisors/financial-planners`, "Find a financial planner")}`,
    },
  ],

  crypto: [
    {
      subject: "Your crypto exchange match — plus the tax angle",
      body: (name) => `${FOOT(name)}${para("Your top crypto exchange match is waiting. One thing most beginners miss: ATO treats every disposal as a CGT event. Run our crypto-CGT calculator before tax time.")}${cta(`${getSiteUrl()}/quiz`, "See my exchange match →")}${link(`${getSiteUrl()}/cgt-calculator`, "Crypto CGT calculator")}`,
    },
    {
      subject: "Crypto tax getting complex? Get a specialist",
      body: (name) => `${FOOT(name)}${para("DeFi, staking, airdrops — the tax treatment is genuinely complicated and a specialist usually saves more than their fee. We have a directory of crypto-savvy tax agents.")}${link(`${getSiteUrl()}/advisors/tax-agents`, "Find a crypto tax agent")}${link(`${getSiteUrl()}/compare?filter=crypto`, "Compare crypto exchanges")}`,
    },
    {
      subject: "Last crypto-quiz check-in",
      body: (name) => `${FOOT(name)}${para("Final email on your crypto quiz. If you'd like to ask anything specific, hit reply — happy to point you somewhere useful.")}`,
    },
  ],

  property: [
    {
      subject: "Property numbers first — then the platform",
      body: (name) => `${FOOT(name)}${para("Property is a numbers game. Before you talk to a buyer's agent or mortgage broker, run the yield + cash-flow numbers. Our calculator does it in 60 seconds.")}${cta(`${getSiteUrl()}/property-yield-calculator`, "Run the yield calc →")}${link(`${getSiteUrl()}/property-vs-shares-calculator`, "Property vs shares calculator")}`,
    },
    {
      subject: "Mortgage broker + buyer's agent — your property team",
      body: (name) => `${FOOT(name)}${para("Most successful property investors use a team — a mortgage broker (free, paid by the lender) for the loan, and a buyer's agent for off-market deals. Both directories are linked below.")}${link(`${getSiteUrl()}/advisors/mortgage-brokers`, "Find a mortgage broker")}${link(`${getSiteUrl()}/advisors/buyers-agents`, "Find a buyer's agent")}`,
    },
    {
      subject: "Last property check-in",
      body: (name) => `${FOOT(name)}${para("Last email on your property quiz. Property is slow — when you're ready to move, the calculators and directories are still here.")}`,
    },
  ],

  advisor: [
    {
      subject: "Your matched advisor is ready to talk",
      body: (name) => `${FOOT(name)}${para("Your shortlisted advisor is still in your match queue. Most respond within 24 hours of contact — no obligation, no upfront fee for the first call.")}${cta(`${getSiteUrl()}/quiz`, "See my advisor match →")}${link(`${getSiteUrl()}/find-advisor`, "Browse the full directory")}`,
    },
    {
      subject: "Or post your situation — get quotes from verified pros",
      body: (name) => `${FOOT(name)}${para("If your situation doesn't fit a single advisor type, post a brief instead. Verified pros across multiple disciplines reply with quotes — you compare and pick.")}${link(`${getSiteUrl()}/quotes/post`, "Post your situation")}${link(`${getSiteUrl()}/find-advisor`, "Browse the full directory")}`,
    },
    {
      subject: "Last advisor-quiz check-in",
      body: (name) => `${FOOT(name)}${para("Final email on your advisor quiz. If you'd like a specific introduction, hit reply with what you're looking for.")}`,
    },
  ],

  international: [
    {
      subject: "Your Australian-investing specialist is waiting",
      body: (name) => `${FOOT(name)}${para("Investing in Australia from overseas usually starts with a specialist — cross-border tax, FIRB, and visa rules dominate the decision. Your matched advisor is still in queue.")}${cta(`${getSiteUrl()}/quiz`, "See my match →")}${link(`${getSiteUrl()}/find-advisor?intl=true`, "Browse all international specialists")}`,
    },
    {
      subject: "FIRB, non-resident tax, expat super — handled",
      body: (name) => `${FOOT(name)}${para("Three areas where international investors pay the most: FIRB approval (property), non-resident dividend tax, and expat super contribution caps. Our directory is filtered to specialists.")}${link(`${getSiteUrl()}/advisors/tax-agents`, "Cross-border tax agents")}${link(`${getSiteUrl()}/advisors/buyers-agents`, "FIRB-accredited buyer's agents")}`,
    },
    {
      subject: "Last international check-in",
      body: (name) => `${FOOT(name)}${para("Last email on your international quiz. If you'd like a specific introduction (FIRB, expat super, non-resident tax), hit reply.")}`,
    },
  ],

  home: [
    {
      subject: "Mortgage repayments first — broker after",
      body: (name) => `${FOOT(name)}${para("Before talking to a mortgage broker, model your repayments at a few rate points. Then a broker (free, paid by the lender) compares 30+ lenders to find your best rate.")}${cta(`${getSiteUrl()}/mortgage-calculator`, "Mortgage calculator →")}${link(`${getSiteUrl()}/advisors/mortgage-brokers`, "Find a mortgage broker")}`,
    },
    {
      subject: "Refinancing? Run the switching calculator",
      body: (name) => `${FOOT(name)}${para("Most home-loan customers are on rates 0.5–1.5% above the best available. Our switching calculator shows the savings — most refinances pay back in under 12 months.")}${link(`${getSiteUrl()}/switching-calculator`, "Switching calculator")}${link(`${getSiteUrl()}/advisors/mortgage-brokers`, "Find a mortgage broker")}`,
    },
    {
      subject: "Last home-loan check-in",
      body: (name) => `${FOOT(name)}${para("Last email on your home-loan quiz. The calculators and directory are here when you're ready.")}`,
    },
  ],

  robo: [
    {
      subject: "Your robo-advisor match — set & forget",
      body: (name) => `${FOOT(name)}${para("Your top robo-advisor match is still in queue. The pitch: lower fees than a financial planner, automatic rebalancing, no minimums on most. 30 seconds to review.")}${cta(`${getSiteUrl()}/quiz`, "See my match →")}`,
    },
    {
      subject: "Robo + super: the lazy-investor stack",
      body: (name) => `${FOOT(name)}${para("Most robo-advisor users also optimise their super. Our compound-interest calculator shows what the combination does over 20+ years — usually surprising.")}${link(`${getSiteUrl()}/compound-interest-calculator`, "Compound interest calculator")}${link(`${getSiteUrl()}/super`, "Super hub")}`,
    },
    {
      subject: "Last robo-advisor check-in",
      body: (name) => `${FOOT(name)}${para("Final robo-advisor follow-up. If something specific is holding you back, hit reply.")}`,
    },
  ],

  cfd: [
    {
      subject: "Your CFD/forex platform match — and the spread maths",
      body: (name) => `${FOOT(name)}${para("CFD/forex margins live in spreads + commissions, not headline rates. Our trade-cost calculator shows real round-trip cost. Top match is still in queue.")}${cta(`${getSiteUrl()}/quiz`, "See my match →")}${link(`${getSiteUrl()}/trade-cost-calculator`, "Trade cost calculator")}`,
    },
    {
      subject: "Active trader? Tax adds up — talk to a specialist",
      body: (name) => `${FOOT(name)}${para("Active CFD/forex trading produces a lot of CGT events. A trader-friendly tax agent saves time and usually saves more than the fee.")}${link(`${getSiteUrl()}/advisors/tax-agents`, "Find a tax agent")}${link(`${getSiteUrl()}/cfd`, "CFD/forex hub")}`,
    },
    {
      subject: "Last CFD/forex check-in",
      body: (name) => `${FOOT(name)}${para("Last email on your CFD/forex quiz. Spreads, leverage, and tax — we've got hubs for each when you're ready.")}`,
    },
  ],
};

function selectVerticalTemplate(
  step: number,
  inferredVertical: string | null,
  goal: string | null,
): StepTemplate | null {
  if (step < 1 || step > 3) return null;
  // Map inferred_vertical → template key, with a goal-based override for
  // super so a property-sub=property-super lead gets the super track even
  // if vertical was inferred as "property".
  const overrideKey: VerticalKey | null =
    goal === "super" || goal === "property-super" ? "super" : null;
  const key: VerticalKey = (overrideKey
    ?? (inferredVertical as VerticalKey | null)
    ?? "broker") as VerticalKey;
  const variants = VERTICAL_TEMPLATES[key] ?? VERTICAL_TEMPLATES.broker;
  return variants[step - 1] ?? null;
}

async function sendStepEmail(
  email: string,
  name: string | null,
  step: number,
  inferredVertical: string | null,
  goal: string | null,
): Promise<void> {
  const template = selectVerticalTemplate(step, inferredVertical, goal);
  if (!template || !process.env.RESEND_API_KEY) return;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      ${template.body(name || "")}
      <p style="color:#94a3b8;font-size:11px;margin-top:32px">
        You're getting this because you took our investing quiz.
        <a href="${getSiteUrl()}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <hello@invest.com.au>",
      to: [email],
      subject: template.subject,
      html,
    }),
  }).catch((err) => log.warn("resend send failed", { err: err instanceof Error ? err.message : String(err) }));
}

export const GET = wrapCronHandler("abandoned-quiz-drip", handler);
