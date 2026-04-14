import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";

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
  };

  // Look at quiz leads from the last 21 days that haven't been
  // fully dripped and have no follow-through event yet.
  const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();

  const { data: leads, error } = await supabase
    .from("quiz_leads")
    .select("id, email, name, captured_at, drip_step, drip_last_sent_at, unsubscribed, converted_at")
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

      await sendStepEmail(lead.email as string, lead.name as string | null, nextStep);

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

const STEP_TEMPLATES: Array<{ subject: string; body: (name: string) => string }> = [
  { subject: "", body: () => "" }, // step 0 placeholder
  {
    subject: "Your top match is waiting",
    body: (name) => `
      <h2 style="color:#0f172a;font-size:18px">Hi ${escapeHtml(name || "there")},</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        You took our quiz a couple of days ago but haven't checked
        out your match yet. Your top result is waiting — it takes
        30 seconds to review.
      </p>
      <p style="margin:24px 0"><a href="${getSiteUrl()}/quiz" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">See my match →</a></p>`,
  },
  {
    subject: "Still researching? Here's what most users do next",
    body: (name) => `
      <h2 style="color:#0f172a;font-size:18px">Hi ${escapeHtml(name || "there")},</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        Most of our quiz-takers pick a broker within a week. The
        usual hold-ups are fees and onboarding — so we built a
        free fee calculator and a side-by-side compare tool.
      </p>
      <p style="margin:16px 0"><a href="${getSiteUrl()}/fee-impact" style="color:#0f172a;font-weight:600">Calculate what fees cost you →</a></p>
      <p style="margin:16px 0"><a href="${getSiteUrl()}/compare" style="color:#0f172a;font-weight:600">Compare brokers side-by-side →</a></p>`,
  },
  {
    subject: "Last check-in from Invest.com.au",
    body: (name) => `
      <h2 style="color:#0f172a;font-size:18px">Hi ${escapeHtml(name || "there")},</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        This is the last email you'll get from the quiz follow-up
        sequence. If you've decided to wait, no worries — we'll be
        here when you're ready. And if there's something specific
        holding you back, hit reply and let us know.
      </p>`,
  },
];

async function sendStepEmail(email: string, name: string | null, step: number): Promise<void> {
  const template = STEP_TEMPLATES[step];
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
