/**
 * AnnualBillingPrompt — dashboard nudge to switch from monthly to annual.
 *
 * Pre-launch wave PR-X4. Renders a small banner above the PinnedBillingWidget
 * for paid-tier advisors (Growth / Pro / Elite). Click → upgrade flow with
 * annual already selected (UpgradeClient defaults to annual).
 *
 * Hidden for free / launch tiers (no annual option for free).
 */

import Link from "next/link";
import { getTier, type AdvisorTier } from "@/lib/advisor-tiers";

interface Props {
  advisorTier: AdvisorTier | string | null;
}

export default function AnnualBillingPrompt({ advisorTier }: Props) {
  if (!advisorTier || advisorTier === "free" || advisorTier === "launch") return null;

  const tier = getTier(advisorTier);
  if (!tier || tier.monthlyPriceCents === 0) return null;

  // Savings = (12 × monthly) − annual; expressed in dollars.
  const annualEquivOfMonthly = tier.monthlyPriceCents * 12;
  const savingsCents = annualEquivOfMonthly - tier.annualPriceCents;
  if (savingsCents <= 0) return null;

  const savingsDollars = Math.round(savingsCents / 100);
  const monthsFree = Math.round(savingsCents / tier.monthlyPriceCents);

  return (
    <div
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
      role="region"
      aria-label="Annual billing offer"
    >
      <p className="text-sm text-emerald-900 leading-snug">
        <strong>Switch to annual on {tier.label} and save ${savingsDollars}/yr</strong>
        {" "}— that&rsquo;s {monthsFree} {monthsFree === 1 ? "month" : "months"} free.
      </p>
      <Link
        href="/advisor-portal/upgrade"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
        data-testid="annual-billing-prompt-cta"
      >
        Switch to annual <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
