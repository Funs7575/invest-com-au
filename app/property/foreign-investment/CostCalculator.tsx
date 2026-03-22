"use client";

import { useState } from "react";
import { STATE_SURCHARGES, estimateForeignBuyerCosts } from "@/lib/firb-data";
import { FOREIGN_BUYER_STAMP_DUTY_WARNING } from "@/lib/compliance";

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M`;
  return `$${n.toLocaleString("en-AU")}`;
}

export default function CostCalculator() {
  const [price, setPrice] = useState(800_000);
  const [state, setState] = useState("NSW");

  const costs = estimateForeignBuyerCosts(price, state);

  const priceOptions = [
    { label: "$500k", value: 500_000 },
    { label: "$800k", value: 800_000 },
    { label: "$1M", value: 1_000_000 },
    { label: "$1.5M", value: 1_500_000 },
    { label: "$2M", value: 2_000_000 },
  ];

  const stateOptions = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
      <h3 className="font-extrabold text-slate-900 text-base mb-1">Upfront Cost Estimator</h3>
      <p className="text-xs text-slate-500 mb-4">
        Estimate total upfront costs for a foreign buyer, including stamp duty surcharge and FIRB fee.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-2">Property price</label>
          <div className="flex flex-wrap gap-2">
            {priceOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPrice(opt.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  price === opt.value
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-2">State / Territory</label>
          <div className="flex flex-wrap gap-2">
            {stateOptions.map((s) => (
              <button
                key={s}
                onClick={() => setState(s)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  state === s
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Property price</span>
          <span className="font-bold text-slate-900">{formatCurrency(costs.propertyPrice)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Standard stamp duty (est.)</span>
          <span className="font-bold text-slate-900">{formatCurrency(costs.standardStampDuty)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">
            Foreign purchaser surcharge ({STATE_SURCHARGES.find((s) => s.stateCode === state)?.surchargePercent ?? 0}%)
          </span>
          <span className="font-bold text-amber-600">{formatCurrency(costs.foreignSurcharge)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">FIRB application fee</span>
          <span className="font-bold text-slate-900">{formatCurrency(costs.firbFee)}</span>
        </div>
        <div className="border-t border-slate-200 pt-2.5 flex justify-between">
          <span className="text-sm font-bold text-slate-900">Total upfront (est.)</span>
          <span className="text-base font-extrabold text-slate-900">{formatCurrency(costs.totalUpfrontCost)}</span>
        </div>
      </div>

      <p className="text-[0.62rem] text-slate-400 mt-3 leading-relaxed">
        Estimate only. Stamp duty shown is approximate — actual rate varies by state, first home buyer status, and
        concessions. Does not include legal fees, lender charges, or annual land tax surcharges.{" "}
        {FOREIGN_BUYER_STAMP_DUTY_WARNING}
      </p>
    </div>
  );
}
