/**
 * PR-X1 Auto-topup at low balance.
 *
 * Daily cron (Vercel scheduled). For each advisor with
 * `auto_topup_enabled=true`, when their `credit_balance_cents` falls
 * below `auto_topup_threshold_cents`, charges the saved Stripe payment
 * method `auto_topup_amount_cents` (capped at $500) and records a
 * matching `kind='topup'` ledger entry.
 *
 * Guardrails (locked-in by founder 2026-05-09):
 *   1. OPT-IN ONLY — `auto_topup_enabled=true` required
 *   2. PER-CHARGE CAP — amount clamped to AUTO_TOPUP_MAX_CENTS ($500)
 *   3. 24h COOLDOWN — skip if any auto-topup ledger entry in last 24h
 *   4. IDEMPOTENT — Stripe idempotency key = `auto_topup_<id>_<YYYYMMDD>`;
 *      ledger row uses (kind=topup, reference_type=stripe_payment_intent,
 *      reference_id=pi.id) uniqueness, so even cron retries within the
 *      same day don't double-charge
 *   5. METADATA — every Stripe charge tagged auto_topup=true +
 *      trigger_balance_cents for audit
 *   6. REFUNDS DEFAULT TO CREDIT — handled by the existing charge.refunded
 *      webhook (no cash-back path for auto-topups)
 *
 * Failure modes that SKIP the advisor (no charge attempted):
 *   - No `stripe_customer_id` on professionals row
 *   - No default payment method on the Stripe customer
 *   - Last auto-topup within 24h cooldown
 *   - balance_cents >= threshold (no need)
 *   - threshold or amount missing / non-positive
 *
 * Failure modes that ATTEMPT charge then log error:
 *   - Card declined (Stripe error)
 *   - Network / Stripe API failure
 * Both record nothing in the ledger and do not flip the cooldown.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";

const log = logger("cron:advisor-auto-topup");

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — gives us room for ~50 Stripe calls

/** Hard per-charge ceiling. NEVER charge more than this in a single auto-topup. */
export const AUTO_TOPUP_MAX_CENTS = 50000; // $500 AUD

/** Cooldown window — no two auto-topups within this period for the same advisor. */
export const AUTO_TOPUP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

/** Default amount when advisor enabled but didn't set a value (defensive). */
export const AUTO_TOPUP_DEFAULT_CENTS = 15000; // $150

interface ChargeOutcome {
  advisorId: number;
  status: "charged" | "skipped" | "failed";
  reason?: string;
  amountCents?: number;
  paymentIntentId?: string;
}

function dayStamp(d: Date): string {
  // YYYYMMDD in UTC for cross-fire idempotency on a daily cron
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

async function processAdvisor(
  pro: {
    id: number;
    credit_balance_cents: number | null;
    stripe_customer_id: string | null;
    auto_topup_threshold_cents: number | null;
    auto_topup_amount_cents: number | null;
  },
  now: Date,
): Promise<ChargeOutcome> {
  const supabase = createAdminClient();
  const balance = pro.credit_balance_cents ?? 0;
  const threshold = pro.auto_topup_threshold_cents ?? 0;
  const requestedAmount = pro.auto_topup_amount_cents ?? AUTO_TOPUP_DEFAULT_CENTS;

  // Guardrail: positive threshold + amount required
  if (threshold <= 0 || requestedAmount <= 0) {
    return { advisorId: pro.id, status: "skipped", reason: "threshold_or_amount_invalid" };
  }
  if (balance >= threshold) {
    return { advisorId: pro.id, status: "skipped", reason: "balance_above_threshold" };
  }
  if (!pro.stripe_customer_id) {
    return { advisorId: pro.id, status: "skipped", reason: "no_stripe_customer" };
  }

  // Guardrail: 24h cooldown — check ledger for any prior auto-topup entry
  const cooldownStart = new Date(now.getTime() - AUTO_TOPUP_COOLDOWN_MS).toISOString();
  const { data: recentEntries } = await supabase
    .from("advisor_credit_ledger")
    .select("id, created_at, metadata")
    .eq("professional_id", pro.id)
    .eq("kind", "topup")
    .gte("created_at", cooldownStart)
    .order("created_at", { ascending: false })
    .limit(20); // small ceiling; we filter by metadata in JS

  const recentAutoTopup = (recentEntries ?? []).find(
    (e) => (e.metadata as Record<string, unknown> | null)?.auto_topup === true,
  );
  if (recentAutoTopup) {
    return { advisorId: pro.id, status: "skipped", reason: "cooldown_active" };
  }

  // Guardrail: cap the amount
  const amountCents = Math.min(requestedAmount, AUTO_TOPUP_MAX_CENTS);

  // Guardrail: stripe customer must have a default payment method
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(pro.stripe_customer_id);
  if (!customer || (customer as { deleted?: boolean }).deleted) {
    return { advisorId: pro.id, status: "skipped", reason: "stripe_customer_deleted" };
  }
  const defaultPaymentMethod =
    (customer as { invoice_settings?: { default_payment_method?: string | null } }).invoice_settings
      ?.default_payment_method ?? null;
  if (!defaultPaymentMethod) {
    return { advisorId: pro.id, status: "skipped", reason: "no_default_payment_method" };
  }

  // Charge with deterministic idempotency key (advisor + day) so retries
  // within the same UTC day return the same PaymentIntent rather than
  // creating a duplicate. The 24h cooldown above is the user-facing
  // guarantee; this is the Stripe-side belt + braces.
  const idempotencyKey = `auto_topup_${pro.id}_${dayStamp(now)}`;
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: "aud",
        customer: pro.stripe_customer_id,
        payment_method: defaultPaymentMethod,
        off_session: true,
        confirm: true,
        description: "Invest.com.au advisor lead credit (auto-topup)",
        metadata: {
          auto_topup: "true",
          advisor_id: String(pro.id),
          trigger_balance_cents: String(balance),
          threshold_cents: String(threshold),
        },
      },
      { idempotencyKey },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("Auto-topup Stripe charge failed", { advisorId: pro.id, error: message });
    return { advisorId: pro.id, status: "failed", reason: "stripe_charge_error" };
  }

  if (paymentIntent.status !== "succeeded") {
    return {
      advisorId: pro.id,
      status: "failed",
      reason: `stripe_status_${paymentIntent.status}`,
      paymentIntentId: paymentIntent.id,
    };
  }

  // Record the ledger entry with idempotent reference triple. If a prior
  // cron fire today already recorded the same PaymentIntent, the helper
  // returns the existing row without double-mutating the cached balance.
  // 24-month expiry mirrors the manual top-up policy (PR-B1).
  const expiresAt = new Date(now.getTime());
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 24);

  await recordLedgerEntry({
    professionalId: pro.id,
    amountCents,
    kind: "topup",
    description: `Auto-topup A$${(amountCents / 100).toFixed(2)} (balance was A$${(balance / 100).toFixed(2)})`,
    referenceType: "stripe_payment_intent",
    referenceId: paymentIntent.id,
    metadata: {
      auto_topup: true,
      trigger_balance_cents: balance,
      threshold_cents: threshold,
      stripe_payment_method: defaultPaymentMethod,
    },
    expiresAt,
    createdBy: "cron:advisor-auto-topup",
  });

  return {
    advisorId: pro.id,
    status: "charged",
    amountCents,
    paymentIntentId: paymentIntent.id,
  };
}

async function handler(request: NextRequest) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const now = new Date();

  // Pull all opted-in advisors below their threshold. PG can't filter
  // `credit_balance_cents < auto_topup_threshold_cents` directly via PostgREST
  // builders, so we pull all enabled rows and filter in JS. Volumes are
  // small (~100s opted in initially) so this is fine.
  const { data: candidates, error } = await supabase
    .from("professionals")
    .select(
      "id, credit_balance_cents, stripe_customer_id, auto_topup_enabled, auto_topup_amount_cents, auto_topup_threshold_cents",
    )
    .eq("auto_topup_enabled", true)
    .eq("status", "active");

  if (error) {
    log.error("Failed to fetch auto-topup candidates", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const eligible = (candidates ?? []).filter((c) => {
    const balance = c.credit_balance_cents ?? 0;
    const threshold = c.auto_topup_threshold_cents ?? 0;
    return threshold > 0 && balance < threshold;
  });

  log.info("Auto-topup sweep starting", {
    candidateCount: candidates?.length ?? 0,
    eligibleCount: eligible.length,
  });

  const outcomes: ChargeOutcome[] = [];
  for (const pro of eligible) {
    const outcome = await processAdvisor(pro, now);
    outcomes.push(outcome);
  }

  const summary = {
    candidate_count: candidates?.length ?? 0,
    eligible_count: eligible.length,
    charged_count: outcomes.filter((o) => o.status === "charged").length,
    skipped_count: outcomes.filter((o) => o.status === "skipped").length,
    failed_count: outcomes.filter((o) => o.status === "failed").length,
    total_charged_cents: outcomes
      .filter((o) => o.status === "charged")
      .reduce((sum, o) => sum + (o.amountCents ?? 0), 0),
  };

  log.info("Auto-topup sweep complete", summary);
  return NextResponse.json({ ok: true, ...summary, outcomes });
}

export const GET = wrapCronHandler("advisor-auto-topup", handler);
