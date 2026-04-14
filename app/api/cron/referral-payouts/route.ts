import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { recordFinancialAudit } from "@/lib/financial-audit";

const log = logger("cron:referral-payouts");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Daily cron — processes pending referral_rewards rows.
 *
 * For 'credit_balance' payouts: looks up the referrer advisor by
 * email, reads their current credit_balance_cents, writes back
 * (reward + current) with an optimistic lock, and logs to
 * financial_audit_log. 'bank' and 'stripe' payouts are marked
 * 'pending_manual' for admin to batch-process weekly.
 *
 * Idempotency: the status machine (pending → paid | rejected)
 * means a retry after a crash is safe — only status='pending' rows
 * are picked up.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("referral_payouts")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const stats = { scanned: 0, paid: 0, rejected: 0, manual: 0, failed: 0 };

  const { data: rewards, error } = await supabase
    .from("referral_rewards")
    .select(
      "id, referral_code, referrer_email, referred_email, trigger_event, reward_cents, payout_method",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    log.error("Failed to fetch referral_rewards", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  stats.scanned = rewards?.length || 0;

  for (const r of rewards || []) {
    try {
      const method = (r.payout_method as string) || "credit_balance";

      if (method !== "credit_balance") {
        // Manual methods (bank transfer, Stripe) → stay pending, admin picks up
        stats.manual++;
        continue;
      }

      // Find the advisor by email. If not an advisor, reject.
      const { data: advisor } = await supabase
        .from("professionals")
        .select("id, credit_balance_cents")
        .ilike("email", r.referrer_email as string)
        .maybeSingle();

      if (!advisor) {
        await supabase
          .from("referral_rewards")
          .update({
            status: "rejected",
            rejection_reason: "referrer_email_not_found_in_professionals",
          })
          .eq("id", r.id);
        stats.rejected++;
        continue;
      }

      const currentBalance = (advisor.credit_balance_cents as number) || 0;
      const newBalance = currentBalance + (r.reward_cents as number);

      const { error: upErr } = await supabase
        .from("professionals")
        .update({ credit_balance_cents: newBalance })
        .eq("id", advisor.id)
        .eq("credit_balance_cents", currentBalance);

      if (upErr) {
        log.error("Referral credit failed — optimistic lock lost", {
          id: r.id,
          err: upErr.message,
        });
        stats.failed++;
        continue;
      }

      await supabase
        .from("referral_rewards")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payout_method: "credit_balance",
          payout_reference: `advisor_${advisor.id}`,
        })
        .eq("id", r.id);

      await recordFinancialAudit({
        actorType: "cron",
        actorId: "referral-payouts",
        action: "credit",
        resourceType: "advisor_credit_balance",
        resourceId: advisor.id as number,
        amountCents: r.reward_cents as number,
        oldValue: { credit_balance_cents: currentBalance },
        newValue: { credit_balance_cents: newBalance },
        reason: `Referral reward: ${r.trigger_event} by ${r.referred_email}`,
        context: { referral_code: r.referral_code, referred_email: r.referred_email },
      });

      stats.paid++;
    } catch (err) {
      stats.failed++;
      log.error("referral payout per-row failure", {
        id: r.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("referral payout cron completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("referral-payouts", handler);
