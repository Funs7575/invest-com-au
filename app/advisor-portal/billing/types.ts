/**
 * Shared types for the BillingTab subcomponents.
 *
 * The shape mirrors what `/api/advisor-auth/billing-summary` returns so
 * components can read straight off the summary payload.
 */

export interface LedgerEntryView {
  id: number;
  amount_cents: number;
  balance_after_cents: number;
  kind:
    | "topup"
    | "refund_to_credit"
    | "lead_spend"
    | "lead_dispute_refund"
    | "tier_proration_credit"
    | "admin_adjustment"
    | "expiry"
    | "chargeback_clawback";
  description: string;
  created_at: string;
  expires_at: string | null;
}

export interface BillingSummary {
  balance_cents: number;
  lifetime_credit_cents: number;
  lifetime_spend_cents: number;
  expiring_soon_cents: number;
  free_leads_used: number;
  free_leads_remaining: number;
  lead_price_cents: number;
  advisor_tier: string;
  pending_tier: string | null;
  pending_tier_effective_at: string | null;
  has_payment_method: boolean;
  has_stripe_customer: boolean;
  ledger_first_page: LedgerEntryView[];
  ledger_total: number;
}
