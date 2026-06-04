import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { recordFinancialAudit } from "@/lib/financial-audit";
import { buildEmailToUserIdMap, notifyUser } from "@/lib/notifications";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";

const log = logger("cron:referral-payouts");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Daily cron — processes pending referral_rewards rows.
 *
 * For 'credit_balance' payouts: looks up the referrer advisor by
 * email, records the credit through the advisor credit ledger
 * (kind='referral_payout', reference triple keyed to the reward id),
 * and logs to financial_audit_log. 'bank' and 'stripe' payouts are
 * marked 'pending_manual' for admin to batch-process weekly.
 *
 * Idempotency: TWO guards make a crash-then-retry safe.
 *   1. The ledger's (kind, reference_type, reference_id) unique index
 *      means re-recording `referral_payout`/`referral_reward`/<id>
 *      is a no-op — the cached balance is never double-credited even
 *      if the cron crashes after crediting but before the reward row
 *      flips to 'paid'.
 *   2. The 'paid' flip is itself guarded by `.eq("status","pending")`
 *      so a row can transition out of 'pending' at most once.
 * Together these close the historical double-credit window where a
 * raw read-modify-write CAS on the OLD balance would re-credit on the
 * next run after a mid-row crash.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("referral_payouts")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const stats = { scanned: 0, paid: 0, rejected: 0, manual: 0, failed: 0, inboxed: 0 };

  // Pre-load email→user_id so crediting an advisor can fire an
  // inbox notification without an extra lookup per row.
  const emailToUserId = await buildEmailToUserIdMap();

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

      // Credit through the ledger. Its (kind, reference_type, reference_id)
      // unique index keyed to the reward id is the durable idempotency
      // guard: if this cron crashed after a prior credit landed but before
      // the reward row flipped to 'paid', the re-run returns the existing
      // ledger row (idempotent:true) and never double-mutates the balance.
      let ledger;
      try {
        ledger = await recordLedgerEntry({
          professionalId: advisor.id as number,
          amountCents: r.reward_cents as number,
          kind: "referral_payout",
          description: `Referral reward: ${r.trigger_event} by ${r.referred_email}`,
          referenceType: "referral_reward",
          referenceId: String(r.id),
          metadata: {
            referral_code: r.referral_code,
            referred_email: r.referred_email,
            trigger_event: r.trigger_event,
          },
          createdBy: "cron:referral-payouts",
          supabase,
        });
      } catch (ledgerErr) {
        log.error("Referral credit failed — ledger entry threw", {
          id: r.id,
          err: ledgerErr instanceof Error ? ledgerErr.message : String(ledgerErr),
        });
        stats.failed++;
        continue;
      }

      const newBalance = ledger.balanceAfterCents;

      // Flip the reward to 'paid', guarded by status='pending' so a row
      // can leave 'pending' at most once even under concurrent fires.
      await supabase
        .from("referral_rewards")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payout_method: "credit_balance",
          payout_reference: `advisor_${advisor.id}`,
        })
        .eq("id", r.id)
        .eq("status", "pending");

      // Only audit on the first (non-idempotent) credit — a retry that
      // hits the existing ledger row must not log a second movement.
      if (!ledger.idempotent) {
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
      }

      // Tell the referrer they got paid. email_delivery_key is the
      // reward row id so retries can't double-notify.
      const userId = emailToUserId.get(
        (r.referrer_email as string).toLowerCase(),
      );
      if (userId) {
        const dollars = ((r.reward_cents as number) / 100).toFixed(2);
        const ok = await notifyUser({
          userId,
          type: "referral",
          title: `You earned $${dollars} in referral credit`,
          body: `Your referral of ${r.referred_email} just triggered ${r.trigger_event}. The credit has been added to your advisor balance.`,
          linkUrl: "/advisor-portal",
          emailDeliveryKey: `referral_reward:${r.id}`,
        });
        if (ok) stats.inboxed += 1;
      }

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
