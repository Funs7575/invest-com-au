"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import {
  getParam, useUrlSync, CalcSection, InputField, ResultBox, ShareResultsButton,
} from "./CalcShared";

interface Props {
  searchParams: URLSearchParams;
}

const BRACKETS = [
  { label: "0%", value: 0 },
  { label: "19%", value: 19 },
  { label: "32.5%", value: 32.5 },
  { label: "37%", value: 37 },
  { label: "45%", value: 45 },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export default function TaxOptimizerQuickView({ searchParams }: Props) {
  const [gain, setGain] = useState(() => getParam(searchParams, "tax_g") || "10000");
  const [days, setDays] = useState(() => getParam(searchParams, "tax_d") || "400");
  const [bracket, setBracket] = useState(() => getParam(searchParams, "tax_b") || "32.5");

  useUrlSync({ calc: "tax-optimizer", tax_g: gain, tax_d: days, tax_b: bracket });

  const result = useMemo(() => {
    const g = parseFloat(gain) || 0;
    const d = parseInt(days) || 0;
    const b = parseFloat(bracket) || 0;
    const eligible = d >= 365;
    const taxable = eligible ? g * 0.5 : g;
    const tax = taxable * (b / 100);
    const daysRemaining = eligible ? 0 : Math.max(0, 365 - d);
    const taxIfDiscounted = g * 0.5 * (b / 100);
    const savingsFromHolding = eligible ? 0 : tax - taxIfDiscounted;
    return { eligible, taxable, tax, daysRemaining, savingsFromHolding };
  }, [gain, days, bracket]);

  const showResults = (parseFloat(gain) || 0) > 0;

  return (
    <CalcSection
      id="tax-optimizer"
      iconName="calculator"
      title="Tax Optimizer"
      desc="Quick CGT estimate with discount eligibility check"
    >
      <p className="text-sm text-slate-600 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
        Quick CGT estimate. For tax-loss harvesting, franking credits and per-holding analysis, open the full tool.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <InputField label="Capital Gain" value={gain} onChange={setGain} prefix="$" placeholder="10000" />
        <InputField label="Days Held" value={days} onChange={setDays} placeholder="400" />
        <div>
          <label className="block text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 md:mb-1.5">
            Marginal Tax Bracket
          </label>
          <div className="grid grid-cols-5 gap-1">
            {BRACKETS.map((o) => (
              <button
                key={o.value}
                onClick={() => setBracket(String(o.value))}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  parseFloat(bracket) === o.value
                    ? "bg-brand text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showResults ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <ResultBox
              label="CGT Discount"
              value={result.eligible ? "Yes (50%)" : "Not yet"}
              positive={result.eligible}
              negative={!result.eligible}
            />
            <ResultBox label="Taxable Amount" value={fmt(result.taxable)} />
            <ResultBox label="Tax Payable" value={fmt(result.tax)} negative />
          </div>

          {!result.eligible && result.daysRemaining > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-3">
              <strong>Hold {result.daysRemaining} more days</strong> to become eligible for the 50% CGT discount — that would save you approximately <strong>{fmt(result.savingsFromHolding)}</strong>.
            </div>
          )}

          <p className="text-xs text-slate-400">
            i — Individuals receive a 50% CGT discount on assets held for at least 12 months (365 days). Estimate only; exclusions apply.
          </p>
        </>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Enter a capital gain to estimate your CGT.</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <Link
          href="/tax-optimizer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          <Icon name="calculator" size={14} />
          Open full Tax Optimizer →
        </Link>
        <ShareResultsButton />
      </div>
    </CalcSection>
  );
}
