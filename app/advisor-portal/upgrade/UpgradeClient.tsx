"use client";

import { useState } from "react";
import type { TierSpec, AdvisorTier } from "@/lib/advisor-tiers";

interface Props {
  currentTier: AdvisorTier;
  tiers: TierSpec[];
}

export default function UpgradeClient({ currentTier, tiers }: Props) {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [busy, setBusy] = useState<AdvisorTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(tier: AdvisorTier) {
    if (tier === currentTier) return;
    setError(null);
    setBusy(tier);
    try {
      const res = await fetch("/api/advisor-auth/tier-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_tier: tier, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      // Downgrade path — reload to reflect new tier
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setBilling("monthly")}
          className={`px-4 py-1.5 rounded text-sm font-semibold ${
            billing === "monthly" ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-700"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBilling("annual")}
          className={`px-4 py-1.5 rounded text-sm font-semibold ${
            billing === "annual" ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-700"
          }`}
        >
          Annual <span className="text-[0.6rem] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded ml-1">save 20%</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((tier) => {
          const isCurrent = tier.id === currentTier;
          const price = billing === "annual" ? tier.annualPriceCents : tier.monthlyPriceCents;
          const displayPrice = price === 0 ? "Free" : `$${(price / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
          const suffix = price === 0 ? "" : billing === "annual" ? "/yr" : "/mo";
          return (
            <div
              key={tier.id}
              className={`bg-white border rounded-xl p-4 flex flex-col ${
                isCurrent ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-slate-900">{tier.label}</h3>
                {isCurrent && (
                  <span className="text-[0.6rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-white">
                    Current
                  </span>
                )}
              </div>
              <div className="mb-3">
                <span className="text-2xl font-extrabold text-slate-900">{displayPrice}</span>
                <span className="text-xs text-slate-500">{suffix}</span>
              </div>
              <ul className="space-y-1.5 mb-4 text-xs text-slate-700 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 mt-0.5" aria-hidden="true">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[0.65rem] text-slate-500 mb-3">
                {tier.leadFeeMultiplier < 1
                  ? `Save ${Math.round((1 - tier.leadFeeMultiplier) * 100)}% on every lead`
                  : "Standard lead pricing"}
                {tier.maxLeadsPerMonth
                  ? ` · Up to ${tier.maxLeadsPerMonth} leads/month`
                  : " · Uncapped leads"}
              </p>
              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2 rounded bg-slate-100 text-slate-400 text-sm font-semibold cursor-not-allowed"
                >
                  Current plan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => pick(tier.id)}
                  disabled={busy !== null}
                  className="w-full py-2 rounded bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {busy === tier.id ? "…" : `Switch to ${tier.label}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
