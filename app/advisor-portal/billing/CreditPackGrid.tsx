"use client";

import { useState } from "react";
import { LEAD_CREDIT_PACKS } from "@/lib/advisor-credit-packs";
import { logger } from "@/lib/logger";

const log = logger("advisor-portal-credit-pack-grid");

/**
 * Pack-card grid for buying lead credits. Reads packs from
 * lib/advisor-credit-packs.ts (the same source the topup API consumes)
 * so the price the advisor sees and the price Stripe charges can never
 * drift apart.
 */
export default function CreditPackGrid() {
  const [busySlug, setBusySlug] = useState<string | null>(null);

  async function buy(slug: string, priceCents: number) {
    setBusySlug(slug);
    try {
      const res = await fetch("/api/advisor-auth/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: priceCents, pack_slug: slug }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session. Please try again.");
      }
    } catch (err) {
      alert("Something went wrong. Please check you're logged in and try again.");
      log.error("topup checkout failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <>
      <h2 className="text-base font-bold text-slate-900 mb-3">Buy Lead Credits</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {LEAD_CREDIT_PACKS.map((pack) => (
          <div
            key={pack.slug}
            className={`relative bg-white border rounded-xl p-5 text-center ${
              pack.slug === "growth"
                ? "border-violet-400 ring-2 ring-violet-100"
                : "border-slate-200"
            }`}
          >
            {pack.badge && (
              <span
                className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[0.6rem] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                  pack.slug === "growth"
                    ? "bg-violet-600 text-white"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {pack.badge}
              </span>
            )}
            <h3 className="text-sm font-bold text-slate-900 mt-1">{pack.name}</h3>
            <div className="text-3xl font-extrabold text-slate-900 my-2">
              ${(pack.priceCents / 100).toFixed(0)}
            </div>
            <p className="text-xs text-slate-500 mb-1">{pack.leads} exclusive leads</p>
            <p className="text-xs text-slate-400 mb-3">
              ${(pack.perLeadCents / 100).toFixed(2)} per lead
            </p>
            <button
              type="button"
              disabled={busySlug !== null}
              onClick={() => buy(pack.slug, pack.priceCents)}
              className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
                pack.slug === "growth"
                  ? "bg-violet-600 text-white hover:bg-violet-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {busySlug === pack.slug ? "Opening checkout…" : `Buy ${pack.name}`}
            </button>
            <p className="text-[0.6rem] text-slate-400 mt-2">{pack.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
