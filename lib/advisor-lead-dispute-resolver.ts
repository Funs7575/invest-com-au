/**
 * Side-effect side of the advisor lead dispute auto-resolver.
 *
 * The classifier in `./advisor-lead-disputes.ts` is pure — it just
 * decides. This file applies the decision: credits the advisor back,
 * updates the dispute row, and fires email notifications.
 *
 * Split so the classifier can be unit-tested in isolation without
 * mocking Supabase, Stripe or email.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { ADMIN_EMAIL } from "@/lib/admin";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { recordFinancialAudit } from "@/lib/financial-audit";
import {
  classifyDispute,
  type AutoResolveResult,
  type ClassifierContext,
  type DisputeReason,
  type LeadForClassifier,
  type AdvisorForClassifier,
} from "@/lib/advisor-lead-disputes";

const log = logger("advisor-lead-dispute-resolver");

/**
 * Load a dispute + its lead + its advisor from Supabase and produce
 * a ClassifierContext suitable for passing to classifyDispute().
 *
 * Returns null if the dispute or its dependencies can't be loaded —
 * the caller should escalate in that case.
 */
export async function buildClassifierContext(
  disputeId: number,
): Promise<
  | { ok: true; ctx: ClassifierContext; disputeStatus: string; billAmountCents: number }
  | { ok: false; reason: string }
> {
  const supabase = createAdminClient();

  const { data: dispute, error: disputeErr } = await supabase
    .from("lead_disputes")
    .select("id, lead_id, professional_id, reason, reason_code, details, status")
    .eq("id", disputeId)
    .maybeSingle();

  if (disputeErr || !dispute) {
    return { ok: false, reason: "dispute_not_found" };
  }

  if (dispute.status !== "pending") {
    return { ok: false, reason: `dispute_already_${dispute.status}` };
  }

  const { data: lead, error: leadErr } = await supabase
    .from("professional_leads")
    .select(
      "id, user_name, user_email, user_phone, message, source_page, utm_source, utm_campaign, quality_score, quality_signals, bill_amount_cents, created_at, responded_at",
    )
    .eq("id", dispute.lead_id)
    .maybeSingle();

  if (leadErr || !lead) {
    return { ok: false, reason: "lead_not_found" };
  }

  const { data: advisor, error: advisorErr } = await supabase
    .from("professionals")
    .select(
      "id, type, specialties, location_state, office_states, service_areas, min_client_balance_cents, accepts_international_clients",
    )
    .eq("id", dispute.professional_id)
    .maybeSingle();

  if (advisorErr || !advisor) {
    return { ok: false, reason: "advisor_not_found" };
  }

  // Count prior leads from same email in the last 90 days (excluding this one)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { count: priorLeadsByEmail } = await supabase
    .from("professional_leads")
    .select("id", { count: "exact", head: true })
    .eq("professional_id", dispute.professional_id)
    .eq("user_email", lead.user_email)
    .neq("id", lead.id)
    .gte("created_at", ninetyDaysAgo);

  // reason_code falls back to a parsed version of the free-text reason
  // for legacy disputes created before the enum existed
  const reasonCode = (dispute.reason_code || parseReasonCode(dispute.reason)) as DisputeReason;

  return {
    ok: true,
    disputeStatus: dispute.status,
    billAmountCents: lead.bill_amount_cents || 0,
    ctx: {
      lead: lead as LeadForClassifier,
      advisor: advisor as AdvisorForClassifier,
      reason: reasonCode,
      details: dispute.details,
      priorLeadsByEmail: priorLeadsByEmail || 0,
    },
  };
}

/**
 * Attempt to classify the free-text `reason` into a reason_code. Used
 * as a fallback for legacy rows that pre-date the enum column.
 */
function parseReasonCode(reason: string): DisputeReason {
  const r = reason.toLowerCase();
  if (r.includes("spam") || r.includes("fake") || r.includes("bot")) return "spam_or_fake";
  if (r.includes("specialty") || r.includes("wrong type") || r.includes("wrong service")) return "wrong_specialty";
  if (r.includes("area") || r.includes("location") || r.includes("state") || r.includes("catchment")) return "out_of_area";
  if (r.includes("unreachable") || r.includes("contact") || r.includes("no response")) return "unreachable";
  if (r.includes("duplicate") || r.includes("already")) return "duplicate";
  if (r.includes("minimum") || r.includes("under") || r.includes("too small")) return "under_minimum";
  return "other";
}

/**
 * Resolve a single dispute end-to-end: load it, classify it, apply
 * the verdict, update the row, notify the advisor.
 *
 * Idempotent — safe to run multiple times on the same dispute. The
 * load step bails out if the dispute isn't `pending`, so a retry
 * after a partial failure is a no-op.
 */
export async function autoResolveDispute(disputeId: number): Promise<{
  applied: boolean;
  verdict: AutoResolveResult["verdict"];
  confidence: AutoResolveResult["confidence"];
  reasons: string[];
  refundedCents: number;
}> {
  const built = await buildClassifierContext(disputeId);
  if (!built.ok) {
    log.warn("Auto-resolve skipped", { disputeId, reason: built.reason });
    return {
      applied: false,
      verdict: "escalate",
      confidence: "low",
      reasons: [built.reason],
      refundedCents: 0,
    };
  }

  const result = classifyDispute(built.ctx);

  log.info("Classifier verdict", {
    disputeId,
    verdict: result.verdict,
    confidence: result.confidence,
    reasons: result.reasons,
  });

  if (result.verdict === "escalate") {
    return applyEscalated(disputeId, result);
  }
  if (result.verdict === "refund") {
    return applyRefund(
      disputeId,
      built.ctx.advisor.id,
      built.ctx.lead.id,
      built.billAmountCents,
      result,
    );
  }
  return applyRejected(disputeId, result);
}

/** Mark dispute as escalated-for-human and notify admin. */
async function applyEscalated(
  disputeId: number,
  result: AutoResolveResult,
) {
  const supabase = createAdminClient();
  // Leave status='pending' so the admin dashboard picks it up; just
  // stamp the auto_resolved_* fields so admin sees the classifier ran.
  await supabase
    .from("lead_disputes")
    .update({
      auto_resolved_at: new Date().toISOString(),
      auto_resolved_verdict: "escalate",
      auto_resolved_confidence: result.confidence,
      auto_resolved_reasons: result.reasons,
    })
    .eq("id", disputeId);

  return {
    applied: true,
    verdict: result.verdict,
    confidence: result.confidence,
    reasons: result.reasons,
    refundedCents: 0,
  };
}

/**
 * Refund the advisor: credit back `credit_balance_cents`, mark the
 * lead `billed=false`, waive the advisor_billing row if any, and
 * close the dispute as approved.
 */
async function applyRefund(
  disputeId: number,
  advisorId: number,
  leadId: number,
  billAmountCents: number,
  result: AutoResolveResult,
) {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // Credit back the advisor's prepaid balance. Read-modify-write with
  // an optimistic lock so concurrent refunds don't race and under-
  // credit the advisor. Matches the pattern in advisor-enquiry.
  if (billAmountCents > 0) {
    const { data: advisor } = await supabase
      .from("professionals")
      .select("credit_balance_cents")
      .eq("id", advisorId)
      .single();
    const currentBalance = advisor?.credit_balance_cents || 0;

    const { error: creditErr } = await supabase
      .from("professionals")
      .update({
        credit_balance_cents: currentBalance + billAmountCents,
      })
      .eq("id", advisorId)
      .eq("credit_balance_cents", currentBalance);

    if (creditErr) {
      log.error("Credit refund failed — escalating", {
        disputeId,
        advisorId,
        billAmountCents,
        error: creditErr.message,
      });
      // Optimistic lock lost or DB error. Fall back to escalating so
      // a human can manually refund — we'd rather not auto-approve
      // a refund that didn't actually land in the advisor's balance.
      return applyEscalated(disputeId, {
        verdict: "escalate",
        confidence: "low",
        reasons: [...result.reasons, "credit_refund_failed_" + creditErr.message],
      });
    }

    // Financial audit trail — AFSL s912D record-keeping requirement.
    // Fire-and-forget; a failure here never blocks the refund.
    await recordFinancialAudit({
      actorType: "system",
      actorId: "advisor-lead-dispute-resolver",
      action: "refund",
      resourceType: "advisor_credit_balance",
      resourceId: advisorId,
      amountCents: billAmountCents,
      oldValue: { credit_balance_cents: currentBalance },
      newValue: { credit_balance_cents: currentBalance + billAmountCents },
      reason: `Auto-resolved dispute #${disputeId}: ${result.reasons.join(", ")}`,
      context: { disputeId, leadId, verdict: result.verdict, confidence: result.confidence },
    });
  }

  // Mark the lead no longer billed so it's clearly refunded in the
  // advisor-portal lead list. `outcome` is a soft label used in
  // analytics.
  await supabase
    .from("professional_leads")
    .update({
      billed: false,
      bill_amount_cents: 0,
      outcome: "refunded_dispute",
      updated_at: nowIso,
    })
    .eq("id", leadId);

  // Waive the advisor_billing row if one exists (it will for
  // invoice-based charges, may not for prepaid credit charges).
  await supabase
    .from("advisor_billing")
    .update({ status: "waived", updated_at: nowIso })
    .eq("lead_id", leadId)
    .in("status", ["pending", "invoiced"]);

  // Close the dispute
  await supabase
    .from("lead_disputes")
    .update({
      status: "approved",
      resolved_at: nowIso,
      auto_resolved_at: nowIso,
      auto_resolved_verdict: "refund",
      auto_resolved_confidence: result.confidence,
      auto_resolved_reasons: result.reasons,
      refunded_cents: billAmountCents,
      admin_notes: "Auto-resolved: refund",
    })
    .eq("id", disputeId);

  // Notify the advisor their refund landed (fire-and-forget)
  notifyAdvisorRefund(advisorId, leadId, billAmountCents, result.reasons).catch(
    (err) =>
      log.error("Refund notification email failed", {
        disputeId,
        err: err instanceof Error ? err.message : String(err),
      }),
  );

  log.info("Dispute auto-refunded", {
    disputeId,
    advisorId,
    billAmountCents,
    reasons: result.reasons,
  });

  return {
    applied: true,
    verdict: "refund" as const,
    confidence: result.confidence,
    reasons: result.reasons,
    refundedCents: billAmountCents,
  };
}

/** Mark dispute as rejected — charge stands. */
async function applyRejected(
  disputeId: number,
  result: AutoResolveResult,
) {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  await supabase
    .from("lead_disputes")
    .update({
      status: "rejected",
      resolved_at: nowIso,
      auto_resolved_at: nowIso,
      auto_resolved_verdict: "reject",
      auto_resolved_confidence: result.confidence,
      auto_resolved_reasons: result.reasons,
      refunded_cents: 0,
      admin_notes: "Auto-resolved: rejected",
    })
    .eq("id", disputeId);

  log.info("Dispute auto-rejected", { disputeId, reasons: result.reasons });

  return {
    applied: true,
    verdict: "reject" as const,
    confidence: result.confidence,
    reasons: result.reasons,
    refundedCents: 0,
  };
}

// ─── Notifications ───────────────────────────────────────────────────

async function notifyAdvisorRefund(
  advisorId: number,
  leadId: number,
  billAmountCents: number,
  reasons: string[],
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const supabase = createAdminClient();
  const { data: advisor } = await supabase
    .from("professionals")
    .select("name, email")
    .eq("id", advisorId)
    .maybeSingle();
  if (!advisor?.email) return;

  const amount = (billAmountCents / 100).toFixed(2);
  const siteUrl = getSiteUrl();
  const reasonList = reasons
    .map((r) => `<li style="margin:2px 0">${escapeHtml(r)}</li>`)
    .join("");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <disputes@invest.com.au>",
      to: advisor.email,
      subject: `Lead dispute refunded — A$${amount}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
          <h2 style="color:#0f172a;font-size:18px;margin:0 0 12px">Your lead dispute was approved</h2>
          <p style="font-size:14px;line-height:1.6;margin:0 0 12px">
            Hi ${escapeHtml(advisor.name || "there")},
          </p>
          <p style="font-size:14px;line-height:1.6;margin:0 0 12px">
            We've reviewed your dispute on lead <strong>#${leadId}</strong> and
            credited <strong>A$${amount}</strong> back to your lead balance.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin:16px 0">
            <p style="margin:0 0 6px;font-size:13px;color:#334155"><strong>Refunded:</strong> A$${amount}</p>
            <p style="margin:0;font-size:12px;color:#64748b">Signals reviewed:</p>
            <ul style="margin:4px 0 0 20px;font-size:12px;color:#64748b">${reasonList}</ul>
          </div>
          <p style="font-size:14px;line-height:1.6;margin:16px 0">
            You can see the updated balance in your advisor portal.
          </p>
          <a href="${siteUrl}/advisor-portal" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">View advisor portal →</a>
          <p style="font-size:11px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
            This refund was processed automatically based on objective signals.
            If you believe the decision is wrong, reply to this email and we'll review manually.
          </p>
        </div>`,
    }),
  }).catch((err) =>
    log.error("Advisor refund email failed", {
      err: err instanceof Error ? err.message : String(err),
    }),
  );
}

/** Notify admin for escalated disputes (fire-and-forget). */
export async function notifyAdminEscalated(
  disputeId: number,
  advisorName: string,
  leadName: string,
  reason: string,
  details: string | null,
  classifierReasons: string[],
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const siteUrl = getSiteUrl();
  const classifierList = classifierReasons
    .map((r) => `<li style="margin:2px 0">${escapeHtml(r)}</li>`)
    .join("");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <system@invest.com.au>",
      to: ADMIN_EMAIL,
      subject: `Lead Dispute [escalated]: ${advisorName} disputed lead from ${leadName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
          <h2 style="color:#0f172a;font-size:16px">⚠️ Dispute needs human review</h2>
          <p style="color:#64748b;font-size:14px">The classifier couldn't auto-resolve this dispute. Details:</p>
          <table style="width:100%;font-size:13px;margin:12px 0">
            <tr><td style="padding:4px 0;color:#64748b">Advisor</td><td style="padding:4px 0;font-weight:600">${escapeHtml(advisorName)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Lead</td><td style="padding:4px 0;font-weight:600">${escapeHtml(leadName)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Reason</td><td style="padding:4px 0">${escapeHtml(reason)}</td></tr>
            ${details ? `<tr><td style="padding:4px 0;color:#64748b;vertical-align:top">Details</td><td style="padding:4px 0">${escapeHtml(details)}</td></tr>` : ""}
          </table>
          ${
            classifierReasons.length > 0
              ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin:12px 0">
                  <p style="margin:0 0 4px;font-size:12px;color:#92400e;font-weight:600">Classifier signals:</p>
                  <ul style="margin:0 0 0 16px;font-size:12px;color:#92400e">${classifierList}</ul>
                </div>`
              : ""
          }
          <a href="${siteUrl}/admin/advisors" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Review dispute →</a>
        </div>`,
    }),
  }).catch((err) =>
    log.error("Admin escalation email failed", {
      err: err instanceof Error ? err.message : String(err),
    }),
  );
}
