"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

// ─── ETP tax constants (FY2025-26) ───────────────────────────────────────────

const TAX_FREE_BASE = 12_524;
const TAX_FREE_PER_YEAR = 6_264;
const ETP_CAP = 245_000;

// Preservation age in AU is 60 for those born after 30 June 1964.
// For simplicity: "at or above 60" → 17%, "under 60" → 32%.
const ETP_RATE_UNDER_60 = 0.32;
const ETP_RATE_AT_OR_ABOVE_60 = 0.17;
const ETP_ABOVE_CAP_RATE = 0.47;

// Medicare levy
const MEDICARE = 0.02;

/** FY2025-26 marginal rates (excl. Medicare). */
function marginalRate(income: number): number {
  if (income <= 18_200) return 0;
  if (income <= 45_000) return 0.19;
  if (income <= 135_000) return 0.325;
  if (income <= 190_000) return 0.37;
  return 0.45;
}

interface ETPResult {
  taxFreeComponent: number;
  taxableETP: number;
  etpWithinCap: number;
  etpAboveCap: number;
  taxOnETPWithinCap: number;
  taxOnETPAboveCap: number;
  totalTaxOnETP: number;
  netRedundancyPayout: number;
  effectiveTaxRateOnETP: number;
}

function calcETP(
  totalPayout: number,
  yearsOfService: number,
  atOrAbove60: boolean,
): ETPResult {
  const taxFreeComponent = Math.min(
    TAX_FREE_BASE + TAX_FREE_PER_YEAR * Math.floor(yearsOfService),
    totalPayout,
  );
  const taxableETP = Math.max(0, totalPayout - taxFreeComponent);

  const etpWithinCap = Math.min(taxableETP, ETP_CAP);
  const etpAboveCap = Math.max(0, taxableETP - ETP_CAP);

  const concessionalRate = atOrAbove60
    ? ETP_RATE_AT_OR_ABOVE_60
    : ETP_RATE_UNDER_60;

  const taxOnETPWithinCap = etpWithinCap * concessionalRate;
  const taxOnETPAboveCap = etpAboveCap * ETP_ABOVE_CAP_RATE;
  const totalTaxOnETP = taxOnETPWithinCap + taxOnETPAboveCap;

  const netRedundancyPayout = totalPayout - totalTaxOnETP;
  const effectiveTaxRateOnETP =
    taxableETP > 0 ? totalTaxOnETP / taxableETP : 0;

  return {
    taxFreeComponent,
    taxableETP,
    etpWithinCap,
    etpAboveCap,
    taxOnETPWithinCap,
    taxOnETPAboveCap,
    totalTaxOnETP,
    netRedundancyPayout,
    effectiveTaxRateOnETP,
  };
}

function fmt(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function pct(n: number) {
  return (n * 100).toFixed(1) + "%";
}

export default function ETPCalculatorClient() {
  const [totalPayout, setTotalPayout] = useState(150_000);
  const [yearsOfService, setYearsOfService] = useState(8);
  const [atOrAbove60, setAtOrAbove60] = useState(false);
  const [annualIncome, setAnnualIncome] = useState(90_000);

  const result = useMemo(
    () => calcETP(totalPayout, yearsOfService, atOrAbove60),
    [totalPayout, yearsOfService, atOrAbove60],
  );

  const margRate = marginalRate(annualIncome) + MEDICARE;

  // What the taxable ETP would have cost at marginal rate (hypothetical)
  const marginalTaxEquivalent = result.taxableETP * margRate;
  const etpTaxSaving = Math.max(0, marginalTaxEquivalent - result.totalTaxOnETP);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        ETP Tax Calculator
      </h1>
      <p className="text-gray-600 mb-8 text-sm">
        FY2025–26 rates · Genuine redundancy only · Unused leave is taxed
        separately as ordinary income
      </p>

      {/* Inputs */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-5">
        <h2 className="font-semibold text-gray-800 text-lg">Your redundancy details</h2>

        <div>
          <label htmlFor="etp-total-payout" className="block text-sm font-medium text-gray-700 mb-1">
            Total redundancy payout (excl. leave)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              id="etp-total-payout"
              type="number"
              min={0}
              max={2_000_000}
              step={1000}
              value={totalPayout}
              onChange={(e) => setTotalPayout(Math.max(0, Number(e.target.value)))}
              className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Genuine redundancy payment only — not unused annual or long-service leave
          </p>
        </div>

        <div>
          <label htmlFor="etp-years" className="block text-sm font-medium text-gray-700 mb-1">
            Completed years of service
          </label>
          <input
            id="etp-years"
            type="number"
            min={0}
            max={50}
            step={1}
            value={yearsOfService}
            onChange={(e) => setYearsOfService(Math.max(0, Number(e.target.value)))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Whole years only — partial years do not count toward the tax-free threshold
          </p>
        </div>

        <div>
          <label htmlFor="etp-annual-income" className="block text-sm font-medium text-gray-700 mb-1">
            Annual salary (before this year&apos;s redundancy)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              id="etp-annual-income"
              type="number"
              min={0}
              max={2_000_000}
              step={1000}
              value={annualIncome}
              onChange={(e) => setAnnualIncome(Math.max(0, Number(e.target.value)))}
              className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Used to estimate your marginal rate and the ETP tax saving vs ordinary income
          </p>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Your age at time of payment
          </span>
          <div className="flex gap-4">
            {[false, true].map((val) => (
              <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="etp-age"
                  checked={atOrAbove60 === val}
                  onChange={() => setAtOrAbove60(val)}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-gray-700">
                  {val ? "60 or over" : "Under 60"}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Determines ETP concessional rate: 17% (60+) or 32% (under 60)
          </p>
        </div>
      </section>

      {/* Results */}
      <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-emerald-900 text-lg mb-5">Estimated ETP breakdown</h2>

        <div className="space-y-3">
          <Row label="Total redundancy payout" value={fmt(totalPayout)} />
          <Row
            label={`Tax-free component ($12,524 + $6,264 × ${Math.floor(yearsOfService)} yrs)`}
            value={fmt(result.taxFreeComponent)}
            highlight
          />
          <Row label="Taxable ETP" value={fmt(result.taxableETP)} />

          {result.etpAboveCap > 0 && (
            <>
              <Row
                label={`ETP within cap (${atOrAbove60 ? "17%" : "32%"})`}
                value={fmt(result.etpWithinCap)}
              />
              <Row
                label="ETP above cap (taxed at 47%)"
                value={fmt(result.etpAboveCap)}
                warn
              />
            </>
          )}

          <div className="border-t border-emerald-200 pt-3 mt-2 space-y-2">
            <Row label="Tax on ETP" value={fmt(result.totalTaxOnETP)} />
            <Row
              label="Net redundancy payout (after ETP tax)"
              value={fmt(result.netRedundancyPayout)}
              bold
            />
            <Row
              label="Effective ETP tax rate"
              value={pct(result.effectiveTaxRateOnETP)}
            />
          </div>

          {etpTaxSaving > 0 && (
            <div className="mt-4 bg-emerald-100 rounded-lg px-4 py-3">
              <p className="text-sm text-emerald-800 font-medium">
                ETP saves you {fmt(etpTaxSaving)} vs your {pct(margRate)} marginal rate
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                That&apos;s the benefit of the concessional ETP rate over ordinary income tax
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Unused leave note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-amber-800 font-medium mb-1">⚠️ Unused leave is taxed separately</p>
        <p className="text-sm text-amber-700">
          Annual leave and long service leave payouts are ordinary income — taxed at your marginal rate,
          not the ETP concessional rates. They will be on a separate line of your payment summary.
        </p>
      </div>

      {/* CTA strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/find/tax-accountant"
          className="flex flex-col items-start bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-400 transition-colors"
        >
          <span className="text-xs font-medium text-emerald-700 mb-1">Get professional advice</span>
          <span className="font-semibold text-gray-900 text-sm">Find a tax accountant →</span>
          <span className="text-xs text-gray-500 mt-0.5">Before 30 June can save thousands</span>
        </Link>
        <Link
          href="/redundancy"
          className="flex flex-col items-start bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-400 transition-colors"
        >
          <span className="text-xs font-medium text-emerald-700 mb-1">Full guide</span>
          <span className="font-semibold text-gray-900 text-sm">Redundancy Hub →</span>
          <span className="text-xs text-gray-500 mt-0.5">ETP, super strategy, rebuild plan</span>
        </Link>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
    </main>
  );
}

function Row({
  label,
  value,
  highlight,
  bold,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  bold?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span
        className={`text-sm ${
          highlight
            ? "text-emerald-700 font-medium"
            : warn
              ? "text-amber-700"
              : "text-gray-700"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-sm tabular-nums whitespace-nowrap ${
          bold ? "font-bold text-gray-900" : highlight ? "text-emerald-700 font-medium" : warn ? "text-amber-700" : "text-gray-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
