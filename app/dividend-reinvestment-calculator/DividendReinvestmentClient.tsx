"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}
function fmtShares(n: number) {
  return n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DividendReinvestmentClient() {
  const [price, setPrice] = useState(50);
  const [shares, setShares] = useState(1000);
  const [divYield, setDivYield] = useState(4);
  const [growth, setGrowth] = useState(6);
  const [years, setYears] = useState(20);
  const result = useMemo(() => {
    const dy = divYield / 100;
    const gr = growth / 100;

    let currentSharesDrp = shares;
    const currentSharesCash = shares;
    let currentPrice = price;
    let totalDividendsReceived = 0;
    let totalDividendsCash = 0;

    const snapshots: { year: number; drpValue: number; cashValue: number; drpShares: number; cumDiv: number }[] = [];
    snapshots.push({ year: 0, drpValue: shares * price, cashValue: shares * price, drpShares: shares, cumDiv: 0 });

    for (let y = 1; y <= years; y++) {
      currentPrice = currentPrice * (1 + gr);
      const drpDividend = currentSharesDrp * currentPrice * dy;
      const cashDividend = currentSharesCash * currentPrice * dy;

      totalDividendsReceived += drpDividend;
      totalDividendsCash += cashDividend;

      // DRP: reinvest dividends → more shares
      currentSharesDrp += drpDividend / currentPrice;

      snapshots.push({
        year: y,
        drpValue: currentSharesDrp * currentPrice,
        cashValue: currentSharesCash * currentPrice,
        drpShares: currentSharesDrp,
        cumDiv: totalDividendsReceived,
      });
    }

    const finalDrpValue = currentSharesDrp * currentPrice;
    const finalCashValue = currentSharesCash * currentPrice + totalDividendsCash;
    const initialValue = shares * price;
    const drpAdvantage = finalDrpValue - finalCashValue;

    return {
      finalDrpValue,
      finalCashValue,
      finalDrpShares: currentSharesDrp,
      initialValue,
      totalDividendsReceived,
      totalDividendsCash,
      drpAdvantage,
      snapshots,
    };
  }, [price, shares, divYield, growth, years]);

  const maxValue = result.snapshots[result.snapshots.length - 1]?.drpValue || 1;

  return (
    <div className="py-10 md:py-16">
      <div className="container-custom max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-1">Free Calculator</p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">
            Dividend Reinvestment Calculator
          </h1>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">
            See how reinvesting dividends (DRP) accelerates your portfolio growth through compounding — compared
            to taking dividends as cash.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Inputs */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              <h2 className="font-bold text-slate-900">Your Portfolio</h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Share price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.5}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Number of shares</label>
                <input
                  type="number"
                  min={1}
                  step={100}
                  value={shares}
                  onChange={(e) => setShares(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Dividend yield (p.a.)
                  <span className="text-slate-400 font-normal ml-1">e.g. VAS ≈ 4%</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={divYield}
                    onChange={(e) => setDivYield(Number(e.target.value))}
                    className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Share price growth (p.a.)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={growth}
                    onChange={(e) => setGrowth(Number(e.target.value))}
                    className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Investment period</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full pr-12 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">yrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">
            {/* DRP vs Cash comparison */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">DRP vs Cash After {years} Years</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-violet-700 mb-1">Reinvested (DRP)</p>
                  <p className="text-2xl font-extrabold text-violet-900">{fmt(result.finalDrpValue)}</p>
                  <p className="text-xs text-violet-600 mt-1">{fmtShares(result.finalDrpShares)} shares</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-600 mb-1">Cash dividends</p>
                  <p className="text-2xl font-extrabold text-slate-700">{fmt(result.finalCashValue)}</p>
                  <p className="text-xs text-slate-500 mt-1">{fmtShares(shares)} shares + cash</p>
                </div>
              </div>
              {result.drpAdvantage > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700 font-medium">
                  DRP puts you <strong>{fmt(result.drpAdvantage)}</strong> ahead after {years} years
                </div>
              )}
            </div>

            {/* Growth chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Portfolio Value Over Time</p>
              <div className="space-y-2.5">
                {result.snapshots.filter((_, i) => i % Math.max(1, Math.floor(result.snapshots.length / 8)) === 0 || i === result.snapshots.length - 1).map((s) => (
                  <div key={s.year}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Year {s.year}</span>
                      <div className="flex gap-3">
                        <span className="text-violet-600 font-medium">{fmt(s.drpValue)}</span>
                        <span className="text-slate-500">{fmt(s.cashValue)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100">
                      <div className="h-full bg-violet-500 rounded-l-full transition-all duration-500" style={{ width: `${(s.drpValue / maxValue) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Summary</p>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Initial portfolio value</span>
                  <span className="font-semibold text-slate-800">{fmt(result.initialValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total dividends generated (DRP)</span>
                  <span className="font-semibold text-slate-800">{fmt(result.totalDividendsReceived)}</span>
                </div>
                <div className="flex justify-between text-violet-600">
                  <span>Final DRP portfolio value</span>
                  <span className="font-bold">{fmt(result.finalDrpValue)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Cash dividend scenario (shares + cash)</span>
                  <span className="font-semibold">{fmt(result.finalCashValue)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-emerald-600">
                  <span className="font-bold">DRP advantage</span>
                  <span className="font-extrabold">+{fmt(result.drpAdvantage)}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-slate-900 mb-1">Find a platform that supports DRP</p>
              <p className="text-xs text-slate-600 mb-3">
                Not all Australian brokers offer dividend reinvestment plans. Compare platforms to find the best fit for your DRP strategy.
              </p>
              <Link
                href="/compare"
                className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors"
              >
                Compare Platforms →
              </Link>
            </div>
          </div>
        </div>

        <p className="text-[0.65rem] text-slate-400 mt-8 leading-relaxed">
          This calculator provides general information only and does not constitute financial advice. Projections assume constant dividend yield and share price growth, which will vary in practice. Dividends received via DRP are still assessable income in Australia. Always verify your tax position with a registered tax agent.
        </p>
      </div>
    </div>
  );
}
