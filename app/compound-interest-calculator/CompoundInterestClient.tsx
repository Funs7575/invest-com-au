"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const FREQ_OPTIONS = [
  { label: "Monthly", value: 12 },
  { label: "Quarterly", value: 4 },
  { label: "Annually", value: 1 },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export default function CompoundInterestClient() {
  const [principal, setPrincipal] = useState(10_000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(20);
  const [monthly, setMonthly] = useState(200);
  const [freq, setFreq] = useState(12);

  const result = useMemo(() => {
    const r = rate / 100;
    const n = freq;

    // Lump sum compound
    const lumpSum = principal * Math.pow(1 + r / n, n * years);

    // FV of regular monthly contributions
    const monthlyRate = r / 12;
    const months = years * 12;
    const fvContribs = monthly > 0 && monthlyRate > 0
      ? monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      : monthly * months;

    const finalAmount = lumpSum + fvContribs;
    const totalContributed = principal + monthly * months;
    const totalInterest = finalAmount - totalContributed;
    const effectiveRate = (Math.pow(1 + r / n, n) - 1) * 100;

    // Year-by-year snapshots
    const snapshots: { year: number; amount: number; contributions: number }[] = [];
    for (let y = 0; y <= years; y++) {
      const ls = principal * Math.pow(1 + r / n, n * y);
      const mr = r / 12;
      const mo = y * 12;
      const fv = monthly > 0 && mr > 0 ? monthly * ((Math.pow(1 + mr, mo) - 1) / mr) : monthly * mo;
      snapshots.push({ year: y, amount: ls + fv, contributions: principal + monthly * mo });
    }

    return { finalAmount, totalContributed, totalInterest, effectiveRate, snapshots };
  }, [principal, rate, years, monthly, freq]);

  const maxAmount = result.snapshots[result.snapshots.length - 1]?.amount || 1;

  return (
    <div className="py-10 md:py-16">
      <div className="container-custom max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Free Calculator</p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">
            Compound Interest Calculator
          </h1>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">
            See how your investments grow over time with compound interest. Adjust the principal, contributions,
            rate and time period to model different scenarios.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Inputs */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              <h2 className="font-bold text-slate-900">Your Investment</h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Initial investment</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={principal}
                    onChange={(e) => setPrincipal(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monthly contribution</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={monthly}
                    onChange={(e) => setMonthly(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Annual interest rate</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Investment period</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    step={1}
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full pr-12 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">yrs</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Compounding frequency</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {FREQ_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setFreq(o.value)}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        freq === o.value ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">
            {/* Final amount */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Final Balance</p>
                  <p className="text-3xl font-extrabold text-slate-900">{fmt(result.finalAmount)}</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  {result.effectiveRate.toFixed(2)}% effective
                </span>
              </div>
              <div className="flex gap-6 text-sm mt-2">
                <div>
                  <p className="text-slate-500 text-xs">Total contributed</p>
                  <p className="font-bold text-slate-700">{fmt(result.totalContributed)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Interest earned</p>
                  <p className="font-bold text-emerald-600">{fmt(result.totalInterest)}</p>
                </div>
              </div>
            </div>

            {/* Growth chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Growth Over Time</p>
              <div className="space-y-2.5">
                {result.snapshots.filter((_, i) => i % Math.max(1, Math.floor(result.snapshots.length / 8)) === 0 || i === result.snapshots.length - 1).map((s) => (
                  <div key={s.year}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Year {s.year}</span>
                      <div className="flex gap-3">
                        <span className="text-slate-400">Contrib: {fmt(s.contributions)}</span>
                        <span className="font-semibold text-slate-700">{fmt(s.amount)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-slate-300 rounded-l-full transition-all duration-500"
                        style={{ width: `${(s.contributions / maxAmount) * 100}%` }}
                      />
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${((s.amount - s.contributions) / maxAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Contributions</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Interest</span>
              </div>
            </div>

            {/* Rates table */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Summary</p>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Initial investment</span>
                  <span className="font-semibold text-slate-800">{fmt(principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total contributions ({years} × {fmt(monthly * 12)}/yr)</span>
                  <span className="font-semibold text-slate-800">{fmt(monthly * 12 * years)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Interest / returns earned</span>
                  <span className="font-semibold text-emerald-600">{fmt(result.totalInterest)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="font-bold text-slate-800">Final balance</span>
                  <span className="font-extrabold text-slate-900">{fmt(result.finalAmount)}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-slate-900 mb-1">Ready to put your money to work?</p>
              <p className="text-xs text-slate-600 mb-3">
                Compare Australia&apos;s lowest-fee share trading platforms to maximise your investment returns.
              </p>
              <Link
                href="/compare"
                className="inline-block px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Compare Platforms →
              </Link>
            </div>
          </div>
        </div>

        <p className="text-[0.65rem] text-slate-400 mt-8 leading-relaxed">
          This calculator provides general information only and does not constitute financial advice. Returns shown are projections only and are not guaranteed. Past performance is not indicative of future performance. Always seek independent financial advice before making investment decisions.
        </p>
      </div>
    </div>
  );
}
