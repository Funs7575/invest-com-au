"use client";

import { useState, useMemo } from "react";
import {
  getParam, useUrlSync, CalcSection, InputField, ResultBox, ShareResultsButton,
} from "./CalcShared";

interface Props {
  searchParams: URLSearchParams;
}

const CONCESSIONAL_CAP = 30000;
const SG_RATE = 0.115;
const SUPER_TAX = 0.15;

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function marginalRate(income: number): number {
  if (income <= 18200) return 0;
  if (income <= 45000) return 0.19;
  if (income <= 120000) return 0.325;
  if (income <= 180000) return 0.37;
  return 0.45;
}

export default function SuperContributionsQuickView({ searchParams }: Props) {
  const [income, setIncome] = useState(() => getParam(searchParams, "sc_i") || "100000");
  const [additional, setAdditional] = useState(() => getParam(searchParams, "sc_a") || "5000");

  useUrlSync({ calc: "super-contributions", sc_i: income, sc_a: additional });

  const result = useMemo(() => {
    const I = parseFloat(income) || 0;
    const A = parseFloat(additional) || 0;
    const sg = I * SG_RATE;
    const total = sg + A;
    const remaining = Math.max(0, CONCESSIONAL_CAP - total);
    const mRate = marginalRate(I);
    // Tax saved = additional × (marginal − super tax)
    const taxSaved = A * Math.max(0, mRate - SUPER_TAX);
    const afterTaxCost = A - taxSaved;
    return { sg, total, remaining, mRate, taxSaved, afterTaxCost, overCap: total > CONCESSIONAL_CAP };
  }, [income, additional]);

  const showResults = (parseFloat(income) || 0) > 0;

  return (
    <CalcSection
      id="super-contributions"
      iconName="wallet"
      title="Super Contributions"
      desc="Concessional contribution caps and tax savings"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <InputField label="Annual Income" value={income} onChange={setIncome} prefix="$" placeholder="100000" />
        <div>
          <label className="block text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 md:mb-1.5">
            SG Contributions (auto)
          </label>
          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 md:py-2.5 px-3 md:px-4 text-sm font-semibold text-slate-700">
            {fmt(result.sg)}
          </div>
        </div>
        <InputField label="Additional Concessional" value={additional} onChange={setAdditional} prefix="$" placeholder="5000" />
      </div>

      {showResults ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ResultBox label="Total Concessional" value={fmt(result.total)} negative={result.overCap} />
            <ResultBox
              label="Cap Remaining"
              value={fmt(result.remaining)}
              positive={result.remaining > 0}
              negative={result.overCap}
            />
            <ResultBox label="Tax Saved" value={fmt(result.taxSaved)} positive={result.taxSaved > 0} />
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
            <ResultBox label="Your Marginal Rate" value={`${(result.mRate * 100).toFixed(1)}%`} />
            <ResultBox label="After-Tax Cost" value={fmt(result.afterTaxCost)} />
          </div>
          {result.overCap && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              Warning: Your total concessional contributions exceed the ${CONCESSIONAL_CAP.toLocaleString()} cap for 2025.
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3">
            i — Concessional cap $30,000 (2025). Tax saved = additional × (marginal rate − 15% super tax). Marginal rates: 0% / 19% / 32.5% / 37% / 45%.
          </p>
        </>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Enter your annual income to calculate.</p>
        </div>
      )}

      <ShareResultsButton />
    </CalcSection>
  );
}
