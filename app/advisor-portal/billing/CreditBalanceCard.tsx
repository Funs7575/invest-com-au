"use client";

import type { BillingSummary } from "./types";

interface Props {
  summary: BillingSummary;
}

/**
 * Headline credit-balance card. Adds an "expiring soon" sub-line so the
 * advisor can act before credits time-box out at the 24-month mark.
 */
export default function CreditBalanceCard({ summary }: Props) {
  const balanceDollars = (summary.balance_cents / 100).toFixed(0);
  const leadsRemaining = Math.floor(summary.balance_cents / Math.max(summary.lead_price_cents, 1));
  const leadPriceDollars = (summary.lead_price_cents / 100).toFixed(0);
  const lifetimeSpendDollars = (summary.lifetime_spend_cents / 100).toFixed(0);

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-violet-900">Credit Balance</h3>
        <span className="text-2xl font-extrabold text-violet-900">
          ${balanceDollars}
        </span>
      </div>
      <p className="text-xs text-violet-600">
        ~{leadsRemaining} leads remaining · ${leadPriceDollars}/lead · Lifetime spend: ${lifetimeSpendDollars}
      </p>
      {summary.expiring_soon_cents > 0 && (
        <p className="text-xs text-amber-700 font-semibold mt-2">
          ${(summary.expiring_soon_cents / 100).toFixed(0)} of your credit expires
          within 60 days. Use or top up before then.
        </p>
      )}
    </div>
  );
}
