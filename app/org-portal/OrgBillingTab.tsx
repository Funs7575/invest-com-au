"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Organisation } from "./types";

type Props = {
  org: Organisation | null;
};

const TIER_LABELS: Record<string, { label: string; price: string }> = {
  free: { label: "Free", price: "$0/mo" },
  starter: { label: "Starter", price: "$49/mo" },
  growth: { label: "Growth", price: "$149/mo" },
  featured: { label: "Featured", price: "$299/mo" },
};

interface RevenueStats {
  revenue_this_month_cents: number;
  total_revenue_cents: number;
  enrollments_this_month: number;
  total_enrollments: number;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

export default function OrgBillingTab({ org }: Props) {
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/org-auth/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { stats: RevenueStats }) => {
        if (!cancelled) {
          setRevenueStats(data.stats);
          setStatsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatsError(true);
          setStatsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    setStripeError("");
    try {
      const res = await fetch("/api/org-auth/stripe-connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          window.location.href = url;
          return;
        }
      }
      const d = await res.json();
      setStripeError(d.error ?? "Failed to start Stripe onboarding.");
    } catch {
      setStripeError("Network error. Please try again.");
    }
    setConnectingStripe(false);
  };

  const tier = org?.tier ?? "free";
  const tierInfo = TIER_LABELS[tier] ?? { label: tier, price: "Contact us" };
  const isStripeConnected = org?.stripe_connect_status === "active";

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Billing</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your Stripe payouts and subscription tier.</p>

      {/* Stripe Connect card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isStripeConnected ? "bg-emerald-50" : "bg-amber-50"}`}>
            <Icon name="dollar-sign" size={20} className={isStripeConnected ? "text-emerald-600" : "text-amber-600"} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Stripe Connect</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isStripeConnected
                ? "Your Stripe account is connected. Payouts are enabled."
                : "Connect Stripe to receive payouts from course enrollments."}
            </p>
          </div>
        </div>

        {isStripeConnected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[0.56rem] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Connected
              </span>
              {org?.stripe_connect_payouts_enabled && (
                <span className="text-[0.56rem] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Payouts enabled
                </span>
              )}
            </div>
            {org?.stripe_connect_account_id && (
              <p className="text-[0.62rem] text-slate-400">
                Account: <span className="font-mono">{org.stripe_connect_account_id}</span>
              </p>
            )}
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-colors mt-1"
            >
              <Icon name="external-link" size={13} />
              View Stripe Dashboard
            </a>
          </div>
        ) : (
          <div>
            <button
              onClick={handleConnectStripe}
              disabled={connectingStripe}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              <Icon name="external-link" size={16} />
              {connectingStripe ? "Redirecting..." : "Connect Stripe"}
            </button>
            {stripeError && (
              <p className="text-xs text-red-600 mt-2">{stripeError}</p>
            )}
          </div>
        )}
      </div>

      {/* Tier card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center shrink-0">
            <Icon name="award" size={20} className="text-teal-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Current Plan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Your organisation is on the{" "}
              <span className="font-semibold text-slate-700">{tierInfo.label}</span> plan.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-900 capitalize">{tierInfo.label}</p>
            <p className="text-xs text-slate-500">{tierInfo.price}</p>
          </div>
          <a
            href="/for-providers#pricing"
            className="px-3 py-1.5 border border-teal-600 text-teal-700 font-semibold text-xs rounded-lg hover:bg-teal-50 transition-colors"
          >
            {tier === "free" ? "Upgrade Plan" : "Change Plan"}
          </a>
        </div>
      </div>

      {/* Revenue summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Revenue</h2>
        {statsLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
          </div>
        ) : statsError ? (
          <p className="text-xs text-slate-500">Unable to load revenue data. Please refresh.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">This month</span>
              <span className="font-bold text-slate-900">
                {formatCents(revenueStats?.revenue_this_month_cents ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-600">Enrollments this month</span>
              <span className="font-semibold text-slate-700">
                {revenueStats?.enrollments_this_month ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-600">All-time revenue</span>
              <span className="font-semibold text-slate-700">
                {formatCents(revenueStats?.total_revenue_cents ?? 0)}
              </span>
            </div>
          </div>
        )}
        {isStripeConnected ? (
          <p className="text-[0.62rem] text-slate-400 mt-3">
            Payout history and invoices are in your{" "}
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-600"
            >
              Stripe dashboard
            </a>
            . Payouts are processed monthly.
          </p>
        ) : (
          <p className="text-[0.62rem] text-slate-400 mt-3">
            Connect Stripe above to enable payouts. Revenue figures reflect course enrollments on this platform.
          </p>
        )}
      </div>
    </div>
  );
}
