/**
 * GET /api/advisor-auth/billing-summary
 *
 * One-shot fetch consumed by both BillingTab and the dashboard
 * PinnedBillingWidget. Returns:
 *   - balance_cents          — cached balance
 *   - lifetime_credit_cents  — total ever credited
 *   - lifetime_spend_cents   — total ever spent
 *   - expiring_soon_cents    — credits with expires_at < now + 60 days
 *   - lead_price_cents       — per-lead price for this advisor
 *   - free_leads_remaining   — out of the launch-tier 3
 *   - pending_tier           — set when a downgrade is queued (PR-B3)
 *   - pending_tier_effective_at
 *   - has_payment_method     — whether the Stripe customer has a default PM
 *   - ledger_first_page      — most-recent 50 rows for the unified history
 *
 * Single round-trip per portal load instead of one fetch per widget.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { getLedgerPage, getExpiringSoonCents } from "@/lib/advisor-credit-ledger";
import { logger } from "@/lib/logger";

const log = logger("advisor-billing-summary");

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select(
      "credit_balance_cents, lifetime_credit_cents, lifetime_lead_spend_cents, free_leads_used, lead_price_cents, advisor_tier, stripe_customer_id, pending_tier, pending_tier_effective_at",
    )
    .eq("id", advisorId)
    .maybeSingle();

  if (!pro) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  const sixtyDaysOut = new Date();
  sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);

  const [expiringSoonCents, ledgerPage] = await Promise.all([
    getExpiringSoonCents(advisorId, sixtyDaysOut).catch(() => 0),
    getLedgerPage(advisorId, { limit: 50, offset: 0 }).catch(() => ({ rows: [], total: 0 })),
  ]);

  // Stripe Customer Portal availability — fast existence check only
  // (we'd render a "Manage subscription" button when this is true).
  let hasPaymentMethod = false;
  if (pro.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      const customer = await getStripe().customers.retrieve(
        pro.stripe_customer_id as string,
      );
      if (customer && !("deleted" in customer && customer.deleted)) {
        hasPaymentMethod = !!customer.invoice_settings?.default_payment_method;
      }
    } catch (err) {
      log.warn("Stripe customer lookup failed", {
        error: err instanceof Error ? err.message : String(err),
        advisorId,
      });
    }
  }

  return NextResponse.json({
    balance_cents: pro.credit_balance_cents ?? 0,
    lifetime_credit_cents: pro.lifetime_credit_cents ?? 0,
    lifetime_spend_cents: pro.lifetime_lead_spend_cents ?? 0,
    expiring_soon_cents: expiringSoonCents,
    free_leads_used: pro.free_leads_used ?? 0,
    free_leads_remaining: Math.max(0, 3 - (pro.free_leads_used ?? 0)),
    lead_price_cents: pro.lead_price_cents ?? 4900,
    advisor_tier: pro.advisor_tier ?? "free",
    pending_tier: pro.pending_tier ?? null,
    pending_tier_effective_at: pro.pending_tier_effective_at ?? null,
    has_payment_method: hasPaymentMethod,
    has_stripe_customer: !!pro.stripe_customer_id,
    ledger_first_page: ledgerPage.rows,
    ledger_total: ledgerPage.total,
  });
}
