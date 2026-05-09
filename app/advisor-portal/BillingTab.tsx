"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import type { Advisor, Stats, ViewType } from "./types";
import type { BillingSummary } from "./billing/types";
import CreditBalanceCard from "./billing/CreditBalanceCard";
import CreditPackGrid from "./billing/CreditPackGrid";
import PaymentMethodCard from "./billing/PaymentMethodCard";
import LedgerHistoryTable from "./billing/LedgerHistoryTable";
import DowngradeBanner from "./billing/DowngradeBanner";
import { logger } from "@/lib/logger";

const log = logger("advisor-portal-billing");

type Props = {
  advisor: Advisor | null;
  stats: Stats | null;
  onNavigate: (v: ViewType) => void;
  /** Pre-fetched summary from advisor-portal page; falls back to client fetch. */
  initialSummary?: BillingSummary | null;
};

export default function BillingTab({ advisor, stats, onNavigate, initialSummary }: Props) {
  const [summary, setSummary] = useState<BillingSummary | null>(initialSummary ?? null);

  useEffect(() => {
    if (initialSummary) return;
    fetch("/api/advisor-auth/billing-summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSummary(data as BillingSummary);
      })
      .catch((err) => {
        log.error("billing summary fetch failed", {
          err: err instanceof Error ? err.message : String(err),
        });
      });
  }, [initialSummary]);

  // Fall back to a synthetic summary derived from the advisor row when
  // the network call hasn't returned yet — prevents an empty-card flash.
  const effectiveSummary: BillingSummary = summary ?? {
    balance_cents: advisor?.credit_balance_cents ?? 0,
    lifetime_credit_cents: advisor?.lifetime_credit_cents ?? 0,
    lifetime_spend_cents: advisor?.lifetime_lead_spend_cents ?? 0,
    expiring_soon_cents: 0,
    free_leads_used: advisor?.free_leads_used ?? 0,
    free_leads_remaining: Math.max(0, 3 - (advisor?.free_leads_used ?? 0)),
    lead_price_cents: advisor?.lead_price_cents ?? 4900,
    advisor_tier: "free",
    pending_tier: null,
    pending_tier_effective_at: null,
    has_payment_method: false,
    has_stripe_customer: false,
    ledger_first_page: [],
    ledger_total: 0,
  };

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Billing & Credits</h1>
      <p className="text-sm text-slate-500 mb-6">
        Purchase lead credits, manage your subscription, and review every cent of activity.
      </p>

      <DowngradeBanner summary={effectiveSummary} />
      <CreditBalanceCard summary={effectiveSummary} />
      <CreditPackGrid />
      <PaymentMethodCard summary={effectiveSummary} />

      {/* Add-on packs (kept; not credit) ───────────────────────── */}
      <h2 className="text-base font-bold text-slate-900 mb-3">Boost Your Visibility</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        <FeaturedAdvisorCard advisor={advisor} />
        <ExpertArticleCard onNavigate={onNavigate} />
      </div>

      {/* Headline counters (kept) ──────────────────────────────── */}
      <h2 className="text-base font-bold text-slate-900 mb-3">Payment History</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 font-medium">Total Charged</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            ${((stats?.totalBilledCents || 0) / 100).toFixed(0)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 font-medium">Outstanding</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            ${((stats?.pendingBilledCents || 0) / 100).toFixed(0)}
          </div>
        </div>
      </div>

      <LedgerHistoryTable summary={effectiveSummary} />

      <p className="text-xs text-slate-400 mt-6 text-center">
        Questions about a charge or refund? Read our{" "}
        <a href="/billing-policy" className="underline hover:text-slate-600">
          billing policy
        </a>
        {" "}— refunds default to portal credit so you can keep buying leads. Cash refunds for
        billing errors, outages, fraud, and dispute wins.
      </p>
    </>
  );
}

function FeaturedAdvisorCard({ advisor }: { advisor: Advisor | null }) {
  return (
    <div className="bg-white border border-amber-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="star" size={18} className="text-amber-500" />
        <h3 className="text-sm font-bold text-slate-900">Featured Advisor</h3>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 mb-1">
        $149<span className="text-sm font-normal text-slate-400">/month</span>
      </div>
      <ul className="text-xs text-slate-600 space-y-1 mb-3">
        <li className="flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-emerald-500" />
          Featured badge on your profile
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-emerald-500" />
          Priority listing on city pages
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-emerald-500" />
          Gold border on search results
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-emerald-500" />
          Monthly performance report
        </li>
      </ul>
      {advisor?.featured_until && new Date(advisor.featured_until) > new Date() ? (
        <p className="text-xs text-amber-700 font-semibold">
          Active until{" "}
          {new Date(advisor.featured_until).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      ) : (
        <button
          type="button"
          onClick={async () => {
            try {
              const res = await fetch("/api/advisor-auth/topup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount_cents: 14900, pack_slug: "featured_monthly" }),
              });
              const data = await res.json();
              if (data.url) window.location.href = data.url;
              else alert(data.error || "Failed to create checkout session. Please try again.");
            } catch (err) {
              alert("Something went wrong. Please check you're logged in and try again.");
              log.error("featured topup checkout failed", {
                err: err instanceof Error ? err.message : String(err),
              });
            }
          }}
          className="w-full py-2 rounded-lg text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all"
        >
          Get Featured
        </button>
      )}
    </div>
  );
}

function ExpertArticleCard({ onNavigate }: { onNavigate: (v: ViewType) => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="file-text" size={18} className="text-violet-500" />
        <h3 className="text-sm font-bold text-slate-900">Expert Article</h3>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 mb-1">
        $299<span className="text-sm font-normal text-slate-400">/article</span>
      </div>
      <ul className="text-xs text-slate-600 space-y-1 mb-3">
        <li className="flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-emerald-500" />
          SEO-optimised article on invest.com.au
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-emerald-500" />
          Permanent placement with your byline
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-emerald-500" />
          Backlink to your advisor profile
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="check" size={12} className="text-emerald-500" />
          Builds your E-E-A-T authority
        </li>
      </ul>
      <button
        onClick={() => onNavigate("articles")}
        className="w-full py-2 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
      >
        Write an Article →
      </button>
    </div>
  );
}
