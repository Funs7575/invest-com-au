"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export default function FireCalculatorClient() {
  const [currentAge, setCurrentAge] = useState(30);
  const [currentSavings, setCurrentSavings] = useState(50_000);
  const [annualSavings, setAnnualSavings] = useState(30_000);
  const [annualExpenses, setAnnualExpenses] = useState(60_000);
  const [returnRate, setReturnRate] = useState(7);
  const [withdrawalRate, setWithdrawalRate] = useState(4);

  const result = useMemo(() => {
    const r = returnRate / 100;
    const wr = withdrawalRate / 100;

    const fireNumber = wr > 0 ? annualExpenses / wr : 0;

    let years = 0;
    let portfolio = currentSavings;
    const MAX_YEARS = 80;

    if (fireNumber > 0 && portfolio < fireNumber) {
      while (portfolio < fireNumber && years < MAX_YEARS) {
        portfolio = portfolio * (1 + r) + annualSavings;
        years++;
      }
    } else if (portfolio >= fireNumber && fireNumber > 0) {
      years = 0;
    }

    const fireAge = currentAge + years;
    const achieved = portfolio >= fireNumber && fireNumber > 0;
    const safeWithdrawal = portfolio * wr;

    // Snapshots
    const snapshots: { year: number; amount: number }[] = [];
    let snap = currentSavings;
    const snapEnd = Math.min(years + 5, MAX_YEARS);
    for (let y = 0; y <= snapEnd; y++) {
      snapshots.push({ year: y, amount: snap });
      snap = snap * (1 + r) + annualSavings;
    }

    // Savings rate (approx)
    const savingsRate = annualExpenses + annualSavings > 0
      ? (annualSavings / (annualExpenses + annualSavings)) * 100
      : 0;

    return { fireNumber, years, fireAge, achieved, snapshots, safeWithdrawal, finalPortfolio: portfolio, savingsRate };
  }, [currentAge, currentSavings, annualSavings, annualExpenses, returnRate, withdrawalRate]);

  const maxSnap = Math.max(result.fireNumber, result.snapshots[result.snapshots.length - 1]?.amount || 1);

  return (
    <div className="py-10 md:py-16">
      <div className="container-custom max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">Free Calculator</p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">
            FIRE Calculator
          </h1>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">
            Find your Financial Independence number and see how many years until you can retire early.
            Uses the 4% safe withdrawal rule — adjust to 3.5% for a more conservative Australian approach.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Inputs */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              <h2 className="font-bold text-slate-900">Your Details</h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Current age</label>
                <input
                  type="number"
                  min={18}
                  max={80}
                  step={1}
                  value={currentAge}
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Current savings / investments</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Annual savings / investments</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={annualSavings}
                    onChange={(e) => setAnnualSavings(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Annual expenses in retirement
                  <span className="text-slate-400 font-normal ml-1">today&apos;s dollars</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={annualExpenses}
                    onChange={(e) => setAnnualExpenses(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Expected annual return</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={returnRate}
                    onChange={(e) => setReturnRate(Number(e.target.value))}
                    className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Safe withdrawal rate
                  <span className="text-slate-400 font-normal ml-1">4% = 25× rule</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={withdrawalRate}
                    onChange={(e) => setWithdrawalRate(Number(e.target.value))}
                    className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">
            {/* FIRE number */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your FIRE Number</p>
                  <p className="text-3xl font-extrabold text-slate-900">{fmt(result.fireNumber)}</p>
                  <p className="text-xs text-slate-400 mt-1">{fmt(annualExpenses)} ÷ {withdrawalRate}% withdrawal rate</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  result.years === 0 ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {result.years === 0 ? "Already there!" : `${result.years} yrs away`}
                </span>
              </div>
              <div className="flex gap-6 text-sm mt-2">
                <div>
                  <p className="text-slate-500 text-xs">FIRE age</p>
                  <p className="font-bold text-slate-700">{result.fireAge >= 110 ? "110+" : Math.round(result.fireAge)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Safe withdrawal</p>
                  <p className="font-bold text-emerald-600">{fmt(result.safeWithdrawal)}/yr</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Savings rate</p>
                  <p className="font-bold text-slate-700">{result.savingsRate.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {result.achieved && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-emerald-800 mb-1">🎉 FIRE Achieved!</p>
                <p className="text-xs text-emerald-700">
                  Your projected portfolio of {fmt(result.finalPortfolio)} supports a safe withdrawal of {fmt(result.safeWithdrawal)}/yr —
                  covering your {fmt(annualExpenses)}/yr expenses with a margin of {fmt(result.safeWithdrawal - annualExpenses)}.
                </p>
              </div>
            )}

            {/* Portfolio growth chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Portfolio Growth to FIRE</p>
                <p className="text-xs text-slate-400">Target: {fmt(result.fireNumber)}</p>
              </div>
              <div className="space-y-2.5">
                {result.snapshots.filter((_, i) => i % Math.max(1, Math.floor(result.snapshots.length / 8)) === 0 || i === result.snapshots.length - 1).map((s) => (
                  <div key={s.year}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Year {s.year} · age {currentAge + s.year}</span>
                      <span className={`font-semibold ${s.amount >= result.fireNumber ? "text-emerald-600" : "text-slate-700"}`}>
                        {fmt(s.amount)}
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${s.amount >= result.fireNumber ? "bg-emerald-500" : "bg-orange-500"}`}
                        style={{ width: `${Math.min(100, (s.amount / maxSnap) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Growing</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> FIRE achieved</span>
              </div>
            </div>

            {/* Rates table */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">FIRE Variants</p>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Lean FIRE (3% SWR — 33× expenses)</span>
                  <span className="font-semibold text-slate-800">{fmt(annualExpenses * 33.3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Standard FIRE (4% SWR — 25× expenses)</span>
                  <span className="font-semibold text-slate-800">{fmt(annualExpenses * 25)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fat FIRE (3% SWR on 1.5× expenses)</span>
                  <span className="font-semibold text-slate-800">{fmt(annualExpenses * 1.5 * 33.3)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span>Your FIRE number ({withdrawalRate}% SWR)</span>
                  <span className="font-extrabold text-slate-900">{fmt(result.fireNumber)}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-slate-900 mb-1">Optimise your FIRE strategy</p>
              <p className="text-xs text-slate-600 mb-3">
                A fee-only financial adviser can help you model tax-efficient withdrawal strategies, including
                super access at preservation age, Centrelink eligibility and asset allocation for your FIRE portfolio.
              </p>
              <Link
                href="/advisors/financial-planners"
                className="inline-block px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-colors"
              >
                Find a Fee-Only Adviser →
              </Link>
            </div>
          </div>
        </div>

        <p className="text-[0.65rem] text-slate-400 mt-8 leading-relaxed">
          This calculator provides general information only and does not constitute financial advice. Returns are not guaranteed and the 4% withdrawal rate is based on US historical data and may not reflect Australian market conditions. Speak with a licensed financial adviser before making retirement planning decisions.
        </p>
      </div>
    </div>
  );
}
