"use client";

import { useState, useMemo } from "react";
import {
  getParam, useUrlSync, AnimatedNumber, ShareResultsButton,
  CalcSection, InputField,
} from "./CalcShared";

interface Props {
  searchParams: URLSearchParams;
}

const FREQ_OPTIONS = [
  { label: "Monthly", value: 12 },
  { label: "Quarterly", value: 4 },
  { label: "Annually", value: 1 },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export default function CompoundInterestCalculator({ searchParams }: Props) {
  const [principal, setPrincipal] = useState(() => getParam(searchParams, "ci_p") || "10000");
  const [rate, setRate] = useState(() => getParam(searchParams, "ci_r") || "7");
  const [years, setYears] = useState(() => getParam(searchParams, "ci_y") || "10");
  const [monthly, setMonthly] = useState(() => getParam(searchParams, "ci_m") || "0");
  const [freq, setFreq] = useState(() => Number(getParam(searchParams, "ci_f") || "12"));

  useUrlSync({ calc: "compound-interest", ci_p: principal, ci_r: rate, ci_y: years, ci_m: monthly, ci_f: String(freq) });

  const result = useMemo(() => {
    const P = parseFloat(principal) || 0;
    const r = (parseFloat(rate) || 0) / 100;
    const t = parseFloat(years) || 0;
    const m = parseFloat(monthly) || 0;
    const n = freq;

    // Lump sum compound: A = P(1 + r/n)^(nt)
    const lumpSum = P * Math.pow(1 + r / n, n * t);

    // Future value of regular contributions (monthly contributions compounded)
    // Using monthly compounding for contributions regardless of selected freq
    const monthlyRate = r / 12;
    const months = t * 12;
    const fvContribs = m > 0 && monthlyRate > 0
      ? m * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      : m * months;

    const finalAmount = lumpSum + fvContribs;
    const totalContributed = P + m * months;
    const totalInterest = finalAmount - totalContributed;
    const effectiveRate = (Math.pow(1 + r / n, n) - 1) * 100;

    // Year-by-year snapshots for chart
    const snapshots: { year: number; amount: number }[] = [];
    for (let y = 0; y <= Math.min(t, 30); y++) {
      const ls = P * Math.pow(1 + r / n, n * y);
      const mr = r / 12;
      const mo = y * 12;
      const fv = m > 0 && mr > 0 ? m * ((Math.pow(1 + mr, mo) - 1) / mr) : m * mo;
      snapshots.push({ year: y, amount: ls + fv });
    }

    return { finalAmount, totalContributed, totalInterest, effectiveRate, snapshots };
  }, [principal, rate, years, monthly, freq]);

  const showResults = (parseFloat(principal) || 0) > 0 || (parseFloat(monthly) || 0) > 0;
  const maxAmount = result.snapshots[result.snapshots.length - 1]?.amount || 1;

  return (
    <CalcSection
      id="compound-interest"
      iconName="trending-up"
      title="Compound Interest Calculator"
      desc="See how your investments grow over time with the power of compound interest."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-4 space-y-4">
          <InputField label="Initial Investment" value={principal} onChange={setPrincipal} prefix="$" placeholder="10000" />
          <InputField label="Annual Interest Rate" value={rate} onChange={setRate} suffix="%" placeholder="7" />
          <InputField label="Monthly Contribution" value={monthly} onChange={setMonthly} prefix="$" placeholder="0" />
          <InputField label="Time Period (years)" value={years} onChange={setYears} placeholder="10" />
          <div>
            <label className="block text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 md:mb-1.5">Compounding Frequency</label>
            <div className="grid grid-cols-3 gap-1.5">
              {FREQ_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setFreq(o.value)}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    freq === o.value ? "bg-brand text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-8">
          {showResults ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm h-full">
              {/* Hero */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-slate-100 gap-3">
                <div>
                  <span className="text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-400">Final Amount</span>
                  <div className="text-3xl md:text-4xl font-extrabold text-brand tracking-tight mt-0.5">
                    <AnimatedNumber value={result.finalAmount} />
                  </div>
                </div>
                <div className="flex gap-4 md:gap-6">
                  <div>
                    <span className="block text-[0.69rem] font-bold uppercase text-slate-400">Contributed</span>
                    <span className="text-lg font-bold text-slate-700">{fmt(result.totalContributed)}</span>
                  </div>
                  <div>
                    <span className="block text-[0.69rem] font-bold uppercase text-slate-400">Interest</span>
                    <span className="text-lg font-bold text-emerald-600">{fmt(result.totalInterest)}</span>
                  </div>
                </div>
              </div>

              {/* Growth chart */}
              <div className="space-y-1.5">
                <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-400 mb-2">Growth Over Time</p>
                {result.snapshots.filter((_, i) => i % Math.max(1, Math.floor(result.snapshots.length / 8)) === 0 || i === result.snapshots.length - 1).map((s) => (
                  <div key={s.year}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-500">Year {s.year}</span>
                      <span className="font-semibold text-slate-700">{fmt(s.amount)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all duration-500"
                        style={{ width: `${(s.amount / maxAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {result.effectiveRate > 0 && (
                <p className="text-xs text-slate-400 mt-4">
                  Effective annual rate: <strong className="text-slate-600">{result.effectiveRate.toFixed(2)}%</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 md:p-12 text-center h-full flex flex-col items-center justify-center">
              <p className="text-slate-400 text-sm">Enter an investment amount to see your growth projection.</p>
            </div>
          )}
        </div>
      </div>
      <ShareResultsButton />
    </CalcSection>
  );
}
