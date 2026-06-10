"use client";

import { useState } from "react";

interface Props {
  distributionYield: number;    // percent, e.g. 4.1
  frankingPercent: number;      // 0–100
  distributionFrequency: "quarterly" | "semi-annual" | "annual" | "monthly";
  ticker: string;
}

const AMOUNTS = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000];

const FREQ_LABEL: Record<string, string> = {
  quarterly: "per quarter",
  "semi-annual": "every 6 months",
  annual: "per year",
  monthly: "per month",
};

const FREQ_DIVISOR: Record<string, number> = {
  quarterly: 4,
  "semi-annual": 2,
  annual: 1,
  monthly: 12,
};

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "k";
  return "$" + Math.round(n).toLocaleString();
}

function formatExact(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}

export default function DividendProjectionWidget({ distributionYield, frankingPercent, distributionFrequency, ticker }: Props) {
  const [amount, setAmount] = useState(50_000);

  const annualIncome = amount * (distributionYield / 100);
  const perDistribution = annualIncome / (FREQ_DIVISOR[distributionFrequency] ?? 1);

  // Grossed-up income: adds back the franking credit value at a 30% corporate tax rate
  const grossedUpAnnual = frankingPercent > 0
    ? annualIncome / (1 - 0.3) * (1 - (1 - frankingPercent / 100) * 0.3)
    : null;
  const frankingCredit = grossedUpAnnual ? grossedUpAnnual - annualIncome : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-base font-extrabold text-slate-900 mb-1">
        {ticker} Dividend Income Projection
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        Estimate how much annual income {ticker}&apos;s {distributionYield}% yield could generate. General information only — not a guarantee of returns.
      </p>

      {/* Slider */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-xs font-semibold text-slate-700">Investment amount</label>
          <span className="text-lg font-black text-slate-900">{formatExact(amount)}</span>
        </div>
        <input
          type="range"
          min={1_000}
          max={500_000}
          step={1_000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-amber-500"
          aria-label="Investment amount"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-500">$1k</span>
          <span className="text-[10px] text-slate-500">$500k</span>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAmount(a)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
              amount === a
                ? "bg-amber-500 border-amber-500 text-black"
                : "bg-white border-slate-200 text-slate-600 hover:border-amber-400"
            }`}
          >
            {formatCurrency(a)}
          </button>
        ))}
      </div>

      {/* Output grid */}
      <div className={`grid gap-3 ${grossedUpAnnual ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Annual income</p>
          <p className="text-2xl font-black text-amber-900">{formatExact(annualIncome)}</p>
          <p className="text-[10px] text-amber-600 mt-1">per year (est.)</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">{FREQ_LABEL[distributionFrequency] ?? "per distribution"}</p>
          <p className="text-2xl font-black text-slate-900">{formatExact(perDistribution)}</p>
          <p className="text-[10px] text-slate-500 mt-1">distributions are {distributionFrequency}</p>
        </div>
        {grossedUpAnnual && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Grossed-up ({frankingPercent}% franked)</p>
            <p className="text-2xl font-black text-emerald-900">{formatExact(grossedUpAnnual)}</p>
            <p className="text-[10px] text-emerald-600 mt-1">+{formatExact(frankingCredit)} franking credits</p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
        Estimate based on {ticker}&apos;s stated distribution yield of {distributionYield}% p.a.
        {frankingPercent > 0 && ` Grossed-up calculation uses a 30% corporate tax rate. Actual franking credits depend on your individual tax position.`}
        {" "}Distributions are not guaranteed and past distributions are not a reliable indicator of future distributions.
        General information only — not financial advice. Verify with the fund manager&apos;s PDS.
      </p>
    </div>
  );
}
