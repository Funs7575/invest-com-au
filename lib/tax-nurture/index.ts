/**
 * Tax-time nurture funnel — 3-step email sequence to investors who started
 * a `tax_help` Get Matched action plan and never converted it to a brief.
 *
 * Age buckets (created_at offset from now):
 *   - 14d → step 1 (educational: "5 things to check before EOFY")
 *   - 21d → step 2 (vertical: "EOFY for SMSF investors")
 *   - 28d → step 3 (soft CTA: "Ready to talk to a tax pro?")
 *
 * The window is 29d–21d to capture plans that crossed each age boundary
 * since the last cron run (daily). Per-step idempotency is enforced by the
 * unique (plan_id, step) constraint on `tax_nurture_sends`.
 *
 * Orchestrator writes the idempotency row BEFORE the Resend call so a
 * crash still leaves a marker. Per-recipient try/catch isolates failures.
 */
// eslint-disable-next-line no-restricted-imports -- cross-user fan-out under a cron context with no user JWT; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";

const log = logger("cron:tax-nurture");

const FROM = "Invest.com.au <hello@invest.com.au>";

export interface TaxNurtureRunResult {
  considered: number;
  sent: number;
  skipped_idempotent: number;
  skipped_no_email: number;
  failed: number;
}

export type TaxNurtureStep = 1 | 2 | 3;

interface CandidatePlan {
  id: number;
  email: string | null;
  auth_user_id: string | null;
  created_at: string;
  linked_brief_id: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Map a plan's age (in whole days) to the step it should receive now,
 * or `null` if it falls outside the funnel.
 */
export function stepForAgeDays(ageDays: number): TaxNurtureStep | null {
  if (ageDays === 14) return 1;
  if (ageDays === 21) return 2;
  if (ageDays === 28) return 3;
  return null;
}

export async function runTaxNurture(
  now: Date = new Date(),
): Promise<TaxNurtureRunResult> {
  const admin = createAdminClient();
  const result: TaxNurtureRunResult = {
    considered: 0,
    sent: 0,
    skipped_idempotent: 0,
    skipped_no_email: 0,
    failed: 0,
  };

  // Window: plans created between 29 days ago and 14 days ago. We bucket
  // each by exact age (in days) to pick a step.
  const windowStart = new Date(now.getTime() - 29 * DAY_MS);
  const windowEnd = new Date(now.getTime() - 14 * DAY_MS);

  const { data: plans, error } = await admin
    .from("get_matched_action_plans")
    .select("id, email, auth_user_id, created_at, linked_brief_id")
    .eq("intent_slug", "tax_help")
    .is("linked_brief_id", null)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString());

  if (error) {
    log.error("query failed", { err: error.message });
    return result;
  }
  if (!plans || plans.length === 0) return result;

  for (const plan of plans as CandidatePlan[]) {
    result.considered++;
    const createdAt = new Date(plan.created_at);
    const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS);
    const step = stepForAgeDays(ageDays);
    if (step === null) continue;

    if (!plan.email) {
      result.skipped_no_email++;
      continue;
    }

    // Idempotency: skip if (plan_id, step) already exists.
    const { data: prior } = await admin
      .from("tax_nurture_sends")
      .select("id")
      .eq("plan_id", plan.id)
      .eq("step", step)
      .maybeSingle();
    if (prior) {
      result.skipped_idempotent++;
      continue;
    }

    // Write the marker FIRST so a crash leaves an audit trail. If the
    // unique constraint trips (concurrent runner), count as idempotent.
    const { error: writeErr } = await admin.from("tax_nurture_sends").insert({
      plan_id: plan.id,
      auth_user_id: plan.auth_user_id,
      email: plan.email,
      step,
    });
    if (writeErr) {
      if (writeErr.code === "23505") {
        result.skipped_idempotent++;
        continue;
      }
      log.warn("marker insert failed", {
        plan_id: plan.id,
        step,
        err: writeErr.message,
      });
      result.failed++;
      continue;
    }

    try {
      const ok = await sendStepEmail({
        to: plan.email,
        planId: plan.id,
        step,
      });
      if (ok) {
        result.sent++;
      } else {
        result.failed++;
      }
    } catch (err) {
      log.warn("send failed", {
        plan_id: plan.id,
        step,
        err: err instanceof Error ? err.message : String(err),
      });
      result.failed++;
    }
  }

  return result;
}

// ─── Templates ───────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrap(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#334155"><div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:18px">${escapeHtml(title)}</h1></div><div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">${body}<p style="font-size:11px;color:#94a3b8;margin-top:24px">General information only &mdash; not personal advice. Manage email preferences at <a href="${SITE_URL}/account/notifications" style="color:#94a3b8">${SITE_URL}/account/notifications</a>.</p></div></div>`;
}

interface TemplateContent {
  subject: string;
  html: string;
  text: string;
}

export function renderStepTemplate(step: TaxNurtureStep, planId: number): TemplateContent {
  const ctaHref = `${SITE_URL}/get-matched?intent=tax_help&plan_id=${encodeURIComponent(
    String(planId),
  )}`;
  if (step === 1) {
    const subject = "5 things to check before EOFY";
    const html = wrap(
      "Invest.com.au — 5 things to check before EOFY",
      `<p style="font-size:15px;margin:0 0 8px 0">Hi there,</p>
<p style="font-size:14px;color:#475569">EOFY is approaching. Whether you're a PAYG investor or running an SMSF, a quick review now can make a real difference at lodgement.</p>
<ol style="font-size:14px;color:#475569;padding-left:20px;margin:12px 0">
  <li style="margin:6px 0">Reconcile dividend and distribution statements against your broker reports.</li>
  <li style="margin:6px 0">Confirm cost base for any sold shares — including DRP and corporate actions.</li>
  <li style="margin:6px 0">Review concessional and non-concessional super contribution caps before 30 June.</li>
  <li style="margin:6px 0">Document any work-from-home or investment-related expenses with receipts.</li>
  <li style="margin:6px 0">Check whether you've crossed thresholds (Div 293, Medicare surcharge) that change strategy.</li>
</ol>
<p style="font-size:13px;color:#64748b">You picked "Tax help" when you went through Get Matched. When you're ready, we can route you to a verified tax professional.</p>`,
    );
    const text = [
      "Invest.com.au — 5 things to check before EOFY",
      "",
      "Hi there,",
      "",
      "EOFY is approaching. Whether you're a PAYG investor or running an SMSF, a quick review now can make a real difference at lodgement.",
      "",
      "1. Reconcile dividend and distribution statements against your broker reports.",
      "2. Confirm cost base for any sold shares — including DRP and corporate actions.",
      "3. Review concessional and non-concessional super contribution caps before 30 June.",
      "4. Document any work-from-home or investment-related expenses with receipts.",
      "5. Check whether you've crossed thresholds (Div 293, Medicare surcharge) that change strategy.",
      "",
      `Manage email preferences: ${SITE_URL}/account/notifications`,
      "General information only — not personal advice.",
    ].join("\n");
    return { subject, html, text };
  }
  if (step === 2) {
    const subject = "EOFY for SMSF investors";
    const html = wrap(
      "Invest.com.au — EOFY for SMSF investors",
      `<p style="font-size:15px;margin:0 0 8px 0">Hi there,</p>
<p style="font-size:14px;color:#475569">If you run a self-managed super fund, EOFY is more than a checklist — it's a compliance event. Here are the items SMSF investors most often miss:</p>
<ul style="font-size:14px;color:#475569;padding-left:20px;margin:12px 0">
  <li style="margin:6px 0">Trustee minutes for every investment decision in the year.</li>
  <li style="margin:6px 0">Market valuation of each asset at 30 June (especially unlisted assets and property).</li>
  <li style="margin:6px 0">Investment strategy review — ATO expects an annual sign-off.</li>
  <li style="margin:6px 0">Pension payments meeting minimum draw-downs if you're in pension phase.</li>
  <li style="margin:6px 0">Contribution caps — concessional and non-concessional — applied across all funds.</li>
</ul>
<p style="font-size:13px;color:#64748b">Most SMSF specialists run a pre-EOFY check in May–June. If you'd like to be matched with one, reply to this email or revisit your plan.</p>`,
    );
    const text = [
      "Invest.com.au — EOFY for SMSF investors",
      "",
      "Hi there,",
      "",
      "If you run a self-managed super fund, EOFY is more than a checklist — it's a compliance event. Here are the items SMSF investors most often miss:",
      "",
      "- Trustee minutes for every investment decision in the year.",
      "- Market valuation of each asset at 30 June (especially unlisted assets and property).",
      "- Investment strategy review — ATO expects an annual sign-off.",
      "- Pension payments meeting minimum draw-downs if you're in pension phase.",
      "- Contribution caps — concessional and non-concessional — applied across all funds.",
      "",
      "Most SMSF specialists run a pre-EOFY check in May–June.",
      "",
      `Manage email preferences: ${SITE_URL}/account/notifications`,
      "General information only — not personal advice.",
    ].join("\n");
    return { subject, html, text };
  }
  // step === 3
  const subject = "Ready to talk to a tax pro?";
  const html = wrap(
    "Invest.com.au — Ready to talk to a tax pro?",
    `<p style="font-size:15px;margin:0 0 8px 0">Hi there,</p>
<p style="font-size:14px;color:#475569">A few weeks ago you started a Get Matched plan flagged for tax help. If EOFY's still on your mind, a 30-minute chat with a verified Australian tax professional usually resolves the ambiguity — and pays for itself if you've missed a deduction.</p>
<div style="text-align:center;margin:24px 0"><a href="${ctaHref}" style="display:inline-block;padding:12px 32px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Continue my plan &rarr;</a></div>
<p style="font-size:13px;color:#64748b">No obligation, no card required. We'll only match you with professionals licensed in your state.</p>`,
  );
  const text = [
    "Invest.com.au — Ready to talk to a tax pro?",
    "",
    "Hi there,",
    "",
    "A few weeks ago you started a Get Matched plan flagged for tax help. If EOFY's still on your mind, a 30-minute chat with a verified Australian tax professional usually resolves the ambiguity — and pays for itself if you've missed a deduction.",
    "",
    `Continue my plan: ${ctaHref}`,
    "",
    "No obligation, no card required. We'll only match you with professionals licensed in your state.",
    "",
    `Manage email preferences: ${SITE_URL}/account/notifications`,
    "General information only — not personal advice.",
  ].join("\n");
  return { subject, html, text };
}

async function sendStepEmail(input: {
  to: string;
  planId: number;
  step: TaxNurtureStep;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    log.warn("RESEND_API_KEY not set — skipping tax-nurture send", {
      to: input.to,
      step: input.step,
    });
    return false;
  }
  const tpl = renderStepTemplate(input.step, input.planId);
  const { ok, error } = await sendEmail({
    from: FROM,
    to: input.to,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
  if (!ok) {
    log.warn("Resend send rejected", {
      to: input.to,
      step: input.step,
      error,
    });
  }
  return ok;
}
